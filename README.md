# QMS (Quality Management System)

품질 관리 시스템 - 실적, 부적합, 고객 불만, KPI 목표 관리를 위한 통합 웹 애플리케이션

![Python](https://img.shields.io/badge/python-3.13+-blue.svg)
![Django](https://img.shields.io/badge/django-5.2.5-green.svg)
![Next.js](https://img.shields.io/badge/next.js-15.4.6-black.svg)

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [빠른 시작](#-빠른-시작)
- [문서](#-문서)
- [스크립트](#-스크립트)
- [프로젝트 구조](#-프로젝트-구조)

---

## 🎯 프로젝트 소개

QMS는 제조 및 서비스 기업의 품질 관리를 위한 종합 시스템입니다.

### 주요 목적
- 품질 관리 업무의 디지털화 및 자동화
- 실시간 데이터 분석 및 시각화
- 품질 지표 추적 및 개선 활동 지원

### 사용 환경
- **배포**: Windows PC (사내), AWS Lightsail (클라우드)
- **접근**: 로컬 네트워크 또는 인터넷
- **사용자**: 사내 품질 관리팀

---

## ✨ 주요 기능

### 1. 사용자 관리
- 회원가입 및 로그인 (JWT 인증)
- 역할 기반 접근 제어 (관리자/일반 사용자)

### 2. 실적 관리
- 생산자/공급업체별 실적 등록
- CSV 파일 일괄 업로드
- 실적 통계 및 차트 시각화

### 3. 부적합 관리
- 부적합 사항 등록 및 추적
- 심각도별 분류 및 상태 관리
- 시정 조치 및 예방 조치 기록

### 4. 고객 불만 관리
- 고객 불만 접수 및 처리
- 우선순위 및 상태 관리

### 5. KPI 목표 관리
- 월별 KPI 목표 설정 및 추적
- 목표 대비 실적 비교
- 달성률 시각화

### 6. 대시보드
- 주요 지표 실시간 모니터링
- 차트 및 그래프 시각화

### 7. 일정 관리
- 품질 관련 일정 등록 (감사/교육/회의/검사)

### 8. 포스트잇 보드
- 아이디어 및 메모 공유
- 팀 협업 도구

### 9. 감사 로그
- 모든 중요 작업 기록
- 사용자 활동 추적

---

## 🛠 기술 스택

### Backend
- **Framework**: Django 5.2.5
- **API**: Django REST Framework 3.16.1
- **ASGI Server**: Uvicorn 0.34+ (Windows/Linux 모두 지원)
- **인증**: JWT (Simple JWT 5.5.1)
- **데이터베이스**: SQLite3 (WAL 모드)
- **Static**: WhiteNoise 6.8+
- **백업**: boto3 (AWS S3 지원)

### Frontend
- **Framework**: Next.js 15.4.6 (React 19.1.0)
- **배포**: Static Export (Nginx 서빙)
- **언어**: TypeScript 5.9.3
- **스타일링**: Tailwind CSS 3.4.17
- **HTTP**: Axios 1.11.0
- **차트**: Recharts 3.2.1

### 도구
- **패키지 관리**: uv (Python), npm (Node.js)
- **버전 관리**: Git

---

## 🚀 빠른 시작

### 사전 준비

- Python 3.13+
- Node.js 20.x+
- uv
- Git

### 설치 및 실행

```cmd
REM 1. 저장소 복제
git clone <repository-url>
cd qms

REM 2. 환경 변수 설정
copy .env.example .env
notepad .env    # SECRET_KEY, ALLOWED_HOSTS 수정

REM 3. 배포
deploy.bat

REM 4. 관리자 생성
create_admin.bat

REM 5. 서버 시작
start_server.bat
```

**접속**: http://localhost:3000

---

## 📚 문서

### 주요 가이드

| 문서 | 용도 | 대상 |
|-----|------|------|
| **[DEV_GUIDE.md](DEV_GUIDE.md)** | 개발 환경 설정 및 유지보수 | 개발자 |
| **[PROD_GUIDE.md](PROD_GUIDE.md)** | Windows PC 배포 및 관리 | 관리자 |
| **[LIGHTSAIL_DEPLOY.md](LIGHTSAIL_DEPLOY.md)** | AWS Lightsail Ubuntu 배포 가이드 | 관리자/DevOps |

### 상세 문서

- `docs/` 폴더: 각 앱별 상세 문서
  - 사용자 관리, 실적 관리, 부적합 관리, etc.

---

## 🔧 스크립트

### Windows 스크립트

#### 초기 설정
| 스크립트 | 용도 |
|---------|------|
| `deploy.bat` | 초기 배포 및 업데이트 (의존성, 마이그레이션, 빌드) |
| `create_admin.bat` | 관리자 계정 생성 |

#### 서버 관리
| 스크립트 | 용도 |
|---------|------|
| `start_server.bat` | 서버 시작 (Uvicorn + Next.js) |
| `stop_server.bat` | 서버 중지 |

#### 유지보수
| 스크립트 | 용도 |
|---------|------|
| `backup.bat` | 데이터 백업 |
| `update_system.bat` | Git pull → 재배포 |

### Linux 스크립트

#### 초기 설정
| 스크립트 | 용도 |
|---------|------|
| `deploy.sh` | 초기 배포 및 업데이트 (의존성, 마이그레이션, 빌드) |

#### 서버 관리
| 스크립트 | 용도 |
|---------|------|
| `start_server.sh` | 서버 시작 (또는 systemd 서비스) |
| `stop_server.sh` | 서버 중지 |

#### 유지보수
| 스크립트 | 용도 |
|---------|------|
| `backup.sh` | 데이터 백업 (로컬 + S3) |
| `deploy_frontend.sh` | Frontend 빌드 및 서버 업로드 (로컬 PC용) |

#### 배포 스크립트
| 파일 | 설명 |
|-------------|------|
| `deploy_to_production.bat` | 🔥 **Windows용 원클릭 배포 스크립트** |
| `deploy_to_production.sh` | 🔥 **Linux/Mac용 원클릭 배포 스크립트** |
| `update_production.sh` | 서버용 업데이트 자동화 스크립트 |
| `deploy_frontend.sh` | Frontend만 빠르게 배포 |

#### 설정 파일
| 디렉토리/파일 | 용도 |
|-------------|------|
| `systemd/qms-backend.service` | Systemd 서비스 파일 |
| `nginx/qms.conf` | Nginx 설정 파일 |
| `.env.production.example` | 프로덕션 환경변수 템플릿 |

#### 문서
| 문서 | 설명 |
|-------------|------|
| `LIGHTSAIL_DEPLOY.md` | AWS Lightsail 전체 배포 가이드 |
| `DEPLOY_QUICK_START.md` | 🚀 **빠른 배포 가이드 (자동화 스크립트 사용법)** |
| `PROD_GUIDE.md` | 프로덕션 환경 일반 가이드 |

### 💡 1GB RAM 인스턴스 배포 팁

Next.js 빌드는 메모리를 많이 사용합니다. 1GB RAM Lightsail 인스턴스에서는:

**권장 방법: 로컬 빌드**
```bash
# 로컬 PC에서
cd frontend && npm run build

# 서버로 전송 (자동 스크립트)
./deploy_frontend.sh your-server-ip your-key.pem
```

**대안: Swap 메모리 추가**
```bash
# 서버에서
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 🚀 자동화된 배포

### 전체 프로덕션 배포 (권장)

로컬에서 빌드 → Git Push → 서버 업로드 → 설정 적용을 자동화:

**Windows:**
```cmd
deploy_to_production.bat your-server-ip C:\path\to\key.pem
```

**Linux/Mac:**
```bash
chmod +x deploy_to_production.sh
./deploy_to_production.sh your-server-ip ~/.ssh/key.pem
```

**수행 작업:**
1. Frontend 빌드 (로컬)
2. Git push
3. Frontend 파일 서버 업로드
4. **파일 권한 자동 수정** (SCP 권한 문제 해결)
5. 서버에서 Git pull
6. Nginx 설정 자동 업데이트
7. Backend 의존성 업데이트
8. DB 마이그레이션
9. Static 파일 수집
10. 서비스 재시작

> 💡 **SCP 업로드 후 발생하는 권한 문제를 자동으로 해결합니다!**

### Frontend만 업데이트

```bash
./deploy_frontend.sh your-server-ip your-key.pem
```

### 서버에서 수동 업데이트

```bash
# 서버에 SSH 접속 후
cd ~/QMS
git pull
./update_production.sh
```

---

## 📂 프로젝트 구조

```
qms/
├── backend/                    # Django 백엔드
│   ├── accounts/              # 사용자 관리
│   ├── performance/           # 실적 관리
│   ├── nonconformance/        # 부적합 관리
│   ├── customer_complaints/   # 고객 불만
│   ├── kpi_targets/           # KPI 목표
│   ├── dashboard/             # 대시보드
│   ├── schedules/             # 일정 관리
│   ├── sticky_notes/          # 포스트잇
│   ├── audit/                 # 감사 로그
│   ├── backend/settings.py    # Django 설정
│   ├── uvicorn_config.py      # Uvicorn 설정 (ASGI)
│   └── enable_wal.py          # WAL 모드 스크립트
│
├── frontend/                   # Next.js 프론트엔드
│   ├── app/                   # 페이지 라우팅
│   ├── components/            # React 컴포넌트
│   ├── contexts/              # Context API
│   └── lib/                   # 유틸리티
│
├── docs/                       # 프로젝트 문서
│
├── .env                        # 환경 변수 (Git 제외)
├── .env.example                # 환경 변수 템플릿
├── .gitignore                  # Git 제외 설정
├── pyproject.toml              # Python 의존성
├── Caddyfile                   # Caddy 설정 (선택)
│
├── deploy.bat                  # 배포 스크립트
├── start_server.bat            # 서버 시작
├── stop_server.bat             # 서버 중지
├── backup.bat                  # 백업
├── create_admin.bat            # 관리자 생성
├── update_system.bat           # 시스템 업데이트
│
├── DEV_GUIDE.md                # 개발 가이드
├── PROD_GUIDE.md               # 운영 가이드
└── README.md                   # 본 파일
```

---

## 🔒 보안

### Git 커밋 금지 파일

`.gitignore`에 설정된 민감한 파일:
- `.env` (환경 변수)
- `backend/db.sqlite3` (데이터베이스)
- `*.log` (로그 파일)
- `node_modules/` (패키지)

### 운영 환경 필수 설정

1. `.env` 파일의 `SECRET_KEY` 변경
2. `.env` 파일의 `DEBUG=False` 설정
3. `ALLOWED_HOSTS`에 올바른 IP 추가
4. 강력한 관리자 비밀번호 설정
5. 정기적인 백업 수행

---

## 📞 지원

### 문제 해결

- **개발 환경**: [DEV_GUIDE.md](DEV_GUIDE.md) → "9. 문제 해결" 참조
- **운영 환경**: [PROD_GUIDE.md](PROD_GUIDE.md) → "9. 문제 해결" 참조

### 긴급 상황

1. 로그 확인: Uvicorn 콘솔 창 확인
2. 서버 재시작: `stop_server.bat` → `start_server.bat`
3. 백업 복원: `backups/` 폴더에서 최신 백업 사용

---

## 📄 라이선스

사내 사용 전용 프로젝트

---

**버전**: 1.0.0  
**최종 업데이트**: 2025-10-07
