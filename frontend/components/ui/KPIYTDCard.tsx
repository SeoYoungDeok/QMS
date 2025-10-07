'use client'

import { SparklineData } from '@/lib/api'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KPIYTDCardProps {
  title: string
  value: string | number
  unit: string
  progress?: {
    current: number
    target: number
    percentage: number
  }
  sparklineData?: SparklineData[]
  className?: string
}

export default function KPIYTDCard({
  title,
  value,
  unit,
  progress,
  sparklineData,
  className = '',
}: KPIYTDCardProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-50'
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
          {unit}
        </span>
      </div>

      {/* 메인 값 */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value} {title === 'F-COST (YTD)' ? '천원' : unit}</p>
      </div>

      {/* 진행률 */}
      {progress && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium ${getProgressColor(progress.percentage)}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>진행률 {progress.percentage.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* 프로그레스 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(progress.percentage)}`}
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>목표: {progress.target.toLocaleString()}{unit}</span>
            <span>현재: {progress.current.toLocaleString()}{unit}</span>
          </div>
        </div>
      )}

      {/* 스파크라인 */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-12 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent-primary)"
                strokeWidth={2}
                dot={false}
                animationDuration={500}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

