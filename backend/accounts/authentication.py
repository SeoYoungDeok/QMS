from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed
from .models import User


class CustomJWTAuthentication(JWTAuthentication):
    """
    커스텀 JWT 인증 클래스
    Django의 기본 User 모델 대신 커스텀 User 모델을 사용
    """
    
    def get_user(self, validated_token):
        """
        JWT 토큰에서 사용자 ID를 추출하여 커스텀 User 모델의 사용자를 반환
        """
        try:
            user_id = validated_token['user_id']
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found", code="user_not_found")

        # 활성 사용자인지 확인
        if not user.is_active_user():
            raise AuthenticationFailed("User is not active", code="user_inactive")

        return user
