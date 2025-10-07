# QMS 시스템 개발 계획

## 📊 프로젝트 개요
- **목적**: Quality Management System (QMS) 웹 애플리케이션 개발
- **기술 스택**: Django (Backend) + Next.js (Frontend)
- **패키지 관리**: uv (Python)
- **권한 시스템**: 3단계 (Guest=0, Practitioner=1, Admin=2)

---

## 🏗️ 1단계: 백엔드 기반 구조 구축

### 1.1 Django 프로젝트 설정
- [x] Django 기본 설정 확인 및 업데이트
- [x] CORS 설정 (Django-CORS-Headers)
- [x] Django REST Framework 설정
- [x] JWT 인증 설정 (djangorestframework-simplejwt)
- [x] 환경변수 설정 (settings.py 직접 설정)

### 1.2 데이터베이스 모델 설계
- [x] Users 모델 생성 (회원가입/로그인용)
  - id, username, password_hash, name, department, position
  - phone_number, role_level, status, failed_attempts
  - last_failed_at, created_at, updated_at, last_login_at
- [x] AuditLogs 모델 생성 (감사 로그용)
  - id, user_id, action, target_id, details, ip_address, created_at
- [x] 마이그레이션 파일 생성 및 적용

### 1.3 사용자 인증 API 개발
- [x] 회원가입 API (`POST /api/signup`)
  - 비밀번호 해시화 (BCrypt)
  - 아이디 중복 체크
  - 기본값 설정 (role_level=0, status=locked)
- [x] 아이디 중복 체크 API (`GET /api/users/check-username`)
- [x] 로그인 API (`POST /api/login`)
  - JWT 토큰 발급
  - 로그인 실패 횟수 관리
  - 계정 잠금 로직 (5회 실패 시)
  - 감사 로그 기록
  - **개선됨**: 계정 상태별 구체적 에러 메시지 제공

### 1.4 사용자 관리 API 개발 (관리자용)
- [x] 사용자 목록 조회 API (`GET /api/users`)
  - 필터링 (부서, 직급, 권한, 상태)
  - 페이징 처리
- [x] 사용자 상세 조회 API (`GET /api/users/{id}`)
- [x] 사용자 정보 수정 API (`PUT /api/users/{id}`)
- [x] 사용자 추가 API (`POST /api/users`)
- [x] 사용자 삭제 API (`DELETE /api/users/{id}`)
  - 논리적 삭제 (status=deleted)
  - **개선됨**: 자기 자신 삭제 방지 로직 추가
- [x] 비밀번호 초기화 API (`POST /api/users/{id}/reset-password`)

### 1.5 권한 및 보안 미들웨어
- [x] JWT 인증 미들웨어 (CustomJWTAuthentication)
- [x] 권한 확인 로직 (views에서 role_level 체크)
- [x] IP 주소 추적 (AuditLog에 ip_address 기록)
- [x] 감사 로그 자동 기록 (수동 로그 기록 구현)

---

## 🎨 2단계: 프론트엔드 기반 구조 구축

### 2.1 Next.js 프로젝트 설정
- [x] Tailwind CSS 설정 확인 (v3.4.0으로 다운그레이드)
- [x] 디자인 토큰 정의 (colors, spacing, typography)
- [x] 폰트 설정 (Pretendard CDN 로딩)
- [x] API 클라이언트 설정 (axios with JWT interceptors)

### 2.2 인증 시스템 구현
- [x] JWT 토큰 관리 (localStorage)
- [x] 인증 Context 생성 (AuthContext)
- [x] Protected Route 컴포넌트 (AuthContext 내장)
- [x] 자동 토큰 갱신 로직 (axios interceptors)

### 2.3 공통 컴포넌트 개발
- [ ] Layout 컴포넌트 (좌측 내비 + 상단 툴바)
- [x] Card 컴포넌트
- [x] Button 컴포넌트 (Primary/Secondary/Danger)
- [x] Input 컴포넌트 (폼 입력)
- [x] Badge/Chip 컴포넌트 (상태 표시)
- [x] Table 컴포넌트 (필터링/정렬/페이징)
- [x] Modal/Dialog 컴포넌트
- [x] Select 컴포넌트
- [ ] Toast 알림 시스템
- **개선됨**: 실적 관리 페이지에서 Table 컴포넌트 활용

---

## 🔐 3단계: 인증 페이지 개발

### 3.1 회원가입 페이지
- [x] 회원가입 폼 UI 구현
  - 아이디, 비밀번호, 이름, 부서, 직급, 핸드폰 번호
- [x] 실시간 아이디 중복 체크
- [x] 비밀번호 정책 검증 (프론트엔드)
- [x] 폼 유효성 검사
- [x] 회원가입 API 연동
- [x] 성공 시 로그인 페이지로 이동

### 3.2 로그인 페이지
- [x] 로그인 폼 UI 구현
- [x] 로그인 API 연동
- [x] JWT 토큰 저장
- [x] 로그인 실패 처리 (에러 메시지)
- [x] 계정 잠금 상태 안내
- [x] 성공 시 대시보드로 이동
- **개선됨**: 계정 상태별 구체적 에러 메시지 표시

---

## 👥 4단계: 사용자 관리 시스템 개발

### 4.1 사용자 관리 페이지 (관리자 전용)
- [x] 사용자 목록 테이블 구현
  - 컬럼: ID, 아이디, 이름, 부서, 직급, 권한, 상태, 가입일
- [x] 검색/필터 기능
  - 부서, 직급, 권한 레벨, 계정 상태별 필터
- [ ] 페이징 처리 (기본 구조만 구현됨)
- [ ] 정렬 기능
- [ ] CSV/XLSX 내보내기 기능
- **개선됨**: 권한 없는 사용자에게 명확한 접근 제한 메시지 표시

### 4.2 사용자 상세 관리
- [x] 사용자 상세 모달/페이지 (테이블 인라인 편집)
- [x] 사용자 정보 수정 폼
  - 부서, 직급, 핸드폰 번호, 권한 레벨, 계정 상태
- [x] 비밀번호 초기화 기능
- [ ] 감사 로그 보기 기능
- [ ] 실시간 업데이트

### 4.3 사용자 추가/삭제
- [x] 신규 사용자 추가 모달
- [x] 사용자 삭제 확인 다이얼로그
- [x] 논리적 삭제 처리
- **개선됨**: 사용자 삭제 기능 수정 및 자기 자신 삭제 방지
- [ ] 벌크 작업 (다중 선택)

## 🏠 메인 대시보드 페이지
- [x] 사용자 정보 표시 (이름, 부서, 직급, 권한)
- [x] 권한별 기능 카드 표시
- [x] 사용자 관리 페이지 링크 (관리자용)
- [x] 실적 관리 페이지 링크 (권한별 접근 제어)
- **개선됨**: Guest 권한(role_level=0) 표시 오류 수정
- **개선됨**: 권한 없는 사용자도 사용자 관리 버튼 표시하되 클릭 시 권한 안내
- **개선됨**: 실적 관리 기능 카드 추가 및 권한별 접근 제어

---

## 📈 5단계: 실적 관리 시스템 개발

### 5.1 데이터베이스 모델 설계
- [x] PerformanceRecord 모델 생성
  - id, record_uid (ULID), type, date, vendor, product_name
  - control_no, quantity, producer, weekday_code
  - created_by, created_at, updated_at
- [x] 마이그레이션 파일 생성 및 적용

### 5.2 실적 등록 API 개발
- [x] 단일 실적 등록 API (`POST /api/performance`)
  - 사내 실적(inhouse) / 수입검사 실적(incoming) 지원
  - 요일 자동 계산 (weekday_code)
  - ULID 기반 record_uid 생성
  - 입력 데이터 검증 (date, quantity ≥ 1, producer 필수)
- [x] 일괄 실적 등록 API (`POST /api/performance/bulk`)
  - JSON 데이터 기반 일괄 등록
  - 부분 저장 / 전체 롤백 트랜잭션 옵션
  - 행별 검증 결과 및 오류 정보 반환
- [x] CSV 파일 업로드 API (`POST /api/performance/csv-upload`)
  - CSV 파싱 및 검증
  - 파일 크기 제한 (5MB)
  - 최대 1,000행 처리
- [x] 템플릿 다운로드 API (`GET /api/performance/template`)
  - 통합 템플릿 제공 (사내/수입검사 예시 포함)
  - CSV 형식으로 예시 데이터 포함

### 5.3 실적 조회 및 관리 API
- [x] 실적 목록 조회 API (`GET /api/performance/list`)
  - 필터링 (날짜 범위, 타입, 업체명, 생산처, 요일)
  - 페이징 처리 및 정렬
  - 검색 기능 (품명, 관리번호, 업체명)
- [x] 실적 상세 조회 API (`GET /api/performance/{id}`)
- [x] 실적 수정 API (`PUT /api/performance/{id}/update`)
- [x] 실적 삭제 API (`DELETE /api/performance/{id}/delete`)
- [x] 실적 일괄 삭제 API (`POST /api/performance/bulk-delete`)

### 5.4 권한 및 감사 로그
- [x] 권한별 접근 제어
  - Guest(0): 조회 전용, 템플릿 다운로드만 가능
  - Practitioner(1): 모든 실적 CRUD
  - Admin(2): 모든 기능 + 감사 로그 열람
- [x] 감사 로그 기록
  - CREATE_PERFORMANCE, BULK_CREATE_PERFORMANCE, BULK_CREATE_PERFORMANCE_CSV
  - UPDATE_PERFORMANCE, DELETE_PERFORMANCE, BULK_DELETE_PERFORMANCE

### 5.5 프론트엔드 실적 등록 페이지
- [x] 탭 기반 UI 구성 (단일 등록 / 일괄 등록 / 실적 목록)
- [x] 단일 등록 폼
  - 실적 타입 토글 (사내/수입검사)
  - 타입별 필드 자동 전환
  - 실시간 폼 검증
  - 등록 성공 메시지
- [x] 일괄 등록 기능
  - 파일 업로드 (CSV)
  - 템플릿 다운로드 버튼
  - JSON 데이터 직접 입력 옵션
  - 행별 검증 결과 표시
  - 트랜잭션 옵션 선택 (전체 롤백 / 부분 저장)

### 5.6 실적 조회 및 관리 페이지
- [x] 실적 목록 테이블
  - 컬럼: 타입, 실적일, 업체명, 품명, 관리번호, 수량, 생산처, 요일, 작성자
- [x] 검색 및 필터 기능
  - 날짜 범위 선택 (시작일, 종료일)
  - 타입, 생산처, 요일별 필터
  - 품명, 관리번호, 업체명 검색
- [x] 실적 수정/삭제 기능 (인라인 편집)
- [x] 다중 선택 및 일괄 삭제 기능
- [ ] 실적 데이터 내보내기 (CSV/XLSX)
- [ ] 페이징 처리 완성

---

## 📊 6단계: 감사 로그 시스템

### 6.1 감사 로그 기록 확장
- [x] 기본 감사 로그 기록 시스템 (사용자 관리용)
- [x] 실적 관리 감사 로그 추가
  - 실적 등록/수정/삭제
  - 일괄 등록 결과 (JSON/CSV)
  - 일괄 삭제 결과
- [x] 상세 정보 기록 (변경 전/후 값)

### 6.2 감사 로그 조회
- [ ] 감사 로그 목록 페이지
- [ ] 로그 필터링 (날짜, 액션, 사용자)
- [ ] 로그 검색 기능
- [ ] 로그 내보내기 기능

---

## 🎯 7단계: 권한 시스템 및 보안

### 7.1 권한 기반 접근 제어 확장
- [x] 기본 권한 시스템 구현 (사용자 관리용)
  - Guest (role_level=0): 읽기 전용
  - Practitioner (role_level=1): CRUD 가능
  - Admin (role_level=2): 모든 기능 + 관리자 페이지
- [x] 실적 관리 권한 적용
  - Guest: 조회 및 템플릿 다운로드만
  - Practitioner: 모든 실적 CRUD
  - Admin: 모든 기능 + 감사 로그
- [x] 권한별 UI 요소 제어 확장
- [x] API 엔드포인트 권한 검증 강화

### 7.2 보안 강화
- [ ] HTTPS 설정
- [ ] CSRF 보호
- [ ] XSS 방지
- [ ] SQL Injection 방지
- [ ] Rate Limiting
- [ ] 세션 타임아웃
- [ ] 파일 업로드 보안 (CSV/XLSX 검증)

---

## 🎨 8단계: 디자인 시스템 적용

### 8.1 디자인 토큰 구현
- [x] 기본 색상 시스템 (베이스/포인트/의미색)
- [x] 기본 타이포그래피 시스템
- [x] 기본 간격 시스템 (4, 8, 12, 16, 24, 32, 48, 64)
- [x] 기본 그림자/라운드 시스템
- [ ] 실적 관리 페이지 디자인 적용

### 8.2 반응형 디자인
- [ ] 모바일 최적화 (768px 이하)
- [ ] 태블릿 최적화 (768px~1024px)
- [ ] 데스크톱 최적화 (1024px 이상)
- [ ] 실적 테이블 반응형 처리

### 8.3 접근성 (A11y)
- [ ] WCAG AA 준수
- [ ] 키보드 내비게이션
- [ ] 스크린 리더 지원
- [ ] 색상 대비 확인
- [ ] Focus Ring 적용

---

## 🧪 9단계: 테스트 및 최적화

### 9.1 백엔드 테스트
- [ ] 유닛 테스트 (모델, 뷰, 시리얼라이저)
- [ ] API 테스트 (Django Test Client)
- [ ] 인증/권한 테스트
- [ ] 실적 관리 API 테스트
- [ ] 파일 업로드/파싱 테스트
- [ ] 성능 테스트 (일괄 등록 1,000행 < 10s)

### 9.2 프론트엔드 테스트
- [ ] 컴포넌트 테스트 (Jest/React Testing Library)
- [ ] E2E 테스트 (Playwright/Cypress)
- [ ] 파일 업로드 UI 테스트
- [ ] 접근성 테스트
- [ ] 성능 최적화

### 9.3 통합 테스트
- [ ] API 연동 테스트
- [ ] 인증 플로우 테스트
- [ ] 권한 시스템 테스트
- [ ] 실적 등록/조회 플로우 테스트
- [ ] 크로스 브라우저 테스트

---



## ⚠️ 보안/성능/접근성 체크리스트

### 보안 리스크
- [ ] 비밀번호 평문 저장 방지 (BCrypt 해시화)
- [ ] JWT 토큰 안전한 저장 (httpOnly 쿠키 권장)
- [ ] 로그인 시도 제한 (5회 실패 시 계정 잠금)
- [ ] HTTPS 강제 사용
- [ ] SQL Injection 방지 (ORM 사용)
- [ ] XSS 방지 (입력값 검증/이스케이프)

### 성능 리스크
- [ ] 데이터베이스 인덱스 최적화
- [ ] API 응답 시간 2초 이내 목표
- [ ] 페이징 처리로 대용량 데이터 처리
- [ ] 이미지 최적화
- [ ] 번들 크기 최적화

### 접근성 리스크
- [ ] 색상 의존성 제거 (아이콘+색상 동시 사용)
- [ ] 키보드 접근성 보장
- [ ] 스크린 리더 지원
- [ ] 명확한 에러 메시지 제공

---

## 🔄 새 API 작성 시 체크리스트

### 백엔드 API 개발 시
- [ ] **테스트 작성**: 유닛 테스트 및 API 테스트
- [ ] **스키마 정의**: DRF Serializer 및 OpenAPI 스키마
- [ ] **권한 검증**: 적절한 permission_classes 설정
- [ ] **감사 로그**: 중요한 작업은 audit_logs에 기록
- [ ] **에러 처리**: 명확한 에러 메시지와 상태 코드

### 프론트엔드 연동 시
- [ ] **타입 정의**: TypeScript 인터페이스 정의
- [ ] **API 클라이언트**: axios 인스턴스에 엔드포인트 추가
- [ ] **에러 처리**: try-catch 및 사용자 친화적 에러 메시지
- [ ] **로딩 상태**: 로딩 스피너 및 상태 관리
- [ ] **재시도 로직**: 네트워크 오류 시 재시도 옵션

---

---

## 🚨 개발 전 주의사항

### 데이터베이스 설계 원칙
- **기획서 준수**: 기획서에 명시되지 않은 컬럼은 반드시 필요한 경우가 아닌 이상 임의로 추가하지 말 것
- **테스트 환경**: SQLite 사용 (테스트 단계이므로)
- **마이그레이션**: 스키마 변경 시 반드시 마이그레이션 파일 생성
- **데이터 무결성**: Foreign Key 제약조건 및 필수 필드 검증 철저히 적용

### 기획서 기준 필수 컬럼만 사용
**Users 테이블**: id, username, password_hash, name, department, position, phone_number, role_level, status, failed_attempts, last_failed_at, created_at, updated_at, last_login_at

**AuditLogs 테이블**: id, user_id, action, target_id, details, ip_address, created_at

**PerformanceRecords 테이블**: id, record_uid, type, date, vendor, product_name, control_no, quantity, producer, weekday_code, created_by, created_at, updated_at

---

---

## 🔧 해결된 주요 이슈들

### 프론트엔드 이슈
1. **Tailwind CSS 파싱 오류**: `@import` 규칙 순서 문제 해결
   - Tailwind CSS v4에서 v3.4.0으로 다운그레이드
   - `globals.css`에서 `@theme inline` 제거 및 별도 config 파일 분리
   
2. **폰트 로딩 문제**: Pretendard 폰트 CDN 로딩으로 변경

3. **로그인 에러 메시지**: 계정 상태별 구체적 메시지 표시
   - 프론트엔드에서 HTTP 401 상태 코드 우선 처리하여 백엔드 메시지 덮어쓰는 문제 해결

### 백엔드 이슈
4. **Django User 모델 호환성**: `is_authenticated`, `is_anonymous`, `is_active` 속성 추가

5. **권한 체크 500 오류**: User 객체 명시적 조회로 해결

6. **사용자 삭제 API**: `UpdateAPIView`에서 `DestroyAPIView`로 변경하여 DELETE 요청 처리

### UX 개선사항
7. **Guest 권한 표시**: `role_level=0` 조건 처리 수정
8. **접근 제한 UI**: 권한 없는 사용자에게도 버튼 표시하되 명확한 안내 메시지

---

**개발 우선순위**: 1단계 → 3단계 → 4단계 → 2단계 → **5단계(실적 관리)** → 6단계 → 7단계 → 8단계 → 9단계

**현재 진행률**: **1-5단계 완료** (약 85% 완료)
- ✅ 백엔드 기반 구조 구축 (완료)
- ✅ 인증 페이지 개발 (완료)  
- ✅ 사용자 관리 시스템 개발 (완료)
- ✅ 프론트엔드 기반 구조 구축 (완료)
- ✅ **실적 관리 시스템 개발** (주요 기능 완료)
  - ✅ 데이터베이스 모델 및 마이그레이션
  - ✅ 실적 등록 API (단일/일괄/CSV)
  - ✅ 실적 조회 및 관리 API
  - ✅ 권한별 접근 제어 및 감사 로그
  - ✅ 프론트엔드 실적 등록/조회 페이지

**다음 단계**: **실적 관리 시스템 완성 및 최적화**
- 실적 데이터 내보내기 기능 완성
- 페이징 처리 완성
- Layout 컴포넌트 개발 (좌측 내비 + 상단 툴바)
- Toast 알림 시스템 구현
