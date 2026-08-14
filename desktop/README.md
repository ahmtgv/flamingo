# desktop — оболочка Tauri

Урок идёт с машины преподавателя (OWNER_SCOPE §18). Здесь живёт только **оболочка**: окно,
запуск sidecar и его остановка. Все экраны внутри — тот же React, что отдаёт веб; фича,
сделанная здесь вместо `frontend/`, была бы фичей, которой нет в браузере.

## Что из чего собирается

```
frontend/dist            → вкладывается ВНУТРЬ бинарника (brotli), 16,8 МБ → ≈4,2 МБ
backend/ + PyInstaller   → src-tauri/sidecar/, кладётся в Resources
```

## Сборка

```bash
# 1. фронтенд
cd frontend && npm run build

# 2. sidecar одной папкой (не onefile: onefile распаковывается при каждом запуске)
python -m venv /tmp/desk-venv
/tmp/desk-venv/bin/pip install -r backend/requirements-desktop.txt pyinstaller psycopg
cd backend && /tmp/desk-venv/bin/pyinstaller --noconfirm --clean \
  --distpath ../desktop/src-tauri/sidecar-build --name flamingo-sidecar \
  --collect-submodules config --collect-submodules api \
  --collect-submodules apps --collect-submodules common \
  --collect-all strawberry --collect-all strawberry_django --collect-all channels \
  --collect-submodules django --collect-data django \
  --hidden-import config.settings --hidden-import config.settings_desktop \
  --hidden-import config.asgi \
  --exclude-module psycopg --exclude-module psycopg2 --exclude-module psycopg_binary \
  --exclude-module boto3 --exclude-module botocore --exclude-module tkinter \
  --hidden-import uvicorn.loops.auto --hidden-import uvicorn.protocols.http.auto \
  --hidden-import uvicorn.protocols.websockets.auto --hidden-import uvicorn.lifespan.on \
  sidecar_entry.py
mv ../desktop/src-tauri/sidecar-build/flamingo-sidecar ../desktop/src-tauri/sidecar

# 3. оболочка
cd desktop/src-tauri && cargo tauri build
```

`psycopg` ставится **в сборочный venv и исключается из бандла**: хук PyInstaller для Django
импортирует все бэкенды баз данных, падает без него, а в готовое приложение его класть незачем —
там SQLite.

## Три вещи, которые ломались, и почему они здесь записаны

1. **uvicorn нельзя давать приложение строкой.** `"config.asgi:application"` он импортирует по
   имени, а во фрозен-бандле нет дерева исходников. `sidecar_entry.py` передаёт объект.
2. **Модули настроек PyInstaller не находит сам** — Django берёт их по имени из переменной
   окружения, поэтому `--hidden-import config.settings_desktop`.
3. **Tauri разыменовывает симлинки** внутри `Python.framework` и везёт Python дважды: 66 МБ на
   диске становятся 83 МБ в сборке. Записано в ADR-001 §6.6, не починено.

Числа сборки — `docs/adr/ADR-001-desktop-runtime.md` §2.
