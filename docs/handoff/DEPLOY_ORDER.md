# ПОРЯДОК ВЫКАТА — гит · сервер · мак

Короткая памятка. Заведена 19.08.2026, после того как продукт **дважды за сутки лежал
в бою** из-за нарушения этого порядка.

---

## 🔴 Правило, из которого всё следует

**Сайт выкатывается САМ при каждом `git push`** — Cloudflare Pages собирает его без нас,
за 3–5 минут. **Сервер выкатывается РУКАМИ.**

Значит после каждой отправки есть окно, в котором **сайт новее сервера**. Если за это время
фронт спросит поле, которого сервер не знает, GraphQL отвергает **весь запрос**, и человек
видит «Что-то пошло не так» на входе и регистрации.

Так мы легли на `markless` (вход и регистрация не работали часами) и чуть не легли
на `timezone`.

**Отсюда:** если менялся `backend/` — **сервер катится в тот же заход, что и push**.
Не «потом», не «завтра».

---

## Порядок

### 0 · Проверить, что дерево чистое

```bash
cd ~/Downloads/flamingo && git status --porcelain | wc -l
```

Не ноль — исполнитель в работе. **Ждать.** Выкат из рабочей папки увезёт недописанное.

### 1 · Узнать, менялся ли сервер

```bash
cd ~/Downloads/flamingo && git log --oneline origin/main..HEAD -- backend/ | wc -l
```

Ноль — можно просто отправить, сайт соберётся сам. Больше нуля — идут все шаги.

### 2 · Отправить

```bash
cd ~/Downloads/flamingo && git push
```

### 3 · Выкатить сервер — из GitHub, а не из рабочей папки

🔴 **Важно:** увозим то, что на GitHub. В рабочей папке лежат неотправленные коммиты
и незаконченные правки исполнителя — им на бою не место.

```bash
cd /tmp && rm -rf flamingo-deploy && git clone -q --depth 1 https://github.com/ahmtgv/flamingo.git flamingo-deploy && echo "склонировано"

rsync -az --delete --exclude .git --exclude node_modules --exclude .venv \
  --exclude target --exclude dist --exclude .env.production \
  /tmp/flamingo-deploy/ root@82.147.71.204:/opt/flamingo/

ssh root@82.147.71.204 'cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production up -d --build api'
```

### 4 · Убедиться, что миграции накатились

Контейнер накатывает их при старте, но **утверждения об этом нет** — проверяем сами:

```bash
sleep 30; ssh root@82.147.71.204 'cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production exec -T api python manage.py showmigrations --plan | grep -c "\[ \]"'
```

Ждём **0**. Не ноль — миграции не прошли, вход и регистрация лягут.

### 5 · Проверить живьём

```bash
curl -sL https://flamingo.plus/graphql/ | head -c 60; echo
curl -sI -m 15 -X OPTIONS https://api.flamingo.plus/graphql/ \
  -H 'Origin: tauri://localhost' -H 'Access-Control-Request-Method: POST' \
  | grep -i 'access-control-allow-origin' || echo 'заголовка нет'
```

Первое — «Здесь ничего нет», второе — строка с `tauri://localhost`.

### 6 · Приложение на Mac — только если пересобрано

```bash
osascript -e 'quit app "Flamingo"'
bash ~/Downloads/flamingo/desktop/install.sh
mdfind "kMDItemFSName == 'Flamingo.app'" | grep -v "^/Volumes/"
```

Последняя строка должна показать **одну** копию — `/Applications/Flamingo.app`.

⚠️ **Сервер раньше приложения.** Свежее приложение против старого сервера даёт непонятные
отказы — мы это уже проходили.

---

## Чего не делать

- **Не катить из рабочей папки**, когда исполнитель в работе.
- **Не откладывать сервер**, если менялся `backend/`.
- **Не сравнивать отпечаток `index-*.js` сайта с локальным `dist`** — локально собирается
  версия для приложения, у неё другой хэш при том же коммите. Это ничего не значит.
- **Не верить проверке в `deploy.sh` вслепую**: она ждёт сборку до шести минут, но если
  Cloudflare задержится — соврёт. Смотреть на страницу развёртывания.
