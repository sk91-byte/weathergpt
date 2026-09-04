@echo off
setlocal
set "PROJECT=%~dp0"

if not exist "%PROJECT%venv\Scripts\python.exe" (
  echo WeatherGPT Python environment was not found.
  echo Please ask Codex to repair the installation.
  pause
  exit /b 1
)

start "WeatherGPT Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%PROJECT%'; & '%PROJECT%venv\Scripts\python.exe' -m uvicorn backend.main:app --reload"

if exist "C:\src\flutter\bin\flutter.bat" (
  start "WeatherGPT Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%PROJECT%mobile'; & 'C:\src\flutter\bin\flutter.bat' run -d chrome --web-port 5000"
) else (
  start "WeatherGPT Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%PROJECT%mobile'; flutter run -d chrome --web-port 5000"
)

timeout /t 8 /nobreak >nul
start "" "http://localhost:5000"
endlocal
