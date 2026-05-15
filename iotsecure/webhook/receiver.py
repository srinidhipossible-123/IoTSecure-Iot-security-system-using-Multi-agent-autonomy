# webhook/receiver.py
"""
FastAPI webhook ingress — reacts to external events.
Demonstrates: external event triggers autonomous agent pipeline.
"""
import asyncio, hmac, hashlib, json
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

@app.post("/webhook/event")
async def receive_event(request: Request):
    """Receive self-fired events from Response Agent."""
    data = await request.json()
    store.log(f"[WEBHOOK] Internal event: {data.get('event')}")
    return {"status": "logged"}

@app.get("/health")
async def health():
    return {"status": "ok", "store_devices": len(store.devices)}
