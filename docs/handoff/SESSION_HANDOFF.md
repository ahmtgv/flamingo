# Flamingo — Session Handoff

**Date:** 2026-06-17 · **Branch:** `main` · **Code HEAD:** `981dbfd` — *files/S3 presigned uploads (storage core + homework FILE submissions)*. This `docs(handoff)` commit sits on top as the latest commit on `main` (88 commits; run `git rev-parse HEAD` for its exact hash). Working tree clean.
This doc lets a fresh session resume cleanly. It references files by path — read those, don't rely on this doc alone.

---

## 0. Current state — read this first
✅ **SEduM Lite COMPLETE (a+b+c) — CMF browser-verified LIVE.** ✅ **LiveKit video room — slice 1
(1:1 + shared camera) AND slice 2 (group ≤5 + screen share) DONE & green, with all reported
regressions fixed.** ✅ **LiveKit slice 3 COMPLETE & green** — 3.1 connection lifecycle `404fc6f`,
harden/tidy `dcda4af`, 3.2 camera/mic permission + device errors `47d9e60`, 3.3 room a11y `3d4fea2`,
3.4 richer remote mute/camera-off `4af95f3` (this batch). Temporary diagnostic logs removed; tree clean.
**NEXT: the combined owner real-camera/real-network pass** (§5 item 1 — slice 2 + slice 3 behaviours;
nothing media/SR/network is mock-verified), then the **"prepare for real-user test"** milestone and
the cross-cutting modules (§5 items 2–3). The hard ≤5 server cap and recording remain out of scope.

✅ **Per-student teacher attention view + security fix (this batch, post real-run UX fix):**
- **`b2782ba` (backend, SECURITY):** the `LessonSession.attendance` field resolver was unscoped
  (`list(self.attendances.all())`) while `get_session` admits any participant — so any **enrolled
  student** could query `session{attendance{student{user{firstName lastName}}}}` and enumerate
  classmates' names (per-resolver-auth gap, CLAUDE.md §5 + minor-PII/152-FZ, pre-existing). Now
  `services.attendance_for(user, session)` returns the roster **only to the course owner**, else `[]`
  (+test: owner sees it, non-owner enrolled student & anon get `[]`). No model/SDL/migration.
- **`85ed82a` (FE feature):** the teacher view is now **per-student PRIMARY** — one card per student
  (real name + attention % + its own sparkline), live from `attentionUpdates`; class average demoted
  to a small secondary "Среднее по классу". Names come from a new fragment-free op `SessionAttendees`
  (`session{attendance{student{user{id firstName lastName}}}}`, owner-scoped per the fix above) +
  `npm run codegen` (FE types from the SDL — **not** an SDL regen); the `studentId→name` map also
  labels the video tiles (`VideoRoom.nameFor` → `VideoTile.displayName`); pure capped `pushSeries`
  helper. **Display-only — CMF/egress/`reportAttention` untouched; only the aggregate leaves.**
- **`b666fa4` (FE):** role-leak fix — `VideoRoom` takes a `liveBadgeLabel` prop (teacher no longer
  saw the student-facing "…преподаватель вас видит"); `room.teacherSub` reworded to per-student.
- **BACKLOG (do later, see §5):** audit other GraphQL field resolvers for the same unscoped
  `return list(self.X.all())` pattern.

✅ **Files/S3 presigned uploads — storage core + homework FILE submissions DONE & green (this batch):**
- **`e51d3eb` (a) storage core:** `common/storage.py` (the only S3 client — `presign_put` signs
  Content-Type, `presign_get`, `head`; TTLs PUT 10m/GET 5m); `apps/files` is **modelless (Option A —
  ERD-faithful, no migration)**: `services.PURPOSE_POLICY` = per-purpose ROLE gate + **owner-namespaced
  keys** (`<prefix>/<userId>/<uuid>/<file>`) + size/type limits; `requestUpload` implemented to the
  **already-existing SDL contract** (UploadTicket/UploadRequestInput/UploadPurpose — live schema diffed
  against the committed SDL, matches; **SDL NOT regenerated**). FE `shared/lib/useUpload()` +
  `RequestUpload` op + codegen (FE types from the existing SDL). `boto3` (runtime) + `moto` (tests)
  added. **Verified end-to-end against native MinIO:** presigned PUT 200, head correct, GET body
  matches, wrong-Content-Type PUT → 403.
- **`981dbfd` (b) homework FILE:** `submit_homework` binds keys with `assert_caller_key` (own namespace)
  + `validate_uploaded` (head: exists/size/type); `SubmissionFile.fileUrl` → presigned GET authorized to
  the submitting student OR owning teacher — **never a classmate** (test); student submit UI attaches
  files via `useUpload` → fileKeys.
- **Authz model:** `requestUpload` = role gate + owner-namespaced key; bind-time = key-prefix==caller +
  `head()` size/type; download = per-resolver auth on every `fileUrl`. **SEPARATE from CMF/egress** — no
  file path touches the worker/pipeline; `reportAttention` stays aggregate-only; no bytes through GraphQL.
- **Dev storage (no Docker):** native MinIO binary — `MINIO_ROOT_USER=flamingo
  MINIO_ROOT_PASSWORD=flamingo-secret minio server ~/.flamingo-minio --address :9000
  --console-address :9001`; `settings.S3` defaults to `http://localhost:9000` (env-switched to Yandex RF
  in prod). **Was running this session.** Tests use `moto` (no live server needed).
- **🔒 BACKLOG (do later, see §5; NOT built):** a bucket lifecycle rule to auto-expire **unbound**
  objects. Presigned PUT can't cap size pre-upload (`head()` rejects at bind, but the bytes are already
  written → orphans). If size-abuse ever matters, swap to presigned POST with `content-length-range`.
- **NEXT (files): (c) FILE materials, (d) avatars** — (d) needs the one approved **`setAvatar` SDL
  hand-add** (hand-edit `docs/flamingo_schema.graphql`, NOT regenerate). See §5.

**Slice 3.1 — connection lifecycle (`404fc6f`):** `useLiveKitRoom` now exposes one explicit
`connectionState` (idle/connecting/connected/reconnecting/reconnected/disconnected/failed) off
`RoomEvent.Reconnecting/Reconnected/Disconnected` (livekit-client 2.19.2) + a pure
`classifyDisconnect(reason)` (clean close vs fault). `rejoin()` re-runs ONLY the connect effect
(attempt counter) — never `release()`/re-acquire, so the shared `MediaStream` is retained and the
CMF pipeline (keyed on `[joined, stream, sessionId]`, NOT on `connected`) stays alive across a
reconnect; only the `{sessionId, bucketStart, avgAttention}` aggregate ever leaves. UI: a
non-blocking reconnecting/reconnected banner (`role=status`) + a terminal disconnected/failed
overlay + Rejoin (`role=alert`) rendered as SIBLINGS over the still-mounted `.tiles` (never the
`roomFull` early-return — the 7686a9c camera-loss hazard). Tokens-only CSS, ru copy in
`ru/lesson.json`. Frontend-only (no backend/SDL/codegen). **Verified by vitest only;** the real
network-drop → reconnect → CMF-continues path is an **OWNER REAL RUN** (mocks can't prove it) —
folded into the combined real-camera checklist in §5.

**Slice-2 regressions — all FIXED & verified this session:**
1. **Camera black-tile + CMF drop on screen-share** (`7686a9c`): the grid↔stage layout remounted the
   local `<video>` (lost `srcObject`), and a room unmount-on-refetch stopped the shared track. Fix:
   ONE stable `.tiles` container (grid↔filmstrip via `data-screen` CSS, screen stage is an *additional*
   element — no `<video>` remounts); callback-ref attach; loader only on initial load
   (`(meLoading||sessionLoading) && !session`) so the shared camera track is never stopped mid-session.
2. **Screen-share stage didn't collapse on stop** (`3367f6b`): `useLiveKitRoom` now features a screen
   track only while its `mediaStreamTrack` is LIVE, listens to `TrackPublished/TrackUnpublished`, and
   attaches an `'ended'` listener routing a native-bar stop through `setScreenShareEnabled(false)`.
3. **Teacher chart saw-tooth + polluted summary** (`890bf35`): pure helpers `features/lesson/
   attentionView.ts` (`classAverage` ignores 0/no-reading; `heldValue` holds last value across a 0
   bucket — no decay; `summaryStats` from real non-zero received buckets). TeacherRoom computes the
   report client-side from received buckets (dropped the backend `sessionAttention` call that counted
   stored zeros). No backend/SDL change.

**Verified vs not:** CMF live path, camera black-tile fix, teacher hold + clean summary
(85→hold-on-0→90; report Среднее 88/Пик 90/Минимум 85) = **browser-verified in `vite dev`**. Screen-share
**our-button** stop collapsing the stage = browser-verified. Screen-share **native-bar stop** and
**remote-stop** clearing the stage, and the full **multi-window grid (≤5) + cross-window screen share**
= **synthetic/code-verified only** (preview blocks a real camera + `getDisplayMedia`, and programmatic
`track.stop()` doesn't fire `'ended'`) → **owner should real-camera-confirm these** (steps in §5).

**CMF is confirmed live in `vite dev` with a REAL camera** (`21812ef`): worker READY → score →
BUCKET → reportAttention every ~10s with non-zero values, and the teacher's live "Внимание класса"
tracks the student's aggregate. **Root cause that had blocked it** (don't re-diagnose): the worker was
a CLASSIC (iife) worker, which only bundles in `vite build`; `vite dev` served it un-bundled and it
died on load ("Cannot use import statement outside a module"). Slice b only ever checked the prod
bundle, never camera-tested dev. **Fix:** MODULE worker + `forVisionTasks(wasmBase, useModule=true)`
(ES-module WASM `vision_wasm_module_internal.*`) + a dev-only Vite middleware serving `/seedum/wasm/*`
raw (MediaPipe's runtime `import()` otherwise hit Vite's `?import` → 500). Also fixed the LiveKit
StrictMode reconnect churn (`c9334d3`). See §3 + memory [[seedum-mediapipe-worker]].

**Both gates green** (verified this session): backend **80 pytest** on Postgres + **ruff** + **black**
clean, 0 unapplied migrations, `makemigrations --check` clean; frontend **`npm run build` + `lint` +
76 vitest**. Tree clean (all committed).

**LiveKit config (real creds are file-based, never committed):** `backend/.env` holds
`LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` (loaded via python-dotenv, `4c97997`);
`frontend/.env` holds `VITE_LIVEKIT_URL=wss://flamingo-atvyww1r.livekit.cloud`. Both `.env` are
git-ignored. `room_token` (reused as-is) signs a real LiveKit `VideoGrant` — test `0904ed0`.

**Browser-verified E2E** (dev stack, this session): teacher live view updated from a student
`reportAttention` over the WS subscription (class avg + per-student row + sparkline); `sessionAttention`
report rendered (avg/peak/low); student camera screen shows the privacy indicator and degrades to
"camera denied" gracefully. **Network inspection:** the only non-asset traffic is `POST /graphql/`
(queries/mutations) and the `/graphql/` WebSocket — **no request carries frames/video** (aggregates only).
The preview browser blocks the camera (`NotAllowedError`), so real MediaPipe face→score inference was
**not** exercised live here (build-verified only); the on-device egress path that the privacy invariant
governs IS fully verified.

**MVP build order status** (`CLAUDE.md` §10: `auth → cabinets → schedule → homework → admin → SEduM`):
auth ✅ · cabinets ✅ (parent functional; others shells) · courses ✅ · scheduling ✅ ·
homework ✅ (TEXT-only) · payment-readiness seams ✅ · course constructor ✅ ·
admin/institutions ✅ (module complete) · **SEduM Lite ✅ COMPLETE (a backend+realtime, b on-device
pipeline, c live CMF room).** Deferred follow-ups (not blocking): 3-stage «база тест» calibration
capture UI + encrypted UBP cloud backup wiring (see §4).

**Apps:** `backend/apps/` = accounts, courses, scheduling, homework, institutions, **seedum**.
**Frontend features:** `frontend/src/features/` = auth, cabinet, courses, schedule, homework, admin
(seedum FE lands in slices b/c). `api/schema.py` composes 6 Query/Mutation mixins **+ a
`Subscription` type** (`attentionUpdates`); ASGI now routes WebSocket (graphql-ws over Channels).

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
**Backend** — Python 3.12, Django 5.1, Strawberry GraphQL (`strawberry-django`), PostgreSQL 16, JWT bearer auth, ASGI (uvicorn). `config/asgi.py` is a `ProtocolTypeRouter`: **HTTP** stays on the Django app (so `JWTAuthMiddleware` runs); **WebSocket** (graphql-ws subscriptions over Channels) → Strawberry `GraphQLWSConsumer`. Channel layer: InMemory in dev, `channels_redis` env-switched (`CHANNELS_REDIS_URL`).
- Apps present: `backend/common/`, `backend/apps/{accounts,courses,scheduling,homework,institutions,seedum}`. Each app: `models.py`, `services.py` (logic+permissions), `graphql/{types,queries,mutations}.py` (`seedum` also `graphql/subscriptions.py`), `tests/`. (`courses` also has `access.py`, the `can_access_course` chokepoint.)
- Root schema: `backend/api/schema.py` composes **Accounts/Courses/Scheduling/Homework/Institutions/Seedum** Query+Mutation mixins **+ a `Subscription` type** (`attentionUpdates`, added in sub-slice (a)).
- Migrations (all applied to dev Postgres, 0 unapplied): `accounts/0001`; `courses/0001`,`0002` (price/currency/access_status),`0003` (institution+group FKs); `scheduling/0001`,`0002` (group FK); `homework/0001`,`0002` (group FK); `institutions/0001`; `seedum/0001` (`AttentionMetric`/`UbpBackup`/`Recommendation`).
- Key models (`backend/apps/*/models.py`): accounts `User`/`*Profile`/`Guardianship`/`VerificationDocument`; courses `Course`/`Section`/`Lesson`/`Material`/`Enrollment` (+ nullable `price`/`currency`/`institution`/`group`); scheduling `LessonSession`(+nullable `group`)/`Attendance`; homework `Homework`(+nullable `group`)/`Submission`/`SubmissionFile`; institutions `Institution`/`InstitutionMembership`/`Group`/`GroupMembership`/`GroupTeacher`. Shared base in `backend/common/models.py`; enums in `backend/common/enums.py`; auth in `backend/common/auth.py`; cursor pagination `backend/common/pagination.py`; LiveKit token minting `backend/common/livekit.py`.
**Frontend** — TypeScript, React 18, Vite 6, Apollo Client, Redux Toolkit (UI state only), GraphQL Codegen (reads `docs/flamingo_schema.graphql` → `frontend/src/entities/graphql/generated.ts`, committed), i18next (`ru`, `frontend/src/i18n/`), CSS Modules on `tokens.css`.
- Layout: `frontend/src/app/` (store, apolloClient, router, providers, useLogout), `shared/ui` (design-system primitives incl. `TextArea`), `shared/lib` (env, session, refresh), `entities/graphql/generated.ts`, `features/{auth,cabinet,courses,schedule,homework,admin,lesson}`, **`seedum/`** (on-device pipeline lib). `features/lesson` = the live CMF room (`/sessions/:sessionId/room`). i18n namespaces: `common,auth,cabinet,courses,schedule,homework,admin,seedum`. **Vendored ML assets in `frontend/public/seedum/`** (committed; `npm run vendor:seedum` to re-fetch).
- **Apollo split link** (`app/apolloClient.ts`): subscriptions → `graphql-ws` WebSocket (`GRAPHQL_WS_URL`, same-origin ws(s); JWT in `connectionParams.authToken`; `lazy`); queries/mutations → the authed+refreshing HTTP chain. Vite `/graphql` proxy forwards the WS upgrade (`ws: true`). The only subscription wired so far is `attentionUpdates`.
- Auth: access token in memory, refresh token in `localStorage`, silent refresh on auth error (`frontend/src/app/apolloClient.ts`, `shared/lib/session.ts`, `shared/lib/refresh.ts`).
- **GraphQL drift caveat** (memory `sdl-vs-live-schema-drift`): accounts live type names are `*Type`-suffixed (`UserType`) vs SDL `User`; courses/scheduling/homework/institutions names match the SDL. FE ops are **fragment-free** and select only live-implemented fields. LiveKit video is mocked (no server); join only acquires a token.

## 3. Done (committed on `main`)
All green (current gate counts live in §0 — this line no longer hard-codes them): **backend pytest on Postgres + ruff + black clean; frontend `npm run build` + `npm run lint` + vitest** (run from `backend/` and `frontend/`).
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
- **SEduM Lite — backend + realtime (sub-slice a)** — `42bf093` first subscription work + the aggregates-only backend. **Realtime:** `config/asgi.py` `ProtocolTypeRouter` (HTTP→Django incl. JWT middleware; WS→`GraphQLWSConsumer`), `channels` + `CHANNEL_LAYERS` (InMemory dev / `channels_redis` env), `api/schema.py` gains `Subscription` (`attentionUpdates`). Boot-verified: HTTP serves + WS `connection_init`→`connection_ack`. **`apps/seedum`** (`AttentionMetric`/`UbpBackup`/`Recommendation`, migration `0001`): `reportAttention` (**studentId derived from the auth user**, value clamped, publishes the aggregate to the `attention_<session>` channel group), `attentionUpdates` subscription (**teacher-only**, authed from graphql-ws `connection_params`), `sessionAttention` (teacher), `attentionAnalytics` (self/parent/teacher-of authz; bySubject/byWeekday/insights), rule-based `recommendations` + `dismissRecommendation`, opaque `backupUbp`/`ubpBackup`/`deleteUbpBackup` (base64; server never decrypts). `common.enums.InsightKind` added. **Privacy invariant TESTED** (AttentionInput is exactly {sessionId,bucketStart,avgAttention}; no frame/landmark/video field anywhere; reportAttention is the sole attention ingress). No SDL edits. **FE (a) had no UI; (b) below; (c) live room not built yet.**
- **SEduM Lite — on-device pipeline (sub-slice b)** — `09b6ace` (supersedes WIP `f747f88`). All in
  `frontend/src/seedum/` + vendored assets; **no backend/SDL change**. Deps: `@mediapipe/tasks-vision`
  + `idb` (OSS). **Assets vendored into the repo** (host-it-ourselves; outage-proof): `frontend/
  scripts/vendor-seedum-assets.mjs` (`npm run vendor:seedum`) copies the MediaPipe WASM runtime
  (SIMD + no-SIMD) from `node_modules` and downloads the float16 `face_landmarker.task` into
  `frontend/public/seedum/{wasm,models}/` (~25 MB, committed). **Pure/tested logic:** `bucketing.ts`
  (~10s aggregation), `score.ts` (scorer), `calibration.ts` (3-stage «база тест»), `ubp.ts` (UBP in
  IndexedDB **via `idb`** + WebCrypto AES-GCM/PBKDF2 — server only ever sees the opaque blob).
  **Worker:** `mediapipe.worker.ts` runs a real, typed `FaceLandmarker` behind the guarded adapter
  (bundled statically; any WASM/model load failure → `'unavailable'`, never a fabricated score);
  `attention.ts` is camera→worker orchestration (frames `bitmap.close()`d immediately). **Worker is a
  CLASSIC (iife) worker on purpose** — MediaPipe's WASM loader uses `importScripts`, absent in
  `{type:'module'}` workers (pinned `vite.config.ts worker.format:'iife'`; `attention.ts` creates the
  worker without `type:'module'`). Build-verified the emitted worker chunk bundles MediaPipe +
  `importScripts`. UI: `ui/PrivacyIndicator` (+test) + `AttentionChart`; `ru/seedum.json` + i18n reg.
  Privacy invariant absolute: no frame ingress; only the per-bucket aggregate + the user's own
  per-frame score (on-device) leave the worker; UBP on-device; backup client-encrypted.
  **Not browser-verified** (no camera/GPU in this env) — the guarded adapter degrades to `'unavailable'`
  rather than crash/fake if anything is missing; real inference gets exercised when (c) wires it in.
- **SEduM Lite — live CMF room (sub-slice c)** — `2a4f41a` (FE) + `718ea77` (backend fix). **No SDL
  change.** Apollo split link (`app/apolloClient.ts`): subscriptions → `graphql-ws` WebSocket,
  queries/mutations → the existing authed/refreshing HTTP chain; JWT in graphql-ws `connectionParams`
  (`authToken`, read by the subscription resolver); socket is `lazy`. `GRAPHQL_WS_URL` same-origin
  ws(s) default (`shared/lib/env`); Vite `/graphql` proxy now `ws: true`. New **`features/lesson`**:
  `LiveRoomScreen` at `/sessions/:sessionId/room` (role-aware). Student = camera + `startAttentionPipeline`
  (frames discarded on-device) + local `AttentionChart` (LOCAL per-frame score, not server) + each ~10s
  bucket → `reportAttention` (bucketStart mapped from the worker's performance-clock to wall-clock via
  `performance.timeOrigin`); loads on-device UBP baseline; guarded camera-denied / model-unavailable
  states. Teacher = `useAttentionUpdatesSubscription` → live per-student rows + class average + sparkline;
  "Отчёт по занятию" → `sessionAttention` (avg/peak/low + chart). `PrivacyIndicator` on both views.
  Schedule wiring: student "Подключиться" joins then enters the room; teacher "Эфир класса" (LIVE) /
  "Отчёт внимания" (ENDED). FE ops `features/lesson/graphql/liveroom.graphql` (fragment-free) + regen;
  `ru/schedule.json` += `actions.room/report`. +2 vitest. **Backend fix `718ea77`:** `attentionUpdates`
  resolver must enter `listen_to_channel` with `async with` (it's an async context manager, not an
  iterator) — sub-slice (a) shipped this untested; extracted `stream_attention()` + regression test.
  Browser-verified E2E + network inspection (only aggregates leave; see §0).
- **LiveKit video room — slice 1 (1:1 + shared camera)** — `32c61da` (FE) + `0904ed0` (backend token test) + `4c97997` (dotenv config). **No SDL change.** `livekit-client` (Apache-2.0, headless). Config: `VITE_LIVEKIT_URL` (`shared/lib/env`, real value in `frontend/.env`); backend `LIVEKIT_*` in `backend/.env`. Token reuses `LessonSession.roomToken` (`room_token_for`) via a new fragment-free `SessionRoom` query. **`features/lesson/livekit/useLiveKitRoom.ts`** connects + publishes our own getUserMedia tracks + toggles + leave. **Shared-camera composition:** ONE `getUserMedia({video,audio})` → LiveKit publish AND the on-device CMF pipeline (frames discarded; aggregates only). Camera toggle flips the shared `track.enabled` (pauses publish + CMF together). UI `ui/{VideoRoom,VideoTile,RoomControls}` on tokens; student keeps the CMF chart, teacher keeps the attention panel. **Privacy copy SPLIT** (honest): blanket "видео не покидает устройство" removed; CALL badge "Камера в эфире — преподаватель вас видит" (`lesson` ns); CMF indicator rescoped to attention analysis and **kept** (still true). Tests: `useLiveKitRoom` (publish both tracks + toggles), composition test (one getUserMedia → both consumers), token-grant test.
- **LiveKit slice 1 — CMF dev fix + camera verify + reconnect fix** — `21812ef` + `9df72e9` (logs removed) + `c9334d3`. The CMF pipeline had **never run in `vite dev`** (the worker was classic → ESM `import` SyntaxError on load; only bundles in `vite build`). Fix: **MODULE worker** (`vite worker.format:'es'` + `new Worker(url,{type:'module'})`) + `FilesetResolver.forVisionTasks(wasmBase, true)` (ES-module WASM `vision_wasm_module_internal.*`, vendored; classic SIMD/no-SIMD dropped) + a **dev-only Vite middleware `serveSeedumWasmRaw`** (`apply:'serve'`) serving `/seedum/wasm/*` raw (MediaPipe's runtime `import()` else hit Vite's `?import` → 500; prod serves /public as-is). Effect stabilized: `reportAttention` via a ref (out of worker-recreation deps). **Browser-verified LIVE in `vite dev` with a real camera** (worker READY → score → BUCKET → reportAttention every ~10s, non-zero; teacher live panel tracks it; network = aggregates only). `c9334d3` fixes the LiveKit StrictMode connect→leave→reconnect churn (disconnect only after the in-flight connect settles; dev-quality, prod single-connects). Memory [[seedum-mediapipe-worker]] updated (classic→module). **Slice 1 fully done & camera-verified.**
- **LiveKit slice 2 — group (≤5) + screen share** — `de9e60f` (FE only; no backend/SDL change; CMF + privacy split untouched). `useLiveKitRoom` adds `toggleScreenShare` (`setScreenShareEnabled` — **additive**: separate getDisplayMedia track; camera + CMF keep running; screen never feeds CMF), `screenShare`/`activeSpeakers`/`screenSharing`, and a **≤5 soft guard** (`roomFull` disconnects the 6th; hard cap server-side deferred). `VideoRoom`: ≤5 grid → screen main-stage + camera filmstrip when anyone shares; `VideoTile` active-speaker ring + mic-mute badge; `RoomControls` screen-share toggle (teacher always + student on-demand UI gate — both have canPublish). `ru/lesson.json` += screenShare/presenting. +2 vitest (additive screen share; ≤5 guard). Joined-room render covered by the slice-1 composition test. **Real-browser E2E (grid + screen share live) owner-pending.**
- **LiveKit slice 2 — screen-share remount regression FIX** — `7686a9c` (FE only; no backend/SDL change). The grid↔stage swap had remounted the local `<video>` (and the `srcObject` attach was keyed on `[localStream]`, not re-run on remount) → black camera tile; and `LiveRoomScreen`'s `if (meLoading||sessionLoading) return null` could unmount the room on a refetch → `useSharedCamera` stops the shared track → CMF→0 + cross-window desync. Fix: (1) ONE stable `.tiles` container, grid↔filmstrip via `data-screen` CSS, screen stage as an additional element (no `<video>` remounts; stable keys); (2) callback-ref attach on local self-view + `TrackVideo` (re-attach on any mount); (3) loader only on initial load (`(meLoading||sessionLoading) && !session`) so a refetch can't unmount the joined room / stop the camera track (tracks stop ONLY on real leave). Verified in `vite dev` (synthetic): screen-share start→stop keeps the local tile attached + CMF posting (rows grew 324→332), no remount/unmount. The temporary `[CAM]`/`[ROOM]` diagnostic logs were **removed in `980f298`** (scan confirms none remain in source) once both regressions were confirmed (see §0).
Verified E2E in-browser (earlier sessions): register→login→`me`; parent add-child; teacher create→publish course→student enroll; schedule→start→student join (attendance row created); add lesson material.

## 4. In progress / partially built
Working tree is **clean** — nothing uncommitted. Partially-built *within* committed code:
- **FILE materials** — the files/S3 module now exists (§0); FILE materials are sub-slice (c) of files (§5 item 3), not yet wired into `addMaterial`/`Material.fileUrl`. TEXT/LINK work today.
- **FILE/QUIZ homework** — homework UI is TEXT-only; FILE submissions need the files module, QUIZ needs a quiz model (neither built).
- **SEduM calibration UI deferred** — the «база тест» 3-stage calibration (`seedum/calibration.ts` state machine exists, tested) is NOT wired into the room: the worker emits only score/bucket aggregates, not the raw `AttentionSignals` the `Calibration` needs, so capturing a baseline needs a worker "calibration mode" that emits per-stage signals + a 3-step UI. The room **loads** an existing UBP baseline (none exists until calibration ships → raw scoring used). Plan §6.1 recommended deferring this.
- **Encrypted UBP cloud backup deferred** — `seedum/ubp.ts` has WebCrypto encrypt/decrypt and the backend `backupUbp`/`ubpBackup`/`deleteUbpBackup` exist, but there's no FE op/UX wiring (and nothing to back up until calibration produces a baseline). Plan §6.2 recommended a minimal version; deferred with calibration.

## 5. Next tasks (ordered, most important first)
- ✅ **DONE — Payments/billing seams** (`be3c759`, see §3). Seams only: default-open `courses/access.py: can_access_course` + nullable `Course.price`/`currency` + `Enrollment.access_status`. The full `billing` app and any payment/pricing/subscription/gating logic remain **out of scope until the monetization model is chosen** (still open — §8).
- ✅ **DONE — Homework/grades** (backend `ec3d638` + frontend `1fdacf8`, see §3). Module complete: models/services/GraphQL/migration + React assign/submit/grade UI; student access routed through `can_access_course`. TEXT-only (FILE/QUIZ + homework-editing UI deferred).
- ✅ **DONE — Course constructor reorder + edit** (`80c561b`, see §3). FE-only; the constructor is now feature-complete for MVP.
- ✅ **DONE — Admin / institutions** (backend `17dcfcd`/`5f12481`/`ed580af`/`628e786` + frontend `15b5732`, see §3). Module complete per [`INSTITUTIONS_PLAN.md`](INSTITUTIONS_PLAN.md) (Option A group model; reviews→engagement; back-office onboarding; branding stored-unused). Admin FE at `/admin`. Minor follow-up: guard an admin from removing their own/last admin membership (§3 note).
- ✅ **DONE — SEduM Lite (a + b + c)** (plan: [`SEDUM_LITE_PLAN.md`](SEDUM_LITE_PLAN.md); owner approved full scope). (a) backend+realtime `42bf093`; (b) on-device pipeline `09b6ace`; (c) live CMF room `2a4f41a` + backend fix `718ea77` — all see §3. Browser-verified E2E + network inspection (only aggregates leave; §0). **Deferred follow-ups (not blocking, see §4):** «база тест» calibration capture UI + encrypted UBP cloud-backup wiring. If picked up: the worker needs a calibration mode that emits per-stage `AttentionSignals`; then a 3-step UI feeds `seedum/calibration.ts`, saves the baseline to UBP (IndexedDB), and optionally `backupUbp` (client-encrypted).
1. **LiveKit video room — slices 1, 2 & 3 COMPLETE & green** (owner-approved plan; LiveKit Cloud free-tier for MVP, self-host in RF before prod for 152-FZ/OSS). Slice 3 (3.1 lifecycle + harden + 3.2 perm/device + 3.3 a11y + 3.4 remote mute/cam-off) all landed this batch — see the per-sub-slice notes below. **What remains is the combined owner real-camera/real-network pass (next bullet) — no media/SR/network behaviour is mock-verified.** **Slice 1** (`32c61da`/`0904ed0` + dev fixes `21812ef`/`9df72e9`/`c9334d3`): 1:1 video + shared-camera composition at `/sessions/:sessionId/room`; CMF camera-verified live; reconnect churn fixed. **Slice 2** (`de9e60f`): group ≤5 grid, screen share (teacher always + student on-demand UI gate; additive — camera/CMF keep running), active-speaker ring, mic-mute badge, ≤5 soft guard (`roomFull`). **Demo:** `cmf.teacher@`/`cmf.student@flamingo.dev` (`strongpass1!`), LIVE session `aa781c61-a00c-4219-880f-dfa7c81c182c`. **Slice 2 real-browser E2E (grid + screen share live) is owner-pending** (preview blocks camera).
   - ✅ **Slice 3.1 — connection lifecycle states (`404fc6f`, DONE & green):** `useLiveKitRoom.connectionState` + `classifyDisconnect`; `rejoin()` (attempt-counter, no release → CMF survives); reconnecting/reconnected banner + disconnected/failed Rejoin overlay as siblings over the still-mounted tiles; ru copy; tokens-only. +11 vitest (48→59). Real network-drop→reconnect→CMF-continues = owner real run (combined checklist below).
   - ✅ **Harden/tidy (`dcda4af`):** real CSS tokens (dropped non-existent `--color-danger-*`/`--color-on-accent` + a `#fff`); settle-timer regression test (a disconnect mid-reconnected-window stays disconnected); §3 hygiene. +1 vitest.
   - ✅ **Slice 3.2 — camera/mic permission + device errors (DONE & green this batch):** pure `features/lesson/mediaError.ts` `classifyMediaError` (NotAllowed/Security→denied, NotFound/Overconstrained→notFound, NotReadable/Abort→inUse, else generic); `useSharedCamera` now returns a typed `cameraError`; a `CameraErrorNote` (`role=alert`) shows the classified ru message + a Retry that re-acquires (reuses `seedum:room.cameraDenied` for denied). +4 vitest. Real deny/unplug/in-use = owner real run.
   - ✅ **Slice 3.3 — room accessibility (DONE & green this batch):** the project's **first `aria-live`** region — one persistent visually-hidden polite `role="status"` (`.srOnly`) announces transient states (reconnecting/reconnected); the visible banners are now `aria-hidden` decoration (no double-announce); the terminal overlay keeps assertive `role="alert"` (mutually exclusive with the polite region). Focus moves to **Rejoin** when the overlay opens (`Button` forwards ref). `RoomControls` is a labelled `role="group"`; buttons are native + ru `aria-label` (keyboard-operable). No new motion introduced (the reconnecting indicator is static by design) → reduced-motion needs no special handling. +1 vitest. Screen-reader + keyboard-only = owner real run.
   - ✅ **Slice 3.4 — richer remote mute / camera-off (`4af95f3`, DONE & green):** `useLiveKitRoom` subscribes `TrackMuted`/`TrackUnmuted` (additive `sync`) so a remote toggle bumps `version` and the tile re-reads live; `VideoTile` shows a `VideoOff` camera-off placeholder (no track OR muted) and is one accessible unit (`role="img"` + ru `aria-label` naming the participant + muted/camera-off state). +5 vitest. Live cross-window reflection = owner real run. **Out of scope (NOT built):** hard ≤5 cap server-side (`livekit-api` `RoomService(max_participants=5)`) + recording (LiveKit Egress).
   - **Key files:** `features/lesson/livekit/useLiveKitRoom.ts` (exports `RoomConnectionState`/`classifyDisconnect`), `ui/{VideoRoom,VideoTile,RoomControls}.tsx`, `ui/LiveRoomScreen.tsx` (role-aware compose + `useSharedCamera`), `ru/lesson.json`. Token via `SessionRoom` query (`LessonSession.roomToken`); LiveKit URL via `VITE_LIVEKIT_URL` (env, not SDL).
   - **Combined owner real-camera/real-network pass (ONE run; everything below is synthetic/code-verified only — no media/SR/network behaviour is mock-verified):** preview blocks a real camera + `getDisplayMedia` and a programmatic `track.stop()` doesn't fire `'ended'`, so confirm with real hardware/AT:
     - *(slice 2)* **(a)** screen-share **native-bar** stop and **remote** stop both collapse the stage; **(b)** full **multi-window grid (≤5)** with 2+ real cameras; **(c)** **cross-window screen share**.
     - *(3.1)* **(d)** a real **network drop** → reconnecting banner → auto-recover with `reportAttention` **continuing across the blip** (DevTools Network: only the aggregate, no frames), and a terminal disconnect → **Rejoin** restoring a live call with the camera still running.
     - *(3.2)* **(e)** **deny** the camera/mic permission, **unplug** the camera (NotFound), and **hold it in another app** (NotReadable) → each shows the correct ru message and **Retry** recovers.
     - *(3.3)* **(f)** a **screen-reader** pass (reconnecting/reconnected announced politely; disconnected announced assertively; focus lands on Rejoin), **keyboard-only** operation of the controls, and the **OS reduced-motion** setting.
     - *(3.4)* **(g)** a participant in **another window** mutes mic / turns off camera → the badge + camera-off placeholder update **live** in the first window.
     - Already browser-verified (§0), not part of this pass: our-button screen-share stop, the camera black-tile fix, CMF live, the teacher hold/summary.
2. **"Prepare for real-user test" milestone (separate from slice 3 — do whichever the owner prioritises):** the app currently only runs on `localhost` with seeded demo accounts. To put it in front of a real pupil/teacher: (a) **expose the dev stack** — a tunnel (e.g. cloudflared/ngrok over vite :5173 + the `/graphql` HTTP+WS proxy) for a quick test, or a real deploy (backend ASGI + Postgres + the LiveKit creds) for anything durable; (b) **real email/SMTP** — registration today auto-logs-in with no verification and no mail is sent, so wire an SMTP provider + a verify-email step before strangers register; (c) **real registration flow** — exercise sign-up → consent (152-FZ for <18) → role cabinet end-to-end with a fresh account (not the seeded demo users), and confirm the junior-signup question in §8 is resolved first. None of this is started.
3. **Files/S3 module — (a) storage core + (b) homework FILE submissions DONE & green** (`e51d3eb`, `981dbfd`; see §0). **Remaining sub-slices (one concern each):**
   - **(c) FILE materials:** `addMaterial` — for `type=FILE` require + validate a `file_key` (caller-namespaced, MATERIAL purpose, `head()`); `Material.fileUrl` → presigned GET authorized via `courses/access.py: can_access_course` (enrolled students + owner). FE: material-add upload via `useUpload(file, 'MATERIAL')`. No SDL change (MaterialInput already takes `file_key`).
   - **(d) Avatars:** **hand-add `setAvatar(fileKey: String!): User!`** to `docs/flamingo_schema.graphql` (NOT `export_schema`); `setAvatar` validates the key is the caller's own `avatar/<userId>/…` namespace, writes `avatar_key` to the role profile; `User.avatarUrl` → presigned GET. FE: profile avatar upload via `useUpload(file, 'AVATAR')`.
   - Key files: `apps/files/services.py` (`assert_caller_key`/`validate_uploaded` reuse), `common/storage.py`, `shared/lib/useUpload.ts`. Dev: run native MinIO (see §0/§9).
4. **Other cross-cutting (pick per owner priority):** **certificates** (PDF+QR public verification — `official-documents` skill), **engagement** (points/leaderboard/**reviews** — REVIEW model lives here per `INSTITUTIONS_PLAN.md`), **notifications** (the `notificationReceived`/`sessionStatusChanged`/`chatMessageReceived` subscriptions share the now-working graphql-ws infra). Composite dashboards still SDL-only (§8).
- ✅ DONE — guard admin self/last-removal (`5531bc0`, see §3).
- 🔒 **BACKLOG (security audit, not started):** sweep all GraphQL field resolvers for the unscoped
  `return list(self.X.all())` pattern that exposed the attendance roster (fixed in `b2782ba`). Any
  field returning related rows on an object that a non-owner can fetch (e.g. via a participant-scoped
  `get_*`) must apply per-resolver auth. Candidates to check: course/section/lesson child lists,
  institution memberships/groups, homework submissions. Confirm each is owner/role-scoped or returns
  `[]`/own-rows for non-owners. (Do NOT trust object-level reachability as the only gate.)

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
.venv/bin/python manage.py migrate && .venv/bin/python -m pytest        # expect 80 passed
.venv/bin/uvicorn config.asgi:application --port 8000 --reload
# new shell: cd frontend && npm run dev   (proxies /graphql -> :8000 incl. WS upgrade; preview via .claude/launch.json)
# frontend gates: npm run build && npm run lint && npm test   (expect 76 vitest)
# seedum assets are committed under frontend/public/seedum/; re-vendor only if missing: npm run vendor:seedum
# files/S3 (presigned uploads): for a REAL upload, run native MinIO (no Docker):
#   MINIO_ROOT_USER=flamingo MINIO_ROOT_PASSWORD=flamingo-secret minio server ~/.flamingo-minio \
#     --address :9000 --console-address :9001    (then create the 'flamingo' bucket once)
#   settings.S3 defaults to http://localhost:9000; tests use moto (no server needed).
# LiveKit: real creds live in backend/.env (LIVEKIT_API_KEY/SECRET/URL) + frontend/.env (VITE_LIVEKIT_URL);
#   both git-ignored. After editing backend/.env, RESTART uvicorn (settings load .env at import).
# Live-room E2E needs a LIVE LessonSession + an enrolled student; see this session's demo rows below (§0/§5).
```

**Demo rows from this session** (dev DB; harmless, clear when convenient): `cmf.teacher@flamingo.dev` /
`cmf.student@flamingo.dev` (password `strongpass1!`), course "CMF демо — Алгебра 7", LIVE
`LessonSession` id **`aa781c61-a00c-4219-880f-dfa7c81c182c`**. Open the room at
**`http://localhost:5173/sessions/aa781c61-a00c-4219-880f-dfa7c81c182c/room`** (log in as each account in a
separate window). CMF was **browser-verified with a REAL camera** this session (worker READY → score →
~10s `reportAttention` buckets with non-zero values; teacher live class avg tracked the student). The
synthetic preview browser blocks the camera + `getDisplayMedia` — the items in §0/§5 marked
"synthetic/code-verified only" still want an owner real-camera pass.

**Exact first prompt for the next session:**
> Resume the Flamingo build.
> 1. **Read first:** `CLAUDE.md` and `docs/handoff/SESSION_HANDOFF.md` §0 (current state) + §5 (next tasks); then `docs/flamingo_erd.md` / `docs/flamingo_schema.graphql` / `docs/flamingo_architecture.md` as needed.
> 2. **Bring up the dev stack** per §9 (Postgres with `LC_ALL`, backend `uvicorn … --reload` on :8000, frontend `npm run dev` on :5173) and confirm green: backend `pytest` (expect **80 passed**) + `ruff`/`black`; frontend `npm run build`/`lint`/`test` (expect **76 vitest**).
> 3. **LiveKit video room: slices 1, 2 & 3 COMPLETE & green** (3.1 `404fc6f`, harden `dcda4af`, 3.2 `47d9e60`, 3.3 `3d4fea2`, 3.4 `4af95f3`; §0/§5 item 1). **The next action is the COMBINED owner real-camera/real-network pass** (§5 item 1, items a–g: screen-share native/remote stop, multi-window grid ≤5, cross-window share, network-drop→reconnect with CMF continuing, permission/device errors + Retry, screen-reader/keyboard/reduced-motion, live remote mute/camera-off) — nothing media/SR/network is mock-verified. **After that pass**, pick from §5: finish **files/S3** (item 3 — (a) storage core + (b) homework FILE are DONE; **(c) FILE materials, (d) avatars** remain), the **"prepare for real-user test"** milestone (item 2 — tunnel/deploy + real SMTP + registration flow), or the **other cross-cutting** modules (item 4 — certificates, engagement, notifications). Hard ≤5 cap server-side + recording stay **out of scope**. Keep CLAUDE.md invariants (CMF privacy, ru i18n, design tokens, thin resolvers, no SDL regen, OSS-only); gates green; commit per concern.
