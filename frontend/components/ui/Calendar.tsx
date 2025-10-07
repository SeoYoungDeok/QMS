'use client'

import React, { useState, useEffect } from 'react'
import { Schedule } from '@/lib/api'

interface CalendarProps {
  schedules: Schedule[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onScheduleClick?: (schedule: Schedule) => void
  view?: 'month' | 'week' | 'day'
}

export default function Calendar({ 
  schedules, 
  selectedDate = new Date(), 
  onDateSelect, 
  onScheduleClick,
  view = 'month'
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate)

  // selectedDate가 변경되면 currentDate도 업데이트
  useEffect(() => {
    setCurrentDate(selectedDate)
  }, [selectedDate])

  // 월 뷰 렌더링
  const renderMonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // 주의 시작일로 조정

    const weeks = []
    const currentWeekDate = new Date(startDate)

    for (let week = 0; week < 6; week++) {
      const days = []
      for (let day = 0; day < 7; day++) {
        const date = new Date(currentWeekDate)
        const dateString = date.toISOString().split('T')[0]
        const daySchedules = schedules.filter(schedule => {
          const scheduleStart = schedule.start_date
          const scheduleEnd = schedule.end_date || schedule.start_date
          return dateString >= scheduleStart && dateString <= scheduleEnd
        })

        const isCurrentMonth = date.getMonth() === month
        const isToday = date.toDateString() === new Date().toDateString()
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

        days.push(
          <div
            key={date.toISOString()}
            className={`
              min-h-[100px] p-1 border border-gray-200 cursor-pointer
              ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
              ${isToday ? 'bg-blue-50' : ''}
              ${isSelected ? 'ring-2 ring-blue-500' : ''}
              hover:bg-gray-50
            `}
            onClick={() => onDateSelect?.(date)}
          >
            <div className={`
              text-sm font-medium mb-1
              ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              ${isToday ? 'text-blue-600' : ''}
            `}>
              {date.getDate()}
            </div>
            <div className="space-y-1">
              {daySchedules.slice(0, 3).map(schedule => (
                <div
                  key={schedule.id}
                  className={`
                    text-xs p-1 rounded truncate cursor-pointer
                    ${getImportanceColor(schedule.importance)}
                  `}
                  onClick={(e) => {
                    e.stopPropagation()
                    onScheduleClick?.(schedule)
                  }}
                  title={`${schedule.title} (${schedule.type_display})`}
                >
                  {schedule.title}
                </div>
              ))}
              {daySchedules.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{daySchedules.length - 3}개 더
                </div>
              )}
            </div>
          </div>
        )
        currentWeekDate.setDate(currentWeekDate.getDate() + 1)
      }
      weeks.push(
        <div key={week} className="grid grid-cols-7">
          {days}
        </div>
      )
    }

    return (
      <div className="space-y-0">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-gray-100">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>
        {/* 주 행들 */}
        {weeks}
      </div>
    )
  }

  // 주 뷰 렌더링 (간단 구현)
  const renderWeekView = () => {
    // 주 뷰는 기본적으로 월 뷰와 유사하지만 1주만 표시
    return <div className="text-center text-gray-500 py-8">주 뷰는 추후 구현 예정</div>
  }

  // 일 뷰 렌더링 (간단 구현)
  const renderDayView = () => {
    const dateString = currentDate.toISOString().split('T')[0]
    const daySchedules = schedules.filter(schedule => {
      const scheduleStart = schedule.start_date
      const scheduleEnd = schedule.end_date || schedule.start_date
      return dateString >= scheduleStart && dateString <= scheduleEnd
    })

    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold text-gray-900 mb-4">
          {currentDate.toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}
        </div>
        {daySchedules.length === 0 ? (
          <div className="text-center text-gray-500 py-8">일정이 없습니다</div>
        ) : (
          <div className="space-y-2">
            {daySchedules.map(schedule => (
              <div
                key={schedule.id}
                className={`
                  p-3 rounded-lg cursor-pointer border
                  ${getImportanceColor(schedule.importance, true)}
                `}
                onClick={() => onScheduleClick?.(schedule)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{schedule.title}</h3>
                  <span className="text-sm text-gray-500">
                    {schedule.type_display}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {schedule.start_time && schedule.end_time ? (
                    `${schedule.start_time} - ${schedule.end_time}`
                  ) : schedule.start_time ? (
                    schedule.start_time
                  ) : (
                    '종일'
                  )}
                  {schedule.location && ` • ${schedule.location}`}
                </div>
                {schedule.description && (
                  <div className="text-sm text-gray-500 mt-2">
                    {schedule.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const getImportanceColor = (importance: string, isDetailed = false) => {
    const colors = {
      high: isDetailed 
        ? 'bg-red-50 border-red-200 text-red-800' 
        : 'bg-red-100 text-red-800',
      medium: isDetailed 
        ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
        : 'bg-yellow-100 text-yellow-800',
      low: isDetailed 
        ? 'bg-green-50 border-green-200 text-green-800' 
        : 'bg-green-100 text-green-800'
    }
    return colors[importance as keyof typeof colors] || colors.low
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 캘린더 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            오늘
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 캘린더 본문 */}
      <div className="p-4">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>
    </div>
  )
}
