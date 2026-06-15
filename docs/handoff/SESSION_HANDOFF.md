# Flamingo — Session Handoff

**Date:** 2026-06-15 · **Branch:** `main` · **HEAD:** `98ad05c` · working tree clean (44 commits on `main`).
This doc lets a fresh session resume cleanly. It references files by path — read those, don't rely on this doc alone.

---

## 0. Current state — read this first
**Repo is green and clean** (verified this session, not from memory): backend **57 pytest** on
Postgres + **ruff** + **black** clean, 0 unapplied migrations, `makemigrations --check` clean;
frontend **`npm run build`** + **`npm run lint`** + **25 vitest**, `generated.ts` matches the SDL
(no codegen drift). Tree clean.

**MVP build order status** (`CLAUDE.md` §10: `auth → cabinets → schedule → homework → admin → SEduM`):
auth ✅ · cabinets ✅ (parent functional; others shells) · courses ✅ · scheduling ✅ ·
homework ✅ (TEXT-only) · payment-readiness seams ✅ · course constructor ✅ ·
**admin/institutions ✅ (a+b+c, module complete)** · **SEduM Lite — NOT started** (next).

**Apps:** `backend/apps/` = accounts, courses, scheduling, homework, institutions (no `seedum`).
**Frontend features:** `frontend/src/features/` = auth, cabinet, courses, schedule, homework, admin
(no `seedum`). `api/schema.py` composes 5 Query/Mutation mixins; **still no `Subscription` type**.

**Owner-gated migration check:** the institutions cross-app FK migration (the table-altering step —
`courses/0003`, `scheduling/0002`, `homework/0002`) **landed and is applied**; it was the
owner-approved one (additive nullable FKs, shown before applying — see §3 step b).

**Dev stack / demo data:** Postgres + uvicorn :8000 + vite :5173 were up this session; **dev** DB
holds demo rows from verification (`hwteacher@`/`hwstudent@` + course "Алгебра 7 — обновлён";
`platform@`/`schooladmin@`/`tteacher@`/`sstudent@` + institution "Гимназия №1" with a "7А" group).
Harmless; clear when convenient.

---

## 1. Project & concept
Flamingo is a B2C online-education platform (pupils grades 1–11 + adults, plus parents, teachers, institution admins) for Russia/CIS; MVP locale `ru`. Its differentiator is **SEduM** — on-device attention analysis (CMF) where **raw biometrics never leave the device**. Current goal: build the MVP module-by-module per the build order in `CLAUDE.md` §10.
**Source of truth (read these):** [`CLAUDE.md`](../../CLAUDE.md) (the contract — privacy, 152-FZ, i18n, tokens, thin resolvers, per-resolver auth), `docs/Flamingo_Product_Brief_v1.md`, `docs/flamingo_erd.md` (data model, entities 1:1 to models), `docs/flamingo_schema.graphql` (API contract — codegen reads this), `docs/flamingo_architecture.md` (layers), `docs/FIRST_CLAUDE_CODE_SESSION.md`, design system in `docs/Flamingo_DesignSystem_v1.md` + `frontend/src/shared/styles/tokens.css` + `frontend/design-reference/*.jsx`.

## 2. Architecture state (what's actually wired)
**Backend** — Python 3.12, Django 5.1, Strawberry GraphQL (`strawberry-django`), PostgreSQL 16, JWT bearer auth, ASGI (uvicorn, HTTP only — no Channels/subscriptions yet, `backend/config/asgi.py`).
- Apps present: `backend/common/`, `backend/apps/{accounts,courses,scheduling,homework,institutions}`. Each app: `models.py`, `services.py` (logic+permissions), `graphql/{types,queries,mutations}.py`, `tests/`. (`courses` also has `access.py`, the `can_access_course` chokepoint.)
- Root schema: `backend/api/schema.py` composes **Accounts/Courses/Scheduling/Homework/Institutions** Query+Mutation mixins. **No `Subscription` type yet.**
- Migrations (all applied to dev Postgres, 0 unapplied): `accounts/0001`; `courses/0001`,`0002` (price/currency/access_status),`0003` (institution+group FKs); `scheduling/0001`,`0002` (group FK); `homework/0001`,`0002` (group FK); `institutions/0001`.
- Key models (`backend/apps/*/models.py`): accounts `User`/`*Profile`/`Guardianship`/`VerificationDocument`; courses `Course`/`Section`/`Lesson`/`Material`/`Enrollment` (+ nullable `price`/`currency`/`institution`/`group`); scheduling `LessonSession`(+nullable `group`)/`Attendance`; homework `Homework`(+nullable `group`)/`Submission`/`SubmissionFile`; institutions `Institution`/`InstitutionMembership`/`Group`/`GroupMembership`/`GroupTeacher`. Shared base in `backend/common/models.py`; enums in `backend/common/enums.py`; auth in `backend/common/auth.py`; cursor pagination `backend/common/pagination.py`; LiveKit token minting `backend/common/livekit.py`.
**Frontend** — TypeScript, React 18, Vite 6, Apollo Client, Redux Toolkit (UI state only), GraphQL Codegen (reads `docs/flamingo_schema.graphql` → `frontend/src/entities/graphql/generated.ts`, committed), i18next (`ru`, `frontend/src/i18n/`), CSS Modules on `tokens.css`.
- Layout: `frontend/src/app/` (store, apolloClient, router, providers, useLogout), `shared/ui` (design-system primitives incl. `TextArea`), `shared/lib` (env, session, refresh), `entities/graphql/generated.ts`, `features/{auth,cabinet,courses,schedule,homework,admin}`. i18n namespaces: `common,auth,cabinet,courses,schedule,homework,admin`.
- Auth: access token in memory, refresh token in `localStorage`, silent refresh on auth error (`frontend/src/app/apolloClient.ts`, `shared/lib/session.ts`, `shared/lib/refresh.ts`).
- **GraphQL drift caveat** (memory `sdl-vs-live-schema-drift`): accounts live type names are `*Type`-suffixed (`UserType`) vs SDL `User`; courses/scheduling/homework/institutions names match the SDL. FE ops are **fragment-free** and select only live-implemented fields. LiveKit video is mocked (no server); join only acquires a token.

## 3. Done (committed on `main`)
All green: **backend 57 pytest on Postgres + ruff + black clean; frontend `npm run build` + `npm run lint` + 25 vitest** (run from `backend/` and `frontend/`).
- **Foundation/infra** — `33ee20f` baseline, `e47c763` dev infra (compose/Dockerfiles/ruff+black), `f20b601`/`10df489` ruff+black on backend, `2e30420` ignore local settings.
- **Auth (vertical slice)** — backend `apps/accounts` was provided; FE `628fb88` scaffold+design-system, `9a98e77` auth screens (role-aware register/login/reset, auto-login), `e6f54f7` auth tests. `cb8f2ad`/`131942d` add Avatar/Badge/SelectField primitives.
- **Cabinets** — `2292513` role-aware cabinet shell + dispatch; **parent cabinet is functional** (view + add children with 152-FZ consent via `addChild`); student/teacher/admin show profile + honest empty-states.
- **Courses** — `10ce430` backend (`Course/Section/Lesson/Material/Enrollment`, full CRUD+reorder+publish+enroll+markLessonViewed, catalog pagination, 10 tests), `7bea480` FE (catalog/detail/enroll + teacher constructor), `794269d` `myCourses` (+ added to the SDL contract), `725f2de` constructor materials + delete section/lesson.
- **Scheduling** — `47bfae6` backend (`LessonSession`/`Attendance`, schedule/start/end/join/setAttendance, role-aware `mySchedule`, LiveKit tokens, 5 tests), `8e1e930` fix `from` arg, `17c5b6a` FE (schedule view + lifecycle + join; teacher schedules per-lesson from course detail).
- **Payment-readiness seams** — `be3c759` the **seams only** (no payment logic, no resolver gating, no SDL change): default-open chokepoint `backend/apps/courses/access.py: can_access_course(user, course)` + new `common.enums.AccessStatus` (active/pending_payment) + nullable `Course.price` (kopecks, null=free)/`Course.currency` + `Enrollment.access_status` (default active), migration `courses/0002`, 6 tests. Not wired into any resolver yet — `access.py` docstring lists the four un-routed call sites to route through it when gating arrives.
- **Homework/grades — backend** — `ec3d638` `apps/homework` (`Homework`/`Submission`/`SubmissionFile` per ERD §3.4, migration `0001`): create/update/publish/delete/submit/grade + queries (`homework`, `lessonHomework`, `homeworkSubmissions`, `mySubmissions`), 13 tests. **Student-side access (view/submit/grades) routed through `courses/access.py: can_access_course`** (resolved from the homework's course/lesson); teacher authority via the existing ownership helpers; `submissions`/`submissionStats` owner-gated. `lessonHomework` hand-added to the SDL; `group` field deferred to institutions; `fileKeys` stored as stub keys (no files module yet).
- **Homework/grades — frontend** — `1fdacf8` `frontend/src/features/homework/` (module now complete with `ec3d638`): `graphql/homework.graphql` fragment-free ops + regenerated hooks; `LessonHomeworkScreen` (route `/lessons/:lessonId/homework`, role-aware — teacher create/publish/delete + per-submission grading panel; student submit + status/grade) and `StudentHomeworkScreen` (route `/homework`, `mySubmissions` overview); routes + cabinet links (student `homework`→`/homework`, teacher `grading`→`/courses`) + per-lesson "Домашние задания" link in `CourseDetailScreen` + `ru/homework.json`; 3 vitest. **TEXT-only** end-to-end (FILE/QUIZ + homework-editing UI deferred); no backend/SDL change. Verified E2E in-browser: teacher create→publish→student submit→teacher grade→student sees grade.
- **Course constructor — reorder + edit** — `80c561b` FE-only (no backend/SDL/codegen change): section/lesson ▲▼ reorder controls (owner, boundary-disabled) wired to the pre-existing `useReorderSectionsMutation`/`useReorderLessonsMutation`; an `EditCourseForm` (`useUpdateCourseMutation`, any status); pure `move()` helper in `courses/ui/reorder.ts`; `manage.editCourse/save/moveUp/moveDown` i18n; +6 vitest (15→21). Browser-verified: section + lesson reorder and a title edit all persist across reload (DB-confirmed).
- **Institutions/admin — backend core (step a)** — `17dcfcd` new `apps/institutions` (`Institution`/`InstitutionMembership`/`Group`/`GroupMembership`/`GroupTeacher` per ERD §3.1/§3.3, migration `0001` — **new tables only**): admin-scoped services (`_admin_for`: admin manages only their own institution); back-office onboarding (`create_institution` staff-only; `add_admin` seeds the first admin, not GraphQL-exposed; invite→`update_membership` activates); groups + members + teacher assignment; GraphQL types/queries/mutations matching the SDL (no SDL edits); branding JSON stored-but-unused. 8 tests. **Reviews deferred to engagement; no `StudentProfile.institution` (derive from GroupMembership).** Per [`INSTITUTIONS_PLAN.md`](INSTITUTIONS_PLAN.md) decisions (Option A group model). **Step (c) admin FE is NOT done** (see §5).
- **Institutions/admin — cross-app FKs + access (step b)** — `5f12481` (schema: nullable `Course.institution`/`Course.group`, `LessonSession.group`, `Homework.group`, all FK→institutions `SET_NULL`; migrations `courses/0003`, `scheduling/0002`, `homework/0002`, additive — owner-approved & applied) + `ed580af` (behaviour: group→course access decided **inside `can_access_course`** — a student in the course's target group gets access; expose the SDL cross-app fields `Course.institution`/`LessonSession.group`/`Homework.group` + forward `HomeworkInput.groupId`; `Course.group` stays model-only). No SDL edit; FE codegen unaffected. +1 access test.
- **Institutions/admin — admin FE (step c)** — `628e786` (backend enabler: `me.adminProfile.institution` resolver from the active admin membership via `strawberry.lazy`; no migration/SDL edit; +1 test) + `15b5732` (FE: `frontend/src/features/admin/AdminInstitutionScreen` at route `/admin` — institution settings + stored-only branding color, members invite/approve/remove, groups create + add/remove students + assign teachers; `graphql/admin.graphql` + regenerated hooks; `ru/admin.json`; AdminCabinet nav wired; 2 vitest). **Module complete** (a+b+c). Verified live in-browser + via API (institution/members/groups render; `createGroup` round-trips).
- **Institutions/admin — remove-member guard** — `5531bc0` service-layer guard in `institutions/services.py` (`_guard_admin_removal`): `removeMember` raises a clear `ValidationError` for removing one's **own active admin** membership or the **last active admin** (covers every caller, incl. staff); non-admin/non-last removals unchanged. FE: `AdminInstitution` query selects `me.id` and the members list disables the "Удалить" button for own/last admin (ru tooltip). +3 backend, +1 vitest.
Verified E2E in-browser: register→login→`me`; parent add-child; teacher create→publish course→student enroll; schedule→start→student join (attendance row created); add lesson material.

## 4. In progress / partially built
Working tree is **clean** — nothing uncommitted. Partially-built *within* committed code:
- **FILE materials** — only TEXT/LINK materials are supported in the UI; FILE needs the files/S3 upload module (not built).
- **FILE/QUIZ homework** — homework UI is TEXT-only; FILE submissions need the files module, QUIZ needs a quiz model (neither built).

## 5. Next tasks (ordered, most important first)
- ✅ **DONE — Payments/billing seams** (`be3c759`, see §3). Seams only: default-open `courses/access.py: can_access_course` + nullable `Course.price`/`currency` + `Enrollment.access_status`. The full `billing` app and any payment/pricing/subscription/gating logic remain **out of scope until the monetization model is chosen** (still open — §8).
- ✅ **DONE — Homework/grades** (backend `ec3d638` + frontend `1fdacf8`, see §3). Module complete: models/services/GraphQL/migration + React assign/submit/grade UI; student access routed through `can_access_course`. TEXT-only (FILE/QUIZ + homework-editing UI deferred).
- ✅ **DONE — Course constructor reorder + edit** (`80c561b`, see §3). FE-only; the constructor is now feature-complete for MVP.
- ✅ **DONE — Admin / institutions** (backend `17dcfcd`/`5f12481`/`ed580af`/`628e786` + frontend `15b5732`, see §3). Module complete per [`INSTITUTIONS_PLAN.md`](INSTITUTIONS_PLAN.md) (Option A group model; reviews→engagement; back-office onboarding; branding stored-unused). Admin FE at `/admin`. Minor follow-up: guard an admin from removing their own/last admin membership (§3 note).
1. **SEduM Lite — CURRENT NEXT** (next per the build order; nothing started — no `apps/seedum`, no `frontend/src/seedum/`). New `apps/seedum` + `frontend/src/seedum/` (MediaPipe `FaceLandmarker` Web Worker, attention pipeline → **aggregates only**, UBP in IndexedDB, `reportAttention`, `attentionUpdates` **subscription**). Requires standing up **Django Channels** (`config/asgi.py` is HTTP-only today; first subscription work) + the live CMF room consuming the scheduling LiveKit tokens. Heavy/privacy-critical — plan-first and confirm scope before building. (Per `CLAUDE.md` §2/§7: raw biometrics never leave the device; no server endpoint accepts frames.)
2. **Cross-cutting later:** files/S3 module (presigned uploads — unblocks FILE materials + FILE homework), certificates (PDF+QR), engagement (points/leaderboard/**reviews** — REVIEW model deferred here), notifications.
- ✅ DONE — guard admin self/last-removal (`5531bc0`, see §3).

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
- **Cross-app GraphQL type cycle** — a resolver returning another app's GraphQL type both ways (e.g. `accounts.AdminProfileType.institution` → institutions, while institutions imports accounts `UserType`) creates an import cycle. Break it with a `TYPE_CHECKING` import + `Annotated["X", strawberry.lazy("module.path")]` (keep the quotes; `UP037` is per-file-ignored in `pyproject.toml` for `apps/accounts/graphql/types.py` because ruff would strip them and break schema build). See `628e786`.
- **Browser-driving the dev app**: hard `window.location.href` nav drops the in-memory access token (a hard reload then relies on silent refresh; `me` returns `null` for anonymous, which shows empty states, not an auth error). Prefer SPA nav after a fresh login, or expect a reload+refresh delay. Also: destructive admin buttons (`removeMember`, delete) are real — don't click them blindly while exploring (it deleted the seeded admin's own membership once).

## 8. Open questions for the product owner
- **Payments — monetization model (still open):** payment-readiness rules are now in `CLAUDE.md` (committed `eb5bcb4`). Still to decide before any billing logic: the **monetization model (simple vs marketplace)** and whether access is gated **per-course (`Course.price`) or by subscription**. Until decided, keep `can_access_course` default-open and `Enrollment.access_status` default `active`; secondary details still open (what flips `access_status` to active, trials/refunds, which actions gate).
- **Junior pupil signup:** currently a junior self-registers via `registerUser` using the parent's email as the login + a 152-FZ consent gate (MVP simplification). Confirm vs the "parent creates child via `addChild`" flow.
- ✅ **Group ↔ Course shape** (ERD §7) — DECIDED: Option A (`group_id` FK) for MVP; `CourseGroup` M2M deferred to official release. Built B-friendly (nullable FKs, group access only in `can_access_course`). Implemented in `5f12481`/`ed580af`.
- ✅ **Admin institution discovery** — RESOLVED (`628e786`): `me.adminProfile.institution` resolves from the active admin `InstitutionMembership` (no migration/SDL edit). The admin FE uses it as its entry point.
- **Composite dashboards** (`studentDashboard`/`teacherDashboard`/`adminDashboard` in the SDL) — still **unimplemented** (SDL-only). Implement fully once analytics/grades aggregation is wanted? (Not blocking: the admin entry point is already handled by `me.adminProfile.institution`.)
- **REVIEW app placement** (deferred, recommended in `INSTITUTIONS_PLAN.md`): reviews live in the future `engagement` app — confirm before building reviews/moderation. `TeacherProfile.review_count` / `Course.rating` return stubs until then.

## 9. How to resume
**Read first:** `CLAUDE.md`, this file, then `docs/flamingo_erd.md`, `docs/flamingo_schema.graphql`, `docs/flamingo_architecture.md` as needed. Memory files (`MEMORY.md`, `local-dev-stack.md`, `sdl-vs-live-schema-drift.md`) auto-load.

**Bring the stack up (native; full details in memory `local-dev-stack`):**
```bash
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 -l /opt/homebrew/var/log/postgresql@16.log start   # role+db 'flamingo' already exist
cd backend && export POSTGRES_HOST=localhost POSTGRES_USER=flamingo POSTGRES_PASSWORD=flamingo POSTGRES_DB=flamingo
.venv/bin/python manage.py migrate && .venv/bin/python -m pytest        # expect 54 passed
.venv/bin/uvicorn config.asgi:application --port 8000 --reload
# new shell: cd frontend && npm run dev   (proxies /graphql -> :8000; preview via .claude/launch.json)
# frontend gates: npm run build && npm run lint && npm test   (expect 24 vitest)
```

**Exact first prompt for the next session:**
> Resume the Flamingo build.
> 1. **Read first:** `CLAUDE.md` and `docs/handoff/SESSION_HANDOFF.md` §0 (current state) — then `docs/flamingo_erd.md` / `docs/flamingo_schema.graphql` as needed.
> 2. **Bring up the dev stack** per §9 (Postgres with `LC_ALL`, backend `uvicorn … --reload` on :8000, frontend `npm run dev` on :5173) and confirm green: backend `pytest` (expect **54 passed**) + `ruff`/`black`; frontend `npm run build`/`lint`/`test` (expect **24 vitest**).
> 3. **Next module is SEduM Lite** (build order; nothing started). It's heavy and privacy-critical (raw biometrics never leave the device; it needs the first **Django Channels**/subscription work) — so **plan-first**: investigate (`CLAUDE.md` §7, `docs/flamingo_erd.md` seedum entities, `docs/flamingo_schema.graphql` `attentionUpdates`/`reportAttention`), present a plan, and WAIT for my approval before building. Keep all tests green; backend-then-FE; commit per concern.
> 4. Alternatively, if I deprioritise SEduM, the next-best is the **files/S3 module** (presigned uploads — unblocks FILE materials + FILE homework) or **engagement** (points/leaderboard/reviews). Ask me which before starting.
