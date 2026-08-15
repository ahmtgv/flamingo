# СТАТИЧЕСКИЙ АУДИТ — прогон ревьюера, 15.08.2026

Половина промпта 19, которую можно сделать без рук на экране. Прогнана ревьюером, чтобы
исполнитель не искал заново, а **проверял и чинил найденное**.

⚠️ **Что здесь НЕ проверено:** всё, что требует нажатия — очередь А промпта 19 целиком.
Статический разбор не видит мёртвых кнопок, и именно они стоили нам 15 августа четырёх часов.

---

## 1. 🔴 `target/` не закрыт в `.gitignore`

```
dist          да
target        🔴 НЕТ
.venv         да
node_modules  да
.env          да
```

Каталог сборки Rust не исключён. Сейчас в индексе артефактов нет (`git ls-files` по
`dist|target|node_modules|.venv` → **0**), то есть беды не случилось. Но одна невнимательная
`git add -A` в `desktop/` затащит в историю сотни мегабайт, и вычищать их придётся
переписыванием истории.

**Чинить первым делом, это одна строка.**

---

## 2. 🔴 Форма тестов: 41 против 6

| Как написан тест | Файлов |
|---|---|
| дёргает сервис напрямую | **41** |
| ходит через GraphQL (`schema.execute`, `client.post`) | **6** |

Это **тот самый разрыв, сквозь который прошёл дефект машинного ключа**: 588 зелёных тестов
не заметили, что мастеру нечем предъявить ключ, потому что вызывали сервисы в обход сетевого
слоя — а сломан был именно он (заголовок запроса).

Не «дописать тестов». Требуется, чтобы у **каждого сценария, который проходит человек**,
был хотя бы один тест через настоящий транспорт: заголовок, аутентификация, сериализация.
Тест сервиса проверяет логику, тест через GraphQL — что до логики вообще доходит.

**Задача:** для каждого пользовательского сценария назвать тест «через сеть» или завести его.
Список сценариев — из очереди А промпта 19.

---

## 3. Ключи i18n без ссылок — 42 кандидата

Из **1421** базового ключа (без множественных форм) не нашлось ссылок на 42.

| Файл | Ключи |
|---|---|
| `desktop` (11) | `act.copyLink`, `act.whatMeans`, `settings.data.exportBtn`, `settings.link.remeasure`, `setup.check.pickAnother`, `setup.check.testSound`, `setup.consents.pdLink`, `setup.consents.speechLink`, `setup.done.createLessonHint`, `setup.done.inviteHint`, `setup.done.openCabinetHint` |
| `subject` (7) | `chat.soonBody`, `chat.soonTitle`, `edit.newLesson`, `materials.allMine`, `materials.myNote`, `materials.savedFrom`, `quiet.shareSoon` |
| `start` (5) | `nav.chatSoonBody`, `nav.chatSoonTitle`, `nav.openChat`, `progress.ofCourse`, `week.openDay` |
| `room` (3) | `chatSoon`, `dictSoon`, `projector.focusOff` |
| `seedum` (3) | `calibration.nextStep`, `room.calibrating`, `room.enableCamera` |
| `auth` (2) | `hints.parentManaged`, `register.consentRequired` |
| `courses` (2) | `detail.draftNote`, `manage.editCourse` |
| `meeting` (2) | `arrival.replacedAsk`, `invite.remind` |
| `upload` (2) | `fileTooLarge`, `fileTypeNotAllowed` |
| по одному | `board.zoomReset`, `cabinet.teacher.subSpecialty`, `chat.teacher.noReports`, `common.app.tagline`, `exercises.handInFailed` |

⚠️ **Это кандидаты, а не приговор.** Проверено вычитанием множественных форм (`_one/_few/_many`)
и склеиваемых на лету префиксов (`invite.modes.${mode}`, `verification.action.${row.action}`
и ещё двенадцати). Первый прогон дал 213 «мёртвых» ключей, из которых почти все оказались
живыми — поэтому **каждый ключ удаляется с доказательством**, а не списком.

**И половина из них — не мусор, а вопрос.** Строки `*.soon*`, `fileTooLarge`,
`fileTypeNotAllowed`, `handInFailed`, `register.consentRequired` выглядят как **написанные
для сообщений, которые экран не показывает**. Тогда это не лишний ключ, а **молчащий отказ** —
ровно тот дефект, что мы чинили весь день. Прежде чем удалять, проверить: может, текст есть,
а показать его забыли.

---

## 4. Дрейф SDL — 18 операций впереди кода

SDL: **73** запроса, **115** мутаций, **10** подписок. Без резолвера в коде:

`teacherReviews` · `studentDashboard` · `adminDashboard` · `parentChildren` ·
`parentChildOverview` · `groupAnalytics` · `certificate` · `verifyCertificate` ·
`notifications` · `notificationPreferences` · `issueCertificate` · `createReview` ·
`moderateReview` · `markNotificationRead` · `markAllNotificationsRead` ·
`updateNotificationPreference` · `sessionStatusChanged` · `notificationReceived`

Большинство — **намеренный задел** (CLAUDE.md: SDL ведёт живую схему; `engagement`,
`certificates`, `notifications` перечислены как ещё не построенные). Дефектом это не является.

⚠️ Но две строки стоит проверить отдельно: `sessionStatusChanged` названа в CLAUDE.md §5
среди **работающих** подписок, а резолвера нет. Либо документ устарел, либо подписка потерялась.
Проверить и привести в согласие.

---

## 5. Крупные файлы в репозитории — вопрос владельцу

| Файл | Размер |
|---|---|
| `frontend/public/seedum/wasm/vision_wasm_module_internal.wasm` | 10,9 МБ |
| `frontend/public/seedum/models/face_landmarker.task` | 3,6 МБ |
| `frontend/src/entities/graphql/generated.ts` | 448 КБ |

MediaPipe вместе весит около 14,5 МБ и лежит в git. Это осознанный выбор — модель работает
на устройстве, и тянуть её из чужой сети при каждом уроке было бы хуже. Но это **половина
веса репозитория**, и решение стоит подтвердить, а не унаследовать молча.

`generated.ts` — вывод кодогенерации в git. Обычно его не хранят, но у нас он даёт
воспроизводимую сборку без обязательного `codegen`. Тоже решение, а не случайность.

**Ничего не трогать без ответа владельца.**

---

## 6. Метки долга в коде — 30 мест

`TODO`, `FIXME`, `TEMPORARY`, «позднее», «deferred» — 30 упоминаний в `backend/apps`,
`backend/common`, `frontend/src`, `desktop/src-tauri/src`. Собрать таблицу «файл · что обещано ·
сделано ли уже · нужно ли вообще»: часть наверняка протухла, а часть описывает то,
что мы уже построили другим способом.

---

## Что делать исполнителю с этим документом

1. Пункт 1 — починить сразу, одна строка.
2. Пункт 2 — самый важный и самый долгий. Он объясняет, почему тесты нас не спасли.
3. Пункты 3 и 6 — разобрать с доказательствами, ничего не удалять на глаз.
4. Пункты 4 и 5 — принести владельцу списком, решения не принимать.
5. Очередь А промпта 19 — **сделать целиком**, здесь она не покрыта вовсе.
