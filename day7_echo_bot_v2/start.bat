@echo off
echo Starting Day 6 Echo Bot Server...
echo.

REM Check if virtual environment exists
if not exist "..\venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found!
    echo Please make sure you have created the virtual environment.
    pause
    exit /b 1
)

REM Activate virtual environment and start server
call "..\venv\Scripts\activate.bat"
echo Virtual environment activated.
echo.

echo Installing requirements...
pip install -r requirements.txt
echo.

echo Starting server...
echo Application will be available at: http://localhost:8003
echo Press Ctrl+C to stop the server
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8003

pause
