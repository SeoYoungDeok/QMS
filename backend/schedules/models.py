from django.db import models
from django.core.validators import MinLengthValidator, MaxLengthValidator
from ulid import ULID


class Schedule(models.Model):
    """일정 관리 모델"""
    
    TYPE_CHOICES = [
        ('quality', '품질 일정'),
        ('personal', '개인 일정'),
    ]
    
    # 품질 일정 카테고리
    QUALITY_CATEGORIES = [
        ('outgoing_inspection', '출하검사'),
        ('incoming_inspection', '수입검사'),
        ('product_shipment', '제품출하'),
        ('audit', '감사'),
        ('other_quality', '기타 품질업무'),
    ]
    
    # 개인 일정 카테고리
    PERSONAL_CATEGORIES = [
        ('meeting', '회의'),
        ('training', '교육'),
        ('vacation', '휴가'),
        ('business_trip', '출장'),
        ('other_personal', '기타 개인업무'),
    ]
    
    IMPORTANCE_CHOICES = [
        ('low', '낮음'),
        ('medium', '보통'),
        ('high', '높음'),
    ]
    
    # Primary Key
    id = models.BigAutoField(primary_key=True)
    
    # Business Unique Identifier (ULID)
    schedule_uid = models.CharField(max_length=26, unique=True, editable=False)
    
    # 일정 유형
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    
    # 카테고리 (type에 따라 다른 선택지)
    category = models.CharField(max_length=50)
    
    # 일정 제목
    title = models.CharField(
        max_length=100, 
        validators=[MinLengthValidator(1), MaxLengthValidator(100)]
    )
    
    # 상세 설명 (선택사항)
    description = models.TextField(blank=True, null=True)
    
    # 중요도
    importance = models.CharField(max_length=10, choices=IMPORTANCE_CHOICES)
    
    # 날짜 (필수)
    start_date = models.DateField()
    
    # 종료 날짜 (선택사항, 없으면 start_date와 동일 취급)
    end_date = models.DateField(blank=True, null=True)
    
    # 시간 (선택사항)
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    
    # 장소 (선택사항)
    location = models.CharField(max_length=100, blank=True, null=True)
    
    # 참석자 (JSON 형태로 user id 배열 저장, 선택사항)
    participants = models.JSONField(default=list, blank=True)
    
    # 일정 생성자 (소유자)
    owner = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='owned_schedules')
    
    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'schedules'
        ordering = ['-created_at']
        verbose_name = '일정'
        verbose_name_plural = '일정들'
        indexes = [
            models.Index(fields=['start_date', 'end_date'], name='idx_schedules_date'),
            models.Index(fields=['type', 'importance'], name='idx_schedules_type_importance'),
            models.Index(fields=['owner'], name='idx_schedules_owner'),
        ]
    
    def save(self, *args, **kwargs):
        # ULID 생성 (최초 생성 시에만)
        if not self.schedule_uid:
            self.schedule_uid = str(ULID())
        
        # end_date가 없으면 start_date로 설정
        if not self.end_date:
            self.end_date = self.start_date
            
        super().save(*args, **kwargs)
    
    def clean(self):
        """모델 검증 로직"""
        from django.core.exceptions import ValidationError
        
        # 날짜 범위 검증
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError('종료 날짜는 시작 날짜보다 이전일 수 없습니다.')
        
        # 시간 범위 검증 (같은 날짜인 경우에만)
        if (self.start_time and self.end_time and 
            self.start_date == self.end_date and 
            self.end_time <= self.start_time):
            raise ValidationError('종료 시간은 시작 시간보다 늦어야 합니다.')
        
        # end_time만 입력된 경우 방지
        if self.end_time and not self.start_time:
            raise ValidationError('종료 시간만 입력할 수 없습니다. 시작 시간을 먼저 입력해주세요.')
        
        # 카테고리 검증
        if self.type == 'quality':
            valid_categories = [choice[0] for choice in self.QUALITY_CATEGORIES]
            if self.category not in valid_categories:
                raise ValidationError(f'품질 일정의 유효한 카테고리가 아닙니다: {self.category}')
        elif self.type == 'personal':
            valid_categories = [choice[0] for choice in self.PERSONAL_CATEGORIES]
            if self.category not in valid_categories:
                raise ValidationError(f'개인 일정의 유효한 카테고리가 아닙니다: {self.category}')
    
    def get_category_display(self):
        """카테고리 한글 표시명 반환"""
        if self.type == 'quality':
            category_dict = dict(self.QUALITY_CATEGORIES)
        else:
            category_dict = dict(self.PERSONAL_CATEGORIES)
        return category_dict.get(self.category, self.category)
    
    def is_all_day(self):
        """종일 일정 여부 반환"""
        return self.start_time is None and self.end_time is None
    
    def __str__(self):
        return f"[{self.get_type_display()}] {self.title} ({self.start_date})"