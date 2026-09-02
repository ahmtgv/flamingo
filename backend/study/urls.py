from django.urls import path

from . import views

urlpatterns = [
    path("lessons", views.lessons, name="study-lessons"),
    path("lessons/<str:lesson_id>", views.lesson, name="study-lesson"),
    path("lessons/<str:lesson_id>/materials", views.materials, name="study-materials"),
    path("materials/<str:material_id>", views.material, name="study-material"),
    path("file/<str:material_id>", views.file, name="study-file"),
    path("journal", views.journal, name="study-journal"),
    path("invites", views.invites, name="study-invites"),
    path("invites/<str:ключ>", views.invite, name="study-invite"),
    path("rooms/<str:код>", views.room, name="study-room"),
    path("visits", views.visits, name="study-visits"),
    path("teachers", views.teachers, name="study-teachers"),
    path("talks", views.talks, name="study-talks"),
    path("talks/<str:кто>", views.talk, name="study-talk"),
    path("talks/<str:кто>/read", views.talk_read, name="study-talk-read"),
]
