import socket, asyncio

from scapy.all import IP
from multiprocessing import Process, Queue

async def packet_listener(packet_queue: Queue):
    loop = asyncio.get_event_loop()
    
    while True:
        content = await loop.run_in_executor(None, packet_queue.get) 
        print(content)

def packet_collector(packet_queue: Queue):
    s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.ntohs(3))
    s.bind(("wlp2s0", 0))
    
    s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2**20)
    buffer = bytearray(2048)
    view = memoryview(buffer)

    while True:
        batch = []
        
        for _ in range(100):
            nbytes = s.recv_into(buffer)
            packet_view = view[:nbytes]
            
            version = packet_view[14] >> 4
            length =  (packet_view[14] & 0x0F) * 4
            protocol = packet_view[23]
            src_address = socket.inet_ntoa(packet_view[26:30])
            dst_address = socket.inet_ntoa(packet_view[30:34])
            trans_offset = 14 + length
            
            option = [
                int.from_bytes(packet_view[trans_offset:trans_offset+2], 'big'),
                int.from_bytes(packet_view[trans_offset+2:trans_offset+4], 'big'),
            ]

            batch.append((
                version,
                length,
                protocol, 
                src_address, 
                dst_address,
                option
            ))

            
        packet_queue.put(batch)
    