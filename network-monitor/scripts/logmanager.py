import socket, asyncio, json, html, uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from multiprocessing import Queue

async def watch_logs(log_queue: Queue, manager: classmethod):
    loop = asyncio.get_event_loop()
    print("DEBUG: watch_logs task started")
    while True:
        try:
            log = await loop.run_in_executor(None, log_queue.get)
            
            print(f"\r\033[0;32m{log}\033[0m\n> ", end="", flush=True)

            msg = json.dumps({"content": log})
            await manager.broadcast(msg)
        except Exception as e:
            print(f"Error in watch_logs: {e}")
            await asyncio.sleep(1)

def log_collector(log_queue):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('127.0.0.1', 5514))
    print("UDP Collector started on port 5514")

    while True:
        data, addr = s.recvfrom(2048)
        msg = data.decode('utf-8')
        log_queue.put(msg)