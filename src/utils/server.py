import asyncio, json, uvicorn, uuid
import src.utils.database as db

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from src.utils.database import session, Router

from src.utils.logmanager import watch_logs
from src.core.sniffer import packet_listener
from src.utils.database import init as init_db

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

    async def broadcast(self, message: str):
        async with self._lock:
            clients = list(self._clients)
        
        if not clients:
            return
        
        await asyncio.gather(
            *[c.send_text(message) for c in clients],
            return_exceptions=True
        )

manager = ConnectionManager()
init_db()

@app.get("/api/auth")
def auth(response: Response, user_id: Optional[str] = Cookie(default=None)):
    is_new = False

    if not user_id:
        user_id = str(uuid.uuid4())
        is_new = True

    user = db.user(user_id)

    if is_new:
        response.set_cookie(
            key="user_id",
            value=user_id,
            max_age=365*24*60*60,
            httponly=True,
            samesite="lax"
        )

    return {"uuid": user["uuid"], "role": user["role"]}

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: Optional[str] = Cookie(default=None)
):
    router = session().query(Router).first()
    role = db.user(user_id) if user_id else "guest"
    
    if router is None:
        router = Router(
            mac_address="00:00:00:00:00:00",
            ip_address="192.168.0.113",
            dns_server="8.8.8.8"
        )
        session().add(router)
        session().commit()

    await manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps(
            {
                "context": "initial",
                "role": role,
                "dhcp": db.get_clients(),
                "router": {
                    "mac_address": router.mac_address,
                    "ip_address": router.ip_address,
                    "dns_server": router.dns_server
                }
            }
        ))

        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                action = message.get("action")

                if action == "add_rule" and role == "admin":
                    rule_data = message.get("rule")

                    rule_data, rule_dict = db.add_rule(
                        name=rule_data["name"],
                        type=rule_data["type"],
                        severity=rule_data["severity"],
                        description=rule_data["description"],
                        pattern=rule_data["pattern"]
                    )
                    
                    await websocket.send_text(json.dumps({
                        "context": "rule_added",
                        "rule": rule_dict
                    }))

                elif action == "delete_rule" and role == "admin":
                    rule_id = message.get("rule_id")
                    db.delete_rule(rule_id)

                elif action == "get_rules" and role == "admin" or role == "analyst":
                    rules = db.get_all_rules()
                    await websocket.send_text(json.dumps({
                        "context": "rules_list",
                        "data": rules
                    }))

                elif action == "get_alerts" and role == "admin" or role == "analyst":
                    alerts = db.get_all_alerts()
                    await websocket.send_text(json.dumps({
                        "context": "alerts_history",
                        "data": alerts
                    }))

                elif action == "clear_alerts":
                    db.clear_all_alerts()

            except json.JSONDecodeError:
                print("Getted non-JSON message:", data)
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)

def run_websocket(log_queue, packet_queue):
    async def f():
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_config=None)
        server = uvicorn.Server(config)
        
        await asyncio.gather(
            server.serve(),
            watch_logs(log_queue, manager),
            packet_listener(packet_queue)
        )

    asyncio.run(f())