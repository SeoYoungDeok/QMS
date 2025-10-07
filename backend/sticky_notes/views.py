from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters import rest_framework as filters
from django.db.models import Q
from .models import StickyNote, Tag
from .serializers import (
    StickyNoteSerializer, 
    StickyNoteListSerializer,
    StickyNotePositionSerializer,
    StickyNoteBulkUpdateSerializer,
    TagSerializer
)


class StickyNoteFilter(filters.FilterSet):
    """포스트잇 필터"""
    query = filters.CharFilter(method='filter_query', label='검색어')
    tag_ids = filters.CharFilter(method='filter_tag_ids', label='태그 ID (쉼표 구분)')
    importance = filters.ChoiceFilter(
        choices=[('low', '낮음'), ('medium', '중간'), ('high', '높음')],
        label='중요도'
    )
    color = filters.CharFilter(label='색상')
    author_id = filters.NumberFilter(field_name='author__id', label='작성자 ID')
    from_date = filters.DateFilter(field_name='created_at', lookup_expr='gte', label='시작일')
    to_date = filters.DateFilter(field_name='created_at', lookup_expr='lte', label='종료일')
    is_locked = filters.BooleanFilter(label='잠금 여부')
    
    class Meta:
        model = StickyNote
        fields = ['importance', 'color', 'author_id', 'is_locked']
    
    def filter_query(self, queryset, name, value):
        """검색어 필터 (content 풀텍스트 검색)"""
        if value:
            return queryset.filter(
                Q(content__icontains=value) | Q(note_uid__icontains=value)
            )
        return queryset
    
    def filter_tag_ids(self, queryset, name, value):
        """태그 ID 필터 (쉼표로 구분된 ID)"""
        if value:
            tag_ids = [int(id.strip()) for id in value.split(',') if id.strip().isdigit()]
            if tag_ids:
                return queryset.filter(tags__id__in=tag_ids).distinct()
        return queryset


class StickyNoteViewSet(viewsets.ModelViewSet):
    """포스트잇 ViewSet"""
    permission_classes = [IsAuthenticated]
    filterset_class = StickyNoteFilter
    
    def get_queryset(self):
        """권한에 따른 queryset 반환"""
        user = self.request.user
        
        # 관리자(2)는 모든 메모 조회
        if user.role_level >= 2:
            return StickyNote.objects.all().prefetch_related('tags', 'author')
        
        # 실무자(1)와 게스트(0)는 본인 메모만 조회
        return StickyNote.objects.filter(author=user).prefetch_related('tags', 'author')
    
    def get_serializer_class(self):
        """액션에 따른 serializer 선택"""
        if self.action == 'list':
            return StickyNoteListSerializer
        elif self.action == 'update_position':
            return StickyNotePositionSerializer
        elif self.action == 'bulk_update':
            return StickyNoteBulkUpdateSerializer
        return StickyNoteSerializer
    
    def perform_create(self, serializer):
        """생성 시 작성자 자동 설정"""
        user = self.request.user
        
        # 게스트(0)는 생성 불가
        if user.role_level < 1:
            return Response(
                {'error': '게스트는 메모를 생성할 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer.save(author=user)
    
    def perform_update(self, serializer):
        """수정 시 권한 체크"""
        user = self.request.user
        instance = self.get_object()
        
        # 게스트(0)는 수정 불가
        if user.role_level < 1:
            return Response(
                {'error': '게스트는 메모를 수정할 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 잠긴 메모는 작성자나 관리자만 수정 가능
        if instance.is_locked and user.role_level < 2 and instance.author != user:
            return Response(
                {'error': '잠긴 메모는 수정할 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """삭제 시 권한 체크"""
        user = self.request.user
        
        # 게스트(0)는 삭제 불가
        if user.role_level < 1:
            return Response(
                {'error': '게스트는 메모를 삭제할 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 본인 메모 또는 관리자만 삭제 가능
        if instance.author != user and user.role_level < 2:
            return Response(
                {'error': '본인의 메모만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()
    
    @action(detail=True, methods=['patch'])
    def update_position(self, request, pk=None):
        """위치 업데이트 전용 엔드포인트 (빠른 업데이트)"""
        sticky_note = self.get_object()
        serializer = self.get_serializer(sticky_note, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """다중 선택 일괄 업데이트"""
        user = request.user
        
        # 게스트는 불가
        if user.role_level < 1:
            return Response(
                {'error': '게스트는 메모를 수정할 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        note_ids = serializer.validated_data.get('note_ids', [])
        x_offset = serializer.validated_data.get('x_offset', 0)
        y_offset = serializer.validated_data.get('y_offset', 0)
        color = serializer.validated_data.get('color')
        importance = serializer.validated_data.get('importance')
        is_locked = serializer.validated_data.get('is_locked')
        
        # 권한에 따른 메모 필터링
        if user.role_level >= 2:
            notes = StickyNote.objects.filter(id__in=note_ids)
        else:
            notes = StickyNote.objects.filter(id__in=note_ids, author=user)
        
        # 일괄 업데이트
        update_fields = []
        for note in notes:
            if x_offset != 0:
                note.x += x_offset
            if y_offset != 0:
                note.y += y_offset
            if color:
                note.color = color
            if importance:
                note.importance = importance
            if is_locked is not None:
                note.is_locked = is_locked
        
        # bulk_update 사용
        fields_to_update = ['x', 'y']
        if color:
            fields_to_update.append('color')
        if importance:
            fields_to_update.append('importance')
        if is_locked is not None:
            fields_to_update.append('is_locked')
        
        StickyNote.objects.bulk_update(notes, fields_to_update)
        
        return Response({
            'success': True,
            'updated_count': notes.count()
        })
    
    @action(detail=False, methods=['get'])
    def by_viewport(self, request):
        """뷰포트 영역 내 메모만 조회 (성능 최적화)"""
        x_min = request.query_params.get('x_min')
        x_max = request.query_params.get('x_max')
        y_min = request.query_params.get('y_min')
        y_max = request.query_params.get('y_max')
        
        queryset = self.get_queryset()
        
        if all([x_min, x_max, y_min, y_max]):
            queryset = queryset.filter(
                x__gte=float(x_min),
                x__lte=float(x_max),
                y__gte=float(y_min),
                y__lte=float(y_max)
            )
        
        serializer = StickyNoteListSerializer(queryset, many=True)
        return Response(serializer.data)


class TagViewSet(viewsets.ModelViewSet):
    """태그 ViewSet"""
    permission_classes = [IsAuthenticated]
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    
    def perform_create(self, serializer):
        """게스트는 태그 생성 불가"""
        user = self.request.user
        
        if user.role_level < 1:
            return Response(
                {'error': '게스트는 태그를 생성할 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """관리자만 태그 삭제 가능"""
        user = self.request.user
        
        if user.role_level < 2:
            return Response(
                {'error': '관리자만 태그를 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()
