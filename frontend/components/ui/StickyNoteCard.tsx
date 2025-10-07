'use client'

import { useState, useRef, useEffect } from 'react'
import { StickyNoteListItem, Tag } from '@/lib/api'

interface StickyNoteCardProps {
  note: StickyNoteListItem
  tags: Tag[]
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onUpdate: (id: number, data: any) => void
  onDelete: (id: number) => void
  onPositionUpdate: (id: number, x: number, y: number) => void
  disabled: boolean
  zoom: number
}

// 색상 매핑 (매우 연하게)
const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-gray-800' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-gray-800' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-gray-800' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-gray-800' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-gray-800' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' },
}

// 중요도 배지 (텍스트 포함)
const importanceBadge: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', label: '낮음' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '중간' },
  high: { bg: 'bg-red-100', text: 'text-red-700', label: '높음' },
}

export default function StickyNoteCard({
  note,
  tags,
  isSelected,
  onToggleSelect,
  onUpdate,
  onDelete,
  onPositionUpdate,
  disabled,
  zoom,
}: StickyNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, mouseX: 0, mouseY: 0 })
  const [showMenu, setShowMenu] = useState(false)
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    note.tags.map(t => t.id)
  )
  const cardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 편집 모드 진입 시 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // 태그 변경 시 동기화
  useEffect(() => {
    setSelectedTagIds(note.tags.map(t => t.id))
  }, [note.tags])

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || note.is_locked || isEditing) return
    if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'DIV') return

    setIsDragging(true)
    setDragStart({
      x: e.clientX / zoom - note.x,
      y: e.clientY / zoom - note.y,
    })
    e.preventDefault()
    e.stopPropagation()
  }

  // 드래그 중
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX / zoom - dragStart.x
      const newY = e.clientY / zoom - dragStart.y
      
      onPositionUpdate(note.id, newX, newY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, note.id, onPositionUpdate, zoom])

  // 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent) => {
    if (disabled || note.is_locked) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeStart({
      width: note.width,
      height: note.height,
      mouseX: e.clientX,
      mouseY: e.clientY,
    })
  }

  // 리사이즈 중
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - resizeStart.mouseX) / zoom
      const deltaY = (e.clientY - resizeStart.mouseY) / zoom
      
      const newWidth = Math.max(180, resizeStart.width + deltaX)
      const newHeight = Math.max(150, resizeStart.height + deltaY)
      
      onUpdate(note.id, { width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeStart, note.id, onUpdate, zoom])

  // 더블클릭으로 편집 모드
  const handleDoubleClick = () => {
    if (disabled || note.is_locked) return
    setIsEditing(true)
  }

  // 내용 저장
  const handleSave = () => {
    if (content.trim() !== note.content) {
      onUpdate(note.id, { content: content.trim() })
    }
    setIsEditing(false)
  }

  // 컨텍스트 메뉴
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  // 색상 변경
  const handleColorChange = (color: string) => {
    onUpdate(note.id, { color })
    setShowMenu(false)
  }

  // 중요도 변경
  const handleImportanceChange = (importance: string) => {
    onUpdate(note.id, { importance })
    setShowMenu(false)
  }

  // 잠금 토글
  const handleToggleLock = () => {
    onUpdate(note.id, { is_locked: !note.is_locked })
    setShowMenu(false)
  }

  // 태그 선택 토글
  const handleToggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  // 태그 저장
  const handleSaveTags = () => {
    onUpdate(note.id, { tag_ids: selectedTagIds })
    setShowTagSelector(false)
  }

  const colors = colorMap[note.color] || colorMap.yellow
  const importance = importanceBadge[note.importance] || importanceBadge.medium

  return (
    <>
      <div
        ref={cardRef}
        className={`absolute cursor-move shadow-lg transition-shadow hover:shadow-xl ${
          colors.bg
        } ${colors.border} border-2 rounded-lg overflow-hidden ${
          isSelected ? 'ring-4 ring-blue-500' : ''
        } ${isDragging ? 'cursor-grabbing opacity-75' : ''}`}
        style={{
          left: note.x,
          top: note.y,
          width: note.width,
          height: note.height,
          zIndex: note.z_index,
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 bg-white bg-opacity-50 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {/* 선택 체크박스 */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(note.id)}
              className="w-4 h-4 rounded border-gray-300"
              onClick={(e) => e.stopPropagation()}
            />
            {/* 중요도 배지 (텍스트 포함) */}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${importance.bg} ${importance.text}`}>
              {importance.label}
            </span>
            {/* 잠금 아이콘 */}
            {note.is_locked && (
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* 메뉴 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {/* 삭제 버튼 */}
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(note.id)
                }}
                className="p-1 hover:bg-red-200 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="p-3 flex-1 overflow-auto">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setContent(note.content)
                  setIsEditing(false)
                } else if (e.key === 'Enter' && e.ctrlKey) {
                  handleSave()
                }
              }}
              className={`w-full h-full resize-none border-none outline-none ${colors.bg} ${colors.text} text-sm`}
              placeholder="메모 내용 입력..."
            />
          ) : (
            <p className={`${colors.text} text-sm whitespace-pre-wrap break-words`}>
              {note.content}
            </p>
          )}
        </div>

        {/* 푸터 (흰색 통일, 고정 높이) */}
        <div className="px-3 py-2 border-t border-gray-200 bg-white flex-shrink-0" style={{ minHeight: '80px' }}>
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span className="font-medium">{note.author_name}</span>
            <span>{new Date(note.updated_at).toLocaleDateString('ko-KR')}</span>
          </div>
          {/* 태그 (고정 높이 영역) */}
          <div className="min-h-[40px]">
            {note.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 text-xs rounded border"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : '#f3f4f620',
                      borderColor: tag.color || '#d1d5db',
                      color: tag.color || '#374151',
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="h-[24px]" /> // 빈 공간 확보
            )}
            {/* 태그 편집 버튼 */}
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTagSelector(!showTagSelector)
                }}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                태그 편집
              </button>
            )}
          </div>
        </div>

        {/* 리사이즈 핸들 (오른쪽 아래 모서리) */}
        {!disabled && !note.is_locked && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%)',
            }}
          />
        )}
      </div>

      {/* 컨텍스트 메뉴 */}
      {showMenu && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowMenu(false)}
          />
          {/* 메뉴 */}
          <div
            className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]"
            style={{
              left: note.x + 20,
              top: note.y + 40,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 색상 변경 */}
            <div className="px-4 py-2 text-sm font-medium text-gray-700">색상 변경</div>
            <div className="px-4 py-2 flex space-x-2">
              {Object.entries(colorMap).map(([color, { bg }]) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-6 h-6 rounded ${bg} border-2 ${
                    note.color === color ? 'border-blue-500' : 'border-gray-300'
                  } hover:scale-110 transition-transform`}
                />
              ))}
            </div>

            <hr className="my-2" />

            {/* 중요도 변경 */}
            <div className="px-4 py-2 text-sm font-medium text-gray-700">중요도 변경</div>
            {['low', 'medium', 'high'].map((imp) => {
              const badge = importanceBadge[imp]
              return (
                <button
                  key={imp}
                  onClick={() => handleImportanceChange(imp)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                  {note.importance === imp && <span className="ml-auto text-blue-500">✓</span>}
                </button>
              )
            })}

            <hr className="my-2" />

            {/* 잠금/해제 */}
            <button
              onClick={handleToggleLock}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                {note.is_locked ? (
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                )}
              </svg>
              <span>{note.is_locked ? '잠금 해제' : '잠금'}</span>
            </button>
          </div>
        </>
      )}

      {/* 태그 선택 모달 */}
      {showTagSelector && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowTagSelector(false)}
          />
          {/* 태그 선택 패널 */}
          <div
            className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[250px] max-w-[300px]"
            style={{
              left: note.x + note.width + 10,
              top: note.y,
              maxHeight: '400px',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-medium text-gray-900 mb-3">태그 선택</h4>
            <div className="space-y-2 mb-4">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => handleToggleTag(tag.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span
                    className="px-2 py-0.5 text-xs rounded border flex-1"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : '#f3f4f620',
                      borderColor: tag.color || '#d1d5db',
                      color: tag.color || '#374151',
                    }}
                  >
                    {tag.name}
                  </span>
                </label>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-gray-500">등록된 태그가 없습니다</p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowTagSelector(false)}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveTags}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
