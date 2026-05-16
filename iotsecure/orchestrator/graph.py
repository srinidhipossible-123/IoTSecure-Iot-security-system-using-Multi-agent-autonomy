# orchestrator/graph.py
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from agents.discovery_agent import DiscoveryAgent
from agents.profiler_agent import ProfilerAgent
from agents.threat_detector_agent import ThreatDetectorAgent
from agents.deception_agent import DeceptionAgent
from agents.response_agent import ResponseAgent
from store.memory_store import store

class AgentState(TypedDict, total=False):
    devices: List[dict]
    threats: List[dict]
    honeypot_hits: List[dict]
    blocked_ips: List[str]
    active_honeypots: List[dict]
    actions: List[dict]
    active_attacker: str
    iteration: int
    force_run: bool

def build_graph():
    workflow = StateGraph(AgentState)

    # 1. DISCOVERY PHASE
    async def discover_node(state: AgentState):
        store.set_agent_status("discovery", "running", "Deep scanning subnet for IoT fingerprints")
        agent = DiscoveryAgent()
        result = await agent.execute(state)
        store.set_agent_status("discovery", "idle")
        return result

    # 2. PROFILER PHASE (A2A: Receives discovered devices)
    async def profile_node(state: AgentState):
        if not state.get("devices"): return state
        store.log(f"[A2A] discovery -> profiler: profiling {len(state['devices'])} devices")
        store.set_agent_status("profiler", "running", "Enriching device data with CVEs and risk scores")
        agent = ProfilerAgent()
        result = await agent.execute(state)
        store.set_agent_status("profiler", "idle")
        return result

    # 3. THREAT DETECTOR PHASE (A2A: Receives profiled data)
    async def threat_node(state: AgentState):
        store.log("[A2A] profiler -> threat_detector: analyzing behavioral signals")
        store.set_agent_status("threat_detector", "running", "LLM reasoning over device posture and attack signals")
        agent = ThreatDetectorAgent()
        result = await agent.execute(state)
        store.set_agent_status("threat_detector", "idle")
        return result

    # 4. DECEPTION PHASE (A2A: Receives threat analysis)
    async def deception_node(state: AgentState):
        if not state.get("threats"): return state
        store.log("[A2A] threat_detector -> deception: deploying autonomous traps")
        store.set_agent_status("deception", "running", "Spawning honey-ports and digital canaries")
        agent = DeceptionAgent()
        result = await agent.execute(state)
        store.set_agent_status("deception", "idle")
        return result

    # 5. RESPONSE PHASE (A2A: Receives deception/threat data)
    async def response_node(state: AgentState):
        if not state.get("threats") and not state.get("actions"): return state
        store.log("[A2A] deception -> response: executing containment protocols")
        store.set_agent_status("response", "running", "Executing firewall blocks and alerting handlers")
        agent = ResponseAgent()
        result = await agent.execute(state)
        store.set_agent_status("response", "idle")
        return result

    # Define the Step-by-Step Flow
    workflow.add_node("discovery", discover_node)
    workflow.add_node("profiler", profile_node)
    workflow.add_node("threat_detector", threat_node)
    workflow.add_node("deception", deception_node)
    workflow.add_node("response", response_node)

    workflow.set_entry_point("discovery")
    workflow.add_edge("discovery", "profiler")
    workflow.add_edge("profiler", "threat_detector")
    workflow.add_edge("threat_detector", "deception")
    workflow.add_edge("deception", "response")
    workflow.add_edge("response", END)

    return workflow.compile()
