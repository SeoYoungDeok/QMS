from django.db import models
from accounts.models import User
from ulid import ULID


def generate_ulid():
    """ULID 생성 함수"""
    return str(ULID())


class Tag(models.Model):
    """
    태그 마스터 테이블
    """
    name = models.CharField(max_length=50, unique=True, verbose_name='태그명')
    color = models.CharField(max_length=20, null=True, blank=True, verbose_name='태그 색상')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성시각')
    
    class Meta:
        db_table = 'tags'
        verbose_name = '태그'
        verbose_name_plural = '태그 목록'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class StickyNote(models.Model):
    """
    포스트잇 본문 테이블
    """
    IMPORTANCE_CHOICES = [
        ('low', '낮음'),
        ('medium', '중간'),
        ('high', '높음'),
    ]
    
    COLOR_CHOICES = [
        ('yellow', '노란색'),
        ('blue', '파란색'),
        ('pink', '분홍색'),
        ('green', '초록색'),
        ('purple', '보라색'),
        ('gray', '회색'),
    ]
    
    # 비즈니스 키
    note_uid = models.CharField(
        max_length=26, 
        unique=True, 
        default=generate_ulid,
        verbose_name='메모 UID'
    )
    
    # 작성자 (FK)
    author = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sticky_notes',
        verbose_name='작성자'
    )
    
    # 내용
    content = models.TextField(verbose_name='메모 내용')
    
    # 분류
    importance = models.CharField(
        max_length=10, 
        choices=IMPORTANCE_CHOICES, 
        default='medium',
        verbose_name='중요도'
    )
    color = models.CharField(
        max_length=20, 
        choices=COLOR_CHOICES, 
        default='yellow',
        verbose_name='색상'
    )
    
    # 위치 및 크기
    x = models.FloatField(default=0, verbose_name='X좌표')
    y = models.FloatField(default=0, verbose_name='Y좌표')
    width = models.FloatField(default=220, verbose_name='너비')
    height = models.FloatField(default=160, verbose_name='높이')
    z_index = models.IntegerField(default=1, verbose_name='쌓임 순서')
    
    # 잠금
    is_locked = models.BooleanField(default=False, verbose_name='잠금 여부')
    
    # 태그 (다대다)
    tags = models.ManyToManyField(
        Tag, 
        through='NoteTag', 
        related_name='sticky_notes',
        blank=True,
        verbose_name='태그'
    )
    
    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성시각')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정시각')
    
    class Meta:
        db_table = 'sticky_notes'
        verbose_name = '포스트잇'
        verbose_name_plural = '포스트잇 목록'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['author'], name='idx_notes_author'),
            models.Index(fields=['importance'], name='idx_notes_importance'),
            models.Index(fields=['created_at'], name='idx_notes_created'),
            models.Index(fields=['x', 'y'], name='idx_notes_pos'),
        ]
    
    def __str__(self):
        return f"{self.note_uid} - {self.content[:30]}"
    
    def get_importance_display_name(self):
        """중요도 표시명 반환"""
        importance_map = {
            'low': '낮음',
            'medium': '중간',
            'high': '높음'
        }
        return importance_map.get(self.importance, '알 수 없음')


class NoteTag(models.Model):
    """
    포스트잇-태그 다대다 매핑 테이블
    """
    note = models.ForeignKey(
        StickyNote, 
        on_delete=models.CASCADE,
        verbose_name='메모'
    )
    tag = models.ForeignKey(
        Tag, 
        on_delete=models.CASCADE,
        verbose_name='태그'
    )
    
    class Meta:
        db_table = 'note_tags'
        verbose_name = '메모-태그 매핑'
        verbose_name_plural = '메모-태그 매핑 목록'
        constraints = [
            models.UniqueConstraint(
                fields=['note', 'tag'], 
                name='unique_note_tag'
            )
        ]
    
    def __str__(self):
        return f"{self.note.note_uid} - {self.tag.name}"
