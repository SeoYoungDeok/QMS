from django.contrib import admin
from .models import PerformanceRecord, Vendor, Producer


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'created_at', 'updated_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']


@admin.register(Producer)
class ProducerAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'created_at', 'updated_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']


@admin.register(PerformanceRecord)
class PerformanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        'record_uid', 'type', 'date', 'vendor', 'product_name', 
        'control_no', 'quantity', 'producer', 'weekday_code',
        'created_by', 'created_at'
    ]
    list_filter = ['type', 'date', 'weekday_code', 'producer', 'created_at']
    search_fields = ['vendor', 'product_name', 'control_no', 'producer']
    readonly_fields = ['record_uid', 'weekday_code', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('실적 정보', {
            'fields': ('type', 'date', 'vendor', 'product_name', 'control_no')
        }),
        ('수량 및 생산처', {
            'fields': ('quantity', 'producer')
        }),
        ('시스템 정보', {
            'fields': ('record_uid', 'weekday_code', 'created_by'),
            'classes': ('collapse',)
        }),
        ('타임스탬프', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # 새로 생성하는 경우
            obj.created_by = request.user
        super().save_model(request, obj, form, change)