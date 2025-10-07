from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StickyNoteViewSet, TagViewSet

router = DefaultRouter()
router.register(r'sticky-notes', StickyNoteViewSet, basename='sticky-note')
router.register(r'tags', TagViewSet, basename='tag')

urlpatterns = [
    path('', include(router.urls)),
]

