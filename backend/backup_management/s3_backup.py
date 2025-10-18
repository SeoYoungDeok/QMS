"""
AWS S3 백업 유틸리티

로컬 백업 파일을 S3 버킷에 업로드하고 관리합니다.
"""

import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
from django.conf import settings

logger = logging.getLogger(__name__)

# boto3 임포트 (선택적 의존성)
try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    logger.warning("boto3가 설치되어 있지 않습니다. S3 백업 기능이 비활성화됩니다.")


def is_s3_configured():
    """S3 설정이 완료되었는지 확인"""
    if not BOTO3_AVAILABLE:
        return False
    
    required_settings = [
        settings.AWS_S3_BACKUP_BUCKET,
        settings.AWS_ACCESS_KEY_ID,
        settings.AWS_SECRET_ACCESS_KEY,
    ]
    
    return all(required_settings)


def get_s3_client():
    """S3 클라이언트 생성"""
    if not BOTO3_AVAILABLE:
        raise ImportError("boto3가 설치되어 있지 않습니다. 'uv add boto3'로 설치하세요.")
    
    if not is_s3_configured():
        raise ValueError("S3 설정이 완료되지 않았습니다. .env 파일을 확인하세요.")
    
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_DEFAULT_REGION
    )


def upload_to_s3(file_path, s3_key=None):
    """
    로컬 파일을 S3에 업로드
    
    Args:
        file_path: 업로드할 로컬 파일 경로
        s3_key: S3 객체 키 (None이면 파일명 사용)
    
    Returns:
        bool: 성공 여부
    """
    if not is_s3_configured():
        logger.error("S3가 설정되어 있지 않습니다.")
        return False
    
    file_path = Path(file_path)
    if not file_path.exists():
        logger.error(f"파일을 찾을 수 없습니다: {file_path}")
        return False
    
    if s3_key is None:
        s3_key = f"backups/{file_path.name}"
    
    try:
        s3_client = get_s3_client()
        bucket = settings.AWS_S3_BACKUP_BUCKET
        
        logger.info(f"S3 업로드 시작: {file_path.name} -> s3://{bucket}/{s3_key}")
        
        s3_client.upload_file(
            str(file_path),
            bucket,
            s3_key,
            ExtraArgs={
                'StorageClass': 'STANDARD_IA',  # 비용 절감을 위한 Infrequent Access
                'ServerSideEncryption': 'AES256'  # 서버 측 암호화
            }
        )
        
        logger.info(f"S3 업로드 완료: {s3_key}")
        return True
        
    except NoCredentialsError:
        logger.error("AWS 자격 증명을 찾을 수 없습니다.")
        return False
    except ClientError as e:
        logger.error(f"S3 업로드 실패: {e}")
        return False
    except Exception as e:
        logger.error(f"예기치 않은 오류: {e}")
        return False


def download_from_s3(s3_key, local_path):
    """
    S3에서 파일 다운로드
    
    Args:
        s3_key: S3 객체 키
        local_path: 저장할 로컬 경로
    
    Returns:
        bool: 성공 여부
    """
    if not is_s3_configured():
        logger.error("S3가 설정되어 있지 않습니다.")
        return False
    
    try:
        s3_client = get_s3_client()
        bucket = settings.AWS_S3_BACKUP_BUCKET
        
        logger.info(f"S3 다운로드 시작: s3://{bucket}/{s3_key} -> {local_path}")
        
        s3_client.download_file(bucket, s3_key, str(local_path))
        
        logger.info(f"S3 다운로드 완료: {local_path}")
        return True
        
    except ClientError as e:
        logger.error(f"S3 다운로드 실패: {e}")
        return False
    except Exception as e:
        logger.error(f"예기치 않은 오류: {e}")
        return False


def list_s3_backups(prefix='backups/'):
    """
    S3 버킷의 백업 파일 목록 조회
    
    Args:
        prefix: S3 키 접두사
    
    Returns:
        list: 백업 파일 정보 리스트 [{'Key': str, 'Size': int, 'LastModified': datetime}]
    """
    if not is_s3_configured():
        logger.error("S3가 설정되어 있지 않습니다.")
        return []
    
    try:
        s3_client = get_s3_client()
        bucket = settings.AWS_S3_BACKUP_BUCKET
        
        response = s3_client.list_objects_v2(
            Bucket=bucket,
            Prefix=prefix
        )
        
        if 'Contents' not in response:
            return []
        
        backups = [
            {
                'Key': obj['Key'],
                'Size': obj['Size'],
                'LastModified': obj['LastModified']
            }
            for obj in response['Contents']
        ]
        
        return sorted(backups, key=lambda x: x['LastModified'], reverse=True)
        
    except ClientError as e:
        logger.error(f"S3 목록 조회 실패: {e}")
        return []
    except Exception as e:
        logger.error(f"예기치 않은 오류: {e}")
        return []


def delete_old_s3_backups(days=30, prefix='backups/'):
    """
    오래된 S3 백업 파일 삭제
    
    Args:
        days: 보관 기간 (일)
        prefix: S3 키 접두사
    
    Returns:
        int: 삭제된 파일 수
    """
    if not is_s3_configured():
        logger.error("S3가 설정되어 있지 않습니다.")
        return 0
    
    try:
        s3_client = get_s3_client()
        bucket = settings.AWS_S3_BACKUP_BUCKET
        cutoff_date = datetime.now(datetime.timezone.utc) - timedelta(days=days)
        
        backups = list_s3_backups(prefix)
        deleted_count = 0
        
        for backup in backups:
            if backup['LastModified'] < cutoff_date:
                logger.info(f"오래된 백업 삭제: {backup['Key']}")
                s3_client.delete_object(Bucket=bucket, Key=backup['Key'])
                deleted_count += 1
        
        logger.info(f"총 {deleted_count}개의 오래된 백업 파일을 삭제했습니다.")
        return deleted_count
        
    except ClientError as e:
        logger.error(f"S3 삭제 실패: {e}")
        return 0
    except Exception as e:
        logger.error(f"예기치 않은 오류: {e}")
        return 0


def get_s3_backup_stats():
    """
    S3 백업 통계 조회
    
    Returns:
        dict: {'count': int, 'total_size': int, 'oldest': datetime, 'newest': datetime}
    """
    if not is_s3_configured():
        return {
            'count': 0,
            'total_size': 0,
            'oldest': None,
            'newest': None
        }
    
    backups = list_s3_backups()
    
    if not backups:
        return {
            'count': 0,
            'total_size': 0,
            'oldest': None,
            'newest': None
        }
    
    return {
        'count': len(backups),
        'total_size': sum(b['Size'] for b in backups),
        'oldest': backups[-1]['LastModified'] if backups else None,
        'newest': backups[0]['LastModified'] if backups else None
    }

