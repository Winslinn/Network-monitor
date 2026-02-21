import asyncio, json
import database as db

from requests.sessions import Session
from requests.auth import HTTPBasicAuth
from multiprocessing import Process, Queue
from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout
from database import init as init_db

from logmanager import log_collector
from server import run_websocket

router_ip = db.Router.ip_address

class Router:
    def __init__(self):
        self.session = Session()
        self.session.auth = HTTPBasicAuth(db.Router.admin_login, db.Router.admin_password)
        self.session.verify = '../../cert1.crt'

def get_directory(session: Session, direction: str):
    response = session.get(f"http://{router_ip}/rest{direction}")
    return json.dumps(response.json())

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

    collector_proc = Process(target=log_collector, args=(log_queue,), daemon=True)
    handler_proc = Process(target=run_websocket, args=(log_queue,), daemon=True)
    init_db()

    collector_proc.start()
    handler_proc.start()
    
    await handle_input()

if __name__ == "__main__":
    asyncio.run(main())