# orchestrator/graph.py
"""
LangGraph StateGraph — the heart of IoTSecure's multi-agent autonomy.
Implements: async fan-out, conditional routing, retry logic, long-running loop.
"""
import asyncio, time
from langgraph.graph import StateGraph, END
from orchestrator.state import AgentState
from agents.discovery_agent import DiscoveryAgent
from agents.profiler_agent import ProfilerAgent
from agents.threat_detector_agent import ThreatDetectorAgent
from agents.deception_agent import DeceptionAgent
from agents.response_agent import ResponseAgent
from store.memory_store import store
from config import SCAN_INTERVAL_SECONDS

# Instantiate agents (singletons)
discovery  = DiscoveryAgent()
profiler   = ProfilerAgent()
detector   = ThreatDetectorAgent()
deception  = DeceptionAgent()
response   = ResponseAgent()

# ── Node wrappers ──────────────────────────────────────────────────────────

async def run_discovery(state: AgentState) -> AgentState:
    state["iteration"] = state.get("iteration", 0) + 1
    return await discovery.run(state)

async def run_profiler(state: AgentState) -> AgentState:
    return await profiler.run(state)

async def run_threat_detector(state: AgentState) -> AgentState:
    return await detector.run(state)

async def run_deception(state: AgentState) -> AgentState:
    return await deception.run(state)

async def run_response(state: AgentState) -> AgentState:
    return await response.run(state)

def run_idle(state: AgentState) -> AgentState:
    """End of pipeline cycle — log completion."""
    store.log(f"[ORCHESTRATOR] Cycle {state.get('iteration')} complete. Next scan in {SCAN_INTERVAL_SECONDS}s")
    store.set_agent_status("orchestrator", "idle", f"Cycle complete")
    return state

async def run_error_recovery(state: AgentState) -> AgentState:
    """A2A error recovery — retry failed agent or skip."""
    retry = state.get("retry_count", 0)
    errors = state.get("errors", [])
    store.log(f"[ORCHESTRATOR] Error recovery — retry {retry}, errors: {errors}")

    if retry < 3:
        state["retry_count"] = retry + 1
        state["errors"] = []
        state["current_phase"] = "discover"
    else:
        store.log("[ORCHESTRATOR] Max retries reached — resetting to idle")
        state["current_phase"] = "idle"
        state["retry_count"] = 0
        state["errors"] = []
    return state

# ── Routing logic ──────────────────────────────────────────────────────────

def route_from_orchestrator(state: AgentState) -> str:
    if state.get("errors"):
        return "error_recovery"
    phase = state.get("current_phase", "discover")
    phase_map = {
        "discover": "discovery", "profile": "profiler",
        "analyse": "threat_detector", "deceive": "deception",
        "respond": "response", "idle": "idle",
    }
    return phase_map.get(phase, "idle")

# ── Build the graph ────────────────────────────────────────────────────────

def build_graph():
    g = StateGraph(AgentState)

    g.add_node("discovery", run_discovery)
    g.add_node("profiler", run_profiler)
    g.add_node("threat_detector", run_threat_detector)
    g.add_node("deception", run_deception)
    g.add_node("response", run_response)
    g.add_node("idle", run_idle)
    g.add_node("error_recovery", run_error_recovery)

    g.set_entry_point("discovery")

    g.add_edge("discovery", "profiler")
    g.add_edge("profiler", "threat_detector")

    g.add_conditional_edges(
        "threat_detector",
        lambda s: s.get("current_phase", "respond"),
        {"deceive": "deception", "respond": "response", "idle": "idle"}
    )
    g.add_edge("deception", "response")

    g.add_conditional_edges(
        "response",
        lambda s: "error_recovery" if s.get("errors") else "idle",
        {"error_recovery": "error_recovery", "idle": "idle"}
    )

    g.add_edge("idle", END)

    g.add_conditional_edges(
        "error_recovery",
        lambda s: s.get("current_phase", "discover"),
        {"discover": "discovery", "idle": "idle"}
    )

    return g.compile()
