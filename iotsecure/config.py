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
SCAN_INTERVAL_SECONDS= int(os.getenv("SCAN_INTERVAL_SECONDS", "60"))

def _detect_subnet():
    """Auto-detect the active Wi-Fi/Ethernet subnet on Windows."""
    override = os.getenv("HOTSPOT_SUBNET", "")
    if override:
        return override

    try:
        # Get the default gateway IP to find the active interface
        result = subprocess.run(
            ["powershell", "-Command",
             "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).NextHop"],
            capture_output=True, text=True, timeout=5
        )
        gateway = result.stdout.strip()
        if gateway and gateway.count(".") == 3:
            # Derive subnet from gateway (e.g., 10.152.136.1 → 10.152.136.0/24)
            parts = gateway.split(".")
            subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
            return subnet
    except Exception:
        pass

    try:
        # Fallback: use socket to find our own IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        my_ip = s.getsockname()[0]
        s.close()
        parts = my_ip.split(".")
        return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
    except Exception:
        return "192.168.1.0/24"

HOTSPOT_SUBNET = _detect_subnet()
