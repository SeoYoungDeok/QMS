#!/usr/bin/env python
"""
관리자 계정 생성 스크립트
"""
import os
import sys
import django

# Django 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import User
from audit.models import AuditLog

def create_admin_user():
    # 기존 관리자 계정 확인
    admin_exists = User.objects.filter(role_level=2).exists()
    
    if admin_exists:
        print("관리자 계정이 이미 존재합니다.")
        return
    
    # 관리자 계정 생성
    admin_user = User.objects.create(
        username='admin',
        name='시스템관리자',
        department='품질팀',
        position='팀장',
        phone_number='010-0000-0000',
        role_level=2,  # 관리자
        status='active'  # 활성 상태
    )
    admin_user.set_password('Admin@123')
    admin_user.save()
    
    # 감사 로그 기록
    AuditLog.log_action(
        user=None,
        action='CREATE_USER',
        target_id=admin_user.id,
        details=f'시스템 관리자 계정 생성: {admin_user.username}',
        ip_address='127.0.0.1'
    )
    
    print(f"관리자 계정이 생성되었습니다:")
    print(f"  아이디: {admin_user.username}")
    print(f"  비밀번호: Admin@123")
    print(f"  권한: 관리자 (level {admin_user.role_level})")
    print(f"  상태: {admin_user.status}")

if __name__ == '__main__':
    print("QMS 시스템 초기 데이터 생성")
    print("=" * 40)
    
    create_admin_user()
    print()
    
    print()
    print("완료! 생성된 계정들:")
    print("1. admin / Admin@123 (관리자)")
