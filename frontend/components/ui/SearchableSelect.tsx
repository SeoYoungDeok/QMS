'use client'

import { useState, useRef, useEffect } from 'react'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  onAddNew?: (value: string) => void
  addNewLabel?: string
  error?: string
  disabled?: boolean
  className?: string
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '검색 또는 선택...',
  onAddNew,
  addNewLabel = '+ 새로 추가',
  error,
  disabled = false,
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // value가 변경되면 inputValue 업데이트
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 검색어로 필터링
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value)
    setInputValue(option.value)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleAddNew = () => {
    if (onAddNew && searchTerm.trim()) {
      onAddNew(searchTerm.trim())
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSearchTerm(newValue)
    setIsOpen(true)
    
    // 입력값이 변경되면 즉시 onChange 호출
    onChange(newValue)
  }

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true)
      setSearchTerm(inputValue)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onFocus={handleInputClick}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-2 pr-10
            border rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg 
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : searchTerm.trim() && onAddNew ? (
            <div className="py-1">
              <button
                type="button"
                onClick={handleAddNew}
                className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                {addNewLabel}: "{searchTerm}"
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm">
              {searchTerm ? '검색 결과가 없습니다' : '옵션이 없습니다'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

