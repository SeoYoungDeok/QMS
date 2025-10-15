from django.urls import path
from . import views

urlpatterns = [
    # 부적합 CRUD
    path('', views.NonconformanceListView.as_view(), name='nonconformance-list'),
    path('create/', views.NonconformanceCreateView.as_view(), name='nonconformance-create'),
    path('<int:id>/', views.NonconformanceDetailView.as_view(), name='nonconformance-detail'),
    path('<int:id>/update/', views.NonconformanceUpdateView.as_view(), name='nonconformance-update'),
    path('<int:id>/delete/', views.NonconformanceDeleteView.as_view(), name='nonconformance-delete'),
    
    # 코드 테이블 조회
    path('defect-types/', views.defect_types_list, name='defect-types-list'),
    path('defect-causes/', views.defect_causes_list, name='defect-causes-list'),
    path('six-m-categories/', views.six_m_categories, name='six-m-categories'),
    path('six-m-guide/', views.six_m_guide, name='six-m-guide'),
    
    # 코드 테이블 관리 (실무자 이상)
    path('defect-types/create/', views.defect_type_create, name='defect-type-create'),
    path('defect-types/<str:code>/delete/', views.defect_type_delete, name='defect-type-delete'),
    path('defect-types/reorder/', views.reorder_defect_types, name='defect-types-reorder'),
    path('defect-causes/create/', views.defect_cause_create, name='defect-cause-create'),
    path('defect-causes/<str:code>/delete/', views.defect_cause_delete, name='defect-cause-delete'),
    path('defect-causes/reorder/', views.reorder_defect_causes, name='defect-causes-reorder'),
    
    # CSV 다운로드
    path('export/', views.nonconformance_csv_export, name='nonconformance-export'),
    
    # 다음 NCR NO 생성
    path('next-ncr-no/', views.get_next_ncr_no, name='next-ncr-no'),
]
