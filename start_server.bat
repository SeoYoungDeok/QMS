@echo off
REM QMS 서버 시작 스크립트 (프로덕션 모드)

echo =====================================
echo QMS 서버 시작
echo =====================================
echo.

REM 환경 변수 파일 확인
if not exist .env (
    echo [오류] .env 파일이 없습니다!
    echo deploy.bat를 먼저 실행하세요.
    pause
    exit /b 1
)

echo Uvicorn Backend와 Next.js Frontend를 시작합니다...
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo 서버를 중지하려면 stop_server.bat를 실행하세요.
echo.

REM Uvicorn 백엔드 시작 (ASGI)
start "QMS Backend" cmd /k "cd backend && uv run uvicorn backend.asgi:application --host 127.0.0.1 --port 8000 --workers 4 --log-level info"

REM 백엔드가 시작될 때까지 대기
timeout /t 5 /nobreak > nul

REM Next.js 프론트엔드 시작 (프로덕션 모드)
start "QMS Frontend" cmd /k "cd frontend && npm start"

echo.
echo 서버가 시작되었습니다!
echo.
echo 참고: Uvicorn은 Windows에서도 완벽하게 작동합니다.
echo.
pause

