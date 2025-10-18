"""
Django APScheduler를 사용한 백업 및 데이터 아카이빙 스케줄러
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django.conf import settings
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution
from django_apscheduler import util

logger = logging.getLogger(__name__)

# 스케줄러 인스턴스 (싱글톤)
scheduler = None


def create_weekly_backup():
    """
    매주 일요일 자정(월요일로 넘어가는 시점) 백업 작업
    """
    from .backup_utils import create_backup, delete_old_backups
    from .models import BackupRecord
    from audit.models import AuditLog
    
    try:
        logger.info("자동 백업 작업 시작")
        
        # 백업 파일 생성
        backup_path, file_size = create_backup(backup_type='auto', created_by=None)
        
        # 백업 이력 저장
        BackupRecord.objects.create(
            file_size=file_size,
            backup_type='auto',
            file_path=backup_path,
            created_by=None,
            note='주간 자동 백업'
        )
        
        # 감사 로그 기록
        AuditLog.objects.create(
            user_id=None,
            action='AUTO_BACKUP',
            details=f'자동 백업 생성 완료 (파일 크기: {file_size} bytes)',
            ip_address='system'
        )
        
        # 오래된 백업 파일 정리 (최신 10개만 유지)
        delete_old_backups(keep_count=10)
        
        logger.info(f"자동 백업 작업 완료: {backup_path}")
    
    except Exception as e:
        logger.error(f"자동 백업 작업 실패: {str(e)}")
        
        # 실패 로그 기록
        try:
            AuditLog.objects.create(
                user_id=None,
                action='AUTO_BACKUP',
                details=f'자동 백업 실패: {str(e)}',
                ip_address='system'
            )
        except:
            pass


def archive_old_data_job():
    """
    매년 1월 1일 자정 데이터 정리 작업
    """
    from .data_archiver import archive_old_data
    
    try:
        logger.info("데이터 아카이빙 작업 시작")
        
        # 오래된 데이터 삭제
        stats = archive_old_data()
        
        logger.info(f"데이터 아카이빙 작업 완료: {stats}")
    
    except Exception as e:
        logger.error(f"데이터 아카이빙 작업 실패: {str(e)}")


@util.close_old_connections
def delete_old_job_executions(max_age=604_800):
    """
    오래된 작업 실행 기록 삭제 (기본 7일)
    """
    DjangoJobExecution.objects.delete_old_job_executions(max_age)


def start():
    """스케줄러 시작"""
    global scheduler
    
    if scheduler is not None:
        logger.warning("스케줄러가 이미 실행 중입니다.")
        return
    
    try:
        scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
        scheduler.add_jobstore(DjangoJobStore(), "default")
        
        # 매월 1일 자정 - 백업 작업
        scheduler.add_job(
            create_weekly_backup,
            trigger=CronTrigger(
                day=1,              # 매월 1일
                hour=0,             # 자정
                minute=0,
                timezone=settings.TIME_ZONE
            ),
            id='monthly_backup',
            max_instances=1,
            replace_existing=True,
            name='월간 자동 백업'
        )
        logger.info("월간 백업 작업 스케줄 등록: 매월 1일 00:00")
        
        # 매년 1월 1일 자정 - 데이터 아카이빙 작업
        scheduler.add_job(
            archive_old_data_job,
            trigger=CronTrigger(
                month=1,    # 1월
                day=1,      # 1일
                hour=0,     # 자정
                minute=0,
                timezone=settings.TIME_ZONE
            ),
            id='yearly_archive',
            max_instances=1,
            replace_existing=True,
            name='연간 데이터 아카이빙'
        )
        logger.info("데이터 아카이빙 작업 스케줄 등록: 매년 1월 1일 00:00")
        
        # 매주 월요일 자정 - 오래된 작업 실행 기록 삭제
        scheduler.add_job(
            delete_old_job_executions,
            trigger=CronTrigger(
                day_of_week='mon',
                hour=0,
                minute=0,
                timezone=settings.TIME_ZONE
            ),
            id='delete_old_job_executions',
            max_instances=1,
            replace_existing=True,
            name='오래된 작업 실행 기록 삭제'
        )
        
        # 매일 자정 - 임시 파일 정리
        from .backup_utils import cleanup_temp_files
        scheduler.add_job(
            cleanup_temp_files,
            trigger=CronTrigger(
                hour=0,
                minute=0,
                timezone=settings.TIME_ZONE
            ),
            id='cleanup_temp_files',
            max_instances=1,
            replace_existing=True,
            name='임시 백업 파일 정리'
        )
        logger.info("임시 파일 정리 작업 스케줄 등록: 매일 00:00")
        
        scheduler.start()
        logger.info("스케줄러 시작 완료")
    
    except Exception as e:
        logger.error(f"스케줄러 시작 실패: {str(e)}")
        scheduler = None


def stop():
    """스케줄러 중지"""
    global scheduler
    
    if scheduler is not None:
        scheduler.shutdown()
        scheduler = None
        logger.info("스케줄러 중지 완료")

