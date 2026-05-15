import hmac, hashlib, json, time, os, secrets
from config import AGENT_HMAC_SECRET

def sign_message(from_agent: str, to_agent: str, msg_type: str, payload: dict) -> dict:
    """Sign inter-agent message with HMAC-SHA256."""
    body = {
        "from_agent": from_agent,
        "to_agent": to_agent,
        "message_type": msg_type,
        "payload": payload,
        "timestamp": time.time(),
        "nonce": secrets.token_hex(8)
    }
    raw = json.dumps(body, sort_keys=True)
    sig = hmac.new(AGENT_HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    body["signature"] = sig
    return body

def verify_message(msg: dict, max_age: int = 30) -> bool:
    """Verify HMAC signature and message freshness."""
    try:
        sig = msg.pop("signature", "")
        raw = json.dumps(msg, sort_keys=True)
        expected = hmac.new(AGENT_HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
        msg["signature"] = sig
        if not hmac.compare_digest(expected, sig):
            return False
        if (time.time() - msg.get("timestamp", 0)) > max_age:
            return False
        return True
    except Exception:
        return False
