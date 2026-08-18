"""Отдать и принять файл на машине преподавателя — маршрут, которого не было.

🔴 НАЙДЕНО НАРЯДОМ 34 §5. `common/storage.py` в десктопном профиле возвращает клиенту адрес
``/local-files/<key>`` — и на PUT, и на GET, — а в `config/urls.py` стоял ОДИН маршрут,
``graphql/``. То есть внутри приложения:

* загрузка файла уходила в никуда: браузер клал байты по адресу, которого нет (404);
* любой уже загруженный файл — материал урока, работа ученика, аватар — не открывался.

Комментарий в `storage.py` при этом утверждал: «the sidecar serves its own loopback upload
route». Не служил. Третий раз подряд тот же механизм: половина написана, вторая половина
описана словами в комментарии, и никто не спросил, есть ли она.

⚠️ ГРАНИЦЫ ЖЁСТКИЕ, И ЭТО НЕ ПЕРЕСТРАХОВКА.

1. **Только локальное хранилище.** На боевом сервере файлы живут в S3 и ходят по подписанным
   ссылкам; этот маршрут там обязан отвечать 404, а не открывать вторую дверь к тем же
   объектам мимо подписи.
2. **Только петля.** `ALLOWED_HOSTS` десктопа — `127.0.0.1` и `localhost`, но полагаться на
   настройку в вопросе доступа к диску нельзя: проверяем адрес обращающегося сами.
3. **Ключ не выходит за корень.** `_local_path` уже отказывает на `../`; здесь этот отказ
   превращается в 404, а не в 500 со следом файловой системы.

ЧТО ЭТОТ МАРШРУТ НЕ ДЕЛАЕТ: он не решает, кому можно смотреть файл. На сервере это решают
резолверы, выдавая подписанную ссылку; здесь единственный, кто может достучаться до адреса, —
приложение на этой же машине, у которого и так есть весь каталог данных. Ставить сюда вторую
проверку прав значило бы дублировать ту, что уже сделана, и разойтись с ней.
"""

from __future__ import annotations

import mimetypes

from django.http import FileResponse, HttpResponse, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt

from common import storage

#: Кого пускаем к диску. Не из настроек: настройку меняют ради удобства, а это про диск.
LOOPBACK = {"127.0.0.1", "::1", "localhost"}

#: Столько байт примет одна загрузка. Материал урока, работа, аватар — всё умещается.
MAX_UPLOAD_BYTES = 256 * 1024 * 1024


def _is_loopback(request) -> bool:
    return (request.META.get("REMOTE_ADDR") or "").split("%")[0] in LOOPBACK


@csrf_exempt
def local_file(request, key: str):
    """GET — отдать файл, PUT — принять. Только в десктопном профиле и только с петли."""
    if storage.backend() != "local" or not _is_loopback(request):
        return HttpResponseNotFound()

    try:
        path = storage._local_path(key)
    except ValueError:
        # Ключ лезет за корень хранилища. Отвечаем как на несуществующий: подсказывать
        # обращающемуся, что именно ему не понравилось, здесь нечего.
        return HttpResponseNotFound()

    if request.method == "PUT":
        body = request.body
        if len(body) > MAX_UPLOAD_BYTES:
            return HttpResponse("Файл слишком велик", status=413)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        return HttpResponse(status=200)

    if request.method != "GET":
        return HttpResponse(status=405)

    if not path.is_file():
        return HttpResponseNotFound()
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path.open("rb"), content_type=content_type)
