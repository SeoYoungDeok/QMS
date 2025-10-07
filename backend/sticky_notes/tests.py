from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from .models import StickyNote, Tag

User = get_user_model()


class StickyNoteModelTest(TestCase):
    """포스트잇 모델 테스트"""
    
    def setUp(self):
        self.user = User.objects.create(
            username='testuser',
            name='테스트',
            department='개발팀',
            position='대리',
            phone_number='010-1234-5678',
            role_level=1,
            status='active'
        )
        self.user.set_password('testpass123')
        self.user.save()
    
    def test_create_sticky_note(self):
        """포스트잇 생성 테스트"""
        note = StickyNote.objects.create(
            author=self.user,
            content='테스트 메모',
            importance='high',
            color='yellow',
            x=100,
            y=200
        )
        self.assertIsNotNone(note.note_uid)
        self.assertEqual(note.content, '테스트 메모')
        self.assertEqual(note.importance, 'high')


class StickyNoteAPITest(APITestCase):
    """포스트잇 API 테스트"""
    
    def setUp(self):
        self.user = User.objects.create(
            username='testuser',
            name='테스트',
            department='개발팀',
            position='대리',
            phone_number='010-1234-5678',
            role_level=1,
            status='active'
        )
        self.user.set_password('testpass123')
        self.user.save()
    
    def test_list_sticky_notes(self):
        """포스트잇 목록 조회 테스트"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/sticky-notes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
