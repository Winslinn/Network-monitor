import time
from collections import Counter

SYN = 0x02
ACK = 0x10
RST = 0x04

SYN = 0x02
RST_ACK = 0x14
SYN_ACK = 0x12

class SynScanDetector:
    def __init__(self):
        self.ID = 'port_scan'
        self.TYPE = 'Сканування портів'
        self.SEVERITY = 'medium'
        self.DESCRIPTION = "Забагато запитів сканування портів від одного хоста"

        self.CONFIG = {
            'min_ports': 5,
            'rst_ratio': 0.7,
        }

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
        response_count = rst_ack_count + syn_ack_count
        rst_ratio = rst_ack_count / response_count if response_count else 0
        duration = flow['last_time'] - flow['start_time']
        ports_per_sec = unique_ports / duration if duration > 0 else unique_ports

        if (
            # 1. Перевіряємо, що опитано достатньо портів
            unique_ports >= self.CONFIG['min_ports']
            
            # 2. Частка RST-ACK серед SYN-ACK і RST-ACK відповідей досягає порога
            and response_count > 0
            and rst_ratio >= self.CONFIG['rst_ratio']
            
            # 3. Швидкість перебору портів
            and ports_per_sec >= 1
        ):
            return {
                'type': self.TYPE,
                'severity': self.SEVERITY,
                'description': self.DESCRIPTION,
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
