"""
데이터 아카이빙 및 삭제 로직
"""
import logging
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from performance.models import PerformanceRecord
from nonconformance.models import Nonconformance
from customer_complaints.models import CustomerComplaint
from audit.models import AuditLog

logger = logging.getLogger(__name__)


def archive_old_data():
    """
    오래된 데이터 삭제 작업
    - 실적/부적합/고객불만: 7년 이상 된 데이터 삭제
    - 감사 로그: 1년 이상 된 데이터 삭제
    
    Returns:
        dict: 삭제된 데이터 통계
    """
    now = timezone.now()
    seven_years_ago = now - timedelta(days=7*365)
    one_year_ago = now - timedelta(days=365)
    
    stats = {
        'performance_records': 0,
        'nonconformances': 0,
        'customer_complaints': 0,
        'audit_logs': 0,
        'errors': []
    }
    
    try:
        with transaction.atomic():
            # 1. 실적 데이터 삭제 (7년 이상)
            try:
                performance_count = PerformanceRecord.objects.filter(
                    created_at__lt=seven_years_ago
                ).count()
                
                if performance_count > 0:
                    deleted = PerformanceRecord.objects.filter(
                        created_at__lt=seven_years_ago
                    ).delete()
                    stats['performance_records'] = deleted[0]
                    logger.info(f"실적 데이터 {deleted[0]}건 삭제 (7년 이상)")
            except Exception as e:
                error_msg = f"실적 데이터 삭제 실패: {str(e)}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
            
            # 2. 부적합 데이터 삭제 (7년 이상)
            try:
                nonconformance_count = Nonconformance.objects.filter(
                    occurrence_date__lt=seven_years_ago.date()
                ).count()
                
                if nonconformance_count > 0:
                    deleted = Nonconformance.objects.filter(
                        occurrence_date__lt=seven_years_ago.date()
                    ).delete()
                    stats['nonconformances'] = deleted[0]
                    logger.info(f"부적합 데이터 {deleted[0]}건 삭제 (7년 이상)")
            except Exception as e:
                error_msg = f"부적합 데이터 삭제 실패: {str(e)}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
            
            # 3. 고객불만 데이터 삭제 (7년 이상)
            try:
                complaint_count = CustomerComplaint.objects.filter(
                    occurrence_date__lt=seven_years_ago.date()
                ).count()
                
                if complaint_count > 0:
                    deleted = CustomerComplaint.objects.filter(
                        occurrence_date__lt=seven_years_ago.date()
                    ).delete()
                    stats['customer_complaints'] = deleted[0]
                    logger.info(f"고객불만 데이터 {deleted[0]}건 삭제 (7년 이상)")
            except Exception as e:
                error_msg = f"고객불만 데이터 삭제 실패: {str(e)}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
            
            # 4. 감사 로그 삭제 (1년 이상)
            try:
                audit_count = AuditLog.objects.filter(
                    created_at__lt=one_year_ago
                ).count()
                
                if audit_count > 0:
                    deleted = AuditLog.objects.filter(
                        created_at__lt=one_year_ago
                    ).delete()
                    stats['audit_logs'] = deleted[0]
                    logger.info(f"감사 로그 {deleted[0]}건 삭제 (1년 이상)")
            except Exception as e:
                error_msg = f"감사 로그 삭제 실패: {str(e)}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
            
            # 삭제 작업 완료 후 감사 로그 기록
            try:
                total_deleted = (
                    stats['performance_records'] + 
                    stats['nonconformances'] + 
                    stats['customer_complaints'] + 
                    stats['audit_logs']
                )
                
                details = (
                    f"실적: {stats['performance_records']}건, "
                    f"부적합: {stats['nonconformances']}건, "
                    f"고객불만: {stats['customer_complaints']}건, "
                    f"감사로그: {stats['audit_logs']}건"
                )
                
                AuditLog.objects.create(
                    user_id=None,  # 시스템 작업
                    action='DELETE_OLD_DATA',
                    target_id=total_deleted,
                    details=details,
                    ip_address='system'
                )
            except Exception as e:
                logger.error(f"감사 로그 기록 실패: {str(e)}")
    
    except Exception as e:
        error_msg = f"데이터 아카이빙 중 오류 발생: {str(e)}"
        logger.error(error_msg)
        stats['errors'].append(error_msg)
    
    return stats


def get_archivable_data_count():
    """
    삭제 가능한 데이터 개수 조회
    
    Returns:
        dict: 삭제 가능한 데이터 통계
    """
    now = timezone.now()
    seven_years_ago = now - timedelta(days=7*365)
    one_year_ago = now - timedelta(days=365)
    
    return {
        'performance_records': PerformanceRecord.objects.filter(
            created_at__lt=seven_years_ago
        ).count(),
        'nonconformances': Nonconformance.objects.filter(
            occurrence_date__lt=seven_years_ago.date()
        ).count(),
        'customer_complaints': CustomerComplaint.objects.filter(
            occurrence_date__lt=seven_years_ago.date()
        ).count(),
        'audit_logs': AuditLog.objects.filter(
            created_at__lt=one_year_ago
        ).count(),
    }

