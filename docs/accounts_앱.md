# accounts 앱

**참고 시점**: 사용자 인증, 권한 관리, 회원가입/로그인 기능을 개발하거나 사용자 관리 페이지를 구현할 때 참고

## 라우트 (URL)
- `/signup/` - 회원가입 (POST)
- `/login/` - 로그인 (POST)
- `/check-username/` - 아이디 중복 체크 (GET)
- `/users/` - 사용자 목록 조회 (GET, 관리자 전용)
- `/users/<int:pk>/` - 사용자 상세 조회 (GET)
- `/users/<int:pk>/update/` - 사용자 정보 수정 (PUT/PATCH, 관리자 전용)
- `/users/<int:pk>/delete/` - 사용자 삭제 (DELETE, 관리자 전용, 논리삭제)
- `/users/<int:pk>/reset-password/` - 비밀번호 초기화 (POST, 관리자 전용)
- `/users/create/` - 사용자 추가 (POST, 관리자 전용)

## 스키마 (모델)
**User 모델**: 사용자 계정 정보 관리
- `username` (CharField, 50자, 고유) - 사용자 아이디
- `password_hash` (CharField, 255자) - 해시된 비밀번호
- `name` (CharField, 50자) - 사용자 이름
- `department` (CharField, 100자) - 부서
- `position` (CharField, 50자) - 직급
- `phone_number` (CharField, 20자) - 핸드폰 번호
- `role_level` (IntegerField) - 권한 레벨 (0:게스트, 1:실무자, 2:관리자)
- `status` (CharField) - 계정 상태 (active, locked, suspended, deleted)
- `failed_attempts` (IntegerField) - 로그인 실패 횟수
- `last_failed_at` (DateTimeField) - 마지막 실패 시각
- `created_at`, `updated_at`, `last_login_at` - 타임스탬프

## 서비스 함수
- `signup()` - 회원가입 처리, 기본 상태는 'locked'으로 설정
- `login()` - 로그인 처리, JWT 토큰 발급, 실패 시 횟수 증가 및 계정 잠금
- `check_username()` - 아이디 중복 확인
- `UserListView` - 사용자 목록 조회 (필터링, 검색, 정렬 지원)
- `UserDetailView` - 사용자 상세 조회 (관리자는 모든 사용자, 일반 사용자는 본인만)
- `UserUpdateView` - 사용자 정보 수정 (관리자 전용)
- `UserCreateView` - 사용자 추가 (관리자 전용)
- `UserDeleteView` - 사용자 논리적 삭제 (관리자 전용, 자기 자신 삭제 불가)
- `reset_password()` - 임시 비밀번호 발급 (관리자 전용)
