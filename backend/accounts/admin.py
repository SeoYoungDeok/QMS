from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'name', 'department', 'position', 'role_level', 'status', 'created_at', 'last_login_at']
    list_filter = ['role_level', 'status', 'department', 'position']
    search_fields = ['username', 'name', 'department', 'position']
    readonly_fields = ['created_at', 'updated_at', 'last_login_at', 'last_failed_at', 'failed_attempts']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('username', 'name', 'department', 'position', 'phone_number')
        }),
        ('권한 및 상태', {
            'fields': ('role_level', 'status')
        }),
        ('로그인 정보', {
            'fields': ('failed_attempts', 'last_failed_at', 'last_login_at'),
            'classes': ('collapse',)
        }),
        ('생성/수정 일시', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # 수정 시
            return self.readonly_fields + ['username']  # 아이디는 수정 불가
        return self.readonly_fields