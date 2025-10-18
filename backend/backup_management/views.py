"""
백업 관리 API 뷰
"""
import os
import logging
from pathlib import Path
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, HttpResponse
from django.conf import settings
from .models import BackupRecord
from .serializers import BackupRecordSerializer
from .backup_utils import (
    create_backup, 
    restore_backup, 
    validate_backup_file,
    get_backup_dir
)
from .data_archiver import get_archivable_data_count
from .sync_utils import sync_backup_records, cleanup_orphaned_files, get_backup_stats
from audit.models import AuditLog

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """클라이언트 IP 주소 추출"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def check_practitioner_permission(user):
    """실무자 이상 권한 체크"""
    return hasattr(user, 'role_level') and user.role_level >= 1


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def download_backup(request):
    """
    백업 파일 생성 및 다운로드
    권한: 실무자 이상 (role_level >= 1)
    """
    # 권한 체크
    if not check_practitioner_permission(request.user):
        return Response(
            {'error': '백업 다운로드 권한이 없습니다. 실무자 이상만 가능합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 백업 파일 생성
        backup_path, file_size = create_backup(
            backup_type='manual', 
            created_by=request.user
        )
        
        # 백업 이력 저장
        backup_record = BackupRecord.objects.create(
            file_size=file_size,
            backup_type='manual',
            file_path=backup_path,
            created_by=request.user,
            note='수동 백업'
        )
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='DOWNLOAD_BACKUP',
            target_id=backup_record.id,
            details=f'백업 파일 다운로드: {os.path.basename(backup_path)} ({file_size} bytes)',
            ip_address=get_client_ip(request)
        )
        
        # 파일 다운로드
        response = FileResponse(
            open(backup_path, 'rb'),
            content_type='application/x-sqlite3'
        )
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(backup_path)}"'
        response['Content-Length'] = file_size
        
        logger.info(f"백업 파일 다운로드 완료: {backup_path} (사용자: {request.user.username})")
        
        return response
    
    except Exception as e:
        logger.error(f"백업 다운로드 실패: {str(e)}")
        return Response(
            {'error': f'백업 다운로드 실패: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_backup_file(request, backup_id):
    """
    기존 백업 파일 다운로드
    권한: 실무자 이상 (role_level >= 1)
    """
    # 권한 체크
    if not check_practitioner_permission(request.user):
        return Response(
            {'error': '백업 다운로드 권한이 없습니다. 실무자 이상만 가능합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 백업 레코드 조회
        backup_record = BackupRecord.objects.get(id=backup_id)
        
        # 파일 경로
        file_path = Path(backup_record.file_path)
        
        # 파일 존재 확인
        if not file_path.exists():
            return Response(
                {'error': '백업 파일을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='DOWNLOAD_BACKUP',
            target_id=backup_record.id,
            details=f'백업 파일 다운로드: {file_path.name} ({backup_record.file_size} bytes)',
            ip_address=get_client_ip(request)
        )
        
        # 파일 다운로드
        response = FileResponse(
            open(file_path, 'rb'),
            content_type='application/x-sqlite3'
        )
        response['Content-Disposition'] = f'attachment; filename="{file_path.name}"'
        response['Content-Length'] = backup_record.file_size
        
        logger.info(f"기존 백업 파일 다운로드: {file_path.name} (사용자: {request.user.username})")
        
        return response
    
    except BackupRecord.DoesNotExist:
        return Response(
            {'error': '백업 레코드를 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"백업 파일 다운로드 실패: {str(e)}")
        return Response(
            {'error': f'백업 파일 다운로드 실패: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_backup(request):
    """
    백업 파일 업로드 및 복원
    권한: 실무자 이상 (role_level >= 1)
    
    ⚠️ 경고: 이 작업은 현재 데이터베이스를 완전히 대체합니다!
    """
    # 권한 체크
    if not check_practitioner_permission(request.user):
        return Response(
            {'error': '백업 복원 권한이 없습니다. 실무자 이상만 가능합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # 파일 업로드 확인
    if 'file' not in request.FILES:
        return Response(
            {'error': '업로드할 파일이 없습니다.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    uploaded_file = request.FILES['file']
    
    try:
        # 임시 파일 저장
        backup_dir = get_backup_dir()
        temp_path = Path(backup_dir) / f"temp_upload_{uploaded_file.name}"
        
        with open(temp_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        # 파일 유효성 검증
        is_valid, error_message = validate_backup_file(temp_path)
        if not is_valid:
            temp_path.unlink()  # 임시 파일 삭제
            return Response(
                {'error': error_message},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 파일 크기 기록 (복원 전에)
        file_size = temp_path.stat().st_size
        
        # 백업 이력 저장 (복원 전에 - 복원 후에는 DB가 교체되므로)
        # 먼저 백업 레코드 생성
        backup_record = BackupRecord.objects.create(
            file_size=file_size,
            backup_type='manual',
            file_path=str(temp_path),
            created_by=request.user,
            note='수동 복원'
        )
        
        # 감사 로그 기록 (복원 전에)
        AuditLog.log_action(
            user=request.user,
            action='UPLOAD_BACKUP',
            target_id=backup_record.id,
            details=f'백업 파일 업로드 및 복원: {uploaded_file.name} ({file_size} bytes)',
            ip_address=get_client_ip(request)
        )
        
        # 백업 복원 (DB 파일 교체)
        restore_backup(temp_path)
        
        logger.info(f"백업 파일 복원 완료: {temp_path} (사용자: {request.user.username})")
        
        return Response({
            'message': '백업 복원이 완료되었습니다.',
            'file_name': uploaded_file.name,
            'file_size': file_size
        })
    
    except Exception as e:
        logger.error(f"백업 복원 실패: {str(e)}")
        
        # 임시 파일 정리
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except:
                pass
        
        return Response(
            {'error': f'백업 복원 실패: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class BackupHistoryListView(generics.ListAPIView):
    """
    백업 이력 조회 API
    권한: 실무자 이상 (role_level >= 1)
    """
    serializer_class = BackupRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # 권한 체크
        if not check_practitioner_permission(self.request.user):
            return BackupRecord.objects.none()
        
        return BackupRecord.objects.all().order_by('-backup_date')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def archivable_data_stats(request):
    """
    삭제 가능한 오래된 데이터 통계 조회
    권한: 실무자 이상 (role_level >= 1)
    """
    # 권한 체크
    if not check_practitioner_permission(request.user):
        return Response(
            {'error': '권한이 없습니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        stats = get_archivable_data_count()
        return Response(stats)
    except Exception as e:
        logger.error(f"통계 조회 실패: {str(e)}")
        return Response(
            {'error': f'통계 조회 실패: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_backup(request, backup_id):
    """
    백업 파일 삭제
    권한: 실무자 이상 (role_level >= 1)
    """
    # 권한 체크
    if not check_practitioner_permission(request.user):
        return Response(
            {'error': '백업 삭제 권한이 없습니다. 실무자 이상만 가능합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 백업 레코드 조회
        backup_record = BackupRecord.objects.get(id=backup_id)
        
        # 파일 경로
        file_path = Path(backup_record.file_path)
        
        # 파일 삭제
        if file_path.exists():
            file_path.unlink()
            logger.info(f"백업 파일 삭제: {file_path} (사용자: {request.user.username})")
        
        # 레코드 삭제
        backup_record.delete()
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='DELETE_BACKUP',
            target_id=backup_id,
            details=f'백업 파일 삭제: {os.path.basename(backup_record.file_path)}',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': '백업 파일이 삭제되었습니다.',
            'backup_id': backup_id
        })
    
    except BackupRecord.DoesNotExist:
        return Response(
            {'error': '백업 파일을 찾을 수 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"백업 삭제 실패: {str(e)}")
        return Response(
            {'error': f'백업 삭제 실패: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_backups(request):
    """
    백업 파일과 DB 레코드 수동 동기화
    권한: 실무자 이상 (role_level >= 1)
    """
    # 권한 체크
    if not check_practitioner_permission(request.user):
        return Response(
            {'error': '백업 동기화 권한이 없습니다. 실무자 이상만 가능합니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        logger.info(f"백업 동기화 시작 (사용자: {request.user.username})")
        
        # 동기화 실행
        stats = sync_backup_records()
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='SYNC_BACKUP',
            details=f'백업 파일 동기화 - 삭제된 레코드: {stats["orphaned_records_deleted"]}, 등록된 파일: {stats["orphaned_files_registered"]}',
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': '백업 동기화가 완료되었습니다.',
            'stats': stats
        })
    
    except Exception as e:
        logger.error(f"백업 동기화 실패: {str(e)}")
        return Response(
            {'error': f'백업 동기화 실패: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def backup_stats(request):
    """
    백업 통계 조회
    권한: 실무자 이상 (role_level >= 1)
    """
    # 권한 체크
    if not check_practitioner_permission(request.user):
        return Response(
            {'error': '권한이 없습니다.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        stats = get_backup_stats()
        return Response(stats)
    
    except Exception as e:
        logger.error(f"백업 통계 조회 실패: {str(e)}")
        return Response(
            {'error': f'백업 통계 조회 실패: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
