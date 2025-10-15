from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from datetime import datetime, date, timedelta

from performance.models import PerformanceRecord
from nonconformance.models import Nonconformance
from customer_complaints.models import CustomerComplaint
from kpi_targets.models import KPITarget
from schedules.models import Schedule


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def defect_rate_trend(request):
    """월별 불량율 추이 차트 데이터 (최근 12개월 + 연도별 전체 데이터)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
    except ValueError:
        return Response({'error': '유효하지 않은 연도 또는 월입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 표시할 연도들 수집
    years_in_range = set()
    for i in range(11, -1, -1):
        target_month = month - i
        target_year = year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        years_in_range.add(target_year)
    
    # 각 연도의 1월부터 12월까지 데이터 수집
    all_year_data = {}
    for y in years_in_range:
        all_year_data[y] = []
        for m in range(1, 13):
            perf = PerformanceRecord.objects.filter(
                date__year=y, date__month=m
            ).aggregate(total_quantity=Sum('quantity'))
            
            defects = Nonconformance.objects.filter(
                occurrence_date__year=y, occurrence_date__month=m
            ).aggregate(total_defect_qty=Sum('defect_qty'))
            
            quantity = perf['total_quantity'] or 0
            defect_qty = defects['total_defect_qty'] or 0
            defect_rate = (defect_qty / max(quantity, 1)) * 100 if quantity > 0 else 0
            
            all_year_data[y].append({
                'month': m,
                'actual': round(defect_rate, 2),
            })
    
    # 최근 12개월 데이터 구성
    trend_data = []
    for i in range(11, -1, -1):
        target_month = month - i
        target_year = year
        
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        while target_month > 12:
            target_month -= 12
            target_year += 1
        
        # 해당 월의 데이터
        month_data = all_year_data[target_year][target_month - 1]
        
        # 목표값 조회
        target = KPITarget.objects.filter(year=target_year, kpi_type='defect_rate').first()
        target_value = float(target.target_value) if target else None
        
        # 해당 연도 1월부터 해당 월까지의 데이터
        ytd_data = all_year_data[target_year][:target_month]
        
        trend_data.append({
            'year': target_year,
            'month': target_month,
            'label': f'{target_year}-{target_month:02d}',
            'actual': month_data['actual'],
            'target': target_value,
            'ytd_data': ytd_data,  # 1월부터 해당 월까지의 전체 데이터
        })
    
    return Response({'data': trend_data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def defect_type_distribution(request):
    """불량 유형별 분포 (도넛 차트)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
        metric = request.GET.get('metric', 'count')
    except ValueError:
        return Response({'error': '유효하지 않은 파라미터입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if metric not in ['count', 'amount']:
        return Response({'error': 'metric은 count 또는 amount여야 합니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 불량 유형별 집계
    if metric == 'count':
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year, occurrence_date__month=month
        ).values('defect_type_code__code', 'defect_type_code__name').annotate(
            value=Count('id')
        ).order_by('-value')
    else:  # amount
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year, occurrence_date__month=month
        ).values('defect_type_code__code', 'defect_type_code__name').annotate(
            value=Sum('total_amount')
        ).order_by('-value')
    
    # 데이터 포맷팅
    result = []
    for item in distribution:
        result.append({
            'code': item['defect_type_code__code'],
            'name': item['defect_type_code__name'],
            'value': float(item['value']) if metric == 'amount' else item['value'],
        })
    
    return Response({'year': year, 'month': month, 'metric': metric, 'data': result}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def defect_cause_distribution(request):
    """발생 원인별 분포 (6M 도넛 차트)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
        metric = request.GET.get('metric', 'count')
    except ValueError:
        return Response({'error': '유효하지 않은 파라미터입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if metric not in ['count', 'amount']:
        return Response({'error': 'metric은 count 또는 amount여야 합니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 6M 분류별 집계
    if metric == 'count':
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year, occurrence_date__month=month
        ).values('cause_code__category').annotate(value=Count('id')).order_by('-value')
    else:  # amount
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year, occurrence_date__month=month
        ).values('cause_code__category').annotate(value=Sum('total_amount')).order_by('-value')
    
    # 데이터 포맷팅
    result = []
    for item in distribution:
        result.append({
            'category': item['cause_code__category'],
            'value': float(item['value']) if metric == 'amount' else item['value'],
        })
    
    return Response({'year': year, 'month': month, 'metric': metric, 'data': result}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sparkline_data(request):
    """미니 스파크라인 데이터 (최근 12개월)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
        kpi_type = request.GET.get('kpi_type', 'defect_rate')
    except ValueError:
        return Response({'error': '유효하지 않은 파라미터입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if kpi_type not in ['defect_rate', 'f_cost', 'complaints']:
        return Response(
            {'error': 'kpi_type은 defect_rate, f_cost, complaints 중 하나여야 합니다.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    sparkline = []
    
    for i in range(11, -1, -1):
        target_month = month - i
        target_year = year
        
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        while target_month > 12:
            target_month -= 12
            target_year += 1
        
        if kpi_type == 'defect_rate':
            perf = PerformanceRecord.objects.filter(
                date__year=target_year, date__month=target_month
            ).aggregate(total_quantity=Sum('quantity'))
            
            defects = Nonconformance.objects.filter(
                occurrence_date__year=target_year, occurrence_date__month=target_month
            ).aggregate(total_defect_qty=Sum('defect_qty'))
            
            quantity = perf['total_quantity'] or 0
            defect_qty = defects['total_defect_qty'] or 0
            value = (defect_qty / max(quantity, 1)) * 100 if quantity > 0 else 0
            
        elif kpi_type == 'f_cost':
            f_cost = Nonconformance.objects.filter(
                occurrence_date__year=target_year, occurrence_date__month=target_month
            ).aggregate(total_amount=Sum('total_amount'))
            value = float(f_cost['total_amount'] or 0)
            
        else:  # complaints
            value = CustomerComplaint.objects.filter(
                occurrence_date__year=target_year, occurrence_date__month=target_month
            ).count()
        
        sparkline.append({
            'month': f'{target_year}-{target_month:02d}',
            'value': round(value, 2) if isinstance(value, float) else value,
        })
    
    return Response({'kpi_type': kpi_type, 'data': sparkline}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def f_cost_trend(request):
    """월별 F-COST 추이 차트 데이터 (최근 12개월 + 연도별 전체 데이터)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
    except ValueError:
        return Response({'error': '유효하지 않은 연도 또는 월입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 표시할 연도들 수집
    years_in_range = set()
    for i in range(11, -1, -1):
        target_month = month - i
        target_year = year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        years_in_range.add(target_year)
    
    # 각 연도의 1월부터 12월까지 데이터 수집
    all_year_data = {}
    for y in years_in_range:
        all_year_data[y] = []
        for m in range(1, 13):
            f_cost = Nonconformance.objects.filter(
                occurrence_date__year=y, occurrence_date__month=m
            ).aggregate(total_amount=Sum('total_amount'))
            
            actual_amount = float(f_cost['total_amount'] or 0)
            
            all_year_data[y].append({
                'month': m,
                'actual': round(actual_amount, 2),
            })
    
    # 최근 12개월 데이터 구성
    trend_data = []
    for i in range(11, -1, -1):
        target_month = month - i
        target_year = year
        
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        while target_month > 12:
            target_month -= 12
            target_year += 1
        
        # 해당 월의 데이터
        month_data = all_year_data[target_year][target_month - 1]
        
        # 목표값 조회
        target = KPITarget.objects.filter(year=target_year, kpi_type='f_cost').first()
        target_value = float(target.target_value) if target else None
        
        # 해당 연도 1월부터 해당 월까지의 데이터
        ytd_data = all_year_data[target_year][:target_month]
        
        trend_data.append({
            'year': target_year,
            'month': target_month,
            'label': f'{target_year}-{target_month:02d}',
            'actual': month_data['actual'],
            'target': target_value,
            'ytd_data': ytd_data,
        })
    
    return Response({'data': trend_data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaints_trend(request):
    """월별 고객 불만 건수 추이 차트 데이터 (최근 12개월 + 연도별 전체 데이터)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
    except ValueError:
        return Response({'error': '유효하지 않은 연도 또는 월입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 표시할 연도들 수집
    years_in_range = set()
    for i in range(11, -1, -1):
        target_month = month - i
        target_year = year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        years_in_range.add(target_year)
    
    # 각 연도의 1월부터 12월까지 데이터 수집
    all_year_data = {}
    for y in years_in_range:
        all_year_data[y] = []
        for m in range(1, 13):
            count = CustomerComplaint.objects.filter(
                occurrence_date__year=y, occurrence_date__month=m
            ).count()
            
            all_year_data[y].append({
                'month': m,
                'actual': count,
            })
    
    # 최근 12개월 데이터 구성
    trend_data = []
    for i in range(11, -1, -1):
        target_month = month - i
        target_year = year
        
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        while target_month > 12:
            target_month -= 12
            target_year += 1
        
        # 해당 월의 데이터
        month_data = all_year_data[target_year][target_month - 1]
        
        # 목표값 조회
        target = KPITarget.objects.filter(year=target_year, kpi_type='complaints').first()
        target_value = float(target.target_value) if target else None
        
        # 해당 연도 1월부터 해당 월까지의 데이터
        ytd_data = all_year_data[target_year][:target_month]
        
        trend_data.append({
            'year': target_year,
            'month': target_month,
            'label': f'{target_year}-{target_month:02d}',
            'actual': month_data['actual'],
            'target': target_value,
            'ytd_data': ytd_data,
        })
    
    return Response({'data': trend_data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def upcoming_schedules(request):
    """향후 14일 품질 일정 조회"""
    
    today = date.today()
    end_date = today + timedelta(days=14)
    
    schedules = Schedule.objects.filter(
        start_date__gte=today,
        start_date__lte=end_date,
        type='quality'
    ).select_related('owner').order_by('start_date', 'start_time')
    
    result = []
    for schedule in schedules:
        result.append({
            'id': schedule.id,
            'schedule_uid': schedule.schedule_uid,
            'title': schedule.title,
            'schedule_date': schedule.start_date.isoformat(),
            'start_time': schedule.start_time.strftime('%H:%M') if schedule.start_time else None,
            'end_time': schedule.end_time.strftime('%H:%M') if schedule.end_time else None,
            'importance': schedule.importance,
            'importance_display': schedule.get_importance_display(),
            'location': schedule.location,
            'description': schedule.description,
        })
    
    return Response({'count': len(result), 'schedules': result}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def defect_type_ytd_distribution(request):
    """불량 유형별 연간 누적 분포 (1월부터 선택된 월까지)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
        metric = request.GET.get('metric', 'count')
    except ValueError:
        return Response({'error': '유효하지 않은 파라미터입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if metric not in ['count', 'amount']:
        return Response({'error': 'metric은 count 또는 amount여야 합니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 1월부터 선택된 월까지의 불량 유형별 집계
    if metric == 'count':
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year, 
            occurrence_date__month__lte=month
        ).values('defect_type_code__code', 'defect_type_code__name').annotate(
            value=Count('id')
        ).order_by('-value')
    else:  # amount
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year,
            occurrence_date__month__lte=month
        ).values('defect_type_code__code', 'defect_type_code__name').annotate(
            value=Sum('total_amount')
        ).order_by('-value')
    
    # 데이터 포맷팅
    result = []
    for item in distribution:
        result.append({
            'code': item['defect_type_code__code'],
            'name': item['defect_type_code__name'],
            'value': float(item['value']) if metric == 'amount' else item['value'],
        })
    
    return Response({'year': year, 'month': month, 'metric': metric, 'data': result}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def defect_cause_ytd_distribution(request):
    """발생 원인별 연간 누적 분포 (1월부터 선택된 월까지, 6M)"""
    
    try:
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
        metric = request.GET.get('metric', 'count')
    except ValueError:
        return Response({'error': '유효하지 않은 파라미터입니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if metric not in ['count', 'amount']:
        return Response({'error': 'metric은 count 또는 amount여야 합니다.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # 1월부터 선택된 월까지의 6M 분류별 집계
    if metric == 'count':
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year,
            occurrence_date__month__lte=month
        ).values('cause_code__category').annotate(value=Count('id')).order_by('-value')
    else:  # amount
        distribution = Nonconformance.objects.filter(
            occurrence_date__year=year,
            occurrence_date__month__lte=month
        ).values('cause_code__category').annotate(value=Sum('total_amount')).order_by('-value')
    
    # 데이터 포맷팅
    result = []
    for item in distribution:
        result.append({
            'category': item['cause_code__category'],
            'value': float(item['value']) if metric == 'amount' else item['value'],
        })
    
    return Response({'year': year, 'month': month, 'metric': metric, 'data': result}, status=status.HTTP_200_OK)
