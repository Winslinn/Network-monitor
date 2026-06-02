import asyncio, json, uvicorn, jwt, datetime
import utils.database as db

from os import getenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Cookie, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from contextlib import asynccontextmanager
from pydantic import BaseModel

from utils.database import Session, Router, init_db
from utils.logmanager import watch_logs, watch_flows, watch_results
from core.router import init as init_router, router_manager
from utils.snmp import close_snmp

SECRET_KEY = getenv("SECRET_KEY")
ALGORITHM = getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

class LoginRequest(BaseModel):
    username: str
    password: str

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
        "http://potyshyi-server:3001", 
        "http://potyshyi-server",
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

@app.post("/api/login")
async def login(request: LoginRequest, response: Response):
    user = db.get_user(request.username)
    if not user or not db.verify_password(request.password, user["pwrd"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    token = create_access_token(data={"sub": user["username"]})
    response.set_cookie(
        key="access_token", 
        value=token, 
        httponly=True, 
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"status": "ok"}

@app.get("/api/me")
async def get_me(access_token: Optional[str] = Cookie(default=None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = get_current_user_from_token(access_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return {
        "username": user["username"], 
        "roles": user["roles"], 
        "permissions": user.get("permissions", [])
    }

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "ok"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, access_token: Optional[str] = Cookie(default=None)):
    if not access_token:
        await websocket.close(code=1008)
        return

    user = get_current_user_from_token(access_token)
    if not user:
        await websocket.close(code=1008)
        return

    role = user["roles"][0] if user["roles"] else "guest"
    permissions = user.get("permissions", [])

    with Session() as session:
        router = session.query(Router).first()
        if not router:
            router = Router(
                mac_address=router_manager.data.get('mac_address'),
                ip_address=router_manager.data.get('lan_address')
            )
            session.add(router)
            session.commit()

        router_data = {
            "device_name": router_manager.data.get("device_name"),
            "mac_address": router.mac_address,
            "ip_address": router.ip_address,
            "dns_server": router.dns_server
        }

    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "context": "initial",
            "role": role,
            "permissions": permissions,
            "dhcp": db.get_clients(),
            "router": router_data
        })

        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "get_rules":
                if "rules:view" in permissions:
                    await websocket.send_json({"context": "rules_list", "data": db.get_all_rules()})

            elif action == "get_alerts":
                if "alerts:view" in permissions:
                    await websocket.send_json({"context": "alerts_history", "data": db.get_all_alerts()})

            elif action == "add_rule":
                if "rules:edit" in permissions:
                    rule_data = data.get("rule")
                    if rule_data:
                        db.add_rule(rule_data)
                        await websocket.send_json({"context": "rules_list", "data": db.get_all_rules()})

            elif action == "delete_rule":
                if "rules:edit" in permissions:
                    rule_id = data.get("rule_id")
                    if rule_id:
                        db.delete_rule(rule_id)
                        await websocket.send_json({"context": "rules_list", "data": db.get_all_rules()})

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)
def run_websocket(log_queue, flow_queue, result_queue):
    init_db()
    async def serve():
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_config=None)
        server = uvicorn.Server(config)
        
        await asyncio.gather(
            server.serve(),
            watch_logs(log_queue, manager),
            watch_flows(flow_queue, manager),
            watch_results(result_queue, manager)
        )

    try:
        asyncio.run(serve())
    except KeyboardInterrupt:
        pass
