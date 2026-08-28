from django.urls import include, path

urlpatterns = [
    path("api/room/", include("room.urls")),
]
