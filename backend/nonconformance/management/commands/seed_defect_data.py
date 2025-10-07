from django.core.management.base import BaseCommand
from nonconformance.models import DefectType, DefectCause


class Command(BaseCommand):
    help = '불량 유형 및 원인 코드 시드 데이터를 생성합니다'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('시드 데이터 생성을 시작합니다...'))
        
        # 불량 유형 시드 데이터
        defect_types_data = [
            {'code': 'D01', 'name': '외관-파손', 'description': '칩핑, 깨짐, 파손, 등 구조적 손상'},
            {'code': 'D02', 'name': '외관-소재기인', 'description': '크랙, 핀홀 등 표면 균열 및 구멍'},
            {'code': 'D03', 'name': '외관-오염', 'description': '이물, 얼룩, 변색, 기름'},
            {'code': 'D04', 'name': '외관-표면결함', 'description': '툴마크, 흑피, 스크래치, 형상상이'},
            {'code': 'D05', 'name': '치수불량', 'description': '가공 치수 및 공차 이탈'},
            {'code': 'D06', 'name': '조립불량', 'description': '체결 불량'},
            {'code': 'D07', 'name': '기타', 'description': '위 항목에 해당하지 않는 경우'},
        ]
        
        # 발생 원인 시드 데이터 (6M 분류)
        defect_causes_data = [
            # Material (소재)
            {'code': 'M1.1', 'category': 'Material', 'name': '소재-제조처', 'description': '원자재 자체 불량'},
            {'code': 'M1.2', 'category': 'Material', 'name': '소재-외주1차', 'description': '외주 소재 준비 불량'},
            {'code': 'M1.3', 'category': 'Material', 'name': '소재-LOT편차', 'description': '로트별 품질 편차'},
            {'code': 'M1.4', 'category': 'Material', 'name': '소재-보관취급불량', 'description': '보관 중 손상, 오염'},
            
            # Machine (설비)
            {'code': 'M2.1', 'category': 'Machine', 'name': '설비-고장/오작동', 'description': '기계 고장, 오작동'},
            {'code': 'M2.2', 'category': 'Machine', 'name': '설비-부품고장', 'description': '모터, 백흄펌프 등 부속부품 고장'},
            {'code': 'M2.3', 'category': 'Machine', 'name': '설비-정밀도저하', 'description': '가공 정밀도 저하'},
            {'code': 'M2.4', 'category': 'Machine', 'name': '설비-점검미흡', 'description': '정기점검 미실시'},
            
            # Man (사람)
            {'code': 'M3.1', 'category': 'Man', 'name': '사람-작업자부주의', 'description': '순간 부주의, 실수'},
            {'code': 'M3.2', 'category': 'Man', 'name': '사람-숙련도부족', 'description': '작업자 스킬부족'},
            {'code': 'M3.3', 'category': 'Man', 'name': '사람-피로/컨디션', 'description': '작업자 피로, 컨디션 난조'},
            {'code': 'M3.4', 'category': 'Man', 'name': '사람-교육부족', 'description': '작업 교육 미흡'},
            
            # Method (방법)
            {'code': 'M4.1', 'category': 'Method', 'name': '방법-공구마모/파손', 'description': '교체주기 미준수, 파손공구사용'},
            {'code': 'M4.2', 'category': 'Method', 'name': '방법-공구오사용', 'description': '부적절한 공구 선택/사용'},
            {'code': 'M4.3', 'category': 'Method', 'name': '방법-JIG세팅오류', 'description': '고정구, 지그 세팅 불량'},
            {'code': 'M4.4', 'category': 'Method', 'name': '방법-기준점세팅오류', 'description': '원점, 좌표 설정 오류'},
            {'code': 'M4.5', 'category': 'Method', 'name': '방법-공정조건설정오류', 'description': '절삭속도, 이동속도 부적절'},
            {'code': 'M4.6', 'category': 'Method', 'name': '방법-작업지시전달미흡', 'description': '지시누락, 변경사항 미전달'},
            {'code': 'M4.7', 'category': 'Method', 'name': '방법-설계검토미흡', 'description': '변경 미반영, 도면 미확인'},
            {'code': 'M4.8', 'category': 'Method', 'name': '방법-프로그램오사용', 'description': '잘못된 프로그램 선택/사용'},
            {'code': 'M4.9', 'category': 'Method', 'name': '방법-절차미준수', 'description': '표준작업절차 미준수'},
            
            # Measurement (측정)
            {'code': 'M5.1', 'category': 'Measurement', 'name': '측정-도면오작성', 'description': '치수, 공차 기입오류'},
            {'code': 'M5.2', 'category': 'Measurement', 'name': '측정-도면오배포', 'description': '잘못된 도면 배포'},
            {'code': 'M5.3', 'category': 'Measurement', 'name': '측정-검사미흡', 'description': '자주검사, 최종검사 미실시'},
            {'code': 'M5.4', 'category': 'Measurement', 'name': '측정-검사구미확보', 'description': '게이지, 치구 부족'},
            {'code': 'M5.5', 'category': 'Measurement', 'name': '측정-계측기정밀도', 'description': '계측기 교정 미흡'},
            {'code': 'M5.6', 'category': 'Measurement', 'name': '측정-측정방법오류', 'description': '측정 방법 잘못'},
            
            # Environment (환경)
            {'code': 'M6.1', 'category': 'Environment', 'name': '환경-기타환경요인', 'description': '온도, 습도, 조도, 진동 등 환경요인'},
            {'code': 'M6.2', 'category': 'Environment', 'name': '환경-작업장정리정돈', 'description': '작업장 청결도, 정리정돈 불량'},
            {'code': 'M6.3', 'category': 'Environment', 'name': '환경-소음/분진', 'description': '소음, 분진 등 작업환경 불량'},
            
            # Other (기타)
            {'code': 'M7.1', 'category': 'Other', 'name': '기타', 'description': '분류 불가능하거나 복합원인'},
            {'code': 'M7.2', 'category': 'Other', 'name': '기타-외부요인', 'description': '외부 업체, 고객 요인'},
            {'code': 'M7.3', 'category': 'Other', 'name': '기타-시스템오류', 'description': 'IT 시스템, 소프트웨어 오류'},
        ]
        
        # DefectType 데이터 생성
        created_types = 0
        for data in defect_types_data:
            defect_type, created = DefectType.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'description': data['description']
                }
            )
            if created:
                created_types += 1
                self.stdout.write(f'  불량유형 생성: {defect_type.code} - {defect_type.name}')
        
        # DefectCause 데이터 생성
        created_causes = 0
        for data in defect_causes_data:
            defect_cause, created = DefectCause.objects.get_or_create(
                code=data['code'],
                defaults={
                    'category': data['category'],
                    'name': data['name'],
                    'description': data['description']
                }
            )
            if created:
                created_causes += 1
                self.stdout.write(f'  발생원인 생성: {defect_cause.code} - {defect_cause.name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'시드 데이터 생성 완료! '
                f'불량유형: {created_types}개, 발생원인: {created_causes}개'
            )
        )
