# nonconformance 앱

**참고 시점**: 부적합 등록/관리 페이지를 개발하거나 6M 분석, 5Why 분석 기능을 구현할 때 참고

## 라우트 (URL)
- `/` - 부적합 목록 조회 (GET)
- `/create/` - 부적합 등록 (POST, 실무자 이상)
- `/<int:id>/` - 부적합 상세 조회 (GET)
- `/<int:id>/update/` - 부적합 수정 (PUT/PATCH, 실무자 이상)
- `/<int:id>/delete/` - 부적합 삭제 (DELETE, 실무자 이상, 물리삭제)
- `/defect-types/` - 불량 유형 목록 조회 (GET)
- `/defect-causes/` - 발생 원인 목록 조회 (GET)
- `/six-m-categories/` - 6M 카테고리 목록 조회 (GET)
- `/six-m-guide/` - 6M 분류 가이드 정보 (GET)

## 스키마 (모델)
**DefectType 모델**: 불량 유형 코드 테이블
- `code` (CharField, 20자, PK) - 불량 유형 코드
- `name` (CharField, 100자) - 불량 유형명
- `description` (CharField, 255자) - 설명

**DefectCause 모델**: 발생 원인 코드 테이블 (6M 분류)
- `code` (CharField, 20자, PK) - 원인 코드
- `category` (CharField, 30자) - 6M 분류 (Material, Machine, Man, Method, Measurement, Environment, Other)
- `name` (CharField, 100자) - 원인명
- `description` (CharField, 255자) - 설명

**Nonconformance 모델**: 부적합 본문 테이블
- `ncr_uid` (CharField, 26자, 고유) - ULID 기반 비즈니스 식별자
- `type` (CharField) - 부적합 유형 (inhouse:사내, incoming:수입)
- `occurrence_date` (DateField) - 발생일
- `ncr_no` (CharField, 50자) - NCR 번호
- `vendor` (CharField, 100자) - 업체명
- `product_name` (CharField, 100자) - 품명
- `control_no` (CharField, 100자) - 관리번호
- `defect_qty` (PositiveIntegerField) - 부적합 수량
- `unit_price` (DecimalField) - 단가
- `weight_factor` (DecimalField, 0~1.000) - 가중치
- `total_amount` (DecimalField, 자동계산) - 합계
- `detection_stage` (CharField, 30자) - 발견공정
- `defect_type_code` (ForeignKey to DefectType) - 불량유형 코드
- `cause_code` (ForeignKey to DefectCause) - 발생원인 코드
- `why1~why5` (CharField, 255자) - 5Why 분석
- `root_cause` (CharField, 255자) - 최종불량원인
- `operators` (JSONField) - 작업자 목록
- `process_name` (CharField, 100자) - 공정/부서
- `weekday_code` (CharField, 3자, 자동계산) - 요일
- `note` (TextField) - 비고
- `created_by` (ForeignKey to User) - 작성자

## 서비스 함수
- `NonconformanceListView` - 부적합 목록 조회 (날짜 범위, 업체명, 6M 카테고리 필터링 지원)
- `NonconformanceDetailView` - 부적합 상세 조회
- `NonconformanceCreateView` - 부적합 등록 (실무자 이상 권한 필요)
- `NonconformanceUpdateView` - 부적합 수정 (실무자 이상 권한 필요)
- `NonconformanceDeleteView` - 부적합 물리 삭제 (실무자 이상 권한 필요)
- `defect_types_list()` - 불량 유형 목록 조회
- `defect_causes_list()` - 발생 원인 목록 조회 (카테고리별 필터링 지원)
- `six_m_categories()` - 6M 카테고리 목록 조회
- `six_m_guide()` - 6M 분류 가이드 및 예시 정보 제공
