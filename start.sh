#!/bin/bash
echo "🛡️ Starting AI Home Shield..."

# Check env
if [ -z "$GROQ_API_KEY" ]; then
    echo "❌ ERROR: GROQ_API_KEY not set. Run: export GROQ_API_KEY=your_key_here"
    exit 1
fi

mkdir -p backend/logs backend/data backend/honeytokens

# Install backend deps if needed
if [ ! -d "backend/.venv" ] && [ ! -f "backend/.deps_installed" ]; then
    echo "📦 Installing backend dependencies..."
    pip install -r backend/requirements.txt
    touch backend/.deps_installed
fi

# Build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "🔨 Building frontend..."
    cd frontend && npm install && npm run build && cd ..
fi

# Start webhook server in background
echo "🔌 Starting API server on port 8001..."
cd backend
uvicorn webhook_server:app --port 8001 --host 0.0.0.0 &
WEBHOOK_PID=$!
echo "API Server PID: $WEBHOOK_PID"
cd ..

sleep 2

# Serve frontend with a simple Python server
echo "📊 Serving frontend on port 3000..."
cd frontend/dist
python -m http.server 3000 &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ AI Home Shield is running!"
echo "   📊 Dashboard: http://localhost:3000"
echo "   🔌 API Server: http://localhost:8001"
echo "   📡 Health: http://localhost:8001/api/health"
echo ""
echo "Press Ctrl+C to stop all services."

# Cleanup on exit
trap "kill $WEBHOOK_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
