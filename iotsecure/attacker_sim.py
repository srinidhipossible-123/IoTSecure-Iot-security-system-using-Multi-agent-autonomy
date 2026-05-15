# attacker_sim.py — run this on a second device connected to the same hotspot
import socket, time, sys

TARGET = sys.argv[1] if len(sys.argv) > 1 else "192.168.43.2"
HONEYPOT_PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8888
PORTS = [22, 23, 80, 443, 554, 1883, 4443, 7547, 8080, 8888, HONEYPOT_PORT]

print(f"[*] IoTSecure Attack Simulator")
print(f"[*] Target: {TARGET}")
print(f"[*] Scanning ports: {PORTS}")
print()

# Phase 1: Port scan
for port in PORTS:
    try:
        s = socket.socket()
        s.settimeout(0.5)
        result = s.connect_ex((TARGET, port))
        status = "OPEN" if result == 0 else "closed"
        print(f"  Port {port:5d}: {status}")
        s.close()
    except Exception:
        print(f"  Port {port:5d}: filtered")
    time.sleep(0.1)

print()
print(f"[*] Connecting to honeypot on port {HONEYPOT_PORT}...")
time.sleep(1)

# Phase 2: Honeypot interaction
try:
    s = socket.socket()
    s.settimeout(5)
    s.connect((TARGET, HONEYPOT_PORT))
    banner = s.recv(4096)
    print(f"[+] Banner received ({len(banner)} bytes)")
    print(f"[*] Sending fake credentials...")
    s.send(b"GET /login HTTP/1.1\r\nHost: target\r\n\r\nuser=admin&pass=admin123\r\n")
    response = s.recv(1024)
    print(f"[+] Response: {response[:80]}")
    s.close()
    print("[*] Attack simulation complete — check IoTSecure dashboard!")
except Exception as e:
    print(f"[-] Could not reach honeypot: {e}")
