import csv
import io
from django.http import HttpResponse
from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from accounts.models import User
from audit.models import AuditLog
from .models import PerformanceRecord, Vendor, Producer
from .serializers import (
    PerformanceRecordSerializer,
    PerformanceCreateSerializer,
    PerformanceBulkCreateSerializer,
    PerformanceListSerializer,
    VendorSerializer,
    ProducerSerializer
)


def format_validation_error(row_index, row_data, serializer_errors):
    """검증 에러를 상세하게 포맷팅하는 헬퍼 함수"""
    field_error_messages = []
    field_errors_dict = {}
    
    field_name_korean = {
        'type': '실적 유형',
        'date': '실적일',
        'vendor': '업체명',
        'product_name': '품명',
        'control_no': '관리번호',
        'quantity': '수량',
        'producer': '생산처'
    }
    
    for field, field_errors in serializer_errors.items():
        korean_name = field_name_korean.get(field, field)
        
        if isinstance(field_errors, list):
            error_msg = '; '.join(field_errors)
        else:
            error_msg = str(field_errors)
        
        field_error_messages.append(f"{korean_name}: {error_msg}")
        field_errors_dict[field] = field_errors
    
    return {
        'row_index': row_index,
        'control_no': row_data.get('control_no', ''),
        'message': '; '.join(field_error_messages),
        'field_errors': field_errors_dict,
        'raw_data': row_data
    }

class PerformanceCreateView(generics.CreateAPIView):
    """단일 실적 등록 API"""
    serializer_class = PerformanceCreateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        # 권한 체크: Guest는 등록 불가
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:  # Guest
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("실적 등록 권한이 없습니다.")
        
        # serializer.save()는 인스턴스를 반환하고 serializer.instance를 업데이트함
        performance = serializer.save(created_by=self.request.user)
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=self.request.user,
            action='CREATE_PERFORMANCE',
            target_id=str(performance.id),
            details=f"실적 등록: {performance.get_type_display()} - {performance.vendor} - {performance.product_name}",
            ip_address=self.request.META.get('REMOTE_ADDR', '')
        )
        
        return performance
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        performance = self.perform_create(serializer)
        
        # 생성된 실적 정보 반환
        response_data = {
            'message': 'created',
            'id': performance.id,
            'record_uid': performance.record_uid,
            'weekday': performance.get_weekday_display_korean()
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def performance_bulk_create(request):
    """일괄 실적 등록 API"""
    
    try:
        # 권한 체크: Guest는 등록 불가
        user = User.objects.get(id=request.user.id)
        if user.role_level < 1:  # Guest
            return Response(
                {'error': '실적 등록 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
    except Exception as e:
        return Response(
            {'error': f'사용자 확인 오류: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = PerformanceBulkCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    rows_data = serializer.validated_data['rows']
    transaction_type = serializer.validated_data['transaction']
    
    total = len(rows_data)
    success_count = 0
    errors = []
    created_records = []
    
    if transaction_type == 'full':
        # 전체 롤백 모드: 모든 행이 성공해야 함
        try:
            with transaction.atomic():
                for index, row_data in enumerate(rows_data):
                    row_serializer = PerformanceCreateSerializer(data=row_data)
                    if row_serializer.is_valid():
                        performance = row_serializer.save(created_by=request.user)
                        created_records.append({
                            'id': performance.id,
                            'record_uid': performance.record_uid
                        })
                        success_count += 1
                    else:
                        # 하나라도 실패하면 전체 롤백
                        error_detail = format_validation_error(index, row_data, row_serializer.errors)
                        raise Exception(f"행 {index + 1} 검증 실패: {error_detail['message']}")
                
                # 모든 행이 성공한 경우 감사 로그 기록
                AuditLog.log_action(
                    user=request.user,
                    action='BULK_CREATE_PERFORMANCE',
                    target_id=None,
                    details=f"일괄 실적 등록 성공: {success_count}건",
                    ip_address=request.META.get('REMOTE_ADDR', '')
                )
                
        except Exception as e:
            return Response({
                'summary': {'total': total, 'success': 0, 'failed': total},
                'errors': [{'message': str(e)}],
                'created': []
            }, status=status.HTTP_400_BAD_REQUEST)
    
    else:
        # 부분 저장 모드: 성공한 행만 저장
        for index, row_data in enumerate(rows_data):
            row_serializer = PerformanceCreateSerializer(data=row_data)
            if row_serializer.is_valid():
                try:
                    performance = row_serializer.save(created_by=request.user)
                    created_records.append({
                        'id': performance.id,
                        'record_uid': performance.record_uid
                    })
                    success_count += 1
                except Exception as e:
                    errors.append({
                        'row_index': index,
                        'control_no': row_data.get('control_no', ''),
                        'message': f"저장 실패: {str(e)}"
                    })
            else:
                # 헬퍼 함수를 사용하여 상세한 에러 정보 생성
                error_detail = format_validation_error(index, row_data, row_serializer.errors)
                errors.append(error_detail)
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='BULK_CREATE_PERFORMANCE',
            target_id=None,
            details=f"일괄 실적 등록: 성공 {success_count}건, 실패 {len(errors)}건",
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
    
    response_data = {
        'summary': {
            'total': total,
            'success': success_count,
            'failed': len(errors)
        },
        'errors': errors,
        'created': created_records
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def performance_csv_upload(request):
    """CSV 파일 업로드 및 일괄 실적 등록 API"""
    
    
    try:
        # 권한 체크: Guest는 등록 불가
        user = User.objects.get(id=request.user.id)
        if user.role_level < 1:  # Guest
            return Response(
                {'error': '실적 등록 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
    except Exception as e:
        return Response(
            {'error': f'사용자 확인 오류: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 파일 업로드 확인
    if 'file' not in request.FILES:
        return Response(
            {'error': 'CSV 파일이 업로드되지 않았습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    csv_file = request.FILES['file']
    transaction_type = request.data.get('transaction', 'partial')
    
    
    # 파일 유효성 검사
    if not csv_file.name.endswith('.csv'):

        return Response(
            {'error': 'CSV 파일만 업로드 가능합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if csv_file.size > 5 * 1024 * 1024:  # 5MB 제한
        return Response(
            {'error': '파일 크기는 5MB 이하여야 합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # CSV 파일 읽기
        csv_data = csv_file.read().decode('utf-8-sig')  # BOM 제거
        csv_reader = csv.DictReader(io.StringIO(csv_data))
        
        # 필수 컬럼 확인
        required_columns = ['type', 'date', 'vendor', 'product_name', 'control_no', 'quantity', 'producer']
        if not all(col in csv_reader.fieldnames for col in required_columns):
            missing_cols = [col for col in required_columns if col not in csv_reader.fieldnames]
            return Response(
                {'error': f'필수 컬럼이 누락되었습니다: {", ".join(missing_cols)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # CSV 데이터를 리스트로 변환
        rows_data = []
        for row_index, row in enumerate(csv_reader):
            # 빈 행 건너뛰기
            if not any(row.values()):
                continue
                
            # 데이터 정리 및 변환
            cleaned_row = {}
            for key, value in row.items():
                if key in required_columns:
                    cleaned_row[key] = str(value).strip() if value else ''
            
            # quantity를 정수로 변환
            try:
                cleaned_row['quantity'] = int(cleaned_row['quantity']) if cleaned_row['quantity'] else 1
            except ValueError:
                cleaned_row['quantity'] = 1
                
            rows_data.append(cleaned_row)
        
        if not rows_data:
            return Response(
                {'error': '처리할 데이터가 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(rows_data) > 1000:
            return Response(
                {'error': '한 번에 등록 가능한 최대 행 수는 1,000개입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except UnicodeDecodeError:
        return Response(
            {'error': 'CSV 파일 인코딩이 올바르지 않습니다. UTF-8 인코딩을 사용해주세요.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'CSV 파일 처리 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 일괄 등록 처리
    total = len(rows_data)
    success_count = 0
    errors = []
    created_records = []
    
    if transaction_type == 'full':
        # 전체 롤백 모드: 모든 행이 성공해야 함
        try:
            with transaction.atomic():
                for index, row_data in enumerate(rows_data):
                    row_serializer = PerformanceCreateSerializer(data=row_data)
                    if row_serializer.is_valid():
                        performance = row_serializer.save(created_by=request.user)
                        created_records.append({
                            'id': performance.id,
                            'record_uid': performance.record_uid
                        })
                        success_count += 1
                    else:
                        # 하나라도 실패하면 전체 롤백
                        error_detail = format_validation_error(index, row_data, row_serializer.errors)
                        raise Exception(f"행 {index + 1} 검증 실패: {error_detail['message']}")
                
                # 모든 행이 성공한 경우 감사 로그 기록
                AuditLog.log_action(
                    user=request.user,
                    action='BULK_CREATE_PERFORMANCE_CSV',
                    target_id=None,
                    details=f"CSV 일괄 실적 등록 성공: {success_count}건",
                    ip_address=request.META.get('REMOTE_ADDR', '')
                )
                
        except Exception as e:
            return Response({
                'summary': {'total': total, 'success': 0, 'failed': total},
                'errors': [{'message': str(e)}],
                'created': []
            }, status=status.HTTP_400_BAD_REQUEST)
    
    else:
        # 부분 저장 모드: 성공한 행만 저장
        for index, row_data in enumerate(rows_data):
            row_serializer = PerformanceCreateSerializer(data=row_data)
            if row_serializer.is_valid():
                try:
                    performance = row_serializer.save(created_by=request.user)
                    created_records.append({
                        'id': performance.id,
                        'record_uid': performance.record_uid
                    })
                    success_count += 1
                except Exception as e:
                    errors.append({
                        'row_index': index,
                        'control_no': row_data.get('control_no', ''),
                        'message': f"저장 실패: {str(e)}"
                    })
            else:
                # 헬퍼 함수를 사용하여 상세한 에러 정보 생성
                error_detail = format_validation_error(index, row_data, row_serializer.errors)
                errors.append(error_detail)
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='BULK_CREATE_PERFORMANCE_CSV',
            target_id=None,
            details=f"CSV 일괄 실적 등록: 성공 {success_count}건, 실패 {len(errors)}건",
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
    
    response_data = {
        'summary': {
            'total': total,
            'success': success_count,
            'failed': len(errors)
        },
        'errors': errors,
        'created': created_records
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def performance_template_download(request):
    """통합 템플릿 다운로드 API"""
    
    # CSV 응답 생성
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="performance_template.csv"'
    
    # UTF-8 BOM 추가 (Excel에서 한글이 깨지지 않도록)
    response.write('\ufeff')
    
    writer = csv.writer(response)
    
    # 헤더 작성
    writer.writerow([
        'type', 'date', 'vendor', 'product_name', 
        'control_no', 'quantity', 'producer'
    ])
    
    # 사내 실적 예시 데이터
    writer.writerow([
        'inhouse', '2025-01-20', 'ABC정밀', '하우징-123',
        'QMS-2025-000123', '120', '사내'
    ])
    
    # 수입검사 실적 예시 데이터
    writer.writerow([
        'incoming', '2025-01-20', 'XYZ가공', '브래킷-9',
        'QMS-2025-000124', '60', '외주업체1'
    ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def performance_csv_export(request):
    """실적 데이터 CSV 다운로드 API
    
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
    
    # 해당 연월의 실적 데이터 조회
    performances = PerformanceRecord.objects.filter(
        date__year=year_int,
        date__month=month_int
    ).order_by('date', 'created_at')
    
    if not performances.exists():
        return Response(
            {'error': '해당 연월에 데이터가 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # CSV 응답 생성
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    filename = f'performance_{year_int}_{month_int:02d}.csv'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    # UTF-8 BOM 추가
    response.write('\ufeff')
    
    writer = csv.writer(response)
    
    # 헤더 작성
    writer.writerow([
        '실적 ID', '유형', '실적일', '업체명', '품명',
        '관리번호', '수량', '생산처', '요일', '등록자', '등록일시'
    ])
    
    # 데이터 작성
    for perf in performances:
        writer.writerow([
            perf.record_uid,
            perf.get_type_display(),
            perf.date.strftime('%Y-%m-%d'),
            perf.vendor,
            perf.product_name,
            perf.control_no,
            perf.quantity,
            perf.producer,
            perf.get_weekday_display_korean(),
            perf.created_by.name if perf.created_by else '',
            perf.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])
    
    # 감사 로그 기록
    AuditLog.log_action(
        user=request.user,
        action='EXPORT_PERFORMANCE',
        target_id=None,
        details=f'실적 데이터 CSV 다운로드: {year_int}년 {month_int:02d}월 ({performances.count()}건)',
        ip_address=request.META.get('REMOTE_ADDR', '')
    )
    
    return response


class PerformanceListView(generics.ListAPIView):
    """실적 목록 조회 API"""
    serializer_class = PerformanceListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'producer', 'weekday_code']
    search_fields = ['vendor', 'product_name', 'control_no']
    ordering_fields = ['date', 'created_at', 'quantity', 'vendor']
    ordering = ['-created_at']
    
    def get_queryset(self):
        try:
            queryset = PerformanceRecord.objects.select_related('created_by')
            
            # 날짜 범위 필터 (안전한 처리)
            date_from = self.request.query_params.get('date_from')
            date_to = self.request.query_params.get('date_to')
            
            if date_from and date_from.strip():
                try:
                    queryset = queryset.filter(date__gte=date_from.strip())
                except Exception:
                    pass  # 잘못된 날짜 형식은 무시
            
            if date_to and date_to.strip():
                try:
                    queryset = queryset.filter(date__lte=date_to.strip())
                except Exception:
                    pass  # 잘못된 날짜 형식은 무시
            
            return queryset
        except Exception as e:
            # 쿼리셋 생성 실패 시 빈 쿼리셋 반환
            return PerformanceRecord.objects.none()
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            # 목록 조회 실패 시 에러 응답
            return Response(
                {'error': f'실적 목록 조회 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PerformanceDetailView(generics.RetrieveAPIView):
    """실적 상세 조회 API"""
    queryset = PerformanceRecord.objects.select_related('created_by')
    serializer_class = PerformanceRecordSerializer
    permission_classes = [IsAuthenticated]


class PerformanceUpdateView(generics.UpdateAPIView):
    """실적 수정 API"""
    queryset = PerformanceRecord.objects.all()
    serializer_class = PerformanceCreateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_update(self, serializer):
        # 권한 체크: Guest는 수정 불가
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:  # Guest
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("실적 수정 권한이 없습니다.")
        
        # 기존 데이터 백업
        instance = self.get_object()
        old_data = {
            'vendor': instance.vendor,
            'product_name': instance.product_name,
            'quantity': instance.quantity,
            'producer': instance.producer
        }
        
        # 수정 실행
        performance = serializer.save()
        
        # 변경사항 확인 및 감사 로그 기록
        changes = []
        for field, old_value in old_data.items():
            new_value = getattr(performance, field)
            if old_value != new_value:
                changes.append(f"{field}: {old_value} → {new_value}")
        
        if changes:
            AuditLog.log_action(
                user=self.request.user,
                action='UPDATE_PERFORMANCE',
                target_id=str(performance.id),
                details=f"실적 수정: {', '.join(changes)}",
                ip_address=self.request.META.get('REMOTE_ADDR', '')
            )


class PerformanceDeleteView(generics.DestroyAPIView):
    """실적 삭제 API"""
    queryset = PerformanceRecord.objects.all()
    permission_classes = [IsAuthenticated]
    
    def perform_destroy(self, instance):
        # 권한 체크: Guest는 삭제 불가
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:  # Guest
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("실적 삭제 권한이 없습니다.")
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=self.request.user,
            action='DELETE_PERFORMANCE',
            target_id=str(instance.id),
            details=f"실적 삭제: {instance.get_type_display()} - {instance.vendor} - {instance.product_name}",
            ip_address=self.request.META.get('REMOTE_ADDR', '')
        )
        
        # 실제 삭제 실행
        instance.delete()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def performance_bulk_delete(request):
    """실적 일괄 삭제 API"""
    
    try:
        # 권한 체크: Guest는 삭제 불가
        user = User.objects.get(id=request.user.id)
        if user.role_level < 1:  # Guest
            return Response(
                {'error': '실적 삭제 권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
    except Exception as e:
        return Response(
            {'error': f'사용자 확인 오류: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 삭제할 ID 목록 확인
    ids = request.data.get('ids', [])
    if not ids or not isinstance(ids, list):
        return Response(
            {'error': '삭제할 실적 ID 목록이 필요합니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        with transaction.atomic():
            # 삭제할 실적들 조회
            performances = PerformanceRecord.objects.filter(id__in=ids)
            
            if not performances.exists():
                return Response(
                    {'error': '삭제할 실적을 찾을 수 없습니다.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 삭제 전 정보 수집 (감사 로그용)
            deleted_info = []
            for perf in performances:
                deleted_info.append(f"{perf.get_type_display()} - {perf.vendor} - {perf.product_name}")
            
            # 삭제 실행
            deleted_count = performances.count()
            performances.delete()
            
            # 감사 로그 기록
            AuditLog.log_action(
                user=request.user,
                action='BULK_DELETE_PERFORMANCE',
                target_id=None,
                details=f"실적 일괄 삭제: {deleted_count}건 - {', '.join(deleted_info[:5])}{'...' if len(deleted_info) > 5 else ''}",
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
            
            return Response({
                'message': f'{deleted_count}건의 실적이 성공적으로 삭제되었습니다.',
                'deleted_count': deleted_count
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'error': f'일괄 삭제 중 오류가 발생했습니다: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


# ========================================
# 업체명 관리 API
# ========================================

class VendorListCreateView(generics.ListCreateAPIView):
    """업체명 목록 조회 및 생성 API"""
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    pagination_class = None  # 페이지네이션 비활성화
    
    def perform_create(self, serializer):
        # 권한 체크: 실무자 이상만 등록 가능
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("업체명 등록 권한이 없습니다.")
        
        serializer.save(created_by=self.request.user)


class VendorDetailView(generics.RetrieveUpdateDestroyAPIView):
    """업체명 상세 조회/수정/삭제 API"""
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_update(self, serializer):
        # 권한 체크: 실무자 이상만 수정 가능
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("업체명 수정 권한이 없습니다.")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        # 권한 체크: 실무자 이상만 삭제 가능
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("업체명 삭제 권한이 없습니다.")
        
        instance.delete()


# ========================================
# 생산처 관리 API
# ========================================

class ProducerListCreateView(generics.ListCreateAPIView):
    """생산처 목록 조회 및 생성 API"""
    queryset = Producer.objects.all()
    serializer_class = ProducerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    pagination_class = None  # 페이지네이션 비활성화
    
    def perform_create(self, serializer):
        # 권한 체크: 실무자 이상만 등록 가능
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("생산처 등록 권한이 없습니다.")
        
        serializer.save(created_by=self.request.user)


class ProducerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """생산처 상세 조회/수정/삭제 API"""
    queryset = Producer.objects.all()
    serializer_class = ProducerSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_update(self, serializer):
        # 권한 체크: 실무자 이상만 수정 가능
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("생산처 수정 권한이 없습니다.")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        # 권한 체크: 실무자 이상만 삭제 가능
        user = User.objects.get(id=self.request.user.id)
        if user.role_level < 1:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("생산처 삭제 권한이 없습니다.")
        
        instance.delete()