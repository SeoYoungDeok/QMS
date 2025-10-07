import csv
from django.http import HttpResponse
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404

from .models import CustomerComplaint
from .serializers import (
    CustomerComplaintSerializer,
    CustomerComplaintListSerializer,
    CustomerComplaintCreateSerializer
)
from audit.models import AuditLog


def get_client_ip(request):
    """클라이언트 IP 주소 가져오기"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class CustomerComplaintListView(generics.ListAPIView):
    """고객 불만 목록 조회 API"""
    serializer_class = CustomerComplaintListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['defect_type_code', 'cause_code']
    search_fields = ['vendor', 'product_name', 'ccr_no']
    ordering_fields = ['occurrence_date', 'created_at', 'defect_qty', 'total_amount', 'vendor']
    ordering = ['-created_at']
    
    def get_queryset(self):
        try:
            queryset = CustomerComplaint.objects.select_related(
                'created_by', 'defect_type_code', 'cause_code'
            )
            
            # 날짜 범위 필터
            date_from = self.request.query_params.get('date_from')
            date_to = self.request.query_params.get('date_to')
            
            if date_from and date_from.strip():
                try:
                    queryset = queryset.filter(occurrence_date__gte=date_from.strip())
                except Exception:
                    pass
            
            if date_to and date_to.strip():
                try:
                    queryset = queryset.filter(occurrence_date__lte=date_to.strip())
                except Exception:
                    pass
            
            # 업체명 필터
            vendor = self.request.query_params.get('vendor')
            if vendor and vendor.strip():
                queryset = queryset.filter(vendor__icontains=vendor.strip())
            
            # 6M 카테고리 필터
            category = self.request.query_params.get('category')
            if category and category.strip():
                queryset = queryset.filter(cause_code__category=category.strip())
            
            # 조치 여부 필터
            has_action = self.request.query_params.get('has_action')
            if has_action == 'true':
                queryset = queryset.exclude(Q(action_content__isnull=True) | Q(action_content=''))
            elif has_action == 'false':
                queryset = queryset.filter(Q(action_content__isnull=True) | Q(action_content=''))
            
            return queryset
        except Exception as e:
            return CustomerComplaint.objects.none()
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'고객 불만 목록 조회 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomerComplaintDetailView(generics.RetrieveAPIView):
    """고객 불만 상세 조회 API"""
    queryset = CustomerComplaint.objects.select_related('created_by', 'defect_type_code', 'cause_code')
    serializer_class = CustomerComplaintSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'고객 불만 상세 조회 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomerComplaintCreateView(generics.CreateAPIView):
    """고객 불만 생성 API"""
    queryset = CustomerComplaint.objects.all()
    serializer_class = CustomerComplaintCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        # 실무자(1) 이상 권한 체크
        if self.request.user.role_level < 1:
            raise permissions.PermissionDenied("고객 불만 등록 권한이 없습니다.")
        
        # 작성자 자동 설정
        complaint = serializer.save(created_by=self.request.user)
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=self.request.user,
            action='CREATE_CUSTOMER_COMPLAINT',
            target_id=str(complaint.id),
            details=f"고객 불만 등록: {complaint.ccr_no} - {complaint.vendor} - {complaint.product_name}",
            ip_address=get_client_ip(self.request)
        )
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except permissions.PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'고객 불만 등록 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomerComplaintUpdateView(generics.UpdateAPIView):
    """고객 불만 수정 API"""
    queryset = CustomerComplaint.objects.all()
    serializer_class = CustomerComplaintSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def perform_update(self, serializer):
        instance = self.get_object()
        
        # 권한 체크: 실무자(1)는 본인만, 관리자(2)는 전체
        if self.request.user.role_level < 1:
            raise permissions.PermissionDenied("고객 불만 수정 권한이 없습니다.")
        
        if self.request.user.role_level == 1 and instance.created_by != self.request.user:
            raise permissions.PermissionDenied("본인이 작성한 고객 불만만 수정할 수 있습니다.")
        
        # 변경 사항 추적
        old_data = {
            'vendor': instance.vendor,
            'product_name': instance.product_name,
            'defect_qty': instance.defect_qty,
            'total_amount': instance.total_amount
        }
        
        complaint = serializer.save()
        
        # 감사 로그 기록
        changes = []
        new_data = {
            'vendor': complaint.vendor,
            'product_name': complaint.product_name,
            'defect_qty': complaint.defect_qty,
            'total_amount': complaint.total_amount
        }
        
        for key, old_value in old_data.items():
            new_value = new_data[key]
            if old_value != new_value:
                changes.append(f"{key}: {old_value} → {new_value}")
        
        if changes:
            AuditLog.log_action(
                user=self.request.user,
                action='UPDATE_CUSTOMER_COMPLAINT',
                target_id=str(complaint.id),
                details=f"고객 불만 수정: {complaint.ccr_no} - 변경사항: {', '.join(changes[:3])}",
                ip_address=get_client_ip(self.request)
            )
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except permissions.PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'고객 불만 수정 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomerComplaintDeleteView(generics.DestroyAPIView):
    """고객 불만 삭제 API (물리 삭제)"""
    queryset = CustomerComplaint.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def perform_destroy(self, instance):
        # 권한 체크: 실무자(1)는 본인만, 관리자(2)는 전체
        if self.request.user.role_level < 1:
            raise permissions.PermissionDenied("고객 불만 삭제 권한이 없습니다.")
        
        if self.request.user.role_level == 1 and instance.created_by != self.request.user:
            raise permissions.PermissionDenied("본인이 작성한 고객 불만만 삭제할 수 있습니다.")
        
        # 감사 로그 기록 (삭제 전)
        AuditLog.log_action(
            user=self.request.user,
            action='DELETE_CUSTOMER_COMPLAINT',
            target_id=str(instance.id),
            details=f"고객 불만 삭제: {instance.ccr_no} - {instance.vendor} - {instance.product_name}",
            ip_address=get_client_ip(self.request)
        )
        
        # 물리 삭제 실행
        instance.delete()
    
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except permissions.PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'고객 불만 삭제 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def customer_complaint_csv_export(request):
    """고객 불만 데이터 CSV 다운로드 API
    
    Query Parameters:
        year (str): 연도 (예: 2025)
        month (str): 월 (예: 01, 1~12)
    """
    year = request.GET.get('year')
    month = request.GET.get('month')
    
    if not year or not month:
        return Response(
            {'error': '년도와 월을 모두 제공해야 합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        year_int = int(year)
        month_int = int(month)
        
        if month_int < 1 or month_int > 12:
            return Response(
                {'error': '월은 1~12 사이의 값이어야 합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except ValueError:
        return Response(
            {'error': '년도와 월은 숫자여야 합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 해당 연월의 고객 불만 데이터 조회
    complaints = CustomerComplaint.objects.filter(
        occurrence_date__year=year_int,
        occurrence_date__month=month_int
    ).select_related('created_by', 'defect_type_code', 'cause_code').order_by('occurrence_date', 'created_at')
    
    if not complaints.exists():
        return Response(
            {'error': '해당 연월에 데이터가 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # CSV 응답 생성
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    filename = f'customer_complaints_{year_int}_{month_int:02d}.csv'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    # UTF-8 BOM 추가
    response.write('\ufeff')
    
    writer = csv.writer(response)
    
    # 헤더 작성
    writer.writerow([
        'CCR NO', '발생일', '업체명', '품명',
        '수량', '단가', '합계금액',
        '불량 유형', '발생 원인', '6M 카테고리',
        '불만 내용', '조치 내용', '조치 여부',
        '등록자', '등록일시'
    ])
    
    # 데이터 작성
    for complaint in complaints:
        writer.writerow([
            complaint.ccr_no,
            complaint.occurrence_date.strftime('%Y-%m-%d'),
            complaint.vendor,
            complaint.product_name,
            complaint.defect_qty,
            complaint.unit_price,
            complaint.total_amount,
            f'{complaint.defect_type_code.code} - {complaint.defect_type_code.name}' if complaint.defect_type_code else '',
            f'{complaint.cause_code.code} - {complaint.cause_code.name}' if complaint.cause_code else '',
            complaint.cause_code.get_category_display() if complaint.cause_code else '',
            complaint.complaint_content or '',
            complaint.action_content or '',
            '조치완료' if complaint.action_content else '조치대기',
            complaint.created_by.name if complaint.created_by else '',
            complaint.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])
    
    # 감사 로그 기록
    AuditLog.log_action(
        user=request.user,
        action='EXPORT_CUSTOMER_COMPLAINT',
        target_id=None,
        details=f'고객 불만 데이터 CSV 다운로드: {year_int}년 {month_int:02d}월 ({complaints.count()}건)',
        ip_address=get_client_ip(request)
    )
    
    return response
