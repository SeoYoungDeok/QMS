"""
Gunicorn 설정 파일
프로덕션 환경에서 Django 애플리케이션을 실행하기 위한 설정
"""

import multiprocessing
import os

# 서버 소켓
bind = "127.0.0.1:8000"
backlog = 2048

# Worker 프로세스
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2

# 로깅
accesslog = "logs/gunicorn_access.log"
errorlog = "logs/gunicorn_error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# 프로세스 이름
proc_name = "qms_gunicorn"

# 재시작 설정
max_requests = 1000
max_requests_jitter = 50

# 보안
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# 개발 환경용 (리로드 활성화 - 프로덕션에서는 False로 설정)
reload = False

# 환경 변수
raw_env = [
    "DJANGO_SETTINGS_MODULE=backend.settings",
]

