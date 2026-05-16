# config.py
import os, socket, subprocess
from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY         = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL           = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
WEBHOOK_SECRET       = os.getenv("WEBHOOK_SECRET", "dev-secret-change-me-32chars")
AGENT_HMAC_SECRET    = os.getenv("AGENT_HMAC_SECRET", "dev-hmac-secret-change-me-32ch")
SLACK_WEBHOOK_URL    = os.getenv("SLACK_WEBHOOK_URL", "")
HONEYPOT_PORT        = int(os.getenv("HONEYPOT_PORT", "8888"))
WEBHOOK_PORT         = int(os.getenv("WEBHOOK_PORT", "8080"))
DASHBOARD_API_PORT   = int(os.getenv("DASHBOARD_API_PORT", "8000"))
SCAN_INTERVAL_SECONDS= int(os.getenv("SCAN_INTERVAL_SECONDS", "20"))
PIPELINE_STEP_DELAY_SEC = float(os.getenv("PIPELINE_STEP_DELAY_SEC", "1.15"))

def _normalize_pipeline_mode() -> str:
    """
    loop   — repeated scans every SCAN_INTERVAL_SECONDS (default autonomous behaviour)
    once   — run one full pipeline after startup then stop automatic repeats
    manual — never auto-scan; trigger via POST /webhook/trigger or POST /api/pipeline/run
    """
    m = os.getenv("AUTONOMOUS_PIPELINE_MODE", "loop").lower().strip()
    return m if m in ("loop", "once", "manual") else "loop"

AUTONOMOUS_PIPELINE_MODE = _normalize_pipeline_mode()

def _detect_subnet():
    """Auto-detect the active subnet by checking the current local IP."""
    override = os.getenv("HOTSPOT_SUBNET", "")
    if override:
        return override

    try:
        # Connect to an external IP to find which local interface is active
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect(("8.8.8.8", 80))
        my_ip = s.getsockname()[0]
        s.close()
        
        if my_ip:
            parts = my_ip.split(".")
            # Convert 192.168.13.56 -> 192.168.13.0/24
            subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
            return subnet
    except Exception:
        pass

    return "192.168.1.0/24" # Ultimate fallback

HOTSPOT_SUBNET = _detect_subnet()
