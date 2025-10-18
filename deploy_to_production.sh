#!/bin/bash
# QMS 로컬 빌드 및 프로덕션 배포 스크립트 (로컬 PC용)
#
# 사용법:
#   ./deploy_to_production.sh <server-ip> <ssh-key-path>
#
# 예시:
#   ./deploy_to_production.sh 54.180.123.45 ~/.ssh/lightsail-key.pem
#   ./deploy_to_production.sh komex-qc.co.kr ~/keys/my-key.pem

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "======================================="
echo -e "${BLUE}QMS 프로덕션 배포${NC}"
echo "======================================="
echo ""

# 인자 확인
if [ $# -lt 2 ]; then
    echo -e "${RED}사용법: $0 <server-ip> <ssh-key-path>${NC}"
    echo ""
    echo "예시:"
    echo "  $0 54.180.123.45 ~/.ssh/lightsail-key.pem"
    echo "  $0 komex-qc.co.kr ~/keys/my-key.pem"
    echo ""
    exit 1
fi

SERVER=$1
SSH_KEY=$2
SERVER_USER=${3:-ubuntu}

# SSH 키 확인
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

# Git 상태 확인
echo -e "${GREEN}[1/6] Git 상태 확인${NC}"
if [ -d ".git" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}커밋되지 않은 변경사항이 있습니다:${NC}"
        git status --short
        echo ""
        read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo "✓ Git 상태 깨끗함"
    fi
    
    CURRENT_BRANCH=$(git branch --show-current)
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    echo "브랜치: $CURRENT_BRANCH"
    echo "커밋: $CURRENT_COMMIT"
else
    echo -e "${YELLOW}Git 저장소가 아닙니다.${NC}"
fi
echo ""

# Frontend 빌드
echo -e "${GREEN}[2/6] Frontend 빌드${NC}"
cd frontend

# 기존 빌드 삭제
if [ -d "out" ]; then
    echo "기존 빌드 삭제 중..."
    rm -rf out
fi

if [ -d ".next" ]; then
    rm -rf .next
fi

# 의존성 확인
if [ ! -d "node_modules" ]; then
    echo "node_modules가 없습니다. 설치 중..."
    npm install
fi

# 빌드
echo "Next.js Static Export 빌드 중..."
if npm run build; then
    FILE_COUNT=$(find out -type f 2>/dev/null | wc -l)
    BUILD_SIZE=$(du -sh out 2>/dev/null | cut -f1)
    echo -e "${GREEN}✓ 빌드 완료${NC}"
    echo "  파일 수: $FILE_COUNT"
    echo "  용량: $BUILD_SIZE"
else
    echo -e "${RED}✗ 빌드 실패${NC}"
    exit 1
fi

cd "$SCRIPT_DIR"
echo ""

# Git Push
echo -e "${GREEN}[3/6] Git Push${NC}"
if [ -d ".git" ]; then
    read -p "Git push를 실행하시겠습니까? (Y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Git push를 건너뜁니다."
    else
        git push
        echo "✓ Git push 완료"
    fi
else
    echo "Git 저장소가 아닙니다. 건너뜁니다."
fi
echo ""

# Frontend 업로드
echo -e "${GREEN}[4/6] Frontend 파일 업로드${NC}"
echo "서버: $SERVER_USER@$SERVER"
echo "업로드 중..."

if scp -i "$SSH_KEY" -r frontend/out "$SERVER_USER@$SERVER:~/QMS/frontend/"; then
    echo -e "${GREEN}✓ Frontend 업로드 완료${NC}"
    
    # 업로드 후 권한 자동 수정
    echo "권한 설정 중..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER" << 'ENDSSH'
chmod -R 755 ~/QMS/frontend/out
ENDSSH
    echo "✓ 권한 설정 완료"
else
    echo -e "${RED}✗ 업로드 실패${NC}"
    exit 1
fi
echo ""

# 서버에서 Git Pull
echo -e "${GREEN}[5/6] 서버에서 Git Pull${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER" << 'ENDSSH'
cd ~/QMS
git pull
ENDSSH
echo "✓ Git pull 완료"
echo ""

# 프로덕션 업데이트 스크립트 실행
echo -e "${GREEN}[6/6] 프로덕션 업데이트 실행${NC}"
echo ""
ssh -i "$SSH_KEY" -t "$SERVER_USER@$SERVER" << 'ENDSSH'
cd ~/QMS
if [ -f "update_production.sh" ]; then
    chmod +x update_production.sh
    ./update_production.sh
else
    echo "update_production.sh 파일을 찾을 수 없습니다!"
    exit 1
fi
ENDSSH

echo ""
echo "======================================="
echo -e "${GREEN}✓ 배포 완료!${NC}"
echo "======================================="
echo ""
echo "브라우저에서 확인:"
echo "  https://$SERVER"
echo ""
echo "서버 로그 확인:"
echo "  ssh -i $SSH_KEY $SERVER_USER@$SERVER"
echo "  sudo journalctl -u qms-backend -f"
echo ""

