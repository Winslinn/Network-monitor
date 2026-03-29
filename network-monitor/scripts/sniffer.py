import socket, asyncio

from scapy.all import IP
from multiprocessing import Process, Queue

async def packet_listener(packet_queue: Queue):
    loop = asyncio.get_event_loop()

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
            
            batch.append(int.from_bytes(packet_view[34:36], 'big'))
            
        packet_queue.put(batch)
    