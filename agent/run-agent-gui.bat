@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "PYTHON=python"

if exist "%SCRIPT_DIR%.venv\Scripts\pythonw.exe" (
    set "PYTHON=%SCRIPT_DIR%.venv\Scripts\pythonw.exe"
) else if exist "%SCRIPT_DIR%.venv\Scripts\python.exe" (
    set "PYTHON=%SCRIPT_DIR%.venv\Scripts\python.exe"
) else if exist "%PROJECT_DIR%\backend\.venv312\Scripts\pythonw.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\.venv312\Scripts\pythonw.exe"
) else if exist "%PROJECT_DIR%\backend\venv\Scripts\pythonw.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\venv\Scripts\pythonw.exe"
) else if exist "%PROJECT_DIR%\backend\.venv312\Scripts\python.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\.venv312\Scripts\python.exe"
) else if exist "%PROJECT_DIR%\backend\venv\Scripts\python.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\venv\Scripts\python.exe"
)

start "" "%PYTHON%" "%SCRIPT_DIR%gui_app.py"
