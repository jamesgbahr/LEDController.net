@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PORT=8087"
set "VERSION=0.4.36"
set "RUNNING_VERSION="

echo.
echo LEDController Pixel Workspace v%VERSION%
echo Project folder: %CD%
echo Web address:    http://localhost:%PORT%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 20 or newer is required.
  echo Download it from nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist "%CD%\public\index.html" (
  echo ERROR: Missing "%CD%\public\index.html"
  echo Extract the entire ZIP before launching.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; try { (Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/api/status' -TimeoutSec 1).version } catch { '' }"`) do set "RUNNING_VERSION=%%V"

if defined RUNNING_VERSION (
  if "%RUNNING_VERSION%"=="%VERSION%" (
    echo LEDController v%VERSION% is already running.
    start "" http://localhost:%PORT%
    exit /b 0
  )
  echo ERROR: LEDController renderer v%RUNNING_VERSION% is still running on port %PORT%.
  echo The new web files can load while the old renderer remains in memory,
  echo which causes Deck B to appear onscreen but not reach the LEDs.
  echo.
  echo Close the older LEDController command window, then run this launcher again.
  pause
  exit /b 2
)

node server.mjs --open

echo.
echo The server stopped.
pause
