from django.db import models
from accounts.models import User


class BackupRecord(models.Model):
    """백업 이력 추적 모델"""
    
    BACKUP_TYPE_CHOICES = [
        ('auto', '자동'),
        ('manual', '수동'),
    ]
    
    # 백업 날짜
    backup_date = models.DateTimeField(auto_now_add=True, verbose_name='백업 일시')
    
    # 파일 크기 (바이트)
    file_size = models.BigIntegerField(verbose_name='파일 크기')
    
    # 백업 유형 (자동/수동)
    backup_type = models.CharField(
        max_length=10, 
        choices=BACKUP_TYPE_CHOICES, 
        verbose_name='백업 유형'
    )
    
    # 파일 경로 (상대 경로)
    file_path = models.CharField(max_length=500, verbose_name='파일 경로')
    
    # 생성자 (자동 백업의 경우 null)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='backup_records',
        verbose_name='생성자'
    )
    
    # 비고
    note = models.TextField(blank=True, verbose_name='비고')
    
    class Meta:
        db_table = 'backup_records'
        verbose_name = '백업 이력'
        verbose_name_plural = '백업 이력 목록'
        ordering = ['-backup_date']
    
    def __str__(self):
        return f"{self.get_backup_type_display()} - {self.backup_date.strftime('%Y-%m-%d %H:%M:%S')}"
    
    def get_file_size_display(self):
        """파일 크기를 읽기 쉬운 형식으로 반환"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"
