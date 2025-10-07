# performance 앱

**참고 시점**: 실적 등록/관리 페이지를 개발하거나 CSV 업로드, 일괄 처리 기능을 구현할 때 참고

## 라우트 (URL)
- `/` - 단일 실적 등록 (POST, 실무자 이상)
- `/bulk/` - 일괄 실적 등록 (POST, 실무자 이상)
- `/bulk-delete/` - 실적 일괄 삭제 (POST, 실무자 이상)
- `/csv-upload/` - CSV 파일 업로드 및 일괄 실적 등록 (POST, 실무자 이상)
- `/template/` - CSV 템플릿 다운로드 (GET)
- `/list/` - 실적 목록 조회 (GET)
- `/<int:pk>/` - 실적 상세 조회 (GET)
- `/<int:pk>/update/` - 실적 수정 (PUT/PATCH, 실무자 이상)
- `/<int:pk>/delete/` - 실적 삭제 (DELETE, 실무자 이상, 물리삭제)

## 스키마 (모델)
**PerformanceRecord 모델**: 실적 기록 관리
- `record_uid` (CharField, 26자, 고유) - ULID 기반 비즈니스 식별자
- `type` (CharField) - 실적 유형 (inhouse:사내 실적, incoming:수입검사 실적)
- `date` (DateField) - 실적일
- `vendor` (CharField, 100자) - 업체명
- `product_name` (CharField, 100자) - 품명
- `control_no` (CharField, 100자) - 관리번호 (중복 허용)
- `quantity` (PositiveIntegerField) - 실적수량
- `producer` (CharField, 100자) - 생산처 (모든 실적에서 필수)
- `weekday_code` (CharField, 3자, 자동계산) - 요일
- `created_by` (ForeignKey to User) - 작성자
- `created_at`, `updated_at` - 타임스탬프

## 서비스 함수
- `PerformanceCreateView` - 단일 실적 등록 (실무자 이상 권한 필요)
- `performance_bulk_create()` - 일괄 실적 등록 (전체 롤백/부분 저장 모드 지원)
- `performance_csv_upload()` - CSV 파일 업로드 및 일괄 등록 (5MB 제한, 1000행 제한)
- `performance_template_download()` - CSV 템플릿 다운로드 (UTF-8 BOM 포함)
- `PerformanceListView` - 실적 목록 조회 (날짜 범위, 업체명 필터링 지원)
- `PerformanceDetailView` - 실적 상세 조회
- `PerformanceUpdateView` - 실적 수정 (실무자 이상 권한 필요)
- `PerformanceDeleteView` - 실적 물리 삭제 (실무자 이상 권한 필요)
- `performance_bulk_delete()` - 실적 일괄 삭제 (실무자 이상 권한 필요)
- `format_validation_error()` - 검증 에러 상세 포맷팅 헬퍼 함수
