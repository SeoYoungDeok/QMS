from rest_framework import serializers
from .models import PerformanceRecord, Vendor, Producer
from audit.models import AuditLog


class VendorSerializer(serializers.ModelSerializer):
    """업체명 시리얼라이저"""
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class ProducerSerializer(serializers.ModelSerializer):
    """생산처 시리얼라이저"""
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = Producer
        fields = ['id', 'name', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

class PerformanceRecordSerializer(serializers.ModelSerializer):
    """실적 기록 시리얼라이저"""
    
    weekday = serializers.CharField(source='get_weekday_display_korean', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = PerformanceRecord
        fields = [
            'id', 'record_uid', 'type', 'date', 'vendor', 'product_name',
            'control_no', 'quantity', 'producer', 'weekday_code', 'weekday',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'record_uid', 'weekday_code', 'created_by', 'created_at', 'updated_at']
    
    def validate_quantity(self, value):
        """수량 검증"""
        if value < 1:
            raise serializers.ValidationError("수량은 1 이상이어야 합니다.")
        return value
    
    def validate_producer(self, value):
        """생산처 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("생산처는 필수 입력 항목입니다.")
        return value.strip()
    
    def create(self, validated_data):
        """실적 생성 시 감사 로그 기록"""
        performance = super().create(validated_data)
        
        # 감사 로그 기록
        request = self.context.get('request')
        if request:
            AuditLog.log_action(
                user=request.user,
                action='CREATE_PERFORMANCE',
                target_id=str(performance.id),
                details=f"실적 등록: {performance.get_type_display()} - {performance.vendor} - {performance.product_name}",
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
        
        return performance
    
    def update(self, instance, validated_data):
        """실적 수정 시 감사 로그 기록"""
        old_data = {
            'vendor': instance.vendor,
            'product_name': instance.product_name,
            'quantity': instance.quantity,
            'producer': instance.producer
        }
        
        performance = super().update(instance, validated_data)
        
        # 감사 로그 기록
        request = self.context.get('request')
        if request:
            changes = []
            for field, old_value in old_data.items():
                new_value = getattr(performance, field)
                if old_value != new_value:
                    changes.append(f"{field}: {old_value} → {new_value}")
            
            if changes:
                AuditLog.log_action(
                    user=request.user,
                    action='UPDATE_PERFORMANCE',
                    target_id=str(performance.id),
                    details=f"실적 수정: {', '.join(changes)}",
                    ip_address=request.META.get('REMOTE_ADDR', '')
                )
        
        return performance


class PerformanceCreateSerializer(serializers.ModelSerializer):
    """실적 생성용 시리얼라이저"""
    
    class Meta:
        model = PerformanceRecord
        fields = [
            'type', 'date', 'vendor', 'product_name',
            'control_no', 'quantity', 'producer'
        ]
    
    def validate_quantity(self, value):
        """수량 검증"""
        if value < 1:
            raise serializers.ValidationError("수량은 1 이상이어야 합니다.")
        return value
    
    def validate_producer(self, value):
        """생산처 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("생산처는 필수 입력 항목입니다.")
        return value.strip()


class PerformanceBulkCreateSerializer(serializers.Serializer):
    """일괄 실적 등록용 시리얼라이저"""
    
    rows = PerformanceCreateSerializer(many=True)
    transaction = serializers.ChoiceField(
        choices=[('partial', '부분 저장'), ('full', '전체 롤백')],
        default='partial'
    )
    
    def validate_rows(self, value):
        """행 데이터 검증"""
        if not value:
            raise serializers.ValidationError("등록할 데이터가 없습니다.")
        
        if len(value) > 1000:
            raise serializers.ValidationError("한 번에 등록 가능한 최대 행 수는 1,000개입니다.")
        
        return value


class PerformanceListSerializer(serializers.ModelSerializer):
    """실적 목록용 시리얼라이저"""
    
    weekday = serializers.CharField(source='get_weekday_display_korean', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = PerformanceRecord
        fields = [
            'id', 'record_uid', 'type', 'type_display', 'date', 'vendor',
            'product_name', 'control_no', 'quantity', 'producer',
            'weekday_code', 'weekday', 'created_by_name', 'created_at'
        ]
