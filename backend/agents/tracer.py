"""
Structured tracer — wraps every agent function with timing, inputs, outputs.
Writes to logs/trace.jsonl — one JSON object per line.
This IS the Omium tracing equivalent for full observability.
"""
import json
import time
import functools
import os

TRACE_LOG = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs", "trace.jsonl")
os.makedirs(os.path.dirname(TRACE_LOG), exist_ok=True)


def trace(span_name: str):
    """
    Decorator. Use on any agent method:
    @trace("orchestrator.decide")
    def decide_and_execute(self, ...):
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            span = {
                "span": span_name,
                "ts_start": start,
                "ts_start_human": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(start)),
                "status": "running",
                "input_summary": _summarize(args[1:] if args else args, kwargs),
                "output": None,
                "duration_ms": None,
                "error": None
            }
            try:
                result = func(*args, **kwargs)
                span["status"] = "success"
                span["output"] = _summarize_output(result)
                return result
            except Exception as e:
                span["status"] = "error"
                span["error"] = str(e)
                raise
            finally:
                span["duration_ms"] = round((time.time() - start) * 1000, 2)
                try:
                    with open(TRACE_LOG, "a") as f:
                        f.write(json.dumps(span) + "\n")
                except Exception:
                    pass
        return wrapper
    return decorator


def _summarize(args, kwargs):
    try:
        return {
            "args_count": len(args),
            "kwargs_keys": list(kwargs.keys()),
            "first_arg_type": type(args[0]).__name__ if args else None
        }
    except Exception:
        return {}


def _summarize_output(result):
    try:
        if isinstance(result, dict):
            return {k: str(v)[:100] for k, v in list(result.items())[:5]}
        return str(result)[:200]
    except Exception:
        return "non-serializable"


def get_recent_traces(limit: int = 50) -> list:
    """Read recent traces for dashboard display."""
    try:
        with open(TRACE_LOG, "r") as f:
            lines = f.readlines()
        traces = []
        for line in lines[-limit:]:
            try:
                traces.append(json.loads(line.strip()))
            except Exception:
                pass
        return list(reversed(traces))
    except Exception:
        return []
