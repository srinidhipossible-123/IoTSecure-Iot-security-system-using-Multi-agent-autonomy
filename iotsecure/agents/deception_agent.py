# agents/deception_agent.py
import time, threading, uuid, secrets
from agents.base import BaseAgent
from store.memory_store import store
from honeypot.server import HoneypotServer
from honeypot.canary import CanaryTokens

class DeceptionAgent(BaseAgent):
    agent_id = "deception"
    description = "Deploying honeypots and canary traps"

    def __init__(self):
        super().__init__()
        self._active_servers: dict = {}
        self.canary = CanaryTokens()

    async def execute(self, state: dict) -> dict:
        threats = state.get("threats", [])
        honeypot_tasks = [
            t for t in threats
            if t.get("mitigation_action") == "honeypot" and not t.get("mitigated")
        ]

        if not honeypot_tasks:
            store.log("[DECEPTION] No honeypot tasks — standing by")
            state["current_phase"] = "respond"
            return state

        active_honeypots = []
        for threat in honeypot_tasks:
            target_ip = threat.get("source_ip")
            port = self._get_free_port()

            store.log(f"[DECEPTION] Deploying honeypot on :{port} for attacker {target_ip}")

            hp = HoneypotServer(port=port, on_hit=self._handle_honeypot_hit)
            thread = threading.Thread(target=hp.start, daemon=True)
            thread.start()
            self._active_servers[port] = hp

            token = self.canary.create_token(device_type="smart_camera", attacker_ip=target_ip)

            honeypot_info = {
                "port": port, "target_ip": target_ip,
                "token": token, "deployed_at": time.time(), "hits": 0
            }
            active_honeypots.append(honeypot_info)
            store.log(f"[DECEPTION] Honeypot live at :{port} with canary token")

        state["active_honeypots"] = state.get("active_honeypots", []) + active_honeypots
        state["current_phase"] = "respond"

        self.send_message("response", "task", {
            "action": "monitor_honeypots", "honeypots": active_honeypots
        })
        return state

    def _handle_honeypot_hit(self, hit: dict):
        store.add_honeypot_hit(hit)
        self.send_message("response", "task", {
            "action": "block", "target_ip": hit["attacker_ip"],
            "reason": "Honeypot triggered — attacker fingerprinted", "threat": hit
        })

    def _get_free_port(self) -> int:
        import socket
        s = socket.socket()
        s.bind(("", 0))
        port = s.getsockname()[1]
        s.close()
        return port
