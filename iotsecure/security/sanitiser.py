import re

INJECTION_PATTERNS = [
    r"(?i)ignore\s+(previous|prior|all)\s+(instructions?|prompts?|rules?)",
    r"(?i)you\s+are\s+now\s+a",
    r"(?i)forget\s+(everything|all|prior)",
    r"(?i)(system|assistant|user)\s*:",
    r"(?i)jailbreak",
    r"(?i)act\s+as\s+if",
]

def sanitise(raw: str, max_len: int = 300) -> str:
    """Strip prompt injection attempts from untrusted network data."""
    cleaned = raw
    for pat in INJECTION_PATTERNS:
        cleaned = re.sub(pat, "[REDACTED]", cleaned)
    cleaned = re.sub(r"[^\x20-\x7E]", "", cleaned)
    return cleaned[:max_len].strip()

def safe_llm_context(device: dict) -> str:
    """Build injection-safe LLM context from device data."""
    return (
        f"Device IP: {device.get('ip','unknown')}\n"
        f"Hostname (untrusted): \"{sanitise(device.get('hostname',''))}\"\n"
        f"Vendor: \"{sanitise(device.get('vendor',''))}\"\n"
        f"Open ports: {device.get('open_ports', [])}\n"
        f"OS guess: \"{sanitise(device.get('os_guess',''))}\"\n"
        f"CVE count: {device.get('cve_count', 0)}\n"
        f"Risk score: {device.get('risk_score', 0)}/100"
    )
