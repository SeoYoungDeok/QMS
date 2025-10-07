from rest_framework import serializers
from accounts.models import User
from .models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    """일정 시리얼라이저"""
    
    # 읽기 전용 필드들
    schedule_uid = serializers.CharField(read_only=True)
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    importance_display = serializers.CharField(source='get_importance_display', read_only=True)
    is_all_day = serializers.SerializerMethodField()
    
    # 참석자 정보 (읽기용)
    participant_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Schedule
        fields = [
            'id', 'schedule_uid', 'type', 'type_display', 'category', 'category_display',
            'title', 'description', 'importance', 'importance_display',
            'start_date', 'end_date', 'start_time', 'end_time',
            'location', 'participants', 'participant_names',
            'owner', 'owner_name', 'is_all_day',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'schedule_uid', 'owner', 'created_at', 'updated_at']
    
    def get_is_all_day(self, obj):
        """종일 일정 여부 반환"""
        return obj.is_all_day()
    
    def get_participant_names(self, obj):
        """참석자 이름 목록 반환"""
        if not obj.participants:
            return []
        
        try:
            user_ids = obj.participants
            users = User.objects.filter(id__in=user_ids).values('id', 'name')
            return [{'id': user['id'], 'name': user['name']} for user in users]
        except:
            return []
    
    def validate(self, attrs):
        """전체 데이터 검증"""
        # 날짜 범위 검증
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError('종료 날짜는 시작 날짜보다 이전일 수 없습니다.')
        
        # 시간 범위 검증 (같은 날짜인 경우에만)
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        
        if (start_time and end_time and 
            start_date == (end_date or start_date) and 
            end_time <= start_time):
            raise serializers.ValidationError('종료 시간은 시작 시간보다 늦어야 합니다.')
        
        # end_time만 입력된 경우 방지
        if end_time and not start_time:
            raise serializers.ValidationError('종료 시간만 입력할 수 없습니다. 시작 시간을 먼저 입력해주세요.')
        
        return attrs
    
    def validate_category(self, value):
        """카테고리 검증"""
        type_value = self.initial_data.get('type') or (self.instance.type if self.instance else None)
        
        if type_value == 'quality':
            valid_categories = [choice[0] for choice in Schedule.QUALITY_CATEGORIES]
            if value not in valid_categories:
                raise serializers.ValidationError(f'품질 일정의 유효한 카테고리가 아닙니다: {value}')
        elif type_value == 'personal':
            valid_categories = [choice[0] for choice in Schedule.PERSONAL_CATEGORIES]
            if value not in valid_categories:
                raise serializers.ValidationError(f'개인 일정의 유효한 카테고리가 아닙니다: {value}')
        
        return value
    
    def validate_participants(self, value):
        """참석자 검증"""
        if not value:
            return []
        
        if not isinstance(value, list):
            raise serializers.ValidationError('참석자는 배열 형태여야 합니다.')
        
        # 참석자가 실제 존재하는 사용자인지 확인
        if value:
            # 정수가 아닌 값 필터링
            try:
                participant_ids = [int(id) for id in value if str(id).isdigit()]
            except (ValueError, TypeError):
                raise serializers.ValidationError('참석자 ID는 숫자여야 합니다.')
            
            if participant_ids:
                existing_users = list(User.objects.filter(id__in=participant_ids).values_list('id', flat=True))
                invalid_users = set(participant_ids) - set(existing_users)
                if invalid_users:
                    raise serializers.ValidationError(f'존재하지 않는 사용자 ID: {list(invalid_users)}')
            
            return participant_ids
        
        return []


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """일정 생성용 시리얼라이저"""
    
    class Meta:
        model = Schedule
        fields = [
            'type', 'category', 'title', 'description', 'importance',
            'start_date', 'end_date', 'start_time', 'end_time',
            'location', 'participants'
        ]
    
    def validate(self, attrs):
        """ScheduleSerializer의 검증 로직 재사용"""
        serializer = ScheduleSerializer()
        return serializer.validate(attrs)
    
    def validate_category(self, value):
        """ScheduleSerializer의 카테고리 검증 로직 재사용"""
        serializer = ScheduleSerializer()
        serializer.initial_data = self.initial_data
        return serializer.validate_category(value)
    
    def validate_participants(self, value):
        """참석자 검증"""
        if not value:
            return []
        
        if not isinstance(value, list):
            raise serializers.ValidationError('참석자는 배열 형태여야 합니다.')
        
        # 참석자가 실제 존재하는 사용자인지 확인
        if value:
            # 정수가 아닌 값 필터링
            try:
                participant_ids = [int(id) for id in value if str(id).isdigit()]
            except (ValueError, TypeError):
                raise serializers.ValidationError('참석자 ID는 숫자여야 합니다.')
            
            if participant_ids:
                existing_users = list(User.objects.filter(id__in=participant_ids).values_list('id', flat=True))
                invalid_users = set(participant_ids) - set(existing_users)
                if invalid_users:
                    raise serializers.ValidationError(f'존재하지 않는 사용자 ID: {list(invalid_users)}')
            
            return participant_ids
        
        return []


class ScheduleListSerializer(serializers.ModelSerializer):
    """일정 목록용 경량 시리얼라이저"""
    
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    importance_display = serializers.CharField(source='get_importance_display', read_only=True)
    is_all_day = serializers.SerializerMethodField()
    
    class Meta:
        model = Schedule
        fields = [
            'id', 'schedule_uid', 'type', 'type_display', 'category', 'category_display',
            'title', 'importance', 'importance_display',
            'start_date', 'end_date', 'start_time', 'end_time',
            'location', 'owner_name', 'is_all_day'
        ]
    
    def get_is_all_day(self, obj):
        """종일 일정 여부 반환"""
        return obj.is_all_day()
