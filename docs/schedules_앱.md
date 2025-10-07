# schedules 앱

**참고 시점**: 일정 관리 페이지를 개발하거나 캘린더, 품질/개인 일정 분류 기능을 구현할 때 참고

## 라우트 (URL)
- `/` - 일정 등록 (POST, 실무자 이상)
- `/list/` - 일정 목록 조회 (GET)
- `/<int:id>/` - 일정 상세 조회 (GET)
- `/<int:id>/update/` - 일정 수정 (PUT, 소유자 또는 관리자)
- `/<int:id>/delete/` - 일정 삭제 (DELETE, 소유자 또는 관리자, 물리삭제)
- `/categories/` - 일정 카테고리 목록 조회 (GET)
- `/users/` - 참석자 선택용 사용자 목록 조회 (GET)

## 스키마 (모델)
**Schedule 모델**: 일정 관리
- `schedule_uid` (CharField, 26자, 고유) - ULID 기반 비즈니스 식별자
- `type` (CharField) - 일정 유형 (quality:품질 일정, personal:개인 일정)
- `category` (CharField, 50자) - 카테고리
  - 품질 일정: outgoing_inspection(출하검사), incoming_inspection(수입검사), product_shipment(제품출하), audit(감사), other_quality(기타 품질업무)
  - 개인 일정: meeting(회의), training(교육), vacation(휴가), business_trip(출장), other_personal(기타 개인업무)
- `title` (CharField, 100자) - 일정 제목
- `description` (TextField) - 상세 설명 (선택사항)
- `importance` (CharField) - 중요도 (low:낮음, medium:보통, high:높음)
- `start_date` (DateField) - 시작 날짜 (필수)
- `end_date` (DateField) - 종료 날짜 (선택사항, 없으면 start_date와 동일)
- `start_time` (TimeField) - 시작 시간 (선택사항)
- `end_time` (TimeField) - 종료 시간 (선택사항)
- `location` (CharField, 100자) - 장소 (선택사항)
- `participants` (JSONField) - 참석자 user id 배열 (선택사항)
- `owner` (ForeignKey to User) - 일정 생성자/소유자
- `created_at`, `updated_at` - 타임스탬프

## 서비스 함수
- `ScheduleListView` - 일정 목록 조회 (날짜 범위, 참석자 필터링 지원)
- `schedule_create()` - 일정 등록 (실무자 이상 권한 필요)
- `ScheduleDetailView` - 일정 상세 조회
- `schedule_update()` - 일정 수정 (소유자 또는 관리자만 가능)
- `schedule_delete()` - 일정 물리 삭제 (소유자 또는 관리자만 가능)
- `schedule_categories()` - 일정 카테고리 목록 조회 (품질/개인 일정별 구분)
- `schedule_users()` - 활성 사용자 목록 조회 (참석자 선택용)
- `get_client_ip()` - 클라이언트 IP 주소 추출 헬퍼 함수
