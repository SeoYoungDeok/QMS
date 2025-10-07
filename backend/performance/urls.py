from django.urls import path
from . import views

urlpatterns = [
    # 실적 등록
    path('', views.PerformanceCreateView.as_view(), name='performance-create'),
    path('bulk/', views.performance_bulk_create, name='performance-bulk-create'),
    path('bulk-delete/', views.performance_bulk_delete, name='performance-bulk-delete'),
    path('csv-upload/', views.performance_csv_upload, name='performance-csv-upload'),
    
    # 템플릿 다운로드
    path('template/', views.performance_template_download, name='performance-template'),
    
    # CSV 다운로드
    path('export/', views.performance_csv_export, name='performance-export'),
    
    # 실적 조회 및 관리
    path('list/', views.PerformanceListView.as_view(), name='performance-list'),
    path('<int:pk>/', views.PerformanceDetailView.as_view(), name='performance-detail'),
    path('<int:pk>/update/', views.PerformanceUpdateView.as_view(), name='performance-update'),
    path('<int:pk>/delete/', views.PerformanceDeleteView.as_view(), name='performance-delete'),
    
    # 업체명 관리
    path('vendors/', views.VendorListCreateView.as_view(), name='vendor-list-create'),
    path('vendors/<int:pk>/', views.VendorDetailView.as_view(), name='vendor-detail'),
    
    # 생산처 관리
    path('producers/', views.ProducerListCreateView.as_view(), name='producer-list-create'),
    path('producers/<int:pk>/', views.ProducerDetailView.as_view(), name='producer-detail'),
]
