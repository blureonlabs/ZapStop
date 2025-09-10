@echo off
REM ZapStop Development Startup Script for Windows

echo 🚀 Starting ZapStop Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Start backend and database services
echo 📦 Starting backend services...
docker-compose up -d db redis backend

REM Wait for backend to be ready
echo ⏳ Waiting for backend to be ready...
timeout /t 10 /nobreak >nul

REM Check if backend is running
curl -f http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is running at http://localhost:8000
    echo 📚 API Documentation: http://localhost:8000/docs
) else (
    echo ❌ Backend failed to start. Check logs with: docker-compose logs backend
    exit /b 1
)

REM Start frontend
echo 🎨 Starting frontend...
cd frontend
call npm install
call npm run dev

echo ✅ Development environment started!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo To stop all services: docker-compose down
