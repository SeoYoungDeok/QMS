'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import KPICard from '@/components/ui/KPICard'
import KPIYTDCard from '@/components/ui/KPIYTDCard'
import DefectRateTrendChart from '@/components/ui/DefectRateTrendChart'
import FCostTrendChart from '@/components/ui/FCostTrendChart'
import ComplaintsTrendChart from '@/components/ui/ComplaintsTrendChart'
import DonutChart from '@/components/ui/DonutChart'
import { dashboardAPI, DashboardKPIResponse, DefectRateTrendData, FCostTrendData, ComplaintsTrendData, DefectTypeDistribution, DefectCauseDistribution, SparklineData, UpcomingSchedule } from '@/lib/api'

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  // 상태 관리
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [kpiData, setKpiData] = useState<DashboardKPIResponse | null>(null)
  const [trendData, setTrendData] = useState<DefectRateTrendData[]>([])
  const [fCostTrendData, setFCostTrendData] = useState<FCostTrendData[]>([])
  const [complaintsTrendData, setComplaintsTrendData] = useState<ComplaintsTrendData[]>([])
  const [defectTypeData, setDefectTypeData] = useState<DefectTypeDistribution[]>([])
  const [defectCauseData, setDefectCauseData] = useState<DefectCauseDistribution[]>([])
  const [sparklineDefectRate, setSparklineDefectRate] = useState<SparklineData[]>([])
  const [sparklineFCost, setSparklineFCost] = useState<SparklineData[]>([])
  const [sparklineComplaints, setSparklineComplaints] = useState<SparklineData[]>([])
  const [upcomingSchedules, setUpcomingSchedules] = useState<UpcomingSchedule[]>([])
  const [defectMetric, setDefectMetric] = useState<'count' | 'amount'>('count') // 건수/금액 통합 상태
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [unitMode, setUnitMode] = useState<'percent' | 'ppm'>('percent')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData()
    }
  }, [isAuthenticated, selectedYear, selectedMonth, defectMetric])

  const loadDashboardData = async () => {
    try {
      setIsLoadingData(true)
      setError('')

      // KPI 데이터 로드
      const kpiResponse = await dashboardAPI.getKPIs(selectedYear, selectedMonth)
      setKpiData(kpiResponse.data)

      // 불량율 추이 차트 데이터
      const trendResponse = await dashboardAPI.getDefectRateTrend(selectedYear, selectedMonth)
      setTrendData(trendResponse.data.data)

      // F-COST 추이 차트 데이터
      const fCostTrendResponse = await dashboardAPI.getFCostTrend(selectedYear, selectedMonth)
      setFCostTrendData(fCostTrendResponse.data.data)

      // 고객 불만 건수 추이 차트 데이터
      const complaintsTrendResponse = await dashboardAPI.getComplaintsTrend(selectedYear, selectedMonth)
      setComplaintsTrendData(complaintsTrendResponse.data.data)

      // 불량 유형 분포
      const typeResponse = await dashboardAPI.getDefectTypeDistribution(selectedYear, selectedMonth, defectMetric)
      setDefectTypeData(typeResponse.data.data)

      // 발생 원인 분포
      const causeResponse = await dashboardAPI.getDefectCauseDistribution(selectedYear, selectedMonth, defectMetric)
      setDefectCauseData(causeResponse.data.data)

      // 스파크라인 데이터
      const [sparkDefectRate, sparkFCost, sparkComplaints] = await Promise.all([
        dashboardAPI.getSparklineData(selectedYear, selectedMonth, 'defect_rate'),
        dashboardAPI.getSparklineData(selectedYear, selectedMonth, 'f_cost'),
        dashboardAPI.getSparklineData(selectedYear, selectedMonth, 'complaints'),
      ])

      setSparklineDefectRate(sparkDefectRate.data.data)
      setSparklineFCost(sparkFCost.data.data)
      setSparklineComplaints(sparkComplaints.data.data)

      // 향후 일정
      const schedulesResponse = await dashboardAPI.getUpcomingSchedules()
      setUpcomingSchedules(schedulesResponse.data.schedules)

    } catch (error: any) {
      console.error('Dashboard data load error:', error)
      setError('대시보드 데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingData(false)
    }
  }

  const calculateMoM = (current: number, prev: number) => {
    if (prev === 0) return 0
    return ((current - prev) / prev) * 100
  }

  const calculateProgress = (actual: number, target: number) => {
    if (target === 0) return 0
    return (actual / target) * 100
  }

  const convertToUnit = (value: number) => {
    if (unitMode === 'ppm') {
      return (value * 10000).toFixed(0)
    }
    return value.toFixed(2)
  }

  const getUnitLabel = () => {
    return unitMode === 'ppm' ? 'ppm' : '%'
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

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        <div className="p-6">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">품질 대시보드</h1>
                <p className="text-[var(--text-secondary)] mt-1">Quality Management Dashboard</p>
              </div>

              <button
                onClick={loadDashboardData}
                disabled={isLoadingData}
                className="mt-4 lg:mt-0 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isLoadingData ? '로딩 중...' : '새로고침'}
              </button>
            </div>

            {/* 연도/월 선택 버튼 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {/* 연도 선택 */}
              <div className="mb-3">
                {/* <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">연도</label> */}
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i).map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedYear === year
                          ? 'bg-[var(--accent-primary)] text-white shadow-md'
                          : 'bg-gray-100 text-[var(--text-primary)] hover:bg-gray-200'
                      }`}
                    >
                      {year}년
                    </button>
                  ))}
                </div>
              </div>

              {/* 월 선택 */}
              <div>
                {/* <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">월</label> */}
                <div className="grid grid-cols-12 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        selectedMonth === month
                          ? 'bg-[var(--accent-primary)] text-white shadow-md'
                          : 'bg-gray-100 text-[var(--text-primary)] hover:bg-gray-200'
                      }`}
                    >
                      {month}월
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {kpiData && (
            <>
              {/* 상단 KPI 카드 섹션 */}
              <div className="mb-8">
                {/* 단위 토글 버튼 - 최상단에 배치 */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    연간 누적 실적 (YTD)
                  </h2>
                  <button
                    onClick={() => setUnitMode(unitMode === 'percent' ? 'ppm' : 'percent')}
                    className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    불량율 단위: {unitMode === 'percent' ? '% → ppm' : 'ppm → %'}
                  </button>
                </div>

                {/* 1행: YTD 누적 카드 */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 불량율 YTD */}
                    <KPIYTDCard
                      title="불량율 (YTD)"
                      value={convertToUnit(kpiData.kpis.defect_rate.ytd.actual_percent)}
                      unit={getUnitLabel()}
                      progress={{
                        current: kpiData.kpis.defect_rate.ytd.actual_percent,
                        target: kpiData.kpis.defect_rate.ytd.annual_target_percent,
                        percentage: calculateProgress(
                          kpiData.kpis.defect_rate.ytd.actual_percent,
                          kpiData.kpis.defect_rate.ytd.annual_target_percent
                        ),
                      }}
                      sparklineData={sparklineDefectRate}
                    />

                    {/* F-COST YTD */}
                    <KPIYTDCard
                      title="F-COST (YTD)"
                      value={Math.round(kpiData.kpis.f_cost.ytd.actual / 1000).toLocaleString()}
                      unit="KRW"
                      progress={{
                        current: kpiData.kpis.f_cost.ytd.actual,
                        target: kpiData.kpis.f_cost.ytd.annual_target,
                        percentage: calculateProgress(
                          kpiData.kpis.f_cost.ytd.actual,
                          kpiData.kpis.f_cost.ytd.annual_target
                        ),
                      }}
                      sparklineData={sparklineFCost}
                    />

                    {/* 고객 불만 건수 YTD */}
                    <KPIYTDCard
                      title="고객 불만 건수 (YTD)"
                      value={kpiData.kpis.complaints.ytd.actual}
                      unit="건"
                      progress={{
                        current: kpiData.kpis.complaints.ytd.actual,
                        target: kpiData.kpis.complaints.ytd.annual_target,
                        percentage: calculateProgress(
                          kpiData.kpis.complaints.ytd.actual,
                          kpiData.kpis.complaints.ytd.annual_target
                        ),
                      }}
                      sparklineData={sparklineComplaints}
                    />
                  </div>
                </div>

                {/* 2행: 월별 실적 카드 */}
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                    월별 실적 ({selectedYear}년 {selectedMonth}월)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 불량율 카드 */}
                    <KPICard
                      title="불량율"
                      value={convertToUnit(kpiData.kpis.defect_rate.monthly.actual_percent)}
                      unit={getUnitLabel()}
                      trend={{
                        value: calculateMoM(
                          kpiData.kpis.defect_rate.monthly.actual_percent,
                          kpiData.kpis.defect_rate.monthly.prev_percent
                        ),
                        label: 'MoM',
                      }}
                      sparklineData={sparklineDefectRate}
                    />

                    {/* F-COST 카드 */}
                    <KPICard
                      title="F-COST"
                      value={Math.round(kpiData.kpis.f_cost.monthly.actual / 1000).toLocaleString()}
                      unit="KRW"
                      trend={{
                        value: calculateMoM(
                          kpiData.kpis.f_cost.monthly.actual,
                          kpiData.kpis.f_cost.monthly.prev
                        ),
                        label: 'MoM',
                      }}
                      sparklineData={sparklineFCost}
                    />

                    {/* 고객 불만 건수 카드 */}
                    <KPICard
                      title="고객 불만 건수"
                      value={kpiData.kpis.complaints.monthly.actual}
                      unit="건"
                      trend={{
                        value: calculateMoM(
                          kpiData.kpis.complaints.monthly.actual,
                          kpiData.kpis.complaints.monthly.prev
                        ),
                        label: 'MoM',
                      }}
                      sparklineData={sparklineComplaints}
                    />
                  </div>
                </div>
              </div>

              {/* 중단 차트 섹션 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  월별 품질 분석
                </h2>
                
                {/* 불량율 추이 차트 - 전체 너비 */}
                <div className="mb-6">
                  <DefectRateTrendChart data={trendData} unitMode={unitMode} />
                </div>

                {/* F-COST 추이 차트 - 전체 너비 */}
                <div className="mb-6">
                  <FCostTrendChart data={fCostTrendData} />
                </div>

                {/* 고객 불만 건수 추이 차트 - 전체 너비 */}
                <div className="mb-6">
                  <ComplaintsTrendChart data={complaintsTrendData} />
                </div>

                {/* 불량 유형 분포 & 발생 원인 분포 - 같은 줄 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 불량 유형 분포 */}
                  <div>
                    <DonutChart
                      title="불량 유형 분포"
                      data={defectTypeData.map((item) => ({
                        name: item.name,
                        value: item.value,
                      }))}
                      metric={defectMetric}
                      onMetricChange={setDefectMetric}
                    />
                  </div>

                  {/* 발생 원인 분포 (6M) */}
                  <div>
                    <DonutChart
                      title="발생 원인 분포 (6M)"
                      data={defectCauseData.map((item) => ({
                        name: item.category,
                        value: item.value,
                      }))}
                      metric={defectMetric}
                      onMetricChange={setDefectMetric}
                    />
                  </div>
                </div>
              </div>

              {/* 하단 주요 품질 일정 */}
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  향후 품질 일정 (14일)
                </h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  {upcomingSchedules.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">{schedule.title}</p>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {schedule.schedule_date}
                                {schedule.start_time && ` ${schedule.start_time}`}
                                {schedule.location && ` · ${schedule.location}`}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              schedule.importance === 'high'
                                ? 'bg-red-100 text-red-700'
                                : schedule.importance === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {schedule.importance_display}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[var(--text-secondary)] py-8">
                      예정된 품질 일정이 없습니다
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
