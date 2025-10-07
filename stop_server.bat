@echo off
REM QMS 서버 중지 스크립트

echo =====================================
echo QMS 서버 중지
echo =====================================
echo.

echo Gunicorn, Node.js 프로세스를 종료합니다...
echo.

REM Gunicorn 프로세스 종료 (포트 8000)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    echo Backend 서버 종료 중 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM Next.js 서버 종료 (포트 3000)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo Frontend 서버 종료 중 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo 서버가 중지되었습니다.
echo.
pause

