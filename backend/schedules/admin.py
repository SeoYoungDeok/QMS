from django.contrib import admin
from .models import Schedule


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = [
        'schedule_uid', 'title', 'type', 'category', 'importance',
        'start_date', 'end_date', 'start_time', 'end_time',
        'owner', 'created_at'
    ]
    list_filter = ['type', 'category', 'importance', 'start_date', 'created_at']
    search_fields = ['title', 'description', 'schedule_uid', 'owner__name']
    readonly_fields = ['schedule_uid', 'created_at', 'updated_at']
    ordering = ['-start_date', '-start_time']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('schedule_uid', 'type', 'category', 'title', 'description', 'importance')
        }),
        ('일시 정보', {
            'fields': ('start_date', 'end_date', 'start_time', 'end_time')
        }),
        ('추가 정보', {
            'fields': ('location', 'participants', 'owner')
        }),
        ('메타데이터', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('owner')
    
    def save_model(self, request, obj, form, change):
        if not change:  # 새로 생성하는 경우
            obj.owner = request.user
        super().save_model(request, obj, form, change)