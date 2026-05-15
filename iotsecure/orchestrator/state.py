# orchestrator/state.py
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime
import time

class Device(TypedDict):
    ip: str
    mac: str
    hostname: str
    vendor: str
    open_ports: List[int]
    os_guess: str
    last_seen: float
    risk_score: int          # 0-100
    risk_level: str          # low / medium / high / critical
    cve_count: int
    cves: List[str]
    is_honeypot: bool
    baseline_traffic: Dict

class ThreatEvent(TypedDict):
    event_id: str
    timestamp: float
    source_ip: str
    target_ip: str
    threat_type: str         # port_scan / honeypot_hit / anomaly / brute_force
    severity: str            # low / medium / high / critical
    llm_reasoning: str
    confidence: float
    mitigated: bool
    mitigation_action: str

class HoneypotHit(TypedDict):
    timestamp: float
    attacker_ip: str
    attacker_mac: str
    ports_tried: List[int]
    payloads: List[str]
    fingerprint: str
    canary_triggered: bool

class AgentMessage(TypedDict):
    from_agent: str
    to_agent: str
    message_type: str        # task / result / error / retry / handoff
    payload: Dict[str, Any]
    signature: str
    timestamp: float
    nonce: str

class AgentStatus(TypedDict):
    agent_id: str
    status: str              # idle / running / waiting / error / complete
    current_task: str
    last_run: float
    runs: int
    errors: int

class AgentState(TypedDict):
    # Network state
    devices: List[Device]
    scan_count: int
    last_scan_time: float
    subnet: str

    # Threat state
    threats: List[ThreatEvent]
    honeypot_hits: List[HoneypotHit]
    blocked_ips: List[str]
    active_honeypots: List[Dict]

    # Agent coordination (A2A)
    agent_messages: List[AgentMessage]
    agent_statuses: Dict[str, AgentStatus]

    # Orchestration control
    current_phase: str       # discover / profile / analyse / deceive / respond / idle
    trigger_source: str      # scheduled / webhook / honeypot_hit / manual
    iteration: int
    errors: List[str]
    retry_count: int

    # Output for dashboard
    dashboard_events: List[Dict]
    system_log: List[str]
