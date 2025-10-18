#!/bin/bash
# QMS 백업 스크립트 (Linux)
# 로컬 백업 생성 및 S3 업로드

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================="
echo "QMS 백업 시작"
echo "======================================="
echo ""

# 프로젝트 루트 디렉토리
PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR="$PROJECT_ROOT/backend"
BACKUP_DIR="$BACKEND_DIR/backups"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# 타임스탬프 생성
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="db_backup_${TIMESTAMP}.sqlite3"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# 데이터베이스 백업
echo -e "${GREEN}[1/4] 데이터베이스 백업 생성${NC}"
if [ -f "$BACKEND_DIR/db.sqlite3" ]; then
    # SQLite 백업 명령 (온라인 백업)
    sqlite3 "$BACKEND_DIR/db.sqlite3" ".backup '$BACKUP_PATH'"
    
    if [ -f "$BACKUP_PATH" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        echo "백업 완료: $BACKUP_FILENAME ($BACKUP_SIZE)"
    else
        echo -e "${RED}백업 생성 실패${NC}"
        exit 1
    fi
else
    echo -e "${RED}데이터베이스 파일을 찾을 수 없습니다: $BACKEND_DIR/db.sqlite3${NC}"
    exit 1
fi
echo ""

# 백업 파일 압축
echo -e "${GREEN}[2/4] 백업 파일 압축${NC}"
COMPRESSED_FILENAME="${BACKUP_FILENAME}.gz"
COMPRESSED_PATH="$BACKUP_DIR/$COMPRESSED_FILENAME"
gzip -c "$BACKUP_PATH" > "$COMPRESSED_PATH"
COMPRESSED_SIZE=$(du -h "$COMPRESSED_PATH" | cut -f1)
echo "압축 완료: $COMPRESSED_FILENAME ($COMPRESSED_SIZE)"
echo ""

# S3 업로드 (환경변수가 설정된 경우)
echo -e "${GREEN}[3/4] S3 업로드 확인${NC}"
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
    
    if [ -n "$AWS_S3_BACKUP_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        echo "S3 버킷으로 업로드 중: $AWS_S3_BACKUP_BUCKET"
        
        # Python을 사용한 S3 업로드
        cd "$BACKEND_DIR"
        uv run python -c "
from backup_management.s3_backup import upload_to_s3
import sys

success = upload_to_s3('$COMPRESSED_PATH', '$COMPRESSED_FILENAME')
sys.exit(0 if success else 1)
        "
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}S3 업로드 완료${NC}"
        else
            echo -e "${YELLOW}[경고] S3 업로드 실패 (로컬 백업은 완료됨)${NC}"
        fi
    else
        echo -e "${YELLOW}S3 설정이 없습니다. 로컬 백업만 생성됩니다.${NC}"
        echo "S3 백업을 활성화하려면 .env 파일에 다음을 설정하세요:"
        echo "  AWS_S3_BACKUP_BUCKET=your-bucket-name"
        echo "  AWS_ACCESS_KEY_ID=your-access-key"
        echo "  AWS_SECRET_ACCESS_KEY=your-secret-key"
        echo "  AWS_DEFAULT_REGION=ap-northeast-2"
    fi
else
    echo -e "${YELLOW}.env 파일이 없습니다. 로컬 백업만 생성됩니다.${NC}"
fi
echo ""

# 오래된 백업 파일 정리 (7일 이상 된 파일 삭제)
echo -e "${GREEN}[4/4] 오래된 백업 파일 정리${NC}"
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "db_backup_*.sqlite3*" -type f -mtime +7 2>/dev/null || true)
if [ -n "$OLD_BACKUPS" ]; then
    echo "7일 이상 된 백업 파일 삭제 중..."
    echo "$OLD_BACKUPS" | while read -r file; do
        echo "  삭제: $(basename "$file")"
        rm -f "$file"
    done
    echo "정리 완료"
else
    echo "정리할 오래된 백업 파일이 없습니다."
fi
echo ""

echo "======================================="
echo -e "${GREEN}백업 완료!${NC}"
echo "======================================="
echo "백업 위치: $BACKUP_DIR"
echo "  - 원본: $BACKUP_FILENAME"
echo "  - 압축: $COMPRESSED_FILENAME"
echo ""
echo "복원 방법:"
echo "  1. 서버 중지: ./stop_server.sh"
echo "  2. 백업 복원: gunzip -c $COMPRESSED_PATH > $BACKEND_DIR/db.sqlite3"
echo "  3. 서버 시작: ./start_server.sh"
echo ""

