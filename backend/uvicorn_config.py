"""
Uvicorn 설정 파일
프로덕션 환경에서 Django ASGI 애플리케이션을 실행하기 위한 설정

Windows 환경에서도 사용 가능한 ASGI 서버
"""

# 서버 설정
bind = "127.0.0.1:8000"
host = "127.0.0.1"
port = 8000

# Worker 설정
workers = 4  # CPU 코어 수에 맞게 조정 가능

# 로깅
log_level = "info"
access_log = True

# 개발 환경용 (프로덕션에서는 False로 설정)
reload = False

# 타임아웃
timeout_keep_alive = 5

# 보안
limit_concurrency = 1000
limit_max_requests = 1000

# 프로토콜
interface = "asgi3"

