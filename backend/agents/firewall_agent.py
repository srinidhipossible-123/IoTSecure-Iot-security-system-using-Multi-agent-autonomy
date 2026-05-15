"""
Firewall Agent — Manages iptables rules for network defense.
Uses dry-run mode by default for demo safety.
"""
import time
import os
from agents.tracer import trace

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# In-memory firewall state for demo
_firewall_rules = []
_blocked_ips = set()


class FirewallAgent:
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run

    @trace("firewall.block_ip")
    def block_ip(self, ip: str, reason: str = "") -> dict:
        """Block an IP address via iptables (dry-run in demo mode)."""
        rule = f"iptables -A INPUT -s {ip} -j DROP"
        _blocked_ips.add(ip)
        _firewall_rules.append({
            "rule": rule,
            "reason": reason,
            "ts": time.time(),
            "dry_run": self.dry_run
        })

        self._log(f"BLOCK_IP | {ip} | {reason} | dry_run={self.dry_run} | rule={rule}")

        return {
            "action": "block_ip",
            "ip": ip,
            "rule": rule,
            "reason": reason,
            "dry_run": self.dry_run,
            "status": "applied" if not self.dry_run else "dry_run",
            "ts": time.time()
        }

    @trace("firewall.apply_rule")
    def apply_custom_rule(self, rule: str) -> dict:
        """Apply a custom iptables rule (dry-run in demo mode)."""
        _firewall_rules.append({
            "rule": rule,
            "reason": "custom_rule",
            "ts": time.time(),
            "dry_run": self.dry_run
        })

        self._log(f"CUSTOM_RULE | {rule} | dry_run={self.dry_run}")

        return {
            "action": "apply_rule",
            "rule": rule,
            "dry_run": self.dry_run,
            "status": "applied" if not self.dry_run else "dry_run",
            "ts": time.time()
        }

    def _log(self, message: str):
        with open(os.path.join(LOG_DIR, "firewall.log"), "a") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | {message}\n")

    @staticmethod
    def get_rules() -> list:
        return list(_firewall_rules)

    @staticmethod
    def get_blocked_ips() -> list:
        return list(_blocked_ips)
