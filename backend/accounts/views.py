from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import User
from .tokens import CustomRefreshToken
from .serializers import (
    UserSignupSerializer, 
    UserLoginSerializer, 
    UserDetailSerializer,
    UserUpdateSerializer,
    UserListSerializer,
    PasswordChangeSerializer
)
from audit.models import AuditLog


def get_client_ip(request):
    """클라이언트 IP 주소 가져오기"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def signup(request):
    """회원가입 API"""
    serializer = UserSignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=None,  # 회원가입은 시스템에서 처리
            action='SIGNUP',
            target_id=user.id,
            details=f"새 사용자 가입: {user.username} ({user.name})",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': '회원가입이 완료되었습니다.',
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_username(request):
    """아이디 중복 체크 API"""
    username = request.GET.get('username')
    
    if not username:
        return Response({
            'error': '아이디를 입력해주세요.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    available = not User.objects.filter(username=username).exists()
    
    return Response({
        'available': available
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """로그인 API"""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # JWT 토큰 생성
        refresh = CustomRefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=user,
            action='LOGIN_SUCCESS',
            target_id=user.id,
            details=f"로그인 성공: {user.username}",
            ip_address=get_client_ip(request)
        )
        
        # 사용자 정보 반환
        user_data = UserDetailSerializer(user).data
        
        return Response({
            'message': '로그인 성공',
            'token': str(access_token),
            'refresh': str(refresh),
            'user': user_data
        }, status=status.HTTP_200_OK)
    
    else:
        # 로그인 실패 시 감사 로그 기록
        username = request.data.get('username', '')
        try:
            user = User.objects.get(username=username)
            AuditLog.log_action(
                user=user,
                action='LOGIN_FAILED',
                target_id=user.id,
                details=f"로그인 실패: {username} - {serializer.errors}",
                ip_address=get_client_ip(request)
            )
        except User.DoesNotExist:
            AuditLog.log_action(
                user=None,
                action='LOGIN_FAILED',
                target_id=None,
                details=f"로그인 실패: 존재하지 않는 사용자 {username}",
                ip_address=get_client_ip(request)
            )
        
        # serializer의 에러 메시지 전달
        error_message = '아이디 또는 비밀번호가 올바르지 않습니다.'
        if serializer.errors:
            # non_field_errors에서 첫 번째 에러 메시지 가져오기
            if 'non_field_errors' in serializer.errors:
                error_message = serializer.errors['non_field_errors'][0]
            else:
                # 다른 필드의 첫 번째 에러 메시지 가져오기
                for field_errors in serializer.errors.values():
                    if field_errors:
                        error_message = field_errors[0]
                        break
        
        return Response({
            'error': error_message
        }, status=status.HTTP_401_UNAUTHORIZED)


class UserListView(generics.ListAPIView):
    """사용자 목록 조회 API (관리자 전용)"""
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'position', 'role_level', 'status']
    search_fields = ['username', 'name', 'department', 'position']
    ordering_fields = ['created_at', 'last_login_at', 'username']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """관리자만 접근 가능"""
        # JWT 토큰에서 사용자 정보 확인
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            try:
                user = User.objects.get(id=self.request.user.id)
                if user.role_level < 2:
                    return User.objects.none()
            except User.DoesNotExist:
                return User.objects.none()
        else:
            return User.objects.none()
        return super().get_queryset()


class UserDetailView(generics.RetrieveAPIView):
    """사용자 상세 조회 API"""
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """관리자는 모든 사용자, 일반 사용자는 본인만"""
        user_id = self.kwargs['pk']
        
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            try:
                current_user = User.objects.get(id=self.request.user.id)
                if current_user.role_level >= 2:
                    # 관리자는 모든 사용자 조회 가능
                    return User.objects.get(pk=user_id)
                else:
                    # 일반 사용자는 본인만 조회 가능
                    if current_user.id == int(user_id):
                        return current_user
                    else:
                        raise permissions.PermissionDenied("권한이 없습니다.")
            except User.DoesNotExist:
                raise permissions.PermissionDenied("권한이 없습니다.")
        else:
            raise permissions.PermissionDenied("권한이 없습니다.")


class UserUpdateView(generics.UpdateAPIView):
    """사용자 정보 수정 API (관리자 전용)"""
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """관리자만 접근 가능"""
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            try:
                user = User.objects.get(id=self.request.user.id)
                if user.role_level < 2:
                    return User.objects.none()
            except User.DoesNotExist:
                return User.objects.none()
        else:
            return User.objects.none()
        return super().get_queryset()
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_data = {
            'department': instance.department,
            'position': instance.position,
            'phone_number': instance.phone_number,
            'role_level': instance.role_level,
            'status': instance.status
        }
        
        response = super().update(request, *args, **kwargs)
        
        if response.status_code == 200:
            # 감사 로그 기록
            AuditLog.log_action(
                user=request.user,
                action='UPDATE_USER',
                target_id=instance.id,
                details=f"사용자 정보 수정: {instance.username} - 변경 전: {old_data}, 변경 후: {request.data}",
                ip_address=get_client_ip(request)
            )
        
        return response


class UserCreateView(generics.CreateAPIView):
    """사용자 추가 API (관리자 전용)"""
    queryset = User.objects.all()
    serializer_class = UserSignupSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """관리자만 접근 가능"""
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            try:
                user = User.objects.get(id=self.request.user.id)
                if user.role_level < 2:
                    return User.objects.none()
            except User.DoesNotExist:
                return User.objects.none()
        else:
            return User.objects.none()
        return super().get_queryset()
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == 201:
            user_id = response.data['user_id']
            user = User.objects.get(id=user_id)
            
            # 감사 로그 기록
            AuditLog.log_action(
                user=request.user,
                action='CREATE_USER',
                target_id=user.id,
                details=f"사용자 추가: {user.username} ({user.name}) - 부서: {user.department}, 직급: {user.position}",
                ip_address=get_client_ip(request)
            )
        
        return response


class UserDeleteView(generics.DestroyAPIView):
    """사용자 삭제 API (관리자 전용) - 논리적 삭제"""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """관리자만 접근 가능"""
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            try:
                user = User.objects.get(id=self.request.user.id)
                if user.role_level < 2:
                    return User.objects.none()
            except User.DoesNotExist:
                return User.objects.none()
        else:
            return User.objects.none()
        return super().get_queryset()
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 자기 자신은 삭제할 수 없음
        if hasattr(request, 'user') and hasattr(request.user, 'id'):
            current_user = User.objects.get(id=request.user.id)
            if current_user.id == instance.id:
                return Response({
                    'error': '자기 자신은 삭제할 수 없습니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 논리적 삭제 - 상태를 'deleted'로 변경
        instance.status = 'deleted'
        instance.save()
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=current_user,
            action='DELETE_USER',
            target_id=instance.id,
            details=f"사용자 삭제: {instance.username} ({instance.name})",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': '사용자가 삭제되었습니다.'
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reset_password(request, pk):
    """비밀번호 초기화 API (관리자 전용)"""
    # 관리자 권한 확인
    if hasattr(request, 'user') and hasattr(request.user, 'id'):
        try:
            current_user = User.objects.get(id=request.user.id)
            if current_user.role_level < 2:
                return Response({
                    'error': '권한이 없습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({
                'error': '권한이 없습니다.'
            }, status=status.HTTP_403_FORBIDDEN)
    else:
        return Response({
            'error': '권한이 없습니다.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(pk=pk)
        
        # 임시 비밀번호 생성
        import random
        import string
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits + "!@#$%", k=12))
        
        user.set_password(temp_password)
        user.failed_attempts = 0  # 실패 횟수 초기화
        user.save()
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='RESET_PASSWORD',
            target_id=user.id,
            details=f"비밀번호 초기화: {user.username}",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': '임시 비밀번호가 발급되었습니다.',
            'temporary_password': temp_password
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': '사용자를 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def restore_user(request, pk):
    """사용자 복구 API (관리자 전용) - 삭제된 사용자를 활성화"""
    # 관리자 권한 확인
    if hasattr(request, 'user') and hasattr(request.user, 'id'):
        try:
            current_user = User.objects.get(id=request.user.id)
            if current_user.role_level < 2:
                return Response({
                    'error': '권한이 없습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({
                'error': '권한이 없습니다.'
            }, status=status.HTTP_403_FORBIDDEN)
    else:
        return Response({
            'error': '권한이 없습니다.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(pk=pk)
        
        # 삭제된 상태인지 확인
        if user.status != 'deleted':
            return Response({
                'error': '삭제된 사용자만 복구할 수 있습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 상태를 locked로 변경 (관리자가 활성화 여부를 결정)
        user.status = 'locked'
        user.failed_attempts = 0  # 실패 횟수 초기화
        user.save()
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='RESTORE_USER',
            target_id=user.id,
            details=f"사용자 복구: {user.username} ({user.name})",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': '사용자가 복구되었습니다. (상태: 잠금)',
            'user_id': user.id
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': '사용자를 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """비밀번호 변경 API (자기 자신만 가능)"""
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        serializer.save()
        
        # 감사 로그 기록
        AuditLog.log_action(
            user=request.user,
            action='CHANGE_PASSWORD',
            target_id=request.user.id,
            details=f"비밀번호 변경: {request.user.username}",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': '비밀번호가 성공적으로 변경되었습니다.'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)