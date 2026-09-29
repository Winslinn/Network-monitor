from sqlalchemy import true
import asyncio, json, uvicorn, jwt, datetime
import utils.database as db
import yaml

from os import getenv
from urllib.parse import urlsplit
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Cookie, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, Literal, Optional
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field, model_validator

from utils.database import Session, Router, init_db
from utils.logmanager import watch_flows, watch_results
from core.router import init as init_router, router_manager, watch_router_logs
from utils.snmp import close_snmp
from core.loader import get_detector_config, get_detectors

SECRET_KEY = getenv("SECRET_KEY")
ALGORITHM = getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
PROJECT_ROOT = getenv("PROJECT_ROOT")

with open(f"{PROJECT_ROOT}/config.yaml", "r") as config_file:
    app_config = yaml.safe_load(config_file)

SERVER_ADDRESS = app_config["server"]["address"].strip()
server_url = urlsplit(SERVER_ADDRESS)
if (
    server_url.scheme not in {"http", "https"}
    or not server_url.hostname
    or server_url.username
    or server_url.password
    or server_url.path not in {"", "/"}
    or server_url.query
    or server_url.fragment
):
    raise ValueError("server.address must be an HTTP(S) origin without credentials or a path")

SERVER_ADDRESS = f"{server_url.scheme}://{server_url.netloc}"

server_host = f"[{server_url.hostname}]" if ":" in server_url.hostname else server_url.hostname
SERVER_DEV_ORIGINS = [
    f"{scheme}://{server_host}:3001"
    for scheme in ("http", "https")
]

class LoginRequest(BaseModel):
    username: str
    password: str


class RuleCreate(BaseModel):
    name: str = Field(min_length=1)
    detection_method: Literal["detector", "pattern"]
    detector_id: Optional[str] = None
    config: dict[str, Any] = Field(default_factory=dict)
    severity: str = "medium"
    description: str = ""
    is_enabled: bool = True

    @model_validator(mode="after")
    def validate_detection_target(self):
        if self.detection_method == "detector" and not self.detector_id:
            raise ValueError("detector_id is required for detector rules")
        if self.detection_method == "pattern" and self.detector_id is not None:
            raise ValueError("detector_id must be empty for pattern rules")
        return self


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = None


class RuleConfigUpdate(BaseModel):
    config: dict[str, Any]

@asynccontextmanager
async def lifespan(app: FastAPI):
    tasks = [
        asyncio.create_task(init_router(manager)),
        asyncio.create_task(watch_router_logs(manager)),
    ]
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        router_manager.close()
        close_snmp()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        SERVER_ADDRESS,
        *SERVER_DEV_ORIGINS,
        "https://100.101.30.34",
        "https://192.168.0.240"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            self._clients.discard(ws)

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        async with self._lock:
            if not self._clients: return
            await asyncio.gather(
                *[c.send_text(data) for c in self._clients],
                return_exceptions=True
            )

manager = ConnectionManager()


@app.get("/api/config")
async def get_client_config():
    return {"address": SERVER_ADDRESS}

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return db.get_user(username)
    
    except jwt.PyJWTError:
        return None


def current_user(access_token: Optional[str] = Cookie(default=None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_current_user_from_token(access_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def require_permission(permission: str):
    def dependency(user=Depends(current_user)):
        if permission not in user.get("permissions", []):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency


def router_snapshot():
    with Session() as session:
        router = session.query(Router).first()
        if not router:
            router = Router(
                mac_address=router_manager.data.get("mac_address"),
                ip_address=router_manager.data.get("lan_address"),
                admin_login="",
                admin_password="",
            )
            session.add(router)
            session.commit()
        return {
            "device_name": router_manager.data.get("device_name"),
            "mac_address": router.mac_address,
            "ip_address": router.ip_address,
            "dns_server": router.dns_server,
        }

@app.post("/api/login")
async def login(request: LoginRequest, response: Response):
    user = db.get_user(request.username)
    if not user or not db.verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token(data={"sub": user["username"]})
    response.set_cookie(
        key="access_token", 
        value=token, 
        httponly=True, 
        secure=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"status": "ok"}

@app.get("/api/session")
async def get_me(user=Depends(current_user)):
    return {
        "username": user["username"], 
        "roles": user["roles"], 
        "permissions": user.get("permissions", [])
    }

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "ok"}


@app.get("/api/router")
async def get_router(user=Depends(current_user)):
    return router_snapshot()


@app.get("/api/dhcp")
async def get_dhcp(user=Depends(require_permission("dashboard:view"))):
    return db.get_clients()


@app.get("/api/rules")
async def get_rules(user=Depends(require_permission("rules:view"))):
    return db.get_all_rules()


@app.post("/api/rules", status_code=201)
async def create_rule(rule: RuleCreate, user=Depends(require_permission("rules:edit"))):
    rule_data = rule.model_dump()
    detector_config = None
    if rule.detection_method == "detector":
        try:
            detector_config = get_detector_config(rule.detector_id)
        except KeyError:
            raise HTTPException(status_code=422, detail="Unknown detector")

    created = db.add_rule(rule_data, detector_config=detector_config)
    await manager.broadcast({"context": "rule_created", "data": created})
    return created


@app.patch("/api/rules/{rule_id}")
async def edit_rule(rule_id: int, rule: RuleUpdate, user=Depends(require_permission("rules:edit"))):
    updated = db.update_rule(rule_id, rule.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Rule not found")
    await manager.broadcast({"context": "rule_updated", "data": updated})
    return updated


@app.get("/api/rules/{rule_id}/config")
async def get_rule_config(rule_id: int, user=Depends(require_permission("rules:edit"))):
    rule = db.get_rule_config(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    stored_config = rule.get("config") if isinstance(rule.get("config"), dict) else {}
    if rule["detection_method"] == "detector":
        try:
            defaults = get_detector_config(rule["detector_id"])
        except KeyError:
            raise HTTPException(status_code=422, detail="Unknown detector")
        config = {
            **defaults,
            **{key: value for key, value in stored_config.items() if key in defaults},
        }
    else:
        config = {"pattern": stored_config.get("pattern", "")}
    return {"config": config}


@app.put("/api/rules/{rule_id}/config")
async def edit_rule_config(
    rule_id: int,
    update: RuleConfigUpdate,
    user=Depends(require_permission("rules:edit")),
):
    rule = db.get_rule_config(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    stored_config = rule.get("config") if isinstance(rule.get("config"), dict) else {}
    requested_config = update.config

    if rule["detection_method"] == "detector":
        try:
            defaults = get_detector_config(rule["detector_id"])
        except KeyError:
            raise HTTPException(status_code=422, detail="Unknown detector")

        unknown_keys = set(requested_config) - set(defaults)
        if unknown_keys:
            raise HTTPException(status_code=422, detail="Unknown detector config field")

        config = {
            **defaults,
            **{key: value for key, value in stored_config.items() if key in defaults},
            **requested_config,
        }
        for key, default in defaults.items():
            value = config[key]
            if isinstance(default, bool):
                valid_type = isinstance(value, bool)
            elif isinstance(default, int):
                valid_type = isinstance(value, int) and not isinstance(value, bool)
            elif isinstance(default, float):
                valid_type = isinstance(value, (int, float)) and not isinstance(value, bool)
            else:
                valid_type = isinstance(value, type(default))
            if not valid_type:
                raise HTTPException(status_code=422, detail=f"Invalid value for detector config field: {key}")
            if isinstance(default, float):
                config[key] = float(value)
    else:
        unknown_keys = set(requested_config) - {"pattern"}
        if unknown_keys:
            raise HTTPException(status_code=422, detail="Unknown pattern config field")
        config = {"pattern": stored_config.get("pattern", "")}
        config.update(requested_config)
        if not isinstance(config["pattern"], str):
            raise HTTPException(status_code=422, detail="Pattern must be a string")

    updated = db.update_rule(rule_id, {"config": config})
    if not updated:
        raise HTTPException(status_code=404, detail="Rule not found")
    await manager.broadcast({"context": "rule_updated", "data": updated})
    return {"config": config}


@app.delete("/api/rules/{rule_id}")
async def remove_rule(rule_id: int, user=Depends(require_permission("rules:edit"))):
    existing = next((r for r in db.get_all_rules() if r["id"] == rule_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete_rule(rule_id)
    await manager.broadcast({"context": "rule_deleted", "data": {"id": rule_id}})
    return {"status": "ok", "id": rule_id}


@app.get("/api/alerts")
async def get_alerts(user=Depends(require_permission("alerts:view"))):
    return db.get_all_alerts()


@app.get("/api/flows")
async def get_flows(user=Depends(current_user), from_time: Optional[float] = Query(default=None, alias="from")):
    flows = db.get_flows()
    return [f for f in flows if from_time is None or f.get("last_time", 0) >= from_time]


@app.get("/api/logs")
async def get_logs(user=Depends(current_user), from_time: Optional[str] = Query(default=None, alias="from")):
    logs = router_manager.data.get("logs", [])
    if from_time is None:
        return logs
    return [entry for entry in logs if entry.get("timestamp", "") >= from_time]


@app.get("/api/bootstrap")
async def bootstrap(user=Depends(current_user)):
    return {
        "user": {"username": user["username"], "roles": user["roles"], "permissions": user.get("permissions", [])},
        "router": router_snapshot(),
        "dhcp": db.get_clients(),
        "rules": db.get_all_rules() if "rules:view" in user.get("permissions", []) else [],
        "available_detectors" : get_detectors() if "rules:edit" in user.get("permissions", []) else [],
    }

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket, access_token: Optional[str] = Cookie(default=None)):
    if not access_token:
        await websocket.close(code=1008)
        return

    user = get_current_user_from_token(access_token)
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            if action == "ping":
                await websocket.send_json({"context": "pong"})

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)
        
def run_websocket(flow_queue, result_queue):
    init_db()
    detector_defaults = {
        detector["ID"]: get_detector_config(detector["ID"])
        for detector in get_detectors()
    }
    db.sync_detector_configs(detector_defaults)

    async def serve():
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_config=None)
        server = uvicorn.Server(config)
        
        await asyncio.gather(
            server.serve(),
            watch_flows(flow_queue, manager),
            watch_results(result_queue, manager)
        )

    try:
        asyncio.run(serve())
    except KeyboardInterrupt:
        pass
