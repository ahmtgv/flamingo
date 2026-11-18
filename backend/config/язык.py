"""Английский язык ответов сервера.

Сайт говорит на двух языках: русском и английском (владелец, 13.11.2026).
Язык выбирает страница — по настройкам браузера или вручную — и запоминает
в куке `fl_lang` на весь `flamingo.plus`. Сервер читает ту же куку; если её
нет — заголовок `Accept-Language`; если и его нет — русский, как было всегда.

🔴 ПЕРЕВОДИМ НА ВЫХОДЕ, А НЕ В КАЖДОМ ОТКАЗЕ. Отказы по всему серверу собраны
одинаково: `{"error": "…"}`. Поэтому слова остаются в коде по-русски, а здесь
стоит словарь «русский → английский», и прослойка `ПереводОтветов` меняет
текст в поле `error` (и в поле `сказать`), когда страница английская. Новый
отказ без перевода просто останется русским — ничего не сломается.

Отказ со вставкой (`f"… {wait} мин."`) переводится по образцу: `{}` в русском
образце ловит любую вставку, `{1}`, `{2}` в английском ставят её на место.

Письма (`people/mail.py`) берут язык того, кто их попросил: `т()` знает его
из этой же прослойки.
"""
from __future__ import annotations

import json
import re
from contextvars import ContextVar

ЯЗЫКИ = ("ru", "en")
_сейчас: ContextVar[str] = ContextVar("язык", default="ru")

#: Поля ответа, в которых человеку пишут словами.
ПОЛЯ = ("error", "сказать")

СЛОВАРЬ: dict[str, str] = {
    "Сначала войдите.": "Please sign in first.",
    "Так нельзя.": "This is not allowed.",
    "Нужен список избранного.": "A list of favourites is needed.",
    "С этой страницы изменения не принимаются.": "Changes are not accepted from this page.",
    "Этот путь отвечает только на POST.": "This path only answers POST.",
    "Почта написана не полностью — нужен адрес вида имя@почта.рф.": "The email is incomplete — an address like name@mail.com is needed.",
    "Не сказано, как вас зовут: это имя увидит класс.": "Your name is missing: the class will see this name.",
    "Пароль короче восьми знаков. Длина надёжнее сложности: возьмите четыре слова.": "The password is shorter than eight characters. Length is safer than complexity: take four words.",
    "Такая почта уже занята. Если это вы — войдите.": "This email is already taken. If it's you, sign in.",
    "Слишком много попыток. Попробуйте через {} мин. Если это не вы пробовали — пароль всё ещё цел, но лучше его сменить.": "Too many attempts. Try again in {1} min. If it wasn't you, the password is still safe, but it's better to change it.",
    "Почта или пароль не подошли.": "The email or password is incorrect.",
    "Эта учётная запись заблокирована. Если это ошибка — напишите нам.": "This account is blocked. If this is a mistake, write to us.",
    "Этот путь отвечает на GET и DELETE.": "This path answers GET and DELETE.",
    "Если такая почта у нас есть, письмо со ссылкой уже ушло. Ссылка живёт час.": "If we have this email, a message with a link has already been sent. The link works for an hour.",
    "Слишком много запросов. Попробуйте через {} мин.": "Too many requests. Try again in {1} min.",
    "Ссылка больше не работает: она живёт час и срабатывает один раз. Попросите новую на экране входа.": "The link no longer works: it lasts an hour and works once. Ask for a new one on the sign-in screen.",
    "Войдите в Flamingo — админка открывается после входа.": "Sign in to Flamingo — the admin panel opens after signing in.",
    "Админка открыта только владельцу.": "The admin panel is open only to the owner.",
    "Не сказано, кого показать: wait, teachers, students или blocked.": "It's not said whom to show: wait, teachers, students or blocked.",
    "Такого человека нет.": "There is no such person.",
    "Проверка есть только у преподавателя.": "Only teachers are verified.",
    "Себя заблокировать нельзя.": "You cannot block yourself.",
    "Скажите, за что блокируете: причина останется в журнале.": "Say why you are blocking: the reason will stay in the log.",
    "Такого действия админка не знает.": "The admin panel doesn't know this action.",
    "Запрос не разобран: ожидался JSON.": "The request could not be read: JSON was expected.",
    "Код комнаты не похож на код: ждём три группы по четыре знака.": "The room code doesn't look like a code: three groups of four characters are expected.",
    "Не сказано, как вас зовут.": "Your name is missing.",
    "Нет такой комнаты. Проверьте ссылку — возможно, урок уже сняли.": "There is no such room. Check the link — perhaps the lesson has been removed.",
    "Медиасервер не настроен: в backend/.env пустые LIVEKIT_*.": "The media server is not configured: LIVEKIT_* are empty in backend/.env.",
    "Не тот метод.": "Wrong method.",
    "Эта ссылка больше не действует. Попросите новую у того, кто её прислал.": "This link no longer works. Ask the person who sent it for a new one.",
    "Напишите, как вас зовут: так Адель поймёт, чьи это записи.": "Write your name — so Adel knows whose recordings these are.",
    "По этой ссылке за час пришло слишком много новых людей. Попробуйте через час или напишите Аделю.": "Too many new people came through this link within an hour. Try again in an hour or write to Adel.",
    "Ссылка не найдена. Проверьте, что она скопирована целиком.": "Link not found. Check that it was copied completely.",
    "Без согласия записывать нельзя.": "We cannot record without consent.",
    "Сначала нужно согласие на запись.": "Consent to recording is needed first.",
    "Эта проверка пока не работает: сервер ещё не обновлён. Пройдите другую или напишите Аделю.": "This check doesn't work yet: the server hasn't been updated. Take another one or write to Adel.",
    "Записей у вас уже очень много — спасибо! Напишите Аделю, он освободит место.": "You already have a lot of recordings — thank you! Write to Adel and he will free up space.",
    "Такой проверки нет.": "There is no such check.",
    "Войдите в Flamingo — кабинет исследования открывается после входа.": "Sign in to Flamingo — the research dashboard opens after signing in.",
    "Кабинет исследования открыт только владельцу. Записи добровольцев видит один человек — так сказано в согласии.": "The research dashboard is open only to its owner. Volunteers' recordings are seen by one person — as stated in the consent.",
    "Этот путь отвечает только на GET.": "This path only answers GET.",
    "Такого куска нет.": "There is no such part.",
    "Нужен JSON.": "JSON is needed.",
    'Чтобы сменить ссылку, подтвердите: {"сменить": true}.': 'To change the link, confirm: {"сменить": true}.',
    'Чтобы удалить, подтвердите кодом человека: {"удалить": "<код>"}.': 'To delete, confirm with the person\'s code: {"удалить": "<code>"}.',
    "Такого человека нет — возможно, его уже удалили.": "There is no such person — perhaps they have already been deleted.",
    "Ссылка повреждена.": "The link is damaged.",
    "Такого вида записи мы не принимаем.": "We don't accept this kind of recording.",
    "Номер куска вне пределов.": "The part number is out of range.",
    "Кусок записи слишком большой.": "The recording part is too large.",
    "На сервере кончается место — запись остановлена. Мы уже знаем.": "The server is running out of space — recording has stopped. We already know.",
    "Запись этой проверки слишком большая.": "The recording of this check is too large.",
    "Пустой кусок.": "Empty part.",
    "Видео мы у себя не храним: час записи — это гигабайты, и класс начнёт ждать загрузку вместо урока. Положите видео ссылкой — она откроется на доске так же.": "We don't store videos: an hour of recording is gigabytes, and the class would wait for the download instead of the lesson. Add the video as a link — it will open on the board just the same.",
    "Файлы «{}» мы не принимаем. Берём документы (pdf, doc, docx, ppt, pptx, xls, xlsx, odt, odp, txt, md, csv), картинки (png, jpg, webp, gif) и звук (mp3, m4a, aac, wav, ogg, opus, flac). Остальное — ссылкой.": "We don't accept “{1}” files. We take documents (pdf, doc, docx, ppt, pptx, xls, xlsx, odt, odp, txt, md, csv), images (png, jpg, webp, gif) and audio (mp3, m4a, aac, wav, ogg, opus, flac). Anything else — as a link.",
    "без расширения": "no extension",
    "Файл «{}» весит {} МБ, а больше {} МБ мы не берём. Учебник целиком лучше положить ссылкой, а к уроку — только нужные страницы.": "The file “{1}” is {2} MB, and we don't take more than {3} MB. A whole textbook is better added as a link, and for the lesson — only the pages you need.",
    "Файл оказался больше, чем сказано в заголовке. Не приняли.": "The file turned out larger than its header said. Not accepted.",
    "Без названия урок не найти в расписании.": "Without a title the lesson can't be found in the schedule.",
    "Дата должна быть днём, месяцем и годом.": "The date must be a day, month and year.",
    "Такой даты не существует.": "This date does not exist.",
    "Время должно быть часами и минутами.": "The time must be hours and minutes.",
    "Длительность — число минут.": "The duration is a number of minutes.",
    "Длительность — от 5 до 480 минут.": "The duration is from 5 to 480 minutes.",
    "Сначала войдите: занятия принадлежат учётной записи.": "Sign in first: lessons belong to an account.",
    "Этот путь отвечает на GET и POST.": "This path answers GET and POST.",
    "Заводить занятия может преподаватель.": "Only a teacher can create lessons.",
    "Ваша учётная запись преподавателя ещё не подтверждена. Заводить занятия можно после проверки.": "Your teacher account has not been verified yet. You can create lessons after verification.",
    "Учётная запись преподавателя не подтверждена. Напишите нам, если это ошибка.": "The teacher account is not verified. Write to us if this is a mistake.",
    "Такого занятия у вас нет.": "You don't have such a lesson.",
    "Этот путь отвечает на PATCH и DELETE.": "This path answers PATCH and DELETE.",
    "Ссылка должна начинаться с http:// или https://.": "The link must start with http:// or https://.",
    "Не пришло ни файла, ни ссылки.": "Neither a file nor a link arrived.",
    "Место кончилось: у вас занято {} ГБ из {}. Снимите лишнее со старых уроков или положите крупное ссылкой.": "Out of space: you are using {1} GB of {2}. Remove what's not needed from old lessons or add large files as links.",
    "Этот путь отвечает только на DELETE.": "This path only answers DELETE.",
    "Такого пособия у вас нет.": "You don't have such a material.",
    "Такого пособия нет.": "There is no such material.",
    "Файл не найден на диске. Похоже, его сняли.": "The file was not found on disk. It seems it was removed.",
    "Журнал ведёт преподаватель.": "The journal is kept by the teacher.",
    "Звать учеников может преподаватель.": "Only a teacher can invite students.",
    "Если по этой почте можно писать, ссылка уже отправлена.": "If this email can receive mail, the link has already been sent.",
    "Ссылка живёт 7 дней и добавляет одного человека.": "The link works for 7 days and adds one person.",
    "Ссылка не работает: она живёт семь дней и срабатывает один раз. Попросите преподавателя прислать новую.": "The link doesn't work: it lasts seven days and works once. Ask the teacher to send a new one.",
    "Сначала войдите или заведите учётную запись — тогда вас будет кому записать.": "Sign in or create an account first — then there will be someone to enrol.",
    "Это ваша собственная ссылка: по ней зовут учеников.": "This is your own link: it is for inviting students.",
    "Код комнаты не похож на код.": "The room code doesn't look like a code.",
    "Комната не от занятия.": "The room is not from a lesson.",
    "Такого разговора нет.": "There is no such conversation.",
    "На занятие зовёт преподаватель.": "Only a teacher invites to a lesson.",
    "Такого занятия нет.": "There is no such lesson.",
    "Сообщение пустое: напишите, что передать.": "The message is empty: write what to say.",
    "Слишком длинно: до {} знаков. Что длиннее — это уже пособие к занятию.": "Too long: up to {1} characters. Anything longer is a lesson material.",
}

# Образцы со вставками: `{}` в русском → «что угодно», по порядку → `{1}`, `{2}`…
_ОБРАЗЦЫ: list[tuple[re.Pattern[str], str]] = [
    (re.compile("^" + "(.+?)".join(re.escape(к) for к in ру.split("{}")) + "$", re.S), en)
    for ру, en in СЛОВАРЬ.items()
    if "{}" in ру
]


def по_запросу(request) -> str:
    """Язык запроса: кука страницы, потом `Accept-Language`, иначе русский."""
    кука = request.COOKIES.get("fl_lang")
    if кука in ЯЗЫКИ:
        return кука
    for кусок in request.headers.get("Accept-Language", "").split(","):
        основа = кусок.split(";")[0].strip().lower().split("-")[0]
        if основа in ЯЗЫКИ:
            return основа
    return "ru"


def сейчас() -> str:
    return _сейчас.get()


def т(текст: str, язык: str | None = None) -> str:
    """Перевод одной фразы на язык запроса. Без перевода — как есть."""
    if (язык or _сейчас.get()) != "en":
        return текст
    готово = СЛОВАРЬ.get(текст)
    if готово is not None:
        return готово
    for образец, en in _ОБРАЗЦЫ:
        м = образец.match(текст)
        if м:
            итог = en
            for i, вставка in enumerate(м.groups(), 1):
                итог = итог.replace(f"{{{i}}}", т(вставка, "en"))
            return итог
    return текст


class ПереводОтветов:
    """Запоминает язык запроса и переводит слова в ответах-JSON."""

    def __init__(self, дальше) -> None:
        self.дальше = дальше

    def __call__(self, request):
        метка = _сейчас.set(по_запросу(request))
        try:
            ответ = self.дальше(request)
            if _сейчас.get() == "en":
                self._перевести(ответ)
            return ответ
        finally:
            _сейчас.reset(метка)

    @staticmethod
    def _перевести(ответ) -> None:
        if getattr(ответ, "streaming", False):
            return
        if not str(ответ.get("Content-Type", "")).startswith("application/json"):
            return
        try:
            тело = json.loads(ответ.content)
        except ValueError:
            return
        if not isinstance(тело, dict):
            return
        было = False
        for поле in ПОЛЯ:
            if isinstance(тело.get(поле), str):
                новое = т(тело[поле], "en")
                if новое != тело[поле]:
                    тело[поле] = новое
                    было = True
        if not было:
            return
        ответ.content = json.dumps(тело, ensure_ascii=False).encode("utf-8")
        if ответ.has_header("Content-Length"):
            ответ["Content-Length"] = str(len(ответ.content))
