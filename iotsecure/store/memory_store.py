# store/memory_store.py
# NO DATABASE — thread-safe in-memory store. Fast, zero-setup, perfect for hackathon.
import threading
import time
from typing import List, Dict, Any
from collections import deque

class MemoryStore:
    """Thread-safe in-memory store for all agent state."""

    def __init__(self):
        self._lock = threading.RLock()
        self.devices: Dict[str, dict] = {}          # keyed by IP
        self.threats: deque = deque(maxlen=500)
        self.honeypot_hits: deque = deque(maxlen=200)
        self.blocked_ips: set = set()
        self.agent_statuses: Dict[str, dict] = {}
        self.system_log: deque = deque(maxlen=1000)
        self.dashboard_events: deque = deque(maxlen=200)
        self.active_honeypots: List[dict] = []
        self._subscribers: List = []                 # WebSocket broadcast

    def upsert_device(self, device: dict):
        with self._lock:
            ip = device["ip"]
            existing = self.devices.get(ip, {})
            existing.update(device)
            self.devices[ip] = existing
        self._broadcast("device_update", device)

    def add_threat(self, threat: dict):
        with self._lock:
            self.threats.appendleft(threat)
        self._broadcast("threat_event", threat)
        self.log(f"[THREAT] {threat['severity'].upper()} — {threat['threat_type']} from {threat['source_ip']}")

    def add_honeypot_hit(self, hit: dict):
        with self._lock:
            self.honeypot_hits.appendleft(hit)
        self._broadcast("honeypot_hit", hit)
        self.log(f"[HONEYPOT] Hit from {hit['attacker_ip']} — ports {hit['ports_tried']}")

    def block_ip(self, ip: str, reason: str):
        with self._lock:
            self.blocked_ips.add(ip)
        self._broadcast("ip_blocked", {"ip": ip, "reason": reason})
        self.log(f"[FIREWALL] Blocked {ip} — {reason}")

    def set_agent_status(self, agent_id: str, status: str, task: str = ""):
        with self._lock:
            self.agent_statuses[agent_id] = {
                "agent_id": agent_id,
                "status": status,
                "current_task": task,
                "last_update": time.time()
            }
        self._broadcast("agent_status", {"agent_id": agent_id, "status": status, "task": task})

    def log(self, message: str):
        entry = {"time": time.time(), "msg": message}
        with self._lock:
            self.system_log.appendleft(entry)
        self._broadcast("log", entry)

    def get_all_devices(self) -> List[dict]:
        with self._lock:
            return list(self.devices.values())

    def get_threats(self, limit: int = 50) -> List[dict]:
        with self._lock:
            return list(self.threats)[:limit]

    def get_honeypot_hits(self, limit: int = 50) -> List[dict]:
        with self._lock:
            return list(self.honeypot_hits)[:limit]

    def subscribe(self, callback):
        self._subscribers.append(callback)

    def _broadcast(self, event_type: str, data: Any):
        payload = {"type": event_type, "data": data, "ts": time.time()}
        for cb in self._subscribers[:]:
            try:
                cb(payload)
            except Exception:
                try:
                    self._subscribers.remove(cb)
                except ValueError:
                    pass

store = MemoryStore()
