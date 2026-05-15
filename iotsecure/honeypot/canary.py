# honeypot/canary.py
"""Canary token generator and detector for IoTSecure honeypots."""
import secrets, time, json
from store.memory_store import store


class CanaryTokens:
    """Generate and track canary tokens embedded in fake IoT device configs."""

    def __init__(self):
        self._tokens: dict = {}

    def create_token(self, device_type: str = "smart_camera", attacker_ip: str = "") -> str:
        """Generate a canary token that looks like a real IoT device config."""
        token_id = secrets.token_hex(8)
        fake_config = {
            "device_id": f"CAM-{token_id[:6].upper()}",
            "model": "HiSecure Pro 4K" if device_type == "smart_camera" else "SmartHub v3",
            "firmware": "2.4.1-beta",
            "admin_user": "admin",
            "admin_pass": f"default_{token_id[:4]}",
            "api_key": f"sk-{secrets.token_hex(16)}",
            "stream_url": f"rtsp://192.168.1.100:554/live/{token_id[:8]}",
            "mqtt_broker": "192.168.1.1:1883",
            "canary_token": token_id,
        }

        self._tokens[token_id] = {
            "created_at": time.time(),
            "device_type": device_type,
            "attacker_ip": attacker_ip,
            "triggered": False,
            "config": fake_config,
        }

        store.log(f"[CANARY] Token {token_id[:8]}... created for {device_type}")
        return token_id

    def check_token(self, token_id: str) -> bool:
        """Check if a canary token has been accessed."""
        if token_id in self._tokens:
            self._tokens[token_id]["triggered"] = True
            store.log(f"[CANARY] Token {token_id[:8]}... TRIGGERED!")
            return True
        return False

    def get_config(self, token_id: str) -> dict:
        """Return the fake config for a token (served to attackers)."""
        if token_id in self._tokens:
            return self._tokens[token_id].get("config", {})
        return {}
