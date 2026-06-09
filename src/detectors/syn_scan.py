import time
from collections import Counter

SYN = 0x02
ACK = 0x10
RST = 0x04

SYN = 0x02
RST_ACK = 0x14
SYN_ACK = 0x12
SEVERITY = 'medium'
DESCRIPTION = "Потенційне сканування портів, використовується багато різних портів з відповідними прапорами"

class SynScanDetector:
    def __init__(self):
        self.MIN_PORTS = 5  
        self.RST_RATIO = 0.7

    def analyze(self, flow: dict) -> dict | None:
        if flow['protocol'] != 6:
            return None

        flags = flow['flags']
        packets_count = flow['packet_count']
        unique_ports = flow['unique_ports'] if 'unique_ports' in flow else len(flow.get('dports', {}))

        if packets_count == 0:
            return None

        rst_ack_count = flags.get(RST_ACK, 0)
        syn_ack_count = flags.get(SYN_ACK, 0)
        duration = flow['last_time'] - flow['start_time']
        ports_per_sec = unique_ports / duration if duration > 0 else unique_ports

        if (
            # 1. Перевіряємо, що опитано вже від 5 портів
            unique_ports >= self.MIN_PORTS
            
            # 2. Перевіряємо, що ми отримали відповіді (або закриті, або відкриті порти)
            and (rst_ack_count > 0 or syn_ack_count > 0)
            
            # 3. Швидкість перебору портів
            and ports_per_sec >= 1
        ):
            return {
                'type': 'Сканування портів',
                'severity': SEVERITY,
                'description': DESCRIPTION,
                'flow_id': flow['flow_id'],
                'src': flow['src'],
                'dst': flow['dst'],
                'unique_ports': unique_ports,
                'rst_ack_count': rst_ack_count,
                'total': packets_count,
                'duration': round(duration, 2),
                'ports_per_sec': round(ports_per_sec, 1),
                'timestamp': time.time()
            }

        return None