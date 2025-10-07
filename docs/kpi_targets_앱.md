# kpi_targets 앱

**참고 시점**: KPI 목표 등록/관리 페이지를 개발하거나 연간 목표 설정, 목표 달성률 계산 기능을 구현할 때 참고

## 라우트 (URL)
- `/kpi-targets/` - KPI 목표 목록 조회 (GET)
- `/kpi-targets/` - KPI 목표 등록 (POST, 실무자 이상)
- `/kpi-targets/<int:pk>/` - KPI 목표 상세 조회 (GET)
- `/kpi-targets/<int:pk>/` - KPI 목표 수정 (PUT/PATCH, 실무자 이상)
- `/kpi-targets/<int:pk>/` - KPI 목표 삭제 (DELETE, 실무자 이상, 물리삭제)
- `/kpi-targets/years/` - 사용 가능한 연도 목록 조회 (GET)

## 스키마 (모델)
**KPITarget 모델**: KPI 목표 관리 (연간 전용)
- `kpi_uid` (CharField, 26자, 고유) - ULID 기반 비즈니스 식별자
- `year` (IntegerField) - 연도
- `kpi_type` (CharField) - KPI 종류
  - defect_rate: 불량율
  - f_cost: F-COST
  - complaints: 고객 불만 건수
- `target_value` (DecimalField, 18자리, 소수점 4자리) - 목표값 (0 이상)
- `unit` (CharField, 10자) - 단위
  - %: 퍼센트
  - ppm: ppm
  - KRW: 원
  - count: 건
- `created_by` (ForeignKey to User) - 작성자
- `created_at`, `updated_at` - 타임스탬프

**제약조건**:
- (year, kpi_type) 조합 유일성 제약 (연도별 KPI 종류당 하나의 목표만 등록 가능)
- KPI 종류별 허용 단위:
  - defect_rate: %, ppm
  - f_cost: KRW
  - complaints: count

## 서비스 함수
- `KPITargetViewSet.list()` - 목표 목록 조회 (연도, KPI 종류별 필터링 지원)
  - `?year=2024` - 특정 연도 필터링
  - `?years=2022,2023,2024` - 여러 연도 조회
  - `?kpi_type=defect_rate` - KPI 종류별 필터링
- `KPITargetViewSet.retrieve()` - 목표 상세 조회
- `KPITargetViewSet.create()` - 목표 등록 (실무자 이상 권한 필요)
  - 작성자 자동 설정
  - 연도 검증: 현재 연도 ~ 과거 5년
  - 중복 검증: 동일 연도, KPI 종류 조합 확인
  - KPI 종류별 단위 일치 검증
- `KPITargetViewSet.update()` - 목표 수정 (실무자 이상 권한 필요)
  - 부분 수정(PATCH) 지원
  - 변경된 필드만 감사 로그에 기록
- `KPITargetViewSet.destroy()` - 목표 물리 삭제 (실무자 이상 권한 필요)
- `KPITargetViewSet.available_years()` - 사용 가능한 연도 목록 조회 (중복 제거, 내림차순)

## 권한 규칙
- **게스트(0)**: 조회 전용 (목록, 상세, 연도 목록)
- **실무자(1) 이상**: 전체 CRUD 가능 (등록, 수정, 삭제)

## 감사 로그
다음 작업 시 자동으로 감사 로그 기록:
- `CREATE_KPI_TARGET` - 목표 등록
- `UPDATE_KPI_TARGET` - 목표 수정 (변경된 필드 diff 포함)
- `DELETE_KPI_TARGET` - 목표 삭제

## Serializer
**KPITargetSerializer**: 등록, 수정, 상세 조회용
- 작성자 이름 자동 포함
- KPI 종류 표시명 자동 변환
- 단위 표시명 자동 변환 (KRW → 원, count → 건)
- 연도 검증 (현재 연도 ~ 과거 5년)
- 목표값 검증 (0 이상)
- 단위-KPI 종류 일치 검증
- 중복 검증

**KPITargetListSerializer**: 목록 조회용 간소화 버전
- 필수 필드만 포함
- 최적화된 성능

## 비즈니스 규칙
1. 연도는 현재 연도부터 과거 5년까지만 등록 가능
2. 동일 연도에 동일 KPI 종류는 하나만 등록 가능
3. KPI 종류에 따라 사용 가능한 단위가 고정됨
4. 목표값은 항상 0 이상이어야 함
5. ULID 기반 고유 식별자 자동 생성
