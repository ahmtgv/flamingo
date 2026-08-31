from django.urls import path

from . import views

urlpatterns = [
    path("register", views.register, name="auth-register"),
    path("login", views.login, name="auth-login"),
    path("me", views.me, name="auth-me"),
    path("forgot", views.forgot, name="auth-forgot"),
    path("reset", views.reset, name="auth-reset"),
]
