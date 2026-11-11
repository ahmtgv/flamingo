from django.urls import path

from . import views

urlpatterns = [
    path("previews", views.список, name="hub-previews"),
    path("preview/<str:id>", views.превью, name="hub-preview"),
    path("stars", views.избранное, name="hub-stars"),
    path("pass", views.пропуск, name="hub-pass"),
]
