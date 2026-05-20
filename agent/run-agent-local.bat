@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "FAP_API_URL=http://127.0.0.1:8001/api/v1"
set "PYTHON=python"

if exist "%PROJECT_DIR%\backend\.venv312\Scripts\python.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\.venv312\Scripts\python.exe"
) else if exist "%PROJECT_DIR%\backend\venv\Scripts\python.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\venv\Scripts\python.exe"
)

%PYTHON% "%SCRIPT_DIR%agent.py"
pause
