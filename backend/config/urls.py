from django.urls import include, path

urlpatterns = [
    path("api/room/", include("room.urls")),
    path("api/auth/", include("people.urls")),
    path("api/study/", include("study.urls")),
    # Исследование внимания SEduM: приём записей от добровольцев.
    path("api/science/", include("science.urls")),
    # Снимки источников хаба: их кладёт `manage.py хаб_снимки`.
    path("api/hub/", include("common.urls")),
]
