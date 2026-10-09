from django.urls import path

from . import views, кабинет

urlpatterns = [
    path("join/<str:токен>", views.join, name="science-join"),
    path("v/<str:код>", views.volunteer, name="science-volunteer"),
    path("v/<str:код>/consent", views.consent, name="science-consent"),
    path("v/<str:код>/profile", views.profile, name="science-profile"),
    path("v/<str:код>/runs", views.runs, name="science-runs"),
    path("v/<str:код>/runs/<str:run_id>/finish", views.finish, name="science-finish"),
    path("v/<str:код>/runs/<str:run_id>/<str:вид>/<int:n>", views.chunk, name="science-chunk"),
    # Кабинет владельца — по куке входа и только для почт из SCIENCE_OWNERS.
    path("cabinet", кабинет.cabinet, name="science-cabinet"),
    path("cabinet/v/<str:код>", кабинет.cabinet_volunteer, name="science-cabinet-volunteer"),
    path("cabinet/v/<str:код>/delete", кабинет.cabinet_delete, name="science-cabinet-delete"),
    path("cabinet/runs/<str:run_id>", кабинет.cabinet_run, name="science-cabinet-run"),
    path("cabinet/runs/<str:run_id>/<str:вид>/<int:n>", кабинет.cabinet_chunk, name="science-cabinet-chunk"),
    path("cabinet/link", кабинет.cabinet_link, name="science-cabinet-link"),
    path("cabinet/archive", кабинет.cabinet_archive, name="science-cabinet-archive"),
]
