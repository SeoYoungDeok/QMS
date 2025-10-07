import ulid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class KPITarget(models.Model):
    """
    KPI 목표 모델 (연간 전용)
    
    - 조직 차원의 연간 KPI 목표값 등록 및 관리
    - KPI 유형: 불량율(%), ppm 변환 지원), F-COST(원), 고객 불만 건수(건)
    """
    
    # KPI 종류 선택지
    KPI_TYPE_CHOICES = [
        ('defect_rate', '불량율'),
        ('f_cost', 'F-COST'),
        ('complaints', '고객 불만 건수'),
    ]
    
    # 단위 선택지
    UNIT_CHOICES = [
        ('%', '%'),
        ('ppm', 'ppm'),
        ('KRW', '원'),
        ('count', '건'),
    ]
    
    # Primary Key
    id = models.BigAutoField(primary_key=True)
    
    # Business Unique Identifier (ULID)
    kpi_uid = models.CharField(max_length=26, unique=True, editable=False, verbose_name='KPI UID')
    
    # 연도
    year = models.IntegerField(verbose_name='연도')
    
    # KPI 종류
    kpi_type = models.CharField(max_length=20, choices=KPI_TYPE_CHOICES, verbose_name='KPI 종류')
    
    # 목표값 (18자리, 소수점 4자리)
    target_value = models.DecimalField(
        max_digits=18, 
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='목표값'
    )
    
    # 단위
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, verbose_name='단위')
    
    # 작성자
    created_by = models.ForeignKey(
        'accounts.User', 
        on_delete=models.PROTECT, 
        related_name='kpi_targets',
        verbose_name='작성자'
    )
    
    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')
    
    class Meta:
        db_table = 'kpi_targets'
        ordering = ['-year', 'kpi_type']
        verbose_name = 'KPI 목표'
        verbose_name_plural = 'KPI 목표 목록'
        
        # (연도, KPI 종류) 조합 유일성 제약
        constraints = [
            models.UniqueConstraint(
                fields=['year', 'kpi_type'],
                name='unique_year_kpi_type'
            )
        ]
        
        # 인덱스
        indexes = [
            models.Index(fields=['year', 'kpi_type'], name='idx_year_kpi_type'),
            models.Index(fields=['kpi_type'], name='idx_kpi_type'),
        ]
    
    def save(self, *args, **kwargs):
        # ULID 생성 (최초 생성 시에만)
        if not self.kpi_uid:
            self.kpi_uid = str(ulid.new())
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.year}년 - {self.get_kpi_type_display()}: {self.target_value}{self.unit}"
    
    def get_unit_label(self):
        """한국어 단위 표시"""
        unit_map = {
            '%': '%',
            'ppm': 'ppm',
            'KRW': '원',
            'count': '건',
        }
        return unit_map.get(self.unit, '')
