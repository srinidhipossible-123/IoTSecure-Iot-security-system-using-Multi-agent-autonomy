# agents/discovery_agent.py
"""
Real-time network discovery agent.
Strategy:
  1. Async ping sweep to wake up all devices (populates ARP table)
  2. Read ARP table for instant IP + MAC mapping
  3. No nmap — too slow and causes pipeline to stick
"""
import socket, subprocess, time, ipaddress, os, asyncio
from agents.base import BaseAgent
from security.sanitiser import sanitise
from store.memory_store import store

class DiscoveryAgent(BaseAgent):
    agent_id = "discovery"
    description = "Real-time network device discovery"

    VENDOR_TABLE = {
        "B8:27:EB": "Raspberry Pi", "DC:A6:32": "Raspberry Pi",
        "E4:5F:01": "Raspberry Pi",
        "00:17:88": "Philips Hue",  "18:B4:30": "Nest Labs",
        "F0:EF:86": "TP-Link",      "50:C7:BF": "TP-Link",
        "98:DA:C4": "TP-Link",      "54:AF:97": "TP-Link",
        "B0:BE:76": "TP-Link",      "60:32:B1": "TP-Link",
        "C0:25:E9": "TP-Link",      "14:CC:20": "TP-Link",
        "30:B5:C2": "TP-Link",      "EC:08:6B": "TP-Link",
        "AC:84:C6": "Xiaomi",       "64:CC:2E": "Xiaomi",
        "78:11:DC": "Xiaomi",       "28:6C:07": "Xiaomi",
        "9C:2E:A1": "Xiaomi",       "04:CF:8C": "Xiaomi",
        "00:1A:22": "Samsung",      "40:4E:36": "Samsung",
        "8C:F5:A3": "Samsung",      "E8:48:B8": "Samsung",
        "A8:7C:01": "Samsung",      "84:D8:1B": "Samsung",
        "9C:3A:AF": "Samsung",      "34:14:B5": "Samsung",
        "CC:FA:00": "Apple",        "A4:83:E7": "Apple",
        "F0:18:98": "Apple",        "3C:22:FB": "Apple",
        "BC:D0:74": "Apple",        "F4:06:69": "Apple",
        "00:50:56": "VMware",       "08:00:27": "VirtualBox",
        "00:15:5D": "Hyper-V",
        "44:D9:E7": "Ubiquiti",     "FC:EC:DA": "Ubiquiti",
        "00:1E:58": "D-Link",       "1C:7E:E5": "D-Link",
        "20:AA:4B": "Cisco",        "00:25:B5": "Cisco",
        "F8:B1:56": "Dell",         "D4:BE:D9": "Dell",
        "34:64:A9": "HP",           "3C:D9:2B": "HP",
        "C8:5B:76": "Google",       "F4:F5:D8": "Google",
        "48:D6:D5": "Google",       "A4:77:33": "Google",
        "A0:20:A6": "Realtek",      "00:E0:4C": "Realtek",
        "2C:F0:5D": "Microsoft",    "7C:1E:52": "Microsoft",
        "60:45:CB": "ASUSTek",      "04:92:26": "ASUSTek",
        "74:D0:2B": "ASUSTek",
        "E4:A4:71": "Intel",        "A4:34:D9": "Intel",
        "48:51:B7": "Intel",        "34:13:E8": "Intel",
        "80:86:F2": "Intel",
        "3C:06:30": "Apple",        "A8:66:7F": "Apple",
        "62:27:96": "Mobile Device", "42:DA:50": "Mobile Hotspot",
    }

    async def execute(self, state: dict) -> dict:
        subnet = state.get("subnet", "192.168.1.0/24")
        my_ip = self._get_my_ip()

        store.log(f"[DISCOVERY] Scanning {subnet} (my IP: {my_ip})")

        # Step 1: Ping sweep to populate ARP table (3-4 seconds)
        store.log("[DISCOVERY] Ping sweep — waking up all devices...")
        self._ping_sweep(subnet)

        # Step 2: Read ARP table (instant)
        store.log("[DISCOVERY] Reading ARP table...")
        devices = self._read_arp(subnet, my_ip)
        store.log(f"[DISCOVERY] Found {len(devices)} devices on network")

        # A2A: handoff to profiler
        self.send_message("profiler", "task", {
            "action": "profile_devices",
            "device_count": len(devices),
            "devices": [d["ip"] for d in devices]
        })

        state["devices"] = devices
        state["scan_count"] = state.get("scan_count", 0) + 1
        state["last_scan_time"] = time.time()
        state["current_phase"] = "profile"
        return state

    def _get_my_ip(self) -> str:
        """Get this machine's IP on the active network."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(2)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "0.0.0.0"

    def _ping_sweep(self, subnet: str):
        """Parallel ping sweep using Windows — populates ARP table with all live devices."""
        try:
            network = ipaddress.IPv4Network(subnet, strict=False)
            # Build a batch of ping commands — run all at once
            # Use subprocess with /C to run multiple pings in parallel
            hosts = [str(ip) for ip in network.hosts()]

            # Batch ping: fire all at once using Start-Process (non-blocking)
            batch_size = 50
            for i in range(0, len(hosts), batch_size):
                batch = hosts[i:i+batch_size]
                # Use cmd /C to fire pings in background
                for ip in batch:
                    subprocess.Popen(
                        ["ping", "-n", "1", "-w", "200", ip],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        creationflags=0x08000000  # CREATE_NO_WINDOW
                    )
                # Small pause between batches to avoid overwhelming
                time.sleep(0.1)

            # Wait for pings to complete and ARP table to populate
            time.sleep(4)
            store.log("[DISCOVERY] Ping sweep complete")

        except Exception as e:
            store.log(f"[DISCOVERY][WARN] Ping sweep error: {e}")

    def _read_arp(self, subnet: str, my_ip: str) -> list:
        """Read Windows ARP table — filtered to our subnet."""
        devices = []
        seen_ips = set()

        try:
            result = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5)

            for line in result.stdout.splitlines():
                parts = line.split()
                if len(parts) >= 3 and parts[0].count(".") == 3:
                    ip = parts[0].strip()
                    mac_raw = parts[1].strip()
                    entry_type = parts[2].strip() if len(parts) > 2 else ""

                    # Only our subnet
                    if not self._is_in_subnet(ip, subnet):
                        continue

                    # Skip broadcast, multicast, self
                    if mac_raw.lower() in ("ff-ff-ff-ff-ff-ff",):
                        continue
                    if mac_raw.lower().startswith("01-00-5e") or mac_raw.lower().startswith("33-33-"):
                        continue
                    if ip == my_ip:
                        continue
                    if ip in seen_ips:
                        continue
                    seen_ips.add(ip)

                    mac = mac_raw.replace("-", ":").upper()
                    vendor = self._lookup_vendor(mac)

                    device = {
                        "ip": ip,
                        "mac": mac,
                        "hostname": "",
                        "vendor": vendor or "Unknown Device",
                        "open_ports": [],
                        "os_guess": "Unknown",
                        "last_seen": time.time(),
                        "risk_score": 0,
                        "risk_level": "low",
                        "cve_count": 0,
                        "cves": [],
                        "is_honeypot": False,
                        "connection_type": entry_type,
                        "baseline_traffic": {}
                    }

                    store.upsert_device(device)
                    devices.append(device)
                    store.log(f"[DISCOVERY] Device: {ip} | MAC: {mac} | {vendor or 'Unknown'}")

        except Exception as e:
            store.log(f"[DISCOVERY][ERROR] ARP read failed: {e}")

        return devices

    def _is_in_subnet(self, ip: str, subnet: str) -> bool:
        try:
            return ipaddress.IPv4Address(ip) in ipaddress.IPv4Network(subnet, strict=False)
        except Exception:
            return False

    def _lookup_vendor(self, mac: str) -> str:
        prefix = mac.upper().replace("-", ":")[:8]
        return self.VENDOR_TABLE.get(prefix, "")
