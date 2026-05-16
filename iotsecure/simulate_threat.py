# simulate_threat.py
import requests
import json
import time

API_BASE = "http://localhost:8000"

def inject_threat():
    print("[SIMULATOR] Injecting fake attack thread...")
    
    # Payload simulating a phone on your network attacking your laptop
    payload = {
        "attacker_ip": "192.168.13.50",  # Change to any IP found in your discovery
        "target_ip": "192.168.13.93",    # Your laptop IP
        "event": "brute_force_attack",
        "description": "Suspicious burst of failed SSH logins from local mobile device",
        "force_run": True
    }
    
    try:
        # Trigger the attack sim webhook
        r = requests.post(f"{API_BASE}/webhook/attack-sim", json=payload)
        if r.status_code == 200:
            print("âœ… Threat Injected! Watch the Agentic Dashboard now.")
        else:
            print(f"â Œ Failed to inject: {r.text}")
    except Exception as e:
        print(f"â Œ Error: {e}")

if __name__ == "__main__":
    inject_threat()
