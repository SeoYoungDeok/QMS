from django.contrib import admin
from .models import StickyNote, Tag, NoteTag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'color', 'created_at']
    search_fields = ['name']
    list_filter = ['created_at']


@admin.register(StickyNote)
class StickyNoteAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'note_uid', 'author', 'content_preview', 
        'importance', 'color', 'is_locked', 'created_at'
    ]
    list_filter = ['importance', 'color', 'is_locked', 'created_at']
    search_fields = ['note_uid', 'content', 'author__username', 'author__name']
    readonly_fields = ['note_uid', 'created_at', 'updated_at']
    
    def content_preview(self, obj):
        """내용 미리보기 (30자)"""
        return obj.content[:30] + '...' if len(obj.content) > 30 else obj.content
    content_preview.short_description = '내용'


@admin.register(NoteTag)
class NoteTagAdmin(admin.ModelAdmin):
    list_display = ['id', 'note', 'tag']
    search_fields = ['note__note_uid', 'tag__name']
