import time
from collections import defaultdict

AGENT_LIMITS = {
    "discovery":       20,
    "profiler":        30,
    "threat_detector": 50,
    "deception":       10,
    "response":        10,
    "orchestrator":    100,
}

class RateLimiter:
    def __init__(self, window: int = 60):
        self.window = window
        self._calls: dict = defaultdict(list)

    def allow(self, agent_id: str) -> bool:
        now = time.time()
        self._calls[agent_id] = [t for t in self._calls[agent_id] if now - t < self.window]
        limit = AGENT_LIMITS.get(agent_id, 20)
        if len(self._calls[agent_id]) >= limit:
            return False
        self._calls[agent_id].append(now)
        return True

rate_limiter = RateLimiter()
