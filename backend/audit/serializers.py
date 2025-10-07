from rest_framework import serializers
from .models import AuditLog
from accounts.models import User


class AuditLogSerializer(serializers.ModelSerializer):
    """감사 로그 시리얼라이저"""
    
    username = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user_id',
            'username',
            'action',
            'action_display',
            'target_id',
            'details',
            'ip_address',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_username(self, obj):
        """사용자 이름 반환"""
        if obj.user_id:
            return obj.user_id.username
        return 'System'

