@echo off
chcp 65001 >null
REM QMS 관리자 계정 생성 스크립트

echo =====================================
echo QMS 관리자 계정 생성
echo =====================================
echo.

cd backend
call uv run python create_admin.py
if %errorlevel% neq 0 (
    echo [오류] 관리자 계정 생성 실패
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ✓ 관리자 계정이 생성되었습니다.
echo.
pause

