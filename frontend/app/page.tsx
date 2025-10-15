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
  const [defectTypeYTDData, setDefectTypeYTDData] = useState<DefectTypeDistribution[]>([])
  const [defectCauseYTDData, setDefectCauseYTDData] = useState<DefectCauseDistribution[]>([])
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

      // 불량 유형 연간 누적 분포
      const typeYTDResponse = await dashboardAPI.getDefectTypeYTDDistribution(selectedYear, selectedMonth, defectMetric)
      setDefectTypeYTDData(typeYTDResponse.data.data)

      // 발생 원인 연간 누적 분포
      const causeYTDResponse = await dashboardAPI.getDefectCauseYTDDistribution(selectedYear, selectedMonth, defectMetric)
      setDefectCauseYTDData(causeYTDResponse.data.data)

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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
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
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {kpiData && (
            <>
              {/* ========== 연간 실적 섹션 ========== */}
              <div className="mb-12 p-6 bg-white rounded-xl border border-blue-300 shadow-sm">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                          연간 실적 현황
                        </h2>
                        <p className="text-sm text-gray-600">연간 누적 실적 및 품질 추이</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUnitMode(unitMode === 'percent' ? 'ppm' : 'percent')}
                      className="text-sm px-3 py-1.5 bg-white hover:bg-gray-50 rounded-lg transition-colors font-medium shadow-sm border border-gray-200"
                    >
                      불량율 단위: {unitMode === 'percent' ? '% → ppm' : 'ppm → %'}
                    </button>
                  </div>
                </div>

                {/* 1. 연간 누적 실적 카드 (YTD) */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                    연간 누적 실적 (YTD)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <KPIYTDCard
                    title="F-COST (YTD)"
                    value={Math.round(kpiData.kpis.f_cost.ytd.actual / 1000).toLocaleString()}
                    unit="천원"
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

                {/* 2. 월별 품질 분석 그래프 */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                    월별 품질 분석 (최근 12개월)
                  </h3>
                <div className="mb-6">
                  <DefectRateTrendChart data={trendData} unitMode={unitMode} />
                </div>
                <div className="mb-6">
                  <FCostTrendChart data={fCostTrendData} />
                </div>
                  <div className="mb-6">
                    <ComplaintsTrendChart data={complaintsTrendData} />
                  </div>
                </div>

                {/* 3. 1월부터 선택된 달까지의 누적 분포 도넛 그래프 */}
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                    연간 누적 분포 ({selectedYear}년 1월 ~ {selectedMonth}월)
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DonutChart
                      title="불량 유형 누적 분포"
                      data={defectTypeYTDData.map((item) => ({
                        name: item.name,
                        value: item.value,
                      }))}
                      metric={defectMetric}
                      onMetricChange={setDefectMetric}
                    />
                    <DonutChart
                      title="발생 원인 누적 분포 (6M)"
                      data={defectCauseYTDData.map((item) => ({
                        name: item.category,
                        value: item.value,
                      }))}
                      metric={defectMetric}
                      onMetricChange={setDefectMetric}
                    />
                  </div>
                </div>
              </div>

              {/* ========== 기간 선택 섹션 ========== */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    기간 선택
                  </h2>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-purple-300 p-6">
                  <div className="mb-3">
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
                  <div>
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

              {/* ========== 월별 실적 섹션 ========== */}
              <div className="mb-12 p-6 bg-white rounded-xl border border-green-200 shadow-sm">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                        월별 실적 현황
                      </h2>
                      <p className="text-sm text-gray-600">선택된 월의 실적 및 분포 분석</p>
                    </div>
                  </div>
                </div>

                {/* 5. 월별 실적 카드 */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                    월별 실적 ({selectedYear}년 {selectedMonth}월)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <KPICard
                      title="F-COST"
                      value={Math.round(kpiData.kpis.f_cost.monthly.actual / 1000).toLocaleString()}
                      unit="천원"
                      trend={{
                        value: calculateMoM(
                          kpiData.kpis.f_cost.monthly.actual,
                          kpiData.kpis.f_cost.monthly.prev
                        ),
                        label: 'MoM',
                      }}
                      sparklineData={sparklineFCost}
                    />
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

                {/* 6. 월별 불량 유형 및 발생 원인 분포 도넛 그래프 */}
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                    월별 분포 ({selectedYear}년 {selectedMonth}월)
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DonutChart
                      title="불량 유형 분포"
                      data={defectTypeData.map((item) => ({
                        name: item.name,
                        value: item.value,
                      }))}
                      metric={defectMetric}
                      onMetricChange={setDefectMetric}
                    />
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

              {/* ========== 향후 품질 일정 섹션 ========== */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    향후 품질 일정 (14일)
                  </h2>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
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
