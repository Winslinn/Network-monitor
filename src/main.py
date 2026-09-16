import asyncio
import signal
from multiprocessing import Process, Queue

from utils.server import run_websocket
from core.sniffer import packet_collector

async def main():
    result_queue = Queue()
    flow_queue = Queue()

    processes = [
        Process(target=run_websocket, args=(flow_queue, result_queue), daemon=True),
        Process(target=packet_collector, args=(result_queue, flow_queue), daemon=True)
    ]

    for proc in processes:
        proc.start()

    stop_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except NotImplementedError:
            pass

    try:
        await stop_event.wait()
    finally:
        for process in processes:
            if process.is_alive():
                process.terminate()
                process.join()

if __name__ == "__main__":
    asyncio.run(main())
