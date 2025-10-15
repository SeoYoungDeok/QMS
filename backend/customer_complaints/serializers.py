from rest_framework import serializers
from .models import CustomerComplaint
from nonconformance.models import DefectType, DefectCause
from audit.models import AuditLog
from decimal import Decimal


class CustomerComplaintSerializer(serializers.ModelSerializer):
    """고객 불만 시리얼라이저 (생성/수정용)"""
    
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    defect_type_name = serializers.CharField(source='defect_type_code.name', read_only=True)
    cause_name = serializers.CharField(source='cause_code.name', read_only=True)
    cause_category = serializers.CharField(source='cause_code.category', read_only=True)
    cause_category_display = serializers.CharField(source='cause_code.get_category_display', read_only=True)
    
    class Meta:
        model = CustomerComplaint
        fields = [
            'id', 'ccr_uid', 'occurrence_date', 'ccr_no',
            'vendor', 'product_name', 'defect_qty', 'unit_price',
            'total_amount', 'complaint_content', 'action_content', 'action_completed',
            'defect_type_code', 'defect_type_name', 'cause_code', 'cause_name',
            'cause_category', 'cause_category_display',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'ccr_uid', 'total_amount', 
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
    
    def validate_complaint_content(self, value):
        """고객 불만 내용 검증 (필수)"""
        if not value or not value.strip():
            raise serializers.ValidationError("고객 불만 내용은 필수입니다.")
        return value.strip()
    
    def validate_defect_type_code(self, value):
        """불량유형 코드 검증"""
        if not DefectType.objects.filter(code=value.code).exists():
            raise serializers.ValidationError("존재하지 않는 불량유형 코드입니다.")
        return value
    
    def validate_cause_code(self, value):
        """발생원인 코드 검증"""
        if not DefectCause.objects.filter(code=value.code).exists():
            raise serializers.ValidationError("존재하지 않는 발생원인 코드입니다.")
        return value
    
    def create(self, validated_data):
        """고객 불만 생성 시 감사 로그 기록"""
        complaint = super().create(validated_data)
        
        # 감사 로그 기록
        request = self.context.get('request')
        if request:
            AuditLog.log_action(
                user=request.user,
                action='CREATE_CUSTOMER_COMPLAINT',
                target_id=str(complaint.id),
                details=f"고객 불만 등록: {complaint.ccr_no} - {complaint.vendor} - {complaint.product_name}",
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
        
        return complaint
    
    def update(self, instance, validated_data):
        """고객 불만 수정 시 감사 로그 기록"""
        # 변경 사항 추적
        changes = []
        for field, new_value in validated_data.items():
            old_value = getattr(instance, field)
            if old_value != new_value:
                changes.append(f"{field}: {old_value} → {new_value}")
        
        complaint = super().update(instance, validated_data)
        
        # 감사 로그 기록
        request = self.context.get('request')
        if request and changes:
            AuditLog.log_action(
                user=request.user,
                action='UPDATE_CUSTOMER_COMPLAINT',
                target_id=str(complaint.id),
                details=f"고객 불만 수정: {complaint.ccr_no} - 변경사항: {', '.join(changes[:3])}{'...' if len(changes) > 3 else ''}",
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
        
        return complaint


class CustomerComplaintListSerializer(serializers.ModelSerializer):
    """고객 불만 목록용 시리얼라이저 (최적화)"""
    
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    defect_type_name = serializers.CharField(source='defect_type_code.name', read_only=True)
    cause_name = serializers.CharField(source='cause_code.name', read_only=True)
    cause_category = serializers.CharField(source='cause_code.category', read_only=True)
    cause_category_display = serializers.CharField(source='cause_code.get_category_display', read_only=True)
    
    class Meta:
        model = CustomerComplaint
        fields = [
            'id', 'ccr_uid', 'occurrence_date', 'ccr_no',
            'vendor', 'product_name', 'defect_qty', 'unit_price',
            'total_amount', 'defect_type_code', 'defect_type_name',
            'cause_code', 'cause_name', 'cause_category', 'cause_category_display',
            'action_content', 'action_completed', 'created_by', 'created_by_name', 'created_at'
        ]


class CustomerComplaintCreateSerializer(serializers.ModelSerializer):
    """고객 불만 생성 전용 시리얼라이저"""
    
    class Meta:
        model = CustomerComplaint
        fields = [
            'occurrence_date', 'ccr_no', 'vendor', 'product_name',
            'defect_qty', 'unit_price', 'complaint_content', 'action_content', 'action_completed',
            'defect_type_code', 'cause_code'
        ]
    
    def validate_defect_qty(self, value):
        if value < 1:
            raise serializers.ValidationError("부적합 수량은 1 이상이어야 합니다.")
        return value
    
    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("단가는 0 이상이어야 합니다.")
        return value
    
    def validate_complaint_content(self, value):
        """고객 불만 내용 검증 (필수)"""
        if not value or not value.strip():
            raise serializers.ValidationError("고객 불만 내용은 필수입니다.")
        return value.strip()

