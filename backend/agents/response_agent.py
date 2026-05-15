"""
Response Agent — Executes defensive actions: IP blocking, device quarantine, alert logging.
All actions are logged for full audit trail.
"""
import time
import os
from agents.tracer import trace

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# In-memory state for demo
_blocked_ips = set()
_quarantined_devices = set()


@trace("response.block_ip")
def block_attacker_ip(ip: str) -> dict:
    """Block an attacker IP address. In production, this would modify iptables."""
    _blocked_ips.add(ip)
    log_alert(f"[RESPONSE] Blocked attacker IP: {ip}", severity="HIGH")
    return {"action": "block_ip", "ip": ip, "status": "blocked", "ts": time.time()}


@trace("response.quarantine")
def quarantine_device(device_ip: str, reason: str = "") -> dict:
    """Quarantine a compromised device by isolating it from the network."""
    _quarantined_devices.add(device_ip)
    log_alert(f"[RESPONSE] Quarantined device {device_ip}: {reason}", severity="HIGH")
    return {
        "action": "quarantine_device",
        "device_ip": device_ip,
        "reason": reason,
        "status": "quarantined",
        "ts": time.time()
    }


def log_alert(message: str, severity: str = "INFO"):
    """Write alert to the response log file."""
    with open(os.path.join(LOG_DIR, "response.log"), "a") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | {severity} | {message}\n")


def get_blocked_ips() -> list:
    return list(_blocked_ips)


def get_quarantined_devices() -> list:
    return list(_quarantined_devices)
