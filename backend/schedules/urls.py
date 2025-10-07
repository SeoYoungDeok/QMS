from django.urls import path
from . import views

urlpatterns = [
    # 일정 CRUD
    path('', views.schedule_create, name='schedule-create'),  # POST
    path('list/', views.ScheduleListView.as_view(), name='schedule-list'),  # GET
    path('<int:id>/', views.ScheduleDetailView.as_view(), name='schedule-detail'),  # GET
    path('<int:id>/update/', views.schedule_update, name='schedule-update'),  # PUT
    path('<int:id>/delete/', views.schedule_delete, name='schedule-delete'),  # DELETE
    
    # 참조 데이터
    path('categories/', views.schedule_categories, name='schedule-categories'),  # GET
    path('users/', views.schedule_users, name='schedule-users'),  # GET
]
