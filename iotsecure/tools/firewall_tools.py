import subprocess
from store.memory_store import store

def block_ip(ip: str, rule_name: str = None) -> bool:
    """Block an IP using Windows Firewall (requires Admin)."""
    name = rule_name or f"IoTSecure_Block_{ip.replace('.', '_')}"
    try:
        result = subprocess.run([
            "netsh", "advfirewall", "firewall", "add", "rule",
            f"name={name}", "dir=in", "action=block",
            f"remoteip={ip}", "protocol=any", "enable=yes"
        ], capture_output=True, text=True, creationflags=0x08000000)
        return result.returncode == 0
    except Exception as e:
        store.log(f"[FIREWALL][ERROR] {e}")
        return False

def unblock_ip(ip: str) -> bool:
    """Remove firewall block for an IP."""
    name = f"IoTSecure_Block_{ip.replace('.', '_')}"
    try:
        subprocess.run([
            "netsh", "advfirewall", "firewall", "delete", "rule",
            f"name={name}"
        ], capture_output=True, creationflags=0x08000000)
        return True
    except Exception:
        return False

def list_blocked_rules() -> list:
    """List all IoTSecure firewall rules."""
    try:
        result = subprocess.run([
            "netsh", "advfirewall", "firewall", "show", "rule",
            "name=all", "dir=in"
        ], capture_output=True, text=True, creationflags=0x08000000)
        rules = []
        for line in result.stdout.splitlines():
            if "IoTSecure_Block" in line:
                rules.append(line.strip())
        return rules
    except Exception:
        return []
