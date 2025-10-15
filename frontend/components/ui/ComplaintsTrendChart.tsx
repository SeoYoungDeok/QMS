'use client'

import { ComplaintsTrendData } from '@/lib/api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface ComplaintsTrendChartProps {
  data: ComplaintsTrendData[]
  className?: string
}

export default function ComplaintsTrendChart({ data, className = '' }: ComplaintsTrendChartProps) {
  // 누적값 계산 (ytd_data 사용)
  const dataWithCumulative = data.map(item => {
    let cumulative = null
    
    // ytd_data가 있으면 해당 연도 1월부터의 누적 계산
    if (item.ytd_data && item.ytd_data.length > 0) {
      cumulative = item.ytd_data.reduce((acc, d) => acc + d.actual, 0)
    }
    
    return {
      ...item,
      cumulative: cumulative,
    }
  })

  // 연도가 바뀌는 지점 찾기 (1월인 지점)
  const yearChangeIndices: number[] = []
  dataWithCumulative.forEach((item, index) => {
    if (item.month === 1 && index > 0) {
      yearChangeIndices.push(index)
    }
  })

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        월별 고객 불만 건수 추이 (최근 12개월)
      </h3>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWithCumulative} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              label={{ value: '고객 불만 건수 (건)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#6b7280', textAnchor: 'middle' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any, name: string) => {
                if (name === '누적') {
                  return [`${value} 건 (누적)`, '']
                }
                return [`${value} 건`, '']
              }}
            />
            <Legend />
            
            {/* 연도 구분 세로선 (매년 1월) */}
            {yearChangeIndices.map((index) => (
              <ReferenceLine
                key={`year-${index}`}
                x={dataWithCumulative[index].label}
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))}
            
            <Line
              type="monotone"
              dataKey="actual"
              name="실적"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="5 2"
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
              dot={{ r: 4, fill: '#ef4444' }}
              animationDuration={500}
            />
            {/* 누적선 (보라색) */}
            <Line
              type="monotone"
              dataKey="cumulative"
              name="누적"
              stroke="#8b5cf6"
              strokeWidth={1}
              dot={{ r: 4, fill: '#8b5cf6' }}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

