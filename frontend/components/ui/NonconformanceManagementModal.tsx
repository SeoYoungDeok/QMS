'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'
import Select from './Select'
import Table from './Table'
import { nonconformanceAPI, type DefectType, type DefectCause, type SixMCategory } from '@/lib/api'
import { toast } from 'sonner'

interface NonconformanceManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onDataChanged?: () => void
}

type ManagementTab = 'defect_types' | 'defect_causes' | 'categories'

interface DeleteTarget {
  type: 'defect_type' | 'defect_cause'
  code: string
  name: string
  category?: string
}

export default function NonconformanceManagementModal({ 
  isOpen, 
  onClose,
  onDataChanged 
}: NonconformanceManagementModalProps) {
  const [activeTab, setActiveTab] = useState<ManagementTab>('defect_types')
  const [loading, setLoading] = useState(false)

  // 데이터 상태
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([])
  const [defectCauses, setDefectCauses] = useState<DefectCause[]>([])
  const [sixMCategories, setSixMCategories] = useState<SixMCategory[]>([])

  // 추가 폼 상태
  const [newDefectType, setNewDefectType] = useState({ code: '', name: '', description: '' })
  const [newDefectCause, setNewDefectCause] = useState({ code: '', name: '', category: '', description: '' })

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAllData()
    }
  }, [isOpen])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [typesRes, causesRes, categoriesRes] = await Promise.all([
        nonconformanceAPI.getDefectTypes(),
        nonconformanceAPI.getDefectCauses(),
        nonconformanceAPI.getSixMCategories()
      ])

      setDefectTypes(typesRes.data.data || [])
      setDefectCauses(causesRes.data.data || [])
      setSixMCategories(categoriesRes.data.data || [])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDefectType = async () => {
    if (!newDefectType.code || !newDefectType.name) {
      toast.error('코드와 이름은 필수 입력 항목입니다.')
      return
    }

    try {
      setLoading(true)
      await nonconformanceAPI.createDefectType(newDefectType)
      toast.success('불량 유형이 추가되었습니다.')
      setNewDefectType({ code: '', name: '', description: '' })
      await loadAllData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '불량 유형 추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDefectCause = async () => {
    if (!newDefectCause.code || !newDefectCause.name || !newDefectCause.category) {
      toast.error('코드, 이름, 카테고리는 필수 입력 항목입니다.')
      return
    }

    try {
      setLoading(true)
      await nonconformanceAPI.createDefectCause(newDefectCause)
      toast.success('발생 원인이 추가되었습니다.')
      setNewDefectCause({ code: '', name: '', category: '', description: '' })
      await loadAllData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '발생 원인 추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (type: 'defect_type' | 'defect_cause', code: string, name: string, category?: string) => {
    setDeleteTarget({ type, code, name, category })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      setLoading(true)
      
      if (deleteTarget.type === 'defect_type') {
        await nonconformanceAPI.deleteDefectType(deleteTarget.code)
        toast.success('불량 유형이 삭제되었습니다.')
      } else {
        await nonconformanceAPI.deleteDefectCause(deleteTarget.code)
        toast.success('발생 원인이 삭제되었습니다.')
      }
      
      await loadAllData()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error: any) {
      toast.error(error.response?.data?.error || '삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    onClose()
    // 모달을 닫을 때 메인 페이지의 코드 테이블 새로고침
    onDataChanged?.()
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'defect_types':
        return (
          <div className="space-y-6">
            {/* 추가 폼 */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">새 불량 유형 추가</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="코드 (예: D01)"
                  value={newDefectType.code}
                  onChange={(e) => setNewDefectType(prev => ({ ...prev, code: e.target.value }))}
                />
                <Input
                  placeholder="이름 (예: 외관-파손)"
                  value={newDefectType.name}
                  onChange={(e) => setNewDefectType(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="설명 (선택)"
                  value={newDefectType.description}
                  onChange={(e) => setNewDefectType(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleAddDefectType} disabled={loading} size="sm">
                  추가
                </Button>
              </div>
            </div>

            {/* 목록 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">등록된 불량 유형 ({defectTypes.length}개)</h4>
              <Table
                headers={['코드', '이름', '설명', '작업']}
                data={defectTypes.map(type => [
                  type.code,
                  type.name,
                  type.description || '-',
                  <Button
                    key={type.code}
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteClick('defect_type', type.code, type.name)}
                    disabled={loading}
                  >
                    삭제
                  </Button>
                ])}
              />
            </div>
          </div>
        )

      case 'defect_causes':
        return (
          <div className="space-y-6">
            {/* 추가 폼 */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">새 발생 원인 추가</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="코드 (예: M1.1)"
                  value={newDefectCause.code}
                  onChange={(e) => setNewDefectCause(prev => ({ ...prev, code: e.target.value }))}
                />
                <Input
                  placeholder="이름 (예: 소재-제조처)"
                  value={newDefectCause.name}
                  onChange={(e) => setNewDefectCause(prev => ({ ...prev, name: e.target.value }))}
                />
                <Select
                  value={newDefectCause.category}
                  onChange={(e) => setNewDefectCause(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">6M 카테고리 선택</option>
                  {sixMCategories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="설명 (선택)"
                  value={newDefectCause.description}
                  onChange={(e) => setNewDefectCause(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleAddDefectCause} disabled={loading} size="sm">
                  추가
                </Button>
              </div>
            </div>

            {/* 목록 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">등록된 발생 원인 ({defectCauses.length}개)</h4>
              <Table
                headers={['코드', '이름', '6M 카테고리', '설명', '작업']}
                data={defectCauses.map(cause => [
                  cause.code,
                  cause.name,
                  cause.category_display,
                  cause.description || '-',
                  <Button
                    key={cause.code}
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteClick('defect_cause', cause.code, cause.name, cause.category_display)}
                    disabled={loading}
                  >
                    삭제
                  </Button>
                ])}
              />
            </div>
          </div>
        )

      case 'categories':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">6M 카테고리 정보</h4>
              <p className="text-sm text-purple-700">
                6M 카테고리는 시스템에 사전 정의되어 있습니다. 필요시 관리자에게 문의하세요.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">등록된 6M 카테고리 ({sixMCategories.length}개)</h4>
              <Table
                headers={['코드', '이름']}
                data={sixMCategories.map(category => [
                  category.code,
                  category.name
                ])}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="부적합 유형/원인 관리"
        size="xl"
      >
        <div className="space-y-4">
          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('defect_types')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm ${
                activeTab === 'defect_types'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              불량 유형
            </button>
            <button
              onClick={() => setActiveTab('defect_causes')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm ${
                activeTab === 'defect_causes'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              발생 원인
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm ${
                activeTab === 'categories'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              6M 카테고리
            </button>
          </div>

          {/* 컨텐츠 */}
          {loading && activeTab !== 'defect_types' && activeTab !== 'defect_causes' ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-[var(--text-secondary)]">데이터를 불러오는 중...</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {renderContent()}
            </div>
          )}
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteTarget(null)
        }}
        title="삭제 확인"
        size="sm"
      >
        <div className="space-y-4">
          {/* 경고 아이콘 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* 메시지 */}
          <div className="text-center space-y-2">
            <p className="text-[var(--text-primary)] font-medium text-lg">
              정말로 삭제하시겠습니까?
            </p>
            <p className="text-[var(--text-secondary)] text-sm">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </div>

          {/* 삭제 대상 정보 */}
          {deleteTarget && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">유형</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {deleteTarget.type === 'defect_type' ? '불량 유형' : '발생 원인'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">코드</span>
                <span className="font-medium text-[var(--text-primary)]">{deleteTarget.code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">이름</span>
                <span className="font-medium text-[var(--text-primary)]">{deleteTarget.name}</span>
              </div>
              {deleteTarget.category && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">카테고리</span>
                  <span className="font-medium text-[var(--text-primary)]">{deleteTarget.category}</span>
                </div>
              )}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false)
                setDeleteTarget(null)
              }}
              className="flex-1"
              disabled={loading}
            >
              취소
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

