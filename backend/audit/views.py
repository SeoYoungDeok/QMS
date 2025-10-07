from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    """감사 로그 페이지네이션 - 한 페이지에 20개씩"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AuditLogFilter(django_filters.FilterSet):
    """감사 로그 필터"""
    
    action = django_filters.ChoiceFilter(choices=AuditLog.ACTION_CHOICES)
    username = django_filters.CharFilter(field_name='user_id__username', lookup_expr='icontains')
    date_from = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = AuditLog
        fields = ['action', 'username', 'date_from', 'date_to']


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    감사 로그 조회 API
    - 읽기 전용 (생성/수정/삭제 불가)
    - 관리자만 접근 가능
    - 페이지네이션: 20개씩
    """
    
    queryset = AuditLog.objects.all().select_related('user_id')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AuditLogPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ['details', 'ip_address']
    ordering_fields = ['created_at', 'action']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """관리자만 전체 로그 조회 가능"""
        user = self.request.user
        
        # 관리자(role_level=2)는 모든 로그 조회 가능
        if user.role_level >= 2:
            return self.queryset
        
        # 일반 사용자는 자신의 로그만 조회 가능
        return self.queryset.filter(user_id=user)
