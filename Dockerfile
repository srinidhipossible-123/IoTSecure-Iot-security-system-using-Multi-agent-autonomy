FROM python:3.11-slim

WORKDIR /app

# System deps + Node.js
RUN apt-get update && apt-get install -y \
    nmap net-tools curl nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Backend deps
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Frontend build
COPY frontend/package.json frontend/package-lock.json* frontend/
RUN cd frontend && npm install

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copy backend
COPY backend/ backend/

# Create directories
RUN mkdir -p backend/logs backend/data backend/honeytokens

EXPOSE 8001

ENV PYTHONUNBUFFERED=1

# Start API server (serves frontend static files too)
CMD ["uvicorn", "backend.webhook_server:app", "--port", "8001", "--host", "0.0.0.0"]
