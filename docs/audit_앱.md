# audit 앱

**참고 시점**: 시스템 감사 로그 조회 기능을 개발하거나 사용자 활동 추적이 필요한 기능을 구현할 때 참고

## 라우트 (URL)
- `GET /api/audit/logs/` - 감사 로그 목록 조회 (읽기 전용)
  - 쿼리 파라미터: `action`, `username`, `date_from`, `date_to`, `search`, `ordering`
  - 권한: 인증된 사용자 (관리자는 전체, 일반 사용자는 자신의 로그만)
- `GET /api/audit/logs/{id}/` - 특정 감사 로그 상세 조회

## 스키마 (모델)
**AuditLog 모델**: 시스템 감사 로그 관리
- `user_id` (ForeignKey to User) - 작업 수행자 ID (null 허용)
- `action` (CharField, 100자) - 수행한 작업 유형 (총 38개 액션)
  - **인증 관련** (4개): LOGIN_SUCCESS, LOGIN_FAILED, SIGNUP, CHANGE_PASSWORD
  - **사용자 관리** (7개): CREATE_USER, UPDATE_USER, DELETE_USER, RESTORE_USER, RESET_PASSWORD, UPDATE_ROLE, UPDATE_STATUS
  - **실적 관리** (7개): CREATE_PERFORMANCE, UPDATE_PERFORMANCE, DELETE_PERFORMANCE, BULK_CREATE_PERFORMANCE, BULK_CREATE_PERFORMANCE_CSV, BULK_DELETE_PERFORMANCE, EXPORT_PERFORMANCE
  - **부적합 관리** (10개): CREATE_NONCONFORMANCE, UPDATE_NONCONFORMANCE, DELETE_NONCONFORMANCE, CREATE_DEFECT_TYPE, DELETE_DEFECT_TYPE, CREATE_DEFECT_CAUSE, DELETE_DEFECT_CAUSE, REORDER_DEFECT_TYPES, REORDER_DEFECT_CAUSES, EXPORT_NONCONFORMANCE
  - **일정 관리** (3개): CREATE_SCHEDULE, UPDATE_SCHEDULE, DELETE_SCHEDULE
  - **고객불만 관리** (4개): CREATE_CUSTOMER_COMPLAINT, UPDATE_CUSTOMER_COMPLAINT, DELETE_CUSTOMER_COMPLAINT, EXPORT_CUSTOMER_COMPLAINT
  - **KPI 목표 관리** (3개): CREATE_KPI_TARGET, UPDATE_KPI_TARGET, DELETE_KPI_TARGET
- `target_id` (BigIntegerField) - 대상 리소스 ID (null 허용)
- `details` (TextField) - 상세 정보 (변경 내용, 에러 메시지 등)
- `ip_address` (CharField, 50자) - 작업 발생 IP 주소
- `created_at` (DateTimeField) - 이벤트 발생 시각 (자동 생성)

## 시리얼라이저
**AuditLogSerializer**: 감사 로그 직렬화
- 모든 필드 포함 (읽기 전용)
- `username`: 사용자명 (computed field)
- `action_display`: 액션의 한글 표시명 (computed field)

## 뷰셋
**AuditLogViewSet**: 감사 로그 조회 API
- ReadOnlyModelViewSet (조회만 가능, 생성/수정/삭제 불가)
- 필터링: DjangoFilterBackend, SearchFilter, OrderingFilter
- 권한 제어:
  - 관리자(role='ADMIN'): 모든 로그 조회
  - 일반 사용자: 자신의 로그만 조회

## 필터
**AuditLogFilter**: 감사 로그 필터링
- `action`: 액션 타입 필터 (exact)
- `username`: 사용자명 필터 (contains)
- `date_from`: 시작 날짜 필터 (gte)
- `date_to`: 종료 날짜 필터 (lte)
- 전체 텍스트 검색: details, ip_address

## 서비스 함수
- `AuditLog.log_action()` - 감사 로그 기록 헬퍼 메서드 (클래스 메서드)
  - 모든 중요한 시스템 이벤트를 자동으로 로깅
  - 사용자 인증, 데이터 생성/수정/삭제 등의 활동 추적

## 프론트엔드
- **페이지 경로**: `/audit-logs`
- **권한**: 실무자 이상 (자신의 로그만), 관리자 (전체)
- **주요 기능**:
  - 감사 로그 목록 조회 (페이지네이션 지원, 페이지당 20개)
  - 다중 필터링 (액션 타입, 사용자명, 날짜 범위, 상세 검색)
  - 상세 정보 모달 표시
  - 액션 타입별 배지 색상 구분
    - 🟢 성공 (success): LOGIN_SUCCESS
    - 🔴 실패/삭제 (destructive): LOGIN_FAILED, DELETE_*, BULK_DELETE_*
    - 🔵 생성/등록 (primary): CREATE_*, BULK_CREATE_*, SIGNUP, RESTORE_USER
    - 🟠 수정/변경 (warning): UPDATE_*, CHANGE_*, RESET_*, REORDER_*
    - 🟣 내보내기 (secondary): EXPORT_*
  - 날짜/사용자/액션별 검색
  - 검색 초기화 기능
