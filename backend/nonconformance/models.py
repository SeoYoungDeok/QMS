from ulid import ULID
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import calendar


class DefectType(models.Model):
    """불량 유형 코드 테이블"""
    
    code = models.CharField(max_length=20, primary_key=True, verbose_name='코드')
    name = models.CharField(max_length=100, verbose_name='내용')
    description = models.CharField(max_length=255, null=True, blank=True, verbose_name='설명')
    
    class Meta:
        db_table = 'defect_types'
        verbose_name = '불량 유형'
        verbose_name_plural = '불량 유형 목록'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class DefectCause(models.Model):
    """발생 원인 코드 테이블 (6M 분류)"""
    
    CATEGORY_CHOICES = [
        ('Material', 'Material(소재)'),
        ('Machine', 'Machine(설비)'),
        ('Man', 'Man(사람)'),
        ('Method', 'Method(방법)'),
        ('Measurement', 'Measurement(측정)'),
        ('Environment', 'Environment(환경)'),
        ('Other', '기타'),
    ]
    
    code = models.CharField(max_length=20, primary_key=True, verbose_name='코드')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, verbose_name='6M 분류')
    name = models.CharField(max_length=100, verbose_name='내용')
    description = models.CharField(max_length=255, null=True, blank=True, verbose_name='설명')
    
    class Meta:
        db_table = 'defect_causes'
        verbose_name = '발생 원인'
        verbose_name_plural = '발생 원인 목록'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Nonconformance(models.Model):
    """부적합 본문 테이블"""
    
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
    ncr_uid = models.CharField(max_length=26, unique=True, editable=False, verbose_name='NCR UID')
    
    # 부적합 유형 (사내/수입)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name='부적합 유형')
    
    # 발생일
    occurrence_date = models.DateField(verbose_name='발생일')
    
    # 부적합 발행 번호
    ncr_no = models.CharField(max_length=50, verbose_name='NCR NO')
    
    # 업체명
    vendor = models.CharField(max_length=100, verbose_name='업체명')
    
    # 품명
    product_name = models.CharField(max_length=100, verbose_name='품명')
    
    # 관리번호
    control_no = models.CharField(max_length=100, null=True, blank=True, verbose_name='관리번호')
    
    # 부적합 수량
    defect_qty = models.PositiveIntegerField(
        validators=[MinValueValidator(1)], 
        verbose_name='부적합 수량'
    )
    
    # 단가(금액)
    unit_price = models.DecimalField(
        max_digits=18, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='단가'
    )
    
    # 가중치 (0~1.000)
    weight_factor = models.DecimalField(
        max_digits=4, 
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('1'))],
        verbose_name='가중치'
    )
    
    # 합계 (자동 계산)
    total_amount = models.DecimalField(
        max_digits=18, 
        decimal_places=2,
        editable=False,
        verbose_name='합계'
    )
    
    # 발견공정
    detection_stage = models.CharField(
        max_length=30, 
        null=True, 
        blank=True, 
        verbose_name='발견공정'
    )
    
    # 불량유형 코드 (외래키)
    defect_type_code = models.ForeignKey(
        DefectType,
        on_delete=models.PROTECT,
        verbose_name='불량유형 코드'
    )
    
    # 발생원인 코드 (외래키)
    cause_code = models.ForeignKey(
        DefectCause,
        on_delete=models.PROTECT,
        verbose_name='발생원인 코드'
    )
    
    # 5Why 분석
    why1 = models.CharField(max_length=255, null=True, blank=True, verbose_name='1Why')
    why2 = models.CharField(max_length=255, null=True, blank=True, verbose_name='2Why')
    why3 = models.CharField(max_length=255, null=True, blank=True, verbose_name='3Why')
    why4 = models.CharField(max_length=255, null=True, blank=True, verbose_name='4Why')
    why5 = models.CharField(max_length=255, null=True, blank=True, verbose_name='5Why')
    
    # 최종불량원인
    root_cause = models.CharField(max_length=255, null=True, blank=True, verbose_name='최종불량원인')
    
    # 작업자 (JSON 배열로 저장)
    operators = models.JSONField(null=True, blank=True, verbose_name='작업자')
    
    # 공정/부서
    process_name = models.CharField(max_length=100, null=True, blank=True, verbose_name='공정/부서')
    
    # 요일 (서버에서 자동 계산)
    weekday_code = models.CharField(
        max_length=3, 
        choices=WEEKDAY_CHOICES, 
        editable=False,
        verbose_name='요일'
    )
    
    # 비고
    note = models.TextField(null=True, blank=True, verbose_name='비고')
    
    # 작성자
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='nonconformances',
        verbose_name='작성자'
    )
    
    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    
    class Meta:
        db_table = 'nonconformances'
        verbose_name = '부적합'
        verbose_name_plural = '부적합 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['occurrence_date'], name='idx_nc_date'),
            models.Index(fields=['type', 'occurrence_date'], name='idx_nc_type_date'),
            models.Index(fields=['vendor'], name='idx_nc_vendor'),
            models.Index(fields=['control_no'], name='idx_nc_control_no'),
            models.Index(fields=['defect_type_code'], name='idx_nc_defect_type'),
            models.Index(fields=['cause_code'], name='idx_nc_cause_code'),
        ]
    
    def __str__(self):
        return f"{self.ncr_no} - {self.vendor} ({self.get_type_display()})"
    
    def save(self, *args, **kwargs):
        # ULID 생성 (최초 생성 시에만)
        if not self.ncr_uid:
            self.ncr_uid = str(ULID())
        
        # 합계 자동 계산
        self.total_amount = self.defect_qty * self.unit_price * self.weight_factor
        
        # 요일 자동 계산
        if self.occurrence_date:
            weekday = self.occurrence_date.weekday()  # 0=월요일, 6=일요일
            weekday_map = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
            self.weekday_code = weekday_map[weekday]
        
        super().save(*args, **kwargs)
    
    def get_weekday_display_korean(self):
        """한글 요일 표시"""
        weekday_map = {
            'MON': '월요일',
            'TUE': '화요일',
            'WED': '수요일',
            'THU': '목요일',
            'FRI': '금요일',
            'SAT': '토요일',
            'SUN': '일요일',
        }
        return weekday_map.get(self.weekday_code, '')
    
    def get_6m_category_display(self):
        """6M 분류 표시"""
        if self.cause_code:
            return self.cause_code.get_category_display()
        return ''