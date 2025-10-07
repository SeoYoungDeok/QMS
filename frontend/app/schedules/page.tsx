'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Schedule, ScheduleListParams, ScheduleCreateRequest, ScheduleCategory, ScheduleUser, scheduleAPI } from '@/lib/api'
import Calendar from '@/components/ui/Calendar'
import ScheduleDetailModal from '@/components/ui/ScheduleDetailModal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Sidebar from '@/components/ui/Sidebar'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast, Toaster } from 'sonner'
import { AlertTriangle, Search } from 'lucide-react'

type TabType = 'calendar' | 'quality' | 'personal' | 'list'

export default function SchedulesPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('calendar')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  // 모달 상태
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
  
  // 등록 폼 상태
  const [qualityForm, setQualityForm] = useState<ScheduleCreateRequest>({
    type: 'quality',
    category: '',
    title: '',
    description: '',
    importance: 'medium',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    participants: []
  })

  const [personalForm, setPersonalForm] = useState<ScheduleCreateRequest>({
    type: 'personal',
    category: '',
    title: '',
    description: '',
    importance: 'medium',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    participants: []
  })

  // 카테고리 및 사용자 데이터
  const [categories, setCategories] = useState<{quality: ScheduleCategory[], personal: ScheduleCategory[]}>({
    quality: [],
    personal: []
  })
  const [users, setUsers] = useState<ScheduleUser[]>([])
  
  // 필터 상태 (검색 입력용과 실제 적용용 분리)
  const [searchInput, setSearchInput] = useState({
    date_from: '',
    date_to: '',
    type: '',
    importance: '',
    search: ''
  })

  const [filters, setFilters] = useState<ScheduleListParams>({
    date_from: undefined,
    date_to: undefined,
    type: undefined,
    importance: undefined,
    search: undefined,
    ordering: '-start_date'
  })

  // 초기 데이터 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadSchedules()
      loadReferenceData()
    }
  }, [isAuthenticated, filters])

  const loadReferenceData = async () => {
    try {
      const [categoriesRes, usersRes] = await Promise.all([
        scheduleAPI.getCategories(),
        scheduleAPI.getUsers()
      ])
      
      if (categoriesRes.data.ok) {
        setCategories(categoriesRes.data.data)
      } else {
        setCategories({
          quality: [
            { code: 'outgoing_inspection', name: '출하검사' },
            { code: 'incoming_inspection', name: '수입검사' },
            { code: 'product_shipment', name: '제품출하' },
            { code: 'audit', name: '감사' },
            { code: 'other_quality', name: '기타 품질업무' }
          ],
          personal: [
            { code: 'meeting', name: '회의' },
            { code: 'training', name: '교육' },
            { code: 'vacation', name: '휴가' },
            { code: 'business_trip', name: '출장' },
            { code: 'other_personal', name: '기타 개인업무' }
          ]
        })
      }
      
      if (usersRes.data.ok) {
        setUsers(usersRes.data.data)
      }
    } catch (error) {
      console.error('참조 데이터 로드 실패:', error)
    }
  }

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await scheduleAPI.getSchedules(filters)
      setSchedules(response.data.results || [])
    } catch (error: any) {
      console.error('일정 목록 조회 실패:', error)
      toast.error('일정 목록을 불러오는데 실패했습니다')
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  // 검색 실행
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    setFilters({
      date_from: searchInput.date_from || undefined,
      date_to: searchInput.date_to || undefined,
      type: (searchInput.type as 'quality' | 'personal' | '') || undefined,
      importance: (searchInput.importance as 'low' | 'medium' | 'high' | '') || undefined,
      search: searchInput.search || undefined,
      ordering: '-start_date'
    })
  }

  // 검색 초기화
  const clearFilters = () => {
    setSearchInput({
      date_from: '',
      date_to: '',
      type: '',
      importance: '',
      search: ''
    })
    setFilters({
      date_from: undefined,
      date_to: undefined,
      type: undefined,
      importance: undefined,
      search: undefined,
      ordering: '-start_date'
    })
    toast.info('필터가 초기화되었습니다')
  }

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowDetailModal(true)
  }

  const handleScheduleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowDetailModal(false)
    toast.info('편집 기능은 준비 중입니다')
  }

  const handleDeleteClick = (schedule: Schedule) => {
    setDeleteTarget(schedule)
    setShowDeleteModal(true)
    setShowDetailModal(false)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      setLoading(true)
      await scheduleAPI.deleteSchedule(deleteTarget.id)
      setSchedules(prev => prev.filter(s => s.id !== deleteTarget.id))
      toast.success('일정이 삭제되었습니다')
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error: any) {
      console.error('일정 삭제 실패:', error)
      toast.error('일정 삭제에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleQualitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const submitData: ScheduleCreateRequest = {
        ...qualityForm,
        end_date: qualityForm.end_date || undefined,
        start_time: qualityForm.start_time || undefined,
        end_time: qualityForm.end_time || undefined,
        location: qualityForm.location || undefined,
        description: qualityForm.description || undefined,
        participants: qualityForm.participants || []
      }
      
      await scheduleAPI.createSchedule(submitData)
      toast.success('품질 일정이 등록되었습니다')
      
      setQualityForm({
        type: 'quality',
        category: '',
        title: '',
        description: '',
        importance: 'medium',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        start_time: '',
        end_time: '',
        location: '',
        participants: []
      })
      
      loadSchedules()
    } catch (error: any) {
      console.error('품질 일정 등록 실패:', error)
      const errorMessage = error.response?.data?.message || error.response?.data?.details || '품질 일정 등록에 실패했습니다'
      toast.error(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const submitData: ScheduleCreateRequest = {
        ...personalForm,
        end_date: personalForm.end_date || undefined,
        start_time: personalForm.start_time || undefined,
        end_time: personalForm.end_time || undefined,
        location: personalForm.location || undefined,
        description: personalForm.description || undefined,
        participants: personalForm.participants || []
      }
      
      await scheduleAPI.createSchedule(submitData)
      toast.success('개인 일정이 등록되었습니다')
      
      setPersonalForm({
        type: 'personal',
        category: '',
        title: '',
        description: '',
        importance: 'medium',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        start_time: '',
        end_time: '',
        location: '',
        participants: []
      })
      
      loadSchedules()
    } catch (error: any) {
      console.error('개인 일정 등록 실패:', error)
      const errorMessage = error.response?.data?.message || error.response?.data?.details || '개인 일정 등록에 실패했습니다'
      toast.error(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const canCreateSchedule = user && user.role_level >= 1
  const canEditSchedule = (schedule: Schedule) => {
    return user && (user.role_level >= 2 || schedule.owner === user.id)
  }
  const canDeleteSchedule = (schedule: Schedule) => {
    return user && (user.role_level >= 2 || schedule.owner === user.id)
  }

  // 리스트 뷰 렌더링
  const renderListView = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (schedules.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">일정이 없습니다.</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {schedules.map(schedule => (
          <div
            key={schedule.id}
            className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleScheduleClick(schedule)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{schedule.title}</h3>
                  <Badge 
                    variant={
                      schedule.importance === 'high' ? 'danger' : 
                      schedule.importance === 'medium' ? 'warning' : 
                      'success'
                    }
                  >
                    {schedule.importance_display}
                  </Badge>
                  <Badge variant={schedule.type === 'quality' ? 'primary' : 'secondary'}>
                    {schedule.type_display}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">카테고리:</span> {schedule.category_display}
                  </div>
                  <div>
                    <span className="font-medium">일시:</span> {' '}
                    {new Date(schedule.start_date).toLocaleDateString('ko-KR')}
                    {schedule.end_date && schedule.end_date !== schedule.start_date && (
                      ` ~ ${new Date(schedule.end_date).toLocaleDateString('ko-KR')}`
                    )}
                    {schedule.start_time && schedule.end_time ? (
                      ` ${schedule.start_time} ~ ${schedule.end_time}`
                    ) : schedule.start_time ? (
                      ` ${schedule.start_time}`
                    ) : (
                      ' (종일)'
                    )}
                  </div>
                  {schedule.location && (
                    <div>
                      <span className="font-medium">장소:</span> {schedule.location}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">작성자:</span> {schedule.owner_name}
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                {new Date(schedule.created_at).toLocaleDateString('ko-KR')}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 검색 필터 UI
  const renderSearchFilters = () => (
    <form onSubmit={handleSearch} className="mb-6 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="space-y-4">
        {/* 기간 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">기간</label>
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={searchInput.date_from}
              onChange={(e) => setSearchInput({...searchInput, date_from: e.target.value})}
              className="w-48"
              placeholder="시작일"
            />
            <span className="text-gray-500">~</span>
            <Input
              type="date"
              value={searchInput.date_to}
              onChange={(e) => setSearchInput({...searchInput, date_to: e.target.value})}
              className="w-48"
              placeholder="종료일"
            />
          </div>
        </div>

        {/* 유형과 중요도 - 같은 줄 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 유형 - 배지 라디오 버튼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">유형</label>
            <div className="flex flex-wrap gap-2">
              <label
                className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchInput.type === ''
                    ? 'bg-gray-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="search-type"
                  value=""
                  checked={searchInput.type === ''}
                  onChange={(e) => setSearchInput({...searchInput, type: e.target.value})}
                  className="sr-only"
                />
                전체
              </label>
              <label
                className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchInput.type === 'quality'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="search-type"
                  value="quality"
                  checked={searchInput.type === 'quality'}
                  onChange={(e) => setSearchInput({...searchInput, type: e.target.value})}
                  className="sr-only"
                />
                품질 일정
              </label>
              <label
                className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchInput.type === 'personal'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="search-type"
                  value="personal"
                  checked={searchInput.type === 'personal'}
                  onChange={(e) => setSearchInput({...searchInput, type: e.target.value})}
                  className="sr-only"
                />
                개인 일정
              </label>
            </div>
          </div>

          {/* 중요도 - 배지 라디오 버튼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">중요도</label>
            <div className="flex flex-wrap gap-2">
              <label
                className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchInput.importance === ''
                    ? 'bg-gray-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="search-importance"
                  value=""
                  checked={searchInput.importance === ''}
                  onChange={(e) => setSearchInput({...searchInput, importance: e.target.value})}
                  className="sr-only"
                />
                전체
              </label>
              <label
                className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchInput.importance === 'low'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="search-importance"
                  value="low"
                  checked={searchInput.importance === 'low'}
                  onChange={(e) => setSearchInput({...searchInput, importance: e.target.value})}
                  className="sr-only"
                />
                낮음
              </label>
              <label
                className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchInput.importance === 'medium'
                    ? 'bg-yellow-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="search-importance"
                  value="medium"
                  checked={searchInput.importance === 'medium'}
                  onChange={(e) => setSearchInput({...searchInput, importance: e.target.value})}
                  className="sr-only"
                />
                보통
              </label>
              <label
                className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchInput.importance === 'high'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="search-importance"
                  value="high"
                  checked={searchInput.importance === 'high'}
                  onChange={(e) => setSearchInput({...searchInput, importance: e.target.value})}
                  className="sr-only"
                />
                높음
              </label>
            </div>
          </div>
        </div>

        {/* 검색어와 버튼 - 같은 줄 */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">검색어</label>
            <Input
              value={searchInput.search}
              onChange={(e) => setSearchInput({...searchInput, search: e.target.value})}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
              placeholder="제목, 설명, 장소 검색"
              className="w-full"
            />
          </div>
          <Button type="button" variant="outline" onClick={clearFilters} disabled={loading}>
            초기화
          </Button>
          <Button type="submit" disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            검색
          </Button>
        </div>
      </div>
    </form>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      <Toaster position="top-right" richColors />
      <Sidebar />
      
      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">일정 관리</h1>
              <p className="text-[var(--text-secondary)] mt-1">품질 일정과 개인 일정을 관리하세요</p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              달력
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'quality'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              품질 일정 등록
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              개인 일정 등록
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              목록
            </button>
          </div>

          {/* 달력 탭 */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              {renderSearchFilters()}

              <Card>
                <CardContent className="pt-6">
                  <Calendar
                    schedules={schedules}
                    selectedDate={selectedDate}
                    onDateSelect={(date) => setSelectedDate(date)}
                    onScheduleClick={handleScheduleClick}
                    view="month"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* 품질 일정 등록 탭 */}
          {activeTab === 'quality' && (
            <Card>
              <CardHeader>
                <CardTitle>품질 일정 등록</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQualitySubmit} className="space-y-6">
                  {/* 카테고리 - 배지 라디오 버튼 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      카테고리 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.quality.map(cat => (
                        <label
                          key={cat.code}
                          className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            qualityForm.category === cat.code
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="quality-category"
                            value={cat.code}
                            checked={qualityForm.category === cat.code}
                            onChange={(e) => setQualityForm({...qualityForm, category: e.target.value})}
                            className="sr-only"
                            required
                          />
                          {cat.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 중요도 - 배지 라디오 버튼 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      중요도 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          qualityForm.importance === 'low'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quality-importance"
                          value="low"
                          checked={qualityForm.importance === 'low'}
                          onChange={(e) => setQualityForm({...qualityForm, importance: e.target.value as 'low' | 'medium' | 'high'})}
                          className="sr-only"
                        />
                        낮음
                      </label>
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          qualityForm.importance === 'medium'
                            ? 'bg-yellow-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quality-importance"
                          value="medium"
                          checked={qualityForm.importance === 'medium'}
                          onChange={(e) => setQualityForm({...qualityForm, importance: e.target.value as 'low' | 'medium' | 'high'})}
                          className="sr-only"
                        />
                        보통
                      </label>
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          qualityForm.importance === 'high'
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quality-importance"
                          value="high"
                          checked={qualityForm.importance === 'high'}
                          onChange={(e) => setQualityForm({...qualityForm, importance: e.target.value as 'low' | 'medium' | 'high'})}
                          className="sr-only"
                        />
                        높음
                      </label>
                    </div>
                  </div>

                  <Input
                    label="일정 제목"
                    required
                    value={qualityForm.title}
                    onChange={(e) => setQualityForm({...qualityForm, title: e.target.value})}
                    placeholder="일정 제목을 입력하세요"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="시작일"
                      type="date"
                      required
                      value={qualityForm.start_date}
                      onChange={(e) => setQualityForm({...qualityForm, start_date: e.target.value})}
                    />
                    <Input
                      label="종료일"
                      type="date"
                      value={qualityForm.end_date}
                      onChange={(e) => setQualityForm({...qualityForm, end_date: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="시작 시간"
                      type="time"
                      value={qualityForm.start_time}
                      onChange={(e) => setQualityForm({...qualityForm, start_time: e.target.value})}
                    />
                    <Input
                      label="종료 시간"
                      type="time"
                      value={qualityForm.end_time}
                      onChange={(e) => setQualityForm({...qualityForm, end_time: e.target.value})}
                    />
                  </div>

                  <Input
                    label="장소"
                    value={qualityForm.location}
                    onChange={(e) => setQualityForm({...qualityForm, location: e.target.value})}
                    placeholder="장소를 입력하세요"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
                    <textarea
                      value={qualityForm.description}
                      onChange={(e) => setQualityForm({...qualityForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="상세 설명을 입력하세요"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading || !canCreateSchedule}>
                      {loading ? '등록 중...' : '품질 일정 등록'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 개인 일정 등록 탭 */}
          {activeTab === 'personal' && (
            <Card>
              <CardHeader>
                <CardTitle>개인 일정 등록</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePersonalSubmit} className="space-y-6">
                  {/* 카테고리 - 배지 라디오 버튼 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      카테고리 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.personal.map(cat => (
                        <label
                          key={cat.code}
                          className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            personalForm.category === cat.code
                              ? 'bg-purple-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="personal-category"
                            value={cat.code}
                            checked={personalForm.category === cat.code}
                            onChange={(e) => setPersonalForm({...personalForm, category: e.target.value})}
                            className="sr-only"
                            required
                          />
                          {cat.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 중요도 - 배지 라디오 버튼 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      중요도 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          personalForm.importance === 'low'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="personal-importance"
                          value="low"
                          checked={personalForm.importance === 'low'}
                          onChange={(e) => setPersonalForm({...personalForm, importance: e.target.value as 'low' | 'medium' | 'high'})}
                          className="sr-only"
                        />
                        낮음
                      </label>
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          personalForm.importance === 'medium'
                            ? 'bg-yellow-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="personal-importance"
                          value="medium"
                          checked={personalForm.importance === 'medium'}
                          onChange={(e) => setPersonalForm({...personalForm, importance: e.target.value as 'low' | 'medium' | 'high'})}
                          className="sr-only"
                        />
                        보통
                      </label>
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          personalForm.importance === 'high'
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="personal-importance"
                          value="high"
                          checked={personalForm.importance === 'high'}
                          onChange={(e) => setPersonalForm({...personalForm, importance: e.target.value as 'low' | 'medium' | 'high'})}
                          className="sr-only"
                        />
                        높음
                      </label>
                    </div>
                  </div>

                  <Input
                    label="일정 제목"
                    required
                    value={personalForm.title}
                    onChange={(e) => setPersonalForm({...personalForm, title: e.target.value})}
                    placeholder="일정 제목을 입력하세요"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="시작일"
                      type="date"
                      required
                      value={personalForm.start_date}
                      onChange={(e) => setPersonalForm({...personalForm, start_date: e.target.value})}
                    />
                    <Input
                      label="종료일"
                      type="date"
                      value={personalForm.end_date}
                      onChange={(e) => setPersonalForm({...personalForm, end_date: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="시작 시간"
                      type="time"
                      value={personalForm.start_time}
                      onChange={(e) => setPersonalForm({...personalForm, start_time: e.target.value})}
                    />
                    <Input
                      label="종료 시간"
                      type="time"
                      value={personalForm.end_time}
                      onChange={(e) => setPersonalForm({...personalForm, end_time: e.target.value})}
                    />
                  </div>

                  <Input
                    label="장소"
                    value={personalForm.location}
                    onChange={(e) => setPersonalForm({...personalForm, location: e.target.value})}
                    placeholder="장소를 입력하세요"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
                    <textarea
                      value={personalForm.description}
                      onChange={(e) => setPersonalForm({...personalForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="상세 설명을 입력하세요"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading || !canCreateSchedule}>
                      {loading ? '등록 중...' : '개인 일정 등록'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 목록 탭 */}
          {activeTab === 'list' && (
            <Card>
              <CardHeader>
                <CardTitle>일정 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {renderSearchFilters()}
                {renderListView()}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* 상세 모달 */}
      <ScheduleDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        schedule={selectedSchedule}
        onEdit={handleScheduleEdit}
        onDelete={handleDeleteClick}
        canEdit={selectedSchedule ? (canEditSchedule(selectedSchedule) || false) : false}
        canDelete={selectedSchedule ? (canDeleteSchedule(selectedSchedule) || false) : false}
      />

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteTarget(null)
        }}
        title="일정 삭제"
        size="md"
      >
        {deleteTarget && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900 mb-1">
                  정말로 이 일정을 삭제하시겠습니까?
                </h4>
                <p className="text-sm text-red-700">
                  삭제된 일정은 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">삭제할 일정 정보</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">제목</span>
                  <span className="text-sm font-semibold text-gray-900">{deleteTarget.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">유형</span>
                  <Badge variant={deleteTarget.type === 'quality' ? 'primary' : 'secondary'}>
                    {deleteTarget.type_display}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">카테고리</span>
                  <span className="text-sm text-gray-900">{deleteTarget.category_display}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">시작일</span>
                  <span className="text-sm text-gray-900">
                    {new Date(deleteTarget.start_date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">중요도</span>
                  <Badge 
                    variant={
                      deleteTarget.importance === 'high' ? 'danger' : 
                      deleteTarget.importance === 'medium' ? 'warning' : 
                      'success'
                    }
                  >
                    {deleteTarget.importance_display}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteTarget(null)
                }}
                disabled={loading}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="flex-1"
              >
                {loading ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
