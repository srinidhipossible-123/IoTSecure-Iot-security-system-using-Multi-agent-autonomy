"""
Deception Agent — Uses Groq LLM to generate convincing fake IoT device personas.
Deploys dynamic honeypots that adapt to the specific attacker being observed.
"""
import json
import time
import os
import socket
import threading
from agents.tracer import trace

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Track active honeypots
_active_honeypots = []


class DeceptionAgent:
    """
    Uses Groq to generate a convincing fake IoT device persona in real time.
    Not a pre-built template. The LLM reasons about what fake device
    would best trap this specific attacker.
    """

    @trace("deception.deploy_dynamic_honeypot")
    def deploy_dynamic_honeypot(self, device_type: str, port: int, persona: str = "") -> dict:
        from groq import Groq
        client = Groq()

        # If no persona provided, generate one with LLM
        if not persona:
            try:
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{
                        "role": "user",
                        "content": f"""Generate a convincing fake {device_type} IoT device honeypot persona.
Output JSON only, no markdown:
{{
  "device_model": "real model name",
  "firmware_version": "realistic version",
  "default_credentials": {{"user": "...", "pass": "..."}},
  "open_ports": [port numbers],
  "banner_message": "what the device shows when connected",
  "fake_responses": {{"command": "response"}}
}}"""
                    }],
                    temperature=0.3,
                    max_tokens=500,
                )
                raw = response.choices[0].message.content.strip()
                # Try to extract JSON
                import re
                match = re.search(r'\{.*\}', raw, re.DOTALL)
                persona_data = json.loads(match.group()) if match else {"device_model": device_type, "banner_message": f"Welcome to {device_type}"}
            except Exception:
                persona_data = {"device_model": device_type, "banner_message": f"Welcome to {device_type}"}
        else:
            persona_data = {"description": persona, "banner_message": persona[:80]}

        # Spin up socket honeypot in background thread
        def run_honeypot():
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('0.0.0.0', port))
                s.listen(5)
                s.settimeout(300)  # 5 min timeout

                banner = persona_data.get("banner_message", "IoT Device Ready").encode()

                while True:
                    try:
                        conn, addr = s.accept()
                        attacker_ip = addr[0]
                        # Log the connection
                        with open(os.path.join(LOG_DIR, "honeypot.log"), "a") as f:
                            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | HONEYPOT HIT | {attacker_ip} | port={port} | device={device_type}\n")
                        conn.send(banner + b"\n")
                        # Collect what attacker sends
                        try:
                            data = conn.recv(1024)
                            with open(os.path.join(LOG_DIR, "honeypot.log"), "a") as f:
                                f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | ATTACKER SENT | {attacker_ip} | {data!r}\n")
                        except Exception:
                            pass
                        conn.close()
                    except socket.timeout:
                        break
                    except Exception:
                        break
                s.close()
            except Exception as e:
                with open(os.path.join(LOG_DIR, "honeypot.log"), "a") as f:
                    f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | HONEYPOT ERROR | port={port} | {e}\n")

        t = threading.Thread(target=run_honeypot, daemon=True)
        t.start()

        honeypot_info = {
            "status": "deployed",
            "port": port,
            "device_type": device_type,
            "persona": persona_data,
            "ts": time.time()
        }
        _active_honeypots.append(honeypot_info)

        return honeypot_info

    @staticmethod
    def get_active_honeypots() -> list:
        return list(_active_honeypots)
