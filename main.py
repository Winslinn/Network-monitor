import requests
import json

from requests.auth import HTTPBasicAuth

router = "192.168.0.133"
certificate = "cert1.crt"
    
class Router:
    def __init__(self):
        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth("admin", "admin")
        self.session.verify = certificate

def main():
    monitor = Router()

    while True:
        direction = input("Enter direction to get response (for example: /ip/address): ")
        response = monitor.session.get(f"https://{router}/rest{direction}")
        print(json.dumps(response.json(), indent=4))

if __name__ == "__main__":
    main()