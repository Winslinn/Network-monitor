import socket

# Налаштування
LISTEN_IP = "0.0.0.0" 
LISTEN_PORT = 37008
TARGET_IP = "100.101.30.34"
TARGET_PORT = 37008

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((LISTEN_IP, LISTEN_PORT))

print(f"Relay started: {LISTEN_PORT} -> {TARGET_IP}:{TARGET_PORT}")

while True:
    data, addr = sock.recvfrom(65535)
    # Пересилаємо пакет на сервер
    sock.sendto(data, (TARGET_IP, TARGET_PORT))