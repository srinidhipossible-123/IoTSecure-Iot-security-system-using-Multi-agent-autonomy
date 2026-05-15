"""
Discovery Agent — Responsible for real-time device discovery and service mapping.
Uses nmap and scapy for scanning the local network.
"""
import socket
import subprocess
import re
import os
import json
import time
from scapy.all import ARP, Ether, srp
from agents.tracer import trace
from database import SessionLocal, Device, init_db
from datetime import datetime

class DiscoveryAgent:
    def __init__(self, subnet=None):
        self.subnet = subnet or self._auto_detect_subnet()
        self.discovered_devices = {}
        try: init_db()
        except: pass

    def _auto_detect_subnet(self):
        try:
            # Get local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            # Assume /24 for the local IP
            base_ip = ".".join(local_ip.split(".")[:-1]) + ".0/24"
            print(f"[Discovery] Auto-detected subnet: {base_ip}")
            return base_ip
        except:
            return "192.168.1.0/24"

    @trace("discovery.scan_network")
    def scan_network(self):
        """Perform a full network scan using ARP and Nmap."""
        print(f"[Discovery] Scanning subnet: {self.subnet}")
        
        # 1. ARP Scan for fast discovery
        arp_devices = self._arp_scan()
        
        # 2. Nmap scan for services and OS detection
        for ip in arp_devices:
            details = self._nmap_scan(ip)
            device_data = {
                "ip": ip,
                "mac": arp_devices[ip]["mac"],
                "hostname": details.get("hostname", "Unknown"),
                "vendor": arp_devices[ip]["vendor"],
                "ports": details.get("ports", []),
                "os": details.get("os", "Unknown"),
                "last_seen": time.time(),
                "type": self._infer_device_type(details)
            }
            self.discovered_devices[ip] = device_data
            self._save_to_db(device_data)
            
        # Also save to JSON for backward compatibility/quick access
        self._save_results()
        return list(self.discovered_devices.values())

    def _save_to_db(self, dev):
        try:
            db = SessionLocal()
            existing = db.query(Device).filter(Device.ip == dev["ip"]).first()
            if existing:
                existing.hostname = dev["hostname"]
                existing.mac = dev["mac"]
                existing.device_type = dev["type"]
                existing.last_seen = datetime.utcnow()
                existing.metadata_json = {"ports": dev["ports"], "vendor": dev["vendor"], "os": dev["os"]}
            else:
                new_dev = Device(
                    ip=dev["ip"],
                    mac=dev["mac"],
                    hostname=dev["hostname"],
                    device_type=dev["type"],
                    metadata_json={"ports": dev["ports"], "vendor": dev["vendor"], "os": dev["os"]}
                )
                db.add(new_dev)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[Discovery] DB Save Error: {e}")

    def _save_results(self):
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        os.makedirs(data_dir, exist_ok=True)
        with open(os.path.join(data_dir, "discovered_devices.json"), "w") as f:
            json.dump(self.discovered_devices, f, indent=2)

    def _arp_scan(self):
        """Use Scapy for ARP discovery."""
        devices = {}
        try:
            ans, unans = srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=self.subnet), timeout=2, verbose=False)
            for sent, received in ans:
                devices[received.psrc] = {"mac": received.hwsrc, "vendor": "Unknown"}
        except Exception as e:
            print(f"[Discovery] ARP Scan Error: {e}")
        return devices

    def _nmap_scan(self, ip):
        """Use nmap subprocess for service detection."""
        try:
            # -F (Fast mode), -sV (Service detection), -O (OS detection)
            # Running with -F for speed in demo
            cmd = ["nmap", "-F", "-sV", ip]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            output = result.stdout
            
            ports = []
            # Parse ports: 80/tcp open  http
            for line in output.splitlines():
                match = re.search(r"(\d+)/(tcp|udp)\s+open\s+(\S+)", line)
                if match:
                    ports.append({"port": int(match.group(1)), "protocol": match.group(2), "service": match.group(3)})
            
            hostname = "Unknown"
            host_match = re.search(r"Nmap scan report for (\S+)", output)
            if host_match:
                hostname = host_match.group(1)
                
            return {"ports": ports, "hostname": hostname}
        except Exception as e:
            print(f"[Discovery] Nmap Scan Error for {ip}: {e}")
            return {"ports": [], "hostname": "Unknown"}

    def _infer_device_type(self, details):
        """Infer device type based on ports and services."""
        ports = [p["port"] for p in details.get("ports", [])]
        services = [p["service"].lower() for p in details.get("ports", [])]
        
        if 554 in ports or "rtsp" in services: return "camera"
        if 8008 in ports or 8009 in ports: return "chromecast"
        if 80 in ports and 443 in ports: return "smart_hub"
        if 1883 in ports or "mqtt" in services: return "iot_bridge"
        return "generic_iot"

    def get_devices(self):
        return list(self.discovered_devices.values())
