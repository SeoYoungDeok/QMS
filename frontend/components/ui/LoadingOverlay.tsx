'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  isOpen: boolean
  message?: string
  progress?: number
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  message = '처리 중입니다...',
  progress
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          {/* 회전하는 로더 */}
          <div className="relative">
            {progress !== undefined ? (
              // 진행률 표시 (Radial Progress)
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  {/* 배경 원 */}
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  {/* 진행률 원 */}
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                    className="text-blue-600 transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                {/* 진행률 텍스트 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-700">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            ) : (
              // 무한 회전 로더
              <Loader2 className="w-24 h-24 text-blue-600 animate-spin" />
            )}
          </div>

          {/* 메시지 */}
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-gray-800">
              {message}
            </p>
            <p className="text-sm text-gray-500">
              잠시만 기다려주세요...
            </p>
          </div>

          {/* 애니메이션 도트 */}
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay

