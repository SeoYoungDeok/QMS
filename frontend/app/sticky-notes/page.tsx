'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import { stickyNotesAPI, tagsAPI, StickyNoteListItem, Tag } from '@/lib/api'
import StickyNoteCard from '@/components/ui/StickyNoteCard'
import Modal from '@/components/ui/Modal'
import AlertModal from '@/components/ui/AlertModal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function StickyNotesPage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  // 상태 관리
  const [notes, setNotes] = useState<StickyNoteListItem[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<number>>(new Set())
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState('')
  
  // 뷰포트 상태 (줌/패닝)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // 필터 상태
  const [filters, setFilters] = useState({
    query: '',
    tag_ids: [] as number[],
    importance: '',
    is_locked: undefined as boolean | undefined,
  })

  // 태그 관리 모달
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')

  // 삭제 확인 모달 (메모만)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    noteId?: number
    isBulk?: boolean
  }>({ isOpen: false })

  // 경고 모달
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    type?: 'info' | 'warning' | 'error' | 'success'
  }>({ isOpen: false, message: '' })

  // 인증 체크
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setIsLoadingData(true)
      setError('')

      // 필터 파라미터 생성
      const params: any = {}
      if (filters.query) params.query = filters.query
      if (filters.tag_ids.length > 0) params.tag_ids = filters.tag_ids.join(',')
      if (filters.importance) params.importance = filters.importance
      if (filters.is_locked !== undefined) params.is_locked = filters.is_locked

      // 포스트잇과 태그 동시 로드
      const [notesResponse, tagsResponse] = await Promise.all([
        stickyNotesAPI.list(params),
        tagsAPI.list(),
      ])

      setNotes(notesResponse.data.results || [])
      setTags(tagsResponse.data.results || [])
    } catch (error: any) {
      console.error('Data load error:', error)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingData(false)
    }
  }

  // 필터 적용
  const handleApplyFilters = () => {
    loadData()
  }

  // 검색창에서 엔터키 처리
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyFilters()
    }
  }

  // 필터 초기화
  const handleResetFilters = () => {
    setFilters({
      query: '',
      tag_ids: [],
      importance: '',
      is_locked: undefined,
    })
    setTimeout(() => loadData(), 0)
  }

  // 새 메모 추가
  const handleAddNote = async () => {
    if (!user || user.role_level < 1) {
      setAlertModal({
        isOpen: true,
        message: '게스트는 메모를 생성할 수 없습니다.',
        type: 'warning'
      })
      return
    }

    try {
      const newNote = {
        content: '새 메모',
        importance: 'medium' as const,
        color: 'yellow',
        x: -viewport.x / viewport.zoom + 100,
        y: -viewport.y / viewport.zoom + 100,
        width: 220,
        height: 180,
        z_index: notes.length + 1,
        tag_ids: [],
      }

      await stickyNotesAPI.create(newNote)
      loadData()
    } catch (error: any) {
      console.error('Create error:', error)
      setAlertModal({
        isOpen: true,
        message: '메모 생성에 실패했습니다.',
        type: 'error'
      })
    }
  }

  // 메모 업데이트
  const handleUpdateNote = async (id: number, data: any) => {
    try {
      await stickyNotesAPI.update(id, data)
      loadData()
    } catch (error: any) {
      console.error('Update error:', error)
      setAlertModal({
        isOpen: true,
        message: '메모 수정에 실패했습니다.',
        type: 'error'
      })
    }
  }

  // 메모 삭제 확인
  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, noteId: id })
  }

  // 메모 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.noteId) return

    try {
      await stickyNotesAPI.delete(deleteConfirm.noteId)
      setDeleteConfirm({ isOpen: false })
      loadData()
    } catch (error: any) {
      console.error('Delete error:', error)
      setAlertModal({
        isOpen: true,
        message: '메모 삭제에 실패했습니다.',
        type: 'error'
      })
    }
  }

  // 위치 업데이트
  const handlePositionUpdate = useCallback(
    async (id: number, x: number, y: number) => {
      try {
        await stickyNotesAPI.updatePosition(id, { x, y })
        setNotes((prev) =>
          prev.map((note) => (note.id === id ? { ...note, x, y } : note))
        )
      } catch (error: any) {
        console.error('Position update error:', error)
      }
    },
    []
  )

  // 다중 선택
  const handleToggleSelect = (id: number) => {
    setSelectedNoteIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedNoteIds.size === notes.length) {
      setSelectedNoteIds(new Set())
    } else {
      setSelectedNoteIds(new Set(notes.map((n) => n.id)))
    }
  }

  // 일괄 삭제 확인
  const handleBulkDeleteClick = () => {
    if (selectedNoteIds.size === 0) return
    setDeleteConfirm({ isOpen: true, isBulk: true })
  }

  // 일괄 삭제 실행
  const handleBulkDeleteConfirm = async () => {
    if (selectedNoteIds.size === 0) return

    try {
      await Promise.all(Array.from(selectedNoteIds).map((id) => stickyNotesAPI.delete(id)))
      setSelectedNoteIds(new Set())
      setDeleteConfirm({ isOpen: false })
      loadData()
    } catch (error: any) {
      console.error('Bulk delete error:', error)
      setAlertModal({
        isOpen: true,
        message: '일괄 삭제에 실패했습니다.',
        type: 'error'
      })
    }
  }

  // 줌 인/아웃
  const handleZoom = (delta: number) => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(3, prev.zoom + delta)),
    }))
  }

  // 마우스 휠 줌 (Ctrl + 휠)
  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl 키가 눌린 상태에서만 줌 동작
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      handleZoom(delta)
    }
  }

  // 캔버스 드래그로 패닝
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }))
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // 태그 추가
  const handleAddTag = async () => {
    if (!newTagName.trim()) return

    try {
      await tagsAPI.create({ name: newTagName.trim(), color: newTagColor })
      setNewTagName('')
      setNewTagColor('#3b82f6')
      loadData()
    } catch (error: any) {
      console.error('Tag create error:', error)
      setAlertModal({
        isOpen: true,
        message: '태그 생성에 실패했습니다.',
        type: 'error'
      })
    }
  }

  // 태그 삭제 (즉시 삭제, 모달 없음)
  const handleDeleteTag = async (id: number) => {
    try {
      await tagsAPI.delete(id)
      loadData()
    } catch (error: any) {
      console.error('Tag delete error:', error)
      setAlertModal({
        isOpen: true,
        message: '태그 삭제에 실패했습니다.',
        type: 'error'
      })
    }
  }

  // 태그 토글
  const handleToggleTag = (tagId: number) => {
    setFilters(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-[var(--text-secondary)]">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // 중요도 옵션 (연한 색상)
  const importanceOptions = [
    { value: '', label: '전체', selectedColor: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'low', label: '낮음', selectedColor: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'medium', label: '중간', selectedColor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'high', label: '높음', selectedColor: 'bg-red-100 text-red-700 border-red-300' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-64 transition-all duration-300 flex flex-col">
        {/* 상단 헤더 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">포스트잇 보드</h1>
              <p className="text-sm text-[var(--text-secondary)]">각종 메모를 자유롭게 생성하세요</p>
            </div>

            <div className="flex items-center space-x-3">
              {/* 줌 컨트롤 */}
              <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-3 py-2">
                <button
                  onClick={() => handleZoom(-0.1)}
                  className="text-gray-600 hover:text-gray-900"
                  disabled={viewport.zoom <= 0.25}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm font-medium min-w-[50px] text-center">
                  {Math.round(viewport.zoom * 100)}%
                </span>
                <button
                  onClick={() => handleZoom(0.1)}
                  className="text-gray-600 hover:text-gray-900"
                  disabled={viewport.zoom >= 3}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* 태그 관리 */}
              <button
                onClick={() => setIsTagModalOpen(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                태그 관리
              </button>

              {/* 선택 메뉴 */}
              {selectedNoteIds.size > 0 && (
                <>
                  <span className="text-sm text-gray-600">{selectedNoteIds.size}개 선택</span>
                  <button
                    onClick={handleBulkDeleteClick}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    선택 삭제
                  </button>
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {selectedNoteIds.size === notes.length ? '전체 해제' : '전체 선택'}
                  </button>
                </>
              )}

              {/* 새 메모 추가 */}
              <button
                onClick={handleAddNote}
                disabled={!user || user.role_level < 1}
                className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + 새 메모
              </button>

              {/* 새로고침 */}
              <button
                onClick={loadData}
                disabled={isLoadingData}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoadingData ? '로딩 중...' : '새로고침'}
              </button>
            </div>
          </div>
        </div>

        {/* 필터/검색 영역 (2줄 레이아웃) */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="space-y-3">
            {/* 첫째 줄: 중요도와 태그 */}
            <div className="flex items-center gap-4">
              {/* 중요도 (선택 시 각 색상 표시) */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">중요도:</span>
                {importanceOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilters({ ...filters, importance: option.value })}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                      filters.importance === option.value
                        ? option.selectedColor
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* 태그 (선택 시 각 태그 색상 표시) */}
              {tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">태그:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                          filters.tag_ids.includes(tag.id)
                            ? ''
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                        style={
                          filters.tag_ids.includes(tag.id)
                            ? {
                                backgroundColor: tag.color ? `${tag.color}20` : '#dbeafe',
                                color: tag.color || '#1d4ed8',
                                borderColor: tag.color ? `${tag.color}80` : '#93c5fd',
                              }
                            : {}
                        }
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 둘째 줄: 검색창과 버튼 */}
            <div className="flex items-center gap-3">
              {/* 검색어 */}
              <div className="flex-1">
                <Input
                  type="text"
                  value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="메모 내용 검색..."
                  className="w-full"
                />
              </div>

              {/* 버튼 */}
              <Button onClick={handleApplyFilters} variant="primary" size="sm">
                검색
              </Button>
              <Button onClick={handleResetFilters} variant="secondary" size="sm">
                초기화
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* 캔버스 영역 */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden canvas-background"
          style={{ 
            cursor: isPanning ? 'grabbing' : 'grab',
            background: `
              linear-gradient(0deg, transparent 24%, rgba(200, 200, 200, 0.15) 25%, rgba(200, 200, 200, 0.15) 26%, transparent 27%, transparent 74%, rgba(200, 200, 200, 0.15) 75%, rgba(200, 200, 200, 0.15) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(200, 200, 200, 0.15) 25%, rgba(200, 200, 200, 0.15) 26%, transparent 27%, transparent 74%, rgba(200, 200, 200, 0.15) 75%, rgba(200, 200, 200, 0.15) 76%, transparent 77%, transparent),
              linear-gradient(0deg, transparent 24%, rgba(180, 180, 180, 0.08) 25%, rgba(180, 180, 180, 0.08) 26%, transparent 27%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(180, 180, 180, 0.08) 25%, rgba(180, 180, 180, 0.08) 26%, transparent 27%, transparent),
              #f8f9fa
            `,
            backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px',
            backgroundPosition: '0 0, 0 0, 0 0, 0 0'
          }}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="canvas-background"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: '0 0',
              position: 'absolute',
              width: '100%',
              height: '100%',
            }}
          >
            {/* 포스트잇 렌더링 */}
            {notes.map((note) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                tags={tags}
                isSelected={selectedNoteIds.has(note.id)}
                onToggleSelect={handleToggleSelect}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteClick}
                onPositionUpdate={handlePositionUpdate}
                disabled={!user || user.role_level < 1}
                zoom={viewport.zoom}
              />
            ))}

            {/* 빈 상태 */}
            {notes.length === 0 && !isLoadingData && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <svg
                  className="w-24 h-24 mx-auto text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500 text-lg font-medium">메모가 없습니다</p>
                <p className="text-gray-400 text-sm mt-2">
                  우측 상단 '+ 새 메모' 버튼을 클릭하여 메모를 추가하세요
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 메모 삭제 확인 모달 */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false })}
        title="메모 삭제"
        size="md"
      >
        <div className="space-y-6">
          {/* 경고 아이콘 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* 메시지 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {deleteConfirm.isBulk
                ? `선택한 ${selectedNoteIds.size}개의 메모를 삭제하시겠습니까?`
                : '정말로 이 메모를 삭제하시겠습니까?'}
            </h3>
            <p className="text-sm text-gray-600">
              삭제된 데이터는 복구할 수 없습니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex justify-center space-x-3">
            <Button onClick={() => setDeleteConfirm({ isOpen: false })} variant="secondary">
              취소
            </Button>
            <Button
              onClick={deleteConfirm.isBulk ? handleBulkDeleteConfirm : handleDeleteConfirm}
              variant="danger"
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      {/* 경고 모달 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* 태그 관리 모달 */}
      <Modal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        title="태그 관리"
        size="md"
      >
        <div className="space-y-6">
          {/* 새 태그 추가 */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">새 태그 추가</h3>
            <div className="flex space-x-3">
              <Input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="태그 이름"
                className="flex-1"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <Button onClick={handleAddTag} variant="primary">
                추가
              </Button>
            </div>
          </div>

          {/* 태그 목록 */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              등록된 태그 ({tags.length}개)
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: tag.color || '#e5e7eb' }}
                    />
                    <span className="font-medium text-[var(--text-primary)]">{tag.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-center text-[var(--text-secondary)] py-8">
                  등록된 태그가 없습니다
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
