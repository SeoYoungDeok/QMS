from django.urls import path
from .views import (
    CustomerComplaintListView,
    CustomerComplaintDetailView,
    CustomerComplaintCreateView,
    CustomerComplaintUpdateView,
    CustomerComplaintDeleteView,
    get_next_ccr_no,
    customer_complaint_csv_export
)

app_name = 'customer_complaints'

urlpatterns = [
    path('', CustomerComplaintListView.as_view(), name='list'),
    path('create/', CustomerComplaintCreateView.as_view(), name='create'),
    path('<int:id>/', CustomerComplaintDetailView.as_view(), name='detail'),
    path('<int:id>/update/', CustomerComplaintUpdateView.as_view(), name='update'),
    path('<int:id>/delete/', CustomerComplaintDeleteView.as_view(), name='delete'),
    
    # 다음 CCR NO 조회
    path('next-ccr-no/', get_next_ccr_no, name='next-ccr-no'),
    
    # CSV 다운로드
    path('export/', customer_complaint_csv_export, name='export'),
]

