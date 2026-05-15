# orchestrator/router.py
"""Conditional edge routing logic for the LangGraph orchestrator."""

def route_from_orchestrator(state: dict) -> str:
    """Smart conditional routing based on current phase and errors."""
    if state.get("errors"):
        return "error_recovery"
    phase = state.get("current_phase", "discover")
    phase_map = {
        "discover": "discovery",
        "profile": "profiler",
        "analyse": "threat_detector",
        "deceive": "deception",
        "respond": "response",
        "idle": "idle",
    }
    return phase_map.get(phase, "idle")

def route_after_response(state: dict) -> str:
    """After response, always cycle back through idle."""
    if state.get("errors"):
        return "error_recovery"
    return "idle"

def route_after_threat(state: dict) -> str:
    """After threat detection, route to deception or response."""
    phase = state.get("current_phase", "respond")
    if phase == "deceive":
        return "deception"
    elif phase == "idle":
        return "idle"
    return "response"

def route_error_recovery(state: dict) -> str:
    """Route after error recovery."""
    phase = state.get("current_phase", "discover")
    if phase == "idle":
        return "idle"
    return "discovery"
