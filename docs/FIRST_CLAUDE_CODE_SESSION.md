# First Claude Code session — brief

This is the orientation for the first build session in Claude Code. Goal of session 1:
**stand up the monorepo, get the backend running on Postgres with the auth tests green, scaffold the frontend, and build the `features/auth` vertical slice wired to the real GraphQL API.**

## Before anything
- Read `CLAUDE.md` (root) — it is the contract. Especially: on-device privacy, 152-FZ residency, i18n-from-day-one, design tokens not literals, thin resolvers + services, server-side per-resolver authorization.
- The data model is `docs/flamingo_erd.md` (models map 1:1). The API is `docs/flamingo_schema.graphql` (treat the SDL as the contract; FE types are generated from it). Layered design is in `docs/flamingo_architecture.md`.

## What already exists (do not rebuild)
- `backend/` — Django 5 + Strawberry, with `common/` (BaseModel, enums, JWT auth, middleware) and **`apps/accounts`** fully implemented and tested: role-aware registration with age-band, login, refresh, guardianship + 152-FZ consent, teacher verification, password reset. Migration `0001_initial` is committed. `config/settings_test.py` runs tests on SQLite.
- `frontend/src/shared/styles/tokens.css` — canonical design tokens (two-tier: primitives → semantic; light/dark via `data-theme`, age mode via `data-mode`).
- `frontend/design-reference/*.jsx` — self-contained role prototypes (auth, teacher, teen, junior, parent, flows) and the component styleguide. **Reference for visuals/UX**, to be ported into real TS components. (Video panels in them are mocks; only CMF charts animate.)
- `landing/index.html` — deployable marketing page.

## Session 1 — tasks
1. **Repo init**: `git init`, `.gitignore` (Python, Node, env, build), confirm the layout matches `CLAUDE.md` §4.
2. **Backend on Postgres**: add `pyproject.toml` (or keep `requirements.txt`), `Dockerfile`, and `infra/docker-compose.yml` (postgres, redis, minio; livekit can come with the lessons module). Bring up Postgres, run `migrate`, run `pytest` against Postgres (not only SQLite) and get accounts tests green. Add `ruff` + `black` config.
3. **Frontend scaffold**: Vite + React 18 + TypeScript in `frontend/`. Add Apollo Client, Redux Toolkit, GraphQL Code Generator (`codegen.ts` reading `docs/flamingo_schema.graphql`), i18next (`ru` namespace), CSS Modules. Wire `tokens.css` at the root; set up the Theme/AgeMode provider (`data-theme` / `data-mode`). Port the core styleguide primitives (button, input, select, checkbox, card, field, etc.) into `src/shared/ui` as real TS components on tokens.
4. **`features/auth`**: build role select → role-aware registration (student 7–11 / 12–17 / 18+, parent, teacher, admin) → login → password reset, from `design-reference/FlamingoAuthPrototype.jsx`, as real components using `shared/ui` + generated GraphQL hooks. Wire to: `registerUser` (or `addChild` for a parent adding a child), `login`, `requestPasswordReset` / `resetPassword`, `submitVerificationDocument`. Store the access token in memory, refresh on 401. All strings via i18n.
5. **Verify end-to-end**: run backend + frontend; register and log in against the real API; `me` returns the user. Add a couple of FE tests (Vitest + RTL) for the auth forms/validation.

## Definition of done (this session)
- `docker compose up` brings up the dev stack; `cd backend && pytest` is green on Postgres.
- `cd frontend && npm run codegen && npm run build && npm run lint` succeed.
- A user can register and log in through the UI against the running API; protected routing works; `me` resolves.
- No hardcoded strings (i18n) or colors/sizes (tokens). Auth screens hit the WCAG-AA floor (focus rings, labels, keyboard nav, reduced motion).
- Conventional commits, one concern per commit.

## Hard constraints (from CLAUDE.md — do not violate)
- No server path that accepts raw video/audio/biometric frames. Only the aggregate `{ sessionId, studentId, bucketStart, avgAttention }` ever leaves the device (this matters from the lessons/SEduM modules; keep it in mind now).
- PII only in the RF region. Minors need `consent152fz` at registration.
- Open-source deps only. Do **not** build deferred features (blockchain/NFT, VR/AR, Open API, Neo4j, native mobile).
- Authorization is server-side and per-resolver; never trust client-supplied role/ids.
- Keep the SDL in sync: after backend schema changes, `python manage.py export_schema api.schema > docs/flamingo_schema.graphql`, then re-run FE codegen.

## After session 1
Continue the build order: **role cabinets → schedule/lessons (+ LiveKit, scheduling app) → homework/grades → admin (institutions app) → SEduM Lite (seedum app: MediaPipe worker, attention pipeline, UBP, `attentionUpdates` subscription).** Each module = backend app (models + migrations + services + GraphQL matching the SDL) + FE feature (generated types + design-system UI) + permission tests + i18n.

---

## Paste this as your first message to Claude Code

> Это монорепо платформы Flamingo. Сначала прочитай `CLAUDE.md` в корне и `docs/FIRST_CLAUDE_CODE_SESSION.md` — это контракт и план первой сессии, не отклоняйся от них. Модель данных — `docs/flamingo_erd.md`, API-контракт — `docs/flamingo_schema.graphql`, архитектура — `docs/flamingo_architecture.md`.
>
> Уже готово и трогать не нужно: `backend/` с `common/` и полностью реализованным и протестированным модулем `apps/accounts` (регистрация по ролям, JWT, согласие 152-ФЗ, верификация преподавателя); токены `frontend/src/shared/styles/tokens.css`; референс-прототипы в `frontend/design-reference/`; лендинг в `landing/`.
>
> Цель этой сессии: поднять репозиторий, запустить backend на Postgres с зелёными тестами auth, развернуть фронт (Vite + TS + React + Apollo + Redux Toolkit + GraphQL Code Generator + i18next + CSS Modules на токенах) и собрать вертикальный срез `features/auth` (выбор роли → формы по ролям → вход → сброс пароля), подключённый к реальным мутациям GraphQL, с регистрацией и входом end-to-end.
>
> Правила: строки — через i18n (язык интерфейса русский), цвета/размеры — только токены; код, комментарии и коммиты — на английском; резолверы тонкие, логика в сервисах; авторизация на сервере. Начни с инициализации git и `infra/docker-compose.yml`, затем backend на Postgres, затем фронт и `features/auth`. По ходу показывай план и спрашивай, если что-то неоднозначно.
