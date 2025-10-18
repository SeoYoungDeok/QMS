#!/bin/bash
# QMS 서버 시작 스크립트 (Linux)

set -e

echo "======================================="
echo "QMS 서버 시작 (Linux)"
echo "======================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# systemd 서비스 사용 여부 확인
if systemctl is-active --quiet qms-backend; then
    echo -e "${GREEN}QMS Backend 서비스가 이미 실행 중입니다.${NC}"
    echo ""
    echo "서비스 상태 확인:"
    sudo systemctl status qms-backend --no-pager
else
    if [ -f /etc/systemd/system/qms-backend.service ]; then
        echo "Systemd 서비스로 시작합니다..."
        sudo systemctl start qms-backend
        echo -e "${GREEN}QMS Backend 서비스가 시작되었습니다.${NC}"
        echo ""
        echo "서비스 상태 확인:"
        sudo systemctl status qms-backend --no-pager
        echo ""
        echo "로그 확인: sudo journalctl -u qms-backend -f"
    else
        echo -e "${YELLOW}Systemd 서비스가 설정되어 있지 않습니다.${NC}"
        echo "수동 시작 방법:"
        echo ""
        echo "  cd backend"
        echo "  uv run uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --workers 2"
        echo ""
        echo "또는 Systemd 서비스를 설정하세요:"
        echo "  sudo cp systemd/qms-backend.service /etc/systemd/system/"
        echo "  sudo systemctl daemon-reload"
        echo "  sudo systemctl enable qms-backend"
        echo "  sudo systemctl start qms-backend"
    fi
fi

echo ""
echo "======================================="
echo "서버 접속 정보"
echo "======================================="
echo "Backend API: http://localhost:8000/api"
echo "Django Admin: http://localhost:8000/admin"
echo ""
if systemctl is-active --quiet nginx; then
    echo "Nginx가 실행 중입니다."
    echo "Frontend: http://your-domain.com (Nginx 설정 필요)"
else
    echo -e "${YELLOW}Nginx가 실행되지 않았습니다.${NC}"
    echo "Nginx 시작: sudo systemctl start nginx"
fi
echo ""

