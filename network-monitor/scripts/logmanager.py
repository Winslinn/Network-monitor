import socket, asyncio, json, re
import database as db

from database import Client, session
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from multiprocessing import Queue
from analyze import analyze_log

session_db = db.session()

async def watch_logs(log_queue: Queue, manager: classmethod):
    loop = asyncio.get_event_loop()

    while True:
        try:
            log = await loop.run_in_executor(None, log_queue.get)
            
            print(f"\r\033[0;32m{log}\033[0m\n> ", end="", flush=True)
            await analyze_log(log, manager)

            if 'dhcp1' in log:
                mac_pattern = r"([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}"
                mac_match = re.search(mac_pattern, log)

                #session_db.expire_all()
                client = session_db.query(Client).filter_by(mac=mac_match.group(0)).first()
                client_dict = None

                if client:
                    if 'deassigned' in log:
                        client.status = "expired"
                    elif 'assigned' in log:
                        client.status = "active"
                    session_db.commit()
                    client_dict = client.to_dict()
                    await manager.broadcast(json.dumps({"context": "dhcp1", "client_id": client.id, "data": client_dict}))
                else:
                    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
                    ips = re.findall(ip_pattern, log)   

                    if mac_match:
                        mac = mac_match.group(0)
                        ip = ips[1]

                        parts = log.split(mac)
                        hostname = parts[1].split()[0] if len(parts) > 1 else "Unknown"

                        client, client_dict = db.add_client(mac=mac, ip=ip, hostname=hostname, status="active")
                        await manager.broadcast(json.dumps({"context": "dhcp1_new", "client_id": client.id, "data": client_dict}))

            msg = json.dumps({"content": log})
        except Exception as e:
            print(f"Error in watch_logs: {e}")
            await asyncio.sleep(1)

def log_collector(log_queue: Queue):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('127.0.0.1', 5514))

    while True:
        data, addr = s.recvfrom(2048)
        msg = data.decode('utf-8')
        log_queue.put(msg)