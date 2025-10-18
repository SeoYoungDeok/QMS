from django.contrib import admin
from .models import BackupRecord


@admin.register(BackupRecord)
class BackupRecordAdmin(admin.ModelAdmin):
    list_display = ['backup_date', 'backup_type', 'file_size_display', 'created_by', 'file_path']
    list_filter = ['backup_type', 'backup_date']
    search_fields = ['file_path', 'note']
    readonly_fields = ['backup_date', 'file_size', 'file_path']
    ordering = ['-backup_date']
    
    def file_size_display(self, obj):
        return obj.get_file_size_display()
    file_size_display.short_description = '파일 크기'
