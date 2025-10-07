
본 문서는 KPI 목표 등록/관리 페이지의 **연간 전용** 개정안을 정의합니다.  

---

## 1) 페이지 개요
- **페이지명:** KPI 목표 등록 (KPI Target Management)
- **목적:**
  - 조직 차원의 **연간** KPI 목표값 등록 및 관리
  - KPI 유형: **불량율(%)·ppm 변환 지원)**, **F-COST(원)**, **고객 불만 건수(건)**
  - 과거 연도들의 목표 이력 확인(비교/추이 파악)
- **접근 권한(권장):**
  - 게스트(0): 조회 전용
  - 실무자(1): 목표값 등록/수정(담당 범위)
  - 관리자(2): 전체 KPI 목표 등록/수정/삭제, 감사 로그 열람

---

## 2) 데이터 모델 (영문 컬럼, 연간 전용)

### 2.1 `kpi_targets`
| Column | Type | Description |
|---|---|---|
| id | BIGINT PK AI | Internal PK |
| kpi_uid | CHAR(26) UNIQUE | ULID business key |
| **year** | INT | KPI 적용 **연도** (예: 2025) |
| **kpi_type** | ENUM('defect_rate','f_cost','complaints') | KPI 종류 |
| **target_value** | DECIMAL(18,4) | 목표값 (단위는 `unit`) |
| **unit** | ENUM('%','ppm','KRW','count') | KPI 단위<br>- defect_rate: `%` 또는 `ppm`<br>- f_cost: `KRW`<br>- complaints: `count` |
| created_by | BIGINT FK→users.id | 작성자 |
| created_at | DATETIME | 생성 |
| updated_at | DATETIME | 수정 |

**무결성/유일성 권장 정책**
- (연도, kpi_type) **유일** 제약(Unique) → 연도당 KPI 유형별 목표는 1건

**인덱스**
- `idx_targets_year_type` (`year`,`kpi_type`)
- `idx_targets_type` (`kpi_type`)

---

## 3) KPI 종류별 입력 규칙
1) **불량율 (defect_rate)**  
   - 단위: `%` 또는 `ppm` (상호 변환 제공)  
   - 변환: `% → ppm = % × 10,000`, `ppm → % = ppm ÷ 10,000`  
   - 저장: `target_value`+`unit` 그대로 보존(조회 시 변환 옵션 제공)

2) **F-COST (f_cost)**  
   - 단위: `KRW` (정수 사용 권장)  
   - 예: 연간 목표 120,000,000 KRW

3) **고객 불만 건수 (complaints)**  
   - 단위: `count` (정수)  
   - 예: 연간 목표 12건

---

## 4) 주요 기능

### 4.1 KPI 목표 등록 (Create)
- 입력: `year`, `kpi_type`, `target_value`, `unit`
- 검증:
  - `year`는 현재 연도 ± N년 허용(운영 정책)
  - `target_value ≥ 0`
  - `unit`은 `kpi_type`과 일치해야 함
  - `(year, kpi_type)` 중복 시 409 반환

- 감사 로그: `CREATE_KPI_TARGET(kpi_uid, year, kpi_type, target_value, unit)`

### 4.2 KPI 목표 조회 (Read)
- **연도 선택 드롭다운**: 기본=올해, 옆에 **"이전 연도 보기" 토글** 제공  
- **이전 연도 이력 패널**:
  - 선택된 KPI 유형에 대해 **최근 N개 연도** 목표값 테이블/미니 차트로 표시
  - 예: `defect_rate` 선택 시 2022~2025년 목표 비교
- **필터**: `year`, `kpi_type` (둘 다 선택 시 단건 상세, 하나만 선택 시 목록)

### 4.3 KPI 목표 수정 (Update)
- 동일 유효성 검증 적용
- 감사 로그: `UPDATE_KPI_TARGET(kpi_uid, diff)`

### 4.4 KPI 목표 삭제 (Delete)
- 물리 삭제(Physical)
- 감사 로그: `DELETE_KPI_TARGET(kpi_uid)`

---

## 5) UX / UI

### 5.1 등록/수정 모달
- 필드: 연도(숫자), KPI 종류(드롭다운), 목표값(입력), 단위(종류별 자동 제한)
- **불량율 전용 변환 컨트롤**:
  - 단위 라디오: `%` / `ppm`
  - 변환 버튼: 현재 값과 단위를 상호 변환
  - 보조 텍스트: 예) `1% = 10,000 ppm`

### 5.2 목록/상세 화면
- 상단: 연도 선택 + KPI 종류 필터
- 본문:
  - **목록 테이블**: 연도, KPI 종류, 목표값, 단위, 작성자/수정일
  - **이전 연도 이력 패널**: 선택 KPI의 과거 연도 목표를 **테이블 + 스파크라인**(또는 막대 미니 차트)로 표현
- 접근성:
  - 값 형식(천단위 구분, 소수점 자리수) 자동 포맷
  - 단위 배지(%, ppm, KRW, count)

---

## 6) API 설계

### 6.1 엔드포인트
- `POST /api/kpi-targets` — 등록
- `GET /api/kpi-targets` — 조회(쿼리: `year?`, `kpi_type?`, `years?=2022,2023,2024`)
- `GET /api/kpi-targets/years` — **사용 가능한 연도 목록** 반환(중복 제거·내림차순)
- `GET /api/kpi-targets/{id}` — 상세
- `PUT /api/kpi-targets/{id}` — 수정
- `DELETE /api/kpi-targets/{id}` — 삭제

### 6.2 요청/응답 예시

**등록(불량율, 단위 %)**  
```json
POST /api/kpi-targets
{
  "year": 2025,
  "kpi_type": "defect_rate",
  "target_value": 0.8,
  "unit": "%"
}
```

**등록(F-COST)**  
```json
POST /api/kpi-targets
{
  "year": 2025,
  "kpi_type": "f_cost",
  "target_value": 120000000,
  "unit": "KRW"
}
```

**조회(특정 연도 전체 KPI)**  
```http
GET /api/kpi-targets?year=2025
```

**조회(과거 연도 이력)**  
```http
GET /api/kpi-targets?kpi_type=defect_rate&years=2022,2023,2024,2025
```

**사용 가능 연도 목록**  
```json
GET /api/kpi-targets/years
[2025, 2024, 2023, 2022]
```

---

## 7) 오류 처리
- **400** `validation_error` : 단위-종류 불일치, 음수/형식 오류  
- **401** `unauthorized` : JWT 누락/만료  
- **403** `forbidden` : 권한 부족  
- **404** `not_found` : 대상 없음  
- **409** `conflict` : (year, kpi_type) 중복  
- **500** `server_error`

---

## 8) 한글 - 영문 대응표
| 한글 필드명 | 영문 컬럼명 |
|---|---|
| 연도 | year |
| KPI 종류 | kpi_type |
| 목표값 | target_value |
| 단위 | unit |
