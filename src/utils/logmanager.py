import socket, asyncio, json, re

import utils.database as db

from utils.database import Client
from multiprocessing import Queue

session_db = db.Session()

async def watch_flows(flow_queue: Queue, manager):
    loop = asyncio.get_event_loop()
    
    while True:
        try:
            flow = await loop.run_in_executor(None, flow_queue.get)
            await manager.broadcast({"context": "flows", "data": flow})
        except Exception as e:
            print(f"Error in watch_flows: {e}")
            await asyncio.sleep(1)

async def watch_results(result_queue: Queue, manager):
    loop = asyncio.get_event_loop()

    while True:
        try:
            result = await loop.run_in_executor(None, result_queue.get)
            await manager.broadcast({"context": "alert", "data": result})

            print(f"New detection result: {result['type']}, packet count: {result['total']}, unique ports/sec: {result['ports_per_sec']}")
        except Exception as e:
            print(f"Error in watch_results: {e}")
            await asyncio.sleep(1)

async def watch_logs(log_queue: Queue, manager):
    loop = asyncio.get_event_loop()

    while True:
        try:
            log = await loop.run_in_executor(None, log_queue.get)
            await manager.broadcast({"content": "log", "data": log})

            if 'dhcp' in log:
                mac_pattern = r"([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}"
                mac_match = re.search(mac_pattern, log)
                
                if not mac_match: continue

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
                    await manager.broadcast({"context": "dhcp", "client_id": client.id, "data": client_dict})
                else:
                    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
                    ips = re.findall(ip_pattern, log)   
                    
                    mac = mac_match.group(0)
                    if len(ips) > 1:
                        ip = ips[1]
                    else:
                        ip = ips[0]

                    parts = log.split(mac)
                    hostname = parts[1].split()[0] if len(parts) > 1 else "Unknown"

                    client, client_dict = db.add_client(mac=mac, ip=ip, hostname=hostname, status="active")
                    
                    await manager.broadcast({"context": "dhcp", "client_id": client.id, "data": client_dict})

            
        except Exception as e:
            print(f"Error in watch_logs: {e}")
            await asyncio.sleep(1)

def log_collector(log_queue: Queue):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('0.0.0.0', 5514))

    while True:
        data, addr = s.recvfrom(2048)
        msg = data.decode('utf-8')
        log_queue.put(msg)