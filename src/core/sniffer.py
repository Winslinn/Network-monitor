import socket, asyncio

from multiprocessing import Process, Queue

async def packet_listener(packet_queue: Queue):
    loop = asyncio.get_event_loop()
    
    while True:
        content = await loop.run_in_executor(None, packet_queue.get)
        
        print(content)

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
            
            version = packet_view[ip_header] >> 4
            length = (packet_view[ip_header] & 0x0F) * 4
            protocol = packet_view[ip_header + 9]
            src_address = socket.inet_ntoa(packet_view[ip_header + 12:ip_header + 16])
            dst_address = socket.inet_ntoa(packet_view[ip_header + 16:ip_header + 20])
            
            trans_offset = ip_header + length
            
            ports = [0, 0]
            if protocol in [6, 17]:
                ports = [
                    int.from_bytes(packet_view[trans_offset:trans_offset+2], 'big'),
                    int.from_bytes(packet_view[trans_offset+2:trans_offset+4], 'big'),
                ]
            

            batch.append((
                version, length, protocol, 
                src_address, dst_address, ports
            ))

            
        packet_queue.put(batch)