# Flamingo

Онлайн-обучение. Проект начат заново 28.08.2026, собирается кусками.

**Сейчас в работе первый кусок: комната по ссылке** — двое проводят занятие
без регистрации: видео, звук и общая доска. Границы куска — `docs/ГРАНИЦА.md`.

## Запуск

```bash
# фронт
cd frontend
npm install
npm run dev            # http://localhost:5173

# бэкенд (в другом окне)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # вписать три строки LIVEKIT_*
python manage.py runserver 8000
```

Фронту нужен адрес медиасервера — `frontend/.env`:

```
VITE_LIVEKIT_URL=wss://<ваш-livekit>
VITE_API_URL=http://localhost:8000
```

## Что где

| Папка | Что внутри |
|---|---|
| `frontend/` | React + TypeScript + Vite. Экран входа и комната |
| `backend/` | Django. Один путь: подписывает токен LiveKit по коду комнаты |
| `docs/ГРАНИЦА.md` | что входит в первый кусок и что в него **не** входит |
| `docs/ПРАВИЛА-ДИЗАЙНА.md` | закон экранов, перенесён с прошлого проекта |
| `docs/дизайн/` | токены, листы дизайнера, знаки |
| `CLAUDE.md` | порядок работы над проектом |
| `_архив-прототип-2026-08/` | старый прототип, лежавший в этой папке. Не используется |
