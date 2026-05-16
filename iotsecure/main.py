# main.py
"""
IoTSecure — Main entry point.
Starts: FastAPI (REST + WebSocket + Webhooks) + LangGraph agent pipeline.
All services run concurrently via asyncio.
"""
import asyncio
import uvicorn
import logging
import json
import time
import sys
import copy
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

# Ensure iotsecure is on the path
sys.path.insert(0, ".")
load_dotenv()
console = Console()

from orchestrator.graph import build_graph
from webhook.receiver import app as webhook_app, set_orchestrator_trigger
from store.memory_store import store
from store import json_audit
from config import (
    DASHBOARD_API_PORT,
    HOTSPOT_SUBNET,
    SCAN_INTERVAL_SECONDS,
    PIPELINE_STEP_DELAY_SEC,
    AUTONOMOUS_PIPELINE_MODE,
)

# Reuse webhook FastAPI app
app = webhook_app

# ── CORS ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.WARNING)

# ── WebSocket ──────────────────────────────────────────────────────────
ws_clients: list = []
_loop = None

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    store.log("[SYSTEM] Dashboard connected via WebSocket")
    try:
        init_data = {
            "type": "init",
            "devices": store.get_all_devices(),
            "threats": store.get_threats(20),
            "honeypot_hits": store.get_honeypot_hits(20),
            "agent_statuses": dict(store.agent_statuses),
            "blocked_ips": list(store.blocked_ips),
            "system_log": [dict(e) for e in list(store.system_log)[:50]],
        }
        await ws.send_json(init_data)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if ws in ws_clients:
            ws_clients.remove(ws)

def broadcast_to_ws(payload: dict):
    global _loop
    if not _loop:
        return
    dead = []
    for ws in ws_clients:
        try:
            asyncio.run_coroutine_threadsafe(ws.send_json(payload), _loop)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in ws_clients:
            ws_clients.remove(ws)

store.subscribe(broadcast_to_ws)

# ── REST endpoints ─────────────────────────────────────────────────────
@app.get("/api/devices")
def get_devices():
    return store.get_all_devices()

@app.get("/api/threats")
def get_threats():
    return store.get_threats(50)

@app.get("/api/honeypot-hits")
def get_honeypot_hits():
    return store.get_honeypot_hits(50)

@app.get("/api/stats")
def get_stats():
    devices = store.get_all_devices()
    return {
        "total_devices": len(devices),
        "high_risk": sum(1 for d in devices if d.get("risk_level") in ("high", "critical")),
        "blocked_ips": len(store.blocked_ips),
        "honeypot_hits": len(store.honeypot_hits),
        "threats_detected": len(store.threats),
        "active_honeypots": len(store.active_honeypots),
    }

@app.get("/api/blocked-ips")
def get_blocked_ips():
    return list(store.blocked_ips)

@app.get("/api/agent-statuses")
def get_agent_statuses():
    return dict(store.agent_statuses)

@app.get("/api/system-log")
def get_system_log():
    return [dict(e) for e in list(store.system_log)[:100]]

# ── Orchestrator ───────────────────────────────────────────────────────
graph = build_graph()

initial_state = {
    "devices": [], "scan_count": 0, "last_scan_time": 0.0,
    "subnet": HOTSPOT_SUBNET,
    "threats": [], "honeypot_hits": [], "blocked_ips": [],
    "active_honeypots": [],
    "agent_messages": [], "agent_statuses": {},
    "current_phase": "discover",
    "trigger_source": "scheduled",
    "iteration": 0, "errors": [], "retry_count": 0,
    "dashboard_events": [], "system_log": []
}


NODE_LABELS = {
    "discovery": ("Subnet cartography", "ARP intelligence · awake sweep"),
    "profiler": ("Host intelligence", "CVE fusion · risk posture"),
    "threat_detector": ("Threat cognition", "LLM analysis · correlators"),
    "deception": ("Deception lattice", "Honeyports · canary lattice"),
    "response": ("Enforcement spine", "Mitigation choreography"),
}


async def invoke_staged_pipeline(seed: dict) -> dict:
    """Run agents step-by-step with pauses between LangGraph emissions for narration."""
    session_id = uuid.uuid4().hex[:12]
    store.broadcast_pipeline_session_start(session_id, seed.get("trigger_source") or "scheduled")

    accumulated = copy.deepcopy(seed)
    store.set_agent_status("orchestrator", "running", f"Sequential trace × {session_id}")
    step_ix = 0

    async def consume_stream():
        nonlocal accumulated, step_ix
        async for chunk in graph.astream(accumulated, stream_mode="updates"):
            for node_key, delta in (chunk or {}).items():
                if isinstance(delta, dict):
                    accumulated.update(delta)
                title, subtitle = NODE_LABELS.get(
                    node_key, (node_key.replace("_", " ").title(), "Agent execution beat")
                )
                store.emit_pipeline_tick(session_id, step_ix, node_key, title, subtitle)
                step_ix += 1
                await asyncio.sleep(PIPELINE_STEP_DELAY_SEC)

    try:
        await consume_stream()
    except Exception as exc:
        store.log(f"[ORCHESTRATOR][ERROR] {exc}")
        store.set_agent_status("orchestrator", "idle")
        raise

    devs = accumulated.get("devices") or []
    store.log(f"[ORCHESTRATOR] Pipeline complete — found {len(devs)} hosts (session {session_id})")
    json_audit.append_stream(
        "pipeline_sessions",
        {
            "kind": "pipeline_session_end",
            "session_id": session_id,
            "steps": step_ix,
            "device_count": len(devs),
            "trigger_source": seed.get("trigger_source") or "scheduled",
            "ts": time.time(),
        },
    )

    store.set_agent_status("orchestrator", "idle")
    return accumulated


def _pipeline_thread_fn():
    """Run pipeline loop in a separate thread with its own event loop.
    This keeps the main asyncio loop (FastAPI/WebSocket) fully responsive
    while nmap and other blocking I/O agents run independently."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def _cycle_once():
        snapshot = copy.deepcopy(initial_state)
        try:
            await invoke_staged_pipeline(snapshot)
        except Exception as e:
            store.log(f"[SYSTEM][ERROR] Staged pipeline error: {e}")

    async def _loop_forever():
        await asyncio.sleep(3)
        if AUTONOMOUS_PIPELINE_MODE == "manual":
            store.log(
                "[SYSTEM] Autonomous loop paused (AUTONOMOUS_PIPELINE_MODE=manual). "
                "Run one cycle: POST /api/pipeline/run or POST /webhook/trigger"
            )
            await asyncio.Future()  # park forever until process exit
            return
        if AUTONOMOUS_PIPELINE_MODE == "once":
            store.log("[SYSTEM] IoTSecure — single autonomous run (AUTONOMOUS_PIPELINE_MODE=once)")
            await _cycle_once()
            store.log("[ORCHESTRATOR] Scheduled scan disabled after first run — use manual trigger for repeat")
            await asyncio.Future()
            return
        store.log(
            f"[SYSTEM] IoTSecure autonomous pipeline started "
            f"(interval {SCAN_INTERVAL_SECONDS}s — set SCAN_INTERVAL_SECONDS or AUTONOMOUS_PIPELINE_MODE to change)"
        )
        while True:
            await _cycle_once()
            store.log(f"[ORCHESTRATOR] Next scan in {SCAN_INTERVAL_SECONDS}s...")
            await asyncio.sleep(SCAN_INTERVAL_SECONDS)

    loop.run_until_complete(_loop_forever())


async def run_pipeline_webhook(trigger_data: dict = None):
    """Webhook-triggered pipeline run (fires in pipeline thread)."""
    import threading
    trig = "webhook"
    if trigger_data:
        if trigger_data.get("trigger_source"):
            trig = str(trigger_data["trigger_source"])
        elif trigger_data.get("event") == "api_manual_trigger":
            trig = "manual_api"

    def _run():
        subloop = asyncio.new_event_loop()
        asyncio.set_event_loop(subloop)
        state = copy.deepcopy(initial_state)
        state["trigger_source"] = trig
        store.log("[ORCHESTRATOR] Pipeline run scheduled")
        try:
            subloop.run_until_complete(invoke_staged_pipeline(state))
        except Exception as e:
            store.log(f"[ORCHESTRATOR][ERROR] {e}")

    threading.Thread(target=_run, daemon=True).start()


@app.post("/api/pipeline/run")
async def api_run_pipeline_now():
    """Run one discovery → response cycle on demand (no continuous loop needed)."""
    await run_pipeline_webhook({"event": "api_manual_trigger"})
    return {"status": "accepted", "message": "Pipeline scheduled in background"}

set_orchestrator_trigger(run_pipeline_webhook)

# ── Main startup ───────────────────────────────────────────────────────
async def main():
    global _loop
    _loop = asyncio.get_event_loop()

    console.print(Panel.fit(
        "[bold green]IoTSecure[/] — Agentic AI IoT Security System\n"
        "[dim]Multi-Agent · Deception · Autonomous Defence[/]",
        border_style="green"
    ))
    console.print(f"[green]Starting IoTSecure on subnet: {HOTSPOT_SUBNET}[/]")
    console.print(f"[green]Dashboard API: http://localhost:{DASHBOARD_API_PORT}[/]")
    console.print(f"[green]WebSocket:     ws://localhost:{DASHBOARD_API_PORT}/ws[/]")
    console.print(f"[green]Webhook:       http://localhost:{DASHBOARD_API_PORT}/webhook/trigger[/]")
    console.print("[green]Structured logs: logs/audit/*.jsonl[/]")
    if AUTONOMOUS_PIPELINE_MODE == "loop":
        console.print(
            f"[cyan]Autonomous scans[/]: every [bold]{SCAN_INTERVAL_SECONDS}s[/] · "
            f"set SCAN_INTERVAL_SECONDS or AUTONOMOUS_PIPELINE_MODE=manual|once in .env"
        )
    else:
        console.print(
            f"[cyan]Autonomous scans[/]: [bold]{AUTONOMOUS_PIPELINE_MODE}[/] — trigger manually: "
            "[bold]POST /api/pipeline/run[/]"
        )
    console.print("[yellow]Run 'npm run dev' in /dashboard to start the React UI[/]")

    store.log("[SYSTEM] IoTSecure starting up...")

    # Start pipeline in a separate daemon thread
    import threading
    pipeline_thread = threading.Thread(target=_pipeline_thread_fn, daemon=True, name="pipeline")
    pipeline_thread.start()
    console.print("[green]Pipeline thread started[/]")

    # Start uvicorn on the main event loop (non-blocking)
    config = uvicorn.Config(app, host="0.0.0.0", port=DASHBOARD_API_PORT, log_level="warning")
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("[red]IoTSecure shutting down...[/]")

