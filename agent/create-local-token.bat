@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "BACKEND_DIR=%PROJECT_DIR%\backend"
set "PYTHON=python"

if exist "%BACKEND_DIR%\.venv312\Scripts\python.exe" (
    set "PYTHON=%BACKEND_DIR%\.venv312\Scripts\python.exe"
) else if exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    set "PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"
)

pushd "%BACKEND_DIR%"
set "DATABASE_URL=sqlite:///./facebook_bot_test.db"
set "SECRET_KEY=local-test-secret"
set "PYTHONPATH=%BACKEND_DIR%"
"%PYTHON%" "%SCRIPT_DIR%create-local-token.py"
popd

pause
