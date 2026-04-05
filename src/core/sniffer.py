import socket, asyncio

from multiprocessing import Queue

async def packet_listener(packet_queue: Queue):
    loop = asyncio.get_event_loop()
    
    while True:
        content = await loop.run_in_executor(None, packet_queue.get)
        
        #print(content)

def packet_collector(packet_queue: Queue):
    listen_ip = '0.0.0.0'
    listen_port = 37008
    
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind((listen_ip, listen_port))
    
    s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2**20)
    buffer = bytearray(2048)
    view = memoryview(buffer)

    while True:
        batch = []
        
        for _ in range(100):
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
            data_offset, payload, flags = None, None, None
            if protocol == 6: 
                data_offset = (packet_view[trans_offset+12] >> 4) * 4
                flags = packet_view[trans_offset+13]
                
                if flags == 24 and not (22 in ports or 443 in ports):  # PSH+ACK
                    _hex = packet_view[trans_offset + data_offset:ip_header + packet_length].hex()
                    payload = bytes.fromhex(_hex).decode('utf-8', errors='ignore')
            
            batch.append((
                version, packet_length, protocol, 
                src_address, dst_address, ports, 
                flags, payload
            ))

            
        packet_queue.put(batch)