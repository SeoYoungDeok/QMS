'use client'

import React, { useState, useEffect } from 'react'
import { Schedule, ScheduleCreateRequest, ScheduleCategory, ScheduleUser, scheduleAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'
import Select from './Select'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (schedule: Schedule) => void
  schedule?: Schedule | null
  initialDate?: string
  initialType?: 'quality' | 'personal'
}

export default function ScheduleModal({
  isOpen,
  onClose,
  onSave,
  schedule,
  initialDate,
  initialType = 'quality'
}: ScheduleModalProps) {
  const { isAuthenticated } = useAuth()
  const [formData, setFormData] = useState<ScheduleCreateRequest>({
    type: initialType,
    category: '',
    title: '',
    description: '',
    importance: 'medium',
    start_date: initialDate || new Date().toISOString().split('T')[0],
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    participants: []
  })
  
  const [categories, setCategories] = useState<{quality: ScheduleCategory[], personal: ScheduleCategory[]}>({
    quality: [],
    personal: []
  })
  const [users, setUsers] = useState<ScheduleUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 초기 데이터 로드
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadReferenceData()
      
      if (schedule) {
        // 수정 모드: 기존 데이터로 폼 초기화
        setFormData({
          type: schedule.type,
          category: schedule.category,
          title: schedule.title,
          description: schedule.description || '',
          importance: schedule.importance,
          start_date: schedule.start_date,
          end_date: schedule.end_date || '',
          start_time: schedule.start_time || '',
          end_time: schedule.end_time || '',
          location: schedule.location || '',
          participants: schedule.participants || []
        })
      } else {
        // 등록 모드: 초기값으로 리셋
        setFormData({
          type: initialType,
          category: '',
          title: '',
          description: '',
          importance: 'medium',
          start_date: initialDate || new Date().toISOString().split('T')[0],
          end_date: '',
          start_time: '',
          end_time: '',
          location: '',
          participants: []
        })
      }
      setError('')
    }
  }, [isOpen, isAuthenticated, schedule, initialDate, initialType])

  const loadReferenceData = async () => {
    try {
      const [categoriesRes, usersRes] = await Promise.all([
        scheduleAPI.getCategories(),
        scheduleAPI.getUsers()
      ])
      
      if (categoriesRes.data.ok) {
        setCategories(categoriesRes.data.data)
      } else {
        // 기본 카테고리 설정 (API 호출 실패 시)
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
    } catch (err) {
      console.error('참조 데이터 로드 실패:', err)
      // 에러 발생 시 기본 카테고리 설정
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
  }

  const handleInputChange = (field: keyof ScheduleCreateRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 타입 변경 시 카테고리 초기화
    if (field === 'type') {
      setFormData(prev => ({
        ...prev,
        category: ''
      }))
    }
  }

  const handleParticipantToggle = (userId: number) => {
    const currentParticipants = formData.participants || []
    const newParticipants = currentParticipants.includes(userId)
      ? currentParticipants.filter(id => id !== userId)
      : [...currentParticipants, userId]
    
    setFormData(prev => ({
      ...prev,
      participants: newParticipants
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return '일정 제목을 입력해주세요.'
    }
    if (!formData.category) {
      return '카테고리를 선택해주세요.'
    }
    if (!formData.start_date) {
      return '시작 날짜를 입력해주세요.'
    }
    
    // 날짜 범위 검증
    if (formData.end_date && formData.start_date > formData.end_date) {
      return '종료 날짜는 시작 날짜보다 이전일 수 없습니다.'
    }
    
    // 시간 범위 검증
    if (formData.start_time && formData.end_time && 
        formData.start_date === formData.end_date &&
        formData.start_time >= formData.end_time) {
      return '종료 시간은 시작 시간보다 늦어야 합니다.'
    }
    
    // end_time만 입력된 경우
    if (formData.end_time && !formData.start_time) {
      return '종료 시간만 입력할 수 없습니다. 시작 시간을 먼저 입력해주세요.'
    }
    
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      // 빈 문자열을 undefined로 변환하고 순수한 JSON 객체 생성
      const submitData: any = {
        type: formData.type,
        category: formData.category,
        title: formData.title.trim(),
        importance: formData.importance,
        start_date: formData.start_date
      }
      
      // 선택적 필드들은 값이 있을 때만 포함
      if (formData.description?.trim()) {
        submitData.description = formData.description.trim()
      }
      if (formData.end_date?.trim()) {
        submitData.end_date = formData.end_date.trim()
      }
      if (formData.start_time?.trim()) {
        submitData.start_time = formData.start_time.trim()
      }
      if (formData.end_time?.trim()) {
        submitData.end_time = formData.end_time.trim()
      }
      if (formData.location?.trim()) {
        submitData.location = formData.location.trim()
      }
      if (formData.participants?.length) {
        submitData.participants = [...formData.participants]
      }
      

      let response
      if (schedule) {
        // 수정
        response = await scheduleAPI.updateSchedule(schedule.id, submitData)
        if (response.data.ok) {
          onSave(response.data.data)
          onClose()
        }
      } else {
        // 등록
        response = await scheduleAPI.createSchedule(submitData)
        if (response.data.ok) {
          // 등록 후 상세 정보를 가져와서 onSave 호출
          const detailResponse = await scheduleAPI.getSchedule(response.data.data.id)
          onSave(detailResponse.data)
          onClose()
        }
      }
    } catch (err: any) {
      console.error('일정 저장 실패:', err)
      
      let errorMessage = '일정 저장에 실패했습니다.'
      if (err.response?.data?.details) {
        // 백엔드 유효성 검증 에러 처리
        const details = err.response.data.details
        const errorMessages = []
        for (const [field, errors] of Object.entries(details)) {
          if (Array.isArray(errors)) {
            errorMessages.push(`${field}: ${errors.join(', ')}`)
          } else {
            errorMessages.push(`${field}: ${errors}`)
          }
        }
        errorMessage = errorMessages.join('\n')
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const currentCategories = categories[formData.type] || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={schedule ? '일정 수정' : '일정 등록'}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              일정 유형 *
            </label>
            <Select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              options={[
                { value: 'quality', label: '품질 일정' },
                { value: 'personal', label: '개인 일정' }
              ]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리 *
            </label>
            <Select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              options={currentCategories.map(cat => ({ value: cat.code, label: cat.name }))}
              placeholder="카테고리 선택"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            일정 제목 *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="일정 제목을 입력하세요"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            중요도 *
          </label>
          <div className="flex space-x-4">
            {[
              { value: 'low', label: '낮음', color: 'bg-green-100 text-green-800' },
              { value: 'medium', label: '보통', color: 'bg-yellow-100 text-yellow-800' },
              { value: 'high', label: '높음', color: 'bg-red-100 text-red-800' }
            ].map(option => (
              <label key={option.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="importance"
                  value={option.value}
                  checked={formData.importance === option.value}
                  onChange={(e) => handleInputChange('importance', e.target.value as 'low' | 'medium' | 'high')}
                  className="sr-only"
                />
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${formData.importance === option.value ? option.color : 'bg-gray-100 text-gray-600'}
                `}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 날짜 및 시간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 날짜 *
            </label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 날짜
            </label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 시간
            </label>
            <Input
              type="time"
              value={formData.start_time}
              onChange={(e) => handleInputChange('start_time', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 시간
            </label>
            <Input
              type="time"
              value={formData.end_time}
              onChange={(e) => handleInputChange('end_time', e.target.value)}
            />
          </div>
        </div>

        {/* 추가 정보 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            장소
          </label>
          <Input
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="장소를 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상세 설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="상세 설명을 입력하세요"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 참석자 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            참석자
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
            {users.map(user => (
              <label key={user.id} className="flex items-center cursor-pointer p-1 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={formData.participants?.includes(user.id) || false}
                  onChange={() => handleParticipantToggle(user.id)}
                  className="mr-2"
                />
                <span className="text-sm">
                  {user.name} ({user.department} - {user.position})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {schedule ? '수정' : '등록'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
