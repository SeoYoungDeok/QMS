'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Sidebar from '@/components/ui/Sidebar'
import { toast, Toaster } from 'sonner'
import { Search, AlertCircle, FileText, Filter, Calendar, User, Activity, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface AuditLog {
  id: number
  user_id: number | null
  username: string
  action: string
  action_display: string
  target_id: number | null
  details: string
  ip_address: string
  created_at: string
}

interface SearchParams {
  action: string
  username: string
  date_from: string
  date_to: string
  search: string
}

interface PaginationInfo {
  count: number
  next: string | null
  previous: string | null
  current_page: number
  total_pages: number
}

const ACTION_CHOICES = [
  { value: '', label: '전체' },
  // 인증 관련
  { value: 'LOGIN_SUCCESS', label: '로그인 성공' },
  { value: 'LOGIN_FAILED', label: '로그인 실패' },
  { value: 'SIGNUP', label: '회원가입' },
  { value: 'CHANGE_PASSWORD', label: '비밀번호 변경' },
  // 사용자 관리
  { value: 'CREATE_USER', label: '사용자 추가' },
  { value: 'UPDATE_USER', label: '사용자 수정' },
  { value: 'DELETE_USER', label: '사용자 삭제' },
  { value: 'RESTORE_USER', label: '사용자 복구' },
  { value: 'RESET_PASSWORD', label: '비밀번호 초기화' },
  { value: 'UPDATE_ROLE', label: '권한 변경' },
  { value: 'UPDATE_STATUS', label: '계정 상태 변경' },
  // 실적 관리
  { value: 'CREATE_PERFORMANCE', label: '실적 등록' },
  { value: 'UPDATE_PERFORMANCE', label: '실적 수정' },
  { value: 'DELETE_PERFORMANCE', label: '실적 삭제' },
  { value: 'BULK_CREATE_PERFORMANCE', label: '실적 일괄 등록' },
  { value: 'BULK_CREATE_PERFORMANCE_CSV', label: '실적 CSV 일괄 등록' },
  { value: 'BULK_DELETE_PERFORMANCE', label: '실적 일괄 삭제' },
  { value: 'EXPORT_PERFORMANCE', label: '실적 내보내기' },
  // 부적합 관리
  { value: 'CREATE_NONCONFORMANCE', label: '부적합 등록' },
  { value: 'UPDATE_NONCONFORMANCE', label: '부적합 수정' },
  { value: 'DELETE_NONCONFORMANCE', label: '부적합 삭제' },
  { value: 'CREATE_DEFECT_TYPE', label: '불량유형 등록' },
  { value: 'DELETE_DEFECT_TYPE', label: '불량유형 삭제' },
  { value: 'CREATE_DEFECT_CAUSE', label: '불량원인 등록' },
  { value: 'DELETE_DEFECT_CAUSE', label: '불량원인 삭제' },
  { value: 'REORDER_DEFECT_TYPES', label: '불량유형 순서 변경' },
  { value: 'REORDER_DEFECT_CAUSES', label: '불량원인 순서 변경' },
  { value: 'EXPORT_NONCONFORMANCE', label: '부적합 내보내기' },
  // 일정 관리
  { value: 'CREATE_SCHEDULE', label: '일정 등록' },
  { value: 'UPDATE_SCHEDULE', label: '일정 수정' },
  { value: 'DELETE_SCHEDULE', label: '일정 삭제' },
  // 고객불만 관리
  { value: 'CREATE_CUSTOMER_COMPLAINT', label: '고객불만 등록' },
  { value: 'UPDATE_CUSTOMER_COMPLAINT', label: '고객불만 수정' },
  { value: 'DELETE_CUSTOMER_COMPLAINT', label: '고객불만 삭제' },
  { value: 'EXPORT_CUSTOMER_COMPLAINT', label: '고객불만 내보내기' },
  // KPI 목표 관리
  { value: 'CREATE_KPI_TARGET', label: 'KPI 목표 등록' },
  { value: 'UPDATE_KPI_TARGET', label: 'KPI 목표 수정' },
  { value: 'DELETE_KPI_TARGET', label: 'KPI 목표 삭제' },
]

export default function AuditLogsPage() {
  const { user, isAuthenticated } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1
  })
  
  const [searchParams, setSearchParams] = useState<SearchParams>({
    action: '',
    username: '',
    date_from: '',
    date_to: '',
    search: ''
  })

  // 초기 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadLogs(1)
    }
  }, [isAuthenticated])

  // 감사 로그 조회
  const loadLogs = async (page: number = currentPage) => {
    try {
      setLoading(true)
      
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('로그인이 필요합니다')
        return
      }
      
      const params = new URLSearchParams()
      params.append('page', page.toString())
      if (searchParams.action) params.append('action', searchParams.action)
      if (searchParams.username) params.append('username', searchParams.username)
      if (searchParams.date_from) params.append('date_from', searchParams.date_from + 'T00:00:00')
      if (searchParams.date_to) params.append('date_to', searchParams.date_to + 'T23:59:59')
      if (searchParams.search) params.append('search', searchParams.search)

      const response = await fetch(
        `/api/audit/logs/?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API 에러:', response.status, errorText)
        throw new Error(`감사 로그 조회 실패: ${response.status}`)
      }

      const data = await response.json()
      // DRF 페이지네이션 응답 처리
      const logsData = Array.isArray(data) ? data : (data.results || [])
      setLogs(logsData)
      
      // 페이지네이션 정보 업데이트
      if (!Array.isArray(data)) {
        const totalPages = Math.ceil(data.count / 20)
        setPagination({
          count: data.count,
          next: data.next,
          previous: data.previous,
          current_page: page,
          total_pages: totalPages
        })
      }
      setCurrentPage(page)
    } catch (error: any) {
      console.error('감사 로그 조회 오류:', error)
      toast.error(error.message || '감사 로그를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadLogs(1)
  }

  // 검색 초기화
  const handleResetSearch = () => {
    setSearchParams({
      action: '',
      username: '',
      date_from: '',
      date_to: '',
      search: ''
    })
    setCurrentPage(1)
    setTimeout(() => loadLogs(1), 0)
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    loadLogs(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 상세 보기
  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  // 액션 타입별 배지 색상 (통일성 있게 분류)
  const getActionBadgeVariant = (action: string): 'success' | 'destructive' | 'default' | 'primary' | 'secondary' | 'warning' | 'info' | 'outline' => {
    // 1. 성공 메시지 (초록색 - success)
    if (action === 'LOGIN_SUCCESS') {
      return 'success'
    }
    
    // 2. 실패 메시지 (빨간색 - destructive)
    if (action === 'LOGIN_FAILED') {
      return 'destructive'
    }
    
    // 3. 삭제 관련 (빨간색 - destructive)
    // DELETE_USER, DELETE_PERFORMANCE, DELETE_NONCONFORMANCE, DELETE_DEFECT_TYPE, 
    // DELETE_DEFECT_CAUSE, DELETE_SCHEDULE, DELETE_CUSTOMER_COMPLAINT, DELETE_KPI_TARGET,
    // BULK_DELETE_PERFORMANCE
    if (action.startsWith('DELETE_') || action.startsWith('BULK_DELETE_')) {
      return 'destructive'
    }
    
    // 4. 내보내기 관련 (보라색 - secondary)
    // EXPORT_PERFORMANCE, EXPORT_NONCONFORMANCE, EXPORT_CUSTOMER_COMPLAINT
    if (action.startsWith('EXPORT_')) {
      return 'secondary'
    }
    
    // 5. 수정/변경 관련 (주황색 - warning)
    // UPDATE_USER, UPDATE_PERFORMANCE, UPDATE_NONCONFORMANCE, UPDATE_SCHEDULE,
    // UPDATE_CUSTOMER_COMPLAINT, UPDATE_KPI_TARGET, UPDATE_ROLE, UPDATE_STATUS,
    // CHANGE_PASSWORD, RESET_PASSWORD, REORDER_DEFECT_TYPES, REORDER_DEFECT_CAUSES
    if (action.startsWith('UPDATE_') || 
        action.startsWith('CHANGE_') || 
        action.startsWith('RESET_') || 
        action.startsWith('REORDER_')) {
      return 'warning'
    }
    
    // 6. 생성/등록/추가 관련 (파란색 - primary)
    // CREATE_USER, CREATE_PERFORMANCE, CREATE_NONCONFORMANCE, CREATE_DEFECT_TYPE,
    // CREATE_DEFECT_CAUSE, CREATE_SCHEDULE, CREATE_CUSTOMER_COMPLAINT, CREATE_KPI_TARGET,
    // BULK_CREATE_PERFORMANCE, BULK_CREATE_PERFORMANCE_CSV, SIGNUP, RESTORE_USER
    if (action.startsWith('CREATE_') || 
        action.startsWith('BULK_CREATE_') || 
        action === 'SIGNUP' || 
        action === 'RESTORE_USER') {
      return 'primary'
    }
    
    // 7. 기타 (회색 - default)
    return 'default'
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">시스템 감사 로그</h1>
              <p className="text-sm text-gray-500 mt-1">
                시스템의 모든 활동 이력을 조회할 수 있습니다
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span className="font-medium">{user?.username}</span>
              <Badge variant={user?.role_display === '관리자' ? 'destructive' : 'default'}>
                {user?.role_display || '일반 사용자'}
              </Badge>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* 검색 필터 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                검색 필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Activity className="h-4 w-4 inline mr-1" />
                      액션 타입
                    </label>
                    <Select
                      value={searchParams.action}
                      onChange={(e) => setSearchParams({ ...searchParams, action: e.target.value })}
                      options={ACTION_CHOICES}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <User className="h-4 w-4 inline mr-1" />
                      사용자명
                    </label>
                    <Input
                      type="text"
                      value={searchParams.username}
                      onChange={(e) => setSearchParams({ ...searchParams, username: e.target.value })}
                      placeholder="사용자명으로 검색"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Search className="h-4 w-4 inline mr-1" />
                      상세 검색
                    </label>
                    <Input
                      type="text"
                      value={searchParams.search}
                      onChange={(e) => setSearchParams({ ...searchParams, search: e.target.value })}
                      placeholder="IP, 상세 내용 검색"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      시작 날짜
                    </label>
                    <Input
                      type="date"
                      value={searchParams.date_from}
                      onChange={(e) => setSearchParams({ ...searchParams, date_from: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      종료 날짜
                    </label>
                    <Input
                      type="date"
                      value={searchParams.date_to}
                      onChange={(e) => setSearchParams({ ...searchParams, date_to: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? '검색 중...' : '검색'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleResetSearch}
                    disabled={loading}
                  >
                    초기화
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 감사 로그 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  감사 로그 목록
                </span>
                <span className="text-sm font-normal text-gray-500">
                  총 {pagination.count}건 ({pagination.current_page} / {pagination.total_pages} 페이지)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">로딩 중...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">조회된 감사 로그가 없습니다</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          발생 시각
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          사용자
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          액션
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP 주소
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          대상 ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상세
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          동작
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {log.username}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action_display}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {log.ip_address || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {log.target_id || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {log.details || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(log)}
                            >
                              상세
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 페이지네이션 */}
              {!loading && logs.length > 0 && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {pagination.count}개 중 {(pagination.current_page - 1) * 20 + 1}-
                    {Math.min(pagination.current_page * 20, pagination.count)}개 표시
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* 첫 페이지 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* 이전 페이지 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!pagination.previous}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* 페이지 번호들 */}
                    <div className="flex items-center gap-1">
                      {(() => {
                        const pages = []
                        const maxVisible = 5
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                        let endPage = Math.min(pagination.total_pages, startPage + maxVisible - 1)
                        
                        if (endPage - startPage < maxVisible - 1) {
                          startPage = Math.max(1, endPage - maxVisible + 1)
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={i === currentPage ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(i)}
                              className="h-8 min-w-8 px-3"
                            >
                              {i}
                            </Button>
                          )
                        }
                        return pages
                      })()}
                    </div>

                    {/* 다음 페이지 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!pagination.next}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* 마지막 페이지 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.total_pages)}
                      disabled={currentPage === pagination.total_pages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* 상세 모달 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedLog(null)
        }}
        title="감사 로그 상세"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                <p className="text-sm text-gray-900">{selectedLog.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">발생 시각</label>
                <p className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용자</label>
                <p className="text-sm text-gray-900">{selectedLog.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용자 ID</label>
                <p className="text-sm text-gray-900">{selectedLog.user_id || 'System'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">액션</label>
                <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                  {selectedLog.action_display}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">액션 코드</label>
                <p className="text-sm text-gray-900">{selectedLog.action}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP 주소</label>
                <p className="text-sm text-gray-900">{selectedLog.ip_address || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대상 리소스 ID</label>
                <p className="text-sm text-gray-900">{selectedLog.target_id || '-'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상세 정보</label>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-900 max-h-40 overflow-y-auto">
                {selectedLog.details || '상세 정보가 없습니다'}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedLog(null)
                }}
              >
                닫기
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

