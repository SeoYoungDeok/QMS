from django.apps import AppConfig


class BackupManagementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backup_management'
    verbose_name = '백업 관리'
    
    def ready(self):
        """앱 시작 시 스케줄러 자동 실행 및 백업 동기화"""
        import os
        import logging
        logger = logging.getLogger(__name__)
        
        # 마이그레이션 실행 시나 테스트 환경에서는 스케줄러 시작하지 않음
        if os.environ.get('RUN_MAIN', None) == 'true' or os.environ.get('DJANGO_SETTINGS_MODULE'):
            try:
                # 백업 파일과 DB 레코드 동기화
                from .sync_utils import sync_backup_records
                logger.info("백업 파일 동기화 시작...")
                stats = sync_backup_records()
                logger.info(f"백업 동기화 완료: {stats}")
            except Exception as e:
                logger.warning(f"백업 동기화 실패: {e}")
            
            try:
                # 스케줄러 시작
                from . import scheduler
                scheduler.start()
            except Exception as e:
                logger.warning(f"스케줄러 시작 실패: {e}")
