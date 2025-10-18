from django.urls import path
from . import views

app_name = 'backup_management'

urlpatterns = [
    # 백업 다운로드 (새로 생성)
    path('download/', views.download_backup, name='download-backup'),
    
    # 기존 백업 파일 다운로드
    path('download/<int:backup_id>/', views.download_backup_file, name='download-backup-file'),
    
    # 백업 업로드 및 복원
    path('upload/', views.upload_backup, name='upload-backup'),
    
    # 백업 이력 조회
    path('history/', views.BackupHistoryListView.as_view(), name='backup-history'),
    
    # 백업 파일 삭제
    path('delete/<int:backup_id>/', views.delete_backup, name='delete-backup'),
    
    # 삭제 가능한 데이터 통계
    path('archivable-stats/', views.archivable_data_stats, name='archivable-stats'),
    
    # 백업 동기화
    path('sync/', views.sync_backups, name='sync-backups'),
    
    # 백업 통계
    path('stats/', views.backup_stats, name='backup-stats'),
]

