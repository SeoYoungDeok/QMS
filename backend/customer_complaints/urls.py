from django.urls import path
from .views import (
    CustomerComplaintListView,
    CustomerComplaintDetailView,
    CustomerComplaintCreateView,
    CustomerComplaintUpdateView,
    CustomerComplaintDeleteView,
    customer_complaint_csv_export
)

app_name = 'customer_complaints'

urlpatterns = [
    path('', CustomerComplaintListView.as_view(), name='list'),
    path('create/', CustomerComplaintCreateView.as_view(), name='create'),
    path('<int:id>/', CustomerComplaintDetailView.as_view(), name='detail'),
    path('<int:id>/update/', CustomerComplaintUpdateView.as_view(), name='update'),
    path('<int:id>/delete/', CustomerComplaintDeleteView.as_view(), name='delete'),
    
    # CSV 다운로드
    path('export/', customer_complaint_csv_export, name='export'),
]

