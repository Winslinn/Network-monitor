import asyncio, json, uvicorn, uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Cookie, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict

import utils.database as db
from utils.database import Session, Router, init_db
from utils.logmanager import watch_logs
from core.sniffer import packet_listener

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

def get_user_role(user_id: Optional[str]) -> str:
    if not user_id: return "guest"
    user = db.user(user_id)
    return user.get("role", "guest")

@app.get("/api/auth")
def auth(response: Response, user_id: Optional[str] = Cookie(default=None)):
    if not user_id:
        user_id = str(uuid.uuid4())
        response.set_cookie(key="user_id", value=user_id, httponly=True, samesite="lax")
    
    user = db.user(user_id)
    return {"uuid": user["uuid"], "role": user["role"]}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: Optional[str] = Cookie(default=None)):
    role = get_user_role(user_id)
    
    with Session() as session:
        router = session.query(Router).first()
        if not router:
            router = Router(mac_address="00:00:00...", ip_address="192.168.0.1", dns_server="8.8.8.8")
            session.add(router)
            session.commit()
            session.refresh(router)
        
        router_data = {
            "mac_address": router.mac_address,
            "ip_address": router.ip_address,
            "dns_server": router.dns_server
        }

    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "context": "initial",
            "role": role,
            "dhcp": db.get_clients(),
            "router": router_data
        })

        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if role == "admin":
                if action == "add_rule":
                    _, rule_dict = db.add_rule(**data.get("rule"))
                    await websocket.send_json({"context": "rule_added", "rule": rule_dict})
                elif action == "delete_rule":
                    db.delete_rule(data.get("rule_id"))
                elif action == "clear_alerts":
                    db.clear_all_alerts()

            if role in ["admin", "analyst"]:
                if action == "get_rules":
                    await websocket.send_json({"context": "rules_list", "data": db.get_all_rules()})
                elif action == "get_alerts":
                    await websocket.send_json({"context": "alerts_history", "data": db.get_all_alerts()})

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)

def run_websocket(log_queue, packet_queue):
    init_db()
    
    async def serve():
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_config=None)
        server = uvicorn.Server(config)
        
        await asyncio.gather(
            server.serve(),
            watch_logs(log_queue, manager),
            packet_listener(packet_queue)
        )

    asyncio.run(serve())