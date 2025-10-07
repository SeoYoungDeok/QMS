'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import Input from './Input'
import Select from './Select'
import Button from './Button'
import { KPITarget, KPITargetCreateRequest } from '@/lib/api'

interface KPITargetModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: KPITargetCreateRequest) => Promise<void>
  target?: KPITarget | null
  mode: 'create' | 'edit'
}

export default function KPITargetModal({
  isOpen,
  onClose,
  onSubmit,
  target,
  mode
}: KPITargetModalProps) {
  const currentYear = new Date().getFullYear()
  
  const [formData, setFormData] = useState<KPITargetCreateRequest>({
    year: currentYear,
    kpi_type: 'defect_rate',
    target_value: '',
    unit: '%'
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (mode === 'edit' && target) {
      setFormData({
        year: target.year,
        kpi_type: target.kpi_type,
        target_value: target.target_value,
        unit: target.unit
      })
    } else {
      // 생성 모드일 때 초기화
      setFormData({
        year: currentYear,
        kpi_type: 'defect_rate',
        target_value: '',
        unit: '%'
      })
    }
    setErrors({})
  }, [mode, target, isOpen, currentYear])

  // KPI 종류 변경 시 단위 자동 설정
  useEffect(() => {
    if (formData.kpi_type === 'defect_rate') {
      if (formData.unit !== '%' && formData.unit !== 'ppm') {
        setFormData(prev => ({ ...prev, unit: '%' }))
      }
    } else if (formData.kpi_type === 'f_cost') {
      setFormData(prev => ({ ...prev, unit: 'KRW' }))
    } else if (formData.kpi_type === 'complaints') {
      setFormData(prev => ({ ...prev, unit: 'count' }))
    }
  }, [formData.kpi_type, formData.unit])

  // 단위 변환 함수 (불량율 전용)
  const convertUnit = () => {
    if (formData.kpi_type !== 'defect_rate') return

    const value = parseFloat(formData.target_value as string)
    if (isNaN(value)) {
      setErrors({ target_value: '유효한 숫자를 입력해주세요.' })
      return
    }

    if (formData.unit === '%') {
      // % → ppm
      const ppmValue = value * 10000
      setFormData(prev => ({
        ...prev,
        target_value: ppmValue.toFixed(4),
        unit: 'ppm'
      }))
    } else if (formData.unit === 'ppm') {
      // ppm → %
      const percentValue = value / 10000
      setFormData(prev => ({
        ...prev,
        target_value: percentValue.toFixed(4),
        unit: '%'
      }))
    }
    setErrors({})
  }

  // 폼 검증
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 연도 검증
    const minYear = currentYear - 5
    if (formData.year > currentYear) {
      newErrors.year = `미래 연도는 등록할 수 없습니다. (최대: ${currentYear}년)`
    } else if (formData.year < minYear) {
      newErrors.year = `너무 오래된 연도입니다. (최소: ${minYear}년)`
    }

    // 목표값 검증
    const value = parseFloat(formData.target_value as string)
    if (!formData.target_value || isNaN(value)) {
      newErrors.target_value = '목표값을 입력해주세요.'
    } else if (value < 0) {
      newErrors.target_value = '목표값은 0 이상이어야 합니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      // 서버 에러 처리
      if (error.response?.data) {
        const serverErrors: Record<string, string> = {}
        Object.keys(error.response.data).forEach(key => {
          const errorValue = error.response.data[key]
          if (Array.isArray(errorValue)) {
            serverErrors[key] = errorValue[0]
          } else if (typeof errorValue === 'string') {
            serverErrors[key] = errorValue
          }
        })
        setErrors(serverErrors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 단위 옵션 (KPI 종류별)
  const getUnitOptions = () => {
    if (formData.kpi_type === 'defect_rate') {
      return [
        { value: '%', label: '%' },
        { value: 'ppm', label: 'ppm' }
      ]
    } else if (formData.kpi_type === 'f_cost') {
      return [{ value: 'KRW', label: '원 (KRW)' }]
    } else if (formData.kpi_type === 'complaints') {
      return [{ value: 'count', label: '건 (count)' }]
    }
    return []
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'KPI 목표 등록' : 'KPI 목표 수정'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 연도 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            연도 <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min={currentYear - 5}
            max={currentYear}
            value={formData.year}
            onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            error={errors.year}
            placeholder={`${currentYear - 5} ~ ${currentYear}`}
          />
          <p className="text-xs text-gray-500 mt-1">
            현재 연도부터 과거 5년까지 등록 가능합니다.
          </p>
        </div>

        {/* KPI 종류 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            KPI 종류 <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.kpi_type}
            onChange={(e) => setFormData(prev => ({ ...prev, kpi_type: e.target.value as any }))}
            options={[
              { value: 'defect_rate', label: '불량율' },
              { value: 'f_cost', label: 'F-COST' },
              { value: 'complaints', label: '고객 불만 건수' }
            ]}
          />
        </div>

        {/* 목표값 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            목표값 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="any"
              min="0"
              value={formData.target_value}
              onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
              error={errors.target_value}
              placeholder="목표값 입력"
              className="flex-1"
            />
            <Select
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value as any }))}
              options={getUnitOptions()}
              className="w-32"
              disabled={formData.kpi_type !== 'defect_rate'}
            />
          </div>
        </div>

        {/* 불량율 단위 변환 (defect_rate일 때만 표시) */}
        {formData.kpi_type === 'defect_rate' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                단위 변환 도구
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={convertUnit}
                disabled={!formData.target_value}
              >
                {formData.unit === '%' ? '% → ppm' : 'ppm → %'}
              </Button>
            </div>
            <p className="text-xs text-blue-700">
              변환 공식: <strong>1% = 10,000 ppm</strong>
            </p>
            {formData.target_value && !isNaN(parseFloat(formData.target_value as string)) && (
              <p className="text-xs text-blue-600 mt-1">
                현재 값: <strong>{formData.target_value}{formData.unit}</strong>
                {formData.unit === '%' && (
                  <> = {(parseFloat(formData.target_value as string) * 10000).toFixed(2)} ppm</>
                )}
                {formData.unit === 'ppm' && (
                  <> = {(parseFloat(formData.target_value as string) / 10000).toFixed(4)}%</>
                )}
              </p>
            )}
          </div>
        )}

        {/* 가이드 메시지 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold mb-2">📋 입력 가이드</h4>
          <ul className="text-xs text-gray-700 space-y-1">
            {formData.kpi_type === 'defect_rate' && (
              <>
                <li>• <strong>불량율:</strong> % 또는 ppm 단위로 입력 가능</li>
                <li>• 예시: 0.5% 또는 5000 ppm</li>
              </>
            )}
            {formData.kpi_type === 'f_cost' && (
              <>
                <li>• <strong>F-COST:</strong> 원(KRW) 단위로 입력</li>
                <li>• 예시: 120000000 (1억 2천만원)</li>
              </>
            )}
            {formData.kpi_type === 'complaints' && (
              <>
                <li>• <strong>고객 불만 건수:</strong> 건수로 입력</li>
                <li>• 예시: 12 (연간 12건)</li>
              </>
            )}
          </ul>
        </div>

        {/* 전체 에러 메시지 */}
        {errors.non_field_errors && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {errors.non_field_errors}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : mode === 'create' ? '등록' : '수정'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

