#!/bin/bash
# QMS 배포 스크립트 (Ubuntu/Linux)
# AWS Lightsail Ubuntu 24.04용

set -e  # 에러 발생 시 스크립트 중단

echo "======================================="
echo "QMS 배포 스크립트 (Linux)"
echo "======================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 현재 디렉토리 확인
PROJECT_ROOT=$(pwd)

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    echo -e "${RED}[오류] .env 파일이 없습니다!${NC}"
    echo ""
    echo "1. .env.production.example을 .env로 복사하세요:"
    echo "   cp .env.production.example .env"
    echo ""
    echo "2. .env 파일을 열어서 다음을 수정하세요:"
    echo "   - SECRET_KEY (필수)"
    echo "   - ALLOWED_HOSTS (도메인 또는 IP)"
    echo "   - FRONTEND_URL (도메인 또는 IP)"
    echo "   - AWS S3 설정 (선택)"
    echo ""
    exit 1
fi

# Python 버전 확인
echo -e "${GREEN}[1/12] Python 버전 확인${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3가 설치되어 있지 않습니다.${NC}"
    echo "설치: sudo apt update && sudo apt install -y python3 python3-pip python3-venv"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "Python: $PYTHON_VERSION"
echo ""

# uv 설치 확인 및 설치
echo -e "${GREEN}[2/12] uv 패키지 매니저 확인${NC}"
if ! command -v uv &> /dev/null; then
    echo "uv가 설치되어 있지 않습니다. 설치 중..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
fi
echo "uv: $(uv --version)"
echo ""

# Node.js 설치 확인
echo -e "${GREEN}[3/12] Node.js 확인${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js가 설치되어 있지 않습니다. 설치 중...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "Node.js: $NODE_VERSION"
echo "npm: $NPM_VERSION"
echo ""

# Backend 의존성 설치
echo -e "${GREEN}[4/12] Backend Python 의존성 설치${NC}"
cd "$PROJECT_ROOT/backend"
uv sync
echo ""

# 데이터베이스 마이그레이션
echo -e "${GREEN}[5/12] 데이터베이스 마이그레이션${NC}"
uv run python manage.py migrate
echo ""

# SQLite WAL 모드 활성화
echo -e "${GREEN}[6/12] SQLite WAL 모드 활성화${NC}"
if uv run python enable_wal.py; then
    echo "WAL 모드 활성화 완료"
else
    echo -e "${YELLOW}[경고] WAL 모드 활성화 실패 (계속 진행)${NC}"
fi
echo ""

# Static 파일 수집
echo -e "${GREEN}[7/12] Django Static 파일 수집${NC}"
uv run python manage.py collectstatic --noinput
echo ""

# 로그 디렉토리 생성
echo -e "${GREEN}[8/12] 로그 디렉토리 생성${NC}"
mkdir -p logs
chmod 755 logs
echo ""

# 백업 디렉토리 생성
echo -e "${GREEN}[9/12] 백업 디렉토리 생성${NC}"
mkdir -p backups
chmod 755 backups
cd "$PROJECT_ROOT"
echo ""

# Frontend 의존성 설치
echo -e "${GREEN}[10/12] Frontend 의존성 설치${NC}"
cd "$PROJECT_ROOT/frontend"
npm install
echo ""

# Frontend 빌드 (Static Export)
echo -e "${GREEN}[11/12] Frontend 빌드 (Static Export)${NC}"
npm run build
if [ -d "out" ]; then
    echo "Static export 완료: frontend/out/"
else
    echo -e "${RED}[오류] Static export 실패${NC}"
    exit 1
fi
cd "$PROJECT_ROOT"
echo ""

# 실행 권한 부여
echo -e "${GREEN}[12/12] 스크립트 실행 권한 설정${NC}"
chmod +x deploy.sh
chmod +x start_server.sh 2>/dev/null || true
chmod +x stop_server.sh 2>/dev/null || true
chmod +x backup.sh 2>/dev/null || true
echo ""

echo "======================================="
echo -e "${GREEN}배포 완료!${NC}"
echo "======================================="
echo ""
echo "다음 단계:"
echo "  1. 관리자 계정 생성:"
echo "     cd backend && uv run python create_admin.py"
echo ""
echo "  2. Nginx 설정 (관리자 권한 필요):"
echo "     sudo cp nginx/qms.conf /etc/nginx/sites-available/qms"
echo "     sudo ln -s /etc/nginx/sites-available/qms /etc/nginx/sites-enabled/"
echo "     sudo nginx -t"
echo "     sudo systemctl reload nginx"
echo ""
echo "  3. Systemd 서비스 등록 (관리자 권한 필요):"
echo "     sudo cp systemd/qms-backend.service /etc/systemd/system/"
echo "     sudo systemctl daemon-reload"
echo "     sudo systemctl enable qms-backend"
echo "     sudo systemctl start qms-backend"
echo ""
echo "  4. SSL 인증서 설정 (Let's Encrypt):"
echo "     sudo apt install -y certbot python3-certbot-nginx"
echo "     sudo certbot --nginx -d your-domain.com"
echo ""
echo "자세한 내용은 LIGHTSAIL_DEPLOY.md를 참조하세요."
echo ""

