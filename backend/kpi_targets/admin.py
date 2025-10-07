from django.contrib import admin
from .models import KPITarget


@admin.register(KPITarget)
class KPITargetAdmin(admin.ModelAdmin):
    """KPI 목표 Admin 설정"""
    
    list_display = ['year', 'kpi_type', 'target_value', 'unit', 'created_by', 'updated_at']
    list_filter = ['year', 'kpi_type', 'unit']
    search_fields = ['kpi_uid', 'year']
    ordering = ['-year', 'kpi_type']
    readonly_fields = ['kpi_uid', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('kpi_uid', 'year', 'kpi_type')
        }),
        ('목표값', {
            'fields': ('target_value', 'unit')
        }),
        ('작성 정보', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
