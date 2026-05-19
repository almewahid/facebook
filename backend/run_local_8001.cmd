@echo off
set "BACKEND_DIR=%~dp0"
for %%I in ("%BACKEND_DIR%..") do set "PROJECT_DIR=%%~fI"
set PYTHONIOENCODING=utf-8
set PYTHONPATH=%BACKEND_DIR%
set DATABASE_URL=sqlite:///./facebook_bot_test.db
if exist "%BACKEND_DIR%\.venv312\Scripts\python.exe" (
  "%BACKEND_DIR%\.venv312\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8001
) else (
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
)
