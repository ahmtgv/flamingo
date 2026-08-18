"""Сутки — в поясе человека, а не сервера.

🔴 РЕШЕНИЕ ВЛАДЕЛЬЦА §37, отменяющее «все по Москве» (§31.1, §32.2). Дословно: «часовые пояса
— время должно быть локальное».

⚠️ ПОЧИНКУ НЕ ОТКАТЫВАЕМ, А ОБОБЩАЕМ. Найденный 18.08 дефект был настоящий: сервер считал
сутки по UTC, и «Сегодня» у преподавателя в час ночи показывало вчерашние занятия, а урок в
02:00 попадал в полосе недели на предыдущий день. Москва была шагом в верную сторону,
локальное время — цель. Там, где стояла Москва, встаёт пояс человека.

ЧТО ГДЕ СЧИТАЕТСЯ:
  * хранение — UTC, как и было (`USE_TZ = True`);
  * показ — в поясе смотрящего, это умеет браузер;
  * 🔴 ГРАНИЦЫ СУТОК — здесь. «Сегодня», «завтра», серия занятий, «требует внимания»,
    недельная полоса: их считает сервер, и ему нужен ответ без открытого браузера.
"""

from __future__ import annotations

import datetime as dt
import zoneinfo

from django.conf import settings
from django.utils import timezone


def zone_of(user) -> dt.tzinfo:
    """Пояс этого человека. Не сказал — берём умолчание сервера.

    ⚠️ Незнакомый пояс НЕ роняет запрос и не подставляет молча чужой: неверная строка в поле
    (переименованная зона, опечатка из старого клиента) стоит одной ошибки на экране, а не
    сорванного расписания. Падать здесь нельзя — это читается на каждой странице.
    """
    name = (getattr(user, "timezone", "") or "").strip()
    if name:
        try:
            return zoneinfo.ZoneInfo(name)
        except (zoneinfo.ZoneInfoNotFoundError, ValueError):
            pass
    return timezone.get_default_timezone()


def local_date(user, moment=None) -> dt.date:
    """Какое «сегодня» у этого человека прямо сейчас."""
    return timezone.localtime(moment or timezone.now(), zone_of(user)).date()


def day_bounds(user, day: dt.date | None = None) -> tuple[dt.datetime, dt.datetime]:
    """Начало и конец суток человека — в UTC, пригодные для сравнения с базой.

    Именно эта пара и есть «граница суток»: всё, что раньше писалось как `localtime(now)` по
    поясу сервера, должно спрашивать её.
    """
    zone = zone_of(user)
    target = day or timezone.localtime(timezone.now(), zone).date()
    start = dt.datetime.combine(target, dt.time.min, tzinfo=zone)
    end = dt.datetime.combine(target, dt.time.max, tzinfo=zone)
    return start.astimezone(dt.UTC), end.astimezone(dt.UTC)


def same_local_day(user, moment, day: dt.date | None = None) -> bool:
    """Попадает ли момент в эти сутки ЧЕЛОВЕКА."""
    zone = zone_of(user)
    target = day or timezone.localtime(timezone.now(), zone).date()
    return timezone.localtime(moment, zone).date() == target


def default_zone_name() -> str:
    return getattr(settings, "TIME_ZONE", "UTC")
