'use client'

import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import AlertModal from './AlertModal'
import Input from './Input'
import Select from './Select'
import Button from './Button'
import { CustomerComplaint, CustomerComplaintCreateRequest, DefectType, DefectCause } from '@/lib/api'

interface CustomerComplaintModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CustomerComplaintCreateRequest) => Promise<void>
  complaint?: CustomerComplaint | null
  defectTypes: DefectType[]
  defectCauses: DefectCause[]
}

const CustomerComplaintModal: React.FC<CustomerComplaintModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  complaint,
  defectTypes,
  defectCauses
}) => {
  const [formData, setFormData] = useState<CustomerComplaintCreateRequest>({
    occurrence_date: '',
    ccr_no: '',
    vendor: '',
    product_name: '',
    defect_qty: '',
    unit_price: '',
    complaint_content: '',
    action_content: '',
    defect_type_code: '',
    cause_code: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    type?: 'info' | 'warning' | 'error' | 'success'
  }>({ isOpen: false, message: '' })

  // 수정 모드일 때 데이터 채우기
  useEffect(() => {
    if (complaint) {
      setFormData({
        occurrence_date: complaint.occurrence_date,
        ccr_no: complaint.ccr_no,
        vendor: complaint.vendor,
        product_name: complaint.product_name,
        defect_qty: complaint.defect_qty.toString(),
        unit_price: complaint.unit_price.toString(),
        complaint_content: complaint.complaint_content,
        action_content: complaint.action_content || '',
        defect_type_code: complaint.defect_type_code,
        cause_code: complaint.cause_code
      })
    } else {
      // 등록 모드일 때 초기화
      setFormData({
        occurrence_date: new Date().toISOString().split('T')[0],
        ccr_no: '',
        vendor: '',
        product_name: '',
        defect_qty: '',
        unit_price: '',
        complaint_content: '',
        action_content: '',
        defect_type_code: '',
        cause_code: ''
      })
    }
    setErrors({})
  }, [complaint, isOpen])

  const handleChange = (field: keyof CustomerComplaintCreateRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 에러 메시지 초기화
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.occurrence_date) {
      newErrors.occurrence_date = '발생일은 필수입니다.'
    }

    if (!formData.ccr_no.trim()) {
      newErrors.ccr_no = 'CCR NO는 필수입니다.'
    }

    if (!formData.vendor.trim()) {
      newErrors.vendor = '업체명은 필수입니다.'
    }

    if (!formData.product_name.trim()) {
      newErrors.product_name = '품명은 필수입니다.'
    }

    if (!formData.defect_qty || Number(formData.defect_qty) < 1) {
      newErrors.defect_qty = '부적합 수량은 1 이상이어야 합니다.'
    }

    if (!formData.unit_price || Number(formData.unit_price) < 0) {
      newErrors.unit_price = '단가는 0 이상이어야 합니다.'
    }

    if (!formData.complaint_content.trim()) {
      newErrors.complaint_content = '고객 불만 내용은 필수입니다.'
    }

    if (!formData.defect_type_code) {
      newErrors.defect_type_code = '불량유형을 선택해주세요.'
    }

    if (!formData.cause_code) {
      newErrors.cause_code = '발생원인을 선택해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      console.error('고객 불만 저장 오류:', error)
      const errorMessage = error.response?.data?.error || '저장 중 오류가 발생했습니다.'
      setAlertModal({
        isOpen: true,
        message: errorMessage,
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // 합계 자동 계산
  const totalAmount = formData.defect_qty && formData.unit_price
    ? (Number(formData.defect_qty) * Number(formData.unit_price)).toFixed(2)
    : '0.00'

  return (
    <>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        message={alertModal.message}
        type={alertModal.type}
      />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={complaint ? '고객 불만 수정' : '고객 불만 등록'}
        size="xl"
      >
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="발생일 *"
            type="date"
            value={formData.occurrence_date}
            onChange={(e) => handleChange('occurrence_date', e.target.value)}
            error={errors.occurrence_date}
          />
          <Input
            label="CCR NO *"
            value={formData.ccr_no}
            onChange={(e) => handleChange('ccr_no', e.target.value)}
            error={errors.ccr_no}
            placeholder="CCR-2025-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="업체명 *"
            value={formData.vendor}
            onChange={(e) => handleChange('vendor', e.target.value)}
            error={errors.vendor}
            placeholder="업체명 입력"
          />
          <Input
            label="품명 *"
            value={formData.product_name}
            onChange={(e) => handleChange('product_name', e.target.value)}
            error={errors.product_name}
            placeholder="품명 입력"
          />
        </div>

        {/* 수량/금액 */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="부적합 수량 *"
            type="number"
            value={formData.defect_qty}
            onChange={(e) => handleChange('defect_qty', e.target.value)}
            error={errors.defect_qty}
            min={1}
          />
          <Input
            label="단가 *"
            type="number"
            value={formData.unit_price}
            onChange={(e) => handleChange('unit_price', e.target.value)}
            error={errors.unit_price}
            min={0}
            step={0.01}
          />
          <Input
            label="합계"
            value={totalAmount}
            disabled
          />
        </div>

        {/* 불량유형/발생원인 */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="불량유형 *"
            value={formData.defect_type_code}
            onChange={(e) => handleChange('defect_type_code', e.target.value)}
            error={errors.defect_type_code}
          >
            <option value="">불량유형 선택</option>
            {defectTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.code} - {type.name}
              </option>
            ))}
          </Select>

          <Select
            label="발생원인 *"
            value={formData.cause_code}
            onChange={(e) => handleChange('cause_code', e.target.value)}
            error={errors.cause_code}
          >
            <option value="">발생원인 선택</option>
            {defectCauses.map((cause) => (
              <option key={cause.code} value={cause.code}>
                {cause.code} - {cause.name} ({cause.category_display})
              </option>
            ))}
          </Select>
        </div>

        {/* 고객 불만 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            고객 불만 내용 *
          </label>
          <textarea
            value={formData.complaint_content}
            onChange={(e) => handleChange('complaint_content', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.complaint_content
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            rows={4}
            placeholder="고객 불만 내용을 입력하세요"
          />
          {errors.complaint_content && (
            <p className="mt-1 text-sm text-red-600">{errors.complaint_content}</p>
          )}
        </div>

        {/* 조치 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            조치 내용
          </label>
          <textarea
            value={formData.action_content}
            onChange={(e) => handleChange('action_content', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="조치 내용을 입력하세요 (선택사항)"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '저장 중...' : (complaint ? '수정' : '등록')}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  )
}

export default CustomerComplaintModal

