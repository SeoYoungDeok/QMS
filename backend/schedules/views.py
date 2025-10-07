from django.db.models import Q
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.core.exceptions import PermissionDenied
from accounts.models import User
from audit.models import AuditLog
from .models import Schedule
from .serializers import (
    ScheduleSerializer,
    ScheduleCreateSerializer,
    ScheduleListSerializer
)


def get_client_ip(request):
    """클라이언트 IP 주소 추출"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class ScheduleListView(generics.ListAPIView):
    """일정 목록 조회"""
    
    serializer_class = ScheduleListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'category', 'importance']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_date', 'start_time', 'importance', 'created_at']
    ordering = ['-start_date', '-start_time']
    
    def get_queryset(self):
        queryset = Schedule.objects.select_related('owner').all()
        
        # 날짜 범위 필터링
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from and date_from.strip():
            try:
                queryset = queryset.filter(end_date__gte=date_from)
            except Exception:
                pass
                
        if date_to and date_to.strip():
            try:
                queryset = queryset.filter(start_date__lte=date_to)
            except Exception:
                pass
        
        # 참석자 필터링
        participant = self.request.query_params.get('participant')
        if participant and participant.strip():
            try:
                participant_id = int(participant)
                queryset = queryset.filter(
                    Q(participants__contains=[participant_id]) | Q(owner_id=participant_id)
                )
            except (ValueError, TypeError):
                pass
        
        return queryset


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_create(request):
    """일정 등록"""
    user = request.user
    
    # 권한 검증: 실무자 이상만 등록 가능
    if user.role_level < 1:
        return Response(
            {'error': 'permission_denied', 'message': '일정 등록 권한이 없습니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = ScheduleCreateSerializer(data=request.data)
    if serializer.is_valid():
        # 소유자를 현재 사용자로 설정
        schedule = serializer.save(owner=user)
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=user,
            action='CREATE_SCHEDULE',
            target_id=schedule.id,
            details=f'일정 등록: {schedule.title} ({schedule.type}/{schedule.category})',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'ok': True,
            'data': {
                'id': schedule.id,
                'schedule_uid': schedule.schedule_uid,
                'title': schedule.title
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'error': 'validation_error',
        'message': '입력 데이터가 유효하지 않습니다.',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


class ScheduleDetailView(generics.RetrieveAPIView):
    """일정 상세 조회"""
    
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        return Schedule.objects.select_related('owner').all()


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def schedule_update(request, id):
    """일정 수정"""
    user = request.user
    
    try:
        schedule = Schedule.objects.get(id=id)
    except Schedule.DoesNotExist:
        return Response(
            {'error': 'not_found', 'message': '일정을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # 권한 검증: 소유자이거나 관리자만 수정 가능
    if schedule.owner != user and user.role_level < 2:
        return Response(
            {'error': 'permission_denied', 'message': '이 일정을 수정할 권한이 없습니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # 기존 데이터 백업 (감사 로그용)
    old_data = {
        'title': schedule.title,
        'type': schedule.type,
        'category': schedule.category,
        'start_date': str(schedule.start_date),
        'end_date': str(schedule.end_date) if schedule.end_date else None,
    }
    
    serializer = ScheduleSerializer(schedule, data=request.data, partial=True)
    if serializer.is_valid():
        updated_schedule = serializer.save()
        
        # 변경 내용 추적
        new_data = {
            'title': updated_schedule.title,
            'type': updated_schedule.type,
            'category': updated_schedule.category,
            'start_date': str(updated_schedule.start_date),
            'end_date': str(updated_schedule.end_date) if updated_schedule.end_date else None,
        }
        
        changes = []
        for key, old_value in old_data.items():
            new_value = new_data[key]
            if old_value != new_value:
                changes.append(f'{key}: {old_value} → {new_value}')
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=user,
            action='UPDATE_SCHEDULE',
            target_id=schedule.id,
            details=f'일정 수정: {updated_schedule.title} | 변경사항: {"; ".join(changes)}',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'ok': True,
            'data': ScheduleSerializer(updated_schedule).data
        })
    
    return Response({
        'error': 'validation_error',
        'message': '입력 데이터가 유효하지 않습니다.',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def schedule_delete(request, id):
    """일정 삭제 (물리 삭제)"""
    user = request.user
    
    try:
        schedule = Schedule.objects.get(id=id)
    except Schedule.DoesNotExist:
        return Response(
            {'error': 'not_found', 'message': '일정을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # 권한 검증: 소유자이거나 관리자만 삭제 가능
    if schedule.owner != user and user.role_level < 2:
        return Response(
            {'error': 'permission_denied', 'message': '이 일정을 삭제할 권한이 없습니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # 삭제 전 정보 백업
    schedule_info = f'{schedule.title} ({schedule.type}/{schedule.category}, {schedule.start_date})'
    schedule_uid = schedule.schedule_uid
    
    # 물리 삭제 수행
    schedule.delete()
    
    # 감사 로그 기록
    AuditLog.log_action(
        user=user,
        action='DELETE_SCHEDULE',
        target_id=id,  # 삭제된 ID
        details=f'일정 삭제: {schedule_info} (UID: {schedule_uid})',
        ip_address=get_client_ip(request)
    )
    
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schedule_categories(request):
    """일정 카테고리 목록 조회"""
    
    categories = {
        'quality': [
            {'code': code, 'name': name} 
            for code, name in Schedule.QUALITY_CATEGORIES
        ],
        'personal': [
            {'code': code, 'name': name} 
            for code, name in Schedule.PERSONAL_CATEGORIES
        ]
    }
    
    return Response({
        'ok': True,
        'data': categories
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schedule_users(request):
    """일정 참석자 선택용 사용자 목록"""
    
    users = User.objects.filter(status='active').values('id', 'name', 'department', 'position')
    
    return Response({
        'ok': True,
        'data': list(users)
    })