@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%copy-fixed-files-to-original.ps1"
set "TARGET_DIR=D:\work\2 unziptoastudio\facebook-auto-poster"

echo ================================================
echo Copy fixed files to original project
echo ================================================
echo.
echo Source:
echo %SCRIPT_DIR%
echo.
echo Target:
echo %TARGET_DIR%
echo.

if not exist "%PS_SCRIPT%" (
    echo ERROR: PowerShell script was not found:
    echo %PS_SCRIPT%
    echo.
    echo Make sure you run copy-fixed-files-to-original.bat from the Codex fixed project folder.
    pause
    exit /b 1
)

if not exist "%TARGET_DIR%" (
    echo ERROR: Target project folder was not found:
    echo %TARGET_DIR%
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

echo.
echo ================================================
echo Finished. Review the messages above.
echo ================================================
pause
