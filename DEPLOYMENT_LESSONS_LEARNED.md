# 🎓 QMS 실전 배포 이슈 해결 가이드

실제 AWS Lightsail 배포 과정에서 발생한 문제들과 해결 방법을 시간 순서대로 정리한 실전 가이드입니다.

---

## 📚 목차

1. [배포 환경 설정](#1-배포-환경-설정)
2. [메모리 부족 문제 (Frontend 빌드 실패)](#2-메모리-부족-문제-frontend-빌드-실패)
3. [Nginx 설정 오류](#3-nginx-설정-오류)
4. [404 에러 (Frontend 파일 접근 불가)](#4-404-에러-frontend-파일-접근-불가)
5. [Backend 서비스 시작 실패](#5-backend-서비스-시작-실패)
6. [CORS 에러 (API 호출 실패)](#6-cors-에러-api-호출-실패)
7. [환경변수 전파 문제](#7-환경변수-전파-문제)
8. [중첩 경로 리다이렉트 루프](#8-중첩-경로-리다이렉트-루프)
9. [SCP 업로드 권한 문제](#9-scp-업로드-권한-문제)
10. [보안 - 민감한 파일 관리](#10-보안---민감한-파일-관리)
11. [Certbot과 Nginx 설정 충돌](#11-certbot과-nginx-설정-충돌)

---

## 1. 배포 환경 설정

### 배포 전략 결정

**상황:**
- AWS Lightsail 인스턴스 (1GB RAM, 1vCPU)
- Ubuntu 24.04
- Django + Uvicorn (Backend)
- Next.js (Frontend)
- SQLite Database

**결정사항:**
```
✅ Backend: Uvicorn (Linux 호환, 성능 우수)
✅ Frontend: Static Export + Nginx (빌드 후 정적 파일 서빙)
✅ Reverse Proxy: Nginx
✅ 도메인: HTTPS (Let's Encrypt)
✅ Backup: 로컬 + S3
```

**왜 이렇게 결정했나?**
- **Uvicorn**: ASGI 서버로 비동기 처리 성능 우수
- **Static Export**: Next.js SSR은 메모리 많이 사용, 정적 HTML로 변환
- **Nginx**: 정적 파일 서빙 + 리버스 프록시 + Rate Limiting
- **SQLite**: 소규모 운영, 관리 간편

---

## 2. 메모리 부족 문제 (Frontend 빌드 실패)

### 🐛 문제 발생

**증상:**
```bash
# 서버에서 빌드 시도
npm run build

# 30분 넘게 빌드 중... 멈춤
```

**원인:**
- Next.js 빌드는 메모리를 많이 사용 (최소 1.5GB 권장)
- Lightsail 1GB RAM 인스턴스는 부족

### ✅ 해결 방법

**방법 1: 로컬에서 빌드 후 업로드 (채택!)**

```bash
# 로컬 PC에서
cd frontend
npm run build  # out/ 폴더 생성

# 서버로 전송
scp -i key.pem -r out ubuntu@server:~/QMS/frontend/
```

**장점:**
- 로컬 PC는 메모리 충분
- 서버 리소스 절약
- 빌드 시간 단축

**방법 2: Swap 메모리 추가 (비권장)**

```bash
# 서버에서
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

export NODE_OPTIONS="--max-old-space-size=768"
npm run build
```

**단점:**
- SSD 수명 단축
- 빌드 시간 매우 느림 (20분+)

### 📝 배운 점

> 💡 **소규모 인스턴스에서는 로컬 빌드가 정답!**
> 
> 빌드는 로컬에서, 서버는 실행만!

---

## 3. Nginx 설정 오류

### 🐛 문제 발생

**증상:**
```bash
sudo nginx -t

2025/10/18 13:51:56 [warn] 1303#1303: duplicate MIME type "text/html" in /etc/nginx/sites-enabled/qms:72
2025/10/18 13:51:56 [emerg] 1303#1303: "limit_req_zone" directive is not allowed here in /etc/nginx/sites-enabled/qms:82
nginx: configuration file /etc/nginx/nginx.conf test failed
```

**원인:**

1. **`text/html`은 기본적으로 gzip 압축됨**
   ```nginx
   gzip_types text/css application/javascript text/html;  # ❌ text/html 중복
   ```

2. **`limit_req_zone`은 `http` 블록에만 위치 가능**
   ```nginx
   server {
       limit_req_zone ...;  # ❌ 잘못된 위치
   }
   ```

### ✅ 해결 방법

**수정 1: `text/html` 제거**

```nginx
# 수정 전
gzip_types text/css application/javascript text/html;

# 수정 후
gzip_types text/css application/javascript;
```

**수정 2: `limit_req_zone` 위치 이동**

```nginx
# nginx/qms.conf 파일 최상단 (http 블록 밖)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;  # 사용
    }
}
```

### 📝 배운 점

> 💡 **Nginx 설정 문법은 위치가 중요!**
> 
> - `limit_req_zone`: `http` 블록 (전역)
> - `limit_req`: `location` 블록 (사용)
> - `text/html`은 기본 포함 (명시 불필요)

---

## 4. 404 에러 (Frontend 파일 접근 불가)

### 🐛 문제 발생

**증상:**
```
https://www.komex-qc.co.kr/ → 404 Not Found
```

**Nginx 에러 로그:**
```
[crit] 1341#1341: *7 stat() "/home/ubuntu/QMS/frontend/out/" failed (13: Permission denied)
```

**원인:**
- Nginx는 `www-data` 사용자로 실행
- `/home/ubuntu/` 디렉토리에 접근 권한 없음

### ✅ 해결 방법

**권한 설정:**

```bash
# 디렉토리 권한 (실행 권한 필요)
chmod 755 /home/ubuntu
chmod 755 /home/ubuntu/QMS
chmod 755 /home/ubuntu/QMS/frontend

# 파일 권한 (읽기 권한 필요)
chmod -R 755 /home/ubuntu/QMS/frontend/out
```

**권한 의미:**
- `7` (소유자): 읽기(4) + 쓰기(2) + 실행(1) = 7
- `5` (그룹/기타): 읽기(4) + 실행(1) = 5
- 실행 권한: 디렉토리 내부 접근에 필요

### 📝 배운 점

> 💡 **홈 디렉토리 권한 주의!**
> 
> Nginx가 파일을 읽으려면:
> 1. 상위 디렉토리 실행 권한 필요
> 2. 파일 읽기 권한 필요

---

## 5. Backend 서비스 시작 실패

### 🐛 문제 발생

**증상:**
```bash
systemctl status qms-backend

Main process exited, code=exited, status=203/EXEC
Failed with result 'exit-code'
```

**원인:**
- Systemd 서비스 파일의 `ExecStart`에서 `uv` 명령어를 찾을 수 없음
- `uv`는 `/home/ubuntu/.local/bin/`에 설치됨
- 기본 PATH에 포함되지 않음

### ✅ 해결 방법

**서비스 파일 수정:**

```ini
# systemd/qms-backend.service

[Service]
# 절대 경로 사용
ExecStart=/home/ubuntu/.local/bin/uv run uvicorn backend.asgi:application --host 0.0.0.0 --port 8000

# PATH 환경변수 추가
Environment="PATH=/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin"
```

**적용:**
```bash
sudo systemctl daemon-reload
sudo systemctl restart qms-backend
sudo systemctl status qms-backend
```

### 📝 배운 점

> 💡 **Systemd는 최소한의 환경에서 실행!**
> 
> - 사용자 PATH 적용 안 됨
> - 절대 경로 사용 권장
> - 필요한 환경변수는 명시

---

## 6. CORS 에러 (API 호출 실패)

### 🐛 문제 발생

**증상:**
```
Access to XMLHttpRequest at 'http://127.0.0.1:8000/api/login/' 
from origin 'https://www.komex-qc.co.kr' has been blocked by CORS policy
```

**원인:**
1. Frontend가 여전히 `http://127.0.0.1:8000`으로 API 호출
2. Django `CORS_ALLOWED_ORIGINS`에 도메인 누락

### ✅ 해결 방법

**1단계: Django 설정 확인**

```python
# backend/backend/settings.py

CORS_ALLOWED_ORIGINS = [
    os.getenv('FRONTEND_URL', 'http://localhost:3000'),
]

CSRF_TRUSTED_ORIGINS = [
    'https://komex-qc.co.kr',
    'https://www.komex-qc.co.kr',
]
```

**2단계: 서버 `.env` 파일 수정**

```bash
# /home/ubuntu/QMS/.env

FRONTEND_URL=https://www.komex-qc.co.kr
CSRF_TRUSTED_ORIGINS=https://komex-qc.co.kr,https://www.komex-qc.co.kr
```

**3단계: Backend 재시작**

```bash
sudo systemctl restart qms-backend
```

**4단계: Frontend 환경변수 설정 (로컬)**

```bash
# frontend/.env.local

NEXT_PUBLIC_API_URL=https://www.komex-qc.co.kr/api
```

**5단계: Frontend 재빌드 및 업로드**

```bash
# 로컬 PC
cd frontend
rm -rf out .next
npm run build

# 서버로 전송
scp -i key.pem -r out ubuntu@server:~/QMS/frontend/
```

### 📝 배운 점

> 💡 **CORS는 양쪽 모두 설정 필요!**
> 
> - Backend: `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
> - Frontend: API URL을 도메인으로 설정
> - **환경변수 변경 시 반드시 재빌드!**

---

## 7. 환경변수 전파 문제

### 🐛 문제 발생

**증상:**
```javascript
// 브라우저에서 여전히
fetch('http://127.0.0.1:8000/api/login/')
```

`.env.local` 파일을 수정했는데도 API URL이 변경되지 않음.

**원인:**
- Next.js는 빌드 시점에 환경변수를 코드에 "베이킹"
- 런타임에 환경변수 변경 불가 (Static Export)

### ✅ 해결 방법 (시도 순서)

**시도 1: `.env.local` 수정 후 재빌드**

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://www.komex-qc.co.kr/api

# 캐시 삭제 후 재빌드
rm -rf .next out node_modules/.cache
npm run build
```

**결과:** ❌ 여전히 동작 안 함

**시도 2: `next.config.ts`에 명시**

```typescript
// frontend/next.config.ts

const nextConfig: NextConfig = {
  output: 'export',
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://www.komex-qc.co.kr/api',
  },
};
```

**결과:** ❌ 여전히 동작 안 함

**시도 3: 하드코딩 (임시)**

```typescript
// frontend/lib/api.ts

const API_BASE_URL = 'https://www.komex-qc.co.kr/api'  // 하드코딩

const api = axios.create({
  baseURL: API_BASE_URL,
});
```

**결과:** ✅ 동작!

### 📝 배운 점

> 💡 **Next.js Static Export의 한계**
> 
> - 빌드 시점에 환경변수 고정
> - 환경변수 전파가 제대로 안 될 때가 있음
> - 중요한 설정은 하드코딩도 고려 (프로덕션 전용)
> - 또는 빌드 스크립트에서 환경변수 명확히 설정

---

## 8. 중첩 경로 리다이렉트 루프

### 🐛 문제 발생

**증상:**
```
https://www.komex-qc.co.kr/admin/users/ → ERR_TOO_MANY_REDIRECTS
```

**원인:**
```nginx
# Nginx 설정에서
location /admin/ {
    proxy_pass http://127.0.0.1:8000;  # Django Admin으로 프록시
}

location / {
    root /home/ubuntu/QMS/frontend/out;
    try_files $uri $uri.html $uri/index.html /index.html;
}
```

**문제 분석:**
1. 브라우저가 `/admin/users/`를 요청
2. Nginx의 `location /admin/`이 먼저 매칭
3. Django로 프록시 → Django는 해당 URL이 없음
4. 리다이렉트 → 다시 `/admin/users/`로 → 무한 루프

### ✅ 해결 방법

**방법 1: Django Admin 경로 변경 (채택)**

```nginx
# 수정 전
location /admin/ {
    proxy_pass http://127.0.0.1:8000;
}

# 수정 후
location /django-admin/ {
    proxy_pass http://127.0.0.1:8000/admin/;
}
```

**결과:**
- `https://www.komex-qc.co.kr/admin/users/` → Next.js (사용자 관리)
- `https://www.komex-qc.co.kr/django-admin/` → Django Admin

**방법 2: Django Admin 제거 (Django Admin 미사용 시)**

```nginx
# location /admin/ { ... } 블록 삭제
```

### 📝 배운 점

> 💡 **Nginx location 우선순위 이해 필수!**
> 
> - `location /admin/`은 `/admin/users/`도 매칭
> - 더 구체적인 경로가 우선순위 높음
> - 경로 충돌 시 이름 변경으로 해결

---

## 9. SCP 업로드 권한 문제

### 🐛 문제 발생

**증상:**
```bash
# 로컬에서 빌드 후 업로드
scp -i key.pem -r out ubuntu@server:~/QMS/frontend/

# Nginx 에러
stat() "/home/ubuntu/QMS/frontend/out/" failed (13: Permission denied)
```

**원인:**
- SCP로 업로드한 파일 권한: `644` (읽기/쓰기)
- 디렉토리 권한: `755` 필요 (실행 권한)
- 매번 수동으로 권한 설정 필요 → 번거로움

### ✅ 해결 방법

**자동화 스크립트에 권한 수정 추가:**

```bash
# deploy_to_production.sh

# Frontend 업로드
scp -i "$SSH_KEY" -r frontend/out "$SERVER_USER@$SERVER:~/QMS/frontend/"

# 업로드 후 즉시 권한 수정
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER" "chmod -R 755 ~/QMS/frontend/out"
```

**서버용 스크립트도 권한 체크:**

```bash
# update_production.sh

if [ -d "frontend/out" ]; then
    echo "✓ Frontend 빌드 파일 존재"
    
    # 권한 자동 수정
    chmod -R 755 frontend/out 2>/dev/null || true
fi
```

### 📝 배운 점

> 💡 **SCP 업로드 후 항상 권한 확인!**
> 
> - 자동화 스크립트에 권한 수정 포함
> - 디렉토리는 `755` (실행 권한 필수)
> - 파일은 `644` (읽기 권한만)

---

## 10. 보안 - 민감한 파일 관리

### 🐛 문제 발생

**상황:**
- `.gitignore` 파일을 새로 작성하면서 기존 항목 누락
- `null` 파일, `backend/backups/`, DB 파일 등이 Git에 올라갈 뻔

**위험:**
```
❌ backend/backups/db_backup_*.sqlite3  # 운영 데이터!
❌ .env                                  # SECRET_KEY, AWS 키!
❌ *.pem, *.key                         # SSH 키, 인증서!
❌ null                                  # 시스템 오류 파일
```

### ✅ 해결 방법

**`.gitignore` 완전 복원:**

```gitignore
# Database backups (절대 Git에 올리면 안됨!)
backend/backups/
backups/
*.sqlite3
*.bak
*.backup

# Environment variables (민감한 정보)
.env
.env.local
.env.production

# SSH Keys & Certificates
*.pem
*.key
*.crt
id_rsa*

# System error files
null
```

**커밋 전 확인:**

```bash
# 민감한 파일이 stage되지 않았는지 확인
git status | grep -E "\.env|\.sqlite3|\.pem|backups/|null"

# .gitignore 테스트
git check-ignore -v .env backend/backups/ *.pem

# 무시되는 파일 목록 확인
git status --ignored
```

### 📝 배운 점

> 💡 **보안은 한 번 실수하면 복구 불가!**
> 
> - 커밋 전 항상 `git status` 확인
> - `.gitignore` 신중하게 관리
> - `SECURITY_CHECKLIST.md` 참고
> - Pre-commit Hook 설정 고려

---

## 11. Certbot과 Nginx 설정 충돌

### 🤔 의문점

**질문:**
> "로컬에서 `qms.conf` 파일을 수정해서 업로드해도 Certbot이 다시 바꿔버리는데, 수정하는 게 의미가 있나요?"

**답변:**

**Certbot 동작 방식:**
1. SSL 인증서 최초 발급 시에만 설정 파일 수정
2. HTTP 블록을 복제해서 HTTPS 블록 생성
3. SSL 설정 추가 (인증서 경로, SSL 프로토콜 등)
4. **이후에는 건드리지 않음!**

### ✅ 올바른 접근

**시나리오 1: 이미 SSL 설정된 서버**
```bash
# 서버의 실제 설정 파일을 직접 수정
ssh -i key.pem ubuntu@server
sudo nano /etc/nginx/sites-available/qms

# HTTP 블록 + HTTPS 블록 둘 다 수정
# location /admin/ → location /django-admin/

sudo nginx -t
sudo systemctl reload nginx
```

**시나리오 2: 새로 서버 구축**
```bash
# 로컬의 qms.conf 파일 미리 수정
# Git에 커밋

# 서버에서
git clone ...
cd QMS
sudo cp nginx/qms.conf /etc/nginx/sites-available/qms

# 그 다음 Certbot 실행
sudo certbot --nginx -d your-domain.com
```

### 📝 배운 점

> 💡 **Certbot은 한 번만 설정 파일 수정!**
> 
> - 이미 SSL 설정된 서버: 서버에서 직접 수정
> - 새 서버 구축: 로컬 설정 파일 준비 → Certbot 실행
> - 로컬 설정 파일도 업데이트 (버전 관리용)

---

## 🎓 배포 프로세스 요약

### 최초 배포 (한 번만)

```bash
# 1. 서버 초기 설정
ssh -i key.pem ubuntu@server
sudo apt update && sudo apt upgrade -y

# 2. Git clone
git clone https://github.com/your-repo/QMS.git
cd QMS

# 3. 환경변수 설정
cp .env.production.example .env
nano .env  # SECRET_KEY, 도메인 등 설정

# 4. Backend 설정
cd backend
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
uv sync
uv run python manage.py migrate
uv run python manage.py collectstatic --noinput
uv run python manage.py createsuperuser
uv run python manage.py seed_defect_data

# 5. Frontend 빌드 (로컬 PC에서)
cd frontend
npm install
npm run build

# 6. Frontend 업로드 (로컬 PC에서)
scp -i key.pem -r out ubuntu@server:~/QMS/frontend/
ssh -i key.pem ubuntu@server "chmod -R 755 ~/QMS/frontend/out"

# 7. Nginx 설정
sudo apt install nginx -y
sudo cp ~/QMS/nginx/qms.conf /etc/nginx/sites-available/qms
sudo ln -s /etc/nginx/sites-available/qms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 8. SSL 인증서 (Certbot)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 9. 서버에서 Nginx 설정 추가 수정
sudo nano /etc/nginx/sites-available/qms
# location /admin/ → location /django-admin/ (HTTP + HTTPS 블록)
sudo nginx -t
sudo systemctl reload nginx

# 10. Systemd 서비스
sudo cp ~/QMS/systemd/qms-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable qms-backend
sudo systemctl start qms-backend

# 11. 권한 설정
chmod 755 /home/ubuntu /home/ubuntu/QMS /home/ubuntu/QMS/frontend
chmod -R 755 /home/ubuntu/QMS/frontend/out

# 12. 확인
systemctl status qms-backend
systemctl status nginx
curl https://your-domain.com
```

---

### 일상 업데이트 (자동화)

```bash
# 로컬 PC에서 한 줄!
deploy_to_production.bat your-server-ip key.pem

# 자동으로:
# 1. Frontend 빌드
# 2. Git push
# 3. 서버 업로드
# 4. 권한 수정 ✨
# 5. Git pull
# 6. Nginx 설정 업데이트
# 7. Backend 의존성 업데이트
# 8. DB 마이그레이션
# 9. Static 파일 수집
# 10. 서비스 재시작
```

---

## 🚨 트러블슈팅 체크리스트

배포 후 문제 발생 시 순서대로 확인:

### 1. 서비스 상태 확인
```bash
systemctl status qms-backend
systemctl status nginx
```

### 2. 로그 확인
```bash
# Backend 로그
sudo journalctl -u qms-backend -n 50

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/access.log
```

### 3. 포트 확인
```bash
sudo ss -tlnp | grep -E '8000|80|443'
```

### 4. 파일 권한 확인
```bash
ls -la /home/ubuntu/QMS/frontend/out/
```

### 5. Nginx 설정 테스트
```bash
sudo nginx -t
```

### 6. 환경변수 확인
```bash
cat ~/QMS/.env | grep -E "FRONTEND_URL|CSRF_TRUSTED_ORIGINS"
```

### 7. 브라우저 개발자 도구
- F12 → Network 탭
- CORS 에러 확인
- API 호출 URL 확인 (127.0.0.1이 아닌 도메인인지)

---

## 📚 핵심 교훈

### 1. 메모리 관리
✅ 소규모 인스턴스는 로컬 빌드 + 서버 업로드
❌ 서버에서 직접 빌드 (메모리 부족 위험)

### 2. 권한 관리
✅ SCP 업로드 후 자동 권한 수정 스크립트
✅ 디렉토리는 `755` (실행 권한)
❌ 수동으로 매번 권한 설정

### 3. 환경변수 관리
✅ 환경변수 변경 시 반드시 재빌드
✅ Next.js Static Export는 빌드 시점 고정
❌ 환경변수 변경만으로 런타임 반영 기대

### 4. Nginx 설정
✅ 경로 충돌 주의 (`/admin/` vs `/admin/users/`)
✅ `limit_req_zone`은 `http` 블록
✅ Certbot 실행 후 서버 설정 직접 수정

### 5. 보안
✅ `.gitignore` 신중하게 관리
✅ 커밋 전 `git status` 확인
✅ 민감한 파일 절대 커밋 금지

### 6. 자동화
✅ 배포 스크립트로 실수 방지
✅ 권한, 재시작 등 자동화
✅ 트러블슈팅 시간 단축

---

## 🎯 다음 단계

이 문서를 마스터했다면:

1. ✅ `LIGHTSAIL_DEPLOY.md` - 전체 배포 가이드
2. ✅ `DEPLOY_QUICK_START.md` - 빠른 배포 가이드
3. ✅ `SECURITY_CHECKLIST.md` - 보안 체크리스트
4. ✅ 자동화 스크립트 활용
   - `deploy_to_production.bat` (Windows)
   - `deploy_to_production.sh` (Linux/Mac)
   - `update_production.sh` (서버)

---

**마지막 업데이트:** 2025-10-19

**작성자:** 실전 배포 경험을 바탕으로 정리

**피드백:** 추가 이슈 발생 시 이 문서에 계속 업데이트하세요!

