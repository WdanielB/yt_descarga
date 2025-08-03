@echo off
echo Starting AD YOUTUBE Backend Server...
cd backend
call .\venv\Scripts\activate.bat
echo Server is running at http://127.0.0.1:8000
echo Press Ctrl+C to stop the server.
uvicorn main:app --reload
