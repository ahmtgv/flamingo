repo: ahmtgv/flamingo
branch: main
path: frontend/src/features/lesson

## Last sync
date: 2026-08-19T00:00:00Z

### Updated in this project
- Комната урока пересобрана: сцена во весь кадр, лица тонкой полосой с перетаскиваемым соотношением
- Правая панель стала слоем поверх видео (25 % кадра, Esc закрывает)
- Четыре состояния комнаты: наполнено · пусто · загружается · отказ
- Правила отступов и раскладки вынесены отдельным листом «Правила»
- Кабинеты преподавателя и ученика, «Моя учёба» и расписание — без прокрутки страницы, с четырьмя состояниями
- Пустой кабинет объясняет пять шагов до первого урока
- Ожидание урока, второй экран и демо-урок для гостя (без выдуманных лиц)

## Screen map
| Экран проекта | Файлы репозитория |
|---|---|
| Комната урока.dc.html | frontend/src/features/lesson/ui/VideoRoom.tsx, frontend/src/features/lesson/ui/LiveRoomScreen.tsx, frontend/src/features/lesson/attentionView.ts, frontend/src/i18n/locales/ru/room.json |
| Кабинет и учёба.dc.html | frontend/src/features/cabinet/ui/teacherDashboardFormat.ts (читался), uploads/Новая папка/atlas/00_start.html (контракт блоков) |
| Вокруг урока.dc.html | frontend/src/features/demo/ui/DemoRoomScreen.tsx (читался), frontend/src/i18n/locales/ru/room.json (projector.*) |
| Токены (tokens.css) | uploads/Новая папка/tokens.css (совпадает с docs/Flamingo_Redesign_Prompt_v2.md) |
