@echo off
title AutoML Platform Runner
echo ==========================================
echo    AutoML Platform is starting...
echo ==========================================

:: 1. Start the Backend in a new window
echo Starting Backend API (Port 8000)...
start "AutoML Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak > nul

:: 2. Start the Frontend Server in a new window
echo Starting Frontend Server (Port 5500)...
start "AutoML Frontend" cmd /k "python -m http.server 5500 --directory frontend"

:: 3. Open the browser
echo Opening browser...
start http://127.0.0.1:5500

echo.
echo ==========================================
echo    Platform is now running!
echo    Frontend: http://127.0.0.1:5500
echo    Backend:  http://127.0.0.1:8000
echo ==========================================
echo If the browser didn't open, copy and paste:
echo http://127.0.0.1:5500
echo ==========================================
echo Close the other windows to stop the servers.
pause
