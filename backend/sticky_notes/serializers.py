from rest_framework import serializers
from .models import StickyNote, Tag, NoteTag
from accounts.models import User


class TagSerializer(serializers.ModelSerializer):
    """태그 Serializer"""
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'created_at']
        read_only_fields = ['id', 'created_at']


class AuthorSerializer(serializers.ModelSerializer):
    """작성자 간소화 Serializer"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'department']


class StickyNoteSerializer(serializers.ModelSerializer):
    """포스트잇 전체 Serializer"""
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    author = AuthorSerializer(read_only=True)
    importance_display = serializers.CharField(
        source='get_importance_display_name', 
        read_only=True
    )
    
    class Meta:
        model = StickyNote
        fields = [
            'id', 'note_uid', 'author', 'content', 'importance', 
            'importance_display', 'color', 'x', 'y', 'width', 'height', 
            'z_index', 'is_locked', 'tags', 'tag_ids', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'note_uid', 'author', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """생성 시 태그 처리"""
        tag_ids = validated_data.pop('tag_ids', [])
        
        # 작성자는 request.user에서 가져옴
        sticky_note = StickyNote.objects.create(**validated_data)
        
        # 태그 연결
        if tag_ids:
            tags = Tag.objects.filter(id__in=tag_ids)
            sticky_note.tags.set(tags)
        
        return sticky_note
    
    def update(self, instance, validated_data):
        """수정 시 태그 처리"""
        tag_ids = validated_data.pop('tag_ids', None)
        
        # 기본 필드 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 태그 업데이트
        if tag_ids is not None:
            tags = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(tags)
        
        return instance


class StickyNoteListSerializer(serializers.ModelSerializer):
    """포스트잇 목록용 간소화 Serializer"""
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.name', read_only=True)
    importance_display = serializers.CharField(
        source='get_importance_display_name', 
        read_only=True
    )
    
    class Meta:
        model = StickyNote
        fields = [
            'id', 'note_uid', 'author_name', 'content', 'importance', 
            'importance_display', 'color', 'x', 'y', 'width', 'height', 
            'z_index', 'is_locked', 'tags', 'created_at', 'updated_at'
        ]


class StickyNotePositionSerializer(serializers.ModelSerializer):
    """위치 업데이트 전용 Serializer"""
    
    class Meta:
        model = StickyNote
        fields = ['id', 'x', 'y', 'z_index', 'width', 'height']
        read_only_fields = ['id']


class StickyNoteBulkUpdateSerializer(serializers.Serializer):
    """다중 선택 일괄 업데이트용 Serializer"""
    note_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    x_offset = serializers.FloatField(required=False, default=0)
    y_offset = serializers.FloatField(required=False, default=0)
    color = serializers.CharField(required=False, allow_blank=True)
    importance = serializers.ChoiceField(
        choices=['low', 'medium', 'high'],
        required=False
    )
    is_locked = serializers.BooleanField(required=False)

