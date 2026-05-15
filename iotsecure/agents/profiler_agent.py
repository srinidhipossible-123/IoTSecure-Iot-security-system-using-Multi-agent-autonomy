# agents/profiler_agent.py
import requests, time, json
from agents.base import BaseAgent
from security.sanitiser import safe_llm_context
from store.memory_store import store

# Port risk weights
PORT_RISK = {
    23: 40,   # Telnet — critical
    21: 30,   # FTP
    7547: 35, # TR-069 — router exploit
    1883: 25, # MQTT unencrypted
    27017: 30,# MongoDB open
    9200: 30, # Elasticsearch open
    8080: 15, # HTTP alt
    4443: 10,
    554: 10,  # RTSP camera stream
    80: 5,
    443: 0,
}

CRITICAL_VENDORS = ["Hikvision", "Dahua", "TP-Link", "D-Link", "Netgear"]

class ProfilerAgent(BaseAgent):
    agent_id = "profiler"
    description = "Profiling devices and scoring CVE risk"

    async def execute(self, state: dict) -> dict:
        devices = state.get("devices", [])
        if not devices:
            return state

        store.log(f"[PROFILER] Profiling {len(devices)} devices")
        profiled = []

        for device in devices:
            if device.get("is_honeypot"):
                profiled.append(device)
                continue

            # Score risk from open ports
            port_risk = sum(PORT_RISK.get(p, 5) for p in device.get("open_ports", []))

            # CVE lookup via NVD API
            cves, cve_count = self._fetch_cves(device.get("vendor", ""))
            cve_risk = min(cve_count * 8, 40)

            # Vendor risk
            vendor_risk = 15 if any(v in device.get("vendor","") for v in CRITICAL_VENDORS) else 0

            total_risk = min(port_risk + cve_risk + vendor_risk, 100)
            risk_level = (
                "critical" if total_risk >= 75 else
                "high"     if total_risk >= 50 else
                "medium"   if total_risk >= 25 else
                "low"
            )

            device.update({
                "risk_score": total_risk,
                "risk_level": risk_level,
                "cve_count": cve_count,
                "cves": cves[:5],  # top 5
            })
            store.upsert_device(device)
            profiled.append(device)
            store.log(f"[PROFILER] {device['ip']} → risk={total_risk} ({risk_level}) CVEs={cve_count}")

        # A2A: handoff to threat detector
        high_risk = [d for d in profiled if d["risk_level"] in ("high", "critical")]
        self.send_message("threat_detector", "task", {
            "action": "analyse_threats",
            "high_risk_count": len(high_risk),
            "high_risk_ips": [d["ip"] for d in high_risk]
        })

        state["devices"] = profiled
        state["current_phase"] = "analyse"
        return state

    def _fetch_cves(self, vendor: str) -> tuple:
        """Query NVD CVE API for vendor vulnerabilities."""
        if not vendor or vendor in ("Unknown", "Unknown Device", "Mobile Device", "Mobile Hotspot"):
            return [], 0
        try:
            url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
            params = {"keywordSearch": vendor, "resultsPerPage": 5}
            r = requests.get(url, params=params, timeout=3)
            if r.status_code == 200:
                data = r.json()
                vulns = data.get("vulnerabilities", [])
                ids = [v["cve"]["id"] for v in vulns]
                return ids, len(ids)
        except Exception:
            pass  # Don't log CVE failures — too noisy
        return [], 0

