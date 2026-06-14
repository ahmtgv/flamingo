# Flamingo

B2C online education platform (pupils grades 1–11 + adult course-takers, parents, teachers, institution admins). Markets: Russia & CIS, MVP locale Russian. Differentiator: **SEduM** — on-device attention analysis (CMF) under a strict privacy principle (raw biometrics never leave the device).

Product source of truth: [`docs/Flamingo_Product_Brief_v1.md`](docs/Flamingo_Product_Brief_v1.md).
**Read [`CLAUDE.md`](CLAUDE.md) before writing any code.**

## Status (starter pack)

| Area | State |
|---|---|
| Product brief, UX foundation, screen map | done — `docs/` |
| Brand, design system, tokens, component styleguide | done — `docs/`, `frontend/src/shared/styles/tokens.css`, `frontend/design-reference/` |
| ERD, GraphQL schema (contract), architecture | done — `docs/` |
| **Backend `apps/accounts` (auth)** | **implemented + tested** — `backend/` (10 tests pass) |
| Landing page | done, deployable — `landing/index.html` |
| Frontend app (Vite/TS/Apollo) | **not scaffolded yet** — skeleton dirs only |
| Other backend modules / FE features | not started |

## Repository map

```
flamingo/
  CLAUDE.md                      # repo guidance — read first
  backend/                       # Django + Strawberry GraphQL; apps/accounts is built & tested
  frontend/                      # Vite/TS/React app — skeleton; scaffold in session 1
    src/shared/styles/tokens.css # canonical design tokens
    design-reference/            # self-contained role prototypes (port into real components)
  landing/index.html             # deployable marketing page
  docs/                          # brief, UX, ERD, schema.graphql, architecture, design system, brandbook
  design-assets/                 # logo SVGs
  skills/official-documents/     # corporate-document generator (certificates/letters)
```

## Start here

1. Read `CLAUDE.md` (principles, stack, conventions, build order, do-nots).
2. Read `docs/FIRST_CLAUDE_CODE_SESSION.md` — the goals and definition of done for the first build session.
3. Build order (MVP): **auth → role cabinets → schedule/lessons → homework/grades → admin → SEduM Lite.** Auth backend is done; next is the frontend `features/auth` and the role cabinets.

## Backend quick check

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# fast local tests (SQLite, no Postgres needed):
DJANGO_SETTINGS_MODULE=config.settings_test python -m pytest
# real run uses Postgres via config/settings.py + .env
```

`config/settings_test.py` (SQLite in-memory) is for local tests only; production is PostgreSQL.
