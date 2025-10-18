import axios from 'axios'

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://www.komex-qc.co.kr/api'

// Axios 인스턴스 생성
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// 요청 인터셉터 - JWT 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 - 토큰 만료 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post<{access: string}>(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken
          })
          
          const { access } = response.data
          localStorage.setItem('access_token', access)
          
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// 타입 정의
export interface User {
  id: number
  username: string
  name: string
  department: string
  position: string
  phone_number: string
  role_level: number
  role_display: string
  status: string
  created_at: string
  last_login_at?: string
}

export interface SignupRequest {
  username: string
  password: string
  password_confirm: string
  name: string
  department: string
  position: string
  phone_number: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  message: string
  token: string
  refresh: string
  user: User
}

// 실적 관련 인터페이스
export interface PerformanceRecord {
  id: number
  record_uid: string
  type: 'inhouse' | 'incoming'
  type_display: string
  date: string
  vendor: string
  product_name: string
  control_no: string
  quantity: number
  producer: string
  weekday_code: string
  weekday: string
  created_by_name: string
  created_at: string
}

export interface PerformanceCreateRequest {
  type: 'inhouse' | 'incoming'
  date: string
  vendor: string
  product_name: string
  control_no: string
  quantity: number
  producer: string
}

export interface PerformanceCreateResponse {
  message: string
  id: number
  record_uid: string
  weekday: string
}

export interface PerformanceBulkCreateRequest {
  rows: PerformanceCreateRequest[]
  transaction: 'partial' | 'full'
}

export interface PerformanceBulkCreateResponse {
  summary: {
    total: number
    success: number
    failed: number
  }
  errors: Array<{
    row_index: number
    control_no: string
    message: string
  }>
  created: Array<{
    id: number
    record_uid: string
  }>
}

export interface PerformanceListParams {
  type?: string
  producer?: string
  weekday_code?: string
  date_from?: string
  date_to?: string
  search?: string
  ordering?: string
  page?: number
}

// API 함수들
export const authAPI = {
  // 회원가입
  signup: (data: SignupRequest) =>
    api.post('/signup/', data),
  
  // 아이디 중복 체크
  checkUsername: (username: string) =>
    api.get(`/check-username/?username=${username}`),
  
  // 로그인
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/login/', data),
  
  // 로그아웃 (클라이언트 사이드)
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }
}

export interface PasswordChangeRequest {
  old_password: string
  new_password: string
  new_password_confirm: string
}

export const userAPI = {
  // 사용자 목록 조회
  getUsers: (params?: {
    department?: string
    position?: string
    role_level?: number
    status?: string
    search?: string
    page?: number
  }) => api.get<{results: User[], count: number}>('/users/', { params }),
  
  // 사용자 상세 조회
  getUser: (id: number) =>
    api.get<User>(`/users/${id}/`),
  
  // 사용자 정보 수정
  updateUser: (id: number, data: Partial<User>) =>
    api.put<User>(`/users/${id}/update/`, data),
  
  // 사용자 추가
  createUser: (data: SignupRequest) =>
    api.post<{user_id: number}>('/users/create/', data),
  
  // 사용자 삭제
  deleteUser: (id: number) =>
    api.delete(`/users/${id}/delete/`),
  
  // 비밀번호 초기화
  resetPassword: (id: number) =>
    api.post<{message: string, temporary_password: string}>(`/users/${id}/reset-password/`),
  
  // 사용자 복구
  restoreUser: (id: number) =>
    api.post<{message: string, user_id: number}>(`/users/${id}/restore/`),
  
  // 비밀번호 변경 (자기 자신)
  changePassword: (data: PasswordChangeRequest) =>
    api.post<{message: string}>('/change-password/', data)
}

// 업체명 및 생산처 관련 타입
export interface Vendor {
  id: number
  name: string
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface Producer {
  id: number
  name: string
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export const performanceAPI = {
  // 실적 목록 조회
  getPerformances: (params?: PerformanceListParams) =>
    api.get<{results: PerformanceRecord[], count: number}>('/performance/list/', { params }),
  
  // 실적 상세 조회
  getPerformance: (id: number) =>
    api.get<PerformanceRecord>(`/performance/${id}/`),
  
  // 단일 실적 등록
  createPerformance: (data: PerformanceCreateRequest) =>
    api.post<PerformanceCreateResponse>('/performance/', data),
  
  // 일괄 실적 등록
  bulkCreatePerformance: (data: PerformanceBulkCreateRequest) =>
    api.post<PerformanceBulkCreateResponse>('/performance/bulk/', data),
  
  // CSV 파일 업로드 일괄 등록
  csvUploadPerformance: (formData: FormData) =>
    api.post<PerformanceBulkCreateResponse>('/performance/csv-upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  // 실적 수정
  updatePerformance: (id: number, data: PerformanceCreateRequest) =>
    api.put<PerformanceRecord>(`/performance/${id}/update/`, data),
  
  // 실적 삭제
  deletePerformance: (id: number) =>
    api.delete(`/performance/${id}/delete/`),
  
  // 실적 일괄 삭제
  bulkDeletePerformances: (ids: number[]) =>
    api.post('/performance/bulk-delete/', { ids }),
  
  // 템플릿 다운로드
  downloadTemplate: () =>
    api.get('/performance/template/', {
      responseType: 'blob'
    }),
  
  // CSV 다운로드
  exportCSV: (year: number, month: number) =>
    api.get('/performance/export/', {
      params: { year, month },
      responseType: 'blob'
    }),
  
  // 업체명 목록 조회
  getVendors: (search?: string) =>
    api.get<Vendor[]>('/performance/vendors/', { params: search ? { search } : {} }),
  
  // 업체명 생성
  createVendor: (name: string) =>
    api.post<Vendor>('/performance/vendors/', { name }),
  
  // 업체명 삭제
  deleteVendor: (id: number) =>
    api.delete(`/performance/vendors/${id}/`),
  
  // 생산처 목록 조회
  getProducers: (search?: string) =>
    api.get<Producer[]>('/performance/producers/', { params: search ? { search } : {} }),
  
  // 생산처 생성
  createProducer: (name: string) =>
    api.post<Producer>('/performance/producers/', { name }),
  
  // 생산처 삭제
  deleteProducer: (id: number) =>
    api.delete(`/performance/producers/${id}/`),
}

// 부적합 관련 타입 정의
export interface DefectType {
  code: string
  name: string
  description?: string
}

export interface DefectCause {
  code: string
  category: string
  category_display: string
  name: string
  description?: string
}

export interface SixMCategory {
  code: string
  name: string
}

export interface Nonconformance {
  id: number
  ncr_uid: string
  type: 'inhouse' | 'incoming'
  type_display: string
  occurrence_date: string
  ncr_no: string
  vendor: string
  product_name: string
  control_no?: string
  defect_qty: number
  unit_price: number
  weight_factor: number
  total_amount: number
  detection_stage?: string
  defect_type_code: string
  defect_type_name: string
  cause_code: string
  cause_name: string
  cause_category: string
  cause_category_display: string
  why1?: string
  why2?: string
  why3?: string
  why4?: string
  why5?: string
  root_cause?: string
  operators?: string[]
  process_name?: string
  weekday_code: string
  weekday: string
  note?: string
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface NonconformanceCreateRequest {
  type: 'inhouse' | 'incoming'
  occurrence_date: string
  ncr_no: string
  vendor: string
  product_name: string
  control_no?: string
  defect_qty: string | number
  unit_price: string | number
  weight_factor: string | number
  detection_stage?: string
  defect_type_code: string
  cause_code: string
  why1?: string
  why2?: string
  why3?: string
  why4?: string
  why5?: string
  root_cause?: string
  operators?: string[]
  process_name?: string
  note?: string
}

export interface NonconformanceListParams {
  type?: 'inhouse' | 'incoming'
  defect_type_code?: string
  cause_code?: string
  category?: string
  weekday_code?: string
  detection_stage?: string
  vendor?: string
  date_from?: string
  date_to?: string
  search?: string
  ordering?: string
  page?: number
}

export interface SixMGuide {
  title: string
  description: string
  categories: {
    [key: string]: {
      name: string
      description: string
      causes: Array<{
        code: string
        name: string
        description?: string
      }>
    }
  }
  tips: string[]
}

export const nonconformanceAPI = {
  // 부적합 목록 조회
  getNonconformances: (params?: NonconformanceListParams) =>
    api.get<{results?: Nonconformance[], data?: Nonconformance[], count?: number}>('/nonconformance/', { params }),
  
  // 부적합 상세 조회
  getNonconformance: (id: number) =>
    api.get<Nonconformance>(`/nonconformance/${id}/`),
  
  // 부적합 등록
  createNonconformance: (data: NonconformanceCreateRequest) =>
    api.post<{ok: boolean, data: {id: number, ncr_uid: string}}>('/nonconformance/create/', data),
  
  // 부적합 수정
  updateNonconformance: (id: number, data: Partial<NonconformanceCreateRequest>) =>
    api.put<Nonconformance>(`/nonconformance/${id}/update/`, data),
  
  // 부적합 삭제
  deleteNonconformance: (id: number) =>
    api.delete(`/nonconformance/${id}/delete/`),
  
  // 불량 유형 목록
  getDefectTypes: () =>
    api.get<{ok: boolean, data: DefectType[]}>('/nonconformance/defect-types/'),
  
  // 발생 원인 목록
  getDefectCauses: (category?: string) =>
    api.get<{ok: boolean, data: DefectCause[]}>('/nonconformance/defect-causes/', {
      params: category ? { category } : {}
    }),
  
  // 6M 카테고리 목록
  getSixMCategories: () =>
    api.get<{ok: boolean, data: SixMCategory[]}>('/nonconformance/six-m-categories/'),
  
  // 6M 가이드
  getSixMGuide: () =>
    api.get<{ok: boolean, data: SixMGuide}>('/nonconformance/six-m-guide/'),
  
  // 불량 유형 추가
  createDefectType: (data: { code: string, name: string, description?: string }) =>
    api.post('/nonconformance/defect-types/create/', data),
  
  // 불량 유형 삭제
  deleteDefectType: (code: string) =>
    api.delete(`/nonconformance/defect-types/${code}/delete/`),
  
  // 발생 원인 추가
  createDefectCause: (data: { code: string, name: string, category: string, description?: string }) =>
    api.post('/nonconformance/defect-causes/create/', data),
  
  // 다음 NCR NO 가져오기
  getNextNcrNo: () =>
    api.get<{ok: boolean, data: {next_ncr_no: string, year: number, number: number}}>('/nonconformance/next-ncr-no/'),
  
  // 불량 유형 재정렬
  reorderDefectTypes: (codes: string[]) =>
    api.post('/nonconformance/defect-types/reorder/', { codes }),
  
  // 발생 원인 삭제
  deleteDefectCause: (code: string) =>
    api.delete(`/nonconformance/defect-causes/${code}/delete/`),
  
  // 발생 원인 재정렬
  reorderDefectCauses: (major: string, codes: string[]) =>
    api.post('/nonconformance/defect-causes/reorder/', { major, codes }),
  
  // CSV 다운로드
  exportCSV: (year: number, month: number) =>
    api.get('/nonconformance/export/', {
      params: { year, month },
      responseType: 'blob'
    }),
}

// 일정 관련 타입 정의
export interface Schedule {
  id: number
  schedule_uid: string
  type: 'quality' | 'personal'
  type_display: string
  category: string
  category_display: string
  title: string
  description?: string
  importance: 'low' | 'medium' | 'high'
  importance_display: string
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  location?: string
  participants: number[]
  participant_names: Array<{id: number, name: string}>
  owner: number
  owner_name: string
  is_all_day: boolean
  created_at: string
  updated_at: string
}

export interface ScheduleCreateRequest {
  type: 'quality' | 'personal'
  category: string
  title: string
  description?: string
  importance: 'low' | 'medium' | 'high'
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  location?: string
  participants?: number[]
}

export interface ScheduleListParams {
  type?: 'quality' | 'personal'
  category?: string
  importance?: 'low' | 'medium' | 'high'
  owner?: number
  participant?: number
  date_from?: string
  date_to?: string
  search?: string
  ordering?: string
  page?: number
}

export interface ScheduleCategory {
  code: string
  name: string
}

export interface ScheduleUser {
  id: number
  name: string
  department: string
  position: string
}

// 고객 불만 관련 타입 정의
export interface CustomerComplaint {
  id: number
  ccr_uid: string
  occurrence_date: string
  ccr_no: string
  vendor: string
  product_name: string
  defect_qty: number
  unit_price: number
  total_amount: number
  complaint_content: string
  action_content?: string
  action_completed: boolean
  defect_type_code: string
  defect_type_name: string
  cause_code: string
  cause_name: string
  cause_category: string
  cause_category_display: string
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface CustomerComplaintCreateRequest {
  occurrence_date: string
  ccr_no: string
  vendor: string
  product_name: string
  defect_qty: string | number
  unit_price: string | number
  complaint_content: string
  action_content?: string
  action_completed?: boolean
  defect_type_code: string
  cause_code: string
}

export interface CustomerComplaintListParams {
  defect_type_code?: string
  cause_code?: string
  category?: string
  vendor?: string
  date_from?: string
  date_to?: string
  has_action?: 'true' | 'false'
  search?: string
  ordering?: string
  page?: number
}

export const customerComplaintAPI = {
  // 고객 불만 목록 조회
  getComplaints: (params?: CustomerComplaintListParams) =>
    api.get<{results: CustomerComplaint[], count: number}>('/customer-complaints/', { params }),
  
  // 고객 불만 상세 조회
  getComplaint: (id: number) =>
    api.get<CustomerComplaint>(`/customer-complaints/${id}/`),
  
  // 고객 불만 등록
  createComplaint: (data: CustomerComplaintCreateRequest) =>
    api.post<CustomerComplaint>('/customer-complaints/create/', data),
  
  // 고객 불만 수정
  updateComplaint: (id: number, data: Partial<CustomerComplaintCreateRequest>) =>
    api.put<CustomerComplaint>(`/customer-complaints/${id}/update/`, data),
  
  // 고객 불만 삭제
  deleteComplaint: (id: number) =>
    api.delete(`/customer-complaints/${id}/delete/`),
  
  // 다음 CCR NO 조회
  getNextCcrNo: () =>
    api.get<{ok: boolean, data: {next_ccr_no: string}}>('/customer-complaints/next-ccr-no/'),
  
  // CSV 다운로드
  exportCSV: (year: number, month: number) =>
    api.get('/customer-complaints/export/', {
      params: { year, month },
      responseType: 'blob'
    }),
}

export const scheduleAPI = {
  // 일정 목록 조회
  getSchedules: (params?: ScheduleListParams) => {
    // 빈 값들을 제거한 clean params 생성
    const cleanParams: any = {}
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value
        }
      })
    }
    return api.get<{results: Schedule[], count: number}>('/schedules/list/', { params: cleanParams })
  },
  
  // 일정 상세 조회
  getSchedule: (id: number) =>
    api.get<Schedule>(`/schedules/${id}/`),
  
  // 일정 등록
  createSchedule: (data: ScheduleCreateRequest) =>
    api.post<{ok: boolean, data: {id: number, schedule_uid: string, title: string}}>('/schedules/', data),
  
  // 일정 수정
  updateSchedule: (id: number, data: Partial<ScheduleCreateRequest>) =>
    api.put<{ok: boolean, data: Schedule}>(`/schedules/${id}/update/`, data),
  
  // 일정 삭제
  deleteSchedule: (id: number) =>
    api.delete<{ok: boolean}>(`/schedules/${id}/delete/`),
  
  // 카테고리 목록
  getCategories: () =>
    api.get<{ok: boolean, data: {quality: ScheduleCategory[], personal: ScheduleCategory[]}}>('/schedules/categories/'),
  
  // 참석자 선택용 사용자 목록
  getUsers: () =>
    api.get<{ok: boolean, data: ScheduleUser[]}>('/schedules/users/'),
}

// ========================================
// KPI Target (KPI 목표) API
// ========================================

export interface KPITarget {
  id: number
  kpi_uid: string
  year: number
  kpi_type: 'defect_rate' | 'f_cost' | 'complaints'
  kpi_type_display: string
  target_value: string
  unit: '%' | 'ppm' | 'KRW' | 'count'
  unit_display: string
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface KPITargetCreateRequest {
  year: number
  kpi_type: 'defect_rate' | 'f_cost' | 'complaints'
  target_value: string | number
  unit: '%' | 'ppm' | 'KRW' | 'count'
}

export interface KPITargetListParams {
  year?: number
  kpi_type?: string
  years?: string  // 예: "2022,2023,2024"
  page?: number
}

export const kpiTargetAPI = {
  // KPI 목표 목록 조회
  getKPITargets: (params?: KPITargetListParams) =>
    api.get<{results: KPITarget[], count: number}>('/kpi-targets/', { params }),
  
  // KPI 목표 상세 조회
  getKPITarget: (id: number) =>
    api.get<KPITarget>(`/kpi-targets/${id}/`),
  
  // KPI 목표 등록
  createKPITarget: (data: KPITargetCreateRequest) =>
    api.post<KPITarget>('/kpi-targets/', data),
  
  // KPI 목표 수정
  updateKPITarget: (id: number, data: Partial<KPITargetCreateRequest>) =>
    api.put<KPITarget>(`/kpi-targets/${id}/`, data),
  
  // KPI 목표 삭제
  deleteKPITarget: (id: number) =>
    api.delete(`/kpi-targets/${id}/`),
  
  // 사용 가능한 연도 목록
  getAvailableYears: () =>
    api.get<number[]>('/kpi-targets/years/'),
}

// ========================================
// Dashboard (대시보드) API
// ========================================

export interface DashboardKPIResponse {
  year: number
  month: number
  kpis: {
    defect_rate: {
      monthly: {
        actual_percent: number
        prev_percent: number
      }
      ytd: {
        actual_percent: number
        annual_target_percent: number
      }
    }
    f_cost: {
      monthly: {
        actual: number
        prev: number
      }
      ytd: {
        actual: number
        annual_target: number
      }
    }
    complaints: {
      monthly: {
        actual: number
        prev: number
      }
      ytd: {
        actual: number
        annual_target: number
      }
    }
  }
}

export interface DefectRateTrendData {
  year: number
  month: number
  label: string
  actual: number
  target: number | null
  ytd_data?: Array<{ month: number; actual: number }>
}

export interface FCostTrendData {
  year: number
  month: number
  label: string
  actual: number
  target: number | null
  ytd_data?: Array<{ month: number; actual: number }>
}

export interface ComplaintsTrendData {
  year: number
  month: number
  label: string
  actual: number
  target: number | null
  ytd_data?: Array<{ month: number; actual: number }>
}

export interface DefectTypeDistribution {
  code: string
  name: string
  value: number
}

export interface DefectCauseDistribution {
  category: string
  value: number
}

export interface SparklineData {
  month: string
  value: number
}

export interface UpcomingSchedule {
  id: number
  schedule_uid: string
  title: string
  schedule_date: string
  start_time: string | null
  end_time: string | null
  importance: string
  importance_display: string
  location: string | null
  description: string | null
}

export const dashboardAPI = {
  // KPI 통합 데이터
  getKPIs: (year: number, month: number) =>
    api.get<DashboardKPIResponse>('/dashboard/kpis/', { params: { year, month } }),
  
  // 월별 불량율 추이 (최근 12개월)
  getDefectRateTrend: (year: number, month: number) =>
    api.get<{ data: DefectRateTrendData[] }>('/dashboard/charts/defect-rate-trend/', { params: { year, month } }),
  
  // 월별 F-COST 추이 (최근 12개월)
  getFCostTrend: (year: number, month: number) =>
    api.get<{ data: FCostTrendData[] }>('/dashboard/charts/f-cost-trend/', { params: { year, month } }),
  
  // 월별 고객 불만 건수 추이 (최근 12개월)
  getComplaintsTrend: (year: number, month: number) =>
    api.get<{ data: ComplaintsTrendData[] }>('/dashboard/charts/complaints-trend/', { params: { year, month } }),
  
  // 불량 유형별 분포
  getDefectTypeDistribution: (year: number, month: number, metric: 'count' | 'amount' = 'count') =>
    api.get<{ year: number; month: number; metric: string; data: DefectTypeDistribution[] }>(
      '/dashboard/charts/defect-type-distribution/',
      { params: { year, month, metric } }
    ),
  
  // 발생 원인별 분포 (6M)
  getDefectCauseDistribution: (year: number, month: number, metric: 'count' | 'amount' = 'count') =>
    api.get<{ year: number; month: number; metric: string; data: DefectCauseDistribution[] }>(
      '/dashboard/charts/defect-cause-distribution/',
      { params: { year, month, metric } }
    ),
  
  // 불량 유형별 연간 누적 분포 (1월~선택된 월)
  getDefectTypeYTDDistribution: (year: number, month: number, metric: 'count' | 'amount' = 'count') =>
    api.get<{ year: number; month: number; metric: string; data: DefectTypeDistribution[] }>(
      '/dashboard/charts/defect-type-ytd-distribution/',
      { params: { year, month, metric } }
    ),
  
  // 발생 원인별 연간 누적 분포 (1월~선택된 월, 6M)
  getDefectCauseYTDDistribution: (year: number, month: number, metric: 'count' | 'amount' = 'count') =>
    api.get<{ year: number; month: number; metric: string; data: DefectCauseDistribution[] }>(
      '/dashboard/charts/defect-cause-ytd-distribution/',
      { params: { year, month, metric } }
    ),
  
  // 스파크라인 데이터
  getSparklineData: (year: number, month: number, kpi_type: 'defect_rate' | 'f_cost' | 'complaints') =>
    api.get<{ kpi_type: string; data: SparklineData[] }>('/dashboard/sparkline/', { params: { year, month, kpi_type } }),
  
  // 향후 14일 품질 일정
  getUpcomingSchedules: () =>
    api.get<{ count: number; schedules: UpcomingSchedule[] }>('/dashboard/schedules/upcoming/'),
}

// ==================== 포스트잇 보드 API ====================

// 태그 타입 정의
export interface Tag {
  id: number
  name: string
  color?: string
  created_at: string
}

// 작성자 타입
export interface Author {
  id: number
  username: string
  name: string
  department: string
}

// 포스트잇 타입
export interface StickyNote {
  id: number
  note_uid: string
  author: Author
  content: string
  importance: 'low' | 'medium' | 'high'
  importance_display: string
  color: 'yellow' | 'blue' | 'pink' | 'green' | 'purple' | 'gray'
  x: number
  y: number
  width: number
  height: number
  z_index: number
  is_locked: boolean
  tags: Tag[]
  created_at: string
  updated_at: string
}

// 포스트잇 목록용 타입
export interface StickyNoteListItem {
  id: number
  note_uid: string
  author_name: string
  content: string
  importance: 'low' | 'medium' | 'high'
  importance_display: string
  color: string
  x: number
  y: number
  width: number
  height: number
  z_index: number
  is_locked: boolean
  tags: Tag[]
  created_at: string
  updated_at: string
}

// 포스트잇 생성/수정 요청 타입
export interface StickyNoteRequest {
  content: string
  importance?: 'low' | 'medium' | 'high'
  color?: string
  x?: number
  y?: number
  width?: number
  height?: number
  z_index?: number
  is_locked?: boolean
  tag_ids?: number[]
}

// 위치 업데이트 요청 타입
export interface StickyNotePositionUpdate {
  x?: number
  y?: number
  z_index?: number
  width?: number
  height?: number
}

// 일괄 업데이트 요청 타입
export interface StickyNoteBulkUpdate {
  note_ids: number[]
  x_offset?: number
  y_offset?: number
  color?: string
  importance?: 'low' | 'medium' | 'high'
  is_locked?: boolean
}

// 포스트잇 API
export const stickyNotesAPI = {
  // 포스트잇 목록 조회 (필터링 지원)
  list: (params?: {
    query?: string
    tag_ids?: string
    importance?: string
    color?: string
    author_id?: number
    from_date?: string
    to_date?: string
    is_locked?: boolean
  }) => api.get<{ results: StickyNoteListItem[] }>('/sticky-notes/', { params }),

  // 포스트잇 상세 조회
  get: (id: number) => api.get<StickyNote>(`/sticky-notes/${id}/`),

  // 포스트잇 생성
  create: (data: StickyNoteRequest) => api.post<StickyNote>('/sticky-notes/', data),

  // 포스트잇 수정
  update: (id: number, data: Partial<StickyNoteRequest>) =>
    api.patch<StickyNote>(`/sticky-notes/${id}/`, data),

  // 포스트잇 위치 업데이트 (빠른 업데이트)
  updatePosition: (id: number, data: StickyNotePositionUpdate) =>
    api.patch<StickyNote>(`/sticky-notes/${id}/update_position/`, data),

  // 포스트잇 삭제
  delete: (id: number) => api.delete(`/sticky-notes/${id}/`),

  // 다중 선택 일괄 업데이트
  bulkUpdate: (data: StickyNoteBulkUpdate) =>
    api.post<{ success: boolean; updated_count: number }>('/sticky-notes/bulk_update/', data),

  // 뷰포트 영역 내 메모 조회
  byViewport: (viewport: { x_min: number; x_max: number; y_min: number; y_max: number }) =>
    api.get<StickyNoteListItem[]>('/sticky-notes/by_viewport/', { params: viewport }),
}

// 태그 API
export const tagsAPI = {
  // 태그 목록 조회 (페이지네이션 없이 전체 조회하려면 ?page_size=1000 추가)
  list: () => api.get<{ results: Tag[]; count: number }>('/tags/?page_size=1000'),

  // 태그 생성
  create: (data: { name: string; color?: string }) => api.post<Tag>('/tags/', data),

  // 태그 수정
  update: (id: number, data: { name?: string; color?: string }) =>
    api.patch<Tag>(`/tags/${id}/`, data),

  // 태그 삭제
  delete: (id: number) => api.delete(`/tags/${id}/`),
}

// 백업 관리 타입 정의
export interface BackupRecord {
  id: number
  backup_date: string
  file_size: number
  file_size_display: string
  backup_type: 'auto' | 'manual'
  backup_type_display: string
  file_path: string
  created_by: number | null
  created_by_name: string
  note: string
}

export interface ArchivableDataStats {
  performance_records: number
  nonconformances: number
  customer_complaints: number
  audit_logs: number
}

export interface BackupStats {
  total_records: number
  auto_backups: number
  manual_backups: number
  total_files: number
  total_size: number
  orphaned_records: number
  orphaned_files: number
  is_synced: boolean
}

export interface SyncStats {
  orphaned_records_deleted: number
  orphaned_files_registered: number
  errors: string[]
}

// 백업 관리 API
export const backupAPI = {
  // 백업 파일 다운로드 (새로 생성)
  download: async () => {
    const response = await api.post('/backup/download/', {}, {
      responseType: 'blob'
    })
    return response
  },

  // 기존 백업 파일 다운로드
  downloadFile: async (backupId: number) => {
    const response = await api.get(`/backup/download/${backupId}/`, {
      responseType: 'blob'
    })
    return response
  },

  // 백업 파일 업로드 및 복원
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ message: string; file_name: string; file_size: number }>(
      '/backup/upload/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
  },

  // 백업 이력 조회
  history: () => api.get<BackupRecord[]>('/backup/history/'),

  // 백업 파일 삭제
  delete: (backupId: number) => api.delete<{ message: string; backup_id: number }>(`/backup/delete/${backupId}/`),

  // 삭제 가능한 데이터 통계 조회
  archivableStats: () => api.get<ArchivableDataStats>('/backup/archivable-stats/'),

  // 백업 동기화
  sync: () => api.post<{ message: string; stats: SyncStats }>('/backup/sync/'),

  // 백업 통계 조회
  stats: () => api.get<BackupStats>('/backup/stats/'),
}

export default api
