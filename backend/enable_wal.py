"""
SQLite WAL(Write-Ahead Logging) 모드 활성화 스크립트

WAL 모드의 장점:
1. 읽기와 쓰기가 동시에 가능 (성능 향상)
2. 데이터베이스 잠금 감소
3. 트랜잭션 처리 속도 향상
"""

import os
import sqlite3
import django

# Django 설정 로드
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings

def enable_wal_mode():
    """SQLite 데이터베이스에 WAL 모드 활성화"""
    db_path = settings.DATABASES['default']['NAME']
    
    print(f"데이터베이스 경로: {db_path}")
    
    if not os.path.exists(db_path):
        print("⚠️  데이터베이스 파일이 존재하지 않습니다.")
        print("   먼저 'python manage.py migrate'를 실행하세요.")
        return
    
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 현재 journal 모드 확인
        cursor.execute("PRAGMA journal_mode;")
        current_mode = cursor.fetchone()[0]
        print(f"현재 journal 모드: {current_mode}")
        
        if current_mode.upper() == 'WAL':
            print("✅ WAL 모드가 이미 활성화되어 있습니다.")
        else:
            # WAL 모드 활성화
            cursor.execute("PRAGMA journal_mode=WAL;")
            new_mode = cursor.fetchone()[0]
            print(f"✅ WAL 모드로 변경되었습니다: {new_mode}")
        
        # 추가 최적화 설정
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA cache_size=-64000;")  # 64MB 캐시
        cursor.execute("PRAGMA temp_store=MEMORY;")
        
        # 설정 확인
        cursor.execute("PRAGMA synchronous;")
        sync = cursor.fetchone()[0]
        cursor.execute("PRAGMA cache_size;")
        cache = cursor.fetchone()[0]
        
        print(f"\n추가 최적화 설정:")
        print(f"  - synchronous: {sync}")
        print(f"  - cache_size: {cache} pages")
        print(f"  - temp_store: MEMORY")
        
        conn.commit()
        conn.close()
        
        print("\n✅ SQLite 최적화가 완료되었습니다!")
        print("\n📝 참고:")
        print("  - WAL 파일: {db_path}-wal")
        print("  - SHM 파일: {db_path}-shm")
        print("  - 이 파일들은 자동으로 생성되며 삭제하지 마세요.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    enable_wal_mode()

