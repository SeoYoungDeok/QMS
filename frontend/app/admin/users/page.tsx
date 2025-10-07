'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { userAPI, User } from '@/lib/api'
import { toast, Toaster } from 'sonner'
import { Key, ToggleLeft, ToggleRight } from 'lucide-react'
import Sidebar from '@/components/ui/Sidebar'

interface Filters {
  search: string
  department: string
  position: string
  role_level: string
  status: string
}

interface UserFormData {
  username: string
  password: string
  password_confirm: string
  name: string
  department: string
  position: string
  phone_number: string
  role_level: number
  status: string
}

export default function UsersPage() {
  const { user, hasRole } = useAuth()
  const router = useRouter()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 필터링
  const [filters, setFilters] = useState<Filters>({
    search: '',
    department: '',
    position: '',
    role_level: '',
    status: ''
  })
  
  // 모달 상태
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [userToRestore, setUserToRestore] = useState<User | null>(null)
  
  // 폼 데이터
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    password: '',
    password_confirm: '',
    name: '',
    department: '',
    position: '',
    phone_number: '',
    role_level: 0,
    status: 'active'
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [formLoading, setFormLoading] = useState(false)

  // 권한 확인
  useEffect(() => {
    if (!hasRole(2)) {
      router.push('/')
      return
    }
  }, [hasRole, router])

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true)
      const params: any = {}
      
      if (filters.search) params.search = filters.search
      if (filters.department) params.department = filters.department
      if (filters.position) params.position = filters.position
      if (filters.role_level) params.role_level = parseInt(filters.role_level)
      if (filters.status) params.status = filters.status
      
      const response = await userAPI.getUsers(params)
      setUsers(response.data.results)
      setError('')
    } catch (err: any) {
      const errorMsg = '사용자 목록을 불러오는데 실패했습니다.'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasRole(2)) {
      loadUsers()
    }
  }, [filters, hasRole])

  // 필터 변경
  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  // 사용자 상세 보기
  const handleViewUser = async (userId: number) => {
    try {
      const response = await userAPI.getUser(userId)
      setSelectedUser(response.data)
      setIsDetailModalOpen(true)
    } catch (err) {
      const errorMsg = '사용자 정보를 불러오는데 실패했습니다.'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  // 사용자 수정 모달 열기
  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setUserFormData({
      username: user.username,
      password: '',
      password_confirm: '',
      name: user.name,
      department: user.department,
      position: user.position,
      phone_number: user.phone_number,
      role_level: user.role_level,
      status: user.status
    })
    setFormErrors({})
    setIsEditModalOpen(true)
  }

  // 사용자 추가 모달 열기
  const handleCreateUser = () => {
    setUserFormData({
      username: '',
      password: '',
      password_confirm: '',
      name: '',
      department: '',
      position: '',
      phone_number: '',
      role_level: 0,
      status: 'active'
    })
    setFormErrors({})
    setIsCreateModalOpen(true)
  }

  // 폼 데이터 변경
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUserFormData(prev => ({
      ...prev,
      [name]: name === 'role_level' ? parseInt(value) : value
    }))
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // 사용자 생성
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    
    try {
      await userAPI.createUser(userFormData)
      setIsCreateModalOpen(false)
      toast.success('사용자가 생성되었습니다.')
      loadUsers()
    } catch (err: any) {
      if (err.response?.data) {
        setFormErrors(err.response.data)
        toast.error('사용자 생성에 실패했습니다. 입력 내용을 확인해주세요.')
      } else {
        const errorMsg = '사용자 생성에 실패했습니다.'
        setFormErrors({ submit: errorMsg })
        toast.error(errorMsg)
      }
    } finally {
      setFormLoading(false)
    }
  }

  // 사용자 수정
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    
    setFormLoading(true)
    
    try {
      const updateData = {
        department: userFormData.department,
        position: userFormData.position,
        phone_number: userFormData.phone_number,
        role_level: userFormData.role_level,
        status: userFormData.status
      }
      
      await userAPI.updateUser(selectedUser.id, updateData)
      setIsEditModalOpen(false)
      toast.success('사용자 정보가 수정되었습니다.')
      loadUsers()
    } catch (err: any) {
      if (err.response?.data) {
        setFormErrors(err.response.data)
        toast.error('사용자 수정에 실패했습니다. 입력 내용을 확인해주세요.')
      } else {
        const errorMsg = '사용자 수정에 실패했습니다.'
        setFormErrors({ submit: errorMsg })
        toast.error(errorMsg)
      }
    } finally {
      setFormLoading(false)
    }
  }

  // 사용자 삭제 모달 열기
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  // 사용자 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    
    try {
      await userAPI.deleteUser(userToDelete.id)
      toast.success('사용자가 삭제되었습니다.')
      setIsDeleteModalOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '사용자 삭제에 실패했습니다.'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  // 사용자 복구 모달 열기
  const handleRestoreUser = (user: User) => {
    setUserToRestore(user)
    setIsRestoreModalOpen(true)
  }

  // 사용자 복구 확인
  const handleRestoreConfirm = async () => {
    if (!userToRestore) return
    
    try {
      await userAPI.restoreUser(userToRestore.id)
      toast.success('사용자가 복구되었습니다. (상태: 잠금)')
      setIsRestoreModalOpen(false)
      setUserToRestore(null)
      loadUsers()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '사용자 복구에 실패했습니다.'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  // 비밀번호 초기화
  const handleResetPassword = async (userId: number) => {
    if (!confirm('이 사용자의 비밀번호를 초기화하시겠습니까?')) return
    
    try {
      const response = await userAPI.resetPassword(userId)
      toast.success(`임시 비밀번호: ${response.data.temporary_password}`, {
        duration: 10000,
      })
    } catch (err) {
      const errorMsg = '비밀번호 초기화에 실패했습니다.'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  // 계정 상태 토글 (활성화 <-> 잠금)
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'locked' : 'active'
    const statusText = newStatus === 'active' ? '활성화' : '잠금'
    
    try {
      await userAPI.updateUser(user.id, { 
        status: newStatus,
        department: user.department,
        position: user.position,
        phone_number: user.phone_number,
        role_level: user.role_level
      })
      toast.success(`계정이 ${statusText} 상태로 변경되었습니다.`)
      loadUsers()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '계정 상태 변경에 실패했습니다.'
      toast.error(errorMsg)
    }
  }

  // 권한 부족 시
  if (!hasRole(2)) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">접근 권한이 없습니다</h2>
            <p className="text-gray-600 mb-6">
              이 페이지는 관리자 권한이 필요합니다.<br />
              현재 권한: {user?.role_display || '알 수 없음'}
            </p>
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getRoleBadgeVariant = (roleLevel: number) => {
    switch (roleLevel) {
      case 0: return 'guest'
      case 1: return 'practitioner'
      case 2: return 'admin'
      default: return 'default'
    }
  }

  const getRoleLabel = (roleLevel: number) => {
    switch (roleLevel) {
      case 0: return '게스트'
      case 1: return '실무자'
      case 2: return '관리자'
      default: return '알 수 없음'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'locked': return 'warning'
      case 'deleted': return 'default'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성'
      case 'locked': return '잠금'
      case 'deleted': return '삭제됨'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        <Toaster position="top-right" richColors />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">사용자 관리</h1>
                <p className="text-[var(--text-secondary)] mt-1">시스템 사용자를 조회하고 관리하세요</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateUser}>
                  신규 사용자 추가
                </Button>
              </div>
            </div>

        {/* 필터 섹션 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>필터 및 검색</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                placeholder="이름, 아이디, 부서, 직급 검색"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <Select
                placeholder="부서 선택"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                options={[
                  { value: '', label: '전체 부서' },
                  { value: '품질관리부', label: '품질관리부' },
                  { value: '시스템운영팀', label: '시스템운영팀' },
                  { value: '연구소', label: '연구소' },
                ]}
              />
              <Select
                placeholder="직급 선택"
                value={filters.position}
                onChange={(e) => handleFilterChange('position', e.target.value)}
                options={[
                  { value: '', label: '전체 직급' },
                  { value: '사원', label: '사원' },
                  { value: '대리', label: '대리' },
                  { value: '과장', label: '과장' },
                  { value: '팀장', label: '팀장' },
                ]}
              />
              <Select
                placeholder="권한 선택"
                value={filters.role_level}
                onChange={(e) => handleFilterChange('role_level', e.target.value)}
                options={[
                  { value: '', label: '전체 권한' },
                  { value: '0', label: 'Guest' },
                  { value: '1', label: 'Practitioner' },
                  { value: '2', label: 'Admin' },
                ]}
              />
              <Select
                placeholder="상태 선택"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                options={[
                  { value: '', label: '전체 상태' },
                  { value: 'active', label: '활성' },
                  { value: 'locked', label: '잠금' },
                  { value: 'deleted', label: '삭제됨' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 사용자 테이블 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-2 text-[var(--text-secondary)]">로딩 중...</p>
              </div>
            ) : (
              <>
                {users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '60px'}}>ID</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>아이디</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '80px'}}>이름</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>부서</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '80px'}}>직급</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>핸드폰</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '80px'}}>권한</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '80px'}}>상태</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>상태 토글</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>비밀번호</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '140px'}}>관리</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 truncate" style={{maxWidth: '120px'}} title={user.department}>
                              {user.department}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{user.position}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{user.phone_number}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <Badge variant={getRoleBadgeVariant(user.role_level)}>
                                {getRoleLabel(user.role_level)}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <Badge variant={getStatusBadgeVariant(user.status)}>
                                {getStatusLabel(user.status)}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              {user.status !== 'deleted' && (
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors whitespace-nowrap mx-auto"
                                  title={user.status === 'active' ? '잠금으로 변경' : '활성화로 변경'}
                                >
                                  {user.status === 'active' ? (
                                    <>
                                      <ToggleRight className="w-5 h-5 text-green-600" />
                                      <span className="text-xs text-green-600">활성</span>
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                                      <span className="text-xs text-gray-500">잠금</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              {user.status !== 'deleted' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleResetPassword(user.id)}
                                  className="flex items-center gap-1 whitespace-nowrap mx-auto"
                                  title="비밀번호 초기화"
                                >
                                  <Key className="w-4 h-4" />
                                  초기화
                                </Button>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex gap-1 justify-center">
                                {user.status !== 'deleted' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditUser(user)}
                                      className="whitespace-nowrap"
                                    >
                                      수정
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => handleDeleteUser(user)}
                                      className="whitespace-nowrap"
                                    >
                                      삭제
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleRestoreUser(user)}
                                    className="whitespace-nowrap"
                                  >
                                    복구
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-[var(--text-secondary)]">사용자가 없습니다.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 사용자 상세 모달 */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="사용자 상세 정보"
          size="md"
        >
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">아이디</p>
                  <p className="font-medium">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">이름</p>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">부서</p>
                  <p className="font-medium">{selectedUser.department}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">직급</p>
                  <p className="font-medium">{selectedUser.position}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">핸드폰</p>
                  <p className="font-medium">{selectedUser.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">권한</p>
                  <Badge variant={getRoleBadgeVariant(selectedUser.role_level)}>
                    {selectedUser.role_display}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">상태</p>
                  <Badge variant={getStatusBadgeVariant(selectedUser.status)}>
                    {getStatusLabel(selectedUser.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">가입일</p>
                  <p className="font-medium">
                    {new Date(selectedUser.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleEditUser(selectedUser)
                  }}
                >
                  수정
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleResetPassword(selectedUser.id)}
                >
                  비밀번호 초기화
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* 사용자 수정 모달 */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="사용자 정보 수정"
          size="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="아이디"
              value={userFormData.username}
              disabled
              helper="아이디는 수정할 수 없습니다"
            />
            
            <Input
              label="이름"
              name="name"
              value={userFormData.name}
              onChange={handleFormChange}
              error={formErrors.name}
              required
            />
            
            <Input
              label="부서"
              name="department"
              value={userFormData.department}
              onChange={handleFormChange}
              error={formErrors.department}
              required
            />
            
            <Input
              label="직급"
              name="position"
              value={userFormData.position}
              onChange={handleFormChange}
              error={formErrors.position}
              required
            />
            
            <Input
              label="핸드폰 번호"
              name="phone_number"
              value={userFormData.phone_number}
              onChange={handleFormChange}
              error={formErrors.phone_number}
              required
            />
            
            <Select
              label="권한 레벨"
              name="role_level"
              value={userFormData.role_level.toString()}
              onChange={handleFormChange}
              error={formErrors.role_level}
              required
              options={[
                { value: '0', label: 'Guest (게스트)' },
                { value: '1', label: 'Practitioner (실무자)' },
                { value: '2', label: 'Admin (관리자)' },
              ]}
            />
            
            <Select
              label="계정 상태"
              name="status"
              value={userFormData.status}
              onChange={handleFormChange}
              error={formErrors.status}
              required
              options={[
                { value: 'active', label: '활성' },
                { value: 'locked', label: '잠금' },
                { value: 'deleted', label: '삭제됨' },
              ]}
            />

            {formErrors.submit && (
              <p className="text-sm text-[var(--danger)]">{formErrors.submit}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" loading={formLoading}>
                수정
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
              >
                취소
              </Button>
            </div>
          </form>
        </Modal>

        {/* 사용자 생성 모달 */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="신규 사용자 추가"
          size="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="아이디"
                name="username"
                value={userFormData.username}
                onChange={handleFormChange}
                error={formErrors.username}
                required
              />
              
              <Input
                label="이름"
                name="name"
                value={userFormData.name}
                onChange={handleFormChange}
                error={formErrors.name}
                required
              />
              
              <Input
                label="비밀번호"
                name="password"
                type="password"
                value={userFormData.password}
                onChange={handleFormChange}
                error={formErrors.password}
                required
              />
              
              <Input
                label="비밀번호 확인"
                name="password_confirm"
                type="password"
                value={userFormData.password_confirm}
                onChange={handleFormChange}
                error={formErrors.password_confirm}
                required
              />
              
              <Input
                label="부서"
                name="department"
                value={userFormData.department}
                onChange={handleFormChange}
                error={formErrors.department}
                required
              />
              
              <Input
                label="직급"
                name="position"
                value={userFormData.position}
                onChange={handleFormChange}
                error={formErrors.position}
                required
              />
              
              <Input
                label="핸드폰 번호"
                name="phone_number"
                value={userFormData.phone_number}
                onChange={handleFormChange}
                error={formErrors.phone_number}
                required
              />
              
              <Select
                label="권한 레벨"
                name="role_level"
                value={userFormData.role_level.toString()}
                onChange={handleFormChange}
                error={formErrors.role_level}
                required
                options={[
                  { value: '0', label: 'Guest (게스트)' },
                  { value: '1', label: 'Practitioner (실무자)' },
                  { value: '2', label: 'Admin (관리자)' },
                ]}
              />
            </div>

            {formErrors.submit && (
              <p className="text-sm text-[var(--danger)]">{formErrors.submit}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" loading={formLoading}>
                생성
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                취소
              </Button>
            </div>
          </form>
        </Modal>

        {/* 사용자 삭제 확인 모달 */}
        {isDeleteModalOpen && userToDelete && (
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
                    정말로 이 사용자를 삭제하시겠습니까?
                  </h3>
                  <p className="text-sm text-gray-600">
                    삭제된 사용자는 복구 기능을 통해 복원할 수 있습니다.
                  </p>
                </div>

                {/* 사용자 정보 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">아이디</span>
                      <span className="text-sm font-semibold text-gray-900">{userToDelete.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">이름</span>
                      <span className="text-sm text-gray-900">{userToDelete.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">부서</span>
                      <span className="text-sm text-gray-900">{userToDelete.department}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">직급</span>
                      <span className="text-sm text-gray-900">{userToDelete.position}</span>
                    </div>
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDeleteModalOpen(false)
                      setUserToDelete(null)
                    }}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteConfirm}
                    className="flex-1"
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 사용자 복구 확인 모달 */}
        {isRestoreModalOpen && userToRestore && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="space-y-6">
                {/* 정보 아이콘 */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* 메시지 */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    이 사용자를 복구하시겠습니까?
                  </h3>
                  <p className="text-sm text-gray-600">
                    복구 후 계정 상태는 "잠금"으로 설정됩니다.
                  </p>
                </div>

                {/* 사용자 정보 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">아이디</span>
                      <span className="text-sm font-semibold text-gray-900">{userToRestore.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">이름</span>
                      <span className="text-sm text-gray-900">{userToRestore.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">부서</span>
                      <span className="text-sm text-gray-900">{userToRestore.department}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">직급</span>
                      <span className="text-sm text-gray-900">{userToRestore.position}</span>
                    </div>
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsRestoreModalOpen(false)
                      setUserToRestore(null)
                    }}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleRestoreConfirm}
                    className="flex-1"
                  >
                    복구
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  )
}
