import time
from collections import Counter

# TCP прапори
SYN = 0x02
ACK = 0x10
RST = 0x04

# Пороги
SYN     = 0x02
RST_ACK = 0x14
SYN_ACK = 0x12
SEVERITY = 'medium'
DESCRIPTION = "Потенційне SYN сканування: багато SYN+ACK з відповідями RST+ACK"

MIN_PORTS  = 15
RST_RATIO  = 0.7

class SynScanDetector:
    def analyze(self, flow: dict) -> dict | None:
        if flow['protocol'] != 6:
            return None

        flags         = flow['flags']
        total_packets = flow['packet_count']
        unique_ports  = flow['unique_ports'] if 'unique_ports' in flow else len(flow.get('dports', {}))

        if total_packets == 0:
            return None

        rst_ack_count = flags.get(RST_ACK, 0)
        syn_ack_count = flags.get(SYN_ACK, 0)
        duration      = flow['last_time'] - flow['start_time']
        ports_per_sec = unique_ports / duration if duration > 0 else unique_ports

        if (
            unique_ports  >= MIN_PORTS
            and rst_ack_count / total_packets >= RST_RATIO
            and syn_ack_count > 0
            and ports_per_sec >= 1
        ):
            return {
                'type':           'SYN scan',
                'severity':       SEVERITY,
                'description':    DESCRIPTION,
                'src':            flow['src'],
                'dst':            flow['dst'],
                'unique_ports':   unique_ports,
                'rst_ack_count':  rst_ack_count,
                'total':          total_packets,
                'duration':       round(duration, 2),
                'ports_per_sec':  round(ports_per_sec, 1),
                'timestamp':      time.time()
            }

        return None