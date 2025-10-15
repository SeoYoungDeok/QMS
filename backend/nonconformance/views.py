import csv
from django.http import HttpResponse
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404

from .models import Nonconformance, DefectType, DefectCause
from .serializers import (
    NonconformanceSerializer,
    NonconformanceListSerializer,
    NonconformanceCreateSerializer,
    DefectTypeSerializer,
    DefectCauseSerializer
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


class NonconformanceListView(generics.ListAPIView):
    """부적합 목록 조회 API"""
    serializer_class = NonconformanceListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'defect_type_code', 'cause_code', 'weekday_code', 'detection_stage']
    search_fields = ['vendor', 'product_name', 'control_no', 'ncr_no']
    ordering_fields = ['occurrence_date', 'created_at', 'defect_qty', 'total_amount', 'vendor']
    ordering = ['-created_at']
    
    def get_queryset(self):
        try:
            queryset = Nonconformance.objects.select_related(
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
            
            return queryset
        except Exception as e:
            return Nonconformance.objects.none()
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'부적합 목록 조회 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class NonconformanceDetailView(generics.RetrieveAPIView):
    """부적합 상세 조회 API"""
    queryset = Nonconformance.objects.select_related('created_by', 'defect_type_code', 'cause_code')
    serializer_class = NonconformanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'부적합 상세 조회 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class NonconformanceCreateView(generics.CreateAPIView):
    """부적합 생성 API"""
    queryset = Nonconformance.objects.all()
    serializer_class = NonconformanceCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        # 실무자(1) 이상 권한 체크
        if self.request.user.role_level < 1:
            raise PermissionDenied("부적합 등록 권한이 없습니다.")
        
        # 작성자 자동 설정
        nonconformance = serializer.save(created_by=self.request.user)
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=self.request.user,
            action='CREATE_NONCONFORMANCE',
            target_id=str(nonconformance.id),
            details=f"부적합 등록: {nonconformance.get_type_display()} - {nonconformance.vendor} - {nonconformance.product_name}",
            ip_address=get_client_ip(self.request)
        )
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'부적합 등록 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class NonconformanceUpdateView(generics.UpdateAPIView):
    """부적합 수정 API"""
    queryset = Nonconformance.objects.all()
    serializer_class = NonconformanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def perform_update(self, serializer):
        # 실무자(1) 이상 권한 체크
        if self.request.user.role_level < 1:
            raise PermissionDenied("부적합 수정 권한이 없습니다.")
        
        # 변경 사항 추적
        instance = self.get_object()
        old_data = {
            'vendor': instance.vendor,
            'product_name': instance.product_name,
            'defect_qty': instance.defect_qty,
            'total_amount': instance.total_amount
        }
        
        nonconformance = serializer.save()
        
        # 감사 로그 기록
        changes = []
        new_data = {
            'vendor': nonconformance.vendor,
            'product_name': nonconformance.product_name,
            'defect_qty': nonconformance.defect_qty,
            'total_amount': nonconformance.total_amount
        }
        
        for key, old_value in old_data.items():
            new_value = new_data[key]
            if old_value != new_value:
                changes.append(f"{key}: {old_value} → {new_value}")
        
        if changes:
            AuditLog.log_action(
                user=self.request.user,
                action='UPDATE_NONCONFORMANCE',
                target_id=str(nonconformance.id),
                details=f"부적합 수정: {nonconformance.ncr_no} - 변경사항: {', '.join(changes[:3])}",
                ip_address=get_client_ip(self.request)
            )
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'부적합 수정 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class NonconformanceDeleteView(generics.DestroyAPIView):
    """부적합 삭제 API (물리 삭제)"""
    queryset = Nonconformance.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def perform_destroy(self, instance):
        # 실무자(1) 이상 권한 체크
        if self.request.user.role_level < 1:
            raise PermissionDenied("부적합 삭제 권한이 없습니다.")
        
        # 감사 로그 기록 (삭제 전)
        AuditLog.log_action(
            user=self.request.user,
            action='DELETE_NONCONFORMANCE',
            target_id=str(instance.id),
            details=f"부적합 삭제: {instance.ncr_no} - {instance.vendor} - {instance.product_name}",
            ip_address=get_client_ip(self.request)
        )
        
        # 물리 삭제 실행
        instance.delete()
    
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'부적합 삭제 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def defect_types_list(request):
    """불량 유형 목록 API"""
    try:
        defect_types = DefectType.objects.all().order_by('code')
        serializer = DefectTypeSerializer(defect_types, many=True)
        return Response({
            'ok': True,
            'data': serializer.data
        })
    except Exception as e:
        return Response(
            {'error': f'불량 유형 목록 조회 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def defect_causes_list(request):
    """발생 원인 목록 API"""
    try:
        # 카테고리별 필터링 지원
        category = request.GET.get('category')
        queryset = DefectCause.objects.all()
        
        if category:
            queryset = queryset.filter(category=category)
        
        defect_causes = queryset.order_by('code')
        serializer = DefectCauseSerializer(defect_causes, many=True)
        
        return Response({
            'ok': True,
            'data': serializer.data
        })
    except Exception as e:
        return Response(
            {'error': f'발생 원인 목록 조회 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def six_m_categories(request):
    """6M 카테고리 목록 API"""
    try:
        categories = [
            {'code': 'Material', 'name': 'Material(소재)'},
            {'code': 'Machine', 'name': 'Machine(설비)'},
            {'code': 'Man', 'name': 'Man(사람)'},
            {'code': 'Method', 'name': 'Method(방법)'},
            {'code': 'Measurement', 'name': 'Measurement(측정)'},
            {'code': 'Environment', 'name': 'Environment(환경)'},
            {'code': 'Other', 'name': '기타'},
        ]
        
        return Response({
            'ok': True,
            'data': categories
        })
    except Exception as e:
        return Response(
            {'error': f'6M 카테고리 조회 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def six_m_guide(request):
    """6M 가이드 정보 API"""
    try:
        guide_data = {
            'title': '6M 분류 가이드',
            'description': '부적합 원인을 체계적으로 분류하기 위한 6M 방법론',
            'categories': {
                'Material': {
                    'name': 'Material(소재)',
                    'description': '원자재/외주품 품질 문제, LOT 편차, 보관취급 불량',
                    'examples': ['원자재 자체 불량', '외주 소재 준비 불량', '로트별 품질 편차', '보관 중 손상/오염']
                },
                'Machine': {
                    'name': 'Machine(설비)',
                    'description': '설비 고장/정밀도/부품 마모 등 하드웨어 결함',
                    'examples': ['기계 고장/오작동', '부속부품 고장', '가공 정밀도 저하', '정기점검 미실시']
                },
                'Man': {
                    'name': 'Man(사람)',
                    'description': '개인의 주의력/숙련도 문제(부주의, 숙련도 부족, 피로 등)',
                    'examples': ['순간 부주의/실수', '작업자 스킬부족', '피로/컨디션 난조', '작업 교육 미흡']
                },
                'Method': {
                    'name': 'Method(방법)',
                    'description': '절차/작업방식/변경관리/조건 설정 오류',
                    'examples': ['공구 마모/파손', 'JIG 세팅 오류', '공정조건 설정 오류', '작업지시 전달 미흡']
                },
                'Measurement': {
                    'name': 'Measurement(측정)',
                    'description': '도면 오류/오배포/검사 미흡/검사구·계측기 문제',
                    'examples': ['도면 오작성/오배포', '검사 미흡', '검사구 미확보', '계측기 교정 미흡']
                },
                'Environment': {
                    'name': 'Environment(환경)',
                    'description': '온도·습도·조도·진동·정전기 등 환경 요인',
                    'examples': ['온도/습도/조도/진동', '작업장 정리정돈 불량', '소음/분진 등 작업환경']
                }
            },
            'tips': [
                '점검 순서 추천: Material → Machine → Method → Man → Measurement → Environment',
                'Man vs Method: Man은 개인차/1회성, Method는 반복성/구조적 문제',
                'Method vs Measurement: Method는 작업방식 오류, Measurement는 기준데이터 오류'
            ]
        }
        
        return Response({
            'ok': True,
            'data': guide_data
        })
    except Exception as e:
        return Response(
            {'error': f'6M 가이드 조회 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================== 코드 테이블 관리 API ====================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def defect_type_create(request):
    """불량 유형 추가 API (실무자 이상)"""
    # 권한 체크: 실무자 이상 (role_level >= 1)
    if request.user.role_level < 1:
        return Response(
            {'error': '불량 유형 추가 권한이 없습니다. 실무자 이상 권한이 필요합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        code = request.data.get('code', '').strip()
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        
        # 필수 값 검증
        if not code:
            return Response(
                {'error': '불량 유형 코드는 필수입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not name:
            return Response(
                {'error': '불량 유형 이름은 필수입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 중복 체크
        if DefectType.objects.filter(code=code).exists():
            return Response(
                {'error': f'이미 존재하는 불량 유형 코드입니다: {code}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 불량 유형 생성
        defect_type = DefectType.objects.create(
            code=code,
            name=name,
            description=description
        )
        
        # 감사 로그 기록
        AuditLog.objects.create(
            user_id=request.user,
            action='CREATE_DEFECT_TYPE',
            target_id=None,  # code는 문자열이므로 None으로 설정
            details=f'불량 유형 추가: {code} - {name}',
            ip_address=get_client_ip(request)
        )
        
        serializer = DefectTypeSerializer(defect_type)
        return Response({
            'ok': True,
            'message': '불량 유형이 성공적으로 추가되었습니다.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'불량 유형 추가 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def defect_type_delete(request, code):
    """불량 유형 삭제 API (실무자 이상)"""
    # 권한 체크: 실무자 이상 (role_level >= 1)
    if request.user.role_level < 1:
        return Response(
            {'error': '불량 유형 삭제 권한이 없습니다. 실무자 이상 권한이 필요합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 불량 유형 조회
        defect_type = get_object_or_404(DefectType, code=code)
        
        # 사용 중인지 체크 (외래 키 제약조건)
        usage_count = Nonconformance.objects.filter(defect_type_code=defect_type).count()
        if usage_count > 0:
            return Response(
                {'error': f'이 불량 유형은 {usage_count}개의 부적합에서 사용 중입니다. 삭제할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 삭제 전 정보 저장
        code_str = defect_type.code
        name_str = defect_type.name
        
        # 삭제 실행
        defect_type.delete()
        
        # 감사 로그 기록
        AuditLog.objects.create(
            user_id=request.user,
            action='DELETE_DEFECT_TYPE',
            target_id=None,  # code는 문자열이므로 None으로 설정
            details=f'불량 유형 삭제: {code_str} - {name_str}',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'ok': True,
            'message': '불량 유형이 성공적으로 삭제되었습니다.'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'불량 유형 삭제 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def defect_cause_create(request):
    """발생 원인 추가 API (실무자 이상)"""
    # 권한 체크: 실무자 이상 (role_level >= 1)
    if request.user.role_level < 1:
        return Response(
            {'error': '발생 원인 추가 권한이 없습니다. 실무자 이상 권한이 필요합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        code = request.data.get('code', '').strip()
        name = request.data.get('name', '').strip()
        category = request.data.get('category', '').strip()
        description = request.data.get('description', '').strip()
        
        # 필수 값 검증
        if not code:
            return Response(
                {'error': '발생 원인 코드는 필수입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not name:
            return Response(
                {'error': '발생 원인 이름은 필수입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not category:
            return Response(
                {'error': '6M 카테고리는 필수입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 카테고리 유효성 검사
        valid_categories = ['Material', 'Machine', 'Man', 'Method', 'Measurement', 'Environment', 'Other']
        if category not in valid_categories:
            return Response(
                {'error': f'유효하지 않은 카테고리입니다. 허용된 값: {", ".join(valid_categories)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 중복 체크
        if DefectCause.objects.filter(code=code).exists():
            return Response(
                {'error': f'이미 존재하는 발생 원인 코드입니다: {code}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 발생 원인 생성
        defect_cause = DefectCause.objects.create(
            code=code,
            name=name,
            category=category,
            description=description
        )
        
        # 감사 로그 기록
        AuditLog.objects.create(
            user_id=request.user,
            action='CREATE_DEFECT_CAUSE',
            target_id=None,  # code는 문자열이므로 None으로 설정
            details=f'발생 원인 추가: {code} - {name} ({category})',
            ip_address=get_client_ip(request)
        )
        
        serializer = DefectCauseSerializer(defect_cause)
        return Response({
            'ok': True,
            'message': '발생 원인이 성공적으로 추가되었습니다.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'발생 원인 추가 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def defect_cause_delete(request, code):
    """발생 원인 삭제 API (실무자 이상)"""
    # 권한 체크: 실무자 이상 (role_level >= 1)
    if request.user.role_level < 1:
        return Response(
            {'error': '발생 원인 삭제 권한이 없습니다. 실무자 이상 권한이 필요합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 발생 원인 조회
        defect_cause = get_object_or_404(DefectCause, code=code)
        
        # 사용 중인지 체크 (외래 키 제약조건)
        usage_count = Nonconformance.objects.filter(cause_code=defect_cause).count()
        if usage_count > 0:
            return Response(
                {'error': f'이 발생 원인은 {usage_count}개의 부적합에서 사용 중입니다. 삭제할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 삭제 전 정보 저장
        code_str = defect_cause.code
        name_str = defect_cause.name
        category_str = defect_cause.category
        
        # 삭제 실행
        defect_cause.delete()
        
        # 감사 로그 기록
        AuditLog.objects.create(
            user_id=request.user,
            action='DELETE_DEFECT_CAUSE',
            target_id=None,  # code는 문자열이므로 None으로 설정
            details=f'발생 원인 삭제: {code_str} - {name_str} ({category_str})',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'ok': True,
            'message': '발생 원인이 성공적으로 삭제되었습니다.'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'발생 원인 삭제 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reorder_defect_types(request):
    """불량 유형 코드 재정렬 API
    
    드래그 앤 드롭으로 순서 변경 시 기존 내역들의 외래키를 업데이트하여
    원래 선택했던 유형을 계속 가리키도록 함
    
    예: D01/파손과 D02/소재기인을 바꾸면
        D01과 D02의 위치가 바뀜
        기존에 "파손"(원래 D01)을 선택한 내역 → D02로 외래키 변경
        기존에 "소재기인"(원래 D02)을 선택한 내역 → D01로 외래키 변경
    
    Request Body:
        codes: 새로운 순서의 코드 리스트 (예: ['D02', 'D01', 'D03'])
    """
    if request.user.role_level < 1:
        return Response(
            {'error': '코드 재정렬 권한이 없습니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from django.db import transaction
        from customer_complaints.models import CustomerComplaint
        
        codes = request.data.get('codes', [])
        if not codes or not isinstance(codes, list):
            return Response(
                {'error': '코드 리스트가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 기존 순서 가져오기 (D01, D02, D03...)
        original_defect_types = list(DefectType.objects.filter(
            code__regex=r'^D\d{2}$'
        ).order_by('code'))
        
        if len(codes) != len(original_defect_types):
            return Response(
                {'error': '코드 개수가 일치하지 않습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 새로운 순서대로 DefectType 객체 가져오기
        reordered_defect_types = []
        for code in codes:
            try:
                dt = DefectType.objects.get(code=code)
                reordered_defect_types.append(dt)
            except DefectType.DoesNotExist:
                return Response(
                    {'error': f'코드 {code}를 찾을 수 없습니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if len(reordered_defect_types) != len(original_defect_types):
            return Response(
                {'error': f'재정렬 항목 수가 일치하지 않습니다. (원본: {len(original_defect_types)}, 재정렬: {len(reordered_defect_types)})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 코드 매핑 생성 (old_code -> new_code)
        # 각 위치에서 원래 있던 코드를 새로운 코드로 매핑
        code_mapping = {}
        for i, original_dt in enumerate(original_defect_types):
            new_dt = reordered_defect_types[i]
            if original_dt.pk != new_dt.pk:
                # 원래 이 위치에 있던 코드가 새로운 위치의 코드로 변경됨
                code_mapping[new_dt.code] = original_dt.code
        
        if not code_mapping:
            return Response({
                'ok': True,
                'message': '변경 사항이 없습니다.'
            })
        
        # 트랜잭션으로 DefectType의 code 필드를 교환
        # code가 primary key이므로 임시 코드를 거쳐서 교환해야 함
        with transaction.atomic():
            # 1단계: 교환할 DefectType들의 code를 임시 코드로 변경
            temp_mapping = {}
            for i, (old_code, new_code) in enumerate(code_mapping.items()):
                temp_code = f'TEMP_SWAP_{i}'
                
                # old_code를 가진 DefectType의 정보 저장
                dt = DefectType.objects.get(code=old_code)
                name = dt.name
                description = dt.description
                
                # 외래키 관계 때문에 직접 수정할 수 없으므로
                # 1. 새로운 임시 DefectType 생성
                DefectType.objects.filter(code=temp_code).delete()  # 혹시 모를 충돌 방지
                DefectType.objects.create(
                    code=temp_code,
                    name=name,
                    description=description
                )
                
                # 2. 모든 외래키를 임시로 이동
                Nonconformance.objects.filter(defect_type_code=old_code).update(
                    defect_type_code=temp_code
                )
                CustomerComplaint.objects.filter(defect_type_code=old_code).update(
                    defect_type_code=temp_code
                )
                
                # 3. 원본 삭제
                DefectType.objects.filter(code=old_code).delete()
                
                temp_mapping[temp_code] = (new_code, name, description)
            
            # 2단계: 임시 코드를 최종 코드로 변경
            for temp_code, (final_code, name, description) in temp_mapping.items():
                # 1. 새로운 최종 코드로 DefectType 생성
                DefectType.objects.create(
                    code=final_code,
                    name=name,
                    description=description
                )
                
                # 2. 외래키를 최종 코드로 이동
                Nonconformance.objects.filter(defect_type_code=temp_code).update(
                    defect_type_code=final_code
                )
                CustomerComplaint.objects.filter(defect_type_code=temp_code).update(
                    defect_type_code=final_code
                )
                
                # 3. 임시 코드 삭제
                DefectType.objects.filter(code=temp_code).delete()
        
        # 감사 로그
        changes = ', '.join([f'{old}->{new}' for old, new in code_mapping.items()])
        AuditLog.log_action(
            user=request.user,
            action='REORDER_DEFECT_TYPES',
            target_id=None,
            details=f'불량유형 재정렬 (외래키 업데이트): {changes}',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'ok': True,
            'message': f'{len(code_mapping)}개 항목이 재정렬되었습니다.',
            'changes': code_mapping
        })
        
    except Exception as e:
        return Response(
            {'error': f'재정렬 중 오류 발생: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reorder_defect_causes(request):
    """발생 원인 코드 재정렬 API
    
    드래그 앤 드롭으로 순서 변경 시 기존 내역들의 외래키를 업데이트하여
    원래 선택했던 원인을 계속 가리키도록 함
    
    예: M1.1/재료불량과 M1.2/기계고장을 바꾸면
        M1.1과 M1.2의 위치가 바뀜
        기존에 "재료불량"(원래 M1.1)을 선택한 내역 → M1.2로 외래키 변경
        기존에 "기계고장"(원래 M1.2)을 선택한 내역 → M1.1로 외래키 변경
    
    Request Body:
        major: 메이저 번호 (예: 'M1')
        codes: 새로운 순서의 코드 리스트 (예: ['M1.2', 'M1.1', 'M1.3'])
    """
    if request.user.role_level < 1:
        return Response(
            {'error': '코드 재정렬 권한이 없습니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from django.db import transaction
        from customer_complaints.models import CustomerComplaint
        import re
        
        major = request.data.get('major', '')
        codes = request.data.get('codes', [])
        
        if not major or not codes or not isinstance(codes, list):
            return Response(
                {'error': '메이저 번호와 코드 리스트가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 기존 순서 가져오기 (M1.1, M1.2, M1.3...)
        original_defect_causes = list(DefectCause.objects.filter(
            code__startswith=major + '.'
        ).order_by('code'))
        
        if len(codes) != len(original_defect_causes):
            return Response(
                {'error': '코드 개수가 일치하지 않습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 새로운 순서대로 DefectCause 객체 가져오기
        reordered_defect_causes = []
        for code in codes:
            try:
                dc = DefectCause.objects.get(code=code)
                if not code.startswith(major + '.'):
                    return Response(
                        {'error': f'코드 {code}는 {major} 그룹에 속하지 않습니다.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                reordered_defect_causes.append(dc)
            except DefectCause.DoesNotExist:
                return Response(
                    {'error': f'코드 {code}를 찾을 수 없습니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if len(reordered_defect_causes) != len(original_defect_causes):
            return Response(
                {'error': f'재정렬 항목 수가 일치하지 않습니다. (원본: {len(original_defect_causes)}, 재정렬: {len(reordered_defect_causes)})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 코드 매핑 생성 (old_code -> new_code)
        code_mapping = {}
        for i, original_dc in enumerate(original_defect_causes):
            new_dc = reordered_defect_causes[i]
            if original_dc.pk != new_dc.pk:
                code_mapping[new_dc.code] = original_dc.code
        
        if not code_mapping:
            return Response({
                'ok': True,
                'message': '변경 사항이 없습니다.'
            })
        
        # 트랜잭션으로 DefectCause의 code 필드를 교환
        # code가 primary key이므로 임시 코드를 거쳐서 교환해야 함
        with transaction.atomic():
            # 1단계: 교환할 DefectCause들의 code를 임시 코드로 변경
            temp_mapping = {}
            for i, (old_code, new_code) in enumerate(code_mapping.items()):
                temp_code = f'TEMP_SWAP_{major}_{i}'
                
                # old_code를 가진 DefectCause의 정보 저장
                dc = DefectCause.objects.get(code=old_code)
                category = dc.category
                name = dc.name
                description = dc.description
                
                # 외래키 관계 때문에 직접 수정할 수 없으므로
                # 1. 새로운 임시 DefectCause 생성
                DefectCause.objects.filter(code=temp_code).delete()  # 혹시 모를 충돌 방지
                DefectCause.objects.create(
                    code=temp_code,
                    category=category,
                    name=name,
                    description=description
                )
                
                # 2. 모든 외래키를 임시로 이동
                Nonconformance.objects.filter(cause_code=old_code).update(
                    cause_code=temp_code
                )
                CustomerComplaint.objects.filter(cause_code=old_code).update(
                    cause_code=temp_code
                )
                
                # 3. 원본 삭제
                DefectCause.objects.filter(code=old_code).delete()
                
                temp_mapping[temp_code] = (new_code, category, name, description)
            
            # 2단계: 임시 코드를 최종 코드로 변경
            for temp_code, (final_code, category, name, description) in temp_mapping.items():
                # 1. 새로운 최종 코드로 DefectCause 생성
                DefectCause.objects.create(
                    code=final_code,
                    category=category,
                    name=name,
                    description=description
                )
                
                # 2. 외래키를 최종 코드로 이동
                Nonconformance.objects.filter(cause_code=temp_code).update(
                    cause_code=final_code
                )
                CustomerComplaint.objects.filter(cause_code=temp_code).update(
                    cause_code=final_code
                )
                
                # 3. 임시 코드 삭제
                DefectCause.objects.filter(code=temp_code).delete()
        
        # 감사 로그
        changes = ', '.join([f'{old}->{new}' for old, new in code_mapping.items()])
        AuditLog.log_action(
            user=request.user,
            action='REORDER_DEFECT_CAUSES',
            target_id=None,
            details=f'발생원인 재정렬 (외래키 업데이트) ({major}): {changes}',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'ok': True,
            'message': f'{len(code_mapping)}개 항목이 재정렬되었습니다.',
            'changes': code_mapping
        })
        
    except Exception as e:
        return Response(
            {'error': f'재정렬 중 오류 발생: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_next_ncr_no(request):
    """다음 NCR NO 생성 API
    
    현재 연도 기준으로 마지막 NCR NO를 찾아서 +1한 번호를 반환
    형식: NCR-yyyy-001
    """
    try:
        from datetime import datetime
        import re
        
        current_year = datetime.now().year
        
        # 현재 연도의 NCR NO 패턴으로 필터링
        pattern = f'NCR-{current_year}-'
        
        # 현재 연도의 부적합 중 가장 큰 번호 찾기
        nonconformances = Nonconformance.objects.filter(
            ncr_no__startswith=pattern
        ).order_by('-ncr_no')
        
        if nonconformances.exists():
            # 마지막 NCR NO에서 번호 추출
            last_ncr_no = nonconformances.first().ncr_no
            # NCR-2025-001 형식에서 001 부분 추출
            match = re.search(r'NCR-\d{4}-(\d+)', last_ncr_no)
            if match:
                last_number = int(match.group(1))
                next_number = last_number + 1
            else:
                next_number = 1
        else:
            # 현재 연도의 첫 번째 NCR
            next_number = 1
        
        # 3자리 숫자로 포맷팅
        next_ncr_no = f'NCR-{current_year}-{next_number:03d}'
        
        return Response({
            'ok': True,
            'data': {
                'next_ncr_no': next_ncr_no,
                'year': current_year,
                'number': next_number
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'다음 NCR NO 생성 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def nonconformance_csv_export(request):
    """부적합 데이터 CSV 다운로드 API
    
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
    
    # 해당 연월의 부적합 데이터 조회
    nonconformances = Nonconformance.objects.filter(
        occurrence_date__year=year_int,
        occurrence_date__month=month_int
    ).select_related('created_by', 'defect_type_code', 'cause_code').order_by('occurrence_date', 'created_at')
    
    if not nonconformances.exists():
        return Response(
            {'error': '해당 연월에 데이터가 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # CSV 응답 생성
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    filename = f'nonconformance_{year_int}_{month_int:02d}.csv'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    # UTF-8 BOM 추가
    response.write('\ufeff')
    
    writer = csv.writer(response)
    
    # 헤더 작성
    writer.writerow([
        'NCR NO', '유형', '발생일', '업체명', '품명', '관리번호',
        '부적합 수량', '단가', '가중치', '합계금액',
        '불량 유형', '발생 원인', '6M 카테고리',
        '발견공정', '공정/부서', '작업자',
        '근본원인', '비고', '등록자', '등록일시'
    ])
    
    # 데이터 작성
    for nc in nonconformances:
        writer.writerow([
            nc.ncr_no,
            nc.get_type_display(),
            nc.occurrence_date.strftime('%Y-%m-%d'),
            nc.vendor,
            nc.product_name,
            nc.control_no or '',
            nc.defect_qty,
            nc.unit_price,
            nc.weight_factor,
            nc.total_amount,
            f'{nc.defect_type_code.code} - {nc.defect_type_code.name}' if nc.defect_type_code else '',
            f'{nc.cause_code.code} - {nc.cause_code.name}' if nc.cause_code else '',
            nc.cause_code.get_category_display() if nc.cause_code else '',
            nc.detection_stage or '',
            nc.process_name or '',
            ', '.join(nc.operators) if nc.operators else '',
            nc.root_cause or '',
            nc.note or '',
            nc.created_by.name if nc.created_by else '',
            nc.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])
    
    # 감사 로그 기록
    AuditLog.log_action(
        user=request.user,
        action='EXPORT_NONCONFORMANCE',
        target_id=None,
        details=f'부적합 데이터 CSV 다운로드: {year_int}년 {month_int:02d}월 ({nonconformances.count()}건)',
        ip_address=get_client_ip(request)
    )
    
    return response