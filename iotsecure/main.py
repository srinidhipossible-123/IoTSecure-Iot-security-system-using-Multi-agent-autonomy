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
from concurrent.futures import ThreadPoolExecutor

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
from config import DASHBOARD_API_PORT, HOTSPOT_SUBNET, SCAN_INTERVAL_SECONDS

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

def _pipeline_thread_fn():
    """Run pipeline loop in a separate thread with its own event loop.
    This keeps the main asyncio loop (FastAPI/WebSocket) fully responsive
    while nmap and other blocking I/O agents run independently."""
    import threading
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def _cycle():
        state = initial_state.copy()
        store.log("[ORCHESTRATOR] Pipeline started")
        store.set_agent_status("orchestrator", "running", "Executing pipeline")
        try:
            result = await graph.ainvoke(state)
            store.log(f"[ORCHESTRATOR] Pipeline complete — found {len(result.get('devices', []))} devices")
        except Exception as e:
            store.log(f"[ORCHESTRATOR][ERROR] {e}")
        store.set_agent_status("orchestrator", "idle")

    async def _loop():
        await asyncio.sleep(3)
        store.log("[SYSTEM] IoTSecure autonomous pipeline started")
        while True:
            try:
                await _cycle()
            except Exception as e:
                store.log(f"[SYSTEM][ERROR] Pipeline error: {e}")
            store.log(f"[ORCHESTRATOR] Next scan in {SCAN_INTERVAL_SECONDS}s...")
            await asyncio.sleep(SCAN_INTERVAL_SECONDS)

    loop.run_until_complete(_loop())

async def run_pipeline_webhook(trigger_data: dict = None):
    """Webhook-triggered pipeline run (fires in pipeline thread)."""
    import threading
    def _run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        state = initial_state.copy()
        state["trigger_source"] = "webhook"
        store.log("[ORCHESTRATOR] Webhook-triggered pipeline started")
        store.set_agent_status("orchestrator", "running", "Webhook trigger")
        try:
            result = loop.run_until_complete(graph.ainvoke(state))
            store.log(f"[ORCHESTRATOR] Pipeline complete — found {len(result.get('devices', []))} devices")
        except Exception as e:
            store.log(f"[ORCHESTRATOR][ERROR] {e}")
        store.set_agent_status("orchestrator", "idle")
    t = threading.Thread(target=_run, daemon=True)
    t.start()

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

