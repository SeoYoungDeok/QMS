import uuid
from django.db import models
from django.core.validators import MinValueValidator
import ulid

class Vendor(models.Model):
    """업체명 관리 모델"""
    name = models.CharField(max_length=100, unique=True, verbose_name='업체명')
    created_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='created_vendors')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendors'
        ordering = ['name']
        verbose_name = '업체명'
        verbose_name_plural = '업체명 목록'
    
    def __str__(self):
        return self.name


class Producer(models.Model):
    """생산처 관리 모델"""
    name = models.CharField(max_length=100, unique=True, verbose_name='생산처')
    created_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='created_producers')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'producers'
        ordering = ['name']
        verbose_name = '생산처'
        verbose_name_plural = '생산처 목록'
    
    def __str__(self):
        return self.name


class PerformanceRecord(models.Model):
    """실적 기록 모델"""
    
    TYPE_CHOICES = [
        ('inhouse', '사내'),
        ('incoming', '수입'),
    ]
    
    WEEKDAY_CHOICES = [
        ('MON', '월요일'),
        ('TUE', '화요일'),
        ('WED', '수요일'),
        ('THU', '목요일'),
        ('FRI', '금요일'),
        ('SAT', '토요일'),
        ('SUN', '일요일'),
    ]
    
    # Primary Key
    id = models.BigAutoField(primary_key=True)
    
    # Business Unique Identifier (ULID)
    record_uid = models.CharField(max_length=26, unique=True, editable=False)
    
    # 실적 유형
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    
    # 실적일
    date = models.DateField()
    
    # 업체명
    vendor = models.CharField(max_length=100)
    
    # 품명
    product_name = models.CharField(max_length=100)
    
    # 관리번호 (중복 허용)
    control_no = models.CharField(max_length=100)
    
    # 실적수량
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    
    # 생산처 (모든 실적에서 필수)
    producer = models.CharField(max_length=100)
    
    # 요일 (서버에서 자동 계산)
    weekday_code = models.CharField(max_length=3, choices=WEEKDAY_CHOICES, editable=False)
    
    # 작성자
    created_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='performance_records')
    
    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'performance_records'
        ordering = ['-created_at']
        verbose_name = '실적 기록'
        verbose_name_plural = '실적 기록들'
    
    def save(self, *args, **kwargs):
        # ULID 생성 (최초 생성 시에만)
        if not self.record_uid:
            self.record_uid = str(ulid.new())
        
        # 요일 자동 계산
        weekday_map = {
            0: 'MON', 1: 'TUE', 2: 'WED', 3: 'THU',
            4: 'FRI', 5: 'SAT', 6: 'SUN'
        }
        self.weekday_code = weekday_map[self.date.weekday()]
        
        super().save(*args, **kwargs)
    
    def get_weekday_display_korean(self):
        """한글 요일 반환"""
        weekday_korean = {
            'MON': '월', 'TUE': '화', 'WED': '수', 'THU': '목',
            'FRI': '금', 'SAT': '토', 'SUN': '일'
        }
        return weekday_korean.get(self.weekday_code, '')
    
    def get_type_display(self):
        """실적 유형 표시"""
        return dict(self.TYPE_CHOICES).get(self.type, self.type)
    
    @property
    def type_display(self):
        return self.get_type_display()
    
    @property
    def weekday(self):
        return self.get_weekday_display_korean()
    
    @property
    def created_by_name(self):
        return self.created_by.name if self.created_by else ''
    
    def __str__(self):
        return f"{self.record_uid} - {self.get_type_display()} - {self.vendor}"
