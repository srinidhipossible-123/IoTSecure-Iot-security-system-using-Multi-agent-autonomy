# 🛡️ AI Home Shield

> **Autonomous Multi-Agent IoT Security System**  
> Built for ANVIL 2026 · Problem 3 — Autonomous Multi-Agent Pipelines

---

## 🎯 What It Does

AI Home Shield is a production-grade autonomous security system that protects home IoT devices using a multi-agent AI pipeline. When a threat is detected — whether via honeytoken trip, port scan, or network anomaly — the system:

1. **Detects** the threat via webhooks or autonomous monitoring
2. **Reasons** about it using Groq LLM (llama-3.3-70b-versatile)
3. **Plans** a multi-step response (block IP, deploy honeypot, quarantine device)
4. **Executes** the plan autonomously — zero human intervention
5. **Traces** every agent step with structured JSON logging
6. **Alerts** the homeowner via Slack with plain-English summaries

## 🏗️ Architecture

```
External Trigger (webhook/honeytoken/anomaly)
        │
        ▼
  ┌─────────────┐
  │  Orchestrator │ ← Groq LLM reasoning
  │    Agent      │
  └──────┬────────┘
         │ Action Plan
    ┌────┼────┬────────┬──────────┐
    ▼    ▼    ▼        ▼          ▼
Firewall Deception Response Honeytoken Notifier
 Agent    Agent    Agent    Agent      Agent
    │     │        │        │          │
    ▼     ▼        ▼        ▼          ▼
iptables Honeypot Quarantine Fake     Slack
 rules   deploy   device    creds    alert
```

## ⚡ 5-Minute Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key ([get one free](https://console.groq.com))

### Setup

```bash
# Clone and enter
git clone <repo-url>
cd ai-home-shield

# Set your Groq API key
export GROQ_API_KEY=your_key_here

# Install backend
pip install -r backend/requirements.txt

# Install and build frontend
cd frontend && npm install && npm run build && cd ..

# Start everything
cd backend
uvicorn webhook_server:app --port 8001 --host 0.0.0.0
```

Then open the frontend:
```bash
cd frontend && npm run dev
```

### Docker
```bash
docker build -t ai-home-shield .
docker run -e GROQ_API_KEY=your_key -p 8001:8001 ai-home-shield
```

## 🧪 Demo Flow

```
1. Open dashboard at http://localhost:5173
2. Click "Launch Attack Demo" on the hero section
3. Watch: Orchestrator receives threat → Groq reasons → Action plan generated
4. See: Agent Traces section updates in real-time with every step
5. See: Threat Timeline shows AI reasoning and lateral movement prediction
6. See: Stats update — IPs blocked, honeypots deployed, alerts sent
7. Try different attack modes: port_scan, brute_force, lateral_movement
```

## 🤖 Agent System

| Agent | Role | LLM-Powered? |
|-------|------|:---:|
| Orchestrator | Threat reasoning, action planning, coordination | ✅ Groq |
| Deception | Dynamic honeypot persona generation | ✅ Groq |
| Firewall | IP blocking, iptables rule generation | ✅ Groq |
| Response | Device quarantine, IP blocking | ❌ Rule-based |
| Honeytoken | Fake credential deployment & monitoring | ❌ Rule-based |
| Baseline | Traffic anomaly detection | ❌ Rule-based |
| Notifier | Slack alerts & logging | ❌ Rule-based |

## 📊 Tech Stack

- **LLM**: Groq (llama-3.3-70b-versatile)
- **Backend**: Python, FastAPI, SQLite
- **Frontend**: React, Vite
- **Tracing**: Structured JSON (logs/trace.jsonl)
- **Alerting**: Slack webhooks
- **Containerization**: Docker

## 📁 Project Structure

```
ai-home-shield/
├── backend/
│   ├── agents/
│   │   ├── orchestrator_agent.py   # LLM decision brain
│   │   ├── deception_agent.py      # Dynamic honeypots
│   │   ├── firewall_agent.py       # IP blocking
│   │   ├── response_agent.py       # Quarantine
│   │   ├── honeytoken_agent.py     # Fake credentials
│   │   ├── baseline_agent.py       # Anomaly detection
│   │   ├── notifier.py             # Slack alerts
│   │   └── tracer.py               # Structured tracing
│   ├── webhook_server.py           # FastAPI API + webhooks
│   └── utils/attack_demo.py        # CLI demo tool
├── frontend/                       # React dashboard
├── Dockerfile
├── start.sh
└── README.md
```

---

*Built for ANVIL 2026 · Sponsored by Omium*
