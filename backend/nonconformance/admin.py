from django.contrib import admin
from .models import Nonconformance, DefectType, DefectCause


@admin.register(DefectType)
class DefectTypeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'description']
    search_fields = ['code', 'name']
    ordering = ['code']


@admin.register(DefectCause)
class DefectCauseAdmin(admin.ModelAdmin):
    list_display = ['code', 'category', 'name', 'description']
    list_filter = ['category']
    search_fields = ['code', 'name']
    ordering = ['code']


@admin.register(Nonconformance)
class NonconformanceAdmin(admin.ModelAdmin):
    list_display = [
        'ncr_no', 'type', 'occurrence_date', 'vendor', 'product_name',
        'defect_qty', 'total_amount', 'defect_type_code', 'cause_code',
        'created_by', 'created_at'
    ]
    list_filter = [
        'type', 'occurrence_date', 'defect_type_code', 'cause_code',
        'weekday_code', 'detection_stage', 'created_at'
    ]
    search_fields = [
        'ncr_no', 'vendor', 'product_name', 'control_no'
    ]
    readonly_fields = [
        'ncr_uid', 'total_amount', 'weekday_code', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'occurrence_date'
    
    fieldsets = (
        ('기본 정보', {
            'fields': (
                'ncr_uid', 'type', 'occurrence_date', 'ncr_no',
                'vendor', 'product_name', 'control_no'
            )
        }),
        ('부적합 상세', {
            'fields': (
                'defect_qty', 'unit_price', 'weight_factor', 'total_amount',
                'detection_stage', 'defect_type_code', 'cause_code'
            )
        }),
        ('5Why 분석', {
            'fields': (
                'why1', 'why2', 'why3', 'why4', 'why5', 'root_cause'
            ),
            'classes': ('collapse',)
        }),
        ('추가 정보', {
            'fields': (
                'operators', 'process_name', 'weekday_code', 'note'
            )
        }),
        ('시스템 정보', {
            'fields': (
                'created_by', 'created_at', 'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # 새로 생성하는 경우
            obj.created_by = request.user
        super().save_model(request, obj, form, change)