#!/bin/bash
# Frontend 빌드 및 업로드 헬퍼 스크립트 (로컬 PC용)
# 
# 사용법:
#   ./deploy_frontend.sh your-server-ip your-key.pem

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================="
echo "Frontend 빌드 및 배포"
echo "======================================="
echo ""

# 인자 확인
if [ $# -lt 2 ]; then
    echo -e "${RED}사용법: $0 <server-ip> <ssh-key-path>${NC}"
    echo ""
    echo "예시:"
    echo "  $0 123.456.789.0 ~/.ssh/lightsail-key.pem"
    echo "  $0 your-domain.com ~/keys/my-key.pem"
    echo ""
    exit 1
fi

SERVER_IP=$1
SSH_KEY=$2
SERVER_USER=${3:-ubuntu}  # 기본값: ubuntu

# SSH 키 확인
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    exit 1
fi

# Frontend 디렉토리 확인
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Frontend 디렉토리를 찾을 수 없습니다: $FRONTEND_DIR${NC}"
    exit 1
fi

cd "$FRONTEND_DIR"

# 1. 의존성 설치
echo -e "${GREEN}[1/3] 의존성 확인${NC}"
if [ ! -d "node_modules" ]; then
    echo "node_modules가 없습니다. 설치 중..."
    npm install
else
    echo "✓ node_modules 존재"
fi
echo ""

# 2. 빌드
echo -e "${GREEN}[2/3] Frontend 빌드${NC}"
echo "Next.js Static Export 빌드 중..."

# 기존 빌드 삭제
if [ -d "out" ]; then
    echo "기존 빌드 파일 삭제 중..."
    rm -rf out
fi

if npm run build; then
    echo -e "${GREEN}✓ 빌드 완료${NC}"
    
    # 빌드 결과 확인
    FILE_COUNT=$(find out -type f | wc -l)
    BUILD_SIZE=$(du -sh out | cut -f1)
    echo "  파일 수: $FILE_COUNT"
    echo "  용량: $BUILD_SIZE"
else
    echo -e "${RED}빌드 실패${NC}"
    exit 1
fi
echo ""

# 3. 서버로 전송
echo -e "${GREEN}[3/3] 서버로 전송${NC}"
echo "서버: $SERVER_USER@$SERVER_IP"
echo "전송 중..."

if scp -i "$SSH_KEY" -r out "$SERVER_USER@$SERVER_IP:~/QMS/frontend/"; then
    echo -e "${GREEN}✓ 전송 완료${NC}"
else
    echo -e "${RED}전송 실패${NC}"
    exit 1
fi
echo ""

# 4. Nginx 재시작
echo "Nginx 재시작 중..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "sudo systemctl reload nginx"; then
    echo -e "${GREEN}✓ Nginx 재시작 완료${NC}"
else
    echo -e "${YELLOW}[경고] Nginx 재시작 실패 (수동으로 재시작하세요)${NC}"
fi
echo ""

echo "======================================="
echo -e "${GREEN}배포 완료!${NC}"
echo "======================================="
echo ""
echo "Frontend 접속: https://$SERVER_IP"
echo ""
echo "확인 사항:"
echo "  - 브라우저에서 페이지 새로고침 (Ctrl+F5)"
echo "  - 캐시 클리어 후 재접속"
echo ""

