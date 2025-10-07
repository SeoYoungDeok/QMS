from django.contrib import admin
from .models import CustomerComplaint


@admin.register(CustomerComplaint)
class CustomerComplaintAdmin(admin.ModelAdmin):
    list_display = ['ccr_no', 'occurrence_date', 'vendor', 'product_name', 'defect_qty', 'total_amount', 'created_by', 'created_at']
    list_filter = ['occurrence_date', 'defect_type_code', 'cause_code']
    search_fields = ['ccr_no', 'vendor', 'product_name']
    readonly_fields = ['ccr_uid', 'total_amount', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('ccr_uid', 'occurrence_date', 'ccr_no', 'vendor', 'product_name')
        }),
        ('수량/금액', {
            'fields': ('defect_qty', 'unit_price', 'total_amount')
        }),
        ('불만/조치', {
            'fields': ('complaint_content', 'action_content')
        }),
        ('분류', {
            'fields': ('defect_type_code', 'cause_code')
        }),
        ('메타정보', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
