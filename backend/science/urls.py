from django.urls import path

from . import views

urlpatterns = [
    path("v/<str:код>", views.volunteer, name="science-volunteer"),
    path("v/<str:код>/consent", views.consent, name="science-consent"),
    path("v/<str:код>/runs", views.runs, name="science-runs"),
    path("v/<str:код>/runs/<str:run_id>/finish", views.finish, name="science-finish"),
    path("v/<str:код>/runs/<str:run_id>/<str:вид>/<int:n>", views.chunk, name="science-chunk"),
]
