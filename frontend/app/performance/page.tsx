'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { performanceAPI, type PerformanceRecord, type PerformanceCreateRequest, type Vendor, type Producer } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Sidebar from '@/components/ui/Sidebar'
import SearchableSelect from '@/components/ui/SearchableSelect'
import VendorProducerManagementModal from '@/components/ui/VendorProducerManagementModal'
import { toast, Toaster } from 'sonner'


type TabType = 'single' | 'bulk' | 'list'

export default function PerformancePage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('single')
  const [performances, setPerformances] = useState<PerformanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 단일 등록 폼 상태
  const [singleForm, setSingleForm] = useState<PerformanceCreateRequest>({
    type: 'inhouse',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    product_name: '',
    control_no: '',
    quantity: 1,
    producer: 'KOMEX' // 기본값을 KOMEX로 설정
  })

  // 폼 에러 상태
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 실적 목록 관련 상태
  const [listFilters, setListFilters] = useState({
    type: '',
    producer: '',
    weekday_code: '',
    date_from: '',
    date_to: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [ordering, setOrdering] = useState('-created_at')
  const pageSize = 20

  // 실적 목록 로드
  const loadPerformances = async (resetPage = false) => {
    try {
      setLoading(true)
      setError('')
      
      const page = resetPage ? 1 : currentPage
      if (resetPage) {
        setCurrentPage(1)
      }
      
      // 빈 값이 아닌 필터만 포함
      const cleanFilters = Object.fromEntries(
        Object.entries(listFilters).filter(([key, value]) => {
          if (!value) return false
          if (typeof value === 'string') return value.trim() !== ''
          return true // 문자열이 아닌 값은 그대로 포함
        })
      )
      
      const params: any = {
        page,
        ordering,
        ...cleanFilters
      }
      
      const response = await performanceAPI.getPerformances(params)
      setPerformances(response.data.results)
      setTotalCount(response.data.count)
      
    } catch (error: any) {
      console.error('Load performances error:', error)
      
      if (error.response?.data?.error) {
        toast.error(`실적 목록 조회 실패: ${error.response.data.error}`)
      } else if (error.response?.status === 400) {
        toast.error('잘못된 검색 조건입니다. 필터를 확인해주세요.')
      } else if (error.message) {
        toast.error(`실적 목록 조회 실패: ${error.message}`)
      } else {
        toast.error('실적 목록을 불러오는데 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: any) => {
    // 값을 문자열로 변환하여 안전하게 처리
    const stringValue = value == null ? '' : String(value)
    setListFilters(prev => ({ ...prev, [key]: stringValue }))
  }

  // 필터 초기화
  const handleFilterReset = () => {
    setListFilters({
      type: '',
      producer: '',
      weekday_code: '',
      date_from: '',
      date_to: '',
      search: ''
    })
    setCurrentPage(1)
  }

  // 정렬 변경
  const handleSortChange = (newOrdering: any) => {
    const stringOrdering = String(newOrdering)
    setOrdering(stringOrdering)
    setCurrentPage(1)
  }

  // 삭제 확인 모달 열기
  const openDeleteModal = (performance: any) => {
    setDeleteTargetId(performance.id)
    setDeleteTargetInfo(`${performance.type_display} - ${performance.vendor} - ${performance.product_name}`)
    setDeleteModalOpen(true)
  }

  // 삭제 확인 모달 닫기
  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeleteTargetId(null)
    setDeleteTargetInfo('')
  }

  // 실적 삭제 처리
  const handleDeletePerformance = async () => {
    if (!deleteTargetId) return

    setIsDeleting(true)
    try {
      await performanceAPI.deletePerformance(deleteTargetId)
      toast.success('실적이 성공적으로 삭제되었습니다.')
      closeDeleteModal()
      
      // 목록 새로고침
      await loadPerformances()
    } catch (error: any) {
      console.error('Delete error:', error)
      if (error.response?.status === 403) {
        toast.error('실적 삭제 권한이 없습니다.')
      } else if (error.response?.data?.detail) {
        toast.error(`삭제 실패: ${error.response.data.detail}`)
      } else {
        toast.error('실적 삭제에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // 체크박스 개별 선택/해제
  const handleSelectId = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(performances.map(perf => perf.id))
    } else {
      setSelectedIds([])
    }
  }

  // 일괄 삭제 모달 열기
  const openBulkDeleteModal = () => {
    if (selectedIds.length === 0) {
      toast.error('삭제할 실적을 선택해주세요.')
      return
    }
    setBulkDeleteModalOpen(true)
  }

  // 일괄 삭제 모달 닫기
  const closeBulkDeleteModal = () => {
    setBulkDeleteModalOpen(false)
  }

  // 일괄 삭제 처리
  const handleBulkDeletePerformances = async () => {
    if (selectedIds.length === 0) return

    setIsBulkDeleting(true)
    try {
      const response = await performanceAPI.bulkDeletePerformances(selectedIds)
      const data = response.data as { message?: string }
      toast.success(data.message || `${selectedIds.length}건의 실적이 성공적으로 삭제되었습니다.`)
      setSelectedIds([])
      closeBulkDeleteModal()
      
      // 목록 새로고침
      await loadPerformances()
    } catch (error: any) {
      console.error('Bulk delete error:', error)
      if (error.response?.status === 403) {
        toast.error('실적 삭제 권한이 없습니다.')
      } else if (error.response?.data?.error) {
        toast.error(`일괄 삭제 실패: ${error.response.data.error}`)
      } else {
        toast.error('일괄 삭제에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsBulkDeleting(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'list') {
      loadPerformances()
      // 탭 변경 시 선택 상태 초기화
      setSelectedIds([])
    }
  }, [activeTab, currentPage, ordering])

  // 데이터가 변경될 때 선택 상태 초기화
  useEffect(() => {
    setSelectedIds([])
  }, [performances])

  // 검색 실행 함수
  const handleSearch = () => {
    loadPerformances(true) // 필터 변경 시 첫 페이지로 리셋
  }

  // 단일 등록 폼 검증
  const validateSingleForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!singleForm.vendor.trim()) {
      errors.vendor = '업체명을 입력해주세요.'
    }
    if (!singleForm.product_name.trim()) {
      errors.product_name = '품명을 입력해주세요.'
    }
    if (!singleForm.control_no.trim()) {
      errors.control_no = '관리번호를 입력해주세요.'
    }
    if (!singleForm.producer.trim()) {
      errors.producer = '생산처를 입력해주세요.'
    }
    if (singleForm.quantity < 1) {
      errors.quantity = '수량은 1 이상이어야 합니다.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 단일 실적 등록
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateSingleForm()) return

    try {
      setLoading(true)
      setFormErrors({})
      
      const response = await performanceAPI.createPerformance(singleForm)
      
      toast.success(`실적이 성공적으로 등록되었습니다. (ID: ${response.data.record_uid}, 요일: ${response.data.weekday})`)
      
      // 폼 초기화
      setSingleForm({
        type: 'inhouse',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        product_name: '',
        control_no: '',
        quantity: 1,
        producer: 'KOMEX' // 기본값을 KOMEX로 설정
      })
      
    } catch (error: any) {
      console.error('Performance creation error:', error)
      
      if (error.response?.data) {
        // DRF validation errors (field-specific errors)
        if (typeof error.response.data === 'object' && error.response.data !== null) {
          const errors = error.response.data
          
          // 필드별 에러 처리
          const fieldErrors: Record<string, string> = {}
          let generalErrors: string[] = []
          
          Object.keys(errors).forEach(field => {
            const fieldError = errors[field]
            if (Array.isArray(fieldError)) {
              if (['vendor', 'product_name', 'control_no', 'producer', 'quantity', 'date', 'type'].includes(field)) {
                fieldErrors[field] = fieldError[0]
              } else {
                generalErrors.push(`${field}: ${fieldError[0]}`)
              }
            } else if (typeof fieldError === 'string') {
              if (['vendor', 'product_name', 'control_no', 'producer', 'quantity', 'date', 'type'].includes(field)) {
                fieldErrors[field] = fieldError
              } else {
                generalErrors.push(`${field}: ${fieldError}`)
              }
            }
          })
          
          setFormErrors(fieldErrors)
          
          if (generalErrors.length > 0) {
            toast.error(`등록 실패: ${generalErrors.join(', ')}`)
          } else if (Object.keys(fieldErrors).length > 0) {
            toast.error('입력한 정보를 확인해주세요.')
          } else if (errors.detail) {
            toast.error(`등록 실패: ${errors.detail}`)
          } else if (errors.error) {
            toast.error(`등록 실패: ${errors.error}`)
          } else {
            toast.error('등록 실패: 서버에서 알 수 없는 오류가 발생했습니다.')
          }
        } else if (typeof error.response.data === 'string') {
          toast.error(`등록 실패: ${error.response.data}`)
        } else {
          toast.error('등록 실패: 서버 응답을 처리할 수 없습니다.')
        }
      } else if (error.message) {
        toast.error(`등록 실패: ${error.message}`)
      } else {
        toast.error('등록 실패: 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 일괄 등록 관련 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadMode, setUploadMode] = useState<'partial' | 'full'>('partial')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  
  // 삭제 관련 상태
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [deleteTargetInfo, setDeleteTargetInfo] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // 일괄 삭제 관련 상태
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  
  // 업체명/생산처 관련 상태
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [producers, setProducers] = useState<Producer[]>([])
  const [vendorModalOpen, setVendorModalOpen] = useState(false)
  const [producerModalOpen, setProducerModalOpen] = useState(false)

  // 업체명/생산처 목록 로드
  const loadVendorsAndProducers = async () => {
    try {
      const [vendorsRes, producersRes] = await Promise.all([
        performanceAPI.getVendors(),
        performanceAPI.getProducers()
      ])
      // API 응답이 배열인지 확인하고 설정
      setVendors(Array.isArray(vendorsRes.data) ? vendorsRes.data : [])
      setProducers(Array.isArray(producersRes.data) ? producersRes.data : [])
    } catch (error) {
      console.error('Load vendors/producers error:', error)
      // 에러 발생 시 빈 배열로 설정
      setVendors([])
      setProducers([])
    }
  }

  // 컴포넌트 마운트 시 업체명/생산처 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadVendorsAndProducers()
    }
  }, [isAuthenticated])

  // 템플릿 다운로드 (통합 템플릿)
  const handleTemplateDownload = async () => {
    try {
      const response = await performanceAPI.downloadTemplate()
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'performance_template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('템플릿이 다운로드되었습니다.')
    } catch (error) {
      toast.error('템플릿 다운로드에 실패했습니다.')
    }
  }

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('CSV 파일만 업로드 가능합니다.')
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        toast.error('파일 크기는 5MB 이하여야 합니다.')
        return
      }
      setSelectedFile(file)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'))
    
    if (!csvFile) {
      toast.error('CSV 파일만 업로드 가능합니다.')
      return
    }
    
    if (csvFile.size > 5 * 1024 * 1024) { // 5MB 제한
      toast.error('파일 크기는 5MB 이하여야 합니다.')
      return
    }
    
    setSelectedFile(csvFile)
  }

  // CSV 파일 업로드
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('업로드할 파일을 선택해주세요.')
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('transaction', uploadMode)

      const response = await performanceAPI.csvUploadPerformance(formData)
      setUploadResult(response.data)
      toast.success(`업로드 완료: 성공 ${response.data.summary.success}건, 실패 ${response.data.summary.failed}건`)
      setSelectedFile(null)
      
      // 파일 input 초기화
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (error: any) {
      console.error('File upload error:', error)
      
      if (error.response?.data?.summary) {
        // 부분 성공한 경우 결과 표시
        setUploadResult(error.response.data)
        toast.warning(`업로드 완료: 성공 ${error.response.data.summary.success}건, 실패 ${error.response.data.summary.failed}건`)
      } else if (error.response?.data?.error) {
        // 서버에서 보낸 구체적인 에러 메시지
        toast.error(`업로드 실패: ${error.response.data.error}`)
      } else if (error.response?.data) {
        // 다른 형태의 에러 응답
        toast.error(`업로드 실패 (${error.response.status}): 서버 응답을 처리할 수 없습니다.`)
      } else if (error.message) {
        toast.error(`업로드 실패: ${error.message}`)
      } else {
        toast.error('파일 업로드에 실패했습니다. 네트워크 연결을 확인해주세요.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  // 탭 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'single':
        return (
          <Card>
            <CardHeader>
              <CardTitle>단일 실적 등록</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSingleSubmit} className="space-y-6">
                {/* 실적 유형 토글 */}
                <div>
                  <label className="block text-sm font-medium mb-2">실적 유형 <span className="text-red-500">*</span></label>
                  <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSingleForm(prev => ({ ...prev, type: 'inhouse', producer: 'KOMEX' }))}
                      className={`px-6 py-2 text-sm font-medium transition-colors ${
                        singleForm.type === 'inhouse'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      사내
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleForm(prev => ({ ...prev, type: 'incoming', producer: '' }))}
                      className={`px-6 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                        singleForm.type === 'incoming'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      수입
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">실적일 <span className="text-red-500">*</span></label>
                    <Input
                      type="date"
                      value={singleForm.date}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
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
                      value={singleForm.vendor}
                      onChange={(value) => setSingleForm(prev => ({ ...prev, vendor: value }))}
                      options={vendors.map(v => ({ value: v.name, label: v.name }))}
                      placeholder="업체명 검색 또는 입력"
                      error={formErrors.vendor}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">품명 <span className="text-red-500">*</span></label>
                    <Input
                      value={singleForm.product_name}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, product_name: e.target.value }))}
                      placeholder="예: 하우징-123"
                      error={formErrors.product_name}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">관리번호 <span className="text-red-500">*</span></label>
                    <Input
                      value={singleForm.control_no}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, control_no: e.target.value }))}
                      placeholder="예: QMS-2025-000123"
                      error={formErrors.control_no}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">수량 <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      min="1"
                      value={singleForm.quantity}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      error={formErrors.quantity}
                    />
                  </div>

                  <div>
                    {singleForm.type === 'inhouse' ? (
                      <>
                        <label className="block text-sm font-medium mb-1">생산처 <span className="text-red-500">*</span></label>
                        <Input
                          value="KOMEX"
                          disabled
                          className="bg-gray-100"
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium">생산처 <span className="text-red-500">*</span></label>
                          {user && user.role_level >= 1 && (
                            <button
                              type="button"
                              onClick={() => setProducerModalOpen(true)}
                              className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              📝 관리
                            </button>
                          )}
                        </div>
                        <SearchableSelect
                          value={singleForm.producer}
                          onChange={(value) => setSingleForm(prev => ({ ...prev, producer: value }))}
                          options={producers.map(p => ({ value: p.name, label: p.name }))}
                          placeholder="생산처 검색 또는 입력"
                          error={formErrors.producer}
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? '등록 중...' : '실적 등록'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )

      case 'bulk':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>일괄 실적 등록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 템플릿 다운로드 */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="outline"
                      onClick={handleTemplateDownload}
                      className="flex-1"
                    >
                      📄 CSV 템플릿 다운로드
                    </Button>
                  </div>
                  
                  {/* 파일 업로드 영역 */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging 
                        ? 'border-blue-400 bg-blue-50' 
                        : selectedFile 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="csv-file-input"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="text-green-600 text-lg">✓</div>
                        <p className="text-gray-700 font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          크기: {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null)
                            const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
                            if (fileInput) fileInput.value = ''
                          }}
                        >
                          파일 변경
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-gray-400 text-4xl">📁</div>
                        <div>
                          <p className="text-gray-700 mb-2">
                            CSV 파일을 여기에 드롭하거나 클릭하여 업로드하세요
                          </p>
                          <Button 
                            variant="outline"
                            onClick={() => document.getElementById('csv-file-input')?.click()}
                          >
                            파일 선택
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          최대 파일 크기: 5MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 업로드 설정 */}
                  {selectedFile && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">업로드 모드</label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="radio"
                              value="partial"
                              checked={uploadMode === 'partial'}
                              onChange={(e) => setUploadMode(e.target.value as 'partial' | 'full')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div>
                              <span className="font-medium">부분 저장 모드</span>
                              <p className="text-sm text-gray-600">오류가 있는 행은 건너뛰고 정상 행만 저장합니다</p>
                            </div>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="radio"
                              value="full"
                              checked={uploadMode === 'full'}
                              onChange={(e) => setUploadMode(e.target.value as 'partial' | 'full')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div>
                              <span className="font-medium">전체 롤백 모드</span>
                              <p className="text-sm text-gray-600">하나라도 오류가 있으면 전체 저장을 취소합니다</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <Button 
                        onClick={handleFileUpload}
                        disabled={isUploading}
                        className="w-full"
                      >
                        {isUploading ? '업로드 중...' : '실적 일괄 등록'}
                      </Button>
                    </div>
                  )}
                  
                  {/* 업로드 가이드 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">📋 CSV 파일 형식 가이드</h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p><strong>필수 컬럼:</strong> type, date, vendor, product_name, control_no, quantity, producer</p>
                      
                      <div className="mt-3">
                        <p className="font-medium mb-1">컬럼 설명:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong>type:</strong> inhouse (사내 실적) 또는 incoming (수입검사 실적)</li>
                          <li><strong>date:</strong> 실적일 (YYYY-MM-DD 형식)</li>
                          <li><strong>vendor:</strong> 업체명</li>
                          <li><strong>product_name:</strong> 품명</li>
                          <li><strong>control_no:</strong> 관리번호</li>
                          <li><strong>quantity:</strong> 수량 (1 이상의 숫자)</li>
                          <li><strong>producer:</strong> 생산처</li>
                        </ul>
                      </div>
                      
                      <div className="mt-3">
                        <p className="font-medium mb-1">주의사항:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>최대 1,000행까지 한 번에 업로드 가능</li>
                          <li>첫 번째 행은 반드시 헤더여야 함</li>
                          <li>UTF-8 인코딩 권장</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 업로드 결과 */}
            {uploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle>업로드 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{uploadResult.summary.total}</div>
                        <div className="text-sm text-blue-600">총 행 수</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{uploadResult.summary.success}</div>
                        <div className="text-sm text-green-600">성공</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{uploadResult.summary.failed}</div>
                        <div className="text-sm text-red-600">실패</div>
                      </div>
                    </div>

                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-red-600">
                          오류 상세 내역 ({uploadResult.errors.length}건)
                        </h4>
                        <div className="max-h-60 overflow-y-auto bg-red-50 rounded-lg p-3">
                          {uploadResult.errors.map((error: any, index: number) => (
                            <div key={index} className="text-sm mb-2 p-2 bg-white rounded border-l-4 border-red-400">
                              <div className="flex justify-between items-start mb-1">
                                <strong className="text-red-700">
                                  행 {(error.row_index ?? index) + 1}
                                </strong>
                                {error.control_no && (
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    관리번호: {error.control_no}
                                  </span>
                                )}
                              </div>
                              <div className="text-red-600 break-words">
                                {error.message || '알 수 없는 오류가 발생했습니다.'}
                              </div>
                              {error.field_errors && (
                                <div className="mt-1 text-xs">
                                  <span className="text-gray-600">상세 오류:</span>
                                  <ul className="list-disc list-inside ml-2 text-red-500">
                                    {Object.entries(error.field_errors).map(([field, fieldError]: [string, any]) => (
                                      <li key={field}>
                                        <strong>{field}:</strong> {Array.isArray(fieldError) ? fieldError.join(', ') : fieldError}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {uploadResult.created && uploadResult.created.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-green-600">성공한 등록 ({uploadResult.created.length}건)</h4>
                        <div className="max-h-40 overflow-y-auto bg-green-50 rounded-lg p-3">
                          {uploadResult.created.map((record: any, index: number) => (
                            <div key={index} className="text-sm text-green-700 mb-1">
                              ID: {record.record_uid}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 'list':
        const totalPages = Math.ceil(totalCount / pageSize)
        
        return (
          <div className="space-y-4">
            {/* 필터 및 검색 */}
            <Card>
              <CardHeader>
                <CardTitle>필터 및 검색</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">실적 유형</label>
                    <Select
                      value={listFilters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      options={[
                        { value: '', label: '전체' },
                        { value: 'inhouse', label: '사내' },
                        { value: 'incoming', label: '수입' }
                      ]}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">요일</label>
                    <Select
                      value={listFilters.weekday_code}
                      onChange={(e) => handleFilterChange('weekday_code', e.target.value)}
                      options={[
                        { value: '', label: '전체' },
                        { value: 'MON', label: '월요일' },
                        { value: 'TUE', label: '화요일' },
                        { value: 'WED', label: '수요일' },
                        { value: 'THU', label: '목요일' },
                        { value: 'FRI', label: '금요일' },
                        { value: 'SAT', label: '토요일' },
                        { value: 'SUN', label: '일요일' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">시작 날짜</label>
                    <Input
                      type="date"
                      value={listFilters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">종료 날짜</label>
                    <Input
                      type="date"
                      value={listFilters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">생산처</label>
                    <Input
                      value={listFilters.producer}
                      onChange={(e) => handleFilterChange('producer', e.target.value)}
                      placeholder="생산처명으로 검색"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch()
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">통합 검색</label>
                    <Input
                      value={listFilters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="업체명, 품명, 관리번호로 검색"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch()
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleFilterReset}>
                    필터 초기화
                  </Button>
                  <Button onClick={handleSearch} disabled={loading}>
                    검색
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 실적 목록 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>실적 목록</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      총 {totalCount.toLocaleString()}건
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                      <Button
                        variant="danger"
                        onClick={openBulkDeleteModal}
                      >
                        선택 삭제 ({selectedIds.length})
                      </Button>
                    )}
                    <Select
                      value={ordering}
                      onChange={(e) => handleSortChange(e.target.value)}
                      options={[
                        { value: '-created_at', label: '등록일 (최신순)' },
                        { value: 'created_at', label: '등록일 (과거순)' },
                        { value: '-date', label: '실적일 (최신순)' },
                        { value: 'date', label: '실적일 (과거순)' },
                        { value: 'vendor', label: '업체명 (가나다순)' },
                        { value: '-vendor', label: '업체명 (가나다 역순)' },
                        { value: '-quantity', label: '수량 (많은 순)' },
                        { value: 'quantity', label: '수량 (적은 순)' }
                      ]}
                    />
                    <Button onClick={() => loadPerformances()} disabled={loading}>
                      {loading ? '로딩 중...' : '새로고침'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
                    {error}
                  </div>
                )}
                
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      데이터를 불러오는 중...
                    </div>
                  </div>
                ) : performances.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {Object.values(listFilters).some(v => v !== '') 
                      ? '검색 조건에 맞는 실적이 없습니다.' 
                      : '등록된 실적이 없습니다.'
                    }
                  </div>
                ) : (
                  <>
                    {/* 전체 선택 컨트롤 */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={performances.length > 0 && selectedIds.length === performances.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm text-gray-700">
                          전체 선택 ({selectedIds.length}/{performances.length})
                        </label>
                      </div>
                      {selectedIds.length > 0 && (
                        <span className="text-sm text-blue-600">
                          {selectedIds.length}개 항목이 선택되었습니다
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="w-full min-w-max">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '60px'}}>선택</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '70px'}}>유형</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '110px'}}>실적일</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>업체명</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>품명</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '130px'}}>관리번호</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '80px'}}>수량</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>생산처</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '70px'}}>요일</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '90px'}}>등록자</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '110px'}}>등록일</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>작업</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {performances.map(perf => (
                            <tr key={perf.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(perf.id)}
                                  onChange={(e) => handleSelectId(perf.id, e.target.checked)}
                                />
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <Badge variant={perf.type === 'inhouse' ? 'primary' : 'secondary'}>
                                  {perf.type_display}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">{perf.date}</td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '120px'}} title={perf.vendor}>
                                {perf.vendor}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '120px'}} title={perf.product_name}>
                                {perf.product_name}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '130px'}} title={perf.control_no}>
                                {perf.control_no}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                                {perf.quantity.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 truncate" style={{maxWidth: '100px'}} title={perf.producer}>
                                {perf.producer}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{perf.weekday}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">{perf.created_by_name}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 text-center">
                                {new Date(perf.created_at).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => openDeleteModal(perf)}
                                >
                                  삭제
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center mt-6 space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          size="sm"
                        >
                          이전
                        </Button>
                        
                        <div className="flex space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNumber}
                                variant={currentPage === pageNumber ? 'primary' : 'outline'}
                                onClick={() => setCurrentPage(pageNumber)}
                                size="sm"
                                className="w-8 h-8 p-0"
                              >
                                {pageNumber}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          size="sm"
                        >
                          다음
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  // 권한 체크 (모든 훅 호출 후)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">로그인이 필요합니다</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              실적 관리 기능을 사용하려면 로그인해주세요.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user?.role_level !== undefined && user.role_level < 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">접근 권한이 없습니다</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              실적 관리 기능은 실무자 이상 권한이 필요합니다.
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              현재 권한: {user.role_level === 0 ? 'Guest' : `Level ${user.role_level}`}
            </p>
            <Button onClick={() => window.location.href = '/'}>
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              실적 관리
            </h1>
            <p className="text-[var(--text-secondary)]">
              사내 실적 및 수입검사 실적을 등록하고 관리하세요
            </p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              단일 등록
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'bulk'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              일괄 등록
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              실적 목록
            </button>
          </div>

          {/* 탭 컨텐츠 */}
          {renderTabContent()}
        </div>
      </main>

      {/* Toast 알림 */}
      <Toaster position="top-right" richColors />

      {/* 삭제 확인 모달 */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
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
                  정말로 이 실적을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  삭제된 데이터는 복구할 수 없습니다.
                </p>
              </div>

              {/* 실적 정보 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900 text-center">{deleteTargetInfo}</p>
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
                  onClick={handleDeletePerformance}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
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
                  선택한 {selectedIds.length}건의 실적을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  삭제된 데이터는 복구할 수 없습니다.
                </p>
              </div>

              {/* 실적 목록 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {performances
                    .filter(perf => selectedIds.includes(perf.id))
                    .slice(0, 5)
                    .map((perf, index) => (
                      <p key={perf.id} className="text-sm text-gray-900">
                        {index + 1}. {perf.type_display} - {perf.vendor} - {perf.product_name}
                      </p>
                    ))}
                  {selectedIds.length > 5 && (
                    <p className="text-sm text-gray-500 font-medium">... 외 {selectedIds.length - 5}건</p>
                  )}
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closeBulkDeleteModal}
                  disabled={isBulkDeleting}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  variant="danger"
                  onClick={handleBulkDeletePerformances}
                  disabled={isBulkDeleting}
                  className="flex-1"
                >
                  {isBulkDeleting ? '삭제 중...' : `${selectedIds.length}건 삭제`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 업체명 관리 모달 */}
      <VendorProducerManagementModal
        isOpen={vendorModalOpen}
        onClose={() => {
          setVendorModalOpen(false)
          loadVendorsAndProducers() // 모달 닫을 때 목록 재로드
        }}
        type="vendor"
      />

      {/* 생산처 관리 모달 */}
      <VendorProducerManagementModal
        isOpen={producerModalOpen}
        onClose={() => {
          setProducerModalOpen(false)
          loadVendorsAndProducers() // 모달 닫을 때 목록 재로드
        }}
        type="producer"
      />
    </div>
  )
}
