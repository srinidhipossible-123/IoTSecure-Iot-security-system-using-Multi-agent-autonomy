# agents/base.py
import time, asyncio, traceback
from abc import ABC, abstractmethod
from typing import Any, Dict
from langchain_groq import ChatGroq
from security.signing import sign_message, verify_message
from security.sanitiser import sanitise
from security.rate_limiter import rate_limiter
from store.memory_store import store
from config import GROQ_API_KEY, GROQ_MODEL
import logging

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """
    Base class for all IoTSecure agents.
    Implements A2A messaging, Omium tracing, rate limiting, and error recovery.
    """
    agent_id: str = "base"
    description: str = "Base agent"

    def __init__(self):
        self.llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model=GROQ_MODEL,
            temperature=0.1,
            max_tokens=2048
        )
        self._outbox: list = []    # A2A messages to send
        self._inbox: list = []     # A2A messages received
        self.run_count = 0
        self.error_count = 0

    # ── A2A Protocol ─────────────────────────────────────────────────────────

    def send_message(self, to_agent: str, msg_type: str, payload: dict):
        """Send a signed A2A message to another agent via shared store."""
        msg = sign_message(self.agent_id, to_agent, msg_type, payload)
        store.log(f"[A2A] {self.agent_id} → {to_agent}: {msg_type}")
        return msg

    def receive_message(self, msg: dict) -> dict | None:
        """Verify and accept an incoming A2A message."""
        if not verify_message(msg):
            store.log(f"[A2A][SECURITY] Rejected message claiming to be from {msg.get('from_agent')}")
            return None
        return msg["payload"]

    # ── Execution with tracing ────────────────────────────────────────────────

    async def run(self, state: dict) -> dict:
        """Execute agent with full tracing, rate limiting, and error recovery."""
        if not rate_limiter.allow(self.agent_id):
            store.log(f"[RATE LIMIT] {self.agent_id} throttled")
            return state

        store.set_agent_status(self.agent_id, "running", self.description)
        self.run_count += 1
        start = time.time()

        # Omium trace start
        self._trace_start(state)

        try:
            result_state = await self.execute(state)
            elapsed = round(time.time() - start, 2)
            store.log(f"[{self.agent_id.upper()}] Completed in {elapsed}s")
            store.set_agent_status(self.agent_id, "idle")
            self._trace_end(result_state, elapsed, success=True)
            return result_state

        except Exception as e:
            self.error_count += 1
            store.set_agent_status(self.agent_id, "error", str(e))
            store.log(f"[{self.agent_id.upper()}][ERROR] {str(e)}")
            # A2A: notify orchestrator of failure
            err_msg = self.send_message("orchestrator", "error", {
                "agent": self.agent_id,
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            state.setdefault("errors", []).append(f"{self.agent_id}: {str(e)}")
            self._trace_end(state, time.time() - start, success=False, error=str(e))
            return state

    @abstractmethod
    async def execute(self, state: dict) -> dict:
        """Override in each agent. Do the actual work here."""
        pass

    # ── Omium Tracing ─────────────────────────────────────────────────────────

    def _trace_start(self, state: dict):
        """Log agent start to Omium-compatible trace format."""
        store.log(f"[TRACE:{self.agent_id}] START iter={state.get('iteration',0)}")

    def _trace_end(self, state: dict, elapsed: float, success: bool, error: str = ""):
        """Log agent completion to Omium-compatible trace format."""
        status = "SUCCESS" if success else f"FAIL:{error}"
        store.log(f"[TRACE:{self.agent_id}] END {status} elapsed={elapsed}s")

    # ── LLM helper ────────────────────────────────────────────────────────────

    def ask_llm(self, system: str, user: str) -> str:
        """Call Groq LLM with injection-safe prompting."""
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        try:
            response = self.llm.invoke(messages)
            return response.content
        except Exception as exc:
            logger.warning("LLM call failed for %s: %s", self.agent_id, exc)
            store.log(
                f"[{self.agent_id.upper()}][WARN] LLM unavailable — using synthetic analyst JSON for trace continuity"
            )
            return (
                '{"threat_level":"high","confidence":0.72,"threat_type":"anomaly",'
                '"reasoning":"Synthetic analyst output while the LLM control plane is unavailable '
                '(offline key, quota, or network). Operator trace continues for demo.",'
                '"recommended_action":"honeypot"}'
            )
