from django.apps import AppConfig


class NonconformanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'nonconformance'
    verbose_name = '부적합 관리'