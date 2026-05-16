# store/json_audit.py — append-only JSONL audit streams (one JSON object per line).
import json
import re
import threading
import time
from pathlib import Path

_LOCK = threading.Lock()
_ROOT = Path(__file__).resolve().parent.parent / "logs" / "audit"


def _safe_stream(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9._-]+", "_", (name or "misc").strip())[:64]
    return s or "misc"


def append_stream(stream: str, record: dict) -> None:
    """Persist a single structured record (thread-safe)."""
    path = _ROOT / f"{_safe_stream(stream)}.jsonl"
    payload = {"ts_unix": time.time(), **record}
    line = json.dumps(payload, default=str, ensure_ascii=False) + "\n"
    with _LOCK:
        _ROOT.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(line)


def route_log_line(message: str, entry: dict) -> None:
    """Mirror human-readable system_log lines into themed JSONL buckets by tag prefix."""
    append_stream("system_all", {"channel": "system_log", **entry})
    tag = "system"
    m = re.match(r"\[([^\]]+)\]", message or "")
    if m:
        raw = m.group(1).upper()
        if raw.startswith("TRACE:"):
            tag = f"agent_{raw.split(':', 1)[1].lower()}"
        elif ":" in raw:
            tag = raw.split(":", 1)[0].lower()
        else:
            tag = raw.lower()
    append_stream(f"log_{tag}", {"channel": "system_log", **entry})
