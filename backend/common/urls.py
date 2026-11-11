from django.urls import path

from . import views

urlpatterns = [
    path("previews", views.список, name="hub-previews"),
    path("preview/<str:id>", views.превью, name="hub-preview"),
    path("stars", views.избранное, name="hub-stars"),
    path("browser/open", views.браузер_открыть, name="hub-browser-open"),
    path("browser/frame", views.браузер_кадр, name="hub-browser-frame"),
    path("browser/act", views.браузер_действие, name="hub-browser-act"),
]
