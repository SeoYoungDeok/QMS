@echo off
chcp 65001 >null
REM QMS 배포 스크립트
REM 초기 배포 및 업데이트 시 사용

echo =====================================
echo QMS 배포 스크립트
echo =====================================
echo.

REM 환경 변수 파일 확인
if not exist .env (
    echo [오류] .env 파일이 없습니다!
    echo.
    echo 1. .env.example을 .env로 복사하세요:
    echo    copy .env.example .env
    echo.
    echo 2. .env 파일을 열어서 다음을 수정하세요:
    echo    - SECRET_KEY
    echo    - ALLOWED_HOSTS
    echo    - FRONTEND_URL
    echo.
    pause
    exit /b 1
)

echo [1/7] Python 의존성 설치 중...
cd backend
call uv sync
if %errorlevel% neq 0 (
    echo [오류] Python 의존성 설치 실패
    pause
    exit /b 1
)
cd ..
echo.

echo [2/7] 데이터베이스 마이그레이션 중...
cd backend
call uv run python manage.py migrate
if %errorlevel% neq 0 (
    echo [오류] 데이터베이스 마이그레이션 실패
    pause
    exit /b 1
)
cd ..
echo.

echo [3/7] SQLite WAL 모드 활성화 중...
cd backend
call uv run python enable_wal.py
if %errorlevel% neq 0 (
    echo [경고] WAL 모드 활성화 실패 (계속 진행)
)
cd ..
echo.

echo [4/7] Static 파일 수집 중...
cd backend
call uv run python manage.py collectstatic --noinput
if %errorlevel% neq 0 (
    echo [오류] Static 파일 수집 실패
    pause
    exit /b 1
)
cd ..
echo.

echo [5/7] 로그 디렉토리 생성 중...
if not exist backend\logs mkdir backend\logs
echo.

echo [6/7] Frontend 의존성 설치 중...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [오류] Frontend 의존성 설치 실패
    pause
    exit /b 1
)
echo.

echo [7/7] Frontend 빌드 중...
call npm run build
if %errorlevel% neq 0 (
    echo [오류] Frontend 빌드 실패
    pause
    exit /b 1
)
cd ..
echo.

echo =====================================
echo 배포 완료!
echo =====================================
echo.
echo 다음 단계:
echo   1. 관리자 계정 생성: create_admin.bat
echo   2. 서버 시작: start_server.bat
echo.
pause

