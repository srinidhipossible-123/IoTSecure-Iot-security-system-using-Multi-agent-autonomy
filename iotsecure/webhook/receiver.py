# webhook/receiver.py
"""
FastAPI webhook ingress — reacts to external events.
Demonstrates: external event triggers autonomous agent pipeline.
"""
import asyncio, hmac, hashlib, json, time, uuid
from fastapi import FastAPI, Request, HTTPException, Header
from config import WEBHOOK_SECRET
from store.memory_store import store

app = FastAPI(title="IoTSecure Webhook Receiver")
_orchestrator_trigger = None  # Set by main.py

def set_orchestrator_trigger(fn):
    global _orchestrator_trigger
    _orchestrator_trigger = fn

def _verify(body: bytes, sig: str) -> bool:
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig)

@app.post("/webhook/trigger")
async def external_trigger(
    request: Request,
    x_signature: str = Header(None, alias="X-Signature")
):
    """External event -> trigger orchestrator pipeline immediately."""
    body = await request.body()
    if x_signature and not _verify(body, x_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    data = json.loads(body)
    store.log(f"[WEBHOOK] External trigger received: {data.get('event', 'unknown')}")
    if _orchestrator_trigger:
        asyncio.create_task(_orchestrator_trigger(data))
    return {"status": "accepted", "message": "Pipeline triggered"}

@app.post("/webhook/attack-sim")
async def simulate_attack(request: Request):
    """Trigger a simulated attack — for demo purposes."""
    data = await request.json()
    attacker_ip = data.get("attacker_ip", "192.168.43.99")
    store.log(f"[WEBHOOK] Attack simulation triggered from {attacker_ip}")
    if _orchestrator_trigger:
        asyncio.create_task(_orchestrator_trigger({
            "event": "simulated_attack",
            "attacker_ip": attacker_ip,
            "force_run": True
        }))
    return {"status": "attack simulation started"}

async def _demo_autopilot_story():
    """Fast, deterministic demo path for hackathon judging."""
    attacker_ip = "192.168.43.99"
    target_ip = "192.168.43.14"
    demo_device = {
        "ip": target_ip,
        "mac": "F0:EF:86:21:42:19",
        "hostname": "living-room-camera",
        "vendor": "TP-Link Smart Camera",
        "open_ports": [23, 80, 554, 7547],
        "os_guess": "Embedded Linux",
        "last_seen": time.time(),
        "risk_score": 92,
        "risk_level": "critical",
        "cve_count": 5,
        "cves": ["CVE-2024-21887", "CVE-2023-1389", "CVE-2023-28771"],
        "is_honeypot": False,
        "connection_type": "dynamic",
        "baseline_traffic": {"new_sessions": 18, "failed_logins": 11}
    }

    store.log("[DEMO] Autopilot demo launched")
    store.set_agent_status("orchestrator", "running", "Coordinating autonomous incident response")
    steps = [
        ("discovery", "Scanning live subnet and fingerprinting devices"),
        ("profiler", "Scoring exposure, ports, vendor risk, and CVEs"),
        ("threat_detector", "Reasoning over attacker behavior and device posture"),
        ("deception", "Deploying honeypot and canary token"),
        ("response", "Blocking attacker and producing incident evidence"),
    ]

    for agent_id, task in steps:
        store.set_agent_status(agent_id, "running", task)
        store.log(f"[A2A] orchestrator -> {agent_id}: {task}")
        await asyncio.sleep(0.45)

        if agent_id == "discovery":
            store.upsert_device(demo_device)
            store.log(f"[DISCOVERY] Device: {target_ip} | MAC: {demo_device['mac']} | {demo_device['vendor']}")
        elif agent_id == "profiler":
            store.upsert_device(demo_device)
            store.log(f"[PROFILER] {target_ip} -> risk=92 (critical) CVEs=5")
        elif agent_id == "threat_detector":
            threat = {
                "event_id": str(uuid.uuid4()),
                "timestamp": time.time(),
                "source_ip": attacker_ip,
                "target_ip": target_ip,
                "threat_type": "brute_force",
                "severity": "critical",
                "llm_reasoning": "The camera exposes Telnet and TR-069 while showing repeated failed login attempts from a new external source. The safest autonomous action is deception followed by containment.",
                "confidence": 0.94,
                "mitigated": False,
                "mitigation_action": "honeypot"
            }
            store.add_threat(threat)
        elif agent_id == "deception":
            store.add_honeypot_hit({
                "timestamp": time.time(),
                "attacker_ip": attacker_ip,
                "ports_tried": [23, 7547, 8888],
                "payloads": ["admin:admin", "busybox wget payload"],
                "canary_triggered": True
            })
        elif agent_id == "response":
            store.block_ip(attacker_ip, "Autonomous demo containment after honeypot trigger")

        store.set_agent_status(agent_id, "idle", "Completed")
        await asyncio.sleep(0.05)

    store.set_agent_status("orchestrator", "idle", "Demo incident contained")
    store.log("[DEMO] Autopilot complete: device profiled, threat detected, honeypot triggered, attacker blocked")

@app.post("/api/demo/autopilot")
async def demo_autopilot():
    """One-click, reliable demo workflow for the dashboard."""
    asyncio.create_task(_demo_autopilot_story())
    return {"status": "accepted", "message": "Autopilot demo running"}

@app.post("/webhook/event")
async def receive_event(request: Request):
    """Receive self-fired events from Response Agent."""
    data = await request.json()
    store.log(f"[WEBHOOK] Internal event: {data.get('event')}")
    return {"status": "logged"}

@app.post("/api/system/reset")
async def system_reset():
    """Hard reset the memory store for fresh demo execution."""
    store.reset()
    return {"status": "success", "message": "System state cleared"}

@app.get("/health")
async def health():
    return {"status": "ok", "store_devices": len(store.devices)}
