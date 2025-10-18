"""
백업 파일 생성 및 복원 유틸리티
"""
import os
import shutil
import logging
from datetime import datetime
from django.conf import settings
from pathlib import Path

logger = logging.getLogger(__name__)


def get_backup_dir():
    """백업 디렉토리 경로 반환"""
    backup_dir = getattr(settings, 'BACKUP_DIR', settings.BASE_DIR / 'backups')
    
    # 디렉토리가 없으면 생성
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir, exist_ok=True)
    
    return backup_dir


def get_database_path():
    """현재 사용 중인 데이터베이스 파일 경로 반환"""
    db_settings = settings.DATABASES['default']
    
    if db_settings['ENGINE'] != 'django.db.backends.sqlite3':
        raise ValueError("SQLite 데이터베이스만 백업 가능합니다.")
    
    return Path(db_settings['NAME'])


def create_backup(backup_type='manual', created_by=None):
    """
    데이터베이스 백업 파일 생성
    
    Args:
        backup_type: 백업 유형 ('auto' 또는 'manual')
        created_by: 생성자 (User 객체 또는 None)
    
    Returns:
        tuple: (backup_file_path, file_size)
    """
    try:
        # 데이터베이스 파일 경로
        db_path = get_database_path()
        
        if not db_path.exists():
            raise FileNotFoundError(f"데이터베이스 파일을 찾을 수 없습니다: {db_path}")
        
        # 백업 디렉토리
        backup_dir = get_backup_dir()
        
        # 백업 파일명 생성
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"db_backup_{timestamp}.sqlite3"
        backup_path = Path(backup_dir) / backup_filename
        
        # 파일 복사
        shutil.copy2(db_path, backup_path)
        
        # 파일 크기
        file_size = backup_path.stat().st_size
        
        logger.info(f"백업 파일 생성 완료: {backup_path} ({file_size} bytes)")
        
        return str(backup_path), file_size
    
    except Exception as e:
        logger.error(f"백업 파일 생성 실패: {str(e)}")
        raise


def restore_backup(backup_file_path):
    """
    백업 파일로부터 데이터베이스 복원
    
    Args:
        backup_file_path: 복원할 백업 파일 경로
    
    Returns:
        bool: 성공 여부
    """
    import sqlite3
    import time
    from django.db import connections
    
    try:
        backup_path = Path(backup_file_path)
        
        if not backup_path.exists():
            raise FileNotFoundError(f"백업 파일을 찾을 수 없습니다: {backup_path}")
        
        # 현재 데이터베이스 파일 경로
        db_path = get_database_path()
        
        # 모든 데이터베이스 연결 닫기
        connections.close_all()
        
        # 연결이 완전히 닫힐 때까지 대기
        time.sleep(1)
        
        # 현재 DB를 임시로 백업 (복원 실패 시 롤백용)
        temp_backup = db_path.parent / f"{db_path.name}.temp_backup"
        
        # WAL 파일도 함께 백업
        wal_file = Path(str(db_path) + '-wal')
        shm_file = Path(str(db_path) + '-shm')
        
        temp_wal = db_path.parent / f"{db_path.name}.temp_backup-wal"
        temp_shm = db_path.parent / f"{db_path.name}.temp_backup-shm"
        
        try:
            # WAL 모드 체크포인트 실행 (기존 데이터베이스)
            try:
                conn = sqlite3.connect(str(db_path))
                conn.execute('PRAGMA wal_checkpoint(TRUNCATE)')
                conn.close()
                time.sleep(0.5)  # 파일 시스템 동기화 대기
            except Exception as checkpoint_error:
                logger.warning(f"초기 WAL checkpoint 실패 (무시 가능): {checkpoint_error}")
            
            # 현재 DB 파일들 백업 (재시도 로직 포함)
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    shutil.copy2(db_path, temp_backup)
                    if wal_file.exists():
                        shutil.copy2(wal_file, temp_wal)
                    if shm_file.exists():
                        shutil.copy2(shm_file, temp_shm)
                    break
                except (PermissionError, OSError) as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"백업 시도 {attempt + 1}/{max_retries} 실패: {e}, 재시도 중...")
                        time.sleep(2)
                    else:
                        raise
            
            # 기존 WAL/SHM 파일 삭제 (재시도 로직 포함)
            for attempt in range(max_retries):
                try:
                    if wal_file.exists():
                        wal_file.unlink()
                    if shm_file.exists():
                        shm_file.unlink()
                    break
                except (PermissionError, OSError) as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"WAL/SHM 파일 삭제 시도 {attempt + 1}/{max_retries} 실패: {e}, 재시도 중...")
                        time.sleep(2)
                    else:
                        # WAL/SHM 파일 삭제 실패는 경고만 하고 계속 진행
                        logger.warning(f"WAL/SHM 파일 삭제 실패 (무시하고 계속): {e}")
                        break
            
            # 백업 파일로 교체 (재시도 로직 포함)
            for attempt in range(max_retries):
                try:
                    shutil.copy2(backup_path, db_path)
                    break
                except (PermissionError, OSError) as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"복원 시도 {attempt + 1}/{max_retries} 실패: {e}, 재시도 중...")
                        time.sleep(2)
                    else:
                        raise
            
            # SQLite 체크포인트 실행하여 WAL 파일 동기화
            try:
                conn = sqlite3.connect(str(db_path))
                conn.execute('PRAGMA wal_checkpoint(TRUNCATE)')
                conn.close()
            except Exception as checkpoint_error:
                logger.warning(f"최종 WAL checkpoint 실패 (무시 가능): {checkpoint_error}")
            
            # 임시 백업 삭제
            try:
                if temp_backup.exists():
                    temp_backup.unlink()
                if temp_wal.exists():
                    temp_wal.unlink()
                if temp_shm.exists():
                    temp_shm.unlink()
            except Exception as cleanup_error:
                logger.warning(f"임시 파일 정리 실패 (무시 가능): {cleanup_error}")
            
            logger.info(f"데이터베이스 복원 완료: {backup_path}")
            return True
        
        except Exception as e:
            # 복원 실패 시 롤백
            logger.error(f"데이터베이스 복원 실패, 롤백 중: {str(e)}")
            
            try:
                if temp_backup.exists():
                    shutil.copy2(temp_backup, db_path)
                    temp_backup.unlink()
                
                if temp_wal.exists() and wal_file.parent.exists():
                    shutil.copy2(temp_wal, wal_file)
                    temp_wal.unlink()
                
                if temp_shm.exists() and shm_file.parent.exists():
                    shutil.copy2(temp_shm, shm_file)
                    temp_shm.unlink()
            except Exception as rollback_error:
                logger.error(f"롤백 중 오류 발생: {rollback_error}")
            
            raise
    
    except Exception as e:
        logger.error(f"백업 복원 실패: {str(e)}")
        raise


def delete_old_backups(keep_count=10):
    """
    오래된 백업 파일 삭제 (최신 N개만 유지)
    
    Args:
        keep_count: 유지할 백업 개수
    """
    try:
        backup_dir = get_backup_dir()
        
        # 백업 파일 목록 (생성일시 기준 정렬)
        backup_files = sorted(
            [f for f in Path(backup_dir).glob('db_backup_*.sqlite3')],
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        
        # keep_count 개수를 초과하는 오래된 파일 삭제
        for old_file in backup_files[keep_count:]:
            try:
                old_file.unlink()
                logger.info(f"오래된 백업 파일 삭제: {old_file}")
            except Exception as e:
                logger.error(f"백업 파일 삭제 실패 ({old_file}): {str(e)}")
    
    except Exception as e:
        logger.error(f"오래된 백업 파일 정리 실패: {str(e)}")


def cleanup_temp_files():
    """
    백업 디렉토리의 모든 임시 파일 정리
    - temp_* 파일
    - *.temp_backup* 파일
    - 1시간 이상 된 임시 파일 자동 삭제
    
    Returns:
        int: 삭제된 파일 개수
    """
    import time
    
    deleted_count = 0
    
    try:
        backup_dir = Path(get_backup_dir())
        
        if not backup_dir.exists():
            return deleted_count
        
        # 현재 시간
        current_time = time.time()
        one_hour_ago = current_time - 3600  # 1시간 = 3600초
        
        # temp로 시작하는 파일들
        temp_patterns = [
            'temp_*.sqlite3',
            'temp_*',
            '*.temp_backup*',
            'uploaded_backup_*',
        ]
        
        for pattern in temp_patterns:
            for temp_file in backup_dir.glob(pattern):
                try:
                    # 파일 수정 시간 확인
                    file_mtime = temp_file.stat().st_mtime
                    
                    # 1시간 이상 된 임시 파일만 삭제
                    if file_mtime < one_hour_ago:
                        temp_file.unlink()
                        logger.info(f"오래된 임시 파일 삭제: {temp_file.name}")
                        deleted_count += 1
                except Exception as e:
                    logger.error(f"임시 파일 삭제 실패 ({temp_file}): {str(e)}")
        
        if deleted_count > 0:
            logger.info(f"임시 파일 정리 완료: {deleted_count}개 삭제")
        return deleted_count
    
    except Exception as e:
        logger.error(f"임시 파일 정리 실패: {str(e)}")
        return deleted_count


def validate_backup_file(file_path):
    """
    백업 파일 유효성 검증
    
    Args:
        file_path: 검증할 파일 경로
    
    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        file_path = Path(file_path)
        
        # 파일 존재 확인
        if not file_path.exists():
            return False, "파일이 존재하지 않습니다."
        
        # 파일 확장자 확인
        if file_path.suffix.lower() != '.sqlite3':
            return False, "SQLite3 파일만 업로드 가능합니다."
        
        # 파일 크기 확인 (최대 1GB)
        max_size = 1 * 1024 * 1024 * 1024  # 1GB
        if file_path.stat().st_size > max_size:
            return False, "파일 크기가 너무 큽니다 (최대 1GB)."
        
        # SQLite 파일 시그니처 확인
        with open(file_path, 'rb') as f:
            header = f.read(16)
            if not header.startswith(b'SQLite format 3'):
                return False, "유효한 SQLite3 파일이 아닙니다."
        
        return True, None
    
    except Exception as e:
        return False, f"파일 검증 중 오류 발생: {str(e)}"

