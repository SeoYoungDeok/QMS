from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KPITargetViewSet

router = DefaultRouter()
router.register(r'kpi-targets', KPITargetViewSet, basename='kpi-target')

urlpatterns = [
    path('', include(router.urls)),
]

