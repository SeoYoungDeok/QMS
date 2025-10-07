# QMS 개발 환경 설정 가이드

로컬 개발 및 유지보수를 위한 환경 설정 가이드입니다.

---

## 1. 사전 준비

### 필수 소프트웨어 설치

| 소프트웨어 | 버전 | 다운로드 |
|-----------|------|---------|
| Python | 3.13+ | https://www.python.org/downloads/ |
| Node.js | 20.x+ | https://nodejs.org/ |
| uv | latest | PowerShell: `irm https://astral.sh/uv/install.ps1 \| iex` |
| Git | latest | https://git-scm.com/ |

**설치 확인**:
```cmd
python --version
node --version
uv --version
git --version
```

---

## 2. 프로젝트 설정

### 2.1 저장소 복제

```cmd
git clone <repository-url>
cd qms
```

### 2.2 환경 변수 설정

```cmd
copy .env.example .env
notepad .env
```

`.env` 파일 수정:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:3000
```

**SECRET_KEY 생성**:
```cmd
cd backend
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2.3 Backend 설정

```cmd
cd backend

REM 의존성 설치
uv sync

REM 데이터베이스 마이그레이션
uv run python manage.py migrate

REM SQLite WAL 모드 활성화
uv run python enable_wal.py

REM Static 파일 수집
uv run python manage.py collectstatic --noinput

REM 관리자 계정 생성
uv run python create_admin.py

cd ..
```

### 2.4 Frontend 설정

```cmd
cd frontend

REM 의존성 설치
npm install

cd ..
```

---

## 3. 개발 서버 실행

### 3.1 Backend 실행 (별도 터미널)

```cmd
cd backend
uv run python manage.py runserver
```
→ **Backend**: http://localhost:8000

### 3.2 Frontend 실행 (별도 터미널)

```cmd
cd frontend
npm run dev
```
→ **Frontend**: http://localhost:3000 (메인 접속)

---

## 4. 개발 작업

### 코드 수정

- **Backend**: `backend/` 폴더 내 Django 코드 수정
- **Frontend**: `frontend/app/` 폴더 내 Next.js 코드 수정

수정 시 자동 리로드됩니다.

### 데이터베이스 마이그레이션

모델 변경 후:
```cmd
cd backend
uv run python manage.py makemigrations
uv run python manage.py migrate
```

### 새 앱 추가

```cmd
cd backend
uv run python manage.py startapp <app_name>
```

`backend/backend/settings.py`의 `INSTALLED_APPS`에 추가.

---

## 5. 테스트

### Backend 테스트

```cmd
cd backend
uv run python manage.py test
```

### Frontend 테스트

```cmd
cd frontend
npm run lint
```

---

## 6. Git 작업

### 변경사항 커밋

```cmd
git add .
git commit -m "작업 내용"
git push origin main
```

### ⚠️ GitHub 업로드 주의사항

**절대 커밋하면 안 되는 파일** (`.gitignore`에 설정됨):
- `.env` (환경 변수)
- `backend/db.sqlite3` (데이터베이스)
- `*.log` (로그 파일)
- `node_modules/` (패키지)

커밋 전 확인:
```cmd
git status
```

---

## 7. 문제 해결

### 포트 충돌

```cmd
REM 포트 8000 사용 프로세스 확인
netstat -ano | findstr :8000

REM 프로세스 종료
taskkill /F /PID <프로세스ID>
```

### 패키지 오류

```cmd
REM Backend
cd backend
uv sync --reinstall

REM Frontend
cd frontend
rmdir /s /q node_modules
npm install
```

### 데이터베이스 초기화

```cmd
cd backend
del db.sqlite3
del db.sqlite3-wal
del db.sqlite3-shm
uv run python manage.py migrate
uv run python create_admin.py
```

---

## 8. 유용한 명령어

### Backend

```cmd
cd backend

REM Django Shell
uv run python manage.py shell

REM 슈퍼유저 생성
uv run python manage.py createsuperuser

REM 데이터 덤프
uv run python manage.py dumpdata > data.json

REM 데이터 로드
uv run python manage.py loaddata data.json
```

### Frontend

```cmd
cd frontend

REM 개발 서버
npm run dev

REM 프로덕션 빌드
npm run build

REM 프로덕션 실행
npm start
```

---

## 9. 프로젝트 구조

```
qms/
├── backend/                      # Django 백엔드
│   ├── accounts/                # 사용자 관리
│   ├── performance/             # 실적 관리
│   ├── nonconformance/          # 부적합 관리
│   ├── customer_complaints/     # 고객 불만
│   ├── kpi_targets/             # KPI 목표
│   ├── dashboard/               # 대시보드
│   ├── schedules/               # 일정 관리
│   ├── sticky_notes/            # 포스트잇
│   ├── audit/                   # 감사 로그
│   ├── backend/settings.py      # Django 설정
│   ├── manage.py                # Django 관리
│   ├── gunicorn_config.py       # Gunicorn 설정
│   └── enable_wal.py            # WAL 모드 스크립트
│
├── frontend/                     # Next.js 프론트엔드
│   ├── app/                     # 페이지 라우팅
│   ├── components/              # React 컴포넌트
│   ├── contexts/                # Context API
│   └── lib/                     # 유틸리티
│
├── .env                         # 환경 변수 (Git 제외)
├── .env.example                 # 환경 변수 템플릿
├── pyproject.toml               # Python 의존성
└── README.md                    # 프로젝트 개요
```

---

## 10. 참고 문서

- **PROD_GUIDE.md**: 운영 환경 배포 가이드
- **README.md**: 프로젝트 전체 개요
- **docs/**: 각 앱별 상세 문서

---

**개발 환경 설정 완료!** 🎉

다음 단계: 운영 배포는 `PROD_GUIDE.md`를 참조하세요.

