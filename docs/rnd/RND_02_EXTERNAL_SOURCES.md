# КАТАЛОГ ВНЕШНИХ ОБРАЗОВАТЕЛЬНЫХ ИСТОЧНИКОВ (владелец, 2026-08-08)

**Статус:** входной материал от владельца + сверка с `RND_01_SPEC_SUBJECTS_RU_ASTRO.md`.
**Два формата подачи (решение владельца):** (1) внутри предмета — только релевантные источники; (2) отдельный хаб — все проверенные источники мира.
**Языки:** пока два (ru/en), архитектура — под все языки мира.

---

## 🔴 ЛИЦЕНЗИОННЫЕ ПРАВИЛА (обязательны к соблюдению в реализации)

1. **Live-видео: только официальный плеер или ссылка на страницу трансляции.** Перехват HLS/DASH-потока и собственная ретрансляция — **запрещены** без отдельной лицензии. → Отсюда прямое UX-следствие: **живые трансляции открываются в новой вкладке** (совпадает с требованием владельца о многоэкранности).
2. **Не индексировать полный текст произведения** без отдельной проверки лицензии.
3. **Хранить по каждой записи:** идентификатор источника · URL · автор/институция · `rights`/лицензия · дата получения · исходный JSON. Это позволяет автоматически отфильтровывать записи без права на повторное использование.
4. **Права проверяются на уровне объекта, не коллекции.** У Internet Archive, Smithsonian, SkyView, Wikimedia Commons статус различается по каждому файлу.
5. Уточнения из `RND_01`: **APOD — проверять поле `copyright` серверно** · **JPL Horizons — только с бэкенда** (CORS запрещён Fair Use Policy) · **SIMBAD ≤6 запросов/сек** · **Zooniverse — регистрация детей <16 невозможна** · **stellarium-web-engine AGPL** → WorldWide Telescope (MIT).

---

## Таксономия (определяет UI)

Источники различаются по природе — это ключ ко всему дизайну:

| Тип | Что это | Поведение в интерфейсе |
|---|---|---|
| **LIVE** | Трансляции: NASA Live, ESA Web TV, зоокамеры | Индикатор «в эфире», **открытие в новой вкладке** (лицензия!) |
| **ДАННЫЕ / API** | NASA API, GBIF, SIMBAD, VizieR, Copernicus | Встраиваются в задания; вызов с бэкенда; кеш |
| **КОЛЛЕКЦИЯ / АРХИВ** | Met, Europeana, Gutenberg, LOC | Поиск, карточки, глубокое чтение |
| **УПРАВЛЯЕМЫЙ ПРИБОР** | MicroObservatory, LCO | Заказ → ожидание (~48 ч) → результат; нужен «архивный двойник» |

---

## Книги и библиотеки

| Ресурс | Содержание | Подключение |
|---|---|---|
| [Open Library](https://openlibrary.org/) | Международный каталог книг | Открытые API (JSON/YAML/RDF); поиск, ISBN, библиокарточки |
| [Internet Archive](https://archive.org/) | Книги, аудио, журналы, ПО, видео | metadata/download API, IIIF, bulk; **права по каждому файлу** |
| [Library of Congress](https://www.loc.gov/) | Книги, газеты, рукописи, карты, фото, звук | `loc.gov` JSON API; поля различаются между наборами |
| [Europeana](https://www.europeana.eu/) | Европейские книги, архивы, искусство, звук | API поиска метаданных + OAI-PMH |
| [DPLA](https://dp.la/) | Библиотеки, музеи, архивы США | Официальный API, максимально открытые данные |
| [HathiTrust](https://www.hathitrust.org/) | Миллионы оцифрованных книг | Data API; полный текст — только где позволяют права |
| [Project Gutenberg](https://www.gutenberg.org/) | Public domain, преим. английский | OPDS-каталог, RDF-метаданные. ⚠️ PD в США ≠ ОД в РФ |
| [Wikisource](https://wikisource.org/) | Свободные тексты, десятки языков | MediaWiki API, дампы. ⚠️ CC BY-SA — ShareAlike |
| [НЭБ](https://rusneb.ru/) | Российские книги, диссертации, ноты, карты | ⚠️ Публичного developer API нет; доступ = библиотечный, не лицензия |
| [РГБ](https://search.rsl.ru/) | Каталог РГБ, диссертации | Поиск открыт; полные тексты — через виртуальные читальные залы |
| [Президентская библиотека](https://www.prlib.ru/) | История России, редкие книги, карты | Доступ по правилам портала |
| [Руниверс](https://runivers.ru/) | Исторические книги, энциклопедии, карты | Статус проверять по каждому изданию |

**Стартовая связка для EdTech:** Open Library · Gutenberg · Wikisource · LOC · Europeana.

## Музеи и культурное наследие

| Ресурс | Что доступно | API |
|---|---|---|
| [The Met Open Access](https://www.metmuseum.org/art/collection) | 470 000+ объектов | REST/JSON **без ключа**; изображения высокого разрешения для PD |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | Естественная история, авиация, искусство | API, bulk, IIIF; **сверять rights по объекту** |
| [Rijksmuseum](https://data.rijksmuseum.nl/) | Нидерландское искусство | LOD, Search API, OAI-PMH, IIIF |
| [Art Institute of Chicago](https://www.artic.edu/open-access/public-api) | Искусство, архитектура, архивы | Открытый REST + IIIF |
| [Cleveland Museum of Art](https://openaccess-api.clevelandart.org/) | Искусство разных эпох | Открытый API |
| [Harvard Art Museums](https://harvardartmuseums.org/collections/api) | Искусство, археология | REST, нужен бесплатный ключ |
| [Getty](https://www.getty.edu/research/tools/vocabularies/) | Словари AAT, ULAN, TGN | LOD + SPARQL |
| [British Museum](https://www.britishmuseum.org/collection) | Древний мир, этнография | Веб-каталог; лицензию проверять по набору |
| [ГМИИ им. Пушкина](https://pushkinmuseum.art/) · [Эрмитаж](https://www.hermitagemuseum.org/) | Искусство, археология | ⚠️ Открытый API не предполагать без письменного подтверждения |

## Астрономия

**Разделять три вещи:** живой эфир · архив научных данных · удалённое управление телескопом (последнее требует заявки/программы).

| Ресурс | Возможности | Доступ |
|---|---|---|
| [NASA Open APIs](https://api.nasa.gov/) | APOD, Mars Rover, EONET, DONKI, EPIC | Бесплатный ключ; DEMO_KEY 50/сут |
| [NASA Image and Video Library](https://images.nasa.gov/) | Фото, видео, аудио миссий | **Ключ не нужен** |
| [MAST](https://mast.stsci.edu/) | Hubble, JWST, TESS, Kepler | Архив + API |
| [ESA Sky](https://sky.esa.int/) | Gaia, XMM-Newton, Hubble, Herschel | Веб-атлас, научные сервисы |
| [Aladin](https://aladin.cds.unistra.fr/) | Обзоры неба, каталоги, наложение | ⚠️ **GPL v3** — только немодифицированным с CDN |
| [SIMBAD](https://simbad.cds.unistra.fr/) · [VizieR](https://vizier.cds.unistra.fr/) | Объекты, каталоги публикаций | TAP/ADQL. ⚠️ **≤6 запросов/сек** |
| [NASA SkyView](https://skyview.gsfc.nasa.gov/) | Генерация изображений неба | ⚠️ Единой лицензии нет; DSS отдельно |
| [SDSS SkyServer](https://skyserver.sdss.org/) | Спектры, изображения, каталоги | SQL, CasJobs, API |
| [ESO](https://www.eso.org/public/) | Трансляции, архивы телескопов | **CC BY 4.0** — самая чистая лицензия |
| [Las Cumbres Observatory](https://lco.global/) | Сеть роботизированных телескопов | ⚠️ Open Access приостановлен 2026B–2028B; GSP только Pilot |
| **MicroObservatory** | Реальный снимок школьнику | 🟢 **Бесплатно, без регистрации, ~48 ч**; API нет |
| [Slooh](https://www.slooh.com/) | Онлайн-наблюдение событий | ⚠️ Подписка; оплата картой из РФ не работает |

**Live:** [NASA Live](https://www.nasa.gov/nasatv/) · [ESA Web TV](https://www.esa.int/ESA_Multimedia/ESA_Web_TV) · [JAXA](https://www.youtube.com/@JAXA_jp) · [ISRO](https://www.youtube.com/@isroofficial5866) · [SpaceX](https://www.youtube.com/@SpaceX) · [Royal Observatory Greenwich](https://www.rmg.co.uk/royal-observatory)

## Природа, Земля, МКС

| Ресурс | Для чего | Доступ |
|---|---|---|
| [GBIF](https://www.gbif.org/) | Биоразнообразие, наблюдения видов | Открытый API `api.gbif.org/v1`, Darwin Core |
| [iNaturalist](https://www.inaturalist.org/) | Наблюдения пользователей | `api.inaturalist.org`, OAuth 2 |
| [eBird](https://ebird.org/) | Птицы, чек-листы, ареалы | API, нужен ключ |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Спутниковые слои Земли | WMS/WMTS, Earthdata |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Активные пожары MODIS/VIIRS | Карты, файлы, API |
| [Copernicus](https://dataspace.copernicus.eu/) | Sentinel-1/2/3/5P | API, STAC, OData; регистрация бесплатна |
| [NOAA](https://www.noaa.gov/) | Погода, океан, климат | NWS API, Open Data |
| [USGS Earthquakes](https://earthquake.usgs.gov/earthquakes/feed/) | Землетрясения near-real-time | GeoJSON/CSV/KML без регистрации |
| [Explore.org](https://explore.org/livecams) | Камеры дикой природы | ⚠️ Только просмотр на платформе; извлечение потока — нет |
| [Smithsonian Zoo Cams](https://nationalzoo.si.edu/webcams) | Панды, слоны, львы | Официальные публичные камеры |

**МКС:** [NASA Live](https://www.nasa.gov/nasatv/) · [Spot The Station](https://spotthestation.nasa.gov/) · Heavens-Above (не официальный, но широко используемый).

---

## Минимальный стартовый стек

- **Книги/гуманитарные:** Open Library · Gutenberg · Wikisource · LOC · Europeana
- **История/музеи:** Europeana · The Met · Smithsonian · Rijksmuseum · Art Institute of Chicago
- **Астрономия:** NASA API · MAST · ESA Sky · Aladin · SIMBAD/VizieR · SDSS
- **Природа/геоданные:** GBIF · iNaturalist · eBird · Copernicus · Worldview/FIRMS · USGS
- **Live-видео:** официальный плеер или ссылка — **новая вкладка**, никакого ретранслятора
