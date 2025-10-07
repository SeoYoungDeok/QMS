# dashboard 앱

**참고 시점**: 대시보드 페이지를 개발하거나 KPI 통합 데이터, 차트 데이터, 품질 분석 기능을 구현할 때 참고

## 라우트 (URL)
- `/kpis/` - KPI 통합 데이터 조회 (GET, 불량율/F-COST/고객불만)
- `/charts/defect-rate-trend/` - 월별 불량율 추이 (GET, 최근 12개월)
- `/charts/defect-type-distribution/` - 불량 유형별 분포 (GET, 건수/금액)
- `/charts/defect-cause-distribution/` - 발생 원인별(6M) 분포 (GET, 건수/금액)
- `/sparkline/` - 스파크라인 데이터 (GET, KPI별 12개월)
- `/schedules/upcoming/` - 향후 14일 품질 일정 (GET)

## 주요 계산 로직

### 불량율 (defect_rate)
- 월별: `(월별 불량수량 / 월별 생산수량) × 100`
- YTD: `(1~m월 불량수량 합 / 1~m월 생산수량 합) × 100` (가중 평균)

### F-COST (불량 비용)
- 월별: `Σ(부적합 total_amount)` (해당 월)
- YTD: `Σ(부적합 total_amount)` (1~m월)
- 월 목표: `연간 목표 / 12`, YTD 목표: `연간 목표 × (m / 12)`

### 고객 불만 건수
- 월별: `COUNT(customer_complaints)` (해당 월)
- YTD: `COUNT(customer_complaints)` (1~m월)
- 월 목표: `연간 목표 / 12`, YTD 목표: `연간 목표 × (m / 12)`

## 데이터 소스 (참조 모델)
- `PerformanceRecord` - 생산수량
- `Nonconformance` - 불량수량, F-COST, 불량 유형, 발생 원인
- `CustomerComplaint` - 고객 불만 건수
- `KPITarget` - 연간 목표
- `Schedule` - 품질 일정

## 서비스 함수
- `dashboard_kpis()` - KPI 통합 데이터 (불량율, F-COST, 고객불만)
- `defect_rate_trend()` - 월별 불량율 추이 (12개월)
- `defect_type_distribution()` - 불량 유형별 분포 (건수/금액)
- `defect_cause_distribution()` - 발생 원인별(6M) 분포 (건수/금액)
- `sparkline_data()` - KPI별 스파크라인 (12개월)
- `upcoming_schedules()` - 향후 14일 품질 일정

