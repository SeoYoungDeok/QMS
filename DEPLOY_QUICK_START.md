# 🚀 QMS 프로덕션 배포 빠른 시작 가이드

이 문서는 **이미 설정된 서버**에 업데이트를 배포하는 방법을 설명합니다.

---

## 📋 사전 조건

- ✅ AWS Lightsail 인스턴스 생성 및 설정 완료
- ✅ Nginx, Systemd 서비스 설정 완료
- ✅ SSL 인증서 설정 완료
- ✅ SSH 키 준비됨

> 💡 최초 설정은 [`LIGHTSAIL_DEPLOY.md`](./LIGHTSAIL_DEPLOY.md)를 참고하세요.

---

## ⚡ 원클릭 배포 (자동화 스크립트)

### Windows

```cmd
deploy_to_production.bat your-server-ip C:\path\to\key.pem
```

### Linux/Mac

```bash
chmod +x deploy_to_production.sh
./deploy_to_production.sh your-server-ip ~/.ssh/key.pem
```

**예시:**
```cmd
deploy_to_production.bat 54.180.123.45 C:\Users\myname\lightsail-key.pem
```

### 자동 수행 작업

1. ✅ Git 상태 확인
2. ✅ Frontend 로컬 빌드 (Next.js Static Export)
3. ✅ Git push (선택)
4. ✅ 빌드 파일 서버 업로드 (SCP)
5. ✅ **파일 권한 자동 수정** (`chmod -R 755`)
6. ✅ 서버에서 Git pull
7. ✅ Nginx 설정 자동 업데이트
8. ✅ Backend Python 의존성 업데이트 (uv sync)
9. ✅ 데이터베이스 마이그레이션
10. ✅ Django Static 파일 수집
11. ✅ Backend 서비스 재시작 (qms-backend)
12. ✅ Nginx 재시작

**소요 시간:** 약 3-5분

> 💡 **SCP 업로드 시 권한 문제가 자동으로 해결됩니다!**

---

## 🎯 시나리오별 배포

### 1. Frontend만 업데이트

프론트엔드 UI 또는 컴포넌트만 수정한 경우:

```bash
./deploy_frontend.sh your-server-ip your-key.pem
```

**수행 작업:**
- Frontend 빌드
- 서버 업로드
- Nginx 재시작

**소요 시간:** 약 1-2분

---

### 2. Backend만 업데이트

API 로직, 모델, 설정만 수정한 경우:

**서버에서 실행:**
```bash
ssh -i your-key.pem ubuntu@your-server-ip
cd ~/QMS
git pull
./update_production.sh
```

**수행 작업:**
- Git pull
- Python 의존성 업데이트
- DB 마이그레이션
- Static 파일 수집
- Backend 재시작

**소요 시간:** 약 2-3분

---

### 3. Frontend + Backend (전체 업데이트)

Frontend와 Backend를 모두 수정한 경우:

```bash
./deploy_to_production.sh your-server-ip your-key.pem
```

**소요 시간:** 약 3-5분

---

## 🛠️ 서버 관리 명령어

### 서비스 상태 확인

```bash
# Backend 상태
sudo systemctl status qms-backend

# Nginx 상태
sudo systemctl status nginx
```

### 로그 확인

```bash
# Backend 실시간 로그
sudo journalctl -u qms-backend -f

# Backend 최근 50줄
sudo journalctl -u qms-backend -n 50

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/access.log
```

### 서비스 재시작

```bash
# Backend 재시작
sudo systemctl restart qms-backend

# Nginx 재시작
sudo systemctl reload nginx

# 둘 다 재시작
sudo systemctl restart qms-backend && sudo systemctl reload nginx
```

### Nginx 설정 테스트

```bash
sudo nginx -t
```

---

## 🔍 배포 후 확인 사항

### 1. 서비스 정상 작동 확인

```bash
# Backend 서비스
systemctl is-active qms-backend
# 출력: active

# Nginx 서비스
systemctl is-active nginx
# 출력: active
```

### 2. API 응답 확인

```bash
curl https://your-domain.com/api/
```

예상 응답: `{"detail":"자격 인증 데이터가 제공되지 않았습니다."}` (정상)

### 3. Frontend 접속 확인

브라우저에서 확인:
- https://your-domain.com
- 로그인 페이지가 정상적으로 표시되어야 함

### 4. 브라우저 개발자 도구 확인

`F12` → Console 탭:
- ❌ CORS 에러가 없어야 함
- ❌ 404 에러가 없어야 함
- ✅ API 호출이 `https://your-domain.com/api/`로 가야 함

---

## ⚠️ 트러블슈팅

### 502 Bad Gateway

**원인:** Backend 서비스가 중단됨

**해결:**
```bash
sudo systemctl restart qms-backend
sudo journalctl -u qms-backend -n 50
```

### 404 Not Found (Frontend)

**원인:** Frontend 파일이 없거나 권한 문제

**해결:**
```bash
# 파일 존재 확인
ls -la ~/QMS/frontend/out/

# 권한 설정 (자동화 스크립트는 이미 처리하지만, 수동 시 필요)
chmod -R 755 ~/QMS/frontend/out

# 디렉토리 권한도 확인 (한 번만 실행)
chmod 755 /home/ubuntu /home/ubuntu/QMS /home/ubuntu/QMS/frontend
```

> 💡 **자동화 스크립트를 사용하면 권한 문제가 자동으로 해결됩니다!**

### CORS 에러

**원인:** `.env` 설정 또는 Frontend 빌드 문제

**해결:**
```bash
# .env 확인
cat ~/QMS/.env | grep FRONTEND_URL
cat ~/QMS/.env | grep CSRF_TRUSTED_ORIGINS

# 올바른 값:
# FRONTEND_URL=https://your-domain.com
# CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

Frontend 재빌드 필요:
```bash
# 로컬 PC에서
cd frontend
rm -rf out .next node_modules/.cache
npm run build
```

### ERR_TOO_MANY_REDIRECTS

**원인:** Nginx 설정 문제

**해결:**
```bash
# Nginx 설정 확인
sudo nginx -t

# 설정 복원
cd ~/QMS
git pull
sudo cp nginx/qms.conf /etc/nginx/sites-available/qms
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 모니터링

### 디스크 사용량

```bash
df -h
```

### 메모리 사용량

```bash
free -h
```

### 프로세스 상태

```bash
htop
```

### 데이터베이스 백업 확인

```bash
ls -lh ~/QMS/backend/backups/
```

---

## 🔄 롤백 (이전 버전으로 복구)

### Git 롤백

```bash
cd ~/QMS
git log --oneline  # 커밋 해시 확인
git checkout <commit-hash>
./update_production.sh
```

### Nginx 설정 롤백

```bash
# 백업 파일 확인
ls -lt /etc/nginx/sites-available/qms.backup.*

# 복원
sudo cp /etc/nginx/sites-available/qms.backup.YYYYMMDD_HHMMSS /etc/nginx/sites-available/qms
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📞 추가 지원

- 📘 **전체 배포 가이드:** [`LIGHTSAIL_DEPLOY.md`](./LIGHTSAIL_DEPLOY.md)
- 📗 **프로덕션 가이드:** [`PROD_GUIDE.md`](./PROD_GUIDE.md)
- 📕 **개발 가이드:** [`DEV_GUIDE.md`](./DEV_GUIDE.md)

---

**마지막 업데이트:** 2025-10-18

