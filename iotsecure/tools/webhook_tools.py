# tools/webhook_tools.py
"""Outbound webhook and Slack alert tools."""
import aiohttp
import hmac
import hashlib
import json
import time
from config import WEBHOOK_SECRET, SLACK_WEBHOOK_URL
from store.memory_store import store


async def send_signed_webhook(url: str, payload: dict) -> bool:
    """Send an HMAC-signed webhook to an external endpoint."""
    body = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    try:
        async with aiohttp.ClientSession() as session:
            resp = await session.post(
                url, data=body,
                headers={"X-Signature": sig, "Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=5)
            )
            return resp.status < 400
    except Exception as e:
        store.log(f"[WEBHOOK][WARN] Delivery failed to {url}: {e}")
        return False


async def send_slack_alert(message: str, severity: str = "medium") -> bool:
    """Send an alert to Slack via webhook."""
    if not SLACK_WEBHOOK_URL:
        return False
    emoji = {
        "low": ":information_source:",
        "medium": ":warning:",
        "high": ":exclamation:",
        "critical": ":rotating_light:"
    }.get(severity, ":warning:")

    msg = {
        "text": f"{emoji} *IoTSecure Alert* — {severity.upper()}",
        "blocks": [{
            "type": "section",
            "text": {"type": "mrkdwn", "text": message}
        }]
    }
    try:
        async with aiohttp.ClientSession() as session:
            resp = await session.post(
                SLACK_WEBHOOK_URL, json=msg,
                timeout=aiohttp.ClientTimeout(total=5)
            )
            return resp.status < 400
    except Exception:
        return False
