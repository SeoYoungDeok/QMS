'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { backupAPI, BackupRecord, ArchivableDataStats, BackupStats } from '@/lib/api'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Download, Upload, Database, Trash2, AlertTriangle, CheckCircle, Loader2, FileUp, RefreshCw } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import Sidebar from '@/components/ui/Sidebar'
import AlertModal from '@/components/ui/AlertModal'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

export default function BackupPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([])
  const [archivableStats, setArchivableStats] = useState<ArchivableDataStats | null>(null)
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [showUploadConfirm, setShowUploadConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    backupId: number | null
    fileName: string
  }>({ isOpen: false, backupId: null, fileName: '' })
  const [restoreConfirm, setRestoreConfirm] = useState(false)

  // 권한 체크 (실무자 이상)
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (user && user.role_level < 1) {
      toast.error('백업 관리는 실무자 이상만 접근 가능합니다.')
      router.push('/')
      return
    }
    
    loadData()
  }, [user, isAuthenticated, router])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [historyResponse, archivableStatsResponse, backupStatsResponse] = await Promise.all([
        backupAPI.history(),
        backupAPI.archivableStats(),
        backupAPI.stats(),
      ])
      
      // ListAPIView는 results 배열로 감싸져 있거나 직접 배열일 수 있음
      const historyData = Array.isArray(historyResponse.data) 
        ? historyResponse.data 
        : ((historyResponse.data as any).results || [])
      
      setBackupHistory(historyData)
      setArchivableStats(archivableStatsResponse.data)
      setBackupStats(backupStatsResponse.data)
    } catch (error: any) {
      console.error('데이터 로딩 실패:', error)
      toast.error(error.response?.data?.error || '데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadBackup = async () => {
    try {
      setIsDownloading(true)
      setLoadingMessage('백업 파일 생성 중...')
      const response = await backupAPI.download()
      
      // Blob으로 파일 다운로드
      const blob = new Blob([response.data as BlobPart], { type: 'application/x-sqlite3' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // 파일명 추출 (Content-Disposition 헤더에서)
      const contentDisposition = response.headers['content-disposition']
      let filename = `db_backup_${new Date().toISOString().split('T')[0]}.sqlite3`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(`백업 파일이 다운로드되었습니다: ${filename}`)
      
      // 백업 이력 새로고침
      loadData()
    } catch (error: any) {
      console.error('백업 다운로드 실패:', error)
      toast.error(error.response?.data?.error || '백업 다운로드 중 오류가 발생했습니다.')
    } finally {
      setIsDownloading(false)
      setLoadingMessage('')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 파일 확장자 검증
      if (!file.name.endsWith('.sqlite3')) {
        toast.error('SQLite3 파일(.sqlite3)만 업로드 가능합니다.')
        return
      }
      
      // 파일 크기 검증 (1GB)
      const maxSize = 1 * 1024 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('파일 크기는 최대 1GB까지 업로드 가능합니다.')
        return
      }
      
      setSelectedFile(file)
      setShowUploadConfirm(true)
    }
  }

  const handleUploadBackup = async () => {
    if (!selectedFile) return
    
    try {
      setIsUploading(true)
      setShowUploadConfirm(false)
      setLoadingMessage('백업 파일 업로드 및 복원 중...')
      
      const response = await backupAPI.upload(selectedFile)
      
      toast.success(response.data.message)
      
      // 백업 이력 새로고침
      loadData()
      setSelectedFile(null)
      
      // 페이지 새로고침 권장
      setTimeout(() => {
        setRestoreConfirm(true)
      }, 1000)
    } catch (error: any) {
      console.error('백업 복원 실패:', error)
      toast.error(error.response?.data?.error || '백업 복원 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      setLoadingMessage('')
    }
  }

  const handleRestoreConfirm = () => {
    setRestoreConfirm(false)
    window.location.reload()
  }

  const handleSyncBackups = async () => {
    try {
      setIsSyncing(true)
      setLoadingMessage('백업 파일 동기화 중...')
      const response = await backupAPI.sync()
      
      const stats = response.data.stats
      const messages = []
      
      if (stats.orphaned_records_deleted > 0) {
        messages.push(`파일 없는 레코드 ${stats.orphaned_records_deleted}개 삭제`)
      }
      if (stats.orphaned_files_registered > 0) {
        messages.push(`레코드 없는 파일 ${stats.orphaned_files_registered}개 등록`)
      }
      if (stats.orphaned_records_deleted === 0 && stats.orphaned_files_registered === 0) {
        messages.push('백업 파일과 레코드가 이미 동기화되어 있습니다')
      }
      
      toast.success(messages.join(', '))
      
      // 데이터 새로고침
      loadData()
    } catch (error: any) {
      console.error('백업 동기화 실패:', error)
      toast.error(error.response?.data?.error || '백업 동기화 중 오류가 발생했습니다.')
    } finally {
      setIsSyncing(false)
      setLoadingMessage('')
    }
  }

  const handleDownloadBackupFile = async (backupId: number, fileName: string) => {
    try {
      setLoadingMessage('백업 파일 다운로드 중...')
      const response = await backupAPI.downloadFile(backupId)
      
      // Blob으로 파일 다운로드
      const blob = new Blob([response.data as BlobPart], { type: 'application/x-sqlite3' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // 파일명 추출
      const contentDisposition = response.headers['content-disposition']
      let downloadFileName = fileName
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) {
          downloadFileName = filenameMatch[1]
        }
      }
      
      link.setAttribute('download', downloadFileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('백업 파일이 다운로드되었습니다.')
    } catch (error: any) {
      console.error('백업 파일 다운로드 실패:', error)
      toast.error(error.response?.data?.error || '백업 파일 다운로드 중 오류가 발생했습니다.')
    } finally {
      setLoadingMessage('')
    }
  }

  const handleDeleteBackup = (backupId: number, fileName: string) => {
    setDeleteConfirm({
      isOpen: true,
      backupId,
      fileName
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.backupId) return

    try {
      await backupAPI.delete(deleteConfirm.backupId)
      toast.success('백업 파일이 삭제되었습니다.')
      
      // 백업 이력 새로고침
      loadData()
    } catch (error: any) {
      console.error('백업 삭제 실패:', error)
      toast.error(error.response?.data?.error || '백업 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleteConfirm({ isOpen: false, backupId: null, fileName: '' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 transition-all duration-300">
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />
      
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">백업 관리</h1>
          <p className="text-muted-foreground mt-2">
            데이터베이스 백업 생성, 다운로드 및 복원
          </p>
        </div>
      </div>

      {/* 보안 경고 */}
      <div className="p-4 border border-amber-500 bg-amber-50 rounded-lg flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-amber-800 text-sm">
          <strong>주의:</strong> 백업 복원 시 현재 데이터베이스의 모든 데이터가 대체됩니다. 
          복원 전 반드시 현재 데이터를 백업하시기 바랍니다.
        </div>
      </div>

      {/* 자동 백업 안내 */}
      <div className="p-4 border border-blue-500 bg-blue-50 rounded-lg flex items-start gap-3">
        <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-blue-800 text-sm">
          <strong>자동 백업:</strong> 매월 1일 자정에 자동 백업이 수행됩니다.
        </div>
      </div>

      {/* 백업 통계 */}
      {backupStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                백업 통계
              </CardTitle>
              <Button
                onClick={handleSyncBackups}
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    동기화
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              백업 파일과 데이터베이스 레코드 상태
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">총 백업 레코드</p>
                <p className="text-2xl font-bold">{backupStats.total_records}개</p>
                <p className="text-xs text-muted-foreground mt-1">
                  자동: {backupStats.auto_backups} / 수동: {backupStats.manual_backups}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">총 백업 파일</p>
                <p className="text-2xl font-bold">{backupStats.total_files}개</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(backupStats.total_size / (1024 * 1024 * 1024)).toFixed(2)} GB
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">파일 없는 레코드</p>
                <p className={`text-2xl font-bold ${backupStats.orphaned_records > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {backupStats.orphaned_records}개
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">레코드 없는 파일</p>
                <p className={`text-2xl font-bold ${backupStats.orphaned_files > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {backupStats.orphaned_files}개
                </p>
              </div>
            </div>
            {backupStats.is_synced ? (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">백업 파일과 레코드가 동기화되어 있습니다.</span>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  백업 파일과 레코드가 일치하지 않습니다. 동기화 버튼을 클릭하여 수정하세요.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 백업 다운로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              백업 다운로드
            </CardTitle>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              현재 데이터베이스를 백업 파일로 생성하고 다운로드합니다.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleDownloadBackup}
              disabled={isDownloading}
              className="w-full"
              size="lg"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  백업 생성 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  백업 파일 생성 및 다운로드
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 백업 복원 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              백업 복원
            </CardTitle>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              백업 파일을 업로드하여 데이터베이스를 복원합니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".sqlite3"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file-input"
                disabled={isUploading}
              />
              <label
                htmlFor="backup-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileUp className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  클릭하여 백업 파일 선택
                </p>
                <p className="text-xs text-muted-foreground">
                  (.sqlite3 파일, 최대 1GB)
                </p>
              </label>
            </div>
            
            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">선택된 파일:</p>
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 삭제 가능한 데이터 통계 */}
      {archivableStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              자동 삭제 대상 데이터 통계
            </CardTitle>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              매년 1월 1일 자정에 오래된 데이터가 자동으로 삭제됩니다.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">실적 (7년 이상)</p>
                <p className="text-2xl font-bold">{archivableStats.performance_records}건</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">부적합 (7년 이상)</p>
                <p className="text-2xl font-bold">{archivableStats.nonconformances}건</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">고객불만 (7년 이상)</p>
                <p className="text-2xl font-bold">{archivableStats.customer_complaints}건</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">감사로그 (1년 이상)</p>
                <p className="text-2xl font-bold">{archivableStats.audit_logs}건</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 백업 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>백업 이력</CardTitle>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            최근 백업 파일 목록입니다.
          </p>
        </CardHeader>
        <CardContent>
          {backupHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              백업 이력이 없습니다.
            </p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>백업 일시</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>파일 크기</TableHead>
                    <TableHead>생성자</TableHead>
                    <TableHead>비고</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.backup_date)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.backup_type === 'auto'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {record.backup_type_display}
                        </span>
                      </TableCell>
                      <TableCell>{record.file_size_display}</TableCell>
                      <TableCell>{record.created_by_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.note || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadBackupFile(record.id, record.file_path.split('/').pop() || record.file_path.split('\\').pop() || record.file_path)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            다운로드
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteBackup(record.id, record.file_path.split('/').pop() || record.file_path.split('\\').pop() || record.file_path)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 백업 복원 확인 다이얼로그 */}
      {showUploadConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                백업 복원 확인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-500 bg-red-50 rounded-lg">
                <div className="text-red-800 text-sm">
                  <strong>경고:</strong> 이 작업은 현재 데이터베이스를 완전히 대체합니다.
                  모든 현재 데이터가 손실될 수 있습니다. 계속하시겠습니까?
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">복원할 파일:</p>
                <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleUploadBackup}
                  disabled={isUploading}
                  variant="danger"
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      복원 중...
                    </>
                  ) : (
                    '확인 - 복원 진행'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowUploadConfirm(false)
                    setSelectedFile(null)
                  }}
                  variant="outline"
                  disabled={isUploading}
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 백업 삭제 확인 모달 */}
      <AlertModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, backupId: null, fileName: '' })}
        onConfirm={confirmDelete}
        title="백업 파일 삭제"
        message={`백업 파일 "${deleteConfirm.fileName}"을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        type="warning"
      />

      {/* 복원 후 새로고침 확인 모달 */}
      <AlertModal
        isOpen={restoreConfirm}
        onClose={() => setRestoreConfirm(false)}
        onConfirm={handleRestoreConfirm}
        title="백업 복원 완료"
        message="백업이 복원되었습니다. 변경사항을 적용하려면 페이지를 새로고침해야 합니다. 지금 새로고침하시겠습니까?"
        type="info"
      />

      {/* 로딩 오버레이 */}
      <LoadingOverlay
        isOpen={isDownloading || isUploading || isSyncing}
        message={loadingMessage}
      />
        </div>
      </main>
    </div>
  )
}

