"""
백업 파일과 데이터베이스 레코드 동기화 유틸리티
"""
import os
import logging
from pathlib import Path
from datetime import datetime
from django.conf import settings
from django.db import transaction
from .models import BackupRecord
from .backup_utils import get_backup_dir, cleanup_temp_files

logger = logging.getLogger(__name__)


def sync_backup_records():
    """
    백업 디렉토리의 파일과 데이터베이스 레코드를 동기화합니다.
    
    1. DB에는 있지만 파일이 없는 레코드 삭제
    2. 파일은 있지만 DB에 없는 경우 레코드 생성 (자동 백업으로 간주)
    
    Returns:
        dict: 동기화 통계
    """
    stats = {
        'orphaned_records_deleted': 0,  # 파일 없는 레코드 삭제
        'orphaned_files_registered': 0,  # 레코드 없는 파일 등록
        'errors': []
    }
    
    try:
        backup_dir = Path(get_backup_dir())
        
        if not backup_dir.exists():
            logger.warning(f"백업 디렉토리가 존재하지 않습니다: {backup_dir}")
            return stats
        
        # 1. DB에는 있지만 파일이 없는 레코드 삭제
        logger.info("DB 레코드 검증 중...")
        all_records = BackupRecord.objects.all()
        
        for record in all_records:
            file_path = Path(record.file_path)
            if not file_path.exists():
                logger.warning(f"백업 파일이 존재하지 않아 레코드 삭제: {record.file_path}")
                record.delete()
                stats['orphaned_records_deleted'] += 1
        
        # 2. 파일은 있지만 DB에 없는 경우 레코드 생성
        logger.info("백업 파일 검증 중...")
        existing_file_paths = set(
            BackupRecord.objects.values_list('file_path', flat=True)
        )
        
        # 백업 디렉토리의 모든 .sqlite3 파일 검색
        backup_files = list(backup_dir.glob('*.sqlite3'))
        
        for file_path in backup_files:
            file_path_str = str(file_path)
            
            # 임시 파일은 무시
            if 'temp' in file_path.name.lower() or 'tmp' in file_path.name.lower():
                continue
            
            # DB에 레코드가 없는 경우
            if file_path_str not in existing_file_paths:
                try:
                    file_size = file_path.stat().st_size
                    
                    # 파일명에서 백업 유형 추론
                    # db_backup_YYYYMMDD_HHMMSS.sqlite3 형식 가정
                    backup_type = 'auto'  # 기본값은 자동 백업으로 간주
                    
                    with transaction.atomic():
                        BackupRecord.objects.create(
                            file_size=file_size,
                            backup_type=backup_type,
                            file_path=file_path_str,
                            created_by=None,  # 알 수 없는 경우 None
                            note='시스템 동기화로 등록된 백업'
                        )
                    
                    logger.info(f"레코드 없는 백업 파일 등록: {file_path.name}")
                    stats['orphaned_files_registered'] += 1
                
                except Exception as e:
                    error_msg = f"백업 파일 등록 실패 ({file_path.name}): {str(e)}"
                    logger.error(error_msg)
                    stats['errors'].append(error_msg)
        
        # 임시 파일 정리
        try:
            temp_deleted = cleanup_temp_files()
            if temp_deleted > 0:
                logger.info(f"임시 파일 {temp_deleted}개 정리")
        except Exception as temp_error:
            logger.warning(f"임시 파일 정리 중 오류 (무시): {temp_error}")
        
        logger.info(
            f"백업 동기화 완료 - "
            f"삭제된 레코드: {stats['orphaned_records_deleted']}, "
            f"등록된 파일: {stats['orphaned_files_registered']}"
        )
    
    except Exception as e:
        error_msg = f"백업 동기화 실패: {str(e)}"
        logger.error(error_msg)
        stats['errors'].append(error_msg)
    
    return stats


def cleanup_orphaned_files():
    """
    DB 레코드 없는 백업 파일을 삭제합니다.
    
    Returns:
        int: 삭제된 파일 개수
    """
    deleted_count = 0
    
    try:
        backup_dir = Path(get_backup_dir())
        
        if not backup_dir.exists():
            return deleted_count
        
        # DB에 등록된 파일 경로 목록
        registered_files = set(
            BackupRecord.objects.values_list('file_path', flat=True)
        )
        
        # 백업 디렉토리의 모든 .sqlite3 파일 검색
        backup_files = list(backup_dir.glob('*.sqlite3'))
        
        for file_path in backup_files:
            # 임시 파일은 무시
            if 'temp' in file_path.name.lower() or 'tmp' in file_path.name.lower():
                continue
            
            file_path_str = str(file_path)
            
            # DB에 레코드가 없는 파일 삭제
            if file_path_str not in registered_files:
                try:
                    file_path.unlink()
                    logger.info(f"레코드 없는 백업 파일 삭제: {file_path.name}")
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"파일 삭제 실패 ({file_path.name}): {str(e)}")
    
    except Exception as e:
        logger.error(f"백업 파일 정리 실패: {str(e)}")
    
    return deleted_count


def get_backup_stats():
    """
    백업 통계 정보를 반환합니다.
    
    Returns:
        dict: 백업 통계
    """
    try:
        backup_dir = Path(get_backup_dir())
        
        # DB 레코드 통계
        total_records = BackupRecord.objects.count()
        auto_backups = BackupRecord.objects.filter(backup_type='auto').count()
        manual_backups = BackupRecord.objects.filter(backup_type='manual').count()
        
        # 파일 시스템 통계
        total_files = 0
        total_size = 0
        
        if backup_dir.exists():
            backup_files = list(backup_dir.glob('*.sqlite3'))
            total_files = len([f for f in backup_files if 'temp' not in f.name.lower()])
            total_size = sum(f.stat().st_size for f in backup_files if 'temp' not in f.name.lower())
        
        # 불일치 확인
        registered_files = set(BackupRecord.objects.values_list('file_path', flat=True))
        orphaned_records = 0
        orphaned_files = 0
        
        # DB 레코드 검증
        for record in BackupRecord.objects.all():
            if not Path(record.file_path).exists():
                orphaned_records += 1
        
        # 파일 시스템 검증
        if backup_dir.exists():
            for file_path in backup_dir.glob('*.sqlite3'):
                if 'temp' not in file_path.name.lower():
                    if str(file_path) not in registered_files:
                        orphaned_files += 1
        
        return {
            'total_records': total_records,
            'auto_backups': auto_backups,
            'manual_backups': manual_backups,
            'total_files': total_files,
            'total_size': total_size,
            'orphaned_records': orphaned_records,  # 파일 없는 레코드
            'orphaned_files': orphaned_files,      # 레코드 없는 파일
            'is_synced': orphaned_records == 0 and orphaned_files == 0
        }
    
    except Exception as e:
        logger.error(f"백업 통계 조회 실패: {str(e)}")
        return {
            'error': str(e)
        }

