from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
import re
from .models import User
from audit.models import AuditLog


class UserSignupSerializer(serializers.ModelSerializer):
    """회원가입용 시리얼라이저"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'password', 'password_confirm', 'name', 'department', 'position', 'phone_number']
    
    def validate_username(self, value):
        """아이디 유효성 검사"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("이미 사용 중인 아이디입니다.")
        return value
    
    def validate_password(self, value):
        """비밀번호 정책 검증"""
        # 최소 8자, 숫자/문자/특수문자 포함
        if len(value) < 8:
            raise serializers.ValidationError("비밀번호는 최소 8자 이상이어야 합니다.")
        
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError("비밀번호에 영문자가 포함되어야 합니다.")
        
        if not re.search(r'\d', value):
            raise serializers.ValidationError("비밀번호에 숫자가 포함되어야 합니다.")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("비밀번호에 특수문자가 포함되어야 합니다.")
        
        return value
    
    def validate(self, attrs):
        """비밀번호 확인"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return attrs
    
    def create(self, validated_data):
        """사용자 생성"""
        validated_data.pop('password_confirm')  # 확인용 비밀번호 제거
        password = validated_data.pop('password')
        
        # 기본값 설정 (기획서 기준)
        user = User.objects.create(
            role_level=0,  # 게스트 사용자
            status='locked',  # 계정 잠금 상태
            **validated_data
        )
        user.set_password(password)
        user.save()
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """로그인용 시리얼라이저"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            try:
                user = User.objects.get(username=username)
                
                # 먼저 계정 상태 확인 (비밀번호 확인 전)
                if user.status == 'deleted':
                    raise serializers.ValidationError("삭제된 계정입니다. 관리자에게 문의하세요.")
                elif user.status == 'locked':
                    raise serializers.ValidationError("계정이 잠겨있습니다. 관리자에게 문의하세요.")
                
                # 그 다음 비밀번호 확인
                password_valid = user.check_password(password)
                
                # 비밀번호가 틀린 경우
                if not password_valid:
                    user.increment_failed_attempts()
                    # 실패 횟수 증가 후 계정이 잠겼는지 확인
                    if user.status == 'locked':
                        raise serializers.ValidationError("로그인 실패 횟수가 초과되어 계정이 잠겼습니다. 관리자에게 문의하세요.")
                    raise serializers.ValidationError(f"비밀번호가 올바르지 않습니다. (실패 횟수: {user.failed_attempts}/5)")
                
                # 비밀번호가 맞고 계정이 활성 상태가 아닌 경우
                if user.status != 'active':
                    raise serializers.ValidationError("사용할 수 없는 계정입니다. 관리자에게 문의하세요.")
                
                # 로그인 성공
                user.reset_failed_attempts()
                attrs['user'] = user
                return attrs
                    
            except User.DoesNotExist:
                raise serializers.ValidationError("존재하지 않는 아이디입니다.")
        else:
            raise serializers.ValidationError("아이디와 비밀번호를 입력해주세요.")


class UserDetailSerializer(serializers.ModelSerializer):
    """사용자 상세 정보용 시리얼라이저"""
    role_display = serializers.CharField(source='get_role_display_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'department', 'position', 'phone_number', 
                 'role_level', 'role_display', 'status', 'created_at', 'last_login_at']
        read_only_fields = ['id', 'username', 'created_at', 'last_login_at']


class UserUpdateSerializer(serializers.ModelSerializer):
    """사용자 정보 수정용 시리얼라이저"""
    
    class Meta:
        model = User
        fields = ['department', 'position', 'phone_number', 'role_level', 'status']
    
    def validate_role_level(self, value):
        """권한 레벨 검증"""
        if value not in [0, 1, 2]:
            raise serializers.ValidationError("올바르지 않은 권한 레벨입니다.")
        return value
    
    def validate_status(self, value):
        """계정 상태 검증"""
        if value not in ['active', 'locked', 'deleted']:
            raise serializers.ValidationError("올바르지 않은 계정 상태입니다.")
        return value


class UserListSerializer(serializers.ModelSerializer):
    """사용자 목록용 시리얼라이저"""
    role_display = serializers.CharField(source='get_role_display_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'department', 'position', 'phone_number',
                 'role_level', 'role_display', 'status', 'created_at', 'last_login_at']


class PasswordChangeSerializer(serializers.Serializer):
    """비밀번호 변경용 시리얼라이저"""
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, required=True)
    
    def validate_old_password(self, value):
        """현재 비밀번호 검증"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 일치하지 않습니다.")
        return value
    
    def validate_new_password(self, value):
        """새 비밀번호 정책 검증"""
        # 최소 8자, 숫자/문자/특수문자 포함
        if len(value) < 8:
            raise serializers.ValidationError("비밀번호는 최소 8자 이상이어야 합니다.")
        
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError("비밀번호에 영문자가 포함되어야 합니다.")
        
        if not re.search(r'\d', value):
            raise serializers.ValidationError("비밀번호에 숫자가 포함되어야 합니다.")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("비밀번호에 특수문자가 포함되어야 합니다.")
        
        return value
    
    def validate(self, attrs):
        """새 비밀번호 확인"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "새 비밀번호가 일치하지 않습니다."})
        
        # 현재 비밀번호와 새 비밀번호가 같은지 확인
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({"new_password": "새 비밀번호는 현재 비밀번호와 달라야 합니다."})
        
        return attrs
    
    def save(self):
        """비밀번호 변경"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
