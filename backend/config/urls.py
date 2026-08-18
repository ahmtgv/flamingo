from django.conf import settings
from django.urls import path, re_path
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView

from api.schema import schema
from apps.files.local_view import local_file

# JWT bearer auth (no cookies) -> CSRF is not applicable to the API endpoint.
# 🔴 ОТЛАДОЧНАЯ КОНСОЛЬ БЫЛА ОТКРЫТА ВСЕМУ МИРУ (наряд 37 §4.1, найдено 18.08).
#
# `api.flamingo.plus/graphql/` отдавал GraphiQL — полноценную консоль со схемой, доступную
# кому угодно без входа. Через неё ревьюер проверял, жив ли сервер; через неё же любой другой
# читает всю схему продукта и пробует запросы руками.
#
# ⚠️ Схема сама по себе не секрет, и интроспекция здесь НЕ выключается: на ней держатся наши
# же приборы и генерация типов. Убирается именно ЧЕЛОВЕЧЕСКАЯ консоль — она нужна разработчику
# на своей машине и не нужна на бою, где `DEBUG=0`.
#
# ⚠️ Параметр называется `graphql_ide`, а не `graphiql`: в Strawberry 0.316 второй не
# принимается вовсе (`as_view only accepts arguments that are already attributes of the
# class`) — и правка, написанная по памяти, уронила бы весь API целиком.
urlpatterns = [
    path(
        "graphql/",
        csrf_exempt(
            GraphQLView.as_view(schema=schema, graphql_ide="graphiql" if settings.DEBUG else None)
        ),
    ),
    # 🔴 Адрес `/local-files/<key>` продукт отдавал клиенту с самого появления десктопного
    # профиля, а маршрута под него не было ни одного: внутри приложения загрузка файла уходила
    # в 404, а загруженное не открывалось. Смотри `apps/files/local_view.py` — там же границы.
    re_path(r"^local-files/(?P<key>.+)$", local_file),
]
