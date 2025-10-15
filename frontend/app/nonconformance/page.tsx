'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  nonconformanceAPI,
  performanceAPI,
  type Nonconformance, 
  type NonconformanceCreateRequest,
  type DefectType,
  type DefectCause,
  type SixMCategory,
  type SixMGuide,
  type Vendor
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Sidebar from '@/components/ui/Sidebar'
import SearchableSelect from '@/components/ui/SearchableSelect'
import VendorProducerManagementModal from '@/components/ui/VendorProducerManagementModal'
import { toast, Toaster } from 'sonner'
import NonconformanceManagementModal from '@/components/ui/NonconformanceManagementModal'

type TabType = 'create' | 'list'

export default function NonconformancePage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('create')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')

  // 코드 테이블 데이터
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([])
  const [defectCauses, setDefectCauses] = useState<DefectCause[]>([])
  const [sixMCategories, setSixMCategories] = useState<SixMCategory[]>([])
  const [sixMGuide, setSixMGuide] = useState<SixMGuide | null>(null)

  // 등록 폼 상태
  const [createForm, setCreateForm] = useState<NonconformanceCreateRequest>({
    type: 'inhouse',
    occurrence_date: new Date().toISOString().split('T')[0],
    ncr_no: '',
    vendor: '',
    product_name: '',
    control_no: '',
    defect_qty: '',
    unit_price: '',
    weight_factor: '',
    detection_stage: '',
    defect_type_code: '',
    cause_code: '',
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    root_cause: '',
    operators: [],
    process_name: '',
    note: ''
  })

  // 폼 에러 상태
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // 실시간 유효성 검사 에러
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 작업자 입력 상태
  const [operatorInput, setOperatorInput] = useState('')

  // 모달 상태
  const [showSixMGuide, setShowSixMGuide] = useState(false)
  const [selectedNonconformance, setSelectedNonconformance] = useState<Nonconformance | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<NonconformanceCreateRequest | null>(null)
  const [editOperatorInput, setEditOperatorInput] = useState('')
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({})
  const [showManageModal, setShowManageModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Nonconformance | null>(null)
  const [vendorModalOpen, setVendorModalOpen] = useState(false)

  // 목록 상태
  const [nonconformances, setNonconformances] = useState<Nonconformance[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    search: '',
    type: '',
    defect_type_code: '',
    cause_category: '',
    date_from: '',
    date_to: ''
  })

  // 업체명 관련 상태
  const [vendors, setVendors] = useState<Vendor[]>([])

  // 초기 데이터 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadCodeTables()
      loadVendors()
    }
  }, [isAuthenticated])

  // 탭 변경 시 목록 로드 및 NCR NO 자동 채우기
  useEffect(() => {
    if (activeTab === 'list' && isAuthenticated) {
      loadNonconformances()
    } else if (activeTab === 'create' && isAuthenticated) {
      // 등록 탭으로 전환 시 NCR NO 자동 채우기
      loadNextNcrNo()
    }
  }, [activeTab, isAuthenticated])

  // 코드 테이블 로드
  const loadCodeTables = async () => {
    try {
      setInitialLoading(true)
      
      const [defectTypesRes, defectCausesRes, categoriesRes, guideRes] = await Promise.all([
        nonconformanceAPI.getDefectTypes(),
        nonconformanceAPI.getDefectCauses(),
        nonconformanceAPI.getSixMCategories(),
        nonconformanceAPI.getSixMGuide()
      ])

      setDefectTypes(defectTypesRes.data.data || [])
      setDefectCauses(defectCausesRes.data.data || [])
      setSixMCategories(categoriesRes.data.data || [])
      setSixMGuide(guideRes.data.data || null)
      
      console.log('코드 테이블 로드 완료:', {
        defectTypes: defectTypesRes.data.data?.length || 0,
        defectCauses: defectCausesRes.data.data?.length || 0,
        sixMCategories: categoriesRes.data.data?.length || 0
      })
      
    } catch (err: any) {
      console.error('코드 테이블 로드 오류:', err)
      toast.error('코드 테이블 로드 중 오류가 발생했습니다.')
      // 실패 시에도 빈 배열로 초기화
      setDefectTypes([])
      setDefectCauses([])
      setSixMCategories([])
      setSixMGuide(null)
    } finally {
      setInitialLoading(false)
    }
  }

  // 업체명 목록 로드
  const loadVendors = async () => {
    try {
      const response = await performanceAPI.getVendors()
      setVendors(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Load vendors error:', error)
      setVendors([])
    }
  }

  // 다음 NCR NO 로드
  const loadNextNcrNo = async () => {
    try {
      const response = await nonconformanceAPI.getNextNcrNo()
      if (response.data.ok && response.data.data.next_ncr_no) {
        setCreateForm(prev => ({
          ...prev,
          ncr_no: response.data.data.next_ncr_no
        }))
      }
    } catch (error) {
      console.error('다음 NCR NO 로드 실패:', error)
      // 실패해도 사용자가 직접 입력할 수 있으므로 에러 토스트는 표시하지 않음
    }
  }

  // 입력 값 유효성 검사 함수
  const validateNumericInputs = (field: string, value: string): string | null => {
    if (field === 'defect_qty') {
      const num = parseInt(value)
      if (isNaN(num)) return '부적합 수량은 숫자여야 합니다.'
      if (num < 1) return '부적합 수량은 1 이상이어야 합니다.'
      if (!Number.isInteger(parseFloat(value))) return '부적합 수량은 정수여야 합니다.'
      return null
    }
    
    if (field === 'unit_price') {
      const num = parseInt(value)
      if (isNaN(num)) return '단가는 숫자여야 합니다.'
      if (num < 0) return '단가는 0 이상이어야 합니다.'
      if (!Number.isInteger(parseFloat(value))) return '단가는 정수여야 합니다 (원 단위).'
      return null
    }
    
    if (field === 'weight_factor') {
      const num = parseFloat(value)
      if (isNaN(num)) return '가중치는 숫자여야 합니다.'
      if (num < 0 || num > 1) return '가중치는 0~1 사이의 값이어야 합니다.'
      return null
    }
    
    return null
  }

  // 입력 값 변경 핸들러 (실시간 유효성 검사)
  const handleNumericInputChange = (field: string, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
    
    if (value.trim() === '') {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      return
    }
    
    const error = validateNumericInputs(field, value)
    if (error) {
      setValidationErrors(prev => ({ ...prev, [field]: error }))
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // 부적합 등록
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((user?.role_level ?? 0) < 1) {
      toast.error('부적합 등록 권한이 없습니다.')
      return
    }

    // 유효성 검사 실행
    const errors: Record<string, string> = {}
    const qtyError = validateNumericInputs('defect_qty', createForm.defect_qty.toString())
    const priceError = validateNumericInputs('unit_price', createForm.unit_price.toString())
    const weightError = validateNumericInputs('weight_factor', createForm.weight_factor.toString())
    
    if (qtyError) errors.defect_qty = qtyError
    if (priceError) errors.unit_price = priceError
    if (weightError) errors.weight_factor = weightError
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error('입력 값을 확인해주세요.')
      return
    }

    setLoading(true)
    setFormErrors({})

    try {
      // 작업자 배열 처리
      const formData = {
        ...createForm,
        operators: createForm.operators?.filter(op => op.trim() !== '') || []
      }

      await nonconformanceAPI.createNonconformance(formData)
      toast.success('부적합이 성공적으로 등록되었습니다.')
      
      // 폼 초기화
      setCreateForm({
        type: 'inhouse',
        occurrence_date: new Date().toISOString().split('T')[0],
        ncr_no: '',
        vendor: '',
        product_name: '',
        control_no: '',
        defect_qty: '',
        unit_price: '',
        weight_factor: '',
        detection_stage: '',
        defect_type_code: '',
        cause_code: '',
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        root_cause: '',
        operators: [],
        process_name: '',
        note: ''
      })
      setValidationErrors({})
      
      // 다음 NCR NO 자동 채우기
      loadNextNcrNo()
      
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setFormErrors(errorData)
          toast.error('부적합 등록에 실패했습니다. 입력 값을 확인해주세요.')
        } else {
          toast.error(errorData.error || '부적합 등록에 실패했습니다.')
        }
      } else {
        toast.error('부적합 등록에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }


  // 작업자 추가
  const handleAddOperator = () => {
    const operator = operatorInput.trim()
    if (operator && !(createForm.operators || []).includes(operator)) {
      setCreateForm(prev => ({
        ...prev,
        operators: [...(prev.operators || []), operator]
      }))
      setOperatorInput('')
    }
  }

  // 작업자 제거
  const handleRemoveOperator = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      operators: (prev.operators || []).filter((_, i) => i !== index)
    }))
  }

  // 타입에 따른 detection_stage 프리셋
  const handleTypeChange = (type: 'inhouse' | 'incoming') => {
    setCreateForm(prev => ({
      ...prev,
      type,
      detection_stage: type === 'incoming' ? 'incoming' : prev.detection_stage
    }))
  }

  // 부적합 목록 로드
  const loadNonconformances = async () => {
    try {
      setListLoading(true)
      
      // 빈 값들을 제거한 파라미터 생성
      const cleanParams = Object.entries(searchParams).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key] = value
        }
        return acc
      }, {} as any)
      
      console.log('부적합 목록 로드 파라미터:', cleanParams)
      
      const response = await nonconformanceAPI.getNonconformances(cleanParams)
      console.log('부적합 목록 전체 응답:', response)
      console.log('부적합 목록 응답 데이터:', response.data)
      console.log('응답 데이터 타입:', typeof response.data)
      console.log('응답 데이터 키들:', Object.keys(response.data || {}))
      
      // API 응답 구조에 따라 results 또는 data 사용
      const nonconformanceList = response.data.results || response.data.data || []
      console.log('파싱된 부적합 목록:', nonconformanceList)
      console.log('목록 개수:', nonconformanceList.length)
      
      setNonconformances(nonconformanceList)
    } catch (err: any) {
      console.error('부적합 목록 로드 실패:', err)
      toast.error('부적합 목록 로드 중 오류가 발생했습니다.')
      setNonconformances([])
    } finally {
      setListLoading(false)
    }
  }

  // 검색 실행
  const handleSearch = () => {
    loadNonconformances()
  }

  // 발견공정 한글 매핑
  const getDetectionStageKorean = (stage: string | null | undefined) => {
    const mapping: Record<string, string> = {
      'incoming': '수입검사',
      'shipping': '출하검사',
      'process': '공정검사'
    }
    return stage ? mapping[stage] || stage : '-'
  }

  // 상세보기
  const handleViewDetail = (nonconformance: Nonconformance) => {
    setSelectedNonconformance(nonconformance)
    setShowDetailModal(true)
  }

  // 6M 가이드 열기
  const handleShowSixMGuide = () => {
    setShowSixMGuide(true)
  }

  // 입력 값 변경 핸들러 (수정 모달용 - 실시간 유효성 검사)
  const handleEditNumericInputChange = (field: string, value: string) => {
    setEditForm(prev => prev ? { ...prev, [field]: value } : null)
    
    if (value.trim() === '') {
      setEditValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      return
    }
    
    const error = validateNumericInputs(field, value)
    if (error) {
      setEditValidationErrors(prev => ({ ...prev, [field]: error }))
    } else {
      setEditValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // 부적합 수정 모달 열기
  const handleEdit = (nonconformance: Nonconformance) => {
    setEditForm({
      type: nonconformance.type,
      occurrence_date: nonconformance.occurrence_date,
      ncr_no: nonconformance.ncr_no,
      vendor: nonconformance.vendor,
      product_name: nonconformance.product_name,
      control_no: nonconformance.control_no || '',
      defect_qty: nonconformance.defect_qty.toString(),
      unit_price: nonconformance.unit_price.toString(),
      weight_factor: nonconformance.weight_factor.toString(),
      detection_stage: nonconformance.detection_stage || '',
      defect_type_code: nonconformance.defect_type_code,
      cause_code: nonconformance.cause_code,
      why1: nonconformance.why1 || '',
      why2: nonconformance.why2 || '',
      why3: nonconformance.why3 || '',
      why4: nonconformance.why4 || '',
      why5: nonconformance.why5 || '',
      root_cause: nonconformance.root_cause || '',
      operators: nonconformance.operators || [],
      process_name: nonconformance.process_name || '',
      note: nonconformance.note || ''
    })
    setEditValidationErrors({})
    setSelectedNonconformance(nonconformance)
    setShowEditModal(true)
  }

  // 부적합 수정 저장
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editForm || !selectedNonconformance) return

    // 유효성 검사 실행
    const errors: Record<string, string> = {}
    const qtyError = validateNumericInputs('defect_qty', editForm.defect_qty.toString())
    const priceError = validateNumericInputs('unit_price', editForm.unit_price.toString())
    const weightError = validateNumericInputs('weight_factor', editForm.weight_factor.toString())
    
    if (qtyError) errors.defect_qty = qtyError
    if (priceError) errors.unit_price = priceError
    if (weightError) errors.weight_factor = weightError
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error('입력 값을 확인해주세요.')
      return
    }

    try {
      setLoading(true)
      setFormErrors({})

      // 숫자 변환 및 유효성 검사
      const formData = {
        ...editForm,
        defect_qty: parseInt(editForm.defect_qty.toString()) || 1,
        unit_price: parseInt(editForm.unit_price.toString()) || 0,
        weight_factor: parseFloat(editForm.weight_factor.toString()) || 1,
        operators: editForm.operators?.filter(op => op.trim() !== '') || []
      }

      await nonconformanceAPI.updateNonconformance(selectedNonconformance.id, formData)
      toast.success('부적합이 성공적으로 수정되었습니다.')
      
      // 모달 닫기
      setShowEditModal(false)
      setEditForm(null)
      setSelectedNonconformance(null)
      
      // 목록 새로고침
      loadNonconformances()
      
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setFormErrors(errorData)
          toast.error('부적합 수정에 실패했습니다. 입력 값을 확인해주세요.')
        } else {
          toast.error(errorData.error || '부적합 수정에 실패했습니다.')
        }
      } else {
        toast.error('부적합 수정에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 수정 모달 작업자 추가
  const handleEditAddOperator = () => {
    const operator = editOperatorInput.trim()
    if (operator && editForm && !(editForm.operators || []).includes(operator)) {
      setEditForm(prev => prev ? {
        ...prev,
        operators: [...(prev.operators || []), operator]
      } : null)
      setEditOperatorInput('')
    }
  }

  // 수정 모달 작업자 제거
  const handleEditRemoveOperator = (index: number) => {
    if (editForm) {
      setEditForm(prev => prev ? {
        ...prev,
        operators: (prev.operators || []).filter((_, i) => i !== index)
      } : null)
    }
  }

  // 부적합 삭제 모달 열기
  const handleDeleteClick = (nonconformance: Nonconformance) => {
    setDeleteTarget(nonconformance)
    setShowDeleteModal(true)
  }

  // 부적합 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      setListLoading(true)
      await nonconformanceAPI.deleteNonconformance(deleteTarget.id)
      toast.success('부적합이 성공적으로 삭제되었습니다.')
      
      // 모달 닫기
      setShowDeleteModal(false)
      setDeleteTarget(null)
      
      // 목록 새로고침
      loadNonconformances()
      
    } catch (err: any) {
      console.error('부적합 삭제 실패:', err)
      if (err.response?.status === 403) {
        toast.error('부적합 삭제 권한이 없습니다.')
      } else {
        toast.error('부적합 삭제 중 오류가 발생했습니다.')
      }
    } finally {
      setListLoading(false)
    }
  }

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
          <p className="text-[var(--text-secondary)]">부적합 관리 시스템을 준비 중입니다...</p>
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
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">부적합 관리 (NCR)</h1>
              <p className="text-[var(--text-secondary)] mt-1">사내 부적합 및 수입 부적합을 등록하고 관리하세요</p>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

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
                <div className="flex justify-between items-center">
                  <CardTitle>부적합 등록</CardTitle>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleShowSixMGuide}
                    type="button"
                  >
                    ❓ 6M 가이드
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      부적합 유형 <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={createForm.type}
                      onChange={(e) => handleTypeChange(e.target.value as 'inhouse' | 'incoming')}
                      error={formErrors.type}
                      required
                    >
                      <option value="inhouse">사내</option>
                      <option value="incoming">수입</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      발생일 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={createForm.occurrence_date}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, occurrence_date: e.target.value }))}
                      error={formErrors.occurrence_date}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      NCR NO <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={createForm.ncr_no}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, ncr_no: e.target.value }))}
                      placeholder="NCR-2025-001"
                      error={formErrors.ncr_no}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">업체명 <span className="text-red-500">*</span></label>
                      {user && user.role_level >= 1 && (
                        <button
                          type="button"
                          onClick={() => setVendorModalOpen(true)}
                          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                        >
                          📝 관리
                        </button>
                      )}
                    </div>
                    <SearchableSelect
                      value={createForm.vendor}
                      onChange={(value) => setCreateForm(prev => ({ ...prev, vendor: value }))}
                      options={vendors.map(v => ({ value: v.name, label: v.name }))}
                      placeholder="업체명 검색 또는 입력"
                      error={formErrors.vendor}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      품명 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={createForm.product_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, product_name: e.target.value }))}
                      placeholder="품명 입력"
                      error={formErrors.product_name}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">관리번호</label>
                    <Input
                      value={createForm.control_no}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, control_no: e.target.value }))}
                      placeholder="관리번호 입력"
                      error={formErrors.control_no}
                    />
                  </div>
                </div>

                {/* 수량/금액 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      부적합 수량 (개) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={createForm.defect_qty}
                      onChange={(e) => handleNumericInputChange('defect_qty', e.target.value)}
                      error={formErrors.defect_qty}
                      required
                    />
                    {validationErrors.defect_qty && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.defect_qty}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      단가 (원) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={createForm.unit_price}
                      onChange={(e) => handleNumericInputChange('unit_price', e.target.value)}
                      error={formErrors.unit_price}
                      required
                    />
                    {validationErrors.unit_price && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.unit_price}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      가중치 (0~1) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={createForm.weight_factor}
                      onChange={(e) => handleNumericInputChange('weight_factor', e.target.value)}
                      error={formErrors.weight_factor}
                      required
                    />
                    {validationErrors.weight_factor && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.weight_factor}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">합계 (자동계산)</label>
                    <Input
                      value={Math.round((parseInt(createForm.defect_qty.toString()) || 0) * (parseInt(createForm.unit_price.toString()) || 0) * (parseFloat(createForm.weight_factor.toString()) || 1)).toLocaleString()}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {/* 불량 유형 및 원인 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      불량 유형 <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={createForm.defect_type_code}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, defect_type_code: e.target.value }))}
                      error={formErrors.defect_type_code}
                      required
                    >
                      <option value="">불량 유형 선택</option>
                      {defectTypes && defectTypes.map(type => (
                        <option key={type.code} value={type.code}>
                          {type.code} - {type.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      발생 원인 <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={createForm.cause_code}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, cause_code: e.target.value }))}
                      error={formErrors.cause_code}
                      required
                    >
                      <option value="">발생 원인 선택</option>
                      {defectCauses && defectCauses.map(cause => (
                        <option key={cause.code} value={cause.code}>
                          {cause.code} - {cause.name} ({cause.category_display})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* 추가 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">발견공정</label>
                    <Select
                      value={createForm.detection_stage}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, detection_stage: e.target.value }))}
                      error={formErrors.detection_stage}
                    >
                      <option value="">발견공정 선택</option>
                      <option value="incoming">수입검사</option>
                      <option value="shipping">출하검사</option>
                      <option value="process">공정검사</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">공정/부서</label>
                    <Select
                      value={createForm.process_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, process_name: e.target.value }))}
                    >
                      <option value="">공정/부서 선택</option>
                      <option value="MCT">MCT</option>
                      <option value="CNC">CNC</option>
                      <option value="출하">출하</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">작업자</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={operatorInput}
                        onChange={(e) => setOperatorInput(e.target.value)}
                        placeholder="작업자명 입력 후 추가 버튼 클릭"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddOperator()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddOperator}
                        disabled={!operatorInput.trim()}
                      >
                        추가
                      </Button>
                    </div>
                    {createForm.operators && createForm.operators.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {createForm.operators.map((operator, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                          >
                            <span>{operator}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOperator(index)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5Why 분석 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">5Why 분석</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Why 1</label>
                      <Input
                        value={createForm.why1}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, why1: e.target.value }))}
                        placeholder="첫 번째 왜? - 문제가 발생한 이유"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Why 2</label>
                      <Input
                        value={createForm.why2}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, why2: e.target.value }))}
                        placeholder="두 번째 왜? - Why1에 대한 이유"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Why 3</label>
                      <Input
                        value={createForm.why3}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, why3: e.target.value }))}
                        placeholder="세 번째 왜? - Why2에 대한 이유"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Why 4</label>
                      <Input
                        value={createForm.why4}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, why4: e.target.value }))}
                        placeholder="네 번째 왜? - Why3에 대한 이유"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Why 5</label>
                      <Input
                        value={createForm.why5}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, why5: e.target.value }))}
                        placeholder="다섯 번째 왜? - Why4에 대한 이유"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">근본원인</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                        rows={2}
                        value={createForm.root_cause}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, root_cause: e.target.value }))}
                        placeholder="5Why 분석을 통해 도출된 근본원인"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">비고</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    rows={3}
                    value={createForm.note}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="추가 설명이나 특이사항 입력"
                  />
                </div>

                {/* 제출 버튼 */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading || (user?.role_level ?? 0) < 1}
                    className="px-8"
                  >
                    {loading ? '등록 중...' : '부적합 등록'}
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
                <CardTitle>부적합 목록</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowManageModal(true)}
                  >
                    ⚙️ 유형/원인 관리
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSearch}
                    disabled={listLoading}
                  >
                    {listLoading ? '로딩...' : '🔄 새로고침'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 검색 필터 */}
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* 첫 번째 행: 필터 선택 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">부적합 유형</label>
                      <Select
                        value={searchParams.type}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="">전체</option>
                        <option value="inhouse">사내</option>
                        <option value="incoming">수입</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">불량 유형</label>
                      <Select
                        value={searchParams.defect_type_code}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, defect_type_code: e.target.value }))}
                      >
                        <option value="">전체</option>
                        {defectTypes && defectTypes.map(type => (
                          <option key={type.code} value={type.code}>
                            {type.code} - {type.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">6M 카테고리</label>
                      <Select
                        value={searchParams.cause_category}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, cause_category: e.target.value }))}
                      >
                        <option value="">전체</option>
                        {sixMCategories && sixMCategories.map(category => (
                          <option key={category.code} value={category.code}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* 두 번째 행: 기간 선택 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">시작일</label>
                      <Input
                        type="date"
                        value={searchParams.date_from}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, date_from: e.target.value }))}
                        className="text-sm w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">종료일</label>
                      <Input
                        type="date"
                        value={searchParams.date_to}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, date_to: e.target.value }))}
                        className="text-sm w-full"
                      />
                    </div>
                  </div>

                  {/* 세 번째 행: 통합 검색 */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="🔍 NCR NO, 업체명, 품명으로 검색..."
                        value={searchParams.search}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, search: e.target.value }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch()
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={listLoading} className="px-6">
                      검색
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchParams({
                          search: '',
                          type: '',
                          defect_type_code: '',
                          cause_category: '',
                          date_from: '',
                          date_to: ''
                        })
                      }}
                      className="px-4"
                    >
                      초기화
                    </Button>
                  </div>
                </div>
              </div>

              {/* 목록 테이블 */}
              {listLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-[var(--text-secondary)]">부적합 목록을 불러오는 중...</p>
                </div>
              ) : (
                <>
                  {(nonconformances && nonconformances.length > 0) ? (
                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="w-full min-w-max">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '130px'}}>NCR NO</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '70px'}}>유형</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>발생일</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>업체명</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>품명</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '150px'}}>불량유형</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '150px'}}>발생원인</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '70px'}}>수량</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '110px'}}>합계금액</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>등록자</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '130px'}}>작업</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {nonconformances.map(item => (
                            <tr 
                              key={item.id}
                              onClick={() => handleViewDetail(item)}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.ncr_no}</td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <Badge variant={item.type === 'inhouse' ? 'primary' : 'secondary'}>
                                  {item.type === 'inhouse' ? '사내' : '수입'}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                                {new Date(item.occurrence_date).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '120px'}} title={item.vendor}>
                                {item.vendor}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '120px'}} title={item.product_name}>
                                {item.product_name}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '150px'}} title={`${item.defect_type_code} - ${item.defect_type_name || ''}`}>
                                {item.defect_type_code} - {item.defect_type_name || ''}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '150px'}} title={`${item.cause_code} - ${item.cause_name || ''}`}>
                                {item.cause_code} - {item.cause_name || ''}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center">{item.defect_qty}개</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                ₩{Math.round(item.total_amount || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">{item.created_by_name || '알 수 없음'}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1 justify-center">
                                  {((user?.role_level ?? 0) >= 2 || user?.id === item.created_by) && (
                                    <>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEdit(item)
                                        }}
                                      >
                                        수정
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteClick(item)
                                        }}
                                        disabled={listLoading}
                                      >
                                        삭제
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                      부적합 데이터가 없습니다.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

          {/* 6M 가이드 모달 */}
        <Modal
          isOpen={showSixMGuide}
          onClose={() => setShowSixMGuide(false)}
          title="6M 분석 가이드"
          size="xl"
        >
          {sixMGuide ? (
            <div className="space-y-6">
              <div className="text-sm text-[var(--text-secondary)] mb-4">
                6M(Man, Machine, Material, Method, Measurement, Environment) 분석을 통해 문제의 근본원인을 체계적으로 분석하세요.
              </div>
              
              {sixMGuide.categories && Object.entries(sixMGuide.categories).map(([categoryCode, categoryData]) => (
                <div key={categoryCode} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`badge-${categoryCode.toLowerCase()}`}>
                      {categoryData.name}
                    </Badge>
                    <span className="text-sm text-[var(--text-muted)]">
                      {categoryData.description}
                    </span>
                  </div>
                  
                  <div className="grid gap-2">
                    {categoryData.causes && categoryData.causes.map((cause: any) => (
                      <div key={cause.code} className="flex items-start gap-2 text-sm">
                        <span className="font-mono text-[var(--accent-primary)] min-w-[60px]">
                          {cause.code}
                        </span>
                        <div>
                          <div className="font-medium">{cause.name}</div>
                          {cause.description && (
                            <div className="text-[var(--text-muted)] text-xs">
                              {cause.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">5Why 분석 방법</h4>
                <p className="text-blue-800 text-sm">
                  문제가 발생했을 때 "왜?"라는 질문을 5번 반복하여 근본원인을 찾아가는 방법입니다.
                  각 단계에서 나온 답변에 대해 다시 "왜?"를 물어보면서 점차 깊은 원인에 접근합니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              6M 가이드 데이터를 불러올 수 없습니다.
            </div>
          )}
        </Modal>

        {/* 부적합 상세보기 모달 */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedNonconformance(null)
          }}
          title="부적합 상세정보"
          size="xl"
        >
          {selectedNonconformance && (
            <div className="space-y-5">
              {/* 기본 정보 섹션 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center">
                  <span className="w-1 h-4 bg-blue-600 mr-2 rounded"></span>
                  기본 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">NCR NO</label>
                    <p className="font-mono text-base font-semibold text-gray-900 mt-1">{selectedNonconformance.ncr_no}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">부적합 유형</label>
                    <div className="mt-1">
                      <Badge variant={selectedNonconformance.type === 'inhouse' ? 'primary' : 'secondary'} size="md">
                        {selectedNonconformance.type === 'inhouse' ? '사내' : '수입'}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">발생일</label>
                    <p className="text-base text-gray-900 mt-1">{new Date(selectedNonconformance.occurrence_date).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">업체명</label>
                    <p className="text-base text-gray-900 mt-1">{selectedNonconformance.vendor}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">품명</label>
                    <p className="text-base text-gray-900 mt-1">{selectedNonconformance.product_name}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">관리번호</label>
                    <p className="text-base text-gray-900 mt-1">{selectedNonconformance.control_no || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 수량/금액 정보 섹션 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
                <h3 className="text-sm font-semibold text-green-900 mb-4 flex items-center">
                  <span className="w-1 h-4 bg-green-600 mr-2 rounded"></span>
                  수량/금액 정보
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <label className="text-xs font-medium text-gray-500 uppercase block">부적합 수량</label>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{selectedNonconformance.defect_qty}</p>
                    <p className="text-xs text-gray-500 mt-1">개</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <label className="text-xs font-medium text-gray-500 uppercase block">단가</label>
                    <p className="text-2xl font-bold text-gray-900 mt-2">₩{Math.round(selectedNonconformance.unit_price).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">원</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <label className="text-xs font-medium text-gray-500 uppercase block">가중치</label>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{selectedNonconformance.weight_factor}</p>
                    <p className="text-xs text-gray-500 mt-1">배수</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-lg shadow-sm text-center border border-red-200">
                    <label className="text-xs font-medium text-red-700 uppercase block">합계</label>
                    <p className="text-2xl font-bold text-red-600 mt-2">
                      ₩{Math.round(selectedNonconformance.total_amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-red-600 mt-1">원</p>
                  </div>
                </div>
              </div>

              {/* 불량 정보 섹션 */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-5 border border-orange-100">
                <h3 className="text-sm font-semibold text-orange-900 mb-4 flex items-center">
                  <span className="w-1 h-4 bg-orange-600 mr-2 rounded"></span>
                  불량 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">불량 유형</label>
                    <p className="text-base text-gray-900 mt-1">{selectedNonconformance.defect_type_code} - {selectedNonconformance.defect_type_name}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">발생 원인</label>
                    <p className="text-base text-gray-900 mt-1">{selectedNonconformance.cause_code} - {selectedNonconformance.cause_name}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">발견공정</label>
                    <p className="text-base text-gray-900 mt-1">{getDetectionStageKorean(selectedNonconformance.detection_stage)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">공정/부서</label>
                    <p className="text-base text-gray-900 mt-1">{selectedNonconformance.process_name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 작업자 정보 */}
              {selectedNonconformance.operators && selectedNonconformance.operators.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="text-xs font-medium text-gray-700 uppercase block mb-2">작업자</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedNonconformance.operators && selectedNonconformance.operators.map((operator, index) => (
                      <Badge key={index} variant="secondary" size="md">
                        👤 {operator}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 5Why 분석 섹션 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-100">
                <h3 className="text-sm font-semibold text-purple-900 mb-4 flex items-center">
                  <span className="w-1 h-4 bg-purple-600 mr-2 rounded"></span>
                  5Why 분석
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Why 1', value: selectedNonconformance.why1 },
                    { label: 'Why 2', value: selectedNonconformance.why2 },
                    { label: 'Why 3', value: selectedNonconformance.why3 },
                    { label: 'Why 4', value: selectedNonconformance.why4 },
                    { label: 'Why 5', value: selectedNonconformance.why5 }
                  ].map((why, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="flex gap-3">
                        <span className="text-xs font-semibold text-purple-600 min-w-[60px] flex items-center">
                          {why.label}
                        </span>
                        <span className="text-sm text-gray-700 flex-1">{why.value || '-'}</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-3 bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-600">
                    <label className="text-sm font-bold text-purple-900 flex items-center">
                      💡 근본원인
                    </label>
                    <p className="text-gray-800 mt-2 leading-relaxed">{selectedNonconformance.root_cause || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 비고 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="text-xs font-medium text-gray-700 uppercase block mb-2">비고</label>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedNonconformance.note || '-'}</p>
              </div>

              {/* 등록 정보 */}
              <div className="bg-gray-100 rounded-lg p-4 border-t-2 border-gray-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase">등록자</label>
                    <p className="text-sm text-gray-900 mt-1 font-medium">{selectedNonconformance.created_by_name || '알 수 없음'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase">등록일시</label>
                    <p className="text-sm text-gray-900 mt-1">{new Date(selectedNonconformance.created_at).toLocaleString('ko-KR')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* 부적합 수정 모달 */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditForm(null)
            setSelectedNonconformance(null)
            setEditOperatorInput('')
            setEditValidationErrors({})
          }}
          title="부적합 수정"
          size="xl"
        >
          {editForm && (
            <form onSubmit={handleEditSave} className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    부적합 유형 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={editForm.type}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, type: e.target.value as 'inhouse' | 'incoming' } : null)}
                    required
                  >
                    <option value="inhouse">사내</option>
                    <option value="incoming">수입</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    발생일 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={editForm.occurrence_date}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, occurrence_date: e.target.value } : null)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    NCR NO <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editForm.ncr_no}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, ncr_no: e.target.value } : null)}
                    placeholder="NCR-2025-001"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">업체명 <span className="text-red-500">*</span></label>
                    {user && user.role_level >= 1 && (
                      <button
                        type="button"
                        onClick={() => setVendorModalOpen(true)}
                        className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        📝 관리
                      </button>
                    )}
                  </div>
                  <SearchableSelect
                    value={editForm.vendor}
                    onChange={(value) => setEditForm(prev => prev ? { ...prev, vendor: value } : null)}
                    options={vendors.map(v => ({ value: v.name, label: v.name }))}
                    placeholder="업체명 검색 또는 입력"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    품명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editForm.product_name}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, product_name: e.target.value } : null)}
                    placeholder="품명 입력"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">관리번호</label>
                  <Input
                    value={editForm.control_no}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, control_no: e.target.value } : null)}
                    placeholder="관리번호 입력"
                  />
                </div>
              </div>

              {/* 수량/금액 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    부적합 수량 (개) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.defect_qty}
                    onChange={(e) => handleEditNumericInputChange('defect_qty', e.target.value)}
                    error={formErrors.defect_qty}
                    required
                  />
                  {(editValidationErrors.defect_qty || formErrors.defect_qty) && (
                    <p className="mt-1 text-sm text-red-600">{editValidationErrors.defect_qty || formErrors.defect_qty}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    단가 (원) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.unit_price}
                    onChange={(e) => handleEditNumericInputChange('unit_price', e.target.value)}
                    error={formErrors.unit_price}
                    required
                  />
                  {(editValidationErrors.unit_price || formErrors.unit_price) && (
                    <p className="mt-1 text-sm text-red-600">{editValidationErrors.unit_price || formErrors.unit_price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    가중치 (0~1) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={editForm.weight_factor}
                    onChange={(e) => handleEditNumericInputChange('weight_factor', e.target.value)}
                    error={formErrors.weight_factor}
                    required
                  />
                  {(editValidationErrors.weight_factor || formErrors.weight_factor) && (
                    <p className="mt-1 text-sm text-red-600">{editValidationErrors.weight_factor || formErrors.weight_factor}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">합계 (자동계산)</label>
                  <Input
                    value={Math.round((parseInt(editForm.defect_qty.toString()) || 0) * (parseInt(editForm.unit_price.toString()) || 0) * (parseFloat(editForm.weight_factor.toString()) || 1)).toLocaleString()}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* 불량 유형 및 원인 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    불량 유형 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={editForm.defect_type_code}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, defect_type_code: e.target.value } : null)}
                    required
                  >
                    <option value="">불량 유형 선택</option>
                    {defectTypes && defectTypes.map(type => (
                      <option key={type.code} value={type.code}>
                        {type.code} - {type.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    발생 원인 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={editForm.cause_code}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, cause_code: e.target.value } : null)}
                    required
                  >
                    <option value="">발생 원인 선택</option>
                    {defectCauses && defectCauses.map(cause => (
                      <option key={cause.code} value={cause.code}>
                        {cause.code} - {cause.name} ({cause.category_display})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* 추가 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">발견공정</label>
                  <Select
                    value={editForm.detection_stage}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, detection_stage: e.target.value } : null)}
                  >
                    <option value="">발견공정 선택</option>
                    <option value="incoming">수입검사</option>
                    <option value="shipping">출하검사</option>
                    <option value="process">공정검사</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">공정/부서</label>
                  <Select
                    value={editForm.process_name}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, process_name: e.target.value } : null)}
                  >
                    <option value="">공정/부서 선택</option>
                    <option value="MCT">MCT</option>
                    <option value="CNC">CNC</option>
                    <option value="출하">출하</option>
                  </Select>
                </div>
              </div>

              {/* 작업자 */}
              <div>
                <label className="block text-sm font-medium mb-2">작업자</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={editOperatorInput}
                      onChange={(e) => setEditOperatorInput(e.target.value)}
                      placeholder="작업자명 입력 후 추가 버튼 클릭"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleEditAddOperator()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleEditAddOperator}
                      disabled={!editOperatorInput.trim()}
                    >
                      추가
                    </Button>
                  </div>
                  {editForm.operators && editForm.operators.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editForm.operators.map((operator, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                        >
                          <span>{operator}</span>
                          <button
                            type="button"
                            onClick={() => handleEditRemoveOperator(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5Why 분석 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">5Why 분석</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Why 1</label>
                    <Input
                      value={editForm.why1}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, why1: e.target.value } : null)}
                      placeholder="첫 번째 왜? - 문제가 발생한 이유"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Why 2</label>
                    <Input
                      value={editForm.why2}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, why2: e.target.value } : null)}
                      placeholder="두 번째 왜? - Why1에 대한 이유"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Why 3</label>
                    <Input
                      value={editForm.why3}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, why3: e.target.value } : null)}
                      placeholder="세 번째 왜? - Why2에 대한 이유"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Why 4</label>
                    <Input
                      value={editForm.why4}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, why4: e.target.value } : null)}
                      placeholder="네 번째 왜? - Why3에 대한 이유"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Why 5</label>
                    <Input
                      value={editForm.why5}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, why5: e.target.value } : null)}
                      placeholder="다섯 번째 왜? - Why4에 대한 이유"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">근본원인</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                      rows={2}
                      value={editForm.root_cause}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, root_cause: e.target.value } : null)}
                      placeholder="5Why 분석을 통해 도출된 근본원인"
                    />
                  </div>
                </div>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-sm font-medium mb-2">비고</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  rows={3}
                  value={editForm.note}
                  onChange={(e) => setEditForm(prev => prev ? { ...prev, note: e.target.value } : null)}
                  placeholder="추가 설명이나 특이사항 입력"
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditForm(null)
                    setSelectedNonconformance(null)
                    setEditOperatorInput('')
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

        {/* 부적합 유형/원인 관리 모달 */}
        <NonconformanceManagementModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          onDataChanged={loadCodeTables}
        />

        {/* 부적합 삭제 확인 모달 */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteTarget(null)
          }}
          title="부적합 삭제"
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
                  정말로 이 부적합을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  삭제된 데이터는 복구할 수 없습니다.
                </p>
              </div>

              {/* 부적합 정보 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">NCR NO</span>
                    <span className="text-sm font-semibold text-gray-900">{deleteTarget.ncr_no}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">유형</span>
                    <Badge variant={deleteTarget.type === 'inhouse' ? 'primary' : 'secondary'}>
                      {deleteTarget.type === 'inhouse' ? '사내' : '수입'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">업체명</span>
                    <span className="text-sm text-gray-900">{deleteTarget.vendor}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">품명</span>
                    <span className="text-sm text-gray-900">{deleteTarget.product_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">합계금액</span>
                    <span className="text-sm font-semibold text-red-600">
                      ₩{Math.round(deleteTarget.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteTarget(null)
                  }}
                  disabled={listLoading}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  disabled={listLoading}
                  className="flex-1"
                >
                  {listLoading ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        </div>
      </main>

      {/* Toast 알림 */}
      <Toaster position="top-right" richColors />

      {/* 업체명 관리 모달 */}
      <VendorProducerManagementModal
        isOpen={vendorModalOpen}
        onClose={() => {
          setVendorModalOpen(false)
          loadVendors() // 모달 닫을 때 목록 재로드
        }}
        type="vendor"
      />
    </div>
  )
}