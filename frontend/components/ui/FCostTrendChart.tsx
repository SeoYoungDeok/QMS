'use client'

import { FCostTrendData } from '@/lib/api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface FCostTrendChartProps {
  data: FCostTrendData[]
  className?: string
}

export default function FCostTrendChart({ data, className = '' }: FCostTrendChartProps) {
  // 천원 단위로 변환된 데이터
  const transformedData = data.map(item => ({
    ...item,
    actual: item.actual / 1000,
    target: item.target ? item.target / 1000 : null,
  }))

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        월별 F-COST 추이 (최근 12개월)
      </h3>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={transformedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              label={{ value: 'F-COST (천원)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#6b7280', textAnchor: 'middle' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any) => [`${Math.round(value).toLocaleString()} 천원`, '']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              name="실적"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
              animationDuration={500}
            />
            <Line
              type="monotone"
              dataKey="target"
              name="목표"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#ef4444' }}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

