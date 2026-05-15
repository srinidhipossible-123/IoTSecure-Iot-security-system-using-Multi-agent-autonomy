"""
Webhook Server — FastAPI server that serves the React frontend API.
External events POST here. Pipeline fires autonomously. Zero human input.
Run with: uvicorn webhook_server:app --port 8001 --host 0.0.0.0
"""
import asyncio, time, json, threading, os, sys
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from agents.orchestrator_agent import OrchestratorAgent
from agents.tracer import get_recent_traces
from agents.baseline_agent import BaselineAgent
from agents.honeytoken_agent import HoneytokenAgent
from agents.firewall_agent import FirewallAgent
from agents.deception_agent import DeceptionAgent
from agents.response_agent import get_blocked_ips, get_quarantined_devices
from database import init_db

app = FastAPI(title="AI Home Shield — API Server")
# ...
@app.on_event("startup")
def startup_event():
    try:
        init_db()
        print("[SERVER] Database initialized")
    except Exception as e:
        print(f"[SERVER] Database Init Error: {e}")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

orchestrator = OrchestratorAgent()
baseline_agent = BaselineAgent()
honeytoken_agent = HoneytokenAgent()

# ── Autonomous monitoring loop ─────────────────────────────────────
def _autonomous_monitor_loop():
    print("[AUTONOMOUS MONITOR] Started — polling every 10s")
    while True:
        try:
            trips = honeytoken_agent.check_trips()
            for trip in trips:
                print(f"[AUTONOMOUS MONITOR] Honeytoken trip: {trip}")
                orchestrator.decide_and_execute(
                    trigger_type="honeytoken_trip",
                    threat_context={"token_file":trip.get("filename"),"token_id":trip.get("token_id"),
                                    "reason":trip.get("reason"),"attacker_ip":trip.get("attacker_ip","unknown"),"ts":time.time()})
            _check_honeypot_log()
        except Exception as e:
            print(f"[AUTONOMOUS MONITOR] Error: {e}")
        time.sleep(10)

def _check_honeypot_log():
    log_path = os.path.join(os.path.dirname(__file__), "logs", "honeypot.log")
    check_file = os.path.join(os.path.dirname(__file__), "data", ".honeypot_last_check")
    try:
        if not os.path.exists(log_path): return
        with open(log_path, "r") as f: lines = f.readlines()
        try:
            with open(check_file, "r") as f: last_count = int(f.read().strip())
        except: last_count = 0
        for line in lines[last_count:]:
            if "HONEYPOT HIT" in line:
                parts = line.strip().split("|")
                orchestrator.decide_and_execute(trigger_type="honeypot_connection",
                    threat_context={"attacker_ip":parts[2].strip() if len(parts)>2 else "unknown",
                                    "honeypot_port":parts[3].strip() if len(parts)>3 else "unknown",
                                    "log_line":line.strip(),"ts":time.time()})
        with open(check_file, "w") as f: f.write(str(len(lines)))
    except: pass

_monitor = threading.Thread(target=_autonomous_monitor_loop, daemon=True)
_monitor.start()

# ── Webhook endpoints ──────────────────────────────────────────────
@app.post("/webhook/honeytoken-trip")
async def honeytoken_trip(request: Request, bg: BackgroundTasks):
    payload = await request.json()
    bg.add_task(orchestrator.decide_and_execute, trigger_type="honeytoken_trip_external", threat_context={**payload, "ts": time.time()})
    return JSONResponse({"status": "pipeline_triggered", "trigger": "honeytoken_trip"})

@app.post("/webhook/network-anomaly")
async def network_anomaly(request: Request, bg: BackgroundTasks):
    payload = await request.json()
    bg.add_task(orchestrator.decide_and_execute, trigger_type="network_anomaly", threat_context={**payload, "ts": time.time()})
    return JSONResponse({"status": "pipeline_triggered", "trigger": "network_anomaly"})

@app.post("/webhook/port-scan-detected")
async def port_scan(request: Request, bg: BackgroundTasks):
    payload = await request.json()
    bg.add_task(orchestrator.decide_and_execute, trigger_type="port_scan", threat_context={**payload, "ts": time.time()})
    return JSONResponse({"status": "pipeline_triggered", "trigger": "port_scan"})

# ── Dashboard API ──────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "running", "ts": time.time(), "monitor": "active"}

@app.get("/api/incidents")
def get_incidents():
    return orchestrator.get_incidents(limit=20)

@app.get("/api/traces")
def get_traces():
    return get_recent_traces(limit=50)

@app.get("/api/devices")
def get_devices():
    devices = baseline_agent.get_device_list()
    quarantined = get_quarantined_devices()
    for d in devices:
        d["quarantined"] = d["ip"] in quarantined
    return devices

@app.get("/api/stats")
def get_stats():
    incidents = orchestrator.get_incidents(50)
    blocked = get_blocked_ips()
    honeypots = DeceptionAgent.get_active_honeypots()
    devices = baseline_agent.get_device_list()
    traces = get_recent_traces(20)
    avg_dur = 0
    if traces:
        durs = [t.get("duration_ms",0) for t in traces if t.get("duration_ms")]
        avg_dur = round(sum(durs)/len(durs), 1) if durs else 0
    critical = sum(1 for i in incidents if i.get("plan",{}).get("threat_assessment",{}).get("severity") == "CRITICAL")
    high = sum(1 for i in incidents if i.get("plan",{}).get("threat_assessment",{}).get("severity") == "HIGH")
    
    total_cves = sum(len(d.get("cves", [])) for d in devices)
    
    return {
        "total_incidents": len(incidents),
        "critical_threats": critical,
        "high_threats": high,
        "blocked_ips": len(blocked),
        "active_honeypots": len(honeypots),
        "protected_devices": len(devices),
        "avg_response_ms": avg_dur,
        "honeytokens_deployed": len(HoneytokenAgent.get_deployed_tokens()),
        "firewall_rules": len(FirewallAgent.get_rules()),
        "vulnerabilities_found": total_cves
    }

@app.get("/api/firewall")
def get_firewall():
    return {"rules": FirewallAgent.get_rules(), "blocked_ips": get_blocked_ips()}

@app.get("/api/honeypots")
def get_honeypots():
    return DeceptionAgent.get_active_honeypots()

@app.post("/api/scan")
async def trigger_scan(bg: BackgroundTasks):
    from agents.discovery_agent import DiscoveryAgent
    disc = DiscoveryAgent()
    bg.add_task(disc.scan_network)
    return {"status": "scan_initiated"}

@app.post("/api/demo/trigger")
async def demo_trigger(request: Request, bg: BackgroundTasks):
    """Trigger a demo attack from the frontend."""
    payload = await request.json()
    mode = payload.get("mode", "honeytoken")
    scenarios = {
        "honeytoken": {"trigger_type":"honeytoken_trip","threat_context":{"token_id":"demo-token-001","filename":"camera_config_backup.json","reason":"Fake credentials accessed by attacker","attacker_ip":"203.0.113.42","device_ip":"192.168.1.14","device_type":"camera"}},
        "port_scan": {"trigger_type":"port_scan","threat_context":{"attacker_ip":"198.51.100.23","scanned_ports":[22,23,80,443,554,8080,8443],"scan_type":"SYN_SCAN","target_subnet":"192.168.1.0/24","device_ip":"192.168.1.10"}},
        "brute_force": {"trigger_type":"brute_force","threat_context":{"attacker_ip":"192.0.2.100","target_device":"192.168.1.14","target_service":"SSH","attempts":47,"device_type":"camera","credentials_tried":["admin:admin","root:root","admin:password"]}},
        "lateral_movement": {"trigger_type":"lateral_movement","threat_context":{"attacker_ip":"192.168.1.99","compromised_device":"192.168.1.21","target_device":"192.168.1.33","method":"ARP_SPOOFING","evidence":"Unusual ARP traffic from smart_bulb to thermostat"}}
    }
    scenario = scenarios.get(mode, scenarios["honeytoken"])
    scenario["threat_context"]["ts"] = time.time()
    bg.add_task(orchestrator.decide_and_execute, **scenario)
    return JSONResponse({"status": "demo_triggered", "mode": mode})
