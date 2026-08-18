from django.urls import path, re_path
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView

from api.schema import schema
from apps.files.local_view import local_file

# JWT bearer auth (no cookies) -> CSRF is not applicable to the API endpoint.
urlpatterns = [
    path("graphql/", csrf_exempt(GraphQLView.as_view(schema=schema))),
    # 🔴 Адрес `/local-files/<key>` продукт отдавал клиенту с самого появления десктопного
    # профиля, а маршрута под него не было ни одного: внутри приложения загрузка файла уходила
    # в 404, а загруженное не открывалось. Смотри `apps/files/local_view.py` — там же границы.
    re_path(r"^local-files/(?P<key>.+)$", local_file),
]
