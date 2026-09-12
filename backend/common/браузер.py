"""Снимок сайта настоящим браузером — для тех, кто витрины не объявил.

🔴 ЗАЧЕМ ЭТО ВООБЩЕ. Половина источников (четырнадцать из тридцати шести) не
объявляет `og:image` вовсе: это старые или служебные страницы, сделанные до
того, как визитки для мессенджеров вошли в моду. Брать у них «какую-нибудь
картинку из разметки» нельзя — сегодня угадаем фотографию, завтра баннер
«подпишитесь». А снимок самой страницы — это ровно то, что человек увидит,
открыв ссылку. Честнее любой визитки.

🔴 МЫ ПРЕДСТАВЛЯЕМСЯ (решение владельца 12.09). Браузер по умолчанию говорит
о себе «я Хром», и пятеро, кто сегодня отвечает роботам «нельзя», нас бы
пустили. Мы дописываем в представление своё имя: чужой сервер видит, кто
пришёл, и его «нельзя» остаётся в силе. Это дороже семи снимков, но дешевле,
чем ходить туда, куда не звали.

🔴 ОКНА СОГЛАСИЯ НЕ ЗАКРЫВАЕМ. На части сайтов снимок получится с баннером
про печеньки поперёк кадра. Нажать «принять» за посетителя мы не можем — это
согласие от чужого имени. Такие снимки отбраковывает человек тем же списком
`БЕЗ_СНИМКА`, что и рекламные карточки.

🔴 БРАУЗЕР ЗАПУСКАЕТСЯ ОДИН РАЗ НА ВЕСЬ ОБХОД. Поднять хром — это две-три
секунды и сотня мегабайт; тридцать шесть запусков превратили бы ночной обход
в получасовой. `Съёмка` держит один браузер и закрывает его за собой.
"""
from __future__ import annotations

import os

#: Кто мы. Настоящее представление хрома плюс наше имя в конце: сайт видит и
#: браузер, и того, кто им управляет.
ХВОСТ = "FlamingoHub/1.0 (+https://flamingo.plus; lesson source preview)"

#: Размер окна. 1280×720 — 16:9, ровно наша плитка с запасом на двойную плотность.
ОКНО_Ш, ОКНО_В = 1280, 720

#: Сколько ждём страницу. Больше — и один висящий сайт держит весь обход.
СРОК = int(os.getenv("HUB_SHOT_TIMEOUT", "25"))

#: Путь к хрому. Пусто — Playwright ищет свой (`playwright install chromium`).
ХРОМ = os.getenv("HUB_CHROME", "")


class НетБраузера(Exception):
    """Playwright или хром не установлены. Обход от этого не падает."""


class Съёмка:
    """Один браузер на весь обход. Использовать через `with`."""

    def __init__(self) -> None:
        self._пв = None
        self._бр = None

    def __enter__(self) -> "Съёмка":
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            raise НетБраузера(
                "нет playwright: pip install -r requirements.txt && playwright install chromium"
            ) from None
        self._пв = sync_playwright().start()
        пуск = {"args": ["--disable-dev-shm-usage", "--hide-scrollbars"]}
        if ХРОМ:
            пуск["executable_path"] = ХРОМ
        try:
            self._бр = self._пв.chromium.launch(**пуск)
        except Exception as e:                               # noqa: BLE001
            self._пв.stop()
            raise НетБраузера(f"хром не запустился ({type(e).__name__}): {e}"[:200]) from None
        return self

    def __exit__(self, *_) -> None:
        try:
            if self._бр:
                self._бр.close()
        finally:
            if self._пв:
                self._пв.stop()

    def снять(self, адрес: str) -> bytes:
        """Открыть страницу и вернуть png 1280×720. Не вышло — НеВышло со словами."""
        from common.снимки import НеВышло

        стр = None
        окно = None
        try:
            окно = self._бр.new_context(
                viewport={"width": ОКНО_Ш, "height": ОКНО_В},
                device_scale_factor=1,
                locale="ru-RU",
                # 🔴 «Меньше движения» просим и у чужого сайта: карусель, поймання
                # на середине перелистывания, — это не вид источника, это смазь.
                reduced_motion="reduce",
            )
            окно.set_default_timeout(СРОК * 1000)
            стр = окно.new_page()
            стр.set_extra_http_headers({
                "Accept-Language": "ru,en;q=0.8",
                # Своё имя отдельной строкой: подменять User-Agent целиком —
                # значит стереть правду о браузере, а мы её дополняем.
                "X-Requested-By": ХВОСТ,
            })
            ответ = стр.goto(адрес, wait_until="load", timeout=СРОК * 1000)
            if ответ is not None and ответ.status >= 400:
                raise НеВышло(f"ответил {ответ.status}")
            # Дорисовка: шрифты и то, что подгружается после загрузки.
            try:
                стр.wait_for_load_state("networkidle", timeout=6000)
            except Exception:                                # noqa: BLE001
                pass                                          # сеть не утихла — снимаем как есть
            стр.evaluate("() => document.fonts && document.fonts.ready")
            стр.wait_for_timeout(900)
            return стр.screenshot(type="png", full_page=False)
        except НеВышло:
            raise
        except Exception as e:                               # noqa: BLE001
            слово = type(e).__name__
            что = str(e).splitlines()[0][:90] if str(e) else ""
            raise НеВышло(f"браузер не снял ({слово}) {что}".strip()) from None
        finally:
            if окно:
                try:
                    окно.close()
                except Exception:                            # noqa: BLE001
                    pass
