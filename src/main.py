import asyncio, json
import src.utils.database as db

from requests.sessions import Session
from requests.auth import HTTPBasicAuth
from multiprocessing import Process, Queue
from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout

from src.utils.logmanager import log_collector
from src.utils.server import run_websocket
from src.core.sniffer import packet_collector

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

    collector_proc = Process(target=log_collector, args=(log_queue,), daemon=True)
    packet_proc = Process(target=packet_collector, args=(packet_queue,), daemon=True)
    handler_proc = Process(target=run_websocket, args=(log_queue, packet_queue), daemon=True)

    collector_proc.start()
    handler_proc.start()
    packet_proc.start()
    
    await handle_input()

if __name__ == "__main__":
    asyncio.run(main())