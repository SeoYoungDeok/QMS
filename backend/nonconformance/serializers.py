from rest_framework import serializers
from .models import Nonconformance, DefectType, DefectCause
from audit.models import AuditLog
from decimal import Decimal


class DefectTypeSerializer(serializers.ModelSerializer):
    """불량 유형 시리얼라이저"""
    
    class Meta:
        model = DefectType
        fields = ['code', 'name', 'description']


class DefectCauseSerializer(serializers.ModelSerializer):
    """발생 원인 시리얼라이저"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = DefectCause
        fields = ['code', 'category', 'category_display', 'name', 'description']


class NonconformanceSerializer(serializers.ModelSerializer):
    """부적합 시리얼라이저 (생성/수정용)"""
    
    # Read-only 필드들 (응답용)
    weekday = serializers.CharField(source='get_weekday_display_korean', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    defect_type_name = serializers.CharField(source='defect_type_code.name', read_only=True)
    cause_name = serializers.CharField(source='cause_code.name', read_only=True)
    cause_category = serializers.CharField(source='cause_code.category', read_only=True)
    cause_category_display = serializers.CharField(source='cause_code.get_category_display', read_only=True)
    
    # 외래키 필드를 문자열 코드로 변환 (입력/출력 모두)
    defect_type_code = serializers.SlugRelatedField(
        slug_field='code',
        queryset=DefectType.objects.all()
    )
    cause_code = serializers.SlugRelatedField(
        slug_field='code',
        queryset=DefectCause.objects.all()
    )
    
    class Meta:
        model = Nonconformance
        fields = [
            'id', 'ncr_uid', 'type', 'type_display', 'occurrence_date', 'ncr_no',
            'vendor', 'product_name', 'control_no', 'defect_qty', 'unit_price',
            'weight_factor', 'total_amount', 'detection_stage',
            'defect_type_code', 'defect_type_name', 'cause_code', 'cause_name',
            'cause_category', 'cause_category_display',
            'why1', 'why2', 'why3', 'why4', 'why5', 'root_cause',
            'operators', 'process_name', 'weekday_code', 'weekday', 'note',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'ncr_uid', 'total_amount', 'weekday_code', 
            'created_by', 'created_at', 'updated_at'
        ]
    
    def validate_defect_qty(self, value):
        """부적합 수량 검증"""
        if value < 1:
            raise serializers.ValidationError("부적합 수량은 1 이상이어야 합니다.")
        return value
    
    def validate_unit_price(self, value):
        """단가 검증"""
        if value < 0:
            raise serializers.ValidationError("단가는 0 이상이어야 합니다.")
        return value
    
    def validate_weight_factor(self, value):
        """가중치 검증"""
        if not (Decimal('0') <= value <= Decimal('1')):
            raise serializers.ValidationError("가중치는 0과 1 사이의 값이어야 합니다.")
        return value
    
    
    def validate_operators(self, value):
        """작업자 JSON 검증"""
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError("작업자는 배열 형태여야 합니다.")
        return value
    
    def create(self, validated_data):
        """부적합 생성 시 감사 로그 기록"""
        nonconformance = super().create(validated_data)
        
        # 감사 로그 기록
        request = self.context.get('request')
        if request:
            AuditLog.log_action(
                user=request.user,
                action='CREATE_NONCONFORMANCE',
                target_id=str(nonconformance.id),
                details=f"부적합 등록: {nonconformance.get_type_display()} - {nonconformance.vendor} - {nonconformance.product_name}",
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
        
        return nonconformance
    
    def update(self, instance, validated_data):
        """부적합 수정 시 감사 로그 기록"""
        # 변경 사항 추적
        changes = []
        for field, new_value in validated_data.items():
            old_value = getattr(instance, field)
            if old_value != new_value:
                changes.append(f"{field}: {old_value} → {new_value}")
        
        nonconformance = super().update(instance, validated_data)
        
        # 감사 로그 기록
        request = self.context.get('request')
        if request and changes:
            AuditLog.log_action(
                user=request.user,
                action='UPDATE_NONCONFORMANCE',
                target_id=str(nonconformance.id),
                details=f"부적합 수정: {nonconformance.ncr_no} - 변경사항: {', '.join(changes[:3])}{'...' if len(changes) > 3 else ''}",
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
        
        return nonconformance


class NonconformanceListSerializer(serializers.ModelSerializer):
    """부적합 목록용 시리얼라이저 (최적화)"""
    
    weekday = serializers.CharField(source='get_weekday_display_korean', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    defect_type_code = serializers.CharField(source='defect_type_code.code', read_only=True)
    defect_type_name = serializers.CharField(source='defect_type_code.name', read_only=True)
    cause_code = serializers.CharField(source='cause_code.code', read_only=True)
    cause_name = serializers.CharField(source='cause_code.name', read_only=True)
    cause_category_display = serializers.CharField(source='cause_code.get_category_display', read_only=True)
    
    class Meta:
        model = Nonconformance
        fields = [
            'id', 'ncr_uid', 'type', 'type_display', 'occurrence_date', 'ncr_no',
            'vendor', 'product_name', 'control_no', 'defect_qty', 'unit_price',
            'weight_factor', 'total_amount', 'detection_stage',
            'defect_type_code', 'defect_type_name', 'cause_code', 'cause_name',
            'cause_category_display',
            'why1', 'why2', 'why3', 'why4', 'why5', 'root_cause',
            'operators', 'process_name', 'note',
            'weekday_code', 'weekday',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]


class NonconformanceCreateSerializer(serializers.ModelSerializer):
    """부적합 생성 전용 시리얼라이저"""
    
    # 외래키 필드를 문자열 코드로 변환
    defect_type_code = serializers.SlugRelatedField(
        slug_field='code',
        queryset=DefectType.objects.all()
    )
    cause_code = serializers.SlugRelatedField(
        slug_field='code',
        queryset=DefectCause.objects.all()
    )
    
    class Meta:
        model = Nonconformance
        fields = [
            'type', 'occurrence_date', 'ncr_no', 'vendor', 'product_name',
            'control_no', 'defect_qty', 'unit_price', 'weight_factor',
            'detection_stage', 'defect_type_code', 'cause_code',
            'why1', 'why2', 'why3', 'why4', 'why5', 'root_cause',
            'operators', 'process_name', 'note'
        ]
    
    def validate_defect_qty(self, value):
        if value < 1:
            raise serializers.ValidationError("부적합 수량은 1 이상이어야 합니다.")
        return value
    
    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("단가는 0 이상이어야 합니다.")
        return value
    
    def validate_weight_factor(self, value):
        if not (Decimal('0') <= value <= Decimal('1')):
            raise serializers.ValidationError("가중치는 0과 1 사이의 값이어야 합니다.")
        return value
