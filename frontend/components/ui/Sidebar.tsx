'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import Modal from './Modal'
import AlertModal from './AlertModal'
import Input from './Input'
import Button from './Button'
import { userAPI } from '@/lib/api'
import { toast, Toaster } from 'sonner'

interface MenuItem {
  id: string
  name: string
  icon: React.ReactNode
  path: string
  minRole: number
}

export default function Sidebar() {
  const { user, logout, setUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'profile' | 'password'>('profile')
  const [profileFormData, setProfileFormData] = useState({
    department: '',
    position: '',
    phone_number: ''
  })
  const [passwordFormData, setPasswordFormData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: ''
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [formLoading, setFormLoading] = useState(false)
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    type?: 'info' | 'warning' | 'error' | 'success'
  }>({ isOpen: false, message: '' })

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      name: '대시보드',
      path: '/',
      minRole: 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'performance',
      name: '실적 관리',
      path: '/performance',
      minRole: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'nonconformance',
      name: '부적합 관리 (NCR)',
      path: '/nonconformance',
      minRole: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: 'customer-complaints',
      name: '고객 불만 (CCR)',
      path: '/customer-complaints',
      minRole: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      id: 'schedules',
      name: '일정 관리',
      path: '/schedules',
      minRole: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'kpi-targets',
      name: 'KPI 목표 관리',
      path: '/kpi-targets',
      minRole: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      id: 'data-download',
      name: '데이터 다운로드',
      path: '/data-download',
      minRole: 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
    {
      id: 'sticky-notes',
      name: '포스트잇 보드',
      path: '/sticky-notes',
      minRole: 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'users',
      name: '사용자 관리',
      path: '/admin/users',
      minRole: 2,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'audit-logs',
      name: '감사 로그',
      path: '/audit-logs',
      minRole: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  const handleMenuClick = (item: MenuItem) => {
    if (!user) return

    if (user.role_level < item.minRole) {
      setAlertModal({
        isOpen: true,
        message: `${item.name} 기능은 권한이 필요합니다.`,
        type: 'warning'
      })
      return
    }

    router.push(item.path)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const getRoleLabel = (roleLevel: number) => {
    switch (roleLevel) {
      case 0: return '게스트'
      case 1: return '실무자'
      case 2: return '관리자'
      default: return '알 수 없음'
    }
  }

  const handleOpenProfileModal = () => {
    if (!user) return
    setProfileFormData({
      department: user.department,
      position: user.position,
      phone_number: user.phone_number
    })
    setPasswordFormData({
      old_password: '',
      new_password: '',
      new_password_confirm: ''
    })
    setFormErrors({})
    setModalTab('profile')
    setIsProfileModalOpen(true)
  }

  const handleProfileFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setFormLoading(true)
    
    try {
      const updateData = {
        department: profileFormData.department,
        position: profileFormData.position,
        phone_number: profileFormData.phone_number,
        role_level: user.role_level,
        status: user.status
      }
      
      await userAPI.updateUser(user.id, updateData)
      
      // 사용자 정보 다시 조회
      const response = await userAPI.getUser(user.id)
      setUser(response.data)
      
      setIsProfileModalOpen(false)
      toast.success('프로필이 수정되었습니다.')
    } catch (err: any) {
      if (err.response?.data) {
        setFormErrors(err.response.data)
        toast.error('프로필 수정에 실패했습니다. 입력 내용을 확인해주세요.')
      } else {
        const errorMsg = '프로필 수정에 실패했습니다.'
        setFormErrors({ submit: errorMsg })
        toast.error(errorMsg)
      }
    } finally {
      setFormLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setFormLoading(true)
    setFormErrors({})
    
    try {
      await userAPI.changePassword(passwordFormData)
      
      setPasswordFormData({
        old_password: '',
        new_password: '',
        new_password_confirm: ''
      })
      setIsProfileModalOpen(false)
      toast.success('비밀번호가 변경되었습니다.')
    } catch (err: any) {
      if (err.response?.data) {
        setFormErrors(err.response.data)
        toast.error('비밀번호 변경에 실패했습니다. 입력 내용을 확인해주세요.')
      } else {
        const errorMsg = '비밀번호 변경에 실패했습니다.'
        setFormErrors({ submit: errorMsg })
        toast.error(errorMsg)
      }
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <>
      {/* 모바일 토글 버튼 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[var(--accent-primary)] text-white p-2 rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
      </button>

      {/* 사이드바 */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
          isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-64'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">QMS</h1>
                  <p className="text-xs text-[var(--text-secondary)]">Quality Management System</p>
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* 사용자 정보 */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={handleOpenProfileModal}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} hover:bg-gray-50 rounded-lg p-2 transition-colors`}
                title={isCollapsed ? '프로필 수정' : ''}
              >
                <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {user.name.charAt(0)}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">{user.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{getRoleLabel(user.role_level)}</p>
                  </div>
                )}
                {!isCollapsed && (
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* 메뉴 항목 */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => {
                const hasAccess = user && user.role_level >= item.minRole
                const active = isActive(item.path)

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleMenuClick(item)}
                      disabled={!hasAccess}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                        active
                          ? 'bg-[var(--accent-primary)] text-white'
                          : hasAccess
                          ? 'text-[var(--text-primary)] hover:bg-gray-100'
                          : 'text-gray-400 cursor-not-allowed opacity-50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? item.name : ''}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!isCollapsed && (
                        <span className="text-sm font-medium truncate">{item.name}</span>
                      )}
                      {!isCollapsed && !hasAccess && (
                        <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* 로그아웃 버튼 */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={isCollapsed ? '로그아웃' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!isCollapsed && <span className="text-sm font-medium">로그아웃</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Toast 알림 */}
      <Toaster position="top-right" richColors />

      {/* 경고 모달 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* 프로필 수정 모달 */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="프로필 수정"
        size="md"
      >
        {/* 탭 헤더 */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setModalTab('profile')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              modalTab === 'profile'
                ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            정보 수정
          </button>
          <button
            type="button"
            onClick={() => setModalTab('password')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              modalTab === 'password'
                ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            비밀번호 변경
          </button>
        </div>

        {/* 프로필 수정 탭 */}
        {modalTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Input
              label="이름"
              value={user?.name || ''}
              disabled
              helper="이름은 수정할 수 없습니다"
            />

            <Input
              label="부서"
              name="department"
              value={profileFormData.department}
              onChange={handleProfileFormChange}
              error={formErrors.department}
              required
            />

            <Input
              label="직급"
              name="position"
              value={profileFormData.position}
              onChange={handleProfileFormChange}
              error={formErrors.position}
              required
            />

            <Input
              label="핸드폰 번호"
              name="phone_number"
              value={profileFormData.phone_number}
              onChange={handleProfileFormChange}
              error={formErrors.phone_number}
              required
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
                onClick={() => setIsProfileModalOpen(false)}
              >
                취소
              </Button>
            </div>
          </form>
        )}

        {/* 비밀번호 변경 탭 */}
        {modalTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="현재 비밀번호"
              name="old_password"
              type="password"
              value={passwordFormData.old_password}
              onChange={handlePasswordFormChange}
              error={formErrors.old_password}
              required
            />

            <Input
              label="새 비밀번호"
              name="new_password"
              type="password"
              value={passwordFormData.new_password}
              onChange={handlePasswordFormChange}
              error={formErrors.new_password}
              helper="최소 8자, 영문/숫자/특수문자 포함"
              required
            />

            <Input
              label="새 비밀번호 확인"
              name="new_password_confirm"
              type="password"
              value={passwordFormData.new_password_confirm}
              onChange={handlePasswordFormChange}
              error={formErrors.new_password_confirm}
              required
            />

            {formErrors.submit && (
              <p className="text-sm text-[var(--danger)]">{formErrors.submit}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" loading={formLoading}>
                변경
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsProfileModalOpen(false)}
              >
                취소
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

