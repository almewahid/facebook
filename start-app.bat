@echo off
echo ====================================
echo   Facebook Auto Poster
echo   Starting Backend + Frontend...
echo ====================================

REM Start Backend
echo [1/2] Starting Backend...
start "Backend Server" cmd /k "cd /d D:\work\facebook-auto-poster\backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

timeout /t 5

REM Start Frontend
echo [2/2] Starting Frontend...
start "Frontend Dashboard" cmd /k "cd /d D:\work\facebook-auto-poster\frontend && npm run dev"

timeout /t 3

REM Open Browser
echo Opening Dashboard in browser...
timeout /t 10
start http://localhost:3000

echo.
echo ====================================
echo   All services started!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo ====================================
