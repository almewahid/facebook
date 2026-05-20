@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "PYTHON=python"

if exist "%SCRIPT_DIR%.venv\Scripts\python.exe" (
    set "PYTHON=%SCRIPT_DIR%.venv\Scripts\python.exe"
) else if exist "%PROJECT_DIR%\backend\.venv312\Scripts\python.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\.venv312\Scripts\python.exe"
) else if exist "%PROJECT_DIR%\backend\venv\Scripts\python.exe" (
    set "PYTHON=%PROJECT_DIR%\backend\venv\Scripts\python.exe"
)

"%PYTHON%" -m pip show pyinstaller >nul 2>nul
if errorlevel 1 (
    "%PYTHON%" -m pip install pyinstaller
)

pushd "%SCRIPT_DIR%"
"%PYTHON%" -m PyInstaller --noconfirm --onefile --windowed --name AlNasher gui_app.py
if errorlevel 1 (
    popd
    echo.
    echo Build failed.
    pause
    exit /b 1
)

if not exist "%SCRIPT_DIR%release" mkdir "%SCRIPT_DIR%release"
copy /Y "%SCRIPT_DIR%dist\AlNasher.exe" "%SCRIPT_DIR%release\AlNasher.exe" >nul
copy /Y "%SCRIPT_DIR%USER_GUIDE.ar.md" "%SCRIPT_DIR%release\دليل الاستخدام.txt" >nul
popd

echo.
echo AlNasher release is ready inside:
echo %SCRIPT_DIR%release
pause
