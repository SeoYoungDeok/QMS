@echo off
chcp 65001 >nul
REM QMS 로컬 빌드 및 프로덕션 배포 스크립트 (Windows용)
REM
REM 사용법:
REM   deploy_to_production.bat <server-ip> <ssh-key-path>
REM
REM 예시:
REM   deploy_to_production.bat 54.180.123.45 C:\keys\lightsail-key.pem
REM   deploy_to_production.bat komex-qc.co.kr %USERPROFILE%\.ssh\my-key.pem

echo =======================================
echo QMS 프로덕션 배포 (Windows)
echo =======================================
echo.

REM 인자 확인
if "%~1"=="" (
    echo [오류] 서버 IP가 필요합니다.
    echo.
    echo 사용법: %0 ^<server-ip^> ^<ssh-key-path^>
    echo.
    echo 예시:
    echo   %0 54.180.123.45 C:\keys\lightsail-key.pem
    echo.
    pause
    exit /b 1
)

if "%~2"=="" (
    echo [오류] SSH 키 경로가 필요합니다.
    echo.
    echo 사용법: %0 ^<server-ip^> ^<ssh-key-path^>
    echo.
    pause
    exit /b 1
)

set SERVER=%~1
set SSH_KEY=%~2
set SERVER_USER=ubuntu

REM SSH 키 확인
if not exist "%SSH_KEY%" (
    echo [오류] SSH 키 파일을 찾을 수 없습니다: %SSH_KEY%
    pause
    exit /b 1
)

REM Git 상태 확인
echo [1/6] Git 상태 확인
git status --short
if errorlevel 1 (
    echo [경고] Git 저장소가 아닙니다.
) else (
    echo Git 상태 확인 완료
)
echo.

REM Frontend 빌드
echo [2/6] Frontend 빌드
cd frontend

REM 기존 빌드 삭제
if exist "out" (
    echo 기존 빌드 삭제 중...
    rmdir /s /q out
)
if exist ".next" (
    rmdir /s /q .next
)

REM 의존성 확인
if not exist "node_modules" (
    echo node_modules가 없습니다. 설치 중...
    call npm install
)

REM 빌드
echo Next.js Static Export 빌드 중...
call npm run build
if errorlevel 1 (
    echo [오류] 빌드 실패
    cd ..
    pause
    exit /b 1
)

echo ✓ 빌드 완료
cd ..
echo.

REM Git Push
echo [3/6] Git Push
choice /C YN /M "Git push를 실행하시겠습니까?"
if errorlevel 2 (
    echo Git push를 건너뜁니다.
) else (
    git push
    echo ✓ Git push 완료
)
echo.

REM Frontend 업로드
echo [4/6] Frontend 파일 업로드
echo 서버: %SERVER_USER%@%SERVER%
echo 업로드 중...

scp -i "%SSH_KEY%" -r frontend\out %SERVER_USER%@%SERVER%:~/QMS/frontend/
if errorlevel 1 (
    echo [오류] 업로드 실패
    pause
    exit /b 1
)
echo ✓ Frontend 업로드 완료

REM 업로드 후 권한 자동 수정
echo 권한 설정 중...
ssh -i "%SSH_KEY%" %SERVER_USER%@%SERVER% "chmod -R 755 ~/QMS/frontend/out"
if errorlevel 1 (
    echo [경고] 권한 설정 실패 (계속 진행)
) else (
    echo ✓ 권한 설정 완료
)
echo.

REM 서버에서 Git Pull
echo [5/6] 서버에서 Git Pull
ssh -i "%SSH_KEY%" %SERVER_USER%@%SERVER% "cd ~/QMS && git pull"
if errorlevel 1 (
    echo [오류] Git pull 실패
    pause
    exit /b 1
)
echo ✓ Git pull 완료
echo.

REM 프로덕션 업데이트 스크립트 실행
echo [6/6] 프로덕션 업데이트 실행
echo.
ssh -i "%SSH_KEY%" -t %SERVER_USER%@%SERVER% "cd ~/QMS && chmod +x update_production.sh && ./update_production.sh"
if errorlevel 1 (
    echo [오류] 프로덕션 업데이트 실패
    pause
    exit /b 1
)

echo.
echo =======================================
echo ✓ 배포 완료!
echo =======================================
echo.
echo 브라우저에서 확인:
echo   https://%SERVER%
echo.
echo 서버 로그 확인:
echo   ssh -i "%SSH_KEY%" %SERVER_USER%@%SERVER%
echo   sudo journalctl -u qms-backend -f
echo.
pause

