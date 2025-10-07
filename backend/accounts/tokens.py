from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class CustomRefreshToken(RefreshToken):
    """커스텀 User 모델을 위한 JWT 토큰"""
    
    @classmethod
    def for_user(cls, user):
        """
        커스텀 User 모델의 사용자를 위한 토큰 생성
        """
        token = cls()
        token['user_id'] = user.id
        token['username'] = user.username
        token['role_level'] = user.role_level
        return token
