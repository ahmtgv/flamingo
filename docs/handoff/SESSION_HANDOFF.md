# Flamingo — Session Handoff

**Date:** 2026-06-14 · **Branch:** `main` · **HEAD:** `725f2de` · working tree clean (197 tracked files).
This doc lets a fresh session resume cleanly. It references files by path — read those, don't rely on this doc alone.

---

## 1. Project & concept
Flamingo is a B2C online-education platform (pupils grades 1–11 + adults, plus parents, teachers, institution admins) for Russia/CIS; MVP locale `ru`. Its differentiator is **SEduM** — on-device attention analysis (CMF) where **raw biometrics never leave the device**. Current goal: build the MVP module-by-module per the build order in `CLAUDE.md` §10.
**Source of truth (read these):** [`CLAUDE.md`](../../CLAUDE.md) (the contract — privacy, 152-FZ, i18n, tokens, thin resolvers, per-resolver auth), `docs/Flamingo_Product_Brief_v1.md`, `docs/flamingo_erd.md` (data model, entities 1:1 to models), `docs/flamingo_schema.graphql` (API contract — codegen reads this), `docs/flamingo_architecture.md` (layers), `docs/FIRST_CLAUDE_CODE_SESSION.md`, design system in `docs/Flamingo_DesignSystem_v1.md` + `frontend/src/shared/styles/tokens.css` + `frontend/design-reference/*.jsx`.

## 2. Architecture state (what's actually wired)
**Backend** — Python 3.12, Django 5.1, Strawberry GraphQL (`strawberry-django`), PostgreSQL 16, JWT bearer auth, ASGI (uvicorn, HTTP only — no Channels/subscriptions yet, `backend/config/asgi.py`).
- Apps present: `backend/common/`, `backend/apps/accounts`, `backend/apps/courses`, `backend/apps/scheduling`. Each app: `models.py`, `services.py` (logic+permissions), `graphql/{types,queries,mutations}.py`, `tests/`.
- Root schema: `backend/api/schema.py` composes Accounts/Courses/Scheduling Query+Mutation. **No `Subscription` type yet.**
- Migrations (all applied to dev Postgres): `accounts/0001`, `courses/0001`, `scheduling/0001`.
- Key models (see `backend/apps/*/models.py`): accounts `User`/`*Profile`/`Guardianship`/`VerificationDocument`; courses `Course`/`Section`/`Lesson`/`Material`/`Enrollment`; scheduling `LessonSession`/`Attendance`. Shared base in `backend/common/models.py`; enums in `backend/common/enums.py`; auth in `backend/common/auth.py`; cursor pagination `backend/common/pagination.py`; LiveKit token minting `backend/common/livekit.py`.
**Frontend** — TypeScript, React 18, Vite 6, Apollo Client, Redux Toolkit (UI state only), GraphQL Codegen (reads `docs/flamingo_schema.graphql` → `frontend/src/entities/graphql/generated.ts`, committed), i18next (`ru`, `frontend/src/i18n/`), CSS Modules on `tokens.css`.
- Layout: `frontend/src/app/` (store, apolloClient, router, providers, useLogout), `shared/ui` (design-system primitives), `shared/lib` (env, session, refresh), `entities/graphql/generated.ts`, `features/{auth,cabinet,courses,schedule}`.
- Auth: access token in memory, refresh token in `localStorage`, silent refresh on auth error (`frontend/src/app/apolloClient.ts`, `shared/lib/session.ts`, `shared/lib/refresh.ts`).
- **GraphQL drift caveat** (memory `sdl-vs-live-schema-drift`): accounts live type names are `*Type`-suffixed (`UserType`) vs SDL `User`; courses/scheduling names match the SDL. FE ops are **fragment-free** and select only live-implemented fields. LiveKit video is mocked (no server); join only acquires a token.

## 3. Done (committed on `main`)
All green: **backend 25 pytest on Postgres + ruff + black clean; frontend `npm run build` + `npm run lint` + 12 vitest** (run from `backend/` and `frontend/`).
- **Foundation/infra** — `33ee20f` baseline, `e47c763` dev infra (compose/Dockerfiles/ruff+black), `f20b601`/`10df489` ruff+black on backend, `2e30420` ignore local settings.
- **Auth (vertical slice)** — backend `apps/accounts` was provided; FE `628fb88` scaffold+design-system, `9a98e77` auth screens (role-aware register/login/reset, auto-login), `e6f54f7` auth tests. `cb8f2ad`/`131942d` add Avatar/Badge/SelectField primitives.
- **Cabinets** — `2292513` role-aware cabinet shell + dispatch; **parent cabinet is functional** (view + add children with 152-FZ consent via `addChild`); student/teacher/admin show profile + honest empty-states.
- **Courses** — `10ce430` backend (`Course/Section/Lesson/Material/Enrollment`, full CRUD+reorder+publish+enroll+markLessonViewed, catalog pagination, 10 tests), `7bea480` FE (catalog/detail/enroll + teacher constructor), `794269d` `myCourses` (+ added to the SDL contract), `725f2de` constructor materials + delete section/lesson.
- **Scheduling** — `47bfae6` backend (`LessonSession`/`Attendance`, schedule/start/end/join/setAttendance, role-aware `mySchedule`, LiveKit tokens, 5 tests), `8e1e930` fix `from` arg, `17c5b6a` FE (schedule view + lifecycle + join; teacher schedules per-lesson from course detail).
Verified E2E in-browser: register→login→`me`; parent add-child; teacher create→publish course→student enroll; schedule→start→student join (attendance row created); add lesson material.

## 4. In progress / partially built
Working tree is **clean** — nothing uncommitted. Partially-built *within* committed code:
- **Constructor reorder + edit-course UI** — the ops exist in `frontend/src/features/courses/graphql/courses.graphql` (`UpdateCourse`, `ReorderSections`, `ReorderLessons`) and hooks are generated, but **no UI is wired**. To finish: in `frontend/src/features/courses/ui/CourseDetailScreen.tsx` add per-section/-lesson move up/down buttons (compute ordered id arrays, call `useReorderSectionsMutation`/`useReorderLessonsMutation`) and an edit-course form (`useUpdateCourseMutation`). Backend already supports all of these (`backend/apps/courses/services.py`).
- **FILE materials** — only TEXT/LINK materials are supported in the UI; FILE needs the files/S3 upload module (not built).

## 5. Next tasks (ordered, most important first)
1. **Payments/billing seams — NOT IMPLEMENTED (no `billing` app exists).** Intended scope: a new `backend/apps/billing` app, `Enrollment.access_status` (e.g. pending/active), `Course.price` + `currency`, and a **centralized `can_access_course(user, course)`** used by enroll/session-join/material gates. ⚠️ The task brief says the payment rules are "already recorded in CLAUDE.md", but **`CLAUDE.md` currently contains NO payments/billing section** (verified by grep). Get the rules from the product owner (see §8) before coding gating logic; add them to `CLAUDE.md` first.
2. **Finish the constructor** (reorder + edit-course UI) — see §4; small, backend-ready.
3. **Homework/grades** — `apps/homework` (`Homework`, `Submission`, `SubmissionFile`, grading) per ERD §3.4 + SDL; FE homework feature. Needs the files module for submission uploads (or stub `fileKeys`).
4. **Admin / institutions** — `apps/institutions` (`Institution`, memberships, `Group`/`GroupMembership`/`GroupTeacher`, branding, review moderation); resolves the ERD §7 open question (group_id vs CourseGroup M2M) first.
5. **SEduM Lite** — `apps/seedum` + `frontend/src/seedum/` (MediaPipe worker, attention pipeline → aggregates only, UBP in IndexedDB, `reportAttention`, `attentionUpdates` **subscription**). Requires standing up **Django Channels** (`config/asgi.py` is HTTP-only today) and the live CMF room consuming the scheduling LiveKit tokens.
6. Cross-cutting later: files/S3 module (presigned uploads), certificates (PDF+QR), engagement (points/leaderboard/reviews), notifications.

## 6. Key decisions & constraints (don't re-litigate)
- **No Docker on this machine** → stack runs **natively** (memory `local-dev-stack`); toolchain installed via Homebrew (node, postgresql@16, python@3.12). `infra/docker-compose.yml` exists but is unused locally.
- **Same-origin `/graphql` + Vite dev proxy** (no CORS; backend untouched) — `frontend/vite.config.ts`, `frontend/src/shared/lib/env.ts`.
- **Courses/scheduling GraphQL type names match the SDL** (`Course`, `LessonSession`, …) — deliberately NOT the accounts `*Type` suffix (avoids clashing with the `MaterialType` enum and reduces drift).
- **codegen `enumsAsTypes: true`** → enums are string-literal unions (compare `role === 'STUDENT'`).
- **SDL is hand-maintained**: to add a query/field, hand-edit `docs/flamingo_schema.graphql` (done for `myCourses`). Do NOT regenerate it from the backend.
- ruff/black line-length 100, applied to the provided backend too. Conventional commits, one concern per commit.
- Auth: register auto-logs-in (`registerUser` returns tokens). Refresh-token storage is client-side `localStorage` (backend returns it in the body, not a cookie).

## 7. What to avoid / known traps
- **Do NOT** run `python manage.py export_schema api.schema > docs/flamingo_schema.graphql` — it clobbers the clean contract with the `*Type`-suffixed accounts-only slice.
- **Strawberry does NOT strip trailing underscores from arg names** — a Python-keyword arg needs `Annotated[T, strawberry.argument(name="from")]` (this broke `mySchedule`; fixed in `8e1e930`).
- **Run uvicorn with `--reload`** — the Strawberry schema is built at import time; a stale server returns "Cannot query field …". New apps still need one restart after first migrate.
- **Postgres won't start without a locale** — `export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8` (else "postmaster became multithreaded during startup").
- **vitest major must match vite major** (vite 6 ↔ vitest 3) or you get two-copies-of-vite type errors.
- FE ops: no fragments on type names; pass whole-object inputs; send `<input type=datetime-local>` as `new Date(v).toISOString()`; lucide icons typed as `LucideIcon`.
- `frontend/src/entities/graphql/generated.ts` is committed — re-run `npm run codegen` after any schema/op change.

## 8. Open questions for the product owner
- **Payments rules (blocking task #1):** they are NOT in `CLAUDE.md` despite the brief. Need: pricing model (per-course `price`/`currency`? subscription? free tier?), what grants `Enrollment.access_status = active` (payment webhook? free courses auto-active?), trials/refunds, and which actions `can_access_course` gates (enroll vs view lessons vs join sessions). Add the agreed rules to `CLAUDE.md` before implementing.
- **Junior pupil signup:** currently a junior self-registers via `registerUser` using the parent's email as the login + a 152-FZ consent gate (MVP simplification). Confirm vs the "parent creates child via `addChild`" flow.
- **Group ↔ Course shape** (ERD §7): `group_id` on COURSE/LESSON_SESSION vs a `CourseGroup` M2M — decide before institutions/scheduling-by-group.
- **Composite dashboards** (`studentDashboard`/`teacherDashboard` in SDL) — implement fully once scheduling + homework exist?

## 9. How to resume
**Read first:** `CLAUDE.md`, this file, then `docs/flamingo_erd.md`, `docs/flamingo_schema.graphql`, `docs/flamingo_architecture.md` as needed. Memory files (`MEMORY.md`, `local-dev-stack.md`, `sdl-vs-live-schema-drift.md`) auto-load.

**Bring the stack up (native; full details in memory `local-dev-stack`):**
```bash
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 -l /opt/homebrew/var/log/postgresql@16.log start   # role+db 'flamingo' already exist
cd backend && export POSTGRES_HOST=localhost POSTGRES_USER=flamingo POSTGRES_PASSWORD=flamingo POSTGRES_DB=flamingo
.venv/bin/python manage.py migrate && .venv/bin/python -m pytest        # expect 25 passed
.venv/bin/uvicorn config.asgi:application --port 8000 --reload
# new shell: cd frontend && npm run dev   (proxies /graphql -> :8000; preview via .claude/launch.json)
```

**Exact first prompt for the next session:**
> Resume the Flamingo build. First read `CLAUDE.md` and `docs/handoff/SESSION_HANDOFF.md` (then `docs/flamingo_erd.md` / `docs/flamingo_schema.graphql` as needed). Bring up the dev stack per the handoff §9 (Postgres with `LC_ALL`, backend `uvicorn … --reload` on :8000, frontend `npm run dev` on :5173) and confirm `pytest` is green. Then start the **payments/billing seams** task (new `billing` app, `Enrollment.access_status`, `Course.price`/`currency`, centralized `can_access_course`) — but the payment rules are NOT in `CLAUDE.md` yet, so ask me to confirm them and add them to `CLAUDE.md` before writing gating logic. After that, continue with the **homework** module per the build order.
