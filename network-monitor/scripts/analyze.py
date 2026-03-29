import re, json, asyncio, datetime

from datetime import date
from database import add_alert

port_scanning = {}

async def analyze_log(log, manager):
    if 'TCP_PORT_SCANNING' in log:
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        ips = re.findall(ip_pattern, log)
        if ips and not ips[1] in port_scanning:
            src_ip = ips[1]
            dst_ip = ips[0]
            port_scanning[src_ip] = f"{src_ip} to {dst_ip}"

            alert, to_dict = add_alert(
                timestamp=date.today().isoformat(),
                type="Port Scanning",
                severity="Medium",
                src_ip=src_ip,
                dst_ip=dst_ip,
                description=f"Detected port scanning from {src_ip} to {dst_ip}"
            )

            await manager.broadcast(json.dumps({"context": "alert", "data": to_dict}))
