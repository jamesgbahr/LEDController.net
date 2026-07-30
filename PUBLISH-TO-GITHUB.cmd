@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLISH-TO-GITHUB.ps1"
if errorlevel 1 (
  echo.
  echo Publishing failed. Review the message above.
  pause
  exit /b 1
)
echo.
pause
