from django.urls import path

from . import views

urlpatterns = [
    path("token", views.token, name="room-token"),
    path("healthz", views.healthz, name="healthz"),
]
