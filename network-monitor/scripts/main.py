import asyncio

from multiprocessing import Process, Queue
from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout

from logmanager import log_collector
from server import run_websocket

async def handle_input():
    session = PromptSession(erase_when_done=True)
    while True:
        try:
            with patch_stdout():
                text = await session.prompt_async("> ")
                if text.strip() == "exit":
                    break
        except (EOFError, KeyboardInterrupt):
            break

async def main():
    log_queue = Queue()

    collector_proc = Process(target=log_collector, args=(log_queue,), daemon=True)
    handler_proc = Process(target=run_websocket, args=(log_queue,), daemon=True)

    collector_proc.start()
    handler_proc.start()
    
    await handle_input()

if __name__ == "__main__":
    asyncio.run(main())