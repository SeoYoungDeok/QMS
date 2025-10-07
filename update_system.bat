@echo off
REM QMS 시스템 업데이트 스크립트

echo =====================================
echo QMS 시스템 업데이트
echo =====================================
echo.

echo ⚠ 주의: 업데이트 전에 백업을 수행하세요!
echo.
pause

REM 1. Git에서 최신 코드 가져오기
echo [1/2] Git에서 최신 코드 가져오는 중...
git pull
if %errorlevel% neq 0 (
    echo [오류] Git pull 실패
    pause
    exit /b 1
)
echo.

REM 2. 재배포
echo [2/2] 재배포 중...
call deploy.bat

echo.
echo =====================================
echo 업데이트 완료!
echo =====================================
echo.
echo 서버를 시작하려면: start_server.bat
echo.
pause

