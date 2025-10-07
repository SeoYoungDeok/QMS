'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { performanceAPI, nonconformanceAPI, customerComplaintAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Sidebar from '@/components/ui/Sidebar'
import Modal from '@/components/ui/Modal'
import { toast, Toaster } from 'sonner'

type TabType = 'performance' | 'nonconformance' | 'complaints'

interface MonthData {
  year: number
  month: number
  label: string
  isFuture: boolean
}

interface YearGroup {
  year: number
  months: MonthData[]
}

export default function DataDownloadPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('performance')
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  
  // 알림 모달 상태
  const [showNoDataModal, setShowNoDataModal] = useState(false)
  const [noDataMessage, setNoDataMessage] = useState('')

  // 최근 5개년(60개월) 목록 생성 - 연도별로 그룹화
  // 월이 바뀌면 자동으로 업데이트되도록 주기적 체크
  useEffect(() => {
    const updateMonthList = () => {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1 // 1-12
      
      // 5개년 데이터 생성 (현재 연도부터 4년 전까지)
      const groups: YearGroup[] = []
      
      for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
        const year = currentYear - yearOffset
        const months: MonthData[] = []
        
        // 각 연도의 12개월 생성 (12월부터 1월 순서로)
        for (let month = 12; month >= 1; month--) {
          // 현재 연도의 경우 모든 달 표시 (미래 달도 포함)
          // 과거 연도의 경우 모든 달 표시
          const isFuture = (year === currentYear && month > currentMonth)
          
          months.push({
            year,
            month,
            label: `${String(month).padStart(2, '0')}월`,
            isFuture
          })
        }
        
        groups.push({
          year,
          months
        })
      }
      
      setYearGroups(groups)
    }
    
    // 초기 실행
    updateMonthList()
    
    // 1시간마다 업데이트 (월이 바뀌었는지 체크)
    const interval = setInterval(updateMonthList, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // CSV 다운로드 핸들러
  const handleDownload = async (year: number, month: number) => {
    const key = `${year}-${month}`
    setDownloading(key)

    try {
      let response
      let filename
      
      if (activeTab === 'performance') {
        response = await performanceAPI.exportCSV(year, month)
        filename = `performance_${year}_${String(month).padStart(2, '0')}.csv`
      } else if (activeTab === 'nonconformance') {
        response = await nonconformanceAPI.exportCSV(year, month)
        filename = `nonconformance_${year}_${String(month).padStart(2, '0')}.csv`
      } else {
        response = await customerComplaintAPI.exportCSV(year, month)
        filename = `customer_complaints_${year}_${String(month).padStart(2, '0')}.csv`
      }

      // Blob 다운로드
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv; charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`${year}년 ${month}월 데이터가 다운로드되었습니다.`)
    } catch (error: any) {
      // 404 에러는 정상적인 케이스이므로 콘솔 에러를 출력하지 않음
      if (error.response?.status === 404) {
        setNoDataMessage(`${year}년 ${month}월에 입력된 데이터가 없습니다.`)
        setShowNoDataModal(true)
      } else if (error.response?.data) {
        console.error('Download error:', error)
        // Blob 응답을 텍스트로 변환하여 에러 메시지 추출
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string)
            if (errorData.error) {
              setNoDataMessage(errorData.error)
              setShowNoDataModal(true)
            } else {
              toast.error('데이터 다운로드에 실패했습니다.')
            }
          } catch {
            toast.error('데이터 다운로드에 실패했습니다.')
          }
        }
        reader.readAsText(error.response.data)
      } else {
        console.error('Download error:', error)
        toast.error('데이터 다운로드에 실패했습니다.')
      }
    } finally {
      setDownloading(null)
    }
  }

  // 탭 제목 반환
  const getTabTitle = () => {
    switch (activeTab) {
      case 'performance':
        return '실적 다운로드'
      case 'nonconformance':
        return '부적합 내역 다운로드'
      case 'complaints':
        return '고객 불만 내역 다운로드'
      default:
        return ''
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">로그인이 필요합니다</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              데이터 다운로드 기능을 사용하려면 로그인해주세요.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              데이터 다운로드
            </h1>
            <p className="text-[var(--text-secondary)]">
              최근 5개년의 실적, 부적합, 고객 불만 데이터를 월별로 CSV 파일을 다운로드하세요
            </p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'performance'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              실적 다운로드
            </button>
            <button
              onClick={() => setActiveTab('nonconformance')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'nonconformance'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              부적합 내역 다운로드
            </button>
            <button
              onClick={() => setActiveTab('complaints')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'complaints'
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              고객 불만 내역 다운로드
            </button>
          </div>

          {/* 연도별 다운로드 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>{getTabTitle()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {yearGroups.map((yearGroup) => (
                  <div key={yearGroup.year} className="border rounded-lg overflow-hidden">
                    {/* 연도 헤더 - 연한 색상으로 개선 */}
                    <div className="bg-gradient-to-r from-indigo-200 to-indigo-200 px-4 py-2.5 border-b">
                      <h3 className="text-lg font-bold text-gray-700">
                        {yearGroup.year}년
                      </h3>
                    </div>
                    
                    {/* 월별 그리드 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3 bg-gray-50">
                      {yearGroup.months.map((item) => {
                        const key = `${item.year}-${item.month}`
                        const isDownloading = downloading === key
                        
                        return (
                          <button
                            key={key}
                            onClick={() => !item.isFuture && handleDownload(item.year, item.month)}
                            disabled={isDownloading || item.isFuture}
                            className={`
                              relative px-3 py-2.5 rounded-md text-sm font-medium
                              transition-all duration-200
                              ${item.isFuture 
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                : isDownloading
                                  ? 'bg-[var(--accent-primary)] text-white'
                                  : 'bg-white text-gray-700 hover:bg-[var(--accent-primary)] hover:text-white hover:shadow-md'
                              }
                            `}
                          >
                            {isDownloading ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1">
                                {item.label}
                                {!item.isFuture && (
                                  <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Toast 알림 */}
      <Toaster position="top-right" richColors />

      {/* 데이터 없음 알림 모달 */}
      <Modal
        isOpen={showNoDataModal}
        onClose={() => setShowNoDataModal(false)}
        title="데이터 없음"
        size="sm"
      >
        <div className="space-y-6">
          {/* 알림 아이콘 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* 메시지 */}
          <div className="text-center">
            <p className="text-gray-700">
              {noDataMessage}
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex justify-center">
            <Button
              onClick={() => setShowNoDataModal(false)}
              className="px-8"
            >
              확인
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

