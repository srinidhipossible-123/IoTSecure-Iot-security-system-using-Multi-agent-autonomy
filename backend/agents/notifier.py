"""Slack alerting for homeowner notifications."""
import os
import requests
import time
from agents.tracer import trace

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")


@trace("notifier.slack")
def send_slack_alert(message: str, severity: str = "HIGH") -> bool:
    """Sends plain-English alert to homeowner's Slack."""
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    os.makedirs(log_dir, exist_ok=True)

    if not SLACK_WEBHOOK_URL:
        # Log to file if no Slack configured
        with open(os.path.join(log_dir, "alerts.log"), "a") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | SLACK_ALERT | {severity} | {message}\n")
        return True

    emoji = {"CRITICAL": "🚨", "HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(severity, "🔴")

    payload = {
        "text": f"{emoji} *AI Home Shield Alert* [{severity}]\n{message}",
        "username": "AI Home Shield",
        "icon_emoji": ":shield:"
    }

    try:
        r = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=5)
        return r.status_code == 200
    except Exception:
        return False
