import ulid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class CustomerComplaint(models.Model):
    """고객 불만(CCR) 테이블"""
    
    # Primary Key
    id = models.BigAutoField(primary_key=True)
    
    # Business Unique Identifier (ULID)
    ccr_uid = models.CharField(max_length=26, unique=True, editable=False, verbose_name='CCR UID')
    
    # 발생일
    occurrence_date = models.DateField(verbose_name='발생일')
    
    # CCR 발행 번호
    ccr_no = models.CharField(max_length=50, verbose_name='CCR NO')
    
    # 업체명
    vendor = models.CharField(max_length=100, verbose_name='업체명')
    
    # 품명
    product_name = models.CharField(max_length=100, verbose_name='품명')
    
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
    
    # 합계 (자동 계산: defect_qty × unit_price)
    total_amount = models.DecimalField(
        max_digits=18, 
        decimal_places=2,
        editable=False,
        verbose_name='합계'
    )
    
    # 고객 불만 내용 (필수)
    complaint_content = models.TextField(verbose_name='고객 불만 내용')
    
    # 조치 내용 (선택)
    action_content = models.TextField(null=True, blank=True, verbose_name='조치 내용')
    
    # 불량유형 코드 (외래키)
    defect_type_code = models.ForeignKey(
        'nonconformance.DefectType',
        on_delete=models.PROTECT,
        verbose_name='불량유형 코드'
    )
    
    # 발생원인 코드 (외래키)
    cause_code = models.ForeignKey(
        'nonconformance.DefectCause',
        on_delete=models.PROTECT,
        verbose_name='발생원인 코드'
    )
    
    # 작성자
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='customer_complaints',
        verbose_name='작성자'
    )
    
    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    
    class Meta:
        db_table = 'customer_complaints'
        verbose_name = '고객 불만'
        verbose_name_plural = '고객 불만 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['occurrence_date'], name='idx_ccr_date'),
            models.Index(fields=['vendor'], name='idx_ccr_vendor'),
            models.Index(fields=['ccr_no'], name='idx_ccr_no'),
            models.Index(fields=['defect_type_code'], name='idx_ccr_defect_type'),
            models.Index(fields=['cause_code'], name='idx_ccr_cause_code'),
        ]
    
    def __str__(self):
        return f"{self.ccr_no} - {self.vendor}"
    
    def save(self, *args, **kwargs):
        # ULID 생성 (최초 생성 시에만)
        if not self.ccr_uid:
            self.ccr_uid = str(ulid.new())
        
        # 합계 자동 계산
        self.total_amount = self.defect_qty * self.unit_price
        
        super().save(*args, **kwargs)
