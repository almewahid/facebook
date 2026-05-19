@echo off
echo ====================================
echo   Facebook Auto Poster
echo   Starting Backend + Frontend...
echo ====================================

REM Local backend port. Port 8000 is left alone because an old protected server may already use it.
set "BACKEND_PORT=8001"

REM Make sure the frontend points to the local backend.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~dp0frontend\.env.local'; $pairs=@('BACKEND_URL=http://localhost:%BACKEND_PORT%','NEXT_PUBLIC_API_URL=http://localhost:%BACKEND_PORT%/api/v1'); if(Test-Path $p){ $c=Get-Content $p } else { $c=@() }; foreach($line in $pairs){ $key=$line.Split('=')[0]; if($c -match ('^'+[regex]::Escape($key)+'=')){ $c=$c -replace ('^'+[regex]::Escape($key)+'=.*'),$line } else { $c += $line } }; Set-Content $p $c"

REM Start Backend
echo [1/2] Starting Backend on port %BACKEND_PORT%...
start "Backend Server" cmd /k "cd /d %~dp0backend && run_local_8001.cmd"

timeout /t 5

REM Start Frontend
echo [2/2] Starting Frontend...
start "Frontend Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3

REM Open Browser
echo Opening Dashboard in browser...
timeout /t 10
start http://localhost:3000

echo.
echo ====================================
echo   All services started!
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   Frontend: http://localhost:3000
echo ====================================
