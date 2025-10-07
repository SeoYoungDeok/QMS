'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { kpiTargetAPI, type KPITarget, type KPITargetCreateRequest } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Sidebar from '@/components/ui/Sidebar'
import Modal from '@/components/ui/Modal'
import { toast, Toaster } from 'sonner'

type TabType = 'create' | 'list'
type KPIType = 'defect_rate' | 'f_cost' | 'complaints'

interface KPIFormData {
  defect_rate: {
    target_value: string
    unit: '%' | 'ppm'
  }
  f_cost: {
    target_value: string
    unit: 'KRW'
  }
  complaints: {
    target_value: string
    unit: 'count'
  }
}

export default function KPITargetsPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('create')
  const [targets, setTargets] = useState<KPITarget[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // 등록 폼 상태 - 연도와 3가지 KPI를 한 번에 관리
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [kpiFormData, setKpiFormData] = useState<KPIFormData>({
    defect_rate: { target_value: '', unit: '%' },
    f_cost: { target_value: '', unit: 'KRW' },
    complaints: { target_value: '', unit: 'count' }
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 목록 필터
  const [listFilters, setListFilters] = useState({
    year: new Date().getFullYear(),
    kpi_type: ''
  })

  // 삭제 모달
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KPITarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 수정 모달
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<KPITarget | null>(null)
  const [editFormData, setEditFormData] = useState<KPITargetCreateRequest | null>(null)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [editValidationError, setEditValidationError] = useState<string>('')

  // 사용 가능한 연도 목록
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // 초기 데이터 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadAvailableYears()
      setInitialLoading(false)
    }
  }, [isAuthenticated])

  // 탭 변경 시 목록 로드
  useEffect(() => {
    if (activeTab === 'list' && isAuthenticated) {
      loadTargets()
    }
  }, [activeTab, isAuthenticated])

  // 목록 필터 변경 시
  useEffect(() => {
    if (activeTab === 'list' && isAuthenticated) {
      loadTargets()
    }
  }, [listFilters, isAuthenticated])

  // 연도 목록 로드
  const loadAvailableYears = async () => {
    try {
      const response = await kpiTargetAPI.getAvailableYears()
      setAvailableYears(response.data)
    } catch (error) {
      console.error('Failed to load available years:', error)
    }
  }

  // KPI 목표 목록 로드
  const loadTargets = async () => {
    try {
      setLoading(true)
      
      const params: any = {}
      if (listFilters.year) params.year = listFilters.year
      if (listFilters.kpi_type) params.kpi_type = listFilters.kpi_type
      
      const response = await kpiTargetAPI.getKPITargets(params)
      setTargets(response.data.results)
    } catch (error: any) {
      console.error('Load targets error:', error)
      toast.error('KPI 목표 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 실시간 유효성 검사 상태
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 유효성 검사 함수
  const validateKPIInput = (kpiType: KPIType, value: string, unit: string): string | null => {
    if (!value || value.trim() === '') return null

    const numValue = parseFloat(value)

    if (isNaN(numValue)) {
      return '유효한 숫자를 입력해주세요.'
    }

    if (numValue < 0) {
      return '0 이상의 값을 입력해주세요.'
    }

    if (kpiType === 'defect_rate') {
      if (unit === '%') {
        // % 단위: 0~100, 소수점 가능
        if (numValue > 100) {
          return '100% 이하의 값을 입력해주세요.'
        }
        // 소수점은 허용
      } else if (unit === 'ppm') {
        // ppm 단위: 정수만 가능
        if (!Number.isInteger(numValue)) {
          return 'ppm 단위는 정수로만 입력 가능합니다.'
        }
      }
    } else if (kpiType === 'f_cost') {
      // F-COST: 정수만 가능
      if (!Number.isInteger(numValue)) {
        return '원(KRW) 단위는 정수로만 입력 가능합니다.'
      }
    } else if (kpiType === 'complaints') {
      // 고객 불만 건수: 정수만 가능
      if (!Number.isInteger(numValue)) {
        return '건수는 정수로만 입력 가능합니다.'
      }
    }

    return null
  }

  // KPI 데이터 입력 핸들러 (실시간 유효성 검사 포함)
  const handleKPIChange = (kpiType: KPIType, field: 'target_value' | 'unit', value: string) => {
    setKpiFormData(prev => ({
      ...prev,
      [kpiType]: {
        ...prev[kpiType],
        [field]: value
      }
    }))

    // 실시간 유효성 검사 (target_value 변경 시)
    if (field === 'target_value') {
      const currentUnit = kpiFormData[kpiType].unit
      const error = validateKPIInput(kpiType, value, currentUnit)
      
      if (error) {
        setValidationErrors(prev => ({ ...prev, [kpiType]: error }))
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[kpiType]
          return newErrors
        })
      }
    }

    // 단위 변경 시에도 재검증
    if (field === 'unit') {
      const currentValue = kpiFormData[kpiType].target_value
      const error = validateKPIInput(kpiType, currentValue, value)
      
      if (error) {
        setValidationErrors(prev => ({ ...prev, [kpiType]: error }))
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[kpiType]
          return newErrors
        })
      }
    }

    // 폼 제출 에러 제거
    if (formErrors[kpiType]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[kpiType]
        return newErrors
      })
    }
  }

  // 일괄 등록 처리
  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((user?.role_level ?? 0) < 1) {
      toast.error('KPI 목표 등록 권한이 없습니다.')
      return
    }

    // 최종 유효성 검사
    const errors: Record<string, string> = {}
    const kpiTypes: KPIType[] = ['defect_rate', 'f_cost', 'complaints']
    
    for (const kpiType of kpiTypes) {
      const data = kpiFormData[kpiType]
      if (data.target_value && data.target_value.trim() !== '') {
        const error = validateKPIInput(kpiType, data.target_value, data.unit)
        if (error) {
          errors[kpiType] = error
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error('입력 값을 확인해주세요.')
      return
    }

    setLoading(true)
    setFormErrors({})

    try {
      const createPromises = []

      // 입력된 KPI만 등록
      for (const kpiType of kpiTypes) {
        const data = kpiFormData[kpiType]
        if (data.target_value && data.target_value.trim() !== '') {
          const requestData: KPITargetCreateRequest = {
            year: selectedYear,
            kpi_type: kpiType,
            target_value: data.target_value,
            unit: data.unit
          }
          createPromises.push(kpiTargetAPI.createKPITarget(requestData))
        }
      }

      if (createPromises.length === 0) {
        toast.warning('최소 하나의 KPI 목표를 입력해주세요.')
        setLoading(false)
        return
      }

      await Promise.all(createPromises)
      toast.success(`${createPromises.length}개의 KPI 목표가 성공적으로 등록되었습니다.`)
      
      // 폼 초기화
      setKpiFormData({
        defect_rate: { target_value: '', unit: '%' },
        f_cost: { target_value: '', unit: 'KRW' },
        complaints: { target_value: '', unit: 'count' }
      })
      setValidationErrors({})
      
      await loadAvailableYears()
      
    } catch (err: any) {
      console.error('Bulk create error:', err)
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setFormErrors(errorData)
        }
        toast.error('KPI 목표 등록에 실패했습니다. 입력 값을 확인해주세요.')
      } else {
        toast.error('KPI 목표 등록에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 삭제 모달 열기
  const openDeleteModal = (target: KPITarget) => {
    setDeleteTarget(target)
    setDeleteModalOpen(true)
  }

  // 삭제 모달 닫기
  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  // KPI 목표 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await kpiTargetAPI.deleteKPITarget(deleteTarget.id)
      toast.success('KPI 목표가 성공적으로 삭제되었습니다.')
      closeDeleteModal()
      await loadTargets()
      await loadAvailableYears()
    } catch (error: any) {
      console.error('Delete error:', error)
      if (error.response?.status === 403) {
        toast.error('KPI 목표 삭제 권한이 없습니다.')
      } else if (error.response?.data?.error) {
        toast.error(`삭제 실패: ${error.response.data.error}`)
      } else {
        toast.error('KPI 목표 삭제에 실패했습니다.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // 수정 모달 열기
  const openEditModal = (target: KPITarget) => {
    setEditTarget(target)
    setEditFormData({
      year: target.year,
      kpi_type: target.kpi_type,
      target_value: target.target_value,
      unit: target.unit
    })
    setEditErrors({})
    setEditValidationError('')
    setEditModalOpen(true)
  }

  // 수정 폼 입력 핸들러 (실시간 유효성 검사)
  const handleEditChange = (field: 'target_value' | 'unit', value: string) => {
    if (!editFormData) return

    setEditFormData(prev => prev ? { ...prev, [field]: value } : null)

    // 실시간 유효성 검사
    if (field === 'target_value') {
      const error = validateKPIInput(editFormData.kpi_type as KPIType, value, String(editFormData.unit))
      setEditValidationError(error || '')
    } else if (field === 'unit') {
      const error = validateKPIInput(editFormData.kpi_type as KPIType, String(editFormData.target_value), value)
      setEditValidationError(error || '')
    }

    // 서버 에러 제거
    if (editErrors.target_value) {
      setEditErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.target_value
        return newErrors
      })
    }
  }

  // 수정 처리
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editTarget || !editFormData) return

    // 최종 유효성 검사
    const error = validateKPIInput(
      editFormData.kpi_type as KPIType,
      String(editFormData.target_value),
      String(editFormData.unit)
    )

    if (error) {
      setEditValidationError(error)
      toast.error('입력 값을 확인해주세요.')
      return
    }

    setLoading(true)
    setEditErrors({})

    try {
      await kpiTargetAPI.updateKPITarget(editTarget.id, editFormData)
      toast.success('KPI 목표가 성공적으로 수정되었습니다.')
      setEditModalOpen(false)
      setEditTarget(null)
      setEditFormData(null)
      setEditValidationError('')
      await loadTargets()
      await loadAvailableYears()
    } catch (err: any) {
      console.error('Edit error:', err)
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setEditErrors(errorData)
        }
        toast.error('KPI 목표 수정에 실패했습니다. 입력 값을 확인해주세요.')
      } else {
        toast.error('KPI 목표 수정에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: any) => {
    setListFilters(prev => ({ ...prev, [key]: value }))
  }

  // 값 포맷팅 함수
  const formatValue = (value: string, unit: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return value

    if (unit === 'KRW') {
      return numValue.toLocaleString('ko-KR')
    } else if (unit === '%') {
      return numValue.toFixed(4)
    } else if (unit === 'ppm') {
      return numValue.toFixed(2)
    } else {
      return numValue.toString()
    }
  }

  // 단위 표시명 가져오기
  const getUnitDisplayName = (unit: string) => {
    const unitMap: Record<string, string> = {
      '%': '%',
      'ppm': 'ppm',
      'KRW': '원',
      'count': '건'
    }
    return unitMap[unit] || unit
  }

  // KPI 종류별 라벨
  const getKPILabel = (kpiType: string) => {
    switch (kpiType) {
      case 'defect_rate': return '불량율'
      case 'f_cost': return 'F-COST'
      case 'complaints': return '고객 불만 건수'
      default: return kpiType
    }
  }

  // 권한 체크
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">로그인이 필요합니다.</p>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-[var(--text-secondary)]">KPI 목표 관리 시스템을 준비 중입니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">KPI 목표 관리</h1>
              <p className="text-[var(--text-secondary)] mt-1">연간 KPI 목표를 설정하고 관리하세요</p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              등록
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              목록/관리
            </button>
          </div>

          {/* 탭 컨텐츠 */}
          {activeTab === 'create' && (
            <Card>
              <CardHeader>
                <CardTitle>KPI 목표 등록</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBulkCreate} className="space-y-6">
                  {/* 연도 선택 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium mb-2">
                      등록 연도 <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      options={Array.from({ length: 6 }, (_, i) => {
                        const year = new Date().getFullYear() - i
                        return { value: year, label: `${year}년` }
                      })}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-blue-700 mt-2">
                      선택한 연도에 대해 아래 3가지 KPI 목표를 한 번에 등록할 수 있습니다.
                    </p>
                  </div>

                  {/* 안내 사항 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-gray-900">📌 KPI 목표 등록 가이드</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• <strong>불량율:</strong> % 또는 ppm 단위로 관리 (1% = 10,000 ppm)</li>
                      <li>• <strong>F-COST:</strong> 원(KRW) 단위로 연간 목표 비용 관리</li>
                      <li>• <strong>고객 불만 건수:</strong> 연간 목표 건수 관리</li>
                      <li>• 각 KPI는 선택적으로 입력 가능하며, 최소 하나 이상 입력해야 합니다.</li>
                      <li>• 이미 등록된 연도와 KPI 종류는 중복 등록이 불가합니다.</li>
                    </ul>
                  </div>

                  {/* KPI 입력 섹션들 */}
                  <div className="space-y-4">
                    {/* 불량율 */}
                    <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="warning" size="lg">불량율 (Defect Rate)</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">목표값</label>
                          <Input
                            type="number"
                            step={kpiFormData.defect_rate.unit === '%' ? 'any' : '1'}
                            min="0"
                            max={kpiFormData.defect_rate.unit === '%' ? '100' : undefined}
                            value={kpiFormData.defect_rate.target_value}
                            onChange={(e) => handleKPIChange('defect_rate', 'target_value', e.target.value)}
                            placeholder={kpiFormData.defect_rate.unit === '%' ? '예: 0.5' : '예: 5000'}
                            error={formErrors.defect_rate}
                          />
                          {validationErrors.defect_rate && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.defect_rate}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">단위</label>
                          <Select
                            value={kpiFormData.defect_rate.unit}
                            onChange={(e) => handleKPIChange('defect_rate', 'unit', e.target.value)}
                            options={[
                              { value: '%', label: '% (0~100)' },
                              { value: 'ppm', label: 'ppm' }
                            ]}
                          />
                        </div>
                      </div>
                      {kpiFormData.defect_rate.target_value && !validationErrors.defect_rate && (
                        <p className="text-xs text-orange-700 mt-2">
                          ✓ 변환: {kpiFormData.defect_rate.target_value}{kpiFormData.defect_rate.unit}
                          {kpiFormData.defect_rate.unit === '%' && 
                            ` = ${(parseFloat(kpiFormData.defect_rate.target_value) * 10000).toFixed(2)} ppm`
                          }
                          {kpiFormData.defect_rate.unit === 'ppm' && 
                            ` = ${(parseFloat(kpiFormData.defect_rate.target_value) / 10000).toFixed(4)}%`
                          }
                        </p>
                      )}
                    </div>

                    {/* F-COST */}
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="success" size="lg">F-COST</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">목표값 (원)</label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={kpiFormData.f_cost.target_value}
                            onChange={(e) => handleKPIChange('f_cost', 'target_value', e.target.value)}
                            placeholder="예: 120000000"
                            error={formErrors.f_cost}
                          />
                          {validationErrors.f_cost && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.f_cost}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">단위</label>
                          <Input value="원 (KRW)" disabled className="bg-gray-100" />
                        </div>
                      </div>
                      {kpiFormData.f_cost.target_value && !validationErrors.f_cost && (
                        <p className="text-xs text-green-700 mt-2">
                          ✓ 표시: ₩{parseFloat(kpiFormData.f_cost.target_value).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>

                    {/* 고객 불만 건수 */}
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="primary" size="lg">고객 불만 건수 (Complaints)</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">목표값 (건)</label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={kpiFormData.complaints.target_value}
                            onChange={(e) => handleKPIChange('complaints', 'target_value', e.target.value)}
                            placeholder="예: 12"
                            error={formErrors.complaints}
                          />
                          {validationErrors.complaints && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.complaints}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">단위</label>
                          <Input value="건 (count)" disabled className="bg-gray-100" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 권한 안내 */}
                  {user && user.role_level < 1 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        ℹ️ 게스트 권한으로는 조회만 가능합니다. 목표 등록은 실무자 이상 권한이 필요합니다.
                      </p>
                    </div>
                  )}

                  {/* 제출 버튼 */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading || (user?.role_level ?? 0) < 1}
                      className="px-8"
                    >
                      {loading ? '등록 중...' : 'KPI 목표 일괄 등록'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'list' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>KPI 목표 목록</CardTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadTargets()}
                    disabled={loading}
                  >
                    {loading ? '로딩...' : '🔄 새로고침'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 필터 */}
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">연도</label>
                        <Select
                          value={listFilters.year}
                          onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                          options={[
                            { value: '', label: '전체' },
                            ...Array.from({ length: 6 }, (_, i) => {
                              const year = new Date().getFullYear() - i
                              return { value: year, label: `${year}년` }
                            })
                          ]}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">KPI 종류</label>
                        <Select
                          value={listFilters.kpi_type}
                          onChange={(e) => handleFilterChange('kpi_type', e.target.value)}
                          options={[
                            { value: '', label: '전체' },
                            { value: 'defect_rate', label: '불량율' },
                            { value: 'f_cost', label: 'F-COST' },
                            { value: 'complaints', label: '고객 불만 건수' }
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 목록 테이블 */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-[var(--text-secondary)]">KPI 목표 목록을 불러오는 중...</p>
                  </div>
                ) : targets.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    등록된 KPI 목표가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">연도</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">KPI 종류</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">목표값</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">단위</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">작성자</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">수정일</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {targets.map(target => (
                          <tr key={target.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{target.year}년</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{target.kpi_type_display}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatValue(target.target_value, target.unit)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {getUnitDisplayName(target.unit)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{target.created_by_name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {new Date(target.updated_at).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex gap-1">
                                {user && user.role_level >= 1 && (
                                  <>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openEditModal(target)}
                                    >
                                      수정
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => openDeleteModal(target)}
                                    >
                                      삭제
                                    </Button>
                                  </>
                                )}
                                {(!user || user.role_level < 1) && (
                                  <span className="text-sm text-gray-400">권한 없음</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title="KPI 목표 삭제"
        size="md"
      >
        {deleteTarget && (
          <div className="space-y-6">
            {/* 경고 아이콘 */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* 메시지 */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                정말로 이 KPI 목표를 삭제하시겠습니까?
              </h3>
              <p className="text-sm text-gray-600">
                삭제된 데이터는 복구할 수 없습니다.
              </p>
            </div>

            {/* KPI 정보 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">연도</span>
                  <span className="text-sm font-semibold text-gray-900">{deleteTarget.year}년</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">KPI 종류</span>
                  <span className="text-sm text-gray-900">{deleteTarget.kpi_type_display}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">목표값</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatValue(deleteTarget.target_value, deleteTarget.unit)} {deleteTarget.unit_display}
                  </span>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 수정 모달 */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditTarget(null)
          setEditFormData(null)
          setEditErrors({})
        }}
        title="KPI 목표 수정"
        size="md"
      >
        {editFormData && editTarget && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">연도</label>
              <Input
                value={`${editFormData.year}년`}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">연도는 수정할 수 없습니다</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">KPI 종류</label>
              <Input
                value={getKPILabel(editFormData.kpi_type)}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">KPI 종류는 수정할 수 없습니다</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                목표값 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step={editFormData.kpi_type === 'defect_rate' && editFormData.unit === '%' ? 'any' : '1'}
                  min="0"
                  max={editFormData.kpi_type === 'defect_rate' && editFormData.unit === '%' ? '100' : undefined}
                  value={editFormData.target_value}
                  onChange={(e) => handleEditChange('target_value', e.target.value)}
                  error={editErrors.target_value}
                  placeholder="목표값 입력"
                  className="flex-1"
                  required
                />
                {editFormData.kpi_type === 'defect_rate' ? (
                  <Select
                    value={editFormData.unit}
                    onChange={(e) => handleEditChange('unit', e.target.value)}
                    options={[
                      { value: '%', label: '% (소수점)' },
                      { value: 'ppm', label: 'ppm (정수)' }
                    ]}
                    className="w-40"
                  />
                ) : (
                  <Input
                    value={editFormData.unit === 'KRW' ? '원 (정수)' : '건 (정수)'}
                    disabled
                    className="w-32 bg-gray-100"
                  />
                )}
              </div>
              {editValidationError && (
                <p className="mt-1 text-sm text-red-600">{editValidationError}</p>
              )}
            </div>

            {editFormData.kpi_type === 'defect_rate' && editFormData.target_value && !editValidationError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  ✓ 변환: {editFormData.target_value}{editFormData.unit}
                  {editFormData.unit === '%' && 
                    ` = ${(parseFloat(String(editFormData.target_value)) * 10000).toFixed(2)} ppm`
                  }
                  {editFormData.unit === 'ppm' && 
                    ` = ${(parseFloat(String(editFormData.target_value)) / 10000).toFixed(4)}%`
                  }
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditModalOpen(false)
                  setEditTarget(null)
                  setEditFormData(null)
                  setEditErrors({})
                }}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? '수정 중...' : '수정 완료'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Toast 알림 */}
      <Toaster position="top-right" richColors />
    </div>
  )
}
