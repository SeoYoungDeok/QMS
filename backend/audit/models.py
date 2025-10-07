from django.db import models
from accounts.models import User


class AuditLog(models.Model):
    """
    감사 로그 모델
    기획서 기준에 따라 정확히 구현
    """
    
    # 액션 타입 선택지 (기획서에 명시된 주요 이벤트들)
    ACTION_CHOICES = [
        ('LOGIN_SUCCESS', '로그인 성공'),
        ('LOGIN_FAILED', '로그인 실패'),
        ('CREATE_USER', '사용자 추가'),
        ('UPDATE_USER', '사용자 수정'),
        ('DELETE_USER', '사용자 삭제'),
        ('RESTORE_USER', '사용자 복구'),
        ('RESET_PASSWORD', '비밀번호 초기화'),
        ('CHANGE_PASSWORD', '비밀번호 변경'),
        ('UPDATE_ROLE', '권한 변경'),
        ('UPDATE_STATUS', '계정 상태 변경'),
        ('SIGNUP', '회원가입'),
        ('CREATE_PERFORMANCE', '실적 등록'),
        ('UPDATE_PERFORMANCE', '실적 수정'),
        ('DELETE_PERFORMANCE', '실적 삭제'),
        ('CREATE_NONCONFORMANCE', '부적합 등록'),
        ('UPDATE_NONCONFORMANCE', '부적합 수정'),
        ('DELETE_NONCONFORMANCE', '부적합 삭제'),
        ('CREATE_SCHEDULE', '일정 등록'),
        ('UPDATE_SCHEDULE', '일정 수정'),
        ('DELETE_SCHEDULE', '일정 삭제'),
    ]
    
    # 기획서에 명시된 필수 컬럼들
    user_id = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='작업 수행자 ID')
    action = models.CharField(max_length=100, choices=ACTION_CHOICES, verbose_name='수행한 작업')
    target_id = models.BigIntegerField(null=True, blank=True, verbose_name='대상 리소스 ID')
    details = models.TextField(blank=True, verbose_name='상세 정보')
    ip_address = models.CharField(max_length=50, blank=True, verbose_name='작업 발생 IP')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='이벤트 발생 시각')
    
    class Meta:
        db_table = 'audit_logs'
        verbose_name = '감사 로그'
        verbose_name_plural = '감사 로그 목록'
        ordering = ['-created_at']  # 최신 순으로 정렬
    
    def __str__(self):
        user_name = self.user_id.username if self.user_id else 'System'
        return f"{user_name} - {self.get_action_display()} ({self.created_at})"
    
    @classmethod
    def log_action(cls, user, action, target_id=None, details='', ip_address=''):
        """감사 로그 기록 헬퍼 메서드"""
        return cls.objects.create(
            user_id=user,
            action=action,
            target_id=target_id,
            details=details,
            ip_address=ip_address
        )