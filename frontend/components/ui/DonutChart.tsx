'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface DonutChartProps {
  title: string
  data: Array<{ name: string; value: number; color?: string }>
  metric: 'count' | 'amount'
  onMetricChange?: (metric: 'count' | 'amount') => void
  className?: string
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // green
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
]

export default function DonutChart({
  title,
  data,
  metric,
  onMetricChange,
  className = '',
}: DonutChartProps) {
  const formatValue = (value: number) => {
    if (metric === 'amount') {
      // 천원 단위로 변환하고 반올림하여 정수로 표시
      return `${Math.round(value / 1000).toLocaleString()}`
    }
    return value.toString()
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-[var(--text-primary)]">{data.name}</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {metric === 'amount' 
              ? `${Math.round(data.value / 1000).toLocaleString()} 천원` 
              : `${data.value} 건`
            }
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        
        {onMetricChange && (
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onMetricChange('count')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                metric === 'count'
                  ? 'bg-white text-[var(--text-primary)] font-medium shadow-sm'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              건수
            </button>
            <button
              onClick={() => onMetricChange('amount')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                metric === 'amount'
                  ? 'bg-white text-[var(--text-primary)] font-medium shadow-sm'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              금액
            </button>
          </div>
        )}
      </div>

      {/* 차트 */}
      {data.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={(entry: any) => {
                  const formattedValue = formatValue(entry.value)
                  const unit = metric === 'amount' ? '천원' : '건'
                  return `${entry.name}: ${formattedValue}${unit}`
                }}
                labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                animationDuration={500}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-[var(--text-secondary)]">
          <p>데이터가 없습니다</p>
        </div>
      )}
    </div>
  )
}

