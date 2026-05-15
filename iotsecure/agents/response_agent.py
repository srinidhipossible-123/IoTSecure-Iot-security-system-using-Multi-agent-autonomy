# agents/response_agent.py
import subprocess, time, json
import aiohttp
from agents.base import BaseAgent
from store.memory_store import store
from config import SLACK_WEBHOOK_URL, WEBHOOK_SECRET
import hmac, hashlib

class ResponseAgent(BaseAgent):
    agent_id = "response"
    description = "Blocking threats and sending alerts"

    async def execute(self, state: dict) -> dict:
        threats = state.get("threats", [])
        unmitigated = [t for t in threats if not t.get("mitigated")]

        if not unmitigated and not state.get("honeypot_hits"):
            store.log("[RESPONSE] No active threats to mitigate")
            state["current_phase"] = "idle"
            return state

        for threat in unmitigated:
            target_ip = threat.get("source_ip")
            if not target_ip:
                continue

            action = threat.get("mitigation_action", "monitor")

            if action in ("block", "quarantine") and target_ip not in store.blocked_ips:
                success = self._block_ip_windows(target_ip, threat.get("severity", "medium"))
                if success:
                    store.block_ip(target_ip, threat.get("llm_reasoning", "")[:100])
                    threat["mitigated"] = True
                    threat["mitigation_action"] = "blocked"

            report = self._generate_report(threat)
            await self._send_webhook_alert(threat, report)
            await self._send_slack(threat, report)

        state["current_phase"] = "idle"
        return state

    def _block_ip_windows(self, ip: str, severity: str) -> bool:
        rule_name = f"IoTSecure_Block_{ip.replace('.', '_')}"
        try:
            subprocess.run(
                ["netsh", "advfirewall", "firewall", "delete", "rule", f"name={rule_name}"],
                capture_output=True, creationflags=0x08000000
            )
            result = subprocess.run([
                "netsh", "advfirewall", "firewall", "add", "rule",
                f"name={rule_name}", "dir=in", "action=block",
                f"remoteip={ip}", "protocol=any", "enable=yes",
                "description=IoTSecure autonomous block"
            ], capture_output=True, text=True, creationflags=0x08000000)

            if result.returncode == 0:
                store.log(f"[RESPONSE] Blocked {ip} via Windows Firewall")
                return True
            else:
                store.log(f"[RESPONSE][WARN] Firewall block failed: {result.stderr} — may need Admin")
                return False
        except Exception as e:
            store.log(f"[RESPONSE][ERROR] Could not block {ip}: {e}")
            return False

    def _generate_report(self, threat: dict) -> str:
        prompt = (
            f"Write a 3-sentence incident summary for a home user.\n"
            f"Threat type: {threat.get('threat_type')}\n"
            f"Severity: {threat.get('severity')}\n"
            f"Source IP: {threat.get('source_ip')}\n"
            f"Analysis: {threat.get('llm_reasoning', '')[:300]}\n"
            f"Keep it clear, jargon-free, and actionable."
        )
        return self.ask_llm(
            "You are IoTSecure, a friendly home security assistant. Write clear, non-technical incident reports.",
            prompt
        )

    async def _send_webhook_alert(self, threat: dict, report: str):
        payload = json.dumps({
            "event": "threat_detected", "threat": threat,
            "report": report, "timestamp": time.time()
        }).encode()
        sig = "sha256=" + hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(
                    "http://localhost:8080/webhook/event",
                    data=payload,
                    headers={"X-Signature": sig, "Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=5)
                )
        except Exception as e:
            store.log(f"[RESPONSE][WARN] Webhook delivery failed: {e}")

    async def _send_slack(self, threat: dict, report: str):
        if not SLACK_WEBHOOK_URL:
            return
        msg = {
            "text": f":rotating_light: *IoTSecure Alert* — {threat.get('severity', '').upper()}",
            "blocks": [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{threat.get('threat_type', '').replace('_', ' ').title()}* detected from `{threat.get('source_ip')}`\n{report}"
                }
            }]
        }
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(SLACK_WEBHOOK_URL, json=msg, timeout=aiohttp.ClientTimeout(total=5))
        except Exception:
            pass
