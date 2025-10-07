from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'action', 'target_id', 'ip_address', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['user_id__username', 'user_id__name', 'details', 'ip_address']
    readonly_fields = ['user_id', 'action', 'target_id', 'details', 'ip_address', 'created_at']
    
    def has_add_permission(self, request):
        """감사 로그는 수동 추가 불가"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """감사 로그는 수정 불가"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """감사 로그는 삭제 불가 (감사 목적)"""
        return False