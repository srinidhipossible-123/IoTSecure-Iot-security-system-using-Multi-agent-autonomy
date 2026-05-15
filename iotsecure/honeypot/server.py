# honeypot/server.py
"""
Fake IoT device endpoint that logs all attacker interactions.
Pretends to be a vulnerable IP camera / smart home hub.
"""
import socket, threading, time, json, uuid
from store.memory_store import store

FAKE_BANNER = b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nServer: GoAhead/3.1.5\r\n\r\n"
FAKE_PAGE = b"<html><body><h1>IP Camera Admin</h1><form>User:<input name=user> Pass:<input name=pass type=password><input type=submit value=Login></form></body></html>"
FAKE_LOGIN_RESPONSE = b"HTTP/1.1 302 Found\r\nLocation: /setup.html\r\n\r\n"

class HoneypotServer:
    def __init__(self, port: int, on_hit=None):
        self.port = port
        self.on_hit = on_hit
        self._running = False

    def start(self):
        self._running = True
        try:
            srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            srv.bind(("0.0.0.0", self.port))
            srv.listen(10)
            srv.settimeout(1.0)
            store.log(f"[HONEYPOT] Listening on port {self.port}")
            while self._running:
                try:
                    conn, addr = srv.accept()
                    threading.Thread(target=self._handle, args=(conn, addr), daemon=True).start()
                except socket.timeout:
                    continue
        except Exception as e:
            store.log(f"[HONEYPOT][ERROR] {e}")

    def stop(self):
        self._running = False

    def _handle(self, conn: socket.socket, addr: tuple):
        attacker_ip, attacker_port = addr
        payloads = []
        try:
            conn.send(FAKE_BANNER + FAKE_PAGE)
            conn.settimeout(3.0)
            while True:
                try:
                    data = conn.recv(4096)
                    if not data:
                        break
                    payloads.append(data.decode("utf-8", errors="replace")[:200])
                    if b"user=" in data or b"pass=" in data:
                        conn.send(FAKE_LOGIN_RESPONSE)
                except socket.timeout:
                    break
        except Exception:
            pass
        finally:
            conn.close()

        hit = {
            "timestamp": time.time(),
            "attacker_ip": attacker_ip,
            "attacker_mac": "unknown",
            "ports_tried": [self.port],
            "payloads": payloads,
            "fingerprint": f"{attacker_ip}:{attacker_port}",
            "canary_triggered": any("pass" in p.lower() for p in payloads)
        }
        store.log(f"[HONEYPOT] Hit from {attacker_ip} — payloads={len(payloads)} canary={hit['canary_triggered']}")
        if self.on_hit:
            self.on_hit(hit)
