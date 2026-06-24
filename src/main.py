import asyncio
import signal

from multiprocessing import Process, Queue

from utils.logmanager import log_collector
from utils.server import run_websocket
from core.sniffer import packet_collector

async def main():
    log_queue = Queue()
    result_queue = Queue()
    flow_queue = Queue()

    processes = [
        Process(target=log_collector, args=(log_queue,), daemon=True),
        Process(target=run_websocket, args=(log_queue, flow_queue, result_queue), daemon=True),
        Process(target=packet_collector, args=(result_queue, flow_queue), daemon=True)
    ]

    for proc in processes:
        proc.start()

    stop_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGTERM, stop_event.set)
    loop.add_signal_handler(signal.SIGINT, stop_event.set)

    await stop_event.wait()

    for process in processes:
        if process.is_alive():
            process.terminate()
            process.join()

if __name__ == "__main__":
    asyncio.run(main())
