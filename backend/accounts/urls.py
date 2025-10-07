from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # 인증 관련 (권한 필요 없음)
    path('signup/', views.signup, name='signup'),
    path('login/', views.login, name='login'),
    path('check-username/', views.check_username, name='check_username'),
    
    # 사용자 관리 (인증 필요)
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('users/<int:pk>/update/', views.UserUpdateView.as_view(), name='user_update'),
    path('users/<int:pk>/delete/', views.UserDeleteView.as_view(), name='user_delete'),
    path('users/<int:pk>/reset-password/', views.reset_password, name='reset_password'),
    path('users/<int:pk>/restore/', views.restore_user, name='restore_user'),
    path('users/create/', views.UserCreateView.as_view(), name='user_create'),
    path('change-password/', views.change_password, name='change_password'),
]
