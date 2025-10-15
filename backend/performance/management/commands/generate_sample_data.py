"""
샘플 데이터 생성 명령어
2024년 6월 ~ 2025년 10월 15일까지의 실적, 부적합, 고객 불만 데이터 생성
"""
from django.core.management.base import BaseCommand
from datetime import datetime, timedelta
from decimal import Decimal
import random

from accounts.models import User
from performance.models import PerformanceRecord, Vendor, Producer
from nonconformance.models import Nonconformance, DefectType, DefectCause
from customer_complaints.models import CustomerComplaint


class Command(BaseCommand):
    help = '샘플 데이터 생성 (2024년 6월 ~ 2025년 10월 15일)'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("샘플 데이터 생성 시작")
        self.stdout.write("=" * 60)
        
        # 날짜 범위 설정
        start_date = datetime(2024, 6, 1).date()
        end_date = datetime(2025, 10, 15).date()
        
        self.stdout.write(f"\n기간: {start_date} ~ {end_date}")
        self.stdout.write(f"총 {(end_date - start_date).days + 1}일")
        
        # 기본 데이터 생성
        user = self.create_base_data()
        
        # 샘플 데이터 생성
        perf_count = self.generate_performance_records(user, start_date, end_date)
        nc_count = self.generate_nonconformance_records(user, start_date, end_date)
        ccr_count = self.generate_customer_complaints(user, start_date, end_date)
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("샘플 데이터 생성 완료!"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"실적 데이터: {perf_count}건")
        self.stdout.write(f"부적합 데이터: {nc_count}건")
        self.stdout.write(f"고객 불만 데이터: {ccr_count}건")
        self.stdout.write(f"총 {perf_count + nc_count + ccr_count}건")
        self.stdout.write("=" * 60)

    def create_base_data(self):
        """기본 마스터 데이터 생성"""
        self.stdout.write("기본 마스터 데이터 생성 중...")
        
        # 사용자 생성 (없으면)
        try:
            user = User.objects.get(username='admin')
            self.stdout.write("[OK] 기존 사용자 사용: admin")
        except User.DoesNotExist:
            user = User.objects.create(
                username='admin',
                name='관리자',
                department='품질관리팀',
                position='팀장',
                phone_number='010-0000-0000',
                role_level=2,  # 관리자
                status='active',
            )
            user.set_password('admin1234')
            user.save()
            self.stdout.write("[OK] 사용자 생성: admin")
        
        # 업체명 데이터
        vendor_names = [
            '삼성전자', 'LG전자', '현대자동차', 'SK하이닉스', '포스코',
            '한화', 'GS칼텍스', '롯데케미칼', '효성', '두산중공업',
            'CJ제일제당', '아모레퍼시픽', 'LG화학', '한국타이어', '넥센',
        ]
        
        for vendor_name in vendor_names:
            Vendor.objects.get_or_create(
                name=vendor_name,
                defaults={'created_by': user}
            )
        self.stdout.write(f"[OK] 업체명 {len(vendor_names)}개 생성")
        
        # 생산처 데이터
        producer_names = [
            '본사 1공장', '본사 2공장', '천안공장', '평택공장', '울산공장',
            '창원공장', '구미공장', '광주공장', '아산공장', '포항공장',
        ]
        
        for producer_name in producer_names:
            Producer.objects.get_or_create(
                name=producer_name,
                defaults={'created_by': user}
            )
        self.stdout.write(f"[OK] 생산처 {len(producer_names)}개 생성")
        
        # 불량 유형 데이터
        defect_types = [
            ('D001', '치수불량'),
            ('D002', '외관불량'),
            ('D003', '기능불량'),
            ('D004', '포장불량'),
            ('D005', '수량오류'),
            ('D006', '납기지연'),
            ('D007', '서류오류'),
            ('D008', '기타'),
        ]
        
        for code, name in defect_types:
            DefectType.objects.get_or_create(
                code=code,
                defaults={'name': name}
            )
        self.stdout.write(f"[OK] 불량 유형 {len(defect_types)}개 생성")
        
        # 발생 원인 데이터 (6M)
        defect_causes = [
            ('C001', 'Material', '불량 원재료'),
            ('C002', 'Material', '재료 사양 미달'),
            ('C003', 'Machine', '설비 고장'),
            ('C004', 'Machine', '금형/치구 불량'),
            ('C005', 'Machine', '설비 노후화'),
            ('C006', 'Man', '작업자 실수'),
            ('C007', 'Man', '숙련도 부족'),
            ('C008', 'Man', '표준 미준수'),
            ('C009', 'Method', '작업방법 부적절'),
            ('C010', 'Method', '공정관리 미흡'),
            ('C011', 'Measurement', '측정기 오류'),
            ('C012', 'Measurement', '측정방법 부적절'),
            ('C013', 'Environment', '작업환경 불량'),
            ('C014', 'Environment', '온습도 관리 미흡'),
            ('C015', 'Other', '기타'),
        ]
        
        for code, category, name in defect_causes:
            DefectCause.objects.get_or_create(
                code=code,
                defaults={'category': category, 'name': name}
            )
        self.stdout.write(f"[OK] 발생 원인 {len(defect_causes)}개 생성")
        
        return user

    def generate_performance_records(self, user, start_date, end_date):
        """실적 데이터 생성"""
        self.stdout.write("\n실적 데이터 생성 중...")
        
        vendors = list(Vendor.objects.all())
        producers = list(Producer.objects.all())
        
        product_names = [
            'A100 부품', 'B200 모듈', 'C300 어셈블리', 'D400 패널',
            'E500 커넥터', 'F600 케이블', 'G700 하우징', 'H800 브라켓',
            'I900 센서', 'J1000 컨트롤러', 'K1100 디스플레이', 'L1200 배터리',
        ]
        
        types = ['inhouse', 'incoming']
        
        current_date = start_date
        record_count = 0
        
        while current_date <= end_date:
            # 평일에는 5-15개, 주말에는 0-5개 생성
            weekday = current_date.weekday()
            if weekday < 5:  # 평일
                daily_count = random.randint(5, 15)
            else:  # 주말
                daily_count = random.randint(0, 5)
            
            for _ in range(daily_count):
                PerformanceRecord.objects.create(
                    type=random.choice(types),
                    date=current_date,
                    vendor=random.choice(vendors).name,
                    product_name=random.choice(product_names),
                    control_no=f'CTRL-{current_date.strftime("%Y%m%d")}-{random.randint(1000, 9999)}',
                    quantity=random.randint(50, 5000),
                    producer=random.choice(producers).name,
                    created_by=user,
                )
                record_count += 1
            
            current_date += timedelta(days=1)
        
        self.stdout.write(f"[OK] 실적 데이터 {record_count}개 생성 완료")
        return record_count

    def generate_nonconformance_records(self, user, start_date, end_date):
        """부적합 데이터 생성"""
        self.stdout.write("\n부적합 데이터 생성 중...")
        
        vendors = list(Vendor.objects.all())
        defect_types = list(DefectType.objects.all())
        defect_causes = list(DefectCause.objects.all())
        
        product_names = [
            'A100 부품', 'B200 모듈', 'C300 어셈블리', 'D400 패널',
            'E500 커넥터', 'F600 케이블', 'G700 하우징', 'H800 브라켓',
        ]
        
        types = ['inhouse', 'incoming']
        detection_stages = ['입고검사', '공정검사', '출하검사', '최종검사', '조립공정', '가공공정']
        processes = ['제조1팀', '제조2팀', '조립팀', '검사팀', '포장팀', '출하팀']
        operators = ['김철수', '이영희', '박민수', '정수진', '최동욱', '강미영', '조성호', '한지혜']
        
        whys = [
            '작업자가 표준을 확인하지 않음',
            '설비 점검이 누락됨',
            '재료 입고검사가 부실함',
            '측정기 교정이 만료됨',
            '작업환경 온도가 기준을 벗어남',
            '작업방법이 변경되었으나 교육이 없었음',
            '금형 마모가 심각함',
            '작업자 숙련도가 부족함',
        ]
        
        root_causes = [
            '표준작업지도서 미비치',
            '설비 예방보전 계획 미수립',
            '수입검사 기준 미흡',
            '측정기 교정 관리 미흡',
            '작업환경 모니터링 부족',
            '변경관리 프로세스 미준수',
            '금형 교체 주기 관리 미흡',
            '신규 작업자 교육훈련 부족',
        ]
        
        current_date = start_date
        record_count = 0
        ncr_counter = 1
        
        while current_date <= end_date:
            # 주 1-3개 정도 생성 (랜덤하게)
            if random.random() < 0.3:  # 30% 확률로 발생
                daily_count = random.randint(1, 3)
                
                for _ in range(daily_count):
                    type_choice = random.choice(types)
                    ncr_no = f'NCR-{current_date.strftime("%Y%m")}-{ncr_counter:04d}'
                    ncr_counter += 1
                    
                    defect_qty = random.randint(1, 100)
                    unit_price = Decimal(random.randint(1000, 50000))
                    weight_factor = Decimal(random.choice(['0.3', '0.5', '0.7', '1.0']))
                    
                    # 5Why 생성 (랜덤하게 3-5개)
                    num_whys = random.randint(3, 5)
                    selected_whys = random.sample(whys, num_whys)
                    
                    Nonconformance.objects.create(
                        type=type_choice,
                        occurrence_date=current_date,
                        ncr_no=ncr_no,
                        vendor=random.choice(vendors).name,
                        product_name=random.choice(product_names),
                        control_no=f'CTRL-{current_date.strftime("%Y%m%d")}-{random.randint(1000, 9999)}',
                        defect_qty=defect_qty,
                        unit_price=unit_price,
                        weight_factor=weight_factor,
                        detection_stage=random.choice(detection_stages),
                        defect_type_code=random.choice(defect_types),
                        cause_code=random.choice(defect_causes),
                        why1=selected_whys[0] if len(selected_whys) > 0 else None,
                        why2=selected_whys[1] if len(selected_whys) > 1 else None,
                        why3=selected_whys[2] if len(selected_whys) > 2 else None,
                        why4=selected_whys[3] if len(selected_whys) > 3 else None,
                        why5=selected_whys[4] if len(selected_whys) > 4 else None,
                        root_cause=random.choice(root_causes),
                        operators=random.sample(operators, random.randint(1, 3)),
                        process_name=random.choice(processes),
                        note=f'{random.choice(["긴급", "중요", "일반"])} 처리 필요' if random.random() < 0.5 else None,
                        created_by=user,
                    )
                    record_count += 1
            
            current_date += timedelta(days=1)
        
        self.stdout.write(f"[OK] 부적합 데이터 {record_count}개 생성 완료")
        return record_count

    def generate_customer_complaints(self, user, start_date, end_date):
        """고객 불만 데이터 생성"""
        self.stdout.write("\n고객 불만 데이터 생성 중...")
        
        vendors = list(Vendor.objects.all())
        defect_types = list(DefectType.objects.all())
        defect_causes = list(DefectCause.objects.all())
        
        product_names = [
            'A100 부품', 'B200 모듈', 'C300 어셈블리', 'D400 패널',
            'E500 커넥터', 'F600 케이블', 'G700 하우징', 'H800 브라켓',
        ]
        
        complaint_templates = [
            '제품 사용 중 {}이(가) 발생하였습니다.',
            '납품된 제품에서 {}이(가) 발견되었습니다.',
            '고객이 {}을(를) 보고하였습니다.',
            '설치 과정에서 {}이(가) 확인되었습니다.',
            'A/S 요청 시 {}이(가) 접수되었습니다.',
        ]
        
        complaint_issues = [
            '외관 흠집', '치수 오차', '기능 오작동', '소음 발생',
            '누수 현상', '조립 불량', '포장 파손', '수량 부족',
            '납기 지연', '도색 불량', '용접 불량', '부품 누락',
        ]
        
        action_templates = [
            '전수 검사 후 {}개 교체 완료',
            '불량품 회수 및 {}개 재납품 완료',
            '원인 분석 후 공정 개선 조치 완료',
            '고객사 방문하여 현장 조치 완료',
            '재발방지 대책 수립 및 이행 중',
        ]
        
        current_date = start_date
        record_count = 0
        ccr_counter = 1
        
        while current_date <= end_date:
            # 주 0-2개 정도 생성 (부적합보다 적게)
            if random.random() < 0.2:  # 20% 확률로 발생
                daily_count = random.randint(1, 2)
                
                for _ in range(daily_count):
                    ccr_no = f'CCR-{current_date.strftime("%Y%m")}-{ccr_counter:04d}'
                    ccr_counter += 1
                    
                    defect_qty = random.randint(1, 50)
                    unit_price = Decimal(random.randint(5000, 100000))
                    
                    complaint_content = random.choice(complaint_templates).format(
                        random.choice(complaint_issues)
                    )
                    
                    # 70% 확률로 조치 내용 작성
                    action_content = None
                    if random.random() < 0.7:
                        action_content = random.choice(action_templates).format(
                            random.randint(1, defect_qty)
                        )
                    
                    CustomerComplaint.objects.create(
                        occurrence_date=current_date,
                        ccr_no=ccr_no,
                        vendor=random.choice(vendors).name,
                        product_name=random.choice(product_names),
                        defect_qty=defect_qty,
                        unit_price=unit_price,
                        complaint_content=complaint_content,
                        action_content=action_content,
                        defect_type_code=random.choice(defect_types),
                        cause_code=random.choice(defect_causes),
                        created_by=user,
                    )
                    record_count += 1
            
            current_date += timedelta(days=1)
        
        self.stdout.write(f"[OK] 고객 불만 데이터 {record_count}개 생성 완료")
        return record_count

