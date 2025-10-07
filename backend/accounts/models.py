from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone


class User(models.Model):
    """
    QMS 사용자 모델
    기획서 기준에 따라 정확히 구현
    """
    # 계정 상태 선택지
    STATUS_CHOICES = [
        ('active', '활성'),
        ('locked', '잠금'),
        ('deleted', '삭제'),
    ]
    
    # 권한 레벨 선택지
    ROLE_LEVEL_CHOICES = [
        (0, '게스트'),
        (1, '실무자'),
        (2, '관리자'),
    ]
    
    # 기획서에 명시된 필수 컬럼들
    username = models.CharField(max_length=50, unique=True, verbose_name='아이디')
    password_hash = models.CharField(max_length=255, verbose_name='비밀번호 해시')
    name = models.CharField(max_length=50, verbose_name='사용자 이름')
    department = models.CharField(max_length=100, verbose_name='부서')
    position = models.CharField(max_length=50, verbose_name='직급')
    phone_number = models.CharField(max_length=20, verbose_name='핸드폰 번호')
    role_level = models.IntegerField(choices=ROLE_LEVEL_CHOICES, default=0, verbose_name='권한 레벨')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='locked', verbose_name='계정 상태')
    failed_attempts = models.IntegerField(default=0, verbose_name='로그인 실패 횟수')
    last_failed_at = models.DateTimeField(null=True, blank=True, verbose_name='마지막 실패 시각')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='가입일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')
    last_login_at = models.DateTimeField(null=True, blank=True, verbose_name='최종 로그인 시간')
    
    class Meta:
        db_table = 'users'
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'
    
    def __str__(self):
        return f"{self.username} ({self.name})"
    
    def set_password(self, raw_password):
        """비밀번호를 해시화하여 저장"""
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """비밀번호 검증"""
        return check_password(raw_password, self.password_hash)
    
    def increment_failed_attempts(self):
        """로그인 실패 횟수 증가"""
        self.failed_attempts += 1
        self.last_failed_at = timezone.now()
        
        # 5회 실패 시 계정 잠금
        if self.failed_attempts >= 5:
            self.status = 'locked'
        
        self.save()
    
    def reset_failed_attempts(self):
        """로그인 실패 횟수 초기화"""
        self.failed_attempts = 0
        self.last_failed_at = None
        self.last_login_at = timezone.now()
        self.save()
    
    def is_active_user(self):
        """활성 사용자인지 확인"""
        return self.status == 'active'
    
    def get_role_display_name(self):
        """권한 레벨 표시명 반환"""
        role_map = {0: 'Guest', 1: 'Practitioner', 2: 'Admin'}
        return role_map.get(self.role_level, 'Unknown')
    
    # Django 인증 시스템 호환성을 위한 속성들
    @property
    def is_authenticated(self):
        """항상 True 반환 (익명 사용자가 아니므로)"""
        return True
    
    @property
    def is_anonymous(self):
        """항상 False 반환 (인증된 사용자이므로)"""
        return False
    
    @property
    def is_active(self):
        """계정이 활성 상태인지 확인"""
        return self.status == 'active'