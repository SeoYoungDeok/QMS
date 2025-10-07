from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from audit.models import AuditLog
from accounts.models import User


class Command(BaseCommand):
    help = '테스트용 감사 로그 데이터 생성'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='생성할 로그 개수 (기본값: 50)'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        # 사용자 조회
        users = list(User.objects.filter(status='active'))
        if not users:
            self.stdout.write(self.style.ERROR('활성 사용자가 없습니다. 먼저 사용자를 생성하세요.'))
            return
        
        # 액션 타입 목록
        actions = [choice[0] for choice in AuditLog.ACTION_CHOICES]
        
        # IP 주소 풀
        ip_addresses = [
            '192.168.1.100',
            '192.168.1.101',
            '192.168.1.102',
            '10.0.0.50',
            '10.0.0.51',
        ]
        
        created_logs = 0
        now = timezone.now()
        
        for i in range(count):
            # 랜덤 데이터 생성
            user = random.choice(users)
            action = random.choice(actions)
            ip_address = random.choice(ip_addresses)
            
            # 과거 시간 생성 (최근 30일 내)
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            created_at = now - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
            
            # 상세 정보 생성
            details = self._generate_details(action, user)
            
            # 로그 생성
            log = AuditLog.objects.create(
                user_id=user,
                action=action,
                target_id=random.randint(1, 100) if random.random() > 0.3 else None,
                details=details,
                ip_address=ip_address,
            )
            
            # created_at 수정 (auto_now_add 우회)
            AuditLog.objects.filter(pk=log.pk).update(created_at=created_at)
            
            created_logs += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ {created_logs}개의 감사 로그를 생성했습니다.')
        )
    
    def _generate_details(self, action, user):
        """액션 타입에 따른 상세 정보 생성"""
        details_map = {
            'LOGIN_SUCCESS': f'{user.username} 사용자가 로그인했습니다.',
            'LOGIN_FAILED': f'{user.username} 로그인 시도 실패',
            'CREATE_USER': f'새 사용자 계정 생성',
            'UPDATE_USER': f'{user.username} 사용자 정보 수정',
            'DELETE_USER': f'사용자 계정 삭제',
            'RESET_PASSWORD': f'{user.username} 비밀번호 초기화',
            'UPDATE_ROLE': f'{user.username} 권한 변경',
            'UPDATE_STATUS': f'{user.username} 계정 상태 변경',
            'SIGNUP': f'신규 회원가입: {user.username}',
            'CREATE_PERFORMANCE': f'실적 데이터 등록',
            'UPDATE_PERFORMANCE': f'실적 데이터 수정',
            'DELETE_PERFORMANCE': f'실적 데이터 삭제',
            'CREATE_NONCONFORMANCE': f'부적합 등록',
            'UPDATE_NONCONFORMANCE': f'부적합 수정',
            'DELETE_NONCONFORMANCE': f'부적합 삭제',
            'CREATE_SCHEDULE': f'일정 등록',
            'UPDATE_SCHEDULE': f'일정 수정',
            'DELETE_SCHEDULE': f'일정 삭제',
        }
        
        return details_map.get(action, f'{action} 수행')

