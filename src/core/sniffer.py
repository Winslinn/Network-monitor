import socket, time

from collections import Counter
from multiprocessing import Queue
from core.loader import DETECTORS
        
def get_service_port(sport, dport):
    if dport >= 49152 and sport < 49152:
        return sport
    if sport >= 49152 and dport < 49152:
        return dport
    return min(sport, dport)

def get_flow_key(packet):
    src = packet['src_address']
    dst = packet['dst_address']
    proto = packet['protocol']
    
    if src > dst:
        return (dst, src, proto)
    return (src, dst, proto)

def packet_collector(result_queue: Queue, flow_queue: Queue):
    listen_ip = '0.0.0.0'
    listen_port = 37008
    
    flows = dict()
    dirty = set()
    
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind((listen_ip, listen_port))
    
    s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2**20)
    buffer = bytearray(2048)
    view = memoryview(buffer)

    while True:
        nbytes = s.recv_into(buffer)
        packet_view = view[:nbytes]
        
        ip_header = 12
        
        # Extract Ethernet frame fields
        packet_length = int.from_bytes(packet_view[ip_header+2:ip_header+4], 'big')  # Ethernet frame length
        
        # Extract IP header fields
        version = packet_view[ip_header] >> 4
        protocol_length = (packet_view[ip_header] & 0x0F) * 4
        protocol = packet_view[ip_header + 9]
        src_address = socket.inet_ntoa(packet_view[ip_header + 12:ip_header + 16])
        dst_address = socket.inet_ntoa(packet_view[ip_header + 16:ip_header + 20])
        
        trans_offset = ip_header + protocol_length
        
        # TCP (6) or UDP (17) - extract ports
        ports = [0, 0]
        if protocol in [6, 17]:
            ports = [
                int.from_bytes(packet_view[trans_offset:trans_offset+2], 'big'),
                int.from_bytes(packet_view[trans_offset+2:trans_offset+4], 'big'),
            ]
        
        # For TCP, also extract data offset and flags
        data_offset, flags = None, None
        if protocol == 6: 
            data_offset = (packet_view[trans_offset+12] >> 4) * 4
            flags = packet_view[trans_offset+13]

        processed_packet = {
            'version': version,
            'packet_length': packet_length,
            'protocol': protocol,
            'src_address': src_address,
            'dst_address': dst_address,
            'src_port': ports[0],
            'dst_port': ports[1],
            'flags': flags
        }
        
        packet_key = get_flow_key(processed_packet)
        dirty.add(packet_key)
        
        if packet_key not in flows:
            flows[packet_key] = {
                'src': src_address,
                'dst': dst_address,
                'protocol': protocol,
                'start_time': time.time(),
                'last_time': 0,
                'flags': Counter(),
                'dports': Counter(),
                'packet_count': 0,
            }
        
        service_port = get_service_port(ports[0], ports[1])
        
        flows[packet_key]['last_time'] = time.time()
        flows[packet_key]['dports'][service_port] += 1
        flows[packet_key]['packet_count'] += 1
        if flags is not None:
            flows[packet_key]['flags'][flags] += 1

        delta = {}
        for k in dirty:
            v = flows[k]
            str_key = f"{k[0]}-{k[1]}/{k[2]}"
            delta[str_key] = {
                'src':          v['src'],
                'dst':          v['dst'],
                'protocol':     v['protocol'],
                'packet_count': v['packet_count'],
                'unique_ports': len(v['dports']),
                'flags':        dict(v['flags']),
                'start_time':   v['start_time'],
                'last_time':    v['last_time']
            }

            for detector in DETECTORS:
                result = detector.analyze(v)
                if result:
                    result_queue.put(result)

        flow_queue.put(delta)
        dirty.clear()