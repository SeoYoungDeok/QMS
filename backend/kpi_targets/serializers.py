from rest_framework import serializers
from .models import KPITarget
from datetime import datetime


class KPITargetSerializer(serializers.ModelSerializer):
    """KPI 목표 기본 Serializer"""
    
    created_by_name = serializers.SerializerMethodField(read_only=True)
    kpi_type_display = serializers.CharField(source='get_kpi_type_display', read_only=True)
    unit_display = serializers.SerializerMethodField(read_only=True)
    
    def get_created_by_name(self, obj):
        """작성자 이름 반환"""
        if obj.created_by:
            return obj.created_by.name
        return ''
    
    def get_unit_display(self, obj):
        """단위 표시명 반환"""
        unit_map = {
            '%': '%',
            'ppm': 'ppm',
            'KRW': '원',
            'count': '건',
        }
        return unit_map.get(obj.unit, obj.unit)
    
    class Meta:
        model = KPITarget
        fields = [
            'id', 'kpi_uid', 'year', 'kpi_type', 'kpi_type_display',
            'target_value', 'unit', 'unit_display',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'kpi_uid', 'created_by', 'created_at', 'updated_at']
    
    def validate_year(self, value):
        """연도 검증: 현재 연도 ~ 과거 5년"""
        current_year = datetime.now().year
        min_year = current_year - 5
        
        if value > current_year:
            raise serializers.ValidationError(
                f"미래 연도는 등록할 수 없습니다. (최대: {current_year}년)"
            )
        
        if value < min_year:
            raise serializers.ValidationError(
                f"너무 오래된 연도입니다. (최소: {min_year}년)"
            )
        
        return value
    
    def validate_target_value(self, value):
        """목표값 검증: 0 이상"""
        if value < 0:
            raise serializers.ValidationError("목표값은 0 이상이어야 합니다.")
        return value
    
    def validate(self, data):
        """단위와 KPI 종류 일치 검증"""
        kpi_type = data.get('kpi_type')
        unit = data.get('unit')
        
        # KPI 종류별 허용 단위 정의
        valid_units = {
            'defect_rate': ['%', 'ppm'],
            'f_cost': ['KRW'],
            'complaints': ['count'],
        }
        
        if kpi_type and unit:
            allowed_units = valid_units.get(kpi_type, [])
            if unit not in allowed_units:
                raise serializers.ValidationError({
                    'unit': f"{data.get('kpi_type')}의 단위는 {', '.join(allowed_units)} 중 하나여야 합니다."
                })
        
        # 중복 검증 (생성 시 또는 수정 시 year/kpi_type 변경되는 경우)
        year = data.get('year')
        kpi_type = data.get('kpi_type')
        
        if year and kpi_type:
            # 수정 시에는 자기 자신을 제외하고 검증
            queryset = KPITarget.objects.filter(year=year, kpi_type=kpi_type)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise serializers.ValidationError({
                    'year': f"{year}년의 {self.get_kpi_type_display_name(kpi_type)} 목표가 이미 존재합니다."
                })
        
        return data
    
    def get_kpi_type_display_name(self, kpi_type):
        """KPI 종류 표시명"""
        kpi_type_map = {
            'defect_rate': '불량율',
            'f_cost': 'F-COST',
            'complaints': '고객 불만 건수',
        }
        return kpi_type_map.get(kpi_type, kpi_type)
    
    def create(self, validated_data):
        """생성 시 작성자 자동 설정"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class KPITargetListSerializer(serializers.ModelSerializer):
    """KPI 목표 목록 조회용 간소화 Serializer"""
    
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    kpi_type_display = serializers.CharField(source='get_kpi_type_display', read_only=True)
    
    class Meta:
        model = KPITarget
        fields = [
            'id', 'kpi_uid', 'year', 'kpi_type', 'kpi_type_display',
            'target_value', 'unit', 'created_by_name', 'updated_at'
        ]

