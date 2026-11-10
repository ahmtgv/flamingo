from django.urls import path

from . import админка

urlpatterns = [
    path("summary", админка.summary, name="admin-summary"),
    path("people", админка.people, name="admin-people"),
    path("people/<str:person_id>", админка.person, name="admin-person"),
    path("people/<str:person_id>/act", админка.act, name="admin-act"),
    path("lessons", админка.lessons, name="admin-lessons"),
    path("log", админка.log, name="admin-log"),
]
