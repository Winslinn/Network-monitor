from sqlalchemy import true
import asyncio, json, uvicorn, jwt, datetime
import utils.database as db

from os import getenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Cookie, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field

from utils.database import Session, Router, init_db
from utils.logmanager import watch_flows, watch_results
from core.router import init as init_router, router_manager
from utils.snmp import close_snmp
from core.loader import get_detectors

SECRET_KEY = getenv("SECRET_KEY")
ALGORITHM = getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

class LoginRequest(BaseModel):
    username: str
    password: str


class RuleCreate(BaseModel):
    name: str = Field(min_length=1)
    type: str
    severity: str = "medium"
    description: str = ""
    pattern: str = ""
    is_enabled: bool = True


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    pattern: Optional[str] = None
    is_enabled: Optional[bool] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(init_router(manager))
    yield
    task.cancel()
    close_snmp()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://potyshyi-server:3001", 
        "https://potyshyi-server",
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
    created = db.add_rule(rule.model_dump())
    await manager.broadcast({"context": "rule_created", "data": created})
    return created


@app.patch("/api/rules/{rule_id}")
async def edit_rule(rule_id: int, rule: RuleUpdate, user=Depends(require_permission("rules:edit"))):
    updated = db.update_rule(rule_id, rule.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Rule not found")
    await manager.broadcast({"context": "rule_updated", "data": updated})
    return updated


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
    # Logs are currently transient events; websocket is the source of truth for live data.
    return []


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
