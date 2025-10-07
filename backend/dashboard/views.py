from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from datetime import datetime, date
from decimal import Decimal

from performance.models import PerformanceRecord
from nonconformance.models import Nonconformance
from customer_complaints.models import CustomerComplaint
from kpi_targets.models import KPITarget
from schedules.models import Schedule
from accounts.authentication import CustomJWTAuthentication


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_kpis(request):
    """대시보드 KPI 통합 API"""
    
    # 파라미터 파싱
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
    except ValueError:
        return Response({'error': '유효하지 않은 연도 또는 월입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not (1 <= month <= 12):
        return Response({'error': '월은 1~12 사이여야 합니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 이전 월 계산
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    
    # 1. 불량율 계산
    monthly_perf = PerformanceRecord.objects.filter(
        date__year=year, date__month=month
    ).aggregate(total_quantity=Sum('quantity'))
    
    monthly_defects = Nonconformance.objects.filter(
        occurrence_date__year=year, occurrence_date__month=month
    ).aggregate(total_defect_qty=Sum('defect_qty'))
    
    prev_monthly_perf = PerformanceRecord.objects.filter(
        date__year=prev_year, date__month=prev_month
    ).aggregate(total_quantity=Sum('quantity'))
    
    prev_monthly_defects = Nonconformance.objects.filter(
        occurrence_date__year=prev_year, occurrence_date__month=prev_month
    ).aggregate(total_defect_qty=Sum('defect_qty'))
    
    ytd_perf = PerformanceRecord.objects.filter(
        date__year=year, date__month__lte=month
    ).aggregate(total_quantity=Sum('quantity'))
    
    ytd_defects = Nonconformance.objects.filter(
        occurrence_date__year=year, occurrence_date__month__lte=month
    ).aggregate(total_defect_qty=Sum('defect_qty'))
    
    current_quantity = monthly_perf['total_quantity'] or 0
    current_defects = monthly_defects['total_defect_qty'] or 0
    current_defect_rate = (current_defects / max(current_quantity, 1)) * 100 if current_quantity > 0 else 0
    
    prev_quantity = prev_monthly_perf['total_quantity'] or 0
    prev_defects = prev_monthly_defects['total_defect_qty'] or 0
    prev_defect_rate = (prev_defects / max(prev_quantity, 1)) * 100 if prev_quantity > 0 else 0
    
    ytd_quantity = ytd_perf['total_quantity'] or 0
    ytd_defects_qty = ytd_defects['total_defect_qty'] or 0
    ytd_defect_rate = (ytd_defects_qty / max(ytd_quantity, 1)) * 100 if ytd_quantity > 0 else 0
    
    defect_rate_target = KPITarget.objects.filter(year=year, kpi_type='defect_rate').first()
    annual_target_defect_rate = float(defect_rate_target.target_value) if defect_rate_target else 0
    
    # 2. F-COST 계산
    monthly_f_cost = Nonconformance.objects.filter(
        occurrence_date__year=year, occurrence_date__month=month
    ).aggregate(total_amount=Sum('total_amount'))
    
    prev_monthly_f_cost = Nonconformance.objects.filter(
        occurrence_date__year=prev_year, occurrence_date__month=prev_month
    ).aggregate(total_amount=Sum('total_amount'))
    
    ytd_f_cost = Nonconformance.objects.filter(
        occurrence_date__year=year, occurrence_date__month__lte=month
    ).aggregate(total_amount=Sum('total_amount'))
    
    current_f_cost = float(monthly_f_cost['total_amount'] or 0)
    prev_f_cost = float(prev_monthly_f_cost['total_amount'] or 0)
    ytd_f_cost_value = float(ytd_f_cost['total_amount'] or 0)
    
    f_cost_target = KPITarget.objects.filter(year=year, kpi_type='f_cost').first()
    annual_target_f_cost = float(f_cost_target.target_value) if f_cost_target else 0
    
    # 3. 고객 불만 건수 계산
    monthly_complaints = CustomerComplaint.objects.filter(
        occurrence_date__year=year, occurrence_date__month=month
    ).count()
    
    prev_monthly_complaints = CustomerComplaint.objects.filter(
        occurrence_date__year=prev_year, occurrence_date__month=prev_month
    ).count()
    
    ytd_complaints = CustomerComplaint.objects.filter(
        occurrence_date__year=year, occurrence_date__month__lte=month
    ).count()
    
    complaints_target = KPITarget.objects.filter(year=year, kpi_type='complaints').first()
    annual_target_complaints = int(complaints_target.target_value) if complaints_target else 0
    
    # 응답 데이터 구성
    response_data = {
        'year': year,
        'month': month,
        'kpis': {
            'defect_rate': {
                'monthly': {
                    'actual_percent': round(current_defect_rate, 2),
                    'prev_percent': round(prev_defect_rate, 2),
                },
                'ytd': {
                    'actual_percent': round(ytd_defect_rate, 2),
                    'annual_target_percent': annual_target_defect_rate,
                }
            },
            'f_cost': {
                'monthly': {
                    'actual': round(current_f_cost, 2),
                    'prev': round(prev_f_cost, 2),
                },
                'ytd': {
                    'actual': round(ytd_f_cost_value, 2),
                    'annual_target': annual_target_f_cost,
                }
            },
            'complaints': {
                'monthly': {
                    'actual': monthly_complaints,
                    'prev': prev_monthly_complaints,
                },
                'ytd': {
                    'actual': ytd_complaints,
                    'annual_target': annual_target_complaints,
                }
            }
        }
    }
    
    return Response(response_data, status=status.HTTP_200_OK)
