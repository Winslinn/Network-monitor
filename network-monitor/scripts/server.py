import asyncio, socket, json, uvicorn, re
import database as db

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from multiprocessing import Queue
from database import session, Router

from logmanager import watch_logs

app = FastAPI()

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
        
        if 'dhcp1' in message:
            results = await asyncio.gather(
                *[c.send_text(message) for c in clients],
                return_exceptions=True
            )
        
            dead = {c for c, r in zip(clients, results) if isinstance(r, Exception)}
            if dead:
                async with self._lock:
                    self._clients -= dead

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    router = session().query(Router).first()
    await manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps(
            {
                "context": "initial",
                "dhcp": db.get_clients(),
                "router": {
                    "mac_address": router.mac_address,
                    "ip_address": router.ip_address,
                    "dns_server": router.dns_server
                }
            }
        ))

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)

def run_websocket(log_queue):
    async def f():
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_config=None)
        server = uvicorn.Server(config)
        
        await asyncio.gather(
            server.serve(),
            watch_logs(log_queue, manager)
        )

    asyncio.run(f())