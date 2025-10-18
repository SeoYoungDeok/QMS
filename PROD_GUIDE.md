# QMS 운영 환경 배포 가이드

이 가이드는 Windows PC 및 Linux 서버 환경에서 QMS를 프로덕션으로 배포하는 방법을 설명합니다.

> **클라우드 배포 안내**: AWS Lightsail Ubuntu 24.04 배포는 [LIGHTSAIL_DEPLOY.md](LIGHTSAIL_DEPLOY.md)를 참조하세요.

---

## 환경별 가이드

- **Windows PC 배포**: 이 문서
- **AWS Lightsail (Ubuntu)**: [LIGHTSAIL_DEPLOY.md](LIGHTSAIL_DEPLOY.md)
- **개발 환경**: [DEV_GUIDE.md](DEV_GUIDE.md)

---

## 1. 시스템 요구사항

### 플랫폼별 요구사항

#### Windows PC
- Windows 10/11 (64비트)
- Python 3.13+
- Node.js 20.x+
- uv 패키지 매니저

#### Linux (Ubuntu/Debian)
- Ubuntu 24.04 LTS 또는 Debian 12+
- Python 3.13+
- Node.js 20.x+
- uv 패키지 매니저
- Nginx (프로덕션 배포 시)

### 하드웨어 요구사항
- **CPU**: 2코어 이상 (4코어 권장)
- **RAM**: 4GB 이상 (8GB 권장)
- **디스크**: 10GB 이상 여유 공간

### 소프트웨어 설치

#### Windows
| 소프트웨어 | 버전 | 설치 방법 |
|-----------|------|----------|
| Python | 3.13+ | https://www.python.org/downloads/ |
| Node.js | 20.x+ | https://nodejs.org/ |
| uv | latest | PowerShell: `irm https://astral.sh/uv/install.ps1 \| iex` |
| Git | latest | https://git-scm.com/ |

#### Linux (Ubuntu/Debian)
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Python 3.13
sudo apt install -y python3 python3-pip python3-venv

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Git
sudo apt install -y git

# Nginx (프로덕션 배포 시)
sudo apt install -y nginx
```

---

## 2. 초기 배포 (Windows)

> **Linux 배포**: Linux 환경은 [LIGHTSAIL_DEPLOY.md](LIGHTSAIL_DEPLOY.md)를 참조하세요.

### 2.1 프로젝트 다운로드

#### Windows
```cmd
REM Git 사용
git clone <repository-url>
cd qms

REM 또는 파일 복사
REM USB/네트워크에서 qms 폴더 복사
```

#### Linux
```bash
# Git 사용
git clone <repository-url>
cd qms
```

### 2.2 환경 변수 설정

#### Windows
```cmd
copy .env.example .env
notepad .env
```

#### Linux
```bash
cp .env.production.example .env
nano .env
```

**필수 수정 사항**:
```env
# 프로덕션용 SECRET_KEY 생성 (중요!)
SECRET_KEY=<새로운-시크릿-키>

# 디버그 모드 비활성화
DEBUG=False

# Windows PC IP 주소 추가
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.x.x

# 프론트엔드 URL (IP 주소)
FRONTEND_URL=http://192.168.x.x:3000
```

**Windows PC IP 확인**:
```cmd
ipconfig
```
→ `IPv4 주소` 확인

**SECRET_KEY 생성**:
```cmd
cd backend
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2.3 자동 배포 실행

#### Windows
```cmd
deploy.bat
```

#### Linux
```bash
chmod +x deploy.sh
./deploy.sh
```

이 스크립트가 자동으로 수행:
1. Python 의존성 설치 (Uvicorn, WhiteNoise, boto3 포함)
2. 데이터베이스 마이그레이션
3. SQLite WAL 모드 활성화
4. Static 파일 수집
5. Frontend 빌드

### 2.4 관리자 계정 생성

#### Windows
```cmd
create_admin.bat
```

#### Linux
```bash
cd backend
uv run python create_admin.py
```

프롬프트에 따라 관리자 정보 입력.

---

### 2.5 시드 데이터 생성
```cmd
uv run manage.py seed_defect_data
```

## 3. 서버 실행

### 3.1 프로덕션 서버 시작

#### Windows (로컬 PC)
```cmd
start_server.bat
```

2개의 창이 열립니다:
- **Backend (Uvicorn ASGI)**: 포트 8000
- **Frontend (Next.js)**: 포트 3000

#### Linux (Systemd 서비스)
```bash
# Systemd 서비스 등록 (최초 1회)
sudo cp systemd/qms-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable qms-backend

# 서비스 시작
sudo systemctl start qms-backend

# 상태 확인
sudo systemctl status qms-backend
```

**참고**: Uvicorn은 Windows, Linux, macOS 모두에서 작동합니다.

### 3.2 서버 중지

#### Windows
```cmd
stop_server.bat
```
또는 각 서버 창에서 `Ctrl+C`

#### Linux
```bash
sudo systemctl stop qms-backend
# 또는
./stop_server.sh
```

---

## 4. 접속 방법

### 로컬 접속
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Django Admin**: http://localhost:8000/admin

### 네트워크 접속 (다른 PC에서)
- **Frontend**: http://192.168.x.x:3000
- **Backend API**: http://192.168.x.x:8000/api
- **Django Admin**: http://192.168.x.x:8000/admin

---

## 5. 방화벽 설정

Windows 방화벽에서 포트 허용:

```powershell
REM PowerShell을 관리자 권한으로 실행

REM Backend 포트
netsh advfirewall firewall add rule name="QMS Backend" dir=in action=allow protocol=TCP localport=8000

REM Frontend 포트
netsh advfirewall firewall add rule name="QMS Frontend" dir=in action=allow protocol=TCP localport=3000
```

---

## 6. 백업

### 6.1 수동 백업

#### Windows
```cmd
backup.bat
```
백업 위치: `backend\backups\`

#### Linux
```bash
./backup.sh
```
백업 위치: `backend/backups/` (로컬) + S3 (설정 시)

### 6.2 자동 백업 설정

#### Windows 작업 스케줄러

1. `Win + R` → `taskschd.msc`
2. **기본 작업 만들기**
   - 이름: QMS 자동 백업
   - 트리거: 매일 오전 2시
   - 작업: 프로그램 시작
   - 프로그램: `C:\path\to\qms\backup.bat`

#### Linux Cron

```bash
# Crontab 편집
crontab -e

# 매일 오전 2시 백업 (아래 줄 추가)
0 2 * * * /home/ubuntu/QMS/backup.sh >> /home/ubuntu/QMS/backend/logs/backup.log 2>&1
```

### 6.3 S3 백업 (Linux/클라우드 환경)

`.env` 파일에 S3 설정 추가:
```env
AWS_S3_BACKUP_BUCKET=your-qms-backup-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=ap-northeast-2
```

백업 스크립트(`backup.sh`)가 자동으로 S3에 업로드합니다.

---

## 7. 시스템 업데이트

### 코드 업데이트

#### Windows
```cmd
REM 1. 서버 중지
stop_server.bat

REM 2. 백업
backup.bat

REM 3. 코드 업데이트
git pull

REM 4. 재배포
deploy.bat

REM 5. 서버 시작
start_server.bat
```

#### Linux
```bash
# 1. 백업
./backup.sh

# 2. 코드 업데이트
git pull origin main

# 3. 재배포
./deploy.sh

# 4. 서비스 재시작
sudo systemctl restart qms-backend
sudo systemctl reload nginx
```

---

## 8. 모니터링

### 8.1 로그 확인

#### Windows
Uvicorn은 콘솔에 직접 로그를 출력합니다.
```cmd
# start_server.bat 실행 시 자동으로 콘솔에 표시됨
```

#### Linux
```bash
# Systemd 서비스 로그 (실시간)
sudo journalctl -u qms-backend -f

# 최근 100줄
sudo journalctl -u qms-backend -n 100

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 8.2 시스템 상태

#### Windows
```cmd
# 포트 확인
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# 작업 관리자
# Ctrl + Shift + Esc
```

#### Linux
```bash
# 서비스 상태
sudo systemctl status qms-backend
sudo systemctl status nginx

# 포트 확인
sudo ss -tlnp | grep :8000

# 프로세스 확인
ps aux | grep uvicorn

# 시스템 리소스
htop  # 또는 top
df -h  # 디스크
free -h  # 메모리
```

---

## 9. 문제 해결

### 서버가 시작되지 않음

```cmd
REM 포트 충돌 확인
netstat -ano | findstr :8000
netstat -ano | findstr :3000

REM 프로세스 종료
taskkill /F /PID <프로세스ID>
```

### 데이터베이스 오류

```cmd
cd backend

REM WAL 체크포인트
uv run python manage.py shell
```
```python
import sqlite3
conn = sqlite3.connect('db.sqlite3')
conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
conn.close()
exit()
```

### 성능 저하

```cmd
REM 데이터베이스 최적화
cd backend
uv run python manage.py shell
```
```python
from django.db import connection
cursor = connection.cursor()
cursor.execute("VACUUM")
exit()
```

---

## 10. 보안 체크리스트

### 배포 전 확인

- [ ] `.env` 파일의 `SECRET_KEY` 변경
- [ ] `.env` 파일의 `DEBUG=False` 설정
- [ ] `ALLOWED_HOSTS`에 올바른 IP 주소 설정
- [ ] 강력한 관리자 비밀번호 설정
- [ ] 방화벽 포트 설정 완료

### 운영 중 확인

- [ ] 정기 백업 수행 (매일 또는 매주)
- [ ] 로그 파일 점검 (주간)
- [ ] 디스크 공간 확인 (월간)
- [ ] 시스템 업데이트 적용 (필요 시)

---

## 11. 프로덕션 설정

### Uvicorn 설정 (ASGI)
- **위치**: `backend/uvicorn_config.py`
- **워커 수**: 기본 4개 (조정 가능)
- **타임아웃**: Keep-alive 5초
- **특징**: Windows, Linux, macOS 모두 지원

### SQLite WAL 모드
- **자동 활성화**: `deploy.bat` 실행 시
- **장점**: 읽기/쓰기 동시 처리, 성능 30-50% 향상
- **관련 파일**: 
  - `db.sqlite3` (메인)
  - `db.sqlite3-wal` (로그)
  - `db.sqlite3-shm` (공유 메모리)

⚠️ **WAL 파일 삭제 금지!**

### WhiteNoise
- Static 파일 자동 압축 (gzip)
- 캐싱 헤더 자동 설정
- Uvicorn/ASGI에서 효율적 서빙

---

## 12. 성능 최적화

### 데이터베이스
```cmd
REM 인덱스 추가 (필요 시 개발자 문의)
REM 정기적인 VACUUM 실행 (월 1회)
```

### Static 파일
```cmd
REM Static 파일 재수집 (코드 변경 후)
cd backend
uv run python manage.py collectstatic --noinput
```

---

## 13. 주의사항

### ✅ 반드시 지켜야 할 사항

1. **프로덕션에서는 Uvicorn 사용** (`start_server.bat`)
2. **DEBUG=False 설정**
3. **정기적인 백업**
4. **WAL 파일 삭제 금지**
5. **.env 파일 Git 커밋 금지**

### ❌ 하지 말아야 할 것

1. 개발 모드(runserver) 프로덕션 사용
2. DEBUG=True 프로덕션 설정
3. 백업 없이 업데이트
4. 데이터베이스 수동 삭제

---

## 14. 유지보수 일정

### 일일
- [ ] 서버 상태 확인
- [ ] 로그 에러 확인

### 주간
- [ ] 백업 수행
- [ ] 로그 파일 검토
- [ ] 디스크 공간 확인

### 월간
- [ ] 데이터베이스 최적화 (VACUUM)
- [ ] 오래된 백업 정리
- [ ] 시스템 업데이트 검토

---

## 15. 긴급 상황 대응

### 서버 다운

1. 로그 확인: Uvicorn 콘솔 창 확인
2. 서버 재시작: `stop_server.bat` → `start_server.bat`
3. 문제 지속 시: 백업에서 복원

### 데이터 손상

1. 서버 중지: `stop_server.bat`
2. 백업 복원:
   ```cmd
   copy backups\최신날짜\db.sqlite3 backend\db.sqlite3
   ```
3. 서버 시작: `start_server.bat`

---

## 16. 스크립트 설명

| 스크립트 | 용도 |
|---------|------|
| `deploy.bat` | 초기 배포 및 설정 |
| `start_server.bat` | 프로덕션 서버 시작 |
| `stop_server.bat` | 서버 중지 |
| `backup.bat` | 데이터 백업 |
| `create_admin.bat` | 관리자 계정 생성 |

---

**운영 환경 배포 완료!** 🚀

서버 시작: `start_server.bat`

문제 발생 시: 이 가이드의 "9. 문제 해결" 참조

