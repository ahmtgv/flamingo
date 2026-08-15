# Запуск точки встречи — по шагам

Для владельца. Команды копируются целиком, по одной, сверху вниз. После каждой написано,
**что должно появиться на экране** — если появилось другое, дальше не идти и сказать мне.

Все команды выполняются **на сервере**, в каталоге `/opt/flamingo`.

---

## 0 · Обновить код на сервере

⚠️ **`git pull` на сервере не работает и не должен**: код туда не клонировали из git,
а залили с мака. Репозиторий приватный, и заводить на сервере ключи GitHub ради этого
незачем — одна лишняя связка ключей, которую потом никто не отзовёт.

**Команда выполняется НА МАКЕ, не на сервере:**

```
rsync -az --delete --exclude node_modules --exclude .venv --exclude .git \
  --exclude 'desktop/src-tauri/target' --exclude .env.production \
  ~/Downloads/flamingo/ root@82.147.71.204:/opt/flamingo/
```

**Должно появиться:** запрос пароля root, затем тишина и возврат приглашения — rsync молчит,
когда всё прошло. `--delete` убирает с сервера файлы, которых больше нет на маке;
`--exclude .env.production` защищает файл с секретами от затирания.

Дальше все команды — **на сервере**: `ssh root@82.147.71.204`, затем `cd /opt/flamingo`.

---

## 1 · Проверить, что в настройках заполнено всё

```
cd /opt/flamingo && grep -c '^[A-Z_]*=$' .env.production
```

**Должно появиться:** `0` — ни одной пустой переменной.
Если больше нуля, посмотреть какие, и заполнить:

```
cd /opt/flamingo && grep -n '^[A-Z_]*=$' .env.production
```

⚠️ Содержимое этого файла мне не показывать: там секреты, и они должны остаться на сервере.

---

## 2 · Проверить конфигурацию до запуска

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production config >/dev/null && echo "конфигурация верна"
```

**Должно появиться:** `конфигурация верна`.
Если вместо этого ошибка про переменную — вернуться к шагу 1.

---

## 3 · Собрать и поднять

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production up -d --build
```

Первый раз идёт долго — собирается образ. **Должно появиться:** пять строк с `Started` или
`Running`: postgres, redis, api, coturn, caddy.

---

## 4 · Посмотреть, что все живы

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production ps
```

**Должно появиться:** пять строк, у всех в колонке STATUS слово `Up`.
У postgres и redis рядом будет `(healthy)`.

---

## 5 · Проверить, что миграции прошли

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production logs api | grep -c "Applying"
```

**Должно появиться:** `57` — столько миграций у базы на сегодня. Если `0`, значит база уже
была мигрирована раньше, это тоже нормально; проверить можно так:

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production exec api python manage.py showmigrations | grep -c "\[X\]"
```

**Должно появиться:** `57`.

---

## 6 · Проверить, что API отвечает по HTTPS

Первый запрос может идти до минуты: Caddy в этот момент выпускает сертификат.

```
curl -i -X POST https://api.flamingo.plus/graphql/ -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}'
```

**Должно появиться:** первая строка `HTTP/2 200`, а в конце — `{"data": {"__typename": "Query"}}`.

Если `HTTP/2 400` и слово `DisallowedHost` — в `.env.production` в `ALLOWED_HOSTS` не тот домен.

---

## 7 · Проверить сертификат

```
echo | openssl s_client -servername api.flamingo.plus -connect api.flamingo.plus:443 2>/dev/null | openssl x509 -noout -dates -issuer
```

**Должно появиться:** три строки — `notBefore`, `notAfter` (дата примерно через три месяца)
и `issuer=...Let's Encrypt...`.

---

## 8 · Проверить CORS — то, из-за чего сайт не может говорить с API

```
curl -s -i -X OPTIONS https://api.flamingo.plus/graphql/ -H 'Origin: https://flamingo.plus' -H 'Access-Control-Request-Method: POST' | grep -i "access-control"
```

**Должно появиться:** строка `access-control-allow-origin: https://flamingo.plus`.

А теперь то же самое с чужого адреса — так делать и должно **не** получиться:

```
curl -s -i -X OPTIONS https://api.flamingo.plus/graphql/ -H 'Origin: https://example.com' -H 'Access-Control-Request-Method: POST' | grep -ci "access-control-allow-origin"
```

**Должно появиться:** `0`. Ноль здесь — правильный ответ: чужому сайту доступа нет.

---

## 9 · Проверить ретранслятор

Сначала — что он вообще поднялся:

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production logs coturn | tail -5
```

**Должно появиться:** строки про `listener` и порт `3478`, без слова `error`.

Теперь настоящая проверка — достучаться до него с тем же кредентивом, какой выдаёт API.
Команда сама считает пароль из секрета и **никуда его не печатает**:

```
cd /opt/flamingo && set -a && . ./.env.production && set +a && U=$(( $(date +%s) + 600 )) && P=$(printf '%s' "$U" | openssl dgst -sha1 -hmac "$TURN_SECRET" -binary | base64) && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production exec -T coturn turnutils_uclient -T -u "$U" -w "$P" -p 3478 127.0.0.1 2>&1 | tail -8; unset P U
```

**Должно появиться:** строки с `success` и цифрами отправленных/полученных пакетов
(`tot_send_msgs`, `tot_recv_msgs`), и они не нули.

Если написано `401` или `Unauthorized` — секрет в `.env.production` и секрет контейнера
разошлись: перезапустить (`docker compose ... up -d coturn`) и повторить.

---

## 10 · Пересобрать и выложить сайт

Сайт живёт на Cloudflare Pages и собирается отдельно от сервера. В настройках сборки должно
быть:

| Переменная | Значение |
|---|---|
| `VITE_GRAPHQL_HTTP_URL` | `https://api.flamingo.plus/graphql/` |
| `VITE_GRAPHQL_WS_URL` | `wss://api.flamingo.plus/graphql/` |
| `VITE_PUBLIC_ORIGIN` | `https://flamingo.plus` |

Команда сборки — **`npm run build`** (не `build:preview`: витрина с демо-слоем нужна была,
пока сервера не было; теперь сайт идёт в настоящий API).

**Должно появиться после выкладки:** на `flamingo.plus/register/teacher` форма регистрации,
и она **не** показывает «Это витрина продукта».

---

## 11 · Живая проверка: завести преподавателя

Открыть `https://flamingo.plus/register/teacher`, заполнить, поставить галочку согласия,
нажать «Создать аккаунт».

**Должно появиться:** стартовая страница с приветствием по имени.

Проверить, что человек действительно в базе:

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production exec api python manage.py shell -c "from apps.accounts.models import User; u=User.objects.order_by('-created_at').first(); print(u.email, u.role, 'согласие:', u.consent_152fz, u.consent_152fz_at)"
```

**Должно появиться:** почта, роль `teacher`, `согласие: True` и дата.

---

## 12 · Живая проверка: связать машину

1. Открыть приложение преподавателя — оно покажет код из шести знаков.
2. В браузере, уже войдя, открыть `https://flamingo.plus/link`.
3. Ввести код, нажать «Связать».

**Должно появиться:** в браузере — «Машина связана»; в приложении — переход на второй шаг
настройки, сам, без нажатий.

---

## 13 · Ежедневный дамп базы ⏱ 2 минуты

На сервере теперь лежат учётки, расписание и зеркало ученика — работы и оценки живых детей.
Копия кабинета преподавателя это **не** покрывает: она про его машину, а не про сервер.

```bash
cd /opt/flamingo
./infra/prod/backup-db.sh          # проверить, что дамп снимается
crontab -l 2>/dev/null | { cat; echo "15 4 * * * cd /opt/flamingo && ./infra/prod/backup-db.sh >> /var/log/flamingo-backup.log 2>&1"; } | crontab -
crontab -l                          # убедиться, что строка встала
```

**Что должно появиться:** строка вида `дамп готов: …/flamingo_2026-08-15_0416.sql.gz (48K)`.

Хранится семь дней, старое удаляется само. Раз в неделю забирай копию к себе на мак —
дамп на том же диске, что и база, от потери сервера не спасает:

```bash
rsync -az root@82.147.71.204:/opt/flamingo/infra/prod/backups/ ~/Downloads/flamingo-backups/
```


---

## 14 · Загрузка файлов: проверить путь целиком ⏱ 3 минуты

*Добавлено 15.08 — правки по пяти находкам живого пути.*

Материалы и работы грузятся **в обход API**: браузер получает подписанную ссылку и кладёт файл
прямо в хранилище. Поэтому проверять надо всю цепочку, а не только API.

Что уже проверено с мака и работает (можно не повторять): DNS `files.flamingo.plus` →
82.147.71.204, TLS выпущен, MinIO отвечает, предполётный запрос браузера на PUT разрешён —
`access-control-allow-origin: https://flamingo.plus`.

Что проверяется только на сервере — **адрес, который подписывает API**:

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production exec api python -c "from django.conf import settings; import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); django.setup(); print(settings.S3['endpoint'])"
```

**Должно появиться:** `https://files.flamingo.plus`.

⚠️ Если появится `http://minio:9000` — это внутреннее имя, из браузера оно не открывается, и
загрузка будет падать молча. Тогда в `.env.production` поправить `S3_ENDPOINT` на
`https://files.flamingo.plus` и перезапустить api.

Потолок файла подняли до **500 МБ** (решение владельца, §22). Он стоит в двух местах и обязан
совпадать: в коде и в `Caddyfile`. Чтобы Caddy подхватил новое значение:

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production up -d caddy
```

**Должно появиться:** строка `Started` или `Recreated` у caddy.

---

## 15 · Дать себе права надзора ⏱ 1 минута

*Экран верификации преподавателей (`/admin/verification`) открыт только сотруднику платформы.*

Роль «администратор» при регистрации — это администратор **учреждения**, и надзор ей не
положен. Права платформы даются один раз и вручную — специально: это единственный режим, в
котором видно чужое.

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production exec api python manage.py shell -c "from apps.accounts.models import User; u=User.objects.get(email='ВАША_ПОЧТА'); u.is_staff=True; u.save(update_fields=['is_staff']); print(u.email, 'надзор:', u.is_staff)"
```

**Должно появиться:** почта и `надзор: True`.

Дальше на сайте: `flamingo.plus/admin` → кнопка **«Верификация»**, либо сразу
`flamingo.plus/admin/verification`.

⚠️ Каждое открытие документа преподавателя пишется в журнал внизу того же экрана: кто, что,
когда. Журнал не редактируется и не удаляется — так решено (§23.1), и это то, что делает
полный доступ защитимым.

---

## 16 · Живая проверка: материал с видео ⏱ 5 минут

1. Открыть свой курс → урок → **«+ Материал»**.
2. Вид материала выбирается кнопками: **Ссылка · Файл · Текст**.
3. Выбрать «Файл». Под полем написано, **что можно и до какого размера** — до попытки, а не после.
4. Приложить видео (mp4/webm/mov).

**Должно появиться:** имя файла на кнопке, затем материал в списке урока.

Если файл больше потолка — отказ приходит **сразу при выборе**, с именем файла, его весом и
потолком. Ждать загрузки, чтобы узнать «нельзя», больше не нужно.

---

## Если что-то пошло не так

Посмотреть, что говорит API:

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production logs --tail=50 api
```

Перезапустить всё:

```
cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production restart
```

⚠️ **Чего делать не нужно:** не выключать `DEBUG=0` в `.env.production`, чтобы «посмотреть
ошибку». С `DEBUG=1` Django печатает на страницу кусок кода и настройки — это утечка, и
именно её увидит первый посторонний, а не вы.
