@echo off
TITLE EcoMind AI Launcher
COLOR 0A
echo =========================================================================
echo    EcoMind AI - Enterprise Sustainability Intelligence Platform
echo =========================================================================
echo.
echo Launching Backend (FastAPI) and Frontend (Vite React) in separate windows...
echo.

:: Launch Backend
start "EcoMind AI - Backend API" cmd /k "cd backend && (if not exist .venv python -m venv .venv) && (call .\.venv\Scripts\activate.bat) && pip install -r requirements.txt && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Launch Frontend
start "EcoMind AI - Frontend" cmd /k "cd frontend && npm install --legacy-peer-deps && npm run dev"

echo.
echo =========================================================================
echo Both services are starting:
echo  - Backend API:  http://127.0.0.1:8000
echo  - Swagger Docs: http://127.0.0.1:8000/docs
echo  - Frontend UI:  http://localhost:5173
echo =========================================================================
pause
