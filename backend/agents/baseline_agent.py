"""
Profiler Agent (BaselineAgent) — Establishes normal traffic patterns, maps ports, and checks CVEs.
"""
import time
import random
import requests
import os
import json
from agents.tracer import trace
from database import SessionLocal, Device

# Simulated device baselines (in production, learned from real traffic)
DEVICE_BASELINES = {
    "192.168.1.10": {
        "name": "Smart TV",
        "type": "smart_tv",
        "normal_ports": [80, 443, 8443],
        "normal_bandwidth_mbps": 5.0,
        "normal_connections_per_min": 15,
        "normal_protocols": ["HTTP", "HTTPS", "DNS"],
        "risk_score": 0.2
    },
    "192.168.1.14": {
        "name": "IP Camera",
        "type": "camera",
        "normal_ports": [80, 554, 8080],
        "normal_bandwidth_mbps": 2.5,
        "normal_connections_per_min": 30,
        "normal_protocols": ["RTSP", "HTTP", "HTTPS"],
        "risk_score": 0.6
    },
    "192.168.1.21": {
        "name": "Smart Bulb",
        "type": "smart_bulb",
        "normal_ports": [80, 443],
        "normal_bandwidth_mbps": 0.1,
        "normal_connections_per_min": 5,
        "normal_protocols": ["HTTP", "MQTT"],
        "risk_score": 0.3
    },
    "192.168.1.33": {
        "name": "Thermostat",
        "type": "thermostat",
        "normal_ports": [80, 443, 8883],
        "normal_bandwidth_mbps": 0.2,
        "normal_connections_per_min": 8,
        "normal_protocols": ["HTTPS", "MQTT"],
        "risk_score": 0.4
    }
}

# Mock CVE Database for demo
MOCK_CVE_DB = {
    "camera": [{"id": "CVE-2023-1234", "severity": "HIGH", "desc": "Buffer overflow in RTSP stream handler"}],
    "smart_tv": [{"id": "CVE-2022-9876", "severity": "MEDIUM", "desc": "Insecure API endpoint allows remote reboot"}],
    "thermostat": [{"id": "CVE-2024-0001", "severity": "CRITICAL", "desc": "Unauthenticated command injection via MQTT"}],
    "smart_bulb": []
}

class BaselineAgent:
    def __init__(self):
        self.baselines = DEVICE_BASELINES.copy()
        self.anomalies = []
        self.cve_cache = {}
        self._load_real_devices()

    def _load_real_devices(self):
        """Load real discovered devices from PostgreSQL and merge with baselines."""
        try:
            db = SessionLocal()
            devices = db.query(Device).all()
            for d in devices:
                if d.ip not in self.baselines:
                    self.baselines[d.ip] = {
                        "name": d.hostname or d.ip,
                        "type": d.device_type,
                        "normal_ports": d.metadata_json.get("ports", []),
                        "normal_bandwidth_mbps": 1.0,
                        "normal_connections_per_min": 10,
                        "normal_protocols": [],
                        "risk_score": d.risk_score or 0.5
                    }
            db.close()
        except Exception as e:
            print(f"[Profiler] DB Load Error: {e}")
            # Fallback to JSON if DB fails
            data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "discovered_devices.json")
            if os.path.exists(data_path):
                try:
                    with open(data_path, "r") as f:
                        real = json.load(f)
                        for ip, d in real.items():
                            if ip not in self.baselines:
                                self.baselines[ip] = {
                                    "name": d.get("hostname", ip),
                                    "type": d["type"],
                                    "normal_ports": [p["port"] for p in d.get("ports", [])],
                                    "normal_bandwidth_mbps": 1.0,
                                    "normal_connections_per_min": 10,
                                    "normal_protocols": [p["service"] for p in d.get("ports", [])],
                                    "risk_score": 0.5
                                }
                except: pass

    @trace("profiler.lookup_cve")
    def lookup_cves(self, device_type: str) -> list:
        """Mock CVE lookup for the device type."""
        return MOCK_CVE_DB.get(device_type, [])

    @trace("baseline.check_anomalies")
    def check_anomalies(self) -> list:
        """Check all devices for anomalous behavior."""
        anomalies = []
        for ip, baseline in self.baselines.items():
            # Simulate current traffic (in production, from real packet capture)
            current = self._get_current_traffic(ip)
            score = self._compute_anomaly_score(baseline, current)

            if score > 0.6:
                anomaly = {
                    "device_ip": ip,
                    "device_name": baseline["name"],
                    "device_type": baseline["type"],
                    "anomaly_score": round(score, 2),
                    "details": current.get("anomaly_details", "Elevated traffic detected"),
                    "ts": time.time()
                }
                anomalies.append(anomaly)
                self.anomalies.append(anomaly)

        return anomalies

    def _get_current_traffic(self, ip: str) -> dict:
        """Simulate current traffic patterns (in production, from pcap/netflow)."""
        baseline = self.baselines.get(ip, {})
        # Mostly normal traffic with occasional anomaly simulation
        is_anomalous = random.random() < 0.1  # 10% chance of anomaly

        if is_anomalous:
            return {
                "bandwidth_mbps": baseline.get("normal_bandwidth_mbps", 1) * random.uniform(5, 20),
                "connections_per_min": baseline.get("normal_connections_per_min", 10) * random.randint(5, 15),
                "unusual_ports": [22, 23, 4444, 9999],
                "unusual_protocols": ["TELNET", "SSH"],
                "anomaly_details": "Unusual port access and bandwidth spike detected"
            }
        return {
            "bandwidth_mbps": baseline.get("normal_bandwidth_mbps", 1) * random.uniform(0.8, 1.2),
            "connections_per_min": baseline.get("normal_connections_per_min", 10) * random.uniform(0.9, 1.1),
            "unusual_ports": [],
            "unusual_protocols": [],
            "anomaly_details": None
        }

    def _compute_anomaly_score(self, baseline: dict, current: dict) -> float:
        """Compute anomaly score based on deviation from baseline."""
        score = 0.0

        # Bandwidth deviation
        normal_bw = baseline.get("normal_bandwidth_mbps", 1)
        current_bw = current.get("bandwidth_mbps", normal_bw)
        if current_bw > normal_bw * 3:
            score += 0.4

        # Connection count deviation
        normal_conn = baseline.get("normal_connections_per_min", 10)
        current_conn = current.get("connections_per_min", normal_conn)
        if current_conn > normal_conn * 3:
            score += 0.3

        # Unusual ports
        if current.get("unusual_ports"):
            score += 0.3

        return min(score, 1.0)

    def get_device_list(self) -> list:
        """Return the list of monitored devices with their baselines and CVEs."""
        self._load_real_devices() # Refresh from file
        devices = []
        for ip, baseline in self.baselines.items():
            devices.append({
                "ip": ip,
                "name": baseline["name"],
                "type": baseline["type"],
                "risk_score": baseline["risk_score"],
                "normal_ports": baseline["normal_ports"],
                "normal_bandwidth_mbps": baseline["normal_bandwidth_mbps"],
                "status": "online",
                "cves": self.lookup_cves(baseline["type"])
            })
        return devices
