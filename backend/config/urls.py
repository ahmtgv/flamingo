from django.urls import include, path

urlpatterns = [
    path("api/room/", include("room.urls")),
    path("api/auth/", include("people.urls")),
]
