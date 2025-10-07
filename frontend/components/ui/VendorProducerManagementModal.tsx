'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'
import { performanceAPI, type Vendor, type Producer } from '@/lib/api'
import { toast } from 'sonner'

interface VendorProducerManagementModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'vendor' | 'producer'
}

export default function VendorProducerManagementModal({
  isOpen,
  onClose,
  type
}: VendorProducerManagementModalProps) {
  const [items, setItems] = useState<(Vendor | Producer)[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const title = type === 'vendor' ? '업체명 관리' : '생산처 관리'
  const itemLabel = type === 'vendor' ? '업체명' : '생산처'

  useEffect(() => {
    if (isOpen) {
      loadItems()
      setCurrentPage(1) // 모달 열 때 첫 페이지로 초기화
      setSearchTerm('')
    }
  }, [isOpen, type])

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = type === 'vendor'
        ? await performanceAPI.getVendors()
        : await performanceAPI.getProducers()
      setItems(response.data)
    } catch (error: any) {
      toast.error(`${itemLabel} 목록을 불러오는데 실패했습니다.`)
      console.error('Load items error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newItemName.trim()) {
      toast.error(`${itemLabel}을(를) 입력해주세요.`)
      return
    }

    try {
      setLoading(true)
      if (type === 'vendor') {
        await performanceAPI.createVendor(newItemName.trim())
      } else {
        await performanceAPI.createProducer(newItemName.trim())
      }
      toast.success(`${itemLabel}이(가) 추가되었습니다.`)
      setNewItemName('')
      await loadItems()
    } catch (error: any) {
      if (error.response?.data?.name) {
        toast.error(`이미 존재하는 ${itemLabel}입니다.`)
      } else {
        toast.error(`${itemLabel} 추가에 실패했습니다.`)
      }
      console.error('Add item error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    try {
      setLoading(true)
      if (type === 'vendor') {
        await performanceAPI.deleteVendor(id)
      } else {
        await performanceAPI.deleteProducer(id)
      }
      toast.success(`${itemLabel}이(가) 삭제되었습니다.`)
      await loadItems()
    } catch (error: any) {
      toast.error(`${itemLabel} 삭제에 실패했습니다.`)
      console.error('Delete item error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 검색 필터링
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredItems.slice(startIndex, endIndex)

  // 검색어 변경 시 첫 페이지로 이동
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div className="space-y-4">
        {/* 새 항목 추가 */}
        <div className="flex gap-2">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={`새 ${itemLabel} 입력`}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <Button onClick={handleAdd} disabled={loading || !newItemName.trim()}>
            추가
          </Button>
        </div>

        {/* 검색 및 통계 */}
        <div className="space-y-2">
          <Input
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={`${itemLabel} 검색...`}
          />
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              총 <strong className="text-blue-600">{filteredItems.length}</strong>개
              {searchTerm && ` (전체: ${items.length}개)`}
            </span>
            {totalPages > 0 && (
              <span>
                {currentPage} / {totalPages} 페이지
              </span>
            )}
          </div>
        </div>

        {/* 목록 */}
        <div className="border border-gray-200 rounded-md">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              로딩 중...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? '검색 결과가 없습니다.' : `등록된 ${itemLabel}이(가) 없습니다.`}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {currentItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      등록자: {item.created_by_name} | {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3"
            >
              이전
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else if (currentPage <= 3) {
                  pageNumber = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i
                } else {
                  pageNumber = currentPage - 2 + i
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    disabled={loading}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-3"
            >
              다음
            </Button>
          </div>
        )}

        {/* 닫기 버튼 */}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </Modal>
  )
}

