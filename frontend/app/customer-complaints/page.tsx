'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  customerComplaintAPI,
  nonconformanceAPI,
  performanceAPI,
  type CustomerComplaint, 
  type CustomerComplaintCreateRequest,
  type DefectType,
  type DefectCause,
  type SixMCategory,
  type Vendor
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Sidebar from '@/components/ui/Sidebar'
import SearchableSelect from '@/components/ui/SearchableSelect'
import VendorProducerManagementModal from '@/components/ui/VendorProducerManagementModal'
import { toast, Toaster } from 'sonner'

type TabType = 'create' | 'list'

export default function CustomerComplaintPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('create')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // 코드 테이블 데이터
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([])
  const [defectCauses, setDefectCauses] = useState<DefectCause[]>([])
  const [sixMCategories, setSixMCategories] = useState<SixMCategory[]>([])

  // 등록 폼 상태
  const [createForm, setCreateForm] = useState<CustomerComplaintCreateRequest>({
    occurrence_date: new Date().toISOString().split('T')[0],
    ccr_no: '',
    vendor: '',
    product_name: '',
    defect_qty: '',
    unit_price: '',
    defect_type_code: '',
    cause_code: '',
    complaint_content: '',
    action_content: '',
    action_completed: false
  })

  // 폼 에러 상태
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 모달 상태
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<CustomerComplaint | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerComplaint | null>(null)
  const [editForm, setEditForm] = useState<CustomerComplaintCreateRequest | null>(null)
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({})
  const [vendorModalOpen, setVendorModalOpen] = useState(false)

  // 목록 상태
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    search: '',
    defect_type_code: '',
    cause_category: '',
    has_action: '',
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

  // 탭 변경 시 목록 로드 또는 CCR NO 자동 채우기
  useEffect(() => {
    if (activeTab === 'list' && isAuthenticated) {
      loadComplaints()
    } else if (activeTab === 'create' && isAuthenticated) {
      // 등록 탭으로 전환 시 CCR NO 자동 채우기
      loadNextCcrNo()
    }
  }, [activeTab, isAuthenticated])

  // 다음 CCR NO 로드
  const loadNextCcrNo = async () => {
    try {
      const response = await customerComplaintAPI.getNextCcrNo()
      if (response.data.ok && response.data.data.next_ccr_no) {
        setCreateForm(prev => ({
          ...prev,
          ccr_no: response.data.data.next_ccr_no
        }))
      }
    } catch (error) {
      console.error('다음 CCR NO 로드 실패:', error)
      // 실패해도 사용자가 직접 입력할 수 있으므로 에러 토스트는 표시하지 않음
    }
  }

  // 코드 테이블 로드
  const loadCodeTables = async () => {
    try {
      setInitialLoading(true)
      
      const [defectTypesRes, defectCausesRes, categoriesRes] = await Promise.all([
        nonconformanceAPI.getDefectTypes(),
        nonconformanceAPI.getDefectCauses(),
        nonconformanceAPI.getSixMCategories()
      ])

      setDefectTypes(defectTypesRes.data.data || [])
      setDefectCauses(defectCausesRes.data.data || [])
      setSixMCategories(categoriesRes.data.data || [])
      
    } catch (err: any) {
      console.error('코드 테이블 로드 오류:', err)
      toast.error('코드 테이블 로드 중 오류가 발생했습니다.')
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

  // 6M 카테고리 배지 색상 매핑 함수 (부적합 페이지와 동일하게)
  const getSixMBadgeClass = (category: string) => {
    const mapping: Record<string, string> = {
      'Material': 'badge-material',       // Material - 빨강
      'Machine': 'badge-machine',         // Machine - 주황
      'Man': 'badge-man',                 // Man - 초록
      'Method': 'badge-method',           // Method - 파랑
      'Measurement': 'badge-measurement', // Measurement - 보라
      'Environment': 'badge-environment', // Environment - 청록
      'Other': 'badge-other',             // Other - 회색
      // 코드 형식도 지원 (M1, M2 등)
      'M1': 'badge-material',
      'M2': 'badge-machine',
      'M3': 'badge-man',
      'M4': 'badge-method',
      'M5': 'badge-measurement',
      'M6': 'badge-environment',
    }
    return mapping[category] || 'badge-other'
  }

  // 입력 값 유효성 검사 함수
  const validateNumericInputs = (field: string, value: string): string | null => {
    if (field === 'defect_qty') {
      const num = parseInt(value)
      if (isNaN(num)) return '수량은 숫자여야 합니다.'
      if (num < 1) return '수량은 1 이상이어야 합니다.'
      if (!Number.isInteger(parseFloat(value))) return '수량은 정수여야 합니다.'
      return null
    }
    
    if (field === 'unit_price') {
      const num = parseInt(value)
      if (isNaN(num)) return '단가는 숫자여야 합니다.'
      if (num < 0) return '단가는 0 이상이어야 합니다.'
      if (!Number.isInteger(parseFloat(value))) return '단가는 정수여야 합니다 (원 단위).'
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

  // 고객 불만 등록
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((user?.role_level ?? 0) < 1) {
      toast.error('고객 불만 등록 권한이 없습니다.')
      return
    }

    // 유효성 검사 실행
    const errors: Record<string, string> = {}
    const qtyError = validateNumericInputs('defect_qty', createForm.defect_qty.toString())
    const priceError = validateNumericInputs('unit_price', createForm.unit_price.toString())
    
    if (qtyError) errors.defect_qty = qtyError
    if (priceError) errors.unit_price = priceError
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error('입력 값을 확인해주세요.')
      return
    }

    setLoading(true)
    setFormErrors({})

    try {
      await customerComplaintAPI.createComplaint(createForm)
      toast.success('고객 불만이 성공적으로 등록되었습니다.')
      
      // 폼 초기화
      setCreateForm({
        occurrence_date: new Date().toISOString().split('T')[0],
        ccr_no: '',
        vendor: '',
        product_name: '',
        defect_qty: '',
        unit_price: '',
        defect_type_code: '',
        cause_code: '',
        complaint_content: '',
        action_content: '',
        action_completed: false
      })
      setValidationErrors({})
      
      // 다음 CCR NO 자동 채우기
      loadNextCcrNo()
      
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setFormErrors(errorData)
          toast.error('고객 불만 등록에 실패했습니다. 입력 값을 확인해주세요.')
        } else {
          toast.error(errorData.error || '고객 불만 등록에 실패했습니다.')
        }
      } else {
        toast.error('고객 불만 등록에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 고객 불만 목록 로드
  const loadComplaints = async () => {
    try {
      setListLoading(true)
      
      const cleanParams = Object.entries(searchParams).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key] = value
        }
        return acc
      }, {} as any)
      
      const response = await customerComplaintAPI.getComplaints(cleanParams)
      setComplaints(response.data.results || [])
      
    } catch (err: any) {
      console.error('고객 불만 목록 로드 실패:', err)
      toast.error('고객 불만 목록 로드 중 오류가 발생했습니다.')
      setComplaints([])
    } finally {
      setListLoading(false)
    }
  }

  // 검색 실행
  const handleSearch = () => {
    loadComplaints()
  }

  // 상세보기
  const handleViewDetail = async (complaint: CustomerComplaint) => {
    try {
      const response = await customerComplaintAPI.getComplaint(complaint.id)
      setSelectedComplaint(response.data)
      setShowDetailModal(true)
    } catch (err: any) {
      console.error('상세 조회 오류:', err)
      toast.error('상세 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }

  // 수정 모달 열기
  const handleEdit = async (complaint: CustomerComplaint) => {
    try {
      const response = await customerComplaintAPI.getComplaint(complaint.id)
      const data = response.data
      setEditForm({
        occurrence_date: data.occurrence_date,
        ccr_no: data.ccr_no,
        vendor: data.vendor,
        product_name: data.product_name,
        defect_qty: data.defect_qty.toString(),
        unit_price: data.unit_price.toString(),
        defect_type_code: data.defect_type_code,
        cause_code: data.cause_code,
        complaint_content: data.complaint_content || '',
        action_content: data.action_content || '',
        action_completed: data.action_completed || false
      })
      setEditValidationErrors({})
      setSelectedComplaint(data)
      setShowEditModal(true)
    } catch (err: any) {
      console.error('상세 조회 오류:', err)
      toast.error('상세 정보를 불러오는 중 오류가 발생했습니다.')
    }
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

  // 수정 저장
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editForm || !selectedComplaint) return

    // 유효성 검사 실행
    const errors: Record<string, string> = {}
    const qtyError = validateNumericInputs('defect_qty', editForm.defect_qty.toString())
    const priceError = validateNumericInputs('unit_price', editForm.unit_price.toString())
    
    if (qtyError) errors.defect_qty = qtyError
    if (priceError) errors.unit_price = priceError
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error('입력 값을 확인해주세요.')
      return
    }

    try {
      setLoading(true)
      setFormErrors({})

      await customerComplaintAPI.updateComplaint(selectedComplaint.id, editForm)
      toast.success('고객 불만이 성공적으로 수정되었습니다.')
      
      setShowEditModal(false)
      setEditForm(null)
      setSelectedComplaint(null)
      
      loadComplaints()
      
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setFormErrors(errorData)
          toast.error('고객 불만 수정에 실패했습니다. 입력 값을 확인해주세요.')
        } else {
          toast.error(errorData.error || '고객 불만 수정에 실패했습니다.')
        }
      } else {
        toast.error('고객 불만 수정에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 삭제 모달 열기
  const handleDeleteClick = (complaint: CustomerComplaint) => {
    setDeleteTarget(complaint)
    setShowDeleteModal(true)
  }

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      setListLoading(true)
      await customerComplaintAPI.deleteComplaint(deleteTarget.id)
      toast.success('고객 불만이 삭제되었습니다.')
      
      // 모달 닫기
      setShowDeleteModal(false)
      setDeleteTarget(null)
      
      // 목록 새로고침
      loadComplaints()
      
    } catch (err: any) {
      console.error('고객 불만 삭제 실패:', err)
      if (err.response?.status === 403) {
        toast.error('고객 불만 삭제 권한이 없습니다.')
      } else {
        toast.error('고객 불만 삭제 중 오류가 발생했습니다.')
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
          <p className="text-[var(--text-secondary)]">고객 불만 관리 시스템을 준비 중입니다...</p>
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
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">고객 불만 관리 (CCR)</h1>
              <p className="text-[var(--text-secondary)] mt-1">고객 불만 접수 및 조치 이력을 관리하세요</p>
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
                <CardTitle>고객 불만 등록</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-6">
                  {/* 기본 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        CCR NO <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={createForm.ccr_no}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, ccr_no: e.target.value }))}
                        placeholder="CCR-2025-001"
                        error={formErrors.ccr_no}
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
                  </div>

                  {/* 수량/금액 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        수량 (개) <span className="text-red-500">*</span>
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
                      <label className="block text-sm font-medium mb-2">합계 (자동계산)</label>
                      <Input
                        value={Math.round((parseInt(createForm.defect_qty.toString()) || 0) * (parseInt(createForm.unit_price.toString()) || 0)).toLocaleString()}
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

                  {/* 불만 내용 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      불만 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                      rows={3}
                      value={createForm.complaint_content}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, complaint_content: e.target.value }))}
                      placeholder="고객 불만 내용을 상세히 입력해주세요"
                      required
                    />
                  </div>

                  {/* 조치 내용 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">조치 내용</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                      rows={3}
                      value={createForm.action_content}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, action_content: e.target.value }))}
                      placeholder="조치 내용 입력 (선택사항)"
                    />
                  </div>

                  {/* 조치 완료 여부 토글 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">조치 완료 여부</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCreateForm(prev => ({ ...prev, action_completed: !prev.action_completed }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 ${
                          createForm.action_completed ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            createForm.action_completed ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${createForm.action_completed ? 'text-green-700' : 'text-gray-600'}`}>
                        {createForm.action_completed ? '조치완료' : '조치대기'}
                      </span>
                    </div>
                  </div>

                  {/* 제출 버튼 */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading || (user?.role_level ?? 0) < 1}
                      className="px-8"
                    >
                      {loading ? '등록 중...' : '고객 불만 등록'}
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
                  <CardTitle>고객 불만 목록</CardTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSearch}
                    disabled={listLoading}
                  >
                    {listLoading ? '로딩...' : '🔄 새로고침'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 검색 필터 */}
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* 첫 번째 행: 필터 선택 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">불량유형</label>
                        <Select
                          value={searchParams.defect_type_code}
                          onChange={(e) => setSearchParams(prev => ({ ...prev, defect_type_code: e.target.value }))}
                        >
                          <option value="">전체</option>
                          {defectTypes.map((type) => (
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
                          {sixMCategories.map((category) => (
                            <option key={category.code} value={category.code}>
                              {category.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">조치여부</label>
                        <Select
                          value={searchParams.has_action}
                          onChange={(e) => setSearchParams(prev => ({ ...prev, has_action: e.target.value }))}
                        >
                          <option value="">전체</option>
                          <option value="true">조치완료</option>
                          <option value="false">조치대기</option>
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
                          placeholder="🔍 CCR NO, 업체명, 품명으로 검색..."
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
                            defect_type_code: '',
                            cause_category: '',
                            has_action: '',
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
                    <p className="text-[var(--text-secondary)]">고객 불만 목록을 불러오는 중...</p>
                  </div>
                ) : (
                  <>
                    {(complaints && complaints.length > 0) ? (
                      <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full min-w-max">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '130px'}}>CCR NO</th>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>발생일</th>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>업체명</th>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>품명</th>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '150px'}}>불량유형</th>
                              <th className="px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '110px'}}>합계금액</th>
                              <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>6M</th>
                              <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '90px'}}>조치여부</th>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '90px'}}>작성자</th>
                              <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '130px'}}>작업</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {complaints.map(item => (
                              <tr 
                                key={item.id}
                                onClick={() => handleViewDetail(item)}
                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                              >
                                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.ccr_no}</td>
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
                                <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                  ₩{Math.round(item.total_amount || 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <span className={getSixMBadgeClass(item.cause_category)} style={{display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: '500', borderRadius: '0px'}}>
                                    {item.cause_category_display}
                                  </span>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  {item.action_completed ? (
                                    <Badge variant="success">조치완료</Badge>
                                  ) : (
                                    <Badge variant="warning">조치대기</Badge>
                                  )}
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
                        고객 불만 데이터가 없습니다.
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      {/* 고객 불만 상세보기 모달 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedComplaint(null)
        }}
        title="고객 불만 상세정보"
        size="xl"
      >
        {selectedComplaint && (
          <div className="space-y-5">
            {/* 기본 정보 섹션 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center">
                <span className="w-1 h-4 bg-blue-600 mr-2 rounded"></span>
                기본 정보
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">CCR NO</label>
                  <p className="font-mono text-base font-semibold text-gray-900 mt-1">{selectedComplaint.ccr_no}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">발생일</label>
                  <p className="text-base text-gray-900 mt-1">{new Date(selectedComplaint.occurrence_date).toLocaleDateString('ko-KR')}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">업체명</label>
                  <p className="text-base text-gray-900 mt-1">{selectedComplaint.vendor}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">품명</label>
                  <p className="text-base text-gray-900 mt-1">{selectedComplaint.product_name}</p>
                </div>
              </div>
            </div>

            {/* 수량/금액 정보 섹션 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
              <h3 className="text-sm font-semibold text-green-900 mb-4 flex items-center">
                <span className="w-1 h-4 bg-green-600 mr-2 rounded"></span>
                수량/금액 정보
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="text-xs font-medium text-gray-500 uppercase block">수량</label>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{selectedComplaint.defect_qty}</p>
                  <p className="text-xs text-gray-500 mt-1">개</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="text-xs font-medium text-gray-500 uppercase block">단가</label>
                  <p className="text-2xl font-bold text-gray-900 mt-2">₩{Math.round(selectedComplaint.unit_price).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">원</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-lg shadow-sm text-center border border-red-200">
                  <label className="text-xs font-medium text-red-700 uppercase block">합계</label>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    ₩{Math.round(selectedComplaint.total_amount || 0).toLocaleString()}
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
                  <p className="text-base text-gray-900 mt-1">{selectedComplaint.defect_type_code} - {selectedComplaint.defect_type_name}</p>
                </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="text-xs font-medium text-gray-500 uppercase">발생 원인 (6M)</label>
                    <p className="text-base text-gray-900 mt-1">{selectedComplaint.cause_code} - {selectedComplaint.cause_name}</p>
                    <span className={getSixMBadgeClass(selectedComplaint.cause_category)} style={{display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: '500', borderRadius: '9999px', marginTop: '0.5rem'}}>
                      {selectedComplaint.cause_category_display}
                    </span>
                  </div>
              </div>
            </div>

              {/* 조치 정보 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-100">
                <h3 className="text-sm font-semibold text-purple-900 mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-1 h-4 bg-purple-600 mr-2 rounded"></span>
                    조치 정보
                  </span>
                  {selectedComplaint.action_completed ? (
                    <Badge variant="success">조치완료</Badge>
                  ) : (
                    <Badge variant="warning">조치대기</Badge>
                  )}
                </h3>
                {selectedComplaint.action_content && (
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedComplaint.action_content}</p>
                  </div>
                )}
                {!selectedComplaint.action_content && (
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <p className="text-sm text-gray-500">조치 내용이 없습니다.</p>
                  </div>
                )}
              </div>

            {/* 불만 내용 */}
            {selectedComplaint.complaint_content && (
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-5 border border-yellow-100">
                <h3 className="text-sm font-semibold text-yellow-900 mb-4 flex items-center">
                  <span className="w-1 h-4 bg-yellow-600 mr-2 rounded"></span>
                  불만 내용
                </h3>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedComplaint.complaint_content}</p>
                </div>
              </div>
            )}

            {/* 등록 정보 */}
            <div className="bg-gray-100 rounded-lg p-4 border-t-2 border-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">등록자</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{selectedComplaint.created_by_name || '알 수 없음'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">등록일시</label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(selectedComplaint.created_at).toLocaleString('ko-KR')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 고객 불만 수정 모달 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditForm(null)
          setSelectedComplaint(null)
          setEditValidationErrors({})
        }}
        title="고객 불만 수정"
        size="xl"
      >
        {editForm && (
          <form onSubmit={handleEditSave} className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  CCR NO <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editForm.ccr_no}
                  onChange={(e) => setEditForm(prev => prev ? { ...prev, ccr_no: e.target.value } : null)}
                  placeholder="CCR-2025-001"
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
            </div>

            {/* 수량/금액 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  수량 (개) <span className="text-red-500">*</span>
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
                <label className="block text-sm font-medium mb-2">합계 (자동계산)</label>
                <Input
                  value={Math.round((parseInt(editForm.defect_qty.toString()) || 0) * (parseInt(editForm.unit_price.toString()) || 0)).toLocaleString()}
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

            {/* 불만 내용 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                불만 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                rows={3}
                value={editForm.complaint_content}
                onChange={(e) => setEditForm(prev => prev ? { ...prev, complaint_content: e.target.value } : null)}
                placeholder="고객 불만 내용을 상세히 입력해주세요"
                required
              />
            </div>

            {/* 조치 내용 */}
            <div>
              <label className="block text-sm font-medium mb-2">조치 내용</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                rows={3}
                value={editForm.action_content}
                onChange={(e) => setEditForm(prev => prev ? { ...prev, action_content: e.target.value } : null)}
                placeholder="조치 내용 입력 (선택사항)"
              />
            </div>

            {/* 조치 완료 여부 토글 */}
            <div>
              <label className="block text-sm font-medium mb-2">조치 완료 여부</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditForm(prev => prev ? { ...prev, action_completed: !prev.action_completed } : null)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 ${
                    editForm.action_completed ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editForm.action_completed ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${editForm.action_completed ? 'text-green-700' : 'text-gray-600'}`}>
                  {editForm.action_completed ? '조치완료' : '조치대기'}
                </span>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false)
                  setEditForm(null)
                  setSelectedComplaint(null)
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

      {/* 고객 불만 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteTarget(null)
        }}
        title="고객 불만 삭제"
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
                정말로 이 고객 불만을 삭제하시겠습니까?
              </h3>
              <p className="text-sm text-gray-600">
                삭제된 데이터는 복구할 수 없습니다.
              </p>
            </div>

            {/* 고객 불만 정보 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">CCR NO</span>
                  <span className="text-sm font-semibold text-gray-900">{deleteTarget.ccr_no}</span>
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
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">조치여부</span>
                  {deleteTarget.action_completed ? (
                    <Badge variant="success">조치완료</Badge>
                  ) : (
                    <Badge variant="warning">조치대기</Badge>
                  )}
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
