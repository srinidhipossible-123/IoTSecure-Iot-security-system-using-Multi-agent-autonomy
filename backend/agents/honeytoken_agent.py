"""
Honeytoken Agent — Plants fake credentials and monitors for access.
When a honeytoken is accessed, it triggers the autonomous pipeline.
"""
import json
import os
import time
import uuid
from agents.tracer import trace

HONEYTOKEN_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "honeytokens")
os.makedirs(HONEYTOKEN_DIR, exist_ok=True)

# In-memory trip log for demo
_trips = []
_deployed_tokens = []


class HoneytokenAgent:
    def __init__(self):
        self.token_dir = HONEYTOKEN_DIR

    @trace("honeytoken.deploy")
    def deploy_tokens(self, device_ip: str, device_type: str) -> list:
        """Plant fake credentials that look like real device configs."""
        tokens = []
        token_templates = [
            {
                "filename": f"{device_type}_config_backup.json",
                "content": {
                    "device": device_type,
                    "ip": device_ip,
                    "admin_user": "admin",
                    "admin_pass": f"IoT_{uuid.uuid4().hex[:8]}",
                    "api_key": f"sk-fake-{uuid.uuid4().hex}",
                    "firmware_url": f"http://192.168.1.1/firmware/{device_type}_v2.3.bin"
                }
            },
            {
                "filename": f".{device_type}_credentials",
                "content": {
                    "ssh_key": f"-----BEGIN RSA PRIVATE KEY-----\nFAKE_KEY_{uuid.uuid4().hex}\n-----END RSA PRIVATE KEY-----",
                    "mqtt_broker": "192.168.1.1:1883",
                    "mqtt_user": "iot_bridge",
                    "mqtt_pass": f"bridge_{uuid.uuid4().hex[:12]}"
                }
            }
        ]

        for template in token_templates:
            token_id = str(uuid.uuid4())
            filepath = os.path.join(self.token_dir, template["filename"])
            token_data = {
                **template["content"],
                "_token_id": token_id,
                "_deployed_at": time.time()
            }

            with open(filepath, "w") as f:
                json.dump(token_data, f, indent=2)

            token_info = {
                "token_id": token_id,
                "filename": template["filename"],
                "filepath": filepath,
                "device_ip": device_ip,
                "device_type": device_type,
                "deployed_at": time.time()
            }
            tokens.append(token_info)
            _deployed_tokens.append(token_info)

        return tokens

    @trace("honeytoken.check_trips")
    def check_trips(self) -> list:
        """Check if any honeytokens have been accessed (tripped)."""
        trips = []
        for token in _deployed_tokens:
            filepath = token.get("filepath", "")
            if not os.path.exists(filepath):
                continue

            try:
                # Check if file was accessed (mtime changed = someone modified it)
                stat = os.stat(filepath)
                if stat.st_mtime > token.get("deployed_at", 0) + 1:
                    trip = {
                        "token_id": token["token_id"],
                        "filename": token["filename"],
                        "device_ip": token.get("device_ip", "unknown"),
                        "reason": "Honeytoken file was accessed/modified",
                        "attacker_ip": "unknown",
                        "tripped_at": stat.st_mtime,
                        "ts": time.time()
                    }
                    trips.append(trip)
                    _trips.append(trip)
            except Exception:
                pass

        return trips

    @trace("honeytoken.simulate_trip")
    def simulate_trip(self, token_id: str = None, attacker_ip: str = "192.168.1.99") -> dict:
        """Simulate a honeytoken trip for demo purposes."""
        trip = {
            "token_id": token_id or str(uuid.uuid4()),
            "filename": "camera_config_backup.json",
            "device_ip": "192.168.1.14",
            "device_type": "camera",
            "reason": "Fake credentials were accessed by attacker",
            "attacker_ip": attacker_ip,
            "tripped_at": time.time(),
            "ts": time.time()
        }
        _trips.append(trip)
        return trip

    @staticmethod
    def get_deployed_tokens() -> list:
        return list(_deployed_tokens)

    @staticmethod
    def get_all_trips() -> list:
        return list(_trips)
