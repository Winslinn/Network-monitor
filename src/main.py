import asyncio

from multiprocessing import Process, Queue
from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout

from utils.logmanager import log_collector
from utils.server import run_websocket
from core.sniffer import packet_collector

async def handle_input():
    session = PromptSession(erase_when_done=True)
    while True:
        try:
            with patch_stdout():
                text = await session.prompt_async("> ")
                if text.strip() == 'exit':
                    break
        except (EOFError, KeyboardInterrupt):
            break

async def main():
    log_queue = Queue()
    packet_queue = Queue()  

    processes = [
        Process(target=log_collector, args=(log_queue,), daemon=True),
        Process(target=packet_collector, args=(packet_queue,), daemon=True),
        Process(target=run_websocket, args=(log_queue, packet_queue), daemon=True)
    ]

    for proc in processes:
        proc.start()
        
    try:
        await handle_input()
    finally:
        for process in processes:
            if process.is_alive():
                process.terminate()
                process.join()

if __name__ == "__main__":
    asyncio.run(main())