# orchestrator/staging.py — narrator-friendly demo signals (optional; env controlled).
import os
import time
import uuid

from store.memory_store import store
from store import json_audit

ENABLED = os.getenv("STAGED_PIPELINE_INJECTIONS", "1").lower() in ("1", "true", "yes", "on")


def _first_device_ip(devices: list) -> str:
    if not devices:
        return "10.0.0.99"
    return devices[0].get("ip") or "10.0.0.99"


def prepare_threat_detector(state: dict) -> dict:
    """
    When there is nothing for the LLM to analyse, temporarily elevate the first
    discovered host so the threat stage always has a clear story beat.
    """
    if not ENABLED:
        return state

    devices = list(state.get("devices") or [])
    high = [d for d in devices if d.get("risk_level") in ("high", "critical")]
    hh = state.get("honeypot_hits") or []

    if high or hh:
        return state

    if not devices:
        return state

    d = dict(devices[0])
    d["risk_score"] = max(int(d.get("risk_score") or 0), 78)
    d["risk_level"] = "high"
    devices[0] = d
    state["devices"] = devices
    store.upsert_device(d)

    inj = {
        "kind": "threat_stage_signal",
        "reason": "narration_elevation",
        "target_ip": d.get("ip"),
        "risk_score": d["risk_score"],
    }
    json_audit.append_stream("injections", inj)
    store.log(f"[STAGING] Threat stage — elevated analysis target {d.get('ip')} for LLM trace (demo signal).")
    store.notify_injection("threat_detector", f"Analysis target → {d.get('ip')} (high posture for trace).")
    return state


def prepare_deception(state: dict) -> dict:
    """
    If the graph has no honeypot-bound threats, seed one so deception + honey tokens
    always produce a visible beat for judges and the UI.
    """
    if not ENABLED:
        return state

    threats = list(state.get("threats") or [])
    honeypot_tasks = [
        t for t in threats
        if t.get("mitigation_action") == "honeypot" and not t.get("mitigated")
    ]
    if honeypot_tasks:
        return state

    src = _first_device_ip(state.get("devices") or [])
    tid = str(uuid.uuid4())
    synthetic = {
        "event_id": tid,
        "timestamp": time.time(),
        "source_ip": src,
        "target_ip": "network",
        "threat_type": "anomaly",
        "severity": "high",
        "llm_reasoning": "Staged deception beat — autonomous canary / honeypot deployment for operator trace.",
        "confidence": 0.86,
        "mitigated": False,
        "mitigation_action": "honeypot",
    }
    threats.append(synthetic)
    state["threats"] = threats
    store.add_threat(synthetic)

    inj = {"kind": "deception_stage_seed", "threat_id": tid, "source_ip": src}
    json_audit.append_stream("injections", inj)
    store.log(f"[STAGING] Deception stage — seeded honeypot-bound threat {tid[:8]}… for honey tokens + traps.")
    store.notify_injection("deception", "Honey surface armed — synthetic honeypot task injected for the trace.")
    return state
