# tools/network_tools.py
"""Network scanning tools for Windows — nmap, ARP, socket probing."""
import nmap
import subprocess
import socket
from store.memory_store import store


def nmap_scan(subnet: str, arguments: str = "-sn") -> dict:
    """Run an nmap scan and return results."""
    try:
        nm = nmap.PortScanner()
        nm.scan(hosts=subnet, arguments=arguments)
        return {"hosts": nm.all_hosts(), "scanner": nm}
    except Exception as e:
        store.log(f"[NMAP][ERROR] {e}")
        return {"hosts": [], "scanner": None}


def arp_scan() -> list:
    """Get ARP table from Windows."""
    devices = []
    try:
        result = subprocess.run(["arp", "-a"], capture_output=True, text=True)
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[0].count(".") == 3:
                devices.append({
                    "ip": parts[0],
                    "mac": parts[1].replace("-", ":") if len(parts) > 1 else "unknown"
                })
    except Exception as e:
        store.log(f"[ARP][ERROR] {e}")
    return devices


def port_check(host: str, port: int, timeout: float = 0.5) -> bool:
    """Check if a port is open on a host."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        result = s.connect_ex((host, port))
        s.close()
        return result == 0
    except Exception:
        return False


def get_local_ip() -> str:
    """Get the local machine's IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"
