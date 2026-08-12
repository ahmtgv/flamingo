# AGENTS.md — Flamingo

Repo guidance for Codex. Read this before writing code. Keep changes consistent with it.

## 1. What this is
Flamingo is a B2C online education platform (pupils grades 1–11 + adult course-takers, plus parents, teachers, institution admins). Markets: Russia & CIS. MVP locale: Russian.

The differentiator is **SEduM** — on-device attention analysis (CMF) that personalises learning under a strict privacy principle: **raw biometrics never leave the user's device**. **Roadmap change — owner decision 2026-08-08:** VR/AR, game mechanics, and external-device integration (observatories/telescopes, drones, manipulators — the former "Open API" track) are **no longer deferred**; they are in the current roadmap. They are still built **in phase order**, never opportunistically — see `docs/handoff/OWNER_SCOPE_2026-08.md` and the phase charter `docs/handoff/PROMPT_11_sedum_and_subjects.md`. Every external device is integrated through **one shared abstraction** (`ExternalDevice`), never as a per-vendor hack, and each is a feature registered in the jurisdiction matrix. Still deferred (DO NOT build now): blockchain/NFT, Neo4j recommendations, native mobile. MVP replaces NFT certificates with PDF + QR verification.

## 2. Non-negotiable principles
1. **On-device privacy (most important).** Camera/mic frames and frame-level biometric features (gaze, landmarks, expressions) are processed in the browser via MediaPipe and **never sent to the server** — **no raw frames/audio/landmarks/per-frame features ever leave the device.** The only thing that leaves the device is a per-bucket **aggregate** of derived scalars: `{ sessionId, studentId, bucketStart, avgAttention, gazeOnScreen, eyeOpenness, headYaw, headPitch, alertness }` (all per-bucket aggregate scalars — never raw, never per-frame). The sub-metrics beyond `avgAttention` are **live-only**: broadcast for the realtime teacher view but **NOT persisted** — the server stores only `avgAttention` (`studentId` is derived from the authenticated user, never trusted from input). There must be **no server endpoint that accepts raw video/audio/frames**. UBP (biological passport) lives in IndexedDB; an optional cloud backup is **client-side encrypted** (server stores an opaque blob it cannot read).
2. **Storage policy (owner decision 2026-08-12) — as binding as on-device privacy.** **Never stored, anywhere:** lesson **video**, lesson **audio**, and the **verbatim speech transcript**. Speech is processed **as an in-memory stream** solely to build the lesson summary — no file on disk, no DB row, buffer cleared after the summary is assembled; browser `SpeechRecognition` stays banned (it would ship audio to Google). **Stored (whitelist — everything else needs an owner decision):** (1) lesson **summaries**, with the **lesson chat as a section inside the summary**; (2) **boards / mind-maps**, teaching guides, attached materials, tests; (3) **chats** — subject, pupil↔teacher, pupil↔pupil; (4) **student work** — homework, lab work, test answers, every attempt and retake; (5) **grades, indicators, progress, achievements**; (6) **SEduM** `avg_attention` buckets. Enforced by `test_storage_policy.py` next to `test_privacy.py`: it fails if a model or schema type for recordings, audio chunks or raw transcripts appears. Do not name new types `*Recording`, `*Audio*`, `*Transcript*`.
3. **Data residency (152-FZ).** Personal data of users is stored on servers in the Russian Federation (Yandex Cloud). Do not introduce data stores for PII outside the RF region. Children < 18 require parental consent (`consent152fz`) captured at registration.
4. **i18n-ready from day one.** No hardcoded UI strings — everything goes through the i18n layer. `ru` is the only shipped locale, but the code must not assume it.
5. **Open source only.** No proprietary/closed dependencies.
6. **Language split.** Product/UI text = Russian. Code, comments, identifiers, technical docs, commit messages = English.
7. **Design tokens, not literals.** No hardcoded colors/sizes/fonts in UI — consume semantic tokens from `tokens.css` (see design system).

## 3. Stack
**Backend** — Python 3.12, Django 5, **Strawberry GraphQL** (`strawberry-django`), PostgreSQL 16, Redis (Django Channels channel layer) for GraphQL subscriptions over WebSocket (`graphql-ws`). ASGI (uvicorn). LiveKit (self-hosted) for video; the API only issues room tokens. **Celery is DEFERRED** — no async tasks/worker are built yet (Redis is used only as the Channels layer, not a Celery broker).
**Frontend** — **TypeScript**, React 18, Vite, **Apollo Client** (server cache/state), **Redux Toolkit** (local/UI state only), GraphQL Code Generator (typed operations), CSS Modules + `tokens.css` (no utility-CSS framework — the brand is custom). On-device ML: MediaPipe Tasks Vision (`FaceLandmarker`) in a Web Worker.
**Infra** — Docker + docker-compose (dev); Kubernetes later; Yandex Cloud; S3-compatible object storage (Yandex Object Storage; MinIO locally).

> Two decisions taken at this stage (brief left them open): **Strawberry** over Graphene (native async + subscriptions, type-hint-first, pairs with our typed schema) and **TypeScript** on the frontend (GraphQL codegen, safer refactors). Switchable, but the repo is written for these.

## 4. Repository layout (monorepo)
```
flamingo/
  backend/
    config/            # Django project: settings.py + settings_test.py (a MODULE, not a settings/ package), asgi.py, urls.py (no celery.py — async is DEFERRED)
    common/            # BaseModel (uuid PK, timestamps, soft-delete), enums, permissions, storage (S3 keys)
    apps/              # BUILT: accounts, institutions, courses, scheduling, homework, seedum, files
      accounts/        # USER, *_PROFILE, auth (JWT), GUARDIANSHIP, VERIFICATION_DOCUMENT, REVOKED_TOKEN
      institutions/    # INSTITUTION, INSTITUTION_MEMBERSHIP, GROUP, GROUP_MEMBERSHIP, GROUP_TEACHER
      courses/         # COURSE, SECTION, LESSON, MATERIAL, ENROLLMENT
      scheduling/      # LESSON_SESSION, ATTENDANCE, LiveKit room tokens
      homework/        # HOMEWORK, SUBMISSION, SUBMISSION_FILE, grading
      seedum/          # ATTENTION_METRIC, UBP_BACKUP, RECOMMENDATION, analytics rollups
      files/           # presigned S3 upload tickets + bind-time validation
      # --- FORWARD-PLAN (NOT built yet; models/apps to add later) ---
      # engagement/    # ACHIEVEMENT, USER_ACHIEVEMENT, POINT_EVENT, REVIEW, leaderboard
      # certificates/  # CERTIFICATE + public verification
      # notifications/ # NOTIFICATION, NOTIFICATION_PREFERENCE, channel fan-out
    api/               # schema.py (root), each app exposes graphql/{types,queries,mutations,subscriptions}.py
    tests/
    pyproject.toml  Dockerfile
  frontend/
    src/
      app/             # store, apolloClient, router, providers
      shared/          # ui/ (design-system components), styles/tokens.css, hooks/, lib/
      entities/        # graphql/ operations + generated types, domain models
      features/        # auth, dashboard, courses, schedule, lesson, homework, analytics, admin, notifications, profile
      seedum/          # mediapipe.worker.ts, attention pipeline, ubp (IndexedDB), calibration
      i18n/            # ru.json, i18n setup
    codegen.ts  vite.config.ts  package.json  Dockerfile
  infra/
    docker-compose.yml # postgres, redis, livekit, minio, backend, frontend
    k8s/               # later
  docs/                # product brief, UX foundation, ERD, schema.graphql, design system, brandbook
  AGENTS.md
```
Models map 1:1 to `docs/flamingo_erd.md`. The API mirrors `docs/flamingo_schema.graphql` — treat that SDL as the contract; regenerate FE types from it.

## 5. Backend conventions
- All models extend `common.BaseModel`: `id: UUIDField(pk)`, `created_at`, `updated_at`; user-facing content adds `deleted_at` (soft delete via a manager that filters it out).
- Postgres native enums per ERD §4 (use `TextChoices` + DB-level enum or a single source enum module in `common/enums.py`).
- Files: store only the object **key** (string). Uploads go through `requestUpload` → presigned S3 URL → client uploads → mutation receives `fileKey`. Never stream file bytes through GraphQL.
- GraphQL resolvers stay **thin**: validate input, check permissions, delegate to a service function (`apps/<x>/services.py`). Business logic and DB writes live in services, not resolvers.
- **Authorization is server-side and per-resolver/field.** Never trust a client-provided role or id for access decisions. A student can only read their own metrics/submissions; a parent only their linked children (via `GUARDIANSHIP`); a teacher only their courses/groups; an admin only their institution.
- Celery tasks (**DEFERRED — not built**): recording post-processing, weekly parent digests, recommendation batch, certificate PDF generation. Email/reset currently run inline (stubs). Redis is the Channels layer only (no Celery broker until async lands).
- Subscriptions (`attentionUpdates`, `sessionStatusChanged`, `chatMessageReceived`, `notificationReceived`) run over Channels; `attentionUpdates` payloads are aggregates only.

## 6. Frontend conventions
- Server state via Apollo (cache-first); **local/UI state** (toggles, wizard steps, theme/age mode) via Redux Toolkit. Don't duplicate server data into Redux.
- Use **generated GraphQL types** for every operation — no `any`, no hand-written response types. Run codegen after schema changes.
- UI built from the **design-system components** in `shared/ui` (mirrors `FlamingoStyleguide.jsx`). Styling = CSS Modules consuming `tokens.css`. Only semantic tokens (`--color-*`, `--radius-*`, …); never raw hex/px.
- **Age adaptation**: set `data-mode="kids"` on the root for grades 1–4; size/leading/tap tokens cascade automatically. Content-level adaptation (bigger icons, fewer words, subject colors) is per-component (see design system §6.1).
- Accessibility: visible focus-ring on all interactive elements, ARIA labels, keyboard nav, `prefers-reduced-motion` (WCAG 2.1 AA target).
- Charts: inline SVG on tokens (attention live/report, analytics). Match the prototype approach.

## 7. SEduM / CMF implementation rules (read before touching anything CMF)
- MediaPipe `FaceLandmarker` runs in `seedum/mediapipe.worker.ts` (Web Worker, WASM). It computes an attention score from gaze/pose/expression **locally**.
- Aggregate to ~2.5-second buckets (tunable in `seedum/cmfConfig.ts`) and emit `reportAttention({ sessionId, bucketStart, avgAttention, gazeOnScreen, eyeOpenness, headYaw, headPitch, alertness })` (or the subscription channel) — **per-bucket aggregate scalars only**. The sub-metrics are live-only (broadcast, not persisted); only `avgAttention` is stored. **Never** post frames, landmarks, or per-frame features anywhere.
- UBP is persisted in IndexedDB. Cloud backup (`backupUbp`) encrypts client-side (WebCrypto) before upload; the server keeps an opaque blob + `keyHint`.
- The live student chart is fed from the local pipeline. The teacher's class view is fed by students' aggregates via `attentionUpdates`.
- Always show the on-device privacy indicator in any camera-using screen.

## 8. Commands
```bash
# dev environment (postgres, redis, livekit, minio, api, web)
docker compose -f infra/docker-compose.yml up

# backend
cd backend
python manage.py migrate
uvicorn config.asgi:application --reload          # ASGI (HTTP + WS)
python manage.py export_schema api.schema                                     # INSPECT the live schema only
# NOTE: docs/flamingo_schema.graphql is a HAND-MAINTAINED forward contract — do NOT
# overwrite it with export_schema. It intentionally leads the live schema (extra ops/types not yet
# resolved) and differs cosmetically (User vs UserType, ID vs UUID). Record drift; hand-edit the SDL.
pytest
ruff check . && black .

# frontend
cd frontend
npm run dev
npm run codegen        # regenerate types from docs/flamingo_schema.graphql
npm run build
npm run lint
npm test               # Vitest + React Testing Library
```

## 9. Standards
- Python: `ruff` + `black`, type hints everywhere, small functions, no logic in resolvers.
- TS: `eslint` + `prettier`, functional components + hooks, no `any`.
- Tests: cover models, services, **permission boundaries**, and the **privacy invariant** (assert no resolver/endpoint accepts raw media). FE: critical components and flows.
- Conventional Commits (`feat:`, `fix:`, `chore:` …); one module/concern per PR.
- Secrets via env only; never commit credentials. `.env.example` documents required vars.

## 10. Build order (MVP)
`auth → role cabinets → schedule/lessons → homework/grades → admin → SEduM Lite`.
A module is done when: models + migrations, services, GraphQL types/queries/mutations (+ subscriptions where relevant) matching the SDL, FE feature wired with generated types and design-system UI, permission tests, and i18n strings — all in place.

## 11. Do NOT
- Store lesson video, lesson audio, or a verbatim speech transcript — see §2.2. Speech is stream-processed for the summary only.
- Add any persisted entity outside the §2.2 storage whitelist without an explicit owner decision.
- Redesign approved screens: atlas sheets **00** (start page), **01** (subject cabinet), **02** (english live room), **12** (sources) are the **design contract** — implement them, do not reinvent them.
- Add any server path that receives raw video/audio/biometric frames.
- Store PII outside the RF region, or add non-approved data stores for PII.
- Hardcode UI strings (use i18n) or colors/sizes (use tokens).
- Add closed-source deps, or any still-deferred feature (blockchain/NFT, Neo4j, native mobile). VR/AR, game mechanics and external devices are now in-roadmap — build them **only when the current phase calls for them**, through the shared `ExternalDevice` abstraction, and register each as a feature in the jurisdiction matrix.
- Trust client-supplied role/ids for authorization; bypass per-resolver permission checks.
- Duplicate Apollo server state into Redux.

## 12. References (in `docs/`)
- `docs/design-previews/atlas/00_start.html` · `01_subject.html` · `02_english_room.html` · `12_sources.html` — **approved UI/UX contract** (owner, 2026-08-12); each sheet carries a "what is decided" block with the owner's answers.
- `docs/handoff/PROMPT_13_release_v1.md` — active release plan (R0–R5).
- `Flamingo_Product_Brief_v1.md` — product decisions (source of truth).
- `flamingo_ux_foundation_stage1.md` — user stories, flows, screen map (IDs).
- `flamingo_erd.md` — data model (entities map 1:1 to models).
- `flamingo_schema.graphql` — API contract.
- `Flamingo_DesignSystem_v1.md` + `tokens.css` + `FlamingoStyleguide.jsx` — UI system.
- `Flamingo_Brandbook_v1.md` — identity.
- `official-documents` skill — corporate document generation (certificates/letters).

## Future: Payments / Billing (NOT implemented yet — do not build now)

Payments will be integrated later, after the monetization model is chosen
(simple vs marketplace). Do NOT implement any payment, provider, payout,
subscription, or pricing logic until explicitly asked. But build every module
"payment-ready":

- Every "can this user access this course / lesson / material / grade" decision
  MUST go through a single function `courses/access.py: can_access_course(user, course)`
  (or a shared permission class). Never scatter access checks across resolvers —
  payment gating will later be added in this one place.
- Treat `Enrollment.access_status` (active / pending_payment, default active) and
  `Course.price` / `Course.currency` (nullable, null = free) as the integration
  points. If present, respect them; never bypass them.
- All billing/payment code lives inside a dedicated `billing` app. Nothing
  payment-related goes into `courses` or `accounts`.
- Target market RU/CIS: future provider YooKassa; store money as integer minor
  units (kopecks); fiscal receipts (54-FZ) required. Keep money handling
  provider-agnostic behind the `billing` boundary.
