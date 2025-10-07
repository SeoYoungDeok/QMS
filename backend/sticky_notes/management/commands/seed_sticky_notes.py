from django.core.management.base import BaseCommand
from sticky_notes.models import StickyNote, Tag
from accounts.models import User
import random


class Command(BaseCommand):
    help = '포스트잇 테스트 데이터 생성'

    def handle(self, *args, **options):
        self.stdout.write('포스트잇 테스트 데이터 생성 시작...')

        # 활성 사용자 가져오기
        users = User.objects.filter(status='active', role_level__gte=1)
        if not users.exists():
            self.stdout.write(self.style.ERROR('활성 사용자가 없습니다. 먼저 사용자를 생성하세요.'))
            return

        # 태그 생성
        tag_names = ['긴급', '중요', 'TODO', '아이디어', '버그', '개선', '회의', '검토']
        tag_colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
        
        tags = []
        for name, color in zip(tag_names, tag_colors):
            tag, created = Tag.objects.get_or_create(
                name=name,
                defaults={'color': color}
            )
            tags.append(tag)
            if created:
                self.stdout.write(f'  태그 생성: {name}')

        # 포스트잇 생성
        colors = ['yellow', 'blue', 'pink', 'green', 'purple', 'gray']
        importances = ['low', 'medium', 'high']
        
        sample_contents = [
            '회의록 작성 완료하기',
            '품질 검사 보고서 검토',
            '고객 피드백 정리',
            '다음 주 일정 확인',
            '프로젝트 진행 상황 업데이트',
            '버그 수정 리스트 작성',
            '신규 기능 아이디어 브레인스토밍',
            '문서 업데이트 필요',
            '테스트 케이스 추가',
            '코드 리뷰 요청',
        ]

        notes_created = 0
        for i in range(20):
            user = random.choice(users)
            content = random.choice(sample_contents) + f' ({i+1})'
            
            note = StickyNote.objects.create(
                author=user,
                content=content,
                importance=random.choice(importances),
                color=random.choice(colors),
                x=random.randint(50, 1200),
                y=random.randint(50, 800),
                width=random.randint(200, 280),
                height=random.randint(150, 200),
                z_index=i + 1,
                is_locked=random.choice([False, False, False, True])  # 25% 확률로 잠금
            )
            
            # 랜덤하게 태그 추가 (0~3개)
            selected_tags = random.sample(tags, k=random.randint(0, 3))
            note.tags.set(selected_tags)
            
            notes_created += 1

        self.stdout.write(self.style.SUCCESS(f'\n✅ 완료!'))
        self.stdout.write(self.style.SUCCESS(f'  - 태그: {len(tags)}개'))
        self.stdout.write(self.style.SUCCESS(f'  - 포스트잇: {notes_created}개'))

