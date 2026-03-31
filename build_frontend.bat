@echo off
REM Builds the React UI into frontend\dist so Flask can serve it at http://127.0.0.1:7860/
cd /d "%~dp0frontend"
call npm install
call npm run build
echo.
echo Done. Restart: python app.py
echo Without this step, Flask uses templates\index.html (vanilla UI with /static/).
