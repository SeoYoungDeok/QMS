'use client'

import React, { useState } from 'react'
import { Schedule, scheduleAPI } from '@/lib/api'
import Modal from './Modal'
import Button from './Button'
import Badge from './Badge'

interface ScheduleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: Schedule | null
  onEdit?: (schedule: Schedule) => void
  onDelete?: (schedule: Schedule) => void
  canEdit?: boolean
  canDelete?: boolean
}

export default function ScheduleDetailModal({
  isOpen,
  onClose,
  schedule,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false
}: ScheduleDetailModalProps) {
  if (!schedule) return null

  const handleDelete = () => {
    if (!schedule) return
    onDelete?.(schedule)
  }

  const getImportanceBadge = (importance: string, display: string) => {
    const variants = {
      high: 'danger' as const,
      medium: 'warning' as const,
      low: 'success' as const
    }
    return (
      <Badge variant={variants[importance as keyof typeof variants] || 'default'}>
        {display}
      </Badge>
    )
  }

  const formatDateTime = () => {
    const startDate = new Date(schedule.start_date).toLocaleDateString('ko-KR')
    const endDate = schedule.end_date && schedule.end_date !== schedule.start_date
      ? new Date(schedule.end_date).toLocaleDateString('ko-KR')
      : null

    let dateStr = startDate
    if (endDate) {
      dateStr += ` ~ ${endDate}`
    }

    if (schedule.start_time || schedule.end_time) {
      const timeStr = schedule.start_time && schedule.end_time
        ? `${schedule.start_time} ~ ${schedule.end_time}`
        : schedule.start_time
        ? schedule.start_time
        : schedule.end_time
      dateStr += ` ${timeStr}`
    } else {
      dateStr += ' (종일)'
    }

    return dateStr
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="일정 상세">
      <div className="space-y-6">
        {/* 제목 및 기본 정보 */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {schedule.title}
            </h2>
            <div className="flex space-x-2">
              <Badge variant="secondary">
                {schedule.type_display}
              </Badge>
              {getImportanceBadge(schedule.importance, schedule.importance_display)}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-medium">카테고리:</span> {schedule.category_display}
          </div>
        </div>

        {/* 일시 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">일시</h3>
          <div className="text-sm text-gray-700">
            {formatDateTime()}
          </div>
        </div>

        {/* 장소 */}
        {schedule.location && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">장소</h3>
            <div className="text-sm text-gray-700">
              {schedule.location}
            </div>
          </div>
        )}

        {/* 상세 설명 */}
        {schedule.description && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">상세 설명</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {schedule.description}
            </div>
          </div>
        )}

        {/* 참석자 */}
        {schedule.participant_names && schedule.participant_names.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">참석자</h3>
            <div className="flex flex-wrap gap-2">
              {schedule.participant_names.map(participant => (
                <Badge key={participant.id} variant="info">
                  {participant.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 작성자 및 생성일 */}
        <div className="border-t pt-4 space-y-2">
          <div className="text-sm text-gray-500">
            <span className="font-medium">작성자:</span> {schedule.owner_name}
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium">생성일:</span> {' '}
            {new Date(schedule.created_at).toLocaleString('ko-KR')}
          </div>
          {schedule.updated_at !== schedule.created_at && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">수정일:</span> {' '}
              {new Date(schedule.updated_at).toLocaleString('ko-KR')}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => {
                onEdit?.(schedule)
                onClose()
              }}
            >
              수정
            </Button>
          )}
          
          {canDelete && (
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              삭제
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
