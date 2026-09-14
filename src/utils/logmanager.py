import socket, asyncio, re, time
from multiprocessing import Queue
import utils.database as db
from utils.database import Client, batch_update_flows, add_alert

session_db = db.Session()

async def watch_flows(flow_queue: Queue, manager):
    loop = asyncio.get_event_loop()
    flow_buffer = {}
    last_save = time.time()

    while True:
        try:
            try:
                delta = await loop.run_in_executor(None, lambda: flow_queue.get(timeout=1))
                await manager.broadcast({"context": "flows", "data": delta})

                for key, flow in delta.items():
                    flow_buffer[key] = {
                        'flow_id': flow['flow_id'],
                        'src_ip': flow['src'],
                        'dst_ip': flow['dst'],
                        'protocol': flow['protocol'],
                        'packet_count': flow['packet_count'],
                        'unique_ports': len(flow.get('ports', {})),
                        'start_time': flow['start_time'],
                        'last_time': flow['last_time']
                    }
            except:
                pass

            if time.time() - last_save > 10 and flow_buffer:
                flows_to_save = list(flow_buffer.values())
                await loop.run_in_executor(None, batch_update_flows, flows_to_save)
                flow_buffer.clear()
                last_save = time.time()

        except Exception as e:
            print(f"Error in watch_flows: {e}")
            await asyncio.sleep(1)

async def watch_results(result_queue: Queue, manager):
    loop = asyncio.get_event_loop()
    last_sent = {}

    while True:
        try:
            result = await loop.run_in_executor(None, result_queue.get)
            
            aggregated_alert = await loop.run_in_executor(None, add_alert, result)
            alert_id = aggregated_alert.get('id')
            
            now = time.time()
            is_new = aggregated_alert.get('count', 1) == 1
            if is_new or now - last_sent.get(alert_id, 0) > 5:
                await manager.broadcast({"context": "alert", "data": aggregated_alert})
                last_sent[alert_id] = now

            if is_new:
                print(f"NEW detection result: {result['type']}, src: {result.get('src_ip')}")
            
        except Exception as e:
            print(f"Error in watch_results: {e}")
            await asyncio.sleep(1)

async def watch_logs(log_queue: Queue, manager):
    loop = asyncio.get_event_loop()

    while True:
        try:
            log = await loop.run_in_executor(None, log_queue.get)
            await manager.broadcast({"context": "log", "data": {"message": log, "type": "info"}})

            if 'dhcp' in log:
                mac_pattern = r"([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}"
                mac_match = re.search(mac_pattern, log)
                
                if not mac_match: continue

                client = session_db.query(Client).filter_by(mac=mac_match.group(0)).first()
                
                if client:
                    if 'deassigned' in log:
                        client.status = "expired"
                    elif 'assigned' in log:
                        client.status = "active"
                    session_db.commit()
                    await manager.broadcast({"context": "dhcp", "data": client.to_dict()})
                else:
                    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
                    ips = re.findall(ip_pattern, log)   
                    
                    mac = mac_match.group(0)
                    ip = ips[1] if len(ips) > 1 else ips[0] if ips else "0.0.0.0"

                    parts = log.split(mac)
                    hostname = parts[1].split()[0] if len(parts) > 1 else "Unknown"

                    new_client, client_dict = db.add_client(mac=mac, ip=ip, hostname=hostname, status="active")
                    await manager.broadcast({"context": "dhcp", "data": client_dict})
            
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
