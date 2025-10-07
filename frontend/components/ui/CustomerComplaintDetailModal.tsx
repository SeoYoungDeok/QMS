'use client'

import React from 'react'
import Modal from './Modal'
import Badge from './Badge'
import { CustomerComplaint } from '@/lib/api'

interface CustomerComplaintDetailModalProps {
  isOpen: boolean
  onClose: () => void
  complaint: CustomerComplaint | null
}

const CustomerComplaintDetailModal: React.FC<CustomerComplaintDetailModalProps> = ({
  isOpen,
  onClose,
  complaint
}) => {
  if (!complaint) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="고객 불만 상세"
      size="xl"
    >
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">CCR UID</p>
              <p className="text-sm font-medium text-gray-900">{complaint.ccr_uid}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">발생일</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(complaint.occurrence_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">CCR NO</p>
              <p className="text-sm font-medium text-gray-900">{complaint.ccr_no}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">업체명</p>
              <p className="text-sm font-medium text-gray-900">{complaint.vendor}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">품명</p>
              <p className="text-sm font-medium text-gray-900">{complaint.product_name}</p>
            </div>
          </div>
        </div>

        {/* 수량/금액 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">수량/금액</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">부적합 수량</p>
              <p className="text-sm font-medium text-gray-900">{complaint.defect_qty.toLocaleString()} 개</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">단가</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(complaint.unit_price)} 원</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">합계</p>
              <p className="text-sm font-semibold text-blue-600">{formatCurrency(complaint.total_amount)} 원</p>
            </div>
          </div>
        </div>

        {/* 불량유형/발생원인 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">분류</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">불량유형</p>
              <p className="text-sm font-medium text-gray-900">
                {complaint.defect_type_code} - {complaint.defect_type_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">발생원인 (6M)</p>
              <div className="flex items-center gap-2">
                <Badge variant="info">
                  {complaint.cause_category_display}
                </Badge>
                <p className="text-sm font-medium text-gray-900">
                  {complaint.cause_code} - {complaint.cause_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 고객 불만 내용 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">고객 불만 내용</h3>
          <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
            {complaint.complaint_content}
          </div>
        </div>

        {/* 조치 내용 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">조치 내용</h3>
            {complaint.action_content ? (
              <Badge variant="success">조치완료</Badge>
            ) : (
              <Badge variant="warning">조치대기</Badge>
            )}
          </div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
            {complaint.action_content || '조치 내용이 아직 입력되지 않았습니다.'}
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">메타 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">작성자</p>
              <p className="text-sm font-medium text-gray-900">{complaint.created_by_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">생성일시</p>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(complaint.created_at)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">수정일시</p>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(complaint.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CustomerComplaintDetailModal

