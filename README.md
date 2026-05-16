# 🛡️ AI Home Shield (IoTSecure)

> **Autonomous Multi-Agent IoT Security System**  
> Built for ANVIL 2026 · Problem 3 — Autonomous Multi-Agent Pipelines 

---

## 🎯 What It Does

AI Home Shield is a production-grade autonomous security system that protects home IoT devices using a multi-agent AI pipeline. When a threat is detected — whether via honeytoken trip, port scan, or network anomaly — the system:

1. **Detects** the threat via webhooks or autonomous monitoring 
2. **Reasons** about it using Groq LLM (llama-3.3-70b-versatile) 
3. **Plans** a multi-step response (block IP, deploy honeypot, quarantine device) 
4. **Executes** the plan autonomously via a LangGraph-powered pipeline
5. **Traces** every agent step with structured JSON logging and WebSocket updates
6. **Visualizes** the entire security posture in a modern Cyber-UI dashboard

## 🏗️ Architecture

``` 
External Trigger (webhook/honeytoken/anomaly) 
         │ 
         ▼ 
   ┌─────────────┐ 
   │ LangGraph   │ ← Groq LLM reasoning (Threat Detector)
   │ Orchestrator│ 
   └──────┬──────┘ 
          │ Autonomous Pipeline 
     ┌────┼────┬────────┬──────────┐ 
     ▼    ▼    ▼        ▼          ▼ 
 Discovery Profiler Deception Response  Detector 
  Agent     Agent    Agent     Agent    Agent 
     │      │        │         │          │ 
     ▼      ▼        ▼         ▼          ▼ 
  Network  CVE/Risk  Honeypot  Firewall   LLM 
   Scan    Scoring   deploy    block      Reasoning 
``` 

## ⚡ 5-Minute Quickstart

### Prerequisites
- Python 3.10+
- Node.js 20+
- Groq API key ([get one free](https://console.groq.com))

### Setup

```bash
# Clone and enter
git clone <repo-url>
cd ai-home-shield

# Set your Groq API key
export GROQ_API_KEY=your_key_here

# Install dependencies
pip install -r iotsecure/requirements.txt

# Start the Backend (FastAPI + Agents)
python iotsecure/main.py
```

Then open the Dashboard (in a new terminal):
```bash
cd iotsecure/dashboard
npm install
npm run dev
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
3. Watch: Orchestrator receives threat -> Groq reasons -> Action plan generated 
4. See: Agent Traces section updates in real-time with every step 
5. See: Threat Timeline shows AI reasoning and risk assessment
6. See: Stats update - IPs blocked, honeypots deployed, alerts sent 
7. Try different attack modes using the simulation tool:
   python iotsecure/simulate_threat.py --type brute_force
``` 

## 🤖 Agent System

| Agent | Role | LLM-Powered? |
|-------|------|:---:|
| Orchestrator | Pipeline coordination using LangGraph | ✅ Logic |
| Threat Detector | Behavioral analysis and threat reasoning | ✅ Groq |
| Deception | Honeypot deployment and canary management | ❌ Rule-based |
| Profiler | Device identification and CVE enrichment | ❌ Rule-based |
| Discovery | Autonomous network scanning and fingerprinting | ❌ Rule-based |
| Response | Firewall blocking and containment protocols | ❌ Rule-based |

## 📊 Tech Stack

- **LLM**: Groq (llama-3.3-70b-versatile)
- **Orchestration**: LangGraph, Asyncio
- **Backend**: Python, FastAPI, SQLite
- **Frontend**: React, Vite, Tailwind CSS
- **Tracing**: Structured JSON (store/json_audit.py)
- **Containerization**: Docker

## 📁 Project Structure

``` 
ai-home-shield/ 
├── iotsecure/               # Backend Core
│   ├── agents/              # Autonomous Agents
│   ├── orchestrator/        # LangGraph Pipeline logic
│   ├── honeypot/            # Deception infrastructure
│   ├── security/            # Sanitization & Rate limiting
│   ├── store/               # Memory & Audit storage
│   ├── tools/               # Agent utility tools
│   ├── dashboard/           # React Frontend UI
│   ├── main.py              # Entry point (Port 8001)
│   └── requirements.txt     # Python dependencies
├── .github/workflows/       # CI/CD Pipelines
├── Dockerfile               # Production container
└── README.md                # You are here
``` 

--- 

*Built for ANVIL 2026 · Sponsored by Omium*
