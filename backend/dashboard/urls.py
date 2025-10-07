from django.urls import path
from . import views
from . import chart_views

urlpatterns = [
    # 메인 KPI 데이터
    path('kpis/', views.dashboard_kpis, name='dashboard-kpis'),
    
    # 차트 데이터
    path('charts/defect-rate-trend/', chart_views.defect_rate_trend, name='chart-defect-rate-trend'),
    path('charts/f-cost-trend/', chart_views.f_cost_trend, name='chart-f-cost-trend'),
    path('charts/complaints-trend/', chart_views.complaints_trend, name='chart-complaints-trend'),
    path('charts/defect-type-distribution/', chart_views.defect_type_distribution, name='chart-defect-type-distribution'),
    path('charts/defect-cause-distribution/', chart_views.defect_cause_distribution, name='chart-defect-cause-distribution'),
    
    # 스파크라인 데이터
    path('sparkline/', chart_views.sparkline_data, name='sparkline-data'),
    
    # 일정 데이터
    path('schedules/upcoming/', chart_views.upcoming_schedules, name='upcoming-schedules'),
]

