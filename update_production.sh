#!/bin/bash
# QMS 프로덕션 업데이트 스크립트 (Ubuntu 서버용)
# 
# 사용법:
#   ./update_production.sh
#
# 이 스크립트는:
# 1. Git pull로 최신 코드 가져오기
# 2. Nginx 설정 업데이트
# 3. Backend 의존성 업데이트
# 4. DB 마이그레이션
# 5. Static 파일 수집
# 6. 서비스 재시작

set -e  # 에러 발생 시 중단

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$HOME/QMS"

echo "======================================="
echo -e "${BLUE}QMS 프로덕션 업데이트${NC}"
echo "======================================="
echo ""

# 프로젝트 디렉토리로 이동
cd "$PROJECT_ROOT"

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}현재 브랜치: $CURRENT_BRANCH${NC}"
echo ""

# 1. Git Pull
echo -e "${GREEN}[1/9] Git 코드 업데이트${NC}"
git pull origin "$CURRENT_BRANCH"
echo ""

# 2. Frontend 파일 확인 및 권한 수정
echo -e "${GREEN}[2/9] Frontend 빌드 파일 확인 및 권한 설정${NC}"
if [ -d "frontend/out" ]; then
    FILE_COUNT=$(find frontend/out -type f | wc -l)
    echo "✓ Frontend 빌드 파일 존재 ($FILE_COUNT files)"
    
    # 권한 자동 수정 (SCP 업로드 후 발생할 수 있는 권한 문제 해결)
    echo "권한 확인 및 수정 중..."
    chmod -R 755 frontend/out 2>/dev/null || true
    echo "✓ 권한 설정 완료"
else
    echo -e "${RED}✗ Frontend 빌드 파일이 없습니다!${NC}"
    echo "로컬 PC에서 먼저 빌드 후 업로드하세요:"
    echo "  cd frontend && npm run build"
    echo "  scp -r out ubuntu@server:/home/ubuntu/QMS/frontend/"
    exit 1
fi
echo ""

# 3. Nginx 설정 백업
echo -e "${GREEN}[3/9] Nginx 설정 백업${NC}"
BACKUP_FILE="/etc/nginx/sites-available/qms.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp /etc/nginx/sites-available/qms "$BACKUP_FILE"
echo "백업 완료: $BACKUP_FILE"
echo ""

# 4. Nginx 설정 업데이트
echo -e "${GREEN}[4/9] Nginx 설정 업데이트${NC}"

# HTTPS 블록이 있는지 확인
if sudo grep -q "listen 443 ssl" /etc/nginx/sites-available/qms; then
    echo "HTTPS 설정이 이미 존재합니다. HTTPS 블록의 location / 수정 중..."
    
    # HTTPS 블록의 try_files 라인을 찾아서 수정
    sudo sed -i '/listen 443 ssl/,/^}/ {
        s|try_files \$uri \$uri\.html \$uri/ =404;|try_files $uri $uri.html $uri/index.html /index.html;|g
    }' /etc/nginx/sites-available/qms
    
    echo "✓ HTTPS 블록 업데이트 완료"
else
    echo "HTTPS 설정이 없습니다. 프로젝트 설정 파일로 교체..."
    
    # 도메인 이름 추출 (기존 설정에서)
    DOMAIN=$(sudo grep -m 1 "server_name" /etc/nginx/sites-available/qms | awk '{print $2}' | sed 's/;$//')
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
        echo -e "${YELLOW}도메인 이름을 입력하세요 (예: komex-qc.co.kr):${NC}"
        read -r DOMAIN
    fi
    
    # 프로젝트 설정 복사 및 도메인 변경
    sudo cp nginx/qms.conf /etc/nginx/sites-available/qms
    sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/qms
    
    echo "✓ Nginx 설정 파일 교체 완료"
fi
echo ""

# 5. Nginx 설정 테스트
echo -e "${GREEN}[5/9] Nginx 설정 테스트${NC}"
if sudo nginx -t; then
    echo "✓ Nginx 설정 문법 검증 성공"
else
    echo -e "${RED}✗ Nginx 설정 오류!${NC}"
    echo "백업 복원 중..."
    sudo cp "$BACKUP_FILE" /etc/nginx/sites-available/qms
    echo "백업이 복원되었습니다. 로그를 확인하세요."
    exit 1
fi
echo ""

# 6. Backend 의존성 업데이트
echo -e "${GREEN}[6/9] Backend 의존성 업데이트${NC}"
cd "$PROJECT_ROOT/backend"
if [ -f "pyproject.toml" ]; then
    uv sync
    echo "✓ Python 의존성 업데이트 완료"
else
    echo -e "${YELLOW}pyproject.toml을 찾을 수 없습니다. 건너뜁니다.${NC}"
fi
cd "$PROJECT_ROOT"
echo ""

# 7. 데이터베이스 마이그레이션
echo -e "${GREEN}[7/9] 데이터베이스 마이그레이션${NC}"
cd "$PROJECT_ROOT/backend"
if uv run python manage.py migrate --check; then
    uv run python manage.py migrate
    echo "✓ 마이그레이션 완료"
else
    echo -e "${YELLOW}마이그레이션이 필요하지 않거나 오류가 발생했습니다.${NC}"
fi
cd "$PROJECT_ROOT"
echo ""

# 8. Static 파일 수집
echo -e "${GREEN}[8/9] Django Static 파일 수집${NC}"
cd "$PROJECT_ROOT/backend"
uv run python manage.py collectstatic --noinput
echo "✓ Static 파일 수집 완료"
cd "$PROJECT_ROOT"
echo ""

# 9. 서비스 재시작
echo -e "${GREEN}[9/9] 서비스 재시작${NC}"

# Backend 재시작
if systemctl is-active --quiet qms-backend; then
    echo "Backend 서비스 재시작 중..."
    sudo systemctl restart qms-backend
    sleep 2
    
    if systemctl is-active --quiet qms-backend; then
        echo "✓ Backend 서비스 재시작 완료"
    else
        echo -e "${RED}✗ Backend 서비스 시작 실패!${NC}"
        echo "로그 확인: sudo journalctl -u qms-backend -n 50"
        exit 1
    fi
else
    echo -e "${YELLOW}Backend 서비스가 실행 중이 아닙니다. 시작 중...${NC}"
    sudo systemctl start qms-backend
fi

# Nginx 재시작
echo "Nginx 재시작 중..."
sudo systemctl reload nginx

if systemctl is-active --quiet nginx; then
    echo "✓ Nginx 재시작 완료"
else
    echo -e "${RED}✗ Nginx 시작 실패!${NC}"
    exit 1
fi

echo ""
echo "======================================="
echo -e "${GREEN}✓ 업데이트 완료!${NC}"
echo "======================================="
echo ""

# 서비스 상태 확인
echo "서비스 상태:"
echo "  Backend: $(systemctl is-active qms-backend)"
echo "  Nginx:   $(systemctl is-active nginx)"
echo ""

# 백업 파일 위치 안내
echo "Nginx 설정 백업: $BACKUP_FILE"
echo ""

# 최근 커밋 정보
echo "최근 커밋:"
git log -1 --oneline
echo ""

echo -e "${BLUE}배포된 URL: https://$(sudo grep -m 1 'server_name' /etc/nginx/sites-available/qms | awk '{print $2}' | sed 's/;$//')${NC}"
echo ""

