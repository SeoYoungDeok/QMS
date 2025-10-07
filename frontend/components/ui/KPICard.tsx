'use client'

import { SparklineData } from '@/lib/api'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KPICardProps {
  title: string
  value: string | number
  unit: string
  trend?: {
    value: number
    label: string
  }
  sparklineData?: SparklineData[]
  className?: string
}

export default function KPICard({
  title,
  value,
  unit,
  trend,
  sparklineData,
  className = '',
}: KPICardProps) {
  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return 'text-red-600 bg-red-50'
    if (trendValue < 0) return 'text-green-600 bg-green-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      )
    }
    if (trendValue < 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
          {unit}
        </span>
      </div>

      {/* 메인 값 */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value} {title === 'F-COST' ? '천원' : unit}</p>
      </div>

      {/* 트렌드 배지 */}
      {trend && (
        <div className="mb-4">
          <div className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium ${getTrendColor(trend.value)}`}>
            {getTrendIcon(trend.value)}
            <span>
              {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
            <span className="text-xs opacity-75">({trend.label})</span>
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

