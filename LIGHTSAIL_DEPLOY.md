# AWS Lightsail Ubuntu 24.04 배포 가이드

QMS 시스템을 AWS Lightsail Ubuntu 24.04에 배포하는 완전한 가이드입니다.

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [Lightsail 인스턴스 생성](#2-lightsail-인스턴스-생성)
3. [초기 서버 설정](#3-초기-서버-설정)
4. [도메인 및 DNS 설정](#4-도메인-및-dns-설정)
5. [QMS 배포](#5-qms-배포)
6. [Nginx 설정](#6-nginx-설정)
7. [SSL 인증서 설정](#7-ssl-인증서-설정)
8. [Systemd 서비스 등록](#8-systemd-서비스-등록)
9. [S3 백업 설정](#9-s3-백업-설정)
10. [모니터링 및 유지보수](#10-모니터링-및-유지보수)
11. [트러블슈팅](#11-트러블슈팅)

---

## 1. 사전 준비

### 1.1 필요한 계정 및 도구

- **AWS 계정**: Lightsail 서비스 사용을 위해 필요
- **도메인**: SSL 인증서 발급 및 서비스 접속용 (선택사항이지만 권장)
- **SSH 클라이언트**: 서버 접속용 (Windows: PuTTY, PowerShell, macOS/Linux: 기본 터미널)

### 1.2 권장 스펙

| 항목 | 권장 사양 |
|------|----------|
| **인스턴스** | $5/월 (1GB RAM, 1vCPU, 40GB SSD) |
| **OS** | Ubuntu 24.04 LTS |
| **동시 사용자** | 10-20명 |
| **데이터량** | 소규모 (SQLite 사용) |

---

## 2. Lightsail 인스턴스 생성

### 2.1 AWS Lightsail 콘솔 접속

1. [AWS Lightsail 콘솔](https://lightsail.aws.amazon.com/) 접속
2. 리전 선택: **서울 (ap-northeast-2)** 권장

### 2.2 인스턴스 생성

1. **"인스턴스 생성"** 클릭
2. **플랫폼 선택**: Linux/Unix
3. **블루프린트 선택**: OS 전용 → **Ubuntu 24.04 LTS**
4. **SSH 키 페어**: 
   - 새로 생성하거나 기존 키 사용
   - **키 다운로드** 후 안전한 곳에 보관
5. **인스턴스 플랜**: $5/월 (1GB RAM) 선택
6. **인스턴스 이름**: `qms-server` (원하는 이름)
7. **"인스턴스 생성"** 클릭

### 2.3 고정 IP 할당

1. Lightsail 콘솔에서 **"네트워킹"** 탭 선택
2. **"고정 IP 생성"** 클릭
3. 생성한 인스턴스에 연결
4. 고정 IP 주소를 기록 (예: `123.456.789.0`)

### 2.4 방화벽 설정

Lightsail 인스턴스 → **"네트워킹"** 탭:

| 애플리케이션 | 프로토콜 | 포트 범위 |
|------------|---------|----------|
| SSH | TCP | 22 |
| HTTP | TCP | 80 |
| HTTPS | TCP | 443 |

---

## 3. 초기 서버 설정

### 3.1 SSH 접속

**Windows (PowerShell):**
```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@123.456.789.0
```

**macOS/Linux:**
```bash
chmod 400 ~/path/to/your-key.pem
ssh -i ~/path/to/your-key.pem ubuntu@123.456.789.0
```

### 3.2 시스템 업데이트

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 필수 패키지 설치

```bash
# 기본 도구
sudo apt install -y curl wget git vim build-essential

# Python 3.13 (Ubuntu 24.04 기본 제공)
sudo apt install -y python3 python3-pip python3-venv

# SQLite (데이터베이스)
sudo apt install -y sqlite3

# Nginx (웹 서버)
sudo apt install -y nginx

# Certbot (SSL 인증서)
sudo apt install -y certbot python3-certbot-nginx
```

### 3.4 UFW 방화벽 설정

```bash
# UFW 활성화
sudo ufw enable

# SSH 허용
sudo ufw allow 22/tcp

# HTTP/HTTPS 허용
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 상태 확인
sudo ufw status
```

### 3.5 Fail2ban 설치 (선택사항, SSH 보안)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 4. 도메인 및 DNS 설정

### 4.1 도메인 DNS 레코드 추가

도메인 제공업체(가비아, 호스팅케이알 등)에서:

| 타입 | 호스트 | 값 | TTL |
|------|--------|-----|-----|
| A | @ | 123.456.789.0 | 300 |
| A | www | 123.456.789.0 | 300 |

### 4.2 DNS 전파 확인 (5-30분 소요)

```bash
nslookup your-domain.com
# 또는
dig your-domain.com
```

---

## 5. QMS 배포

### ⭐ 자동화된 배포 (권장)

최초 설정 후에는 자동화 스크립트로 간편하게 배포할 수 있습니다.

**로컬 PC (Windows):**
```cmd
deploy_to_production.bat 123.456.789.0 C:\path\to\key.pem
```

**로컬 PC (Linux/Mac):**
```bash
chmod +x deploy_to_production.sh
./deploy_to_production.sh 123.456.789.0 ~/.ssh/key.pem
```

**자동 수행 작업:**
1. ✓ Frontend 로컬 빌드
2. ✓ Git push
3. ✓ 서버로 파일 업로드
4. ✓ **파일 권한 자동 수정** (`chmod -R 755`)
5. ✓ 서버에서 Git pull
6. ✓ Nginx 설정 업데이트
7. ✓ Backend 의존성 업데이트
8. ✓ DB 마이그레이션
9. ✓ Static 파일 수집
10. ✓ 서비스 재시작

> 💡 **SCP 업로드 시 권한 문제가 자동으로 해결됩니다!**
> 
> 💡 **최초 배포 시에는** 아래의 수동 설정을 먼저 완료해야 합니다.

---

### 5.1 프로젝트 업로드 (최초 설정)

**방법 1: Git 사용 (권장)**
```bash
cd ~
git clone https://github.com/your-username/qms.git QMS
cd QMS
```

**방법 2: SCP로 파일 전송**
```bash
# 로컬 PC에서 실행
scp -i your-key.pem -r C:\QMS ubuntu@123.456.789.0:~/
```

### 5.2 환경 변수 설정

```bash
cd ~/QMS
cp .env.production.example .env
nano .env
```

**필수 수정 항목:**
```env
# SECRET_KEY 생성
SECRET_KEY=<새로운-시크릿-키>

# 도메인 설정
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
FRONTEND_URL=https://your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# HTTPS 설정 (SSL 인증서 설치 후)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Next.js API URL
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

**SECRET_KEY 생성:**
```bash
cd ~/QMS/backend
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5.3 Frontend 빌드 (중요!)

⚠️ **1GB RAM 인스턴스에서는 Next.js 빌드가 메모리 부족으로 실패할 수 있습니다.**

**권장 방법: 로컬 PC에서 빌드 후 업로드**

**옵션 A: 자동 스크립트 사용 (간단)**
```bash
# 로컬 PC에서 실행 (Git Bash 또는 WSL)
cd C:\QMS
./deploy_frontend.sh your-server-ip C:\path\to\your-key.pem

# 예시:
# ./deploy_frontend.sh 54.180.123.45 ~/.ssh/lightsail-key.pem
```

이 스크립트가 자동으로:
1. Frontend 의존성 설치 확인
2. Next.js 빌드
3. 서버로 전송
4. Nginx 재시작

**옵션 B: 수동 빌드 및 전송**
```bash
# 로컬 PC (Windows)에서 실행
cd C:\QMS\frontend
npm install
npm run build

# 빌드 완료 확인
dir out  # out 폴더가 생성됨

# 서버로 전송
scp -i "C:\path\to\your-key.pem" -r out ubuntu@your-server-ip:~/QMS/frontend/
```

**대안: 서버에서 빌드 (Swap 메모리 필요)**

```bash
# 서버에서 Swap 메모리 추가
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 메모리 확인
free -h
```

### 5.4 배포 스크립트 실행

```bash
cd ~/QMS
chmod +x deploy.sh
./deploy.sh
```

이 스크립트는 다음을 자동으로 수행합니다:
- uv 패키지 매니저 설치
- Node.js 설치 (미설치 시)
- Python 의존성 설치
- 데이터베이스 마이그레이션
- SQLite WAL 모드 활성화
- Static 파일 수집
- **Frontend 빌드 확인** (이미 빌드된 경우 건너뜀)

### 5.5 관리자 계정 생성

```bash
cd ~/QMS/backend
uv run python create_admin.py
```

---

## 6. Nginx 설정

### 6.1 Frontend 빌드 파일 확인

배포 스크립트 실행 전에 Frontend가 빌드되었는지 확인:

```bash
ls -la ~/QMS/frontend/out/
```

`out` 폴더가 없다면 위의 5.3 단계로 돌아가서 빌드하세요.

### 6.2 Nginx 설정 파일 복사

```bash
cd ~/QMS

# 설정 파일에서 도메인 수정
nano nginx/qms.conf
# your-domain.com을 실제 도메인으로 변경

# Nginx sites-available에 복사
sudo cp nginx/qms.conf /etc/nginx/sites-available/qms

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/qms /etc/nginx/sites-enabled/

# 기본 사이트 비활성화
sudo rm /etc/nginx/sites-enabled/default
```

### 6.3 Nginx 설정 테스트 및 재시작

```bash
# 설정 파일 문법 검사
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx
```

### 6.4 접속 테스트

브라우저에서 `http://your-domain.com` 접속
- Frontend가 보이면 성공
- API 테스트: `http://your-domain.com/api/` (접속 시 JSON 응답)

---

## 7. SSL 인증서 설정

### 7.1 Let's Encrypt 인증서 발급

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

프롬프트 응답:
1. 이메일 입력 (인증서 만료 알림용)
2. 약관 동의: `Y`
3. 이메일 공유: `N` (선택)
4. HTTP → HTTPS 리다이렉트: `2` (Redirect 선택)

### 7.2 인증서 자동 갱신 설정

Certbot이 자동으로 cron job 생성. 확인:

```bash
sudo systemctl status certbot.timer
```

수동 갱신 테스트:
```bash
sudo certbot renew --dry-run
```

### 7.3 HTTPS 접속 확인

브라우저에서 `https://your-domain.com` 접속
- 자물쇠 아이콘이 보이면 SSL 설정 완료

---

## 8. Systemd 서비스 등록

### 8.1 서비스 파일 수정

```bash
cd ~/QMS
nano systemd/qms-backend.service
```

**경로 확인 및 수정:**
- `User=ubuntu` (사용자명 확인)
- `WorkingDirectory=/home/ubuntu/QMS/backend`
- `EnvironmentFile=/home/ubuntu/QMS/.env`

### 8.2 서비스 등록

```bash
# 서비스 파일 복사
sudo cp systemd/qms-backend.service /etc/systemd/system/

# Systemd 데몬 리로드
sudo systemctl daemon-reload

# 서비스 활성화 (부팅 시 자동 시작)
sudo systemctl enable qms-backend

# 서비스 시작
sudo systemctl start qms-backend

# 상태 확인
sudo systemctl status qms-backend
```

### 8.3 로그 확인

```bash
# 실시간 로그 보기
sudo journalctl -u qms-backend -f

# 최근 100줄 로그
sudo journalctl -u qms-backend -n 100
```

---

## 9. S3 백업 설정

### 9.1 S3 버킷 생성

AWS 콘솔에서:
1. S3 서비스 접속
2. **"버킷 만들기"** 클릭
3. 버킷 이름: `your-company-qms-backup`
4. 리전: `ap-northeast-2` (서울)
5. 퍼블릭 액세스 차단: **모두 차단** (기본값 유지)
6. 생성

### 9.2 IAM 사용자 생성

AWS IAM 콘솔에서:
1. **"사용자" → "사용자 추가"**
2. 사용자 이름: `qms-backup-user`
3. 액세스 유형: **프로그래밍 방식 액세스**
4. 권한 설정: **기존 정책 직접 연결** → `AmazonS3FullAccess` 검색 후 선택
   - (더 안전하게: S3 버킷만 접근하는 커스텀 정책 생성)
5. **액세스 키 ID**와 **비밀 액세스 키** 다운로드 및 보관

### 9.3 환경 변수 설정

```bash
cd ~/QMS
nano .env
```

추가:
```env
AWS_S3_BACKUP_BUCKET=your-company-qms-backup
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=ap-northeast-2
```

### 9.4 백업 테스트

```bash
cd ~/QMS
./backup.sh
```

S3 버킷에 백업 파일이 업로드되었는지 AWS 콘솔에서 확인.

### 9.5 자동 백업 Cron 설정

```bash
crontab -e
```

추가 (매일 오전 2시 백업):
```cron
0 2 * * * /home/ubuntu/QMS/backup.sh >> /home/ubuntu/QMS/backend/logs/backup.log 2>&1
```

Cron 설정 확인:
```bash
crontab -l
```

---

## 10. 모니터링 및 유지보수

### 10.1 서버 상태 확인

```bash
# 서비스 상태
sudo systemctl status qms-backend
sudo systemctl status nginx

# 디스크 사용량
df -h

# 메모리 사용량
free -h

# CPU/프로세스
top
```

### 10.2 로그 모니터링

```bash
# Backend 로그
sudo journalctl -u qms-backend -f

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/access.log

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### 10.3 백업 확인

```bash
# 로컬 백업
ls -lh ~/QMS/backend/backups/

# S3 백업 (AWS CLI 설치 시)
aws s3 ls s3://your-company-qms-backup/backups/
```

### 10.4 업데이트 절차

**방법 1: 소스 코드만 변경된 경우**
```bash
# 1. 백업
cd ~/QMS
./backup.sh

# 2. 코드 업데이트 (Git 사용 시)
git pull origin main

# 3. Backend 재배포
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py collectstatic --noinput

# 4. 서비스 재시작
sudo systemctl restart qms-backend
sudo systemctl reload nginx
```

**방법 2: Frontend 변경된 경우 (로컬 빌드)**
```bash
# 로컬 PC에서:
cd C:\QMS\frontend
git pull
npm install
npm run build
scp -i your-key.pem -r out ubuntu@your-server-ip:~/QMS/frontend/

# 서버에서:
sudo systemctl reload nginx
```

**방법 3: 전체 재배포 (서버 빌드 - 느림)**
```bash
# 1. 백업
cd ~/QMS
./backup.sh

# 2. 코드 업데이트
git pull origin main

# 3. Frontend 빌드 파일 삭제 (서버에서 재빌드하려면)
rm -rf frontend/out

# 4. 재배포
./deploy.sh

# 5. 서비스 재시작
sudo systemctl restart qms-backend
sudo systemctl reload nginx
```

---

## 11. 트러블슈팅

### 11.1 Backend 서비스가 시작되지 않음

**확인 사항:**
```bash
# 로그 확인
sudo journalctl -u qms-backend -n 50

# .env 파일 존재 확인
ls -la ~/QMS/.env

# 권한 확인
ls -la ~/QMS/backend/

# 수동 실행 테스트
cd ~/QMS/backend
uv run uvicorn backend.asgi:application --host 0.0.0.0 --port 8000
```

**해결 방법:**
- `.env` 파일 설정 확인
- Python 의존성 재설치: `cd ~/QMS/backend && uv sync`
- 경로 확인: systemd 서비스 파일의 `WorkingDirectory` 확인

### 11.2 Nginx 502 Bad Gateway

**원인:** Backend 서비스가 실행되지 않음

**해결:**
```bash
# Backend 서비스 시작
sudo systemctl start qms-backend
sudo systemctl status qms-backend
```

### 11.3 Static 파일이 로드되지 않음

**해결:**
```bash
# Static 파일 재수집
cd ~/QMS/backend
uv run python manage.py collectstatic --noinput

# Nginx 재시작
sudo systemctl reload nginx

# 권한 확인
ls -la ~/QMS/backend/staticfiles/
```

### 11.4 SSL 인증서 오류

**인증서 갱신:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

**인증서 확인:**
```bash
sudo certbot certificates
```

### 11.5 Frontend 빌드 실패 (메모리 부족)

**증상:** Next.js 빌드 중 멈추거나 `JavaScript heap out of memory` 오류

**해결 방법 1: 로컬에서 빌드 후 업로드 (권장)**
```bash
# 로컬 PC에서
cd C:\QMS\frontend
npm run build

# 서버로 전송
scp -i your-key.pem -r out ubuntu@your-server-ip:~/QMS/frontend/

# 서버에서 배포 재실행
ssh ubuntu@your-server-ip
cd ~/QMS
./deploy.sh
```

**해결 방법 2: Swap 메모리 추가**
```bash
# 2GB Swap 파일 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h

# 빌드 재시도
cd ~/QMS
./deploy.sh
```

**해결 방법 3: 빌드된 파일만 Git으로 업로드 (비권장)**
```bash
# 로컬 PC에서 빌드 후
cd frontend
npm run build

# Git에 임시로 추가 (주의: .gitignore 무시)
git add -f out/
git commit -m "Add build files temporarily"
git push

# 서버에서
cd ~/QMS
git pull
```

### 11.6 S3 업로드 실패

**확인:**
```bash
# AWS 자격 증명 확인
grep AWS_ ~/QMS/.env

# boto3 설치 확인
cd ~/QMS/backend
uv pip list | grep boto3
```

**재설치:**
```bash
cd ~/QMS
./deploy.sh
```

### 11.7 데이터베이스 복구

**S3에서 백업 다운로드:**
```bash
cd ~/QMS/backend/backups
aws s3 cp s3://your-company-qms-backup/backups/db_backup_20250118_020000.sqlite3.gz .

# 압축 해제 및 복원
gunzip db_backup_20250118_020000.sqlite3.gz
sudo systemctl stop qms-backend
cp db_backup_20250118_020000.sqlite3 ~/QMS/backend/db.sqlite3
sudo systemctl start qms-backend
```

### 11.8 포트 충돌

```bash
# 8000 포트 사용 확인
sudo lsof -i :8000

# 프로세스 종료
sudo kill -9 <PID>
```

---

## 12. 보안 체크리스트

### 배포 전
- [ ] `.env` 파일의 `SECRET_KEY` 변경
- [ ] `.env` 파일의 `DEBUG=False` 설정
- [ ] `ALLOWED_HOSTS`에 실제 도메인 설정
- [ ] CSRF_TRUSTED_ORIGINS 설정
- [ ] 강력한 관리자 비밀번호 설정

### 배포 후
- [ ] HTTPS 접속 확인
- [ ] UFW 방화벽 활성화
- [ ] Fail2ban 설치 및 활성화
- [ ] SSH 키 기반 인증만 허용 (비밀번호 인증 비활성화)
- [ ] 정기 백업 Cron 등록
- [ ] S3 백업 테스트

---

## 13. 유용한 명령어 모음

```bash
# 서비스 관리
sudo systemctl start qms-backend      # 시작
sudo systemctl stop qms-backend       # 중지
sudo systemctl restart qms-backend    # 재시작
sudo systemctl status qms-backend     # 상태 확인

# Nginx 관리
sudo nginx -t                         # 설정 테스트
sudo systemctl reload nginx           # 재로드 (무중단)
sudo systemctl restart nginx          # 재시작

# 로그 확인
sudo journalctl -u qms-backend -f     # Backend 실시간 로그
sudo tail -f /var/log/nginx/error.log # Nginx 에러 로그

# 백업
./backup.sh                           # 수동 백업

# 시스템 모니터링
htop                                  # 프로세스 모니터
df -h                                 # 디스크 사용량
free -h                               # 메모리 사용량
```

---

## 14. 참고 자료

- [Django 배포 문서](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Uvicorn 문서](https://www.uvicorn.org/)
- [Nginx 문서](https://nginx.org/en/docs/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)
- [AWS Lightsail 문서](https://docs.aws.amazon.com/lightsail/)

---

**배포 완료!** 🚀

문제 발생 시 위의 트러블슈팅 섹션을 참조하거나, 로그를 확인하세요.

운영 중 추가 질문이 있으시면 개발팀에 문의하세요.

