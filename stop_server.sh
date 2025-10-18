#!/bin/bash
# QMS 서버 중지 스크립트 (Linux)

set -e

echo "======================================="
echo "QMS 서버 중지 (Linux)"
echo "======================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# systemd 서비스 중지
if systemctl is-active --quiet qms-backend; then
    echo "QMS Backend 서비스 중지 중..."
    sudo systemctl stop qms-backend
    echo -e "${GREEN}QMS Backend 서비스가 중지되었습니다.${NC}"
else
    echo -e "${RED}QMS Backend 서비스가 실행 중이지 않습니다.${NC}"
    
    # 수동으로 실행 중인 프로세스 찾기
    echo ""
    echo "수동으로 실행 중인 Uvicorn 프로세스 확인 중..."
    if pgrep -f "uvicorn.*backend.asgi" > /dev/null; then
        echo "Uvicorn 프로세스를 발견했습니다. 종료 중..."
        pkill -f "uvicorn.*backend.asgi"
        echo -e "${GREEN}Uvicorn 프로세스가 종료되었습니다.${NC}"
    else
        echo "실행 중인 Uvicorn 프로세스가 없습니다."
    fi
fi

echo ""
echo "서버가 중지되었습니다."
echo ""

