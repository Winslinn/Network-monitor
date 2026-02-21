import asyncio, socket, json, uvicorn

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from multiprocessing import Queue

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
        print(f"DEBUG: Client connected. Total: {len(self._clients)}")

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            self._clients.discard(ws)
        print("DEBUG: Client disconnected")

    async def broadcast(self, message: str):
        async with self._lock:
            clients = list(self._clients)
        
        if not clients:
            return
        
        if 'dhcp1' in message.lower():
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
    await manager.connect(websocket)
    try:
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