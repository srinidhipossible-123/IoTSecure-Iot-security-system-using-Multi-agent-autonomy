"""
Attack Demo — CLI tool to simulate attacks against AI Home Shield.
Usage: python utils/attack_demo.py --mode honeytoken
"""
import argparse, requests, json, time, sys

API_URL = "http://localhost:8001"

SCENARIOS = {
    "honeytoken": {"url":"/webhook/honeytoken-trip","payload":{"token_id":"demo-token-001","filename":"camera_config_backup.json","reason":"Fake credentials accessed","attacker_ip":"203.0.113.42","device_ip":"192.168.1.14"}},
    "port_scan": {"url":"/webhook/port-scan-detected","payload":{"attacker_ip":"198.51.100.23","scanned_ports":[22,23,80,443,554,8080],"scan_type":"SYN_SCAN","target":"192.168.1.0/24"}},
    "network_anomaly": {"url":"/webhook/network-anomaly","payload":{"device_ip":"192.168.1.21","anomaly_type":"bandwidth_spike","current_bandwidth_mbps":45.2,"normal_bandwidth_mbps":0.1,"unusual_ports":[4444,9999]}},
    "brute_force": {"url":"/webhook/network-anomaly","payload":{"attacker_ip":"192.0.2.100","target_device":"192.168.1.14","anomaly_type":"brute_force","attempts":47,"service":"SSH"}}
}

def run(mode):
    scenario = SCENARIOS.get(mode)
    if not scenario:
        print(f"Unknown mode: {mode}. Available: {list(SCENARIOS.keys())}")
        return
    print(f"\n🎯 Triggering {mode} attack...")
    print(f"📡 POST {API_URL}{scenario['url']}")
    print(f"📦 Payload: {json.dumps(scenario['payload'], indent=2)}")
    try:
        r = requests.post(f"{API_URL}{scenario['url']}", json=scenario["payload"], timeout=5)
        print(f"\n✅ Response ({r.status_code}): {r.json()}")
        print("\n⏳ Pipeline executing autonomously... Check dashboard for results.")
    except Exception as e:
        print(f"\n❌ Error: {e}\nIs the webhook server running?")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Home Shield Attack Demo")
    parser.add_argument("--mode", default="honeytoken", choices=list(SCENARIOS.keys()))
    args = parser.parse_args()
    run(args.mode)
