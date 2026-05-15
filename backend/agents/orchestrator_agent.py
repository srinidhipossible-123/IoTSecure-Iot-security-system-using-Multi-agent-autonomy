"""
OrchestratorAgent — The autonomous decision brain.
Uses Groq LLM to reason about threats and coordinate all agents.
"""
import json, time, re, os
from groq import Groq
from agents.tracer import trace
from database import SessionLocal, Incident, Device, Tenant, init_db
from sqlalchemy import desc

client = Groq()

SYSTEM_PROMPT = """You are an autonomous IoT security orchestrator AI.
You receive threat signals from a home network and must decide the best defensive response.
Reason step by step, consider attacker TTPs, predict lateral movement, output structured JSON.

Available agent tools:
- deploy_honeypot(device_type, port, protocol)
- generate_honeytokens(device_ip, device_type)
- block_ip(attacker_ip, reason)
- quarantine_device(device_ip, reason)
- write_firewall_rule(rule_description)
- send_alert(message, severity)
- predict_lateral_movement(compromised_device, network_topology)
- scan_network()

Always respond with valid JSON only. No markdown.

Response format:
{
  "threat_assessment": {"attack_type":"string","severity":"LOW|MEDIUM|HIGH|CRITICAL","confidence":0.0,"attacker_goal":"string","reasoning":"string"},
  "lateral_movement_prediction": {"next_targets":["device"],"attack_vector":"string","time_estimate":"string"},
  "action_plan": [{"step":1,"agent":"name","action":"action","params":{},"reason":"string","priority":"IMMEDIATE|HIGH|MEDIUM"}],
  "deception_strategy": {"deploy_honeypot":true,"honeypot_type":"string","persona_description":"string","honeytokens_to_plant":["string"]},
  "homeowner_summary": "Plain English explanation."
}"""

class OrchestratorAgent:
    def __init__(self):
        try:
            init_db()
        except Exception as e:
            print(f"[ORCHESTRATOR] DB Init Error (check if PostgreSQL is running): {e}")

    @trace("orchestrator.decide")
    def decide_and_execute(self, trigger_type: str, threat_context: dict) -> dict:
        prompt = f"TRIGGER: {trigger_type}\nTHREAT CONTEXT: {json.dumps(threat_context, indent=2)}\nNETWORK TOPOLOGY: {json.dumps(self._get_network_topology(), indent=2)}\nINCIDENT HISTORY: {json.dumps(self._get_recent_incidents(3), indent=2)}\n\nAnalyze this threat. Predict lateral movement. Generate a complete action plan."
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":prompt}],
                temperature=0.1, max_tokens=2000)
            raw = response.choices[0].message.content.strip()
            try: action_plan = json.loads(raw)
            except json.JSONDecodeError:
                match = re.search(r'\{.*\}', raw, re.DOTALL)
                action_plan = json.loads(match.group()) if match else self._fallback_plan(trigger_type, threat_context)
        except Exception as e:
            action_plan = self._fallback_plan(trigger_type, threat_context)
            action_plan["_error"] = str(e)

        results = self._execute_plan(action_plan, threat_context)
        self._save_incident(trigger_type, threat_context, action_plan, results)
        return {"action_plan": action_plan, "execution_results": results, "trigger_type": trigger_type, "ts": time.time()}

    def _fallback_plan(self, trigger_type, context):
        ip = context.get("attacker_ip", "unknown")
        return {
            "threat_assessment": {"attack_type":trigger_type,"severity":"HIGH","confidence":0.7,"attacker_goal":"Unauthorized access","reasoning":f"Fallback: {trigger_type} detected, Groq unavailable."},
            "lateral_movement_prediction": {"next_targets":["Smart TV","Thermostat"],"attack_vector":"Network scanning","time_estimate":"1-5 minutes"},
            "action_plan": [
                {"step":1,"agent":"firewall","action":"block_ip","params":{"attacker_ip":ip,"reason":f"Auto-block: {trigger_type}"},"reason":"Immediate mitigation","priority":"IMMEDIATE"},
                {"step":2,"agent":"deception","action":"deploy_honeypot","params":{"device_type":"camera","port":8888},"reason":"Capture TTPs","priority":"HIGH"},
                {"step":3,"agent":"notifier","action":"send_alert","params":{"severity":"HIGH"},"reason":"Alert homeowner","priority":"HIGH"}],
            "deception_strategy": {"deploy_honeypot":True,"honeypot_type":"camera","persona_description":"Fake IP camera decoy","honeytokens_to_plant":["camera_config.json"]},
            "homeowner_summary": f"A {trigger_type} was detected. The system blocked the threat, deployed a decoy, and is monitoring."
        }

    @trace("orchestrator.execute_plan")
    def _execute_plan(self, action_plan, context):
        from agents.deception_agent import DeceptionAgent
        from agents.response_agent import block_attacker_ip, quarantine_device, log_alert
        from agents.firewall_agent import FirewallAgent
        from agents.notifier import send_slack_alert
        from agents.discovery_agent import DiscoveryAgent

        results = []; fw = FirewallAgent(); dec = DeceptionAgent(); disc = DiscoveryAgent()
        steps = action_plan.get("action_plan", [])
        priority_order = {"IMMEDIATE":0,"HIGH":1,"MEDIUM":2}
        steps.sort(key=lambda x: priority_order.get(x.get("priority","MEDIUM"),2))

        for step in steps:
            agent = step.get("agent",""); action = step.get("action",""); params = step.get("params",{})
            result = {"step":step.get("step"),"agent":agent,"action":action,"status":"ok","detail":""}
            try:
                if action == "scan_network":
                    devices = disc.scan_network()
                    result["detail"] = f"Discovered {len(devices)} devices"
                elif action == "deploy_honeypot":
                    r = dec.deploy_dynamic_honeypot(device_type=params.get("device_type","camera"), port=params.get("port",8080), persona=action_plan.get("deception_strategy",{}).get("persona_description",""))
                    result["detail"] = r
                elif action == "block_ip":
                    ip = params.get("attacker_ip") or context.get("attacker_ip","")
                    if ip: r = fw.block_ip(ip, reason=params.get("reason","Autonomous block")); block_attacker_ip(ip); result["detail"] = r
                elif action == "quarantine_device":
                    device_ip = params.get("device_ip") or context.get("device_ip","")
                    quarantine_device(device_ip, reason=params.get("reason","")); result["detail"] = f"Quarantined {device_ip}"
                elif action == "write_firewall_rule":
                    rule = self._gen_fw_rule(params.get("rule_description","")); r = fw.apply_custom_rule(rule); result["detail"] = r
                elif action == "send_alert":
                    summary = action_plan.get("homeowner_summary","Threat detected and mitigated.")
                    send_slack_alert(summary, severity=params.get("severity","HIGH")); result["detail"] = "Alert sent"
                elif action == "generate_honeytokens":
                    from agents.honeytoken_agent import HoneytokenAgent
                    ht = HoneytokenAgent(); tokens = ht.deploy_tokens(params.get("device_ip","192.168.1.14"), params.get("device_type","camera"))
                    result["detail"] = f"Deployed {len(tokens)} honeytokens"
                elif action == "predict_lateral_movement":
                    targets = action_plan.get("lateral_movement_prediction",{}).get("next_targets",[])
                    result["detail"] = f"Predicted targets: {targets}"
            except Exception as e:
                result["status"] = "error"; result["detail"] = str(e)
            results.append(result)
            log_alert(f"[ORCHESTRATOR] Step {step.get('step')}: {agent}/{action} -> {result['status']}", severity="INFO")
        return results

    @trace("orchestrator.firewall_rule_gen")
    def _gen_fw_rule(self, description):
        try:
            r = client.chat.completions.create(model="llama-3.3-70b-versatile",
                messages=[{"role":"system","content":"You are an iptables expert. Output ONLY the iptables command."},{"role":"user","content":f"Write iptables rule to: {description}"}],
                temperature=0, max_tokens=100)
            return r.choices[0].message.content.strip()
        except: return f"iptables -A INPUT -j DROP  # fallback: {description}"

    def _get_network_topology(self):
        from agents.baseline_agent import DEVICE_BASELINES
        from agents.discovery_agent import DiscoveryAgent
        disc = DiscoveryAgent()
        real_devices = disc.get_devices()
        
        devices = []
        # Merge real discovered devices with baselines
        for d in real_devices:
            devices.append({
                "ip": d["ip"],
                "name": d.get("hostname", d["ip"]),
                "type": d["type"],
                "risk_score": 0.5, # Default risk for new devices
                "ports": [p["port"] for p in d.get("ports", [])]
            })
            
        # Add baseline devices if not already discovered
        discovered_ips = [d["ip"] for d in devices]
        for ip, i in DEVICE_BASELINES.items():
            if ip not in discovered_ips:
                devices.append({"ip":ip,"name":i["name"],"type":i["type"],"risk_score":i["risk_score"],"ports":i["normal_ports"]})
                
        return {"gateway":"192.168.1.1","subnet":"192.168.1.0/24","devices":devices}

    def _get_recent_incidents(self, limit=3):
        try:
            db = SessionLocal()
            rows = db.query(Incident).order_by(desc(Incident.ts)).limit(limit).all()
            db.close()
            return [{"trigger":r.trigger_type,"threat":r.threat_assessment,"outcome":r.outcome} for r in rows]
        except: return []

    def _save_incident(self, trigger_type, threat_context, action_plan, results):
        try:
            db = SessionLocal()
            ta = action_plan.get("threat_assessment", {})
            incident = Incident(
                trigger_type=trigger_type,
                threat_assessment=threat_context,
                action_plan=action_plan,
                outcome=results,
                severity=ta.get("severity", "MEDIUM")
            )
            db.add(incident)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[ORCHESTRATOR] Error saving incident: {e}")

    def get_incidents(self, limit=20):
        try:
            db = SessionLocal()
            rows = db.query(Incident).order_by(desc(Incident.ts)).limit(limit).all()
            db.close()
            return [{
                "ts": r.ts.timestamp(),
                "trigger": r.trigger_type,
                "plan": r.action_plan,
                "outcome": r.outcome
            } for r in rows]
        except Exception as e:
            print(f"[ORCHESTRATOR] Error fetching incidents: {e}")
            return []
