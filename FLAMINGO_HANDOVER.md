# FLAMINGO — Документ передачи проекта (Handover)

**Последнее обновление:** 2026-07-23
**HEAD:** `c57f13236b8bd2cbae84ca3b59bc30fec0bdcde1` (`c57f132`) · **Ветка:** `chore/ertc-preview-launch-config` (⚠️ НЕ `main` — вся недавняя работа по CMF/reshape лежит здесь) · ~108 коммитов · working tree чист.

> **ЭТОТ ФАЙЛ ОБЯЗАТЕЛЬНО ПОДДЕРЖИВАТЬ В АКТУАЛЬНОМ СОСТОЯНИИ.** Обновляйте его при каждом значимом изменении: когда приземляется новый модуль, меняется инвариант, чинится известная проблема или сдвигается дорожная карта. Устаревший handover хуже отсутствующего.

> **СТАТУС ДЕПЛОЯ (2026-07-23).** Проект залит на GitHub **`ahmtgv/flamingo`** (ветка `main`; форс-перезаписал старый placeholder-прототип) и задеплоен на **Cloudflare Pages → flamingo.plus** (аккаунт Derposte; root `frontend`, `npm run build` → `dist`; авто-деплой при push в `main`). Сейчас это **дизайн-превью без бэкенда**: HTTPS отдаёт оболочку приложения в дизайне FLAMINGO AIR, но вход/данные не работают — нет развёрнутого API (Django+Postgres+LiveKit в Yandex Cloud, 152-ФЗ — деплой-пререквизит). На время тестов вход/регистрация отключены флагом сборки **`VITE_PREVIEW=1`** (Cloudflare env; boots authenticated, `bootstrapSession()` — убрать флаг перед реальным запуском). Push с Mac — токеном аккаунта `ahmtgv` (git закэширован как Ertconline). Полные детали — память проекта `flamingo-deployment`.

**Метод составления:** документ написан по фактическому коду этой ветки (source tree, `git log`, `CLAUDE.md`, `docs/handoff/SESSION_HANDOFF.md`, `docs/flamingo_erd.md`, `docs/flamingo_schema.graphql`), а не по продуктовым PDF/брифам. Всё, что не удалось проверить в коде, помечено как **[допущение]**. Тесты в среде составления запустить было нельзя (нет Postgres; `node_modules` собраны под другую платформу) — числа гейтов взяты из последнего верифицированного прогона и перепроверены статическим подсчётом (см. §10).

---

## 1. ОБЩЕЕ ОПИСАНИЕ

### 1.1 Ключевое разграничение: видение (A) vs построено (B)

Это самый важный раздел документа. В проекте существуют два слоя, которые нельзя смешивать:

**(A) ПРОДУКТОВОЕ ВИДЕНИЕ** (из `docs/Flamingo_Product_Brief_v1.md` и ранних документов) — долгосрочная амбиция: полный комплекс SEduM (CMF + Bioimef + UBP), блокчейн/NFT-верификация достижений, VR/AR, Open API для подключения научной инфраструктуры (лаборатории, обсерватории, дроны), кабинеты научных сотрудников / центры управления образованием, мобильные приложения (React Native). **Ничего из этого не построено.** Это roadmap, отложенный по плану итераций (бриф §5, таблица «Отложено»: блокчейн/NFT — итерация 4; VR/AR — 3; Open API — 2; полный CMF — параллельный R&D; научные кабинеты — 2–3; mobile — этап 5).

**(B) ЧТО ФАКТИЧЕСКИ ПОСТРОЕНО** (код на этой ветке) — работающий MVP-веб B2C-платформы онлайн-образования: auth с ролями, кабинеты, каталог/конструктор курсов, расписание и сессии занятий, домашние задания (TEXT + FILE), админ-модуль учреждений, файлы через presigned S3, видеокомнаты LiveKit (слайсы 1–3) и **SEduM в объёме «CMF on-device»**: внимание + суб-метрики (gaze/eyes/head/alertness), считаемые в браузере, с эгрессом только пер-бакетных агрегатов; суб-метрики — live-only, в БД хранится только `avg_attention`. Bioimef, полный UBP-цикл (калибровка + облачный бэкап в UI), блокчейн/NFT, VR/AR, Open API, научные центры и мобильные приложения — **НЕ построены** (deferred).

Если в любом другом документе проекта (A) читается как (B) — верить нужно коду и этому файлу.

**Ориентация проекта (зафиксировано владельцем, Адель, 2026-07-03):** разграничение (A)/(B) — про честный статус, а НЕ про пересмотр амбиции. (A) — это суть и цель проекта: всё, что строится в (B), направлено исключительно на реализацию проекта в изначально задуманном виде (полный SEduM, Open API, научная инфраструктура и далее по плану итераций). Запланирована серия R&D-сессий владельца с ИИ, по итогам которых дорожная карта, суть и структура проекта могут быть уточнены или изменены — после каждой такой сессии этот файл обновляется.

### 1.2 Назначение и модель

Flamingo — B2C-платформа онлайн-образования для России/СНГ: школьники 1–11 классов и взрослые слушатели, плюс родители, преподаватели и администраторы учреждений. Локаль MVP — `ru` (код i18n-ready с первого дня). Персональные данные — на серверах в РФ (152-ФЗ, Yandex Cloud); для несовершеннолетних — родительское согласие (`consent152fz` при регистрации). Роли: `student` / `parent` / `teacher` / `admin` (администратор учреждения) — enum `Role` в `backend/common/enums.py`.

Дифференциатор — **SEduM/CMF**: on-device-анализ внимания (MediaPipe в браузере) под жёстким инвариантом приватности «сырая биометрия никогда не покидает устройство».

Монетизация — **не выбрана** (открытый вопрос владельца: подписка vs комиссия vs freemium). Код построен «payment-ready», но никакой billing-логики нет.

### 1.3 Уровень готовности (честно)

Стадия: **работающий dev-MVP на localhost**; с 2026-07-23 задеплоен как **дизайн-превью на flamingo.plus** (оболочка без бэкенда — см. «Статус деплоя» вверху документа), реальных пользователей не было. Гейты зелёные на момент последней сессии (backend 84 pytest, frontend 107 vitest, ruff/black/eslint/build — см. §10).

- **Построено и проверено:** auth, кабинеты (родительский — функциональный; остальные — оболочки с профилем), курсы + конструктор (reorder/edit), расписание + жизненный цикл сессий, домашние задания (TEXT+FILE, оценивание), институции/админка, files/S3 (a–d), LiveKit-слайсы 1–3, SEduM CMF-пайплайн + монохромный live-UI (студенческая полоска + «поле класса» преподавателя). CMF верифицирован живьём с реальной камерой в `vite dev`; сетевой аудит подтвердил — уходят только агрегаты.
- **Построено, но не верифицировано в браузере:** загрузка файлов в браузере (2 известных бага, §6), мульти-оконная сетка ≤5, screen-share cross-window, reconnect при реальном обрыве сети, permission/device-ошибки, screen-reader-проход — всё это ждёт «owner real-run» (чек-лист в `SESSION_HANDOFF.md` §5).
- **Частично построено:** калибровка «база тест» (state machine `seedum/calibration.ts` есть и оттестирована, но в комнату не вшита), шифрованный облачный бэкап UBP (backend-мутации + WebCrypto-код есть, FE-wiring нет).
- **Не построено (но есть в SDL/ERD):** certificates (PDF+QR), engagement (баллы/лидерборд/отзывы), notifications, композитные дашборды (`studentDashboard` и т.п. — SDL-only), QUIZ-домашки, billing, email-верификация/SMTP. Плюс весь слой (A) из §1.1.

---

## 2. АРХИТЕКТУРА (только реально существующее)

### 2.1 Стек (проверено по коду)

- **Backend:** Python 3.12, Django 5 (`>=5.0,<5.2`), Strawberry GraphQL (`strawberry-graphql[django]` + `strawberry-graphql-django`), PostgreSQL 16 (`psycopg`), Django Channels (graphql-ws-подписки по WebSocket), ASGI/uvicorn, PyJWT (собственный JWT-auth), boto3 (S3). Тесты — pytest + moto.
- **Frontend:** TypeScript, React 18, Vite 6, Apollo Client (серверный state), Redux Toolkit (только UI-state), GraphQL Code Generator (типы из committed SDL), CSS Modules + `tokens.css`, i18next (`ru`), `@mediapipe/tasks-vision`, `livekit-client`, `idb`.
- **Хранилище объектов:** S3-совместимое — **MinIO нативно в dev** (`settings.S3` по умолчанию `http://localhost:9000`), **Yandex Object Storage в prod** (env-switch, регион `ru-central1`).
- **Dev-окружение — НАТИВНОЕ, без Docker/Kubernetes.** Postgres/uvicorn/vite/MinIO запускаются напрямую (Homebrew). `infra/docker-compose.yml` существует, но **не используется** (решение зафиксировано в `SESSION_HANDOFF.md` §6). Kubernetes нигде нет.
- **Neo4j — НЕ используется.** В коде нет ни следа (проверено grep). Графовая БД рекомендаций сознательно заменена на PostgreSQL (бриф §5, «Отложено»); рекомендации сейчас rule-based поверх `ATTENTION_METRIC`.
- **Celery — НЕ используется.** ⚠️ Нюанс: `celery>=5.3` и `redis>=5.0` числятся в `backend/requirements.txt`, и CLAUDE.md §3 упоминает Celery, но фактически: нет `config/celery.py`, нет `CELERY_*` в settings, нет ни одного импорта celery в коде — только комментарий в `apps/accounts/services.py` («email stubs, replaced by Celery email tasks» — т.е. письма сейчас заглушки). Это **мёртвые зависимости / устаревший фрагмент CLAUDE.md**; фоновых задач в проекте нет. Redis нужен только как опциональный channel layer (env `CHANNELS_REDIS_URL`); в dev — `InMemoryChannelLayer`.

**Чего НЕТ в проекте (проверено grep по backend/frontend):** libp2p, WebRTC-mesh/relay, TURN-серверов, PWA, Service Worker, Push-уведомлений, Capacitor, Android/iOS-кода — никаких следов. Единственная оговорка: **IndexedDB присутствует** — но не как offline/PWA-механизм, а как штатное on-device-хранилище UBP (`frontend/src/seedum/ubp.ts`, через `idb`); это ядро приватностной модели, а не след мобильной архитектуры.

### 2.2 Backend: как устроен

- `config/asgi.py` — `ProtocolTypeRouter`: HTTP → Django-приложение (через него проходит `JWTAuthMiddleware`), WebSocket → Strawberry `GraphQLWSConsumer` (graphql-ws). Единственный API-эндпоинт — `/graphql/` (HTTP + WS).
- `api/schema.py` — корневая схема: `Query` из 6 миксинов (Accounts/Courses/Scheduling/Homework/Institutions/Seedum), `Mutation` из 7 (те же + Files), `Subscription` = `SeedumSubscription` (`attentionUpdates` — единственная реализованная подписка; `sessionStatusChanged`/`chatMessageReceived`/`notificationReceived` есть только в SDL).
- **Тонкие резолверы + слой сервисов:** резолвер валидирует вход, проверяет права и делегирует в `apps/<x>/services.py`. Бизнес-логика и записи в БД — только в сервисах. **Авторизация — серверная, пер-резолверная/пер-филдовая**; клиентским ролям/id не доверяют, `studentId` всегда выводится из аутентифицированного пользователя.
- Общий фундамент: `common/models.py` (BaseModel: UUID PK, timestamps), `common/enums.py`, `common/auth.py` (JWT), `common/pagination.py` (курсорная), `common/storage.py` (единственный S3-клиент), `common/livekit.py` (чеканка room-токенов).
- Доступ к контенту курса — через единственный chokepoint `apps/courses/access.py: can_access_course(user, course)`: владелец / участник целевой группы учреждения / студент с ACTIVE-enrollment. Anonymous и unenrolled — отказ, даже если курс бесплатный. Цена НЕ определяет доступ; оплата — будущий АДДИТИВНЫЙ гейт (docstring в `access.py` перечисляет call sites, которые надо будет провести через него при появлении billing).

### 2.3 CMF on-device пайплайн (сердце проекта)

Весь путь — во `frontend/src/seedum/`:

1. `attention.ts` берёт кадры камеры (тот же `MediaStream`, что публикуется в LiveKit — одна `getUserMedia`-композиция) и шлёт их в **Web Worker** `mediapipe.worker.ts` (module worker; MediaPipe `FaceLandmarker`, WASM вендорён в `frontend/public/seedum/`, ~15 MB в репозитории). Кадры (`ImageBitmap`) закрываются немедленно после инференса.
2. Воркер локально считает производные скаляры: `metrics.ts` (gaze on-screen из blendshapes, EAR/моргания, эйлеровы углы головы, EMA, `AlertnessTracker`) и `score.ts` (`engagementScore`, gaze-primary). Все пороги — в `cmfConfig.ts` (**ПРЕДВАРИТЕЛЬНЫЕ, ждут тюнинга на реальной камере**).
3. `bucketing.ts` агрегирует в бакеты ~2.5 s (`BUCKET_MS` в cmfConfig) → из воркера выходит только пер-бакетный агрегат.
4. Студентский `onBucket` вызывает мутацию `reportAttention({sessionId, bucketStart, avgAttention, gazeOnScreen, eyeOpenness, headYaw, headPitch, alertness})` — **8 агрегатных скаляров, ничего больше** (тест-allowlist на бэкенде).
5. Backend `apps/seedum`: `report_attention` клампит значение, выводит `studentId` из auth-пользователя, публикует пейлоад в channel-группу `attention_<session>` и **сохраняет в `ATTENTION_METRIC` ТОЛЬКО `avg_attention`** — суб-метрики транслируются live, но не персистятся (модель не менялась, 0 миграций).
6. Подписка `attentionUpdates` (teacher-only, auth из graphql-ws `connection_params`) доставляет агрегаты преподавателю → монохромный «ClassField» (орбы вовлечённости) и студенческая `AttentionStrip`.

**Никакие сырые медиа не покидают устройство**: нет ни одного серверного эндпоинта, принимающего кадры/аудио/landmarks (закреплено тестами `apps/seedum/tests/test_privacy.py`: allowlist полей `AttentionInput`, скан схемы на запрещённые токены, «reportAttention — единственный attention-ingress»). Сетевой аудит браузера это подтверждал: только `POST /graphql/` и WS.

UBP — в IndexedDB (`ubp.ts`, AES-GCM/PBKDF2 через WebCrypto для опционального бэкапа; backend `backupUbp`/`ubpBackup` хранит только opaque blob + `keyHint`). Калибровка и бэкап **не вшиты в UI** (см. §5).

### 2.4 Видео (LiveKit)

`features/lesson/livekit/useLiveKitRoom.ts` + UI `VideoRoom/VideoTile/RoomControls`. Токен комнаты чеканит backend (`common/livekit.py`, `LessonSession.roomToken` через query `SessionRoom`); реальные креды — в git-ignored `backend/.env` / `frontend/.env` (`VITE_LIVEKIT_URL=wss://flamingo-atvyww1r.livekit.cloud`). Сейчас — **LiveKit Cloud free-tier (США)**; **до прода обязателен self-hosted OSS LiveKit в РФ** (152-ФЗ + принцип OSS) — это осознанный временный компромисс для MVP-разработки. Построено: 1:1 + группа ≤5 (soft-guard `roomFull`; жёсткий серверный cap НЕ построен), screen share (аддитивный трек — камера и CMF продолжают работать; экран в CMF не попадает), active-speaker, mute/camera-off-индикация, connection lifecycle + rejoin (CMF переживает reconnect), permission/device-ошибки, a11y. Записи (Egress) нет.

Ключевая композиция: **один** `getUserMedia({video,audio})` → и в LiveKit-publish, и в CMF-пайплайн. Тумблер камеры переключает `track.enabled=false` (пауза publish и CMF одновременно), а не останавливает трек.

### 2.5 Файлы / S3

`common/storage.py` — единственный S3-клиент (`presign_put` с подписанным Content-Type, TTL 10 мин; `presign_get`, TTL 5 мин; `head`). `apps/files` — **безмодельный** (Option A): `requestUpload` = ролевой гейт по purpose (`PURPOSE_POLICY`) + **owner-namespaced ключи** `<prefix>/<userId>/<uuid>/<file>` + лимиты размера/типа. Байты файлов НИКОГДА не идут через GraphQL — клиент делает PUT напрямую по presigned URL. Привязка ключа (`submit_homework`, `add_material`, `setAvatar`) проверяет: ключ в namespace вызывающего + `head()` (существует/размер/тип). Скачивание — presigned GET за пер-резолверной авторизацией каждого `fileUrl` (домашка — студент-автор или преподаватель-владелец, никогда одноклассник; материалы — через `can_access_course`; аватар — любой аутентифицированный). Заглушки (не presign'ят): `VerificationDocument.fileUrl`, `Course.coverUrl`, `Institution.logoUrl`.

### 2.6 Данные и приватность/152-ФЗ

PostgreSQL 16 — единственная серверная БД. Модели 1:1 с `docs/flamingo_erd.md` (реализованы домены: identity/institutions/courses/scheduling/homework/seedum; engagement и notifications — только в ERD/SDL). UUID PK везде. Приватностная модель: сервер хранит только `avg_attention`-агрегаты, opaque UBP-блоб и обычные учебные данные; PII — в РФ (prod: Yandex Cloud; **[допущение]** — прод-инфраструктура ещё не разворачивалась, это план, а не факт). Найденная и закрытая PII-дыра описана в §7.

---

## 3. СТРУКТУРА РЕПОЗИТОРИЯ

```
flamingo/
  CLAUDE.md                  # контракт для ИИ-разработки (частично устарел: Celery/Docker — см. §2.1)
  backend/
    config/                  # settings.py (env-switch: channels/S3/LiveKit), settings_test.py (sqlite),
                             # asgi.py (ProtocolTypeRouter HTTP+WS) — ВХОДНАЯ ТОЧКА, urls.py
    api/schema.py            # корневая GraphQL-схема (Query/Mutation/Subscription) — ВХОДНАЯ ТОЧКА API
    common/                  # BaseModel, enums, auth (JWT), pagination, storage (S3), livekit, exceptions
    apps/
      accounts/              # User, *Profile, Guardianship, VerificationDocument; JWT-auth; аватары
      courses/               # Course/Section/Lesson/Material/Enrollment; access.py — chokepoint доступа
      scheduling/            # LessonSession/Attendance; LiveKit-токены; lifecycle
      homework/              # Homework/Submission/SubmissionFile; оценивание
      institutions/          # Institution/Membership/Group/GroupMembership/GroupTeacher
      files/                 # безмодельный: requestUpload + PURPOSE_POLICY
      seedum/                # AttentionMetric/UbpBackup/Recommendation; reportAttention; attentionUpdates
    manage.py  pytest.ini  requirements.txt  pyproject.toml (ruff/black, line 100)
  frontend/
    src/
      main.tsx               # ВХОДНАЯ ТОЧКА (загружает tokens.css → App)
      app/                   # store, apolloClient (split link: HTTP+refresh / graphql-ws), router, providers
      shared/                # ui/ (дизайн-система), styles/tokens.css, lib/ (env, session, refresh, useUpload)
      entities/graphql/      # generated.ts — типы из codegen (КОММИТИТСЯ)
      features/              # auth, cabinet, courses, schedule, homework, admin, lesson (live-комната)
      seedum/                # CMF: mediapipe.worker.ts, attention, metrics, score, bucketing,
                             # cmfConfig (ВСЕ пороги), calibration, ubp, headTolerance, ui/
      i18n/                  # ru-неймспейсы: common,auth,cabinet,courses,schedule,homework,admin,seedum,lesson
    public/seedum/           # вендорённые WASM+модель MediaPipe (~15 MB; npm run vendor:seedum)
    vite.config.ts           # /graphql-прокси (ws:true), module worker, dev-мидлварь для /seedum/wasm/*
    codegen.ts               # читает docs/flamingo_schema.graphql (НЕ живую схему)
  docs/
    flamingo_erd.md          # модель данных (ground truth)
    flamingo_schema.graphql  # SDL-КОНТРАКТ — поддерживается ВРУЧНУЮ, не регенерируется
    flamingo_architecture.md / Flamingo_Product_Brief_v1.md / UX / DesignSystem / Brandbook
    handoff/SESSION_HANDOFF.md  # детальный сессионный журнал (главный оперативный документ)
    handoff/{INSTITUTIONS_PLAN,SEDUM_LITE_PLAN}.md
  infra/docker-compose.yml   # существует, НЕ используется (dev — нативный)
  landing/index.html         # статический лендинг
  design-assets/  skills/official-documents/
```

Маршруты SPA: `/login`, `/register(/:role)`, `/reset`, `/reset-password`, `/app` (кабинет), `/courses(/new|/:id)`, `/schedule`, `/homework`, `/admin`, `/lessons/:lessonId/homework`, `/sessions/:sessionId/room` (live-комната).

---

## 4. РЕАЛИЗОВАННЫЕ МОДУЛИ

Для каждого: назначение / готовность / ограничения. Коммиты — из `git log` этой ветки.

**Auth (`apps/accounts` + `features/auth`)** — регистрация по ролям с 152-ФЗ-согласием, login/reset, JWT (access в памяти, refresh в `localStorage`, silent refresh). Готово и покрыто тестами (`9a98e77`, `e6f54f7`). Ограничения: регистрация авто-логинит **без верификации email** (письма — заглушки, SMTP нет); refresh в `localStorage` (не httpOnly-cookie) — осознанный MVP-компромисс **[допущение: осознанный — прямой записи решения нет, но паттерн реализован последовательно]**; вопрос «junior-регистрация через email родителя vs `addChild`» открыт у владельца.

**Кабинеты (`features/cabinet`)** — ролевые кабинеты (`2292513`): родительский функционален (просмотр/добавление детей с согласием), student/teacher/admin — профиль + честные empty-states. Аватары работают (`b9a3635`).

**Курсы + конструктор (`apps/courses`, `features/courses`)** — каталог/деталка/enroll, полный CRUD конструктора с reorder и edit (`10ce430`, `7bea480`, `725f2de`, `80c561b`). Материалы TEXT/LINK/FILE. Ограничения: `Course.coverUrl` — заглушка; `Course.rating`/`review_count` — стабы до engagement-модуля.

**Enrollment-гейт доступа (`courses/access.py`)** — единственный chokepoint контент-доступа; исправлен с «бесплатное = открыто всем» на enrollment-based (`c445478`, критично — см. §7). Payment-ready симы: `Course.price/currency`, `Enrollment.access_status` (`be3c759`).

**Расписание/сессии (`apps/scheduling`, `features/schedule`)** — LessonSession lifecycle (schedule/start/end/join), attendance, ролевой `mySchedule`, LiveKit-токены (`47bfae6`, `17c5b6a`). Ограничения: `join_session` расходится с `can_access_course` (§6.3); attendance-roster после фикса `b2782ba` виден только владельцу курса.

**Домашние задания (`apps/homework`, `features/homework`)** — создание/публикация/сдача/оценивание, TEXT (`ec3d638`+`1fdacf8`, E2E-верифицировано в браузере) и FILE-сдачи через presigned upload (`981dbfd`). Ограничения: QUIZ не построен (нет модели вопросов); UI редактирования домашки после публикации отложен; браузерная загрузка файлов — известный баг (§6.1).

**Институции/админка (`apps/institutions`, `features/admin`)** — модуль полный (a+b+c: `17dcfcd`, `5f12481`/`ed580af`, `628e786`+`15b5732`, guard `5531bc0`): учреждение, membership с инвайтами, группы/участники/преподаватели, cross-app FK (`Course.institution/group`, `LessonSession.group`, `Homework.group`), групповой доступ внутри `can_access_course`. Ограничения: branding хранится, но не применяется; onboarding учреждения — staff-only (нет самосервиса); reviews отложены в будущий engagement.

**Files/S3 (`apps/files`, `shared/lib/useUpload`)** — все 4 суб-слайса (`e51d3eb`, `981dbfd`, `cab81de`, `b9a3635`), E2E против нативного MinIO (unit/integration). Ограничения: браузерный путь не верифицирован (§6.1), orphan-объекты (§6.2), три `fileUrl`-заглушки.

**LiveKit-комнаты, слайсы 1–3 (`features/lesson`)** — слайс 1: 1:1 + shared-camera композиция (`32c61da`; dev-фиксы CMF-воркера `21812ef`, reconnect-churn `c9334d3`); слайс 2: группа ≤5 + screen share (`de9e60f`; регрессии починены `7686a9c`, `3367f6b`, `890bf35`); слайс 3: connection lifecycle (`404fc6f`), permission/device-ошибки (`47d9e60`), a11y (`3d4fea2`), remote mute/cam-off (`4af95f3`). Ограничения: всё медиа/сетевое/SR-поведение проверено только vitest'ом и синтетически — **комбинированный real-run владельца не выполнен**; жёсткого серверного cap ≤5 нет; записи нет; LiveKit Cloud → self-host до прода.

**SEduM CMF + монохромный UI (`seedum/`, `features/lesson`)** — data-слой: gaze-primary engagement + суб-метрики, каденс 2.5 s (`0cd20e6`), эгресс суб-метрик как live-only агрегатов (`060ed89` — приватностно-чувствительный слайс, покрыт guard-тестами); UI-reshape для инвестор-демо: студенческая AttentionStrip (`86cf206`), «поле класса» с графитовыми орбами (`d5050ee`), click-to-expand суб-метрик (`548999b`) — вытеснил карточный UI суб-слайсов 3/4 (`600ea98`, `b2b5a01` — оставлены в истории). Пер-студентный teacher-view с именами (`85ed82a`). CMF браузерно верифицирован с реальной камерой. Ограничения: все пороги `cmfConfig.ts` предварительные; калибровка/UBP-бэкап не вшиты; look/feel на реальной камере не проверен владельцем.

---

## 5. НЕЗАВЕРШЁННОЕ

По каждому пункту: что осталось / почему не сделано / риски / рекомендуемый порядок.

1. **Комбинированный real-camera/real-network проход владельца** (чек-лист a–g в `SESSION_HANDOFF.md` §5.1). Не сделан, потому что превью-браузер сессий разработки блокирует камеру/`getDisplayMedia`, а программный `track.stop()` не эмитит `'ended'`. Риск: медиа-поведение слайсов 2–3 может иметь невидимые в моках дефекты. **Делать первым** — дешёво и разблокирует уверенность во всём видео-стеке.
2. **Браузерная загрузка файлов** — два бага (§6.1), прайм-подозреваемый CORS dev-MinIO. Не сделано: обнаружено в конце браузерного прохода 2026-06-17, отложено с фиксацией. Риск: FILE-домашки и материалы не работают для реального пользователя. **Второй приоритет.**
3. **Аудит field-резолверов на unscoped `list(self.X.all())`** — бэклог после фикса `b2782ba`. Кандидаты: детские списки course/section/lesson, memberships/groups, submissions. Риск: утечки PII, аналогичные attendance-дыре. **Третий приоритет (security).**
4. **«Prepare for real-user test»**: туннель/деплой, реальный SMTP + верификация email, прогон регистрации с нуля, решение junior-signup. Ничего не начато. Риск: без email-верификации нельзя пускать посторонних.
5. **Калибровка «база тест» + UBP-бэкап wiring**: воркеру нужен calibration-mode, эмитящий пер-стадийные `AttentionSignals` (сейчас он отдаёт только score/bucket), + 3-шаговый UI + FE-опы бэкапа. Отложено осознанно (план SEduM Lite §6). Риск: без базовой линии scoring работает на сырых значениях.
6. **Тюнинг порогов `cmfConfig.ts`** на реальной камере (в т.ч. `liveAttentionAlertBelow=50`). UI переживёт ретюн без переделки (читает конфиг).
7. **Cross-cutting модули из SDL/ERD:** certificates (PDF+QR, скилл `official-documents`), notifications (инфра graphql-ws уже работает), engagement (баллы/лидерборд/reviews), композитные дашборды, QUIZ. Не начаты — ниже по ценности, чем стабилизация построенного.
8. **Billing** — заблокирован решением о монетизации (владелец). Строить только после выбора модели; симы готовы.
9. **LiveKit self-host в РФ** — деплой-пререквизит (см. §6.4).
10. **Слой (A):** Bioimef, blockchain/NFT, VR/AR, Open API, научные кабинеты, mobile — по плану итераций, не раньше стабилизации веба (см. §9).

---

## 6. ИЗВЕСТНЫЕ ПРОБЛЕМЫ (не скрывать, не смягчать)

1. **🐞 Две браузерные ошибки загрузки файлов** (браузерный проход 2026-06-17, зафиксированы в `SESSION_HANDOFF.md` §5-чеклист A): (а) студент не может прикрепить файл к сдаче домашки — загрузка/сабмит не завершается; (б) преподаватель не может прикрепить FILE-материал (`MaterialForm` → `useUpload('MATERIAL')` → `addMaterial`). Юнит-тесты зелёные; подозреваемые: CORS на dev-MinIO (raw `fetch` PUT на `:9000` — прайм-подозреваемый), связка `useUpload`→мутация, молча проглоченная ошибка. Для прода дополнительно: CORS-политика бакета Yandex Object Storage — деплой-пререквизит.
2. **Orphan-объекты в S3:** presigned PUT не может ограничить размер до загрузки — `head()` отклоняет при привязке, но байты уже в бакете. Никакого GC/lifecycle-правила для непривязанных объектов нет. При злоупотреблениях — рост стоимости хранения. Решения: bucket lifecycle rule на unbound-префиксы, либо presigned POST с `content-length-range`.
3. **Расхождение `join_session` vs ACTIVE-enrollment (укусит при billing):** `scheduling/services.py::_enrollment` ищет `Enrollment.objects.filter(student, course)` **без** фильтра `access_status=ACTIVE` и не проходит через `can_access_course`. Сегодня безвредно (все enrollments ACTIVE), но при billing студент с `pending_payment` сможет войти в live-занятие, хотя контент-доступ ему закрыт. **Дополнительная находка этого аудита:** `join_session` также не учитывает институциональную групповую доставку — студент группы без личного enrollment получит доступ к материалам через `can_access_course`, но НЕ сможет войти в сессию (PermissionDenied) и не получит attendance-строку. Обе ветки надо унифицировать через chokepoint.
4. **LiveKit Cloud (США, free-tier) в dev** — конфликтует со 152-ФЗ (медиа-трафик реальных пользователей) и OSS-принципом. До любого реального пользователя из РФ — self-hosted OSS LiveKit в РФ. Зафиксировано как осознанный временный компромисс.
5. **Пороги CMF предварительные:** все константы `cmfConfig.ts` (15° head tolerance, EAR, gaze span, blink rates, EMA, `liveAttentionAlertBelow`) — первые прикидки без тюнинга на реальной камере. Числам внимания в UI пока нельзя придавать диагностический вес.
6. **SDL User/UserType drift (задокументированный):** живые имена типов accounts — с суффиксом `*Type` (`UserType` в `apps/accounts/graphql/types.py`), в SDL — `User`. Остальные приложения совпадают с SDL. Обходится fragment-free-операциями FE. Именно поэтому **запрещён** `export_schema` (§8.2).
7. **Незакрытый резолвер-аудит** (§5.3) — потенциальные PII-утечки класса attendance-дыры не исключены.
8. **Нет email-верификации/SMTP** — регистрация авто-логинит кого угодно; блокер real-user-теста.
9. **Расхождение счётчиков vitest:** последний верифицированный прогон — 107; статический подсчёт `it()/test()` сегодня — 105 (см. §10). Скорее всего, динамические кейсы; **[не проверено]** — прогнать `npm test` на машине владельца и сверить.
10. **CLAUDE.md частично устарел** относительно кода: упоминает Celery, docker compose как dev-путь и `config/celery.py` (нет в природе), приложения `engagement/certificates/notifications` в layout (не построены). Ground truth по этим пунктам — код и данный файл.
11. **Мелочи:** demo-строки в dev-БД (аккаунты `cmf.*@flamingo.dev` и др.); `.DS_Store` в корне репо; жёсткий `≤5`-cap только клиентский (6-й отключается soft-guard'ом, сервер не запрещает).

---

## 7. ПРОВЕДЁННЫЕ ПРОВЕРКИ / АУДИТЫ

**Формальный полный аудит (security/pentest/юридический по 152-ФЗ) НЕ проводился** — говорим это прямо. Что реально было:

**Исправлено по итогам точечных проверок:**
- **`c445478` — can_access_course chokepoint:** был `if price is None: return True` — ЛЮБОЙ пользователь (включая анонима) получал контент любого бесплатного курса, т.е. всех курсов MVP. Исправлено на enrollment-based; перед фиксом проаудированы все call sites (все — контент-доступ; discovery не через него). Один тест переписан под корректную модель.
- **`b2782ba` — attendance PII-дыра (152-ФЗ, несовершеннолетние):** field-резолвер `LessonSession.attendance` был unscoped (`list(self.attendances.all())`) при том, что `get_session` пускает любого участника — любой записанный студент мог перечислить ФИО одноклассников. Теперь ростер отдаётся только владельцу курса, остальным `[]`; покрыто тестами.
- **`b666fa4` — утечка ролевого текста** (преподаватель видел студенческий live-бейдж) — мелкая, но того же класса «чужой контекст».
- **CMF privacy-инвариант — верифицирован многослойно:** тесты `test_privacy.py` (allowlist 8 агрегатных скаляров в `AttentionInput`; скан всей схемы на запрещённые токены; единственность attention-ingress) + тест «суб-метрики транслируются, но не персистятся» + браузерный сетевой аудит (только `/graphql/` HTTP+WS, ни одного запроса с кадрами) + адверсариальные ревью каждого reshape-слайса (privacy/tokens/i18n/thresholds/a11y) с 0 подтверждённых находок.
- Каждый слайс проходил гейты: pytest + ruff + black + `makemigrations --check`; build + eslint + vitest.

**Остаётся в бэклоге (НЕ сделано):** системный своп field-резолверов на unscoped-паттерн (§5.3); браузерная верификация загрузок; real-run чек-лист a–g; независимый security-аудит перед продом; юридическая проверка контура 152-ФЗ (согласия, локализация, оператор ПДн) — **[не начато]**.

---

## 8. РЕШЕНИЯ, КОТОРЫЕ НЕЛЬЗЯ МЕНЯТЬ БЕЗ ВЕСКИХ ПРИЧИН

1. **Privacy-инвариант CMF (главный):** сырые кадры/аудио/landmarks/пер-фреймовые фичи НИКОГДА не покидают устройство; эгресс — только пер-бакетные агрегаты (8 скаляров); БД хранит только `avg_attention`; суб-метрики live-only; ни одного серверного эндпоинта под сырые медиа; `studentId` — из auth, не из инпута. *Почему:* это продуктовый дифференциатор, юридическая позиция (152-ФЗ, биометрия несовершеннолетних) и обещание пользователю. *Альтернатива* (серверный анализ — проще, точнее модели) отвергнута в брифе как ломающая принцип «нода пользователя». Любое изменение — только с владельцем, с обновлением guard-тестов.
2. **SDL (`docs/flamingo_schema.graphql`) поддерживается ВРУЧНУЮ, никогда не регенерируется.** `export_schema` затирает контракт `*Type`-срезом accounts (drift §6.6). Новые поля — точечные hand-add с diff живой схемы против SDL. *Альтернатива* (code-first генерация) потребует сначала выровнять имена accounts-типов — осознанно отложено.
3. **Доступ — enrollment-based, НЕ price-based; billing — будущий АДДИТИВНЫЙ гейт** в единственном chokepoint `can_access_course`. *Почему:* цена не является моделью доступа; разбросанные проверки по резолверам уже привели к багу `c445478`. *Альтернатива* (проверки в каждом резолвере) отвергнута — дрейфует.
4. **OSS-only.** Принцип брифа §6; вся цепочка (Django/Strawberry/Postgres/React/MediaPipe/LiveKit/MinIO) ему соответствует. Единственное текущее отступление — LiveKit **Cloud** как временный dev-хостинг того же OSS-стека; закрывается self-host'ом (§6.4).
5. **Design tokens, не литералы.** Все цвета/размеры — семантические токены `tokens.css`; известные исключения (frosted-blur, breathing-duration) явно зафлагованы в handoff. *Почему:* возрастная адаптация (`data-mode="kids"`) и тёмная/светлая согласованность каскадируются токенами. **Обновление 2026-07-03:** визуальный язык сменён решением владельца с «тёплого графита» на **«Flamingo Air»** (холодный нейтрал, SF/Inter + JetBrains Mono, hairline-минимализм; см. `docs/Flamingo_Redesign_Prompt_v2.md` + превью `docs/design-previews/flamingo_air_preview.html`); токенная АРХИТЕКТУРА и все имена токенов не менялись — заменены только значения в `tokens.css` (+ шрифты в `frontend/index.html`). Продуктовый принцип брифа «тёплый фон для долгого чтения» сознательно пересмотрен владельцем. Fonts: TODO вендорить Inter/JetBrains Mono в repo до прода. Дальше по плану v2: primitives → экранные композиции.
6. **Тонкие резолверы + сервисный слой + пер-резолверная авторизация.** Логика в `services.py`; каждый филд, отдающий связанные строки, обязан сам проверять права (урок `b2782ba`: object-level-достижимость — НЕ гейт).
7. **i18n с первого дня** — ни одной hardcoded UI-строки; `ru` — единственная локаль, но код не должен это предполагать.
8. **`track.enabled=false` для тумблера камеры** (не `stop()`): пауза publish и CMF синхронно, без пересоздания композиции; `stop()` рвёт shared-stream и убивает CMF-пайплайн (класс регрессий `7686a9c`).
9. Также не пересматривать без причины: module-worker + вендорённый WASM для MediaPipe (классический воркер молча умирает в `vite dev` — задокументированный root cause `21812ef`); один стабильный `.tiles`-контейнер без remount'ов `<video>`; same-origin `/graphql` через Vite-прокси; `enumsAsTypes` в codegen; нативный dev-стек.

---

## 9. ДОРОЖНАЯ КАРТА

**CRITICAL (блокирует уверенность в уже построенном / первый деплой):**
1. Owner real-run a–g (видео/медиа/сеть/SR) — единственный способ верифицировать слайсы 2–3.
2. Фикс браузерных загрузок (CORS MinIO → затем prod-CORS бакета).
3. Security-своп field-резолверов (класс `b2782ba`).
4. Унификация `join_session` через `can_access_course` (+ ACTIVE-фильтр, + групповая доставка) — до billing.
5. SMTP + email-верификация + прогон регистрации — до любого постороннего пользователя.
6. LiveKit self-hosted OSS в РФ — до прода (152-ФЗ).

*Обоснование порядка:* сначала подтверждаем/чиним то, что уже считается «готовым» (дешевле всего сейчас), затем закрываем безопасность, затем снимаем деплой-блокеры.

**HIGH (путь к real-user-тесту и полноте MVP):**
7. Туннель/деплой dev-стека; 8. Калибровка «база тест» + UBP-бэкап wiring; 9. Тюнинг `cmfConfig` на реальной камере; 10. Certificates (PDF+QR); 11. Notifications (инфра WS готова); 12. Жёсткий серверный cap ≤5; 13. Orphan-GC lifecycle-правило.

**MEDIUM (после стабилизации):**
14. Engagement (баллы/лидерборд/reviews — REVIEW живёт здесь по INSTITUTIONS_PLAN); 15. Композитные дашборды (SDL-only сейчас); 16. QUIZ-домашки (нужна модель вопросов); 17. Billing — ТОЛЬКО после решения о монетизации (симы готовы, YooKassa/копейки/54-ФЗ — по CLAUDE.md); 18. Записи занятий (LiveKit Egress); 19. Чистка requirements от celery/redis либо осознанное включение фоновых задач (digest-письма, PDF-генерация).

**LOW / ВИДЕНИЕ (A) — не построено, реалистичные горизонты по плану итераций брифа:**
20. Open API (лаборатории/обсерватории/дроны) — итерация 2; 21. Neo4j-класс рекомендаций — заменён PostgreSQL, возвращаться только при доказанной необходимости; 22. Кабинет научного сотрудника / центр управления образованием — итерации 2–3; 23. VR/AR + глубокая геймификация — итерация 3; 24. Blockchain/NFT-верификация — итерация 4 (мост уже заложен: PDF+QR, UUID PK); 25. Мобильные приложения React Native (+ мост к Bioimef через носимые устройства) — этап 5, после стабилизации API; 26. Полный SEduM (Bioimef, глубокий R&D биометрии) — параллельный R&D-трек. **Всё в этом блоке — roadmap, а не код.**

---

## 10. PRODUCTION READINESS (по осям, честно)

Итог: **к продакшену НЕ готов**; готов к управляемому real-user-тесту после Critical-пунктов 1–5.

- **Стабильность:** dev-стабильно; известные регрессии видео починены и покрыты тестами, но реальный медиа-прогон не выполнен. Uptime/мониторинга/алертинга — нет вообще.
- **Безопасность:** сильные места — пер-резолверная авторизация, JWT, owner-namespaced ключи, privacy-guard-тесты, два закрытых инцидента (§7). Дыры: незакрытый резолвер-аудит, нет верификации email, нет rate-limiting **[допущение: не найден в коде]**, refresh-токен в `localStorage`, секреты только через env (ок), независимого аудита не было.
- **Производительность:** не измерялась вовсе. Нагрузочных тестов нет. Кандидаты в проблемы: N+1 в GraphQL-списках **[допущение]**, InMemory channel layer — однопроцессный.
- **Масштабируемость:** один uvicorn + один Postgres; горизонтальное масштабирование WS требует Redis channel layer (env-переключатель готов, не проверен). CMF масштабируется идеально (вычисления на клиентах). LiveKit free-tier — лимиты облака.
- **Архитектура:** сильная сторона проекта — последовательные слои (тонкие резолверы/сервисы/chokepoint), задокументированные инварианты, дисциплина handoff-журнала.
- **Тестируемость:** последний верифицированный гейт — **84 pytest / 107 vitest** (SESSION_HANDOFF §0, прогон 2026-06-18). Статическая перепроверка этого аудита: 84 `def test_` в `backend/apps/**` (совпадает); 105 деклараций `it()/test()` во frontend (расхождение с 107 — см. §6.9; в этой среде vitest не запускается из-за платформенных бинарей node_modules). Покрытие: модели/сервисы/границы прав/privacy-инвариант + критические FE-компоненты. E2E-фреймворка (Playwright и т.п.) нет.
- **Сопровождаемость:** высокая — CLAUDE.md-контракт, SESSION_HANDOFF, conventional commits по одному concern'у, ruff/black/eslint/prettier, типизация без `any`. Минус: часть знаний живёт в handoff-журнале, а не в коде.
- **Release-готовность:** нулевая инфраструктура — нет CI/CD, нет staging, нет прод-конфигурации, нет бэкапов БД, нет миграционной стратегии деплоя, лендинг не развёрнут **[допущение по последнему пункту]**.

---

## 11. РЕКОМЕНДАЦИИ ДЛЯ СЛЕДУЮЩЕГО ИИ

**Особая осторожность:**
- **CMF privacy-путь** (`seedum/` FE + `apps/seedum`): перед ЛЮБЫМ изменением перечитать CLAUDE.md §2.1/§7 и `test_privacy.py`. Любое новое поле в эгрессе — только агрегатный скаляр, с обновлением allowlist-теста и явным решением «персистить или live-only». Никогда не добавлять серверный приём медиа.
- **Пер-резолверная авторизация:** каждый новый field-резолвер со связанными строками — сразу спрашивай «кто имеет право это видеть?» и пиши permission-тест. Не полагаться на достижимость родительского объекта.
- **SDL-дисциплина:** никогда `export_schema`; hand-add + diff; после изменения — `npm run codegen` (генерённый файл коммитится).
- **Ловушки, где легко ошибиться:** classic vs module worker (vite dev); `track.stop()` vs `enabled=false`; remount `<video>` при смене layout; Strawberry и `from`-аргументы (`8e1e930`); cross-app import-циклы (`strawberry.lazy`, `628e786`); uvicorn требует рестарта после новых приложений; Postgres без `LC_ALL` не стартует.

**НЕ переписывать без причины:** `can_access_course` (расширять внутри, не обходить); `common/storage.py` (единственный S3-клиент); `useLiveKitRoom`/`VideoRoom` (каждая странность — задокументированный фикс регрессии); монохромный SEduM-UI (принят владельцем для инвестор-демо); хэндмейд-SDL.

**Наибольшая ценность за усилие:** Critical-список §9 (особенно real-run и загрузки — там либо всё работает, либо два конкретных бага); затем SMTP/деплой — проект впервые встретится с реальным пользователем.

**Принципы:** ground truth — код + этот файл + SESSION_HANDOFF (не продуктовые PDF); гейты зелёные перед каждым коммитом; conventional commits по одному concern'у; видение (A) не просачивается в код раньше своей итерации; всё неверифицированное помечать честно — эта дисциплина и есть причина, почему проект в хорошем состоянии; **обновлять этот handover** при каждом значимом изменении.
