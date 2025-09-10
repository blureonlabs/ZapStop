#!/bin/bash

# ZapStop Development Startup Script

echo "🚀 Starting ZapStop Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start backend and database services
echo "📦 Starting backend services..."
docker-compose up -d db redis backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Check if backend is running
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is running at http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
else
    echo "❌ Backend failed to start. Check logs with: docker-compose logs backend"
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm install
npm run dev &

echo "✅ Development environment started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "To stop all services: docker-compose down"
