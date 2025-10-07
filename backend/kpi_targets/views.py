from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import KPITarget
from .serializers import KPITargetSerializer, KPITargetListSerializer
from audit.models import AuditLog


class IsAuthenticatedAndActive(IsAuthenticated):
    """인증되고 활성 상태인 사용자만 허용"""
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.is_active_user()


class KPITargetViewSet(viewsets.ModelViewSet):
    """
    KPI 목표 ViewSet
    
    - 게스트(0): 조회 전용
    - 실무자(1) 이상: 전체 CRUD 가능
    """
    
    queryset = KPITarget.objects.select_related('created_by').all()
    serializer_class = KPITargetSerializer
    permission_classes = [IsAuthenticatedAndActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['year', 'kpi_type']
    
    def get_serializer_class(self):
        """액션에 따라 다른 Serializer 사용"""
        if self.action == 'list':
            return KPITargetListSerializer
        return KPITargetSerializer
    
    def get_queryset(self):
        """쿼리 파라미터에 따른 필터링"""
        queryset = super().get_queryset()
        
        # years 파라미터: 여러 연도 조회 (예: ?years=2022,2023,2024)
        years_param = self.request.query_params.get('years')
        if years_param:
            try:
                years = [int(y.strip()) for y in years_param.split(',')]
                queryset = queryset.filter(year__in=years)
            except ValueError:
                pass
        
        return queryset
    
    def check_write_permission(self, request):
        """쓰기 권한 체크 (실무자 이상)"""
        if request.user.role_level < 1:
            return False
        return True
    
    def list(self, request, *args, **kwargs):
        """목록 조회 (모든 권한 허용)"""
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """상세 조회 (모든 권한 허용)"""
        return super().retrieve(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """등록 (실무자 이상)"""
        if not self.check_write_permission(request):
            return Response(
                {'error': 'KPI 목표 등록 권한이 없습니다. (실무자 이상 필요)'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # 감사 로그 기록
        try:
            AuditLog.objects.create(
                user=request.user,
                action='CREATE_KPI_TARGET',
                resource_type='KPITarget',
                resource_id=str(instance.id),
                details={
                    'kpi_uid': instance.kpi_uid,
                    'year': instance.year,
                    'kpi_type': instance.kpi_type,
                    'target_value': str(instance.target_value),
                    'unit': instance.unit
                }
            )
        except Exception as e:
            # 감사 로그 실패해도 응답은 정상 반환
            print(f"감사 로그 생성 실패: {e}")
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """수정 (실무자 이상)"""
        if not self.check_write_permission(request):
            return Response(
                {'error': 'KPI 목표 수정 권한이 없습니다. (실무자 이상 필요)'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        old_data = {
            'year': instance.year,
            'kpi_type': instance.kpi_type,
            'target_value': str(instance.target_value),
            'unit': instance.unit
        }
        
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # 감사 로그 기록
        try:
            new_data = {
                'year': instance.year,
                'kpi_type': instance.kpi_type,
                'target_value': str(instance.target_value),
                'unit': instance.unit
            }
            
            # 변경된 필드 찾기
            diff = {k: {'old': old_data[k], 'new': new_data[k]} 
                    for k in old_data if old_data[k] != new_data[k]}
            
            if diff:  # 변경사항이 있을 때만 로그 기록
                AuditLog.objects.create(
                    user=request.user,
                    action='UPDATE_KPI_TARGET',
                    resource_type='KPITarget',
                    resource_id=str(instance.id),
                    details={
                        'kpi_uid': instance.kpi_uid,
                        'diff': diff
                    }
                )
        except Exception as e:
            print(f"감사 로그 생성 실패: {e}")
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """삭제 (실무자 이상)"""
        if not self.check_write_permission(request):
            return Response(
                {'error': 'KPI 목표 삭제 권한이 없습니다. (실무자 이상 필요)'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        
        # 감사 로그 기록 (삭제 전)
        try:
            AuditLog.objects.create(
                user=request.user,
                action='DELETE_KPI_TARGET',
                resource_type='KPITarget',
                resource_id=str(instance.id),
                details={
                    'kpi_uid': instance.kpi_uid,
                    'year': instance.year,
                    'kpi_type': instance.kpi_type,
                    'target_value': str(instance.target_value),
                    'unit': instance.unit
                }
            )
        except Exception as e:
            print(f"감사 로그 생성 실패: {e}")
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'], url_path='years')
    def available_years(self, request):
        """
        사용 가능한 연도 목록 반환
        중복 제거, 내림차순 정렬
        """
        years = KPITarget.objects.values_list('year', flat=True).distinct().order_by('-year')
        return Response(list(years))
