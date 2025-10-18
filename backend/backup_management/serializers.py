from rest_framework import serializers
from .models import BackupRecord


class BackupRecordSerializer(serializers.ModelSerializer):
    """백업 이력 시리얼라이저"""
    
    created_by_name = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    backup_type_display = serializers.CharField(source='get_backup_type_display', read_only=True)
    
    class Meta:
        model = BackupRecord
        fields = [
            'id',
            'backup_date',
            'file_size',
            'file_size_display',
            'backup_type',
            'backup_type_display',
            'file_path',
            'created_by',
            'created_by_name',
            'note',
        ]
        read_only_fields = ['id', 'backup_date', 'file_size', 'file_path']
    
    def get_created_by_name(self, obj):
        """생성자 이름 반환"""
        if obj.created_by:
            return obj.created_by.name
        return '시스템 (자동)'
    
    def get_file_size_display(self, obj):
        """파일 크기를 읽기 쉬운 형식으로 반환"""
        return obj.get_file_size_display()

