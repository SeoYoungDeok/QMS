# customer_complaints 앱

**참고 시점**: 고객 불만(CCR) 등록/관리 페이지를 개발하거나 고객 불만 분석 기능을 구현할 때 참고

## 라우트 (URL)
- `/` - 고객 불만 목록 조회 (GET)
- `/create/` - 고객 불만 등록 (POST, 실무자 이상)
- `/<int:id>/` - 고객 불만 상세 조회 (GET)
- `/<int:id>/update/` - 고객 불만 수정 (PUT/PATCH, 실무자=본인만/관리자=전체)
- `/<int:id>/delete/` - 고객 불만 삭제 (DELETE, 실무자=본인만/관리자=전체, 물리삭제)

## 스키마 (모델)
**CustomerComplaint 모델**: 고객 불만(CCR) 본문 테이블
- `ccr_uid` (CharField, 26자, 고유) - ULID 기반 비즈니스 식별자
- `occurrence_date` (DateField) - 발생일
- `ccr_no` (CharField, 50자) - CCR 번호
- `vendor` (CharField, 100자) - 업체명
- `product_name` (CharField, 100자) - 품명
- `defect_qty` (PositiveIntegerField) - 부적합 수량
- `unit_price` (DecimalField) - 단가
- `total_amount` (DecimalField, 자동계산) - 합계 (defect_qty × unit_price)
- `complaint_content` (TextField, 필수) - 고객 불만 내용
- `action_content` (TextField, 선택) - 조치 내용
- `defect_type_code` (ForeignKey to DefectType) - 불량유형 코드 (nonconformance 앱 재사용)
- `cause_code` (ForeignKey to DefectCause) - 발생원인 코드 (nonconformance 앱 재사용)
- `created_by` (ForeignKey to User) - 작성자
- `created_at` (DateTimeField, 자동생성) - 생성일시
- `updated_at` (DateTimeField, 자동갱신) - 수정일시

## 서비스 함수
- `CustomerComplaintListView` - 고객 불만 목록 조회 (날짜 범위, 업체명, 불량유형, 6M 카테고리, 조치여부 필터링 지원)
- `CustomerComplaintDetailView` - 고객 불만 상세 조회
- `CustomerComplaintCreateView` - 고객 불만 등록 (실무자 이상 권한 필요)
- `CustomerComplaintUpdateView` - 고객 불만 수정 (실무자=본인만, 관리자=전체 권한)
- `CustomerComplaintDeleteView` - 고객 불만 물리 삭제 (실무자=본인만, 관리자=전체 권한)

## 시리얼라이저
**CustomerComplaintSerializer**: 고객 불만 생성/수정용
- 모든 필드 포함
- `complaint_content` 필수 검증
- `action_content` 선택 (조치 내용은 나중에 입력 가능)
- 불량유형/발생원인 코드 유효성 검증
- 감사 로그 자동 기록 (생성/수정 시)

**CustomerComplaintListSerializer**: 고객 불만 목록용 (최적화)
- 주요 필드만 포함
- `has_action` 필드 추가 (조치 여부)
- `created_by`, `action_content` 포함
- `select_related` 최적화

**CustomerComplaintCreateSerializer**: 고객 불만 생성 전용
- 입력 필드만 포함
- 자동 생성 필드 제외
- 필수 필드 검증

## 주요 기능
- **권한 관리**: 실무자는 본인 작성 데이터만, 관리자는 전체 데이터 관리 가능
- **자동 계산**: 합계 = 부적합수량 × 단가
- **감사 로그**: 모든 생성/수정/삭제 작업 자동 기록
- **필터링**: 날짜, 업체명, 불량유형, 6M 카테고리, 조치여부 등 다양한 필터 지원
- **페이지네이션**: 기본 20건씩 조회
- **조치 관리**: 조치 내용 선택 입력, 조치 여부 표시

## 데이터베이스 인덱스
- `idx_ccr_date` - occurrence_date
- `idx_ccr_vendor` - vendor
- `idx_ccr_no` - ccr_no
- `idx_ccr_defect_type` - defect_type_code
- `idx_ccr_cause_code` - cause_code

## 외부 의존성
- `nonconformance.models.DefectType` - 불량 유형 코드 테이블 재사용
- `nonconformance.models.DefectCause` - 발생 원인 코드 테이블 (6M 분류) 재사용
- `accounts.models.User` - 사용자 모델
- `audit.models.AuditLog` - 감사 로그 모델

## 비즈니스 규칙
- 고객 불만 내용(`complaint_content`)은 필수 입력
- 조치 내용(`action_content`)은 선택 입력 (나중에 추가 가능)
- 부적합 수량은 1 이상
- 단가는 0 이상
- 합계는 서버에서 자동 계산 (클라이언트 표시용)
- 실무자는 본인이 작성한 고객 불만만 수정/삭제 가능
- 관리자는 모든 고객 불만 수정/삭제 가능
- 삭제는 물리 삭제 (데이터베이스에서 완전 제거)
- 모든 변경사항은 감사 로그에 기록

## API 응답 형식
### 목록 조회 응답
```json
{
  "results": [
    {
      "id": 1,
      "ccr_uid": "01HK...",
      "occurrence_date": "2025-01-15",
      "ccr_no": "CCR-2025-001",
      "vendor": "ABC 공업",
      "product_name": "스테인레스 파이프",
      "defect_qty": 100,
      "unit_price": "15000.00",
      "total_amount": "1500000.00",
      "defect_type_code": "D01",
      "defect_type_name": "치수 불량",
      "cause_code": "M1.1",
      "cause_name": "원자재 자체 불량",
      "cause_category_display": "Material(소재)",
      "action_content": "전량 재납품 요청",
      "has_action": true,
      "created_by": 2,
      "created_by_name": "김철수",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 42
}
```

### 상세 조회 응답
```json
{
  "id": 1,
  "ccr_uid": "01HK...",
  "occurrence_date": "2025-01-15",
  "ccr_no": "CCR-2025-001",
  "vendor": "ABC 공업",
  "product_name": "스테인레스 파이프",
  "defect_qty": 100,
  "unit_price": "15000.00",
  "total_amount": "1500000.00",
  "complaint_content": "파이프 직경이 규격보다 1mm 작음",
  "action_content": "전량 재납품 요청 및 공급업체 교체 검토",
  "defect_type_code": "D01",
  "defect_type_name": "치수 불량",
  "cause_code": "M1.1",
  "cause_name": "원자재 자체 불량",
  "cause_category": "Material",
  "cause_category_display": "Material(소재)",
  "created_by": 2,
  "created_by_name": "김철수",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-16T14:20:00Z"
}
```

## 필터링 파라미터
- `search` - CCR NO, 업체명, 품명 검색
- `defect_type_code` - 불량유형 코드 필터
- `category` - 6M 카테고리 필터 (Material, Machine, Man, Method, Measurement, Environment, Other)
- `vendor` - 업체명 부분 검색
- `date_from` - 발생일 시작 (YYYY-MM-DD)
- `date_to` - 발생일 종료 (YYYY-MM-DD)
- `has_action` - 조치여부 (true: 조치완료, false: 조치대기)
- `page` - 페이지 번호 (기본: 1)
- `ordering` - 정렬 필드 (기본: -created_at)

