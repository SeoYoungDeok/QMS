@echo off
REM QMS 데이터 백업 스크립트

echo =====================================
echo QMS 데이터 백업
echo =====================================
echo.

REM 백업 디렉토리 생성
set BACKUP_DIR=backups\%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
if not exist backups mkdir backups
mkdir "%BACKUP_DIR%"

echo 백업 디렉토리: %BACKUP_DIR%
echo.

REM 데이터베이스 백업
echo [1/3] 데이터베이스 백업 중...
if exist backend\db.sqlite3 (
    copy backend\db.sqlite3 "%BACKUP_DIR%\db.sqlite3"
    echo 데이터베이스 백업 완료
) else (
    echo [경고] 데이터베이스 파일을 찾을 수 없습니다.
)
echo.

REM 환경 설정 파일 백업
echo [2/3] 환경 설정 파일 백업 중...
if exist .env (
    copy .env "%BACKUP_DIR%\.env"
    echo 환경 설정 파일 백업 완료
) else (
    echo [경고] .env 파일을 찾을 수 없습니다.
)
echo.

REM 미디어 파일 백업 (있는 경우)
echo [3/3] 미디어 파일 백업 중...
if exist backend\media (
    xcopy /E /I /Y backend\media "%BACKUP_DIR%\media"
    echo 미디어 파일 백업 완료
) else (
    echo [정보] 미디어 파일이 없습니다.
)
echo.

echo =====================================
echo 백업 완료!
echo 백업 위치: %BACKUP_DIR%
echo =====================================
echo.
pause

