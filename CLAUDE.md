# CLAUDE.md — Flamingo

Repo guidance for Claude Code. Read this before writing code. Keep changes consistent with it.

## 1. What this is
Flamingo is a B2C online education platform (pupils grades 1–11 + adult course-takers, plus parents, teachers, institution admins). Markets: Russia & CIS. MVP locale: Russian.

The differentiator is **SEduM** — on-device attention analysis (CMF) that personalises learning under a strict privacy principle: **raw biometrics never leave the user's device**. Deferred to later iterations (DO NOT build now): blockchain/NFT, VR/AR, Open API (labs/observatories/drones), Neo4j recommendations, native mobile. MVP replaces NFT certificates with PDF + QR verification.

## 2. Non-negotiable principles
1. **On-device privacy (most important).** Camera/mic frames and frame-level biometric features (gaze, landmarks, expressions) are processed in the browser via MediaPipe and **never sent to the server**. The only thing that leaves the device is an aggregate: `{ sessionId, studentId, bucketStart, avgAttention }`. There must be **no server endpoint that accepts raw video/audio/frames**. UBP (biological passport) lives in IndexedDB; an optional cloud backup is **client-side encrypted** (server stores an opaque blob it cannot read).
2. **Data residency (152-FZ).** Personal data of users is stored on servers in the Russian Federation (Yandex Cloud). Do not introduce data stores for PII outside the RF region. Children < 18 require parental consent (`consent152fz`) captured at registration.
3. **i18n-ready from day one.** No hardcoded UI strings — everything goes through the i18n layer. `ru` is the only shipped locale, but the code must not assume it.
4. **Open source only.** No proprietary/closed dependencies.
5. **Language split.** Product/UI text = Russian. Code, comments, identifiers, technical docs, commit messages = English.
6. **Design tokens, not literals.** No hardcoded colors/sizes/fonts in UI — consume semantic tokens from `tokens.css` (see design system).

## 3. Stack
**Backend** — Python 3.12, Django 5, **Strawberry GraphQL** (`strawberry-django`), PostgreSQL 16, Celery + Redis, Django Channels (Redis channel layer) for GraphQL subscriptions over WebSocket (`graphql-ws`). ASGI (uvicorn). LiveKit (self-hosted) for video; the API only issues room tokens.
**Frontend** — **TypeScript**, React 18, Vite, **Apollo Client** (server cache/state), **Redux Toolkit** (local/UI state only), GraphQL Code Generator (typed operations), CSS Modules + `tokens.css` (no utility-CSS framework — the brand is custom). On-device ML: MediaPipe Tasks Vision (`FaceLandmarker`) in a Web Worker.
**Infra** — Docker + docker-compose (dev); Kubernetes later; Yandex Cloud; S3-compatible object storage (Yandex Object Storage; MinIO locally).

> Two decisions taken at this stage (brief left them open): **Strawberry** over Graphene (native async + subscriptions, type-hint-first, pairs with our typed schema) and **TypeScript** on the frontend (GraphQL codegen, safer refactors). Switchable, but the repo is written for these.

## 4. Repository layout (monorepo)
```
flamingo/
  backend/
    config/            # Django project: settings/, asgi.py, urls.py, celery.py
    common/            # BaseModel (uuid PK, timestamps, soft-delete), enums, permissions, storage (S3 keys)
    apps/
      accounts/        # USER, *_PROFILE, auth (JWT), GUARDIANSHIP, VERIFICATION_DOCUMENT
      institutions/    # INSTITUTION, INSTITUTION_MEMBERSHIP, GROUP, GROUP_MEMBERSHIP, GROUP_TEACHER
      courses/         # COURSE, SECTION, LESSON, MATERIAL, ENROLLMENT
      scheduling/      # LESSON_SESSION, ATTENDANCE, LiveKit room tokens
      homework/        # HOMEWORK, SUBMISSION, SUBMISSION_FILE, grading
      seedum/          # ATTENTION_METRIC, UBP_BACKUP, RECOMMENDATION, analytics rollups
      engagement/      # ACHIEVEMENT, USER_ACHIEVEMENT, POINT_EVENT, REVIEW, leaderboard
      certificates/    # CERTIFICATE + public verification
      notifications/   # NOTIFICATION, NOTIFICATION_PREFERENCE, channel fan-out
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
  CLAUDE.md
```
Models map 1:1 to `docs/flamingo_erd.md`. The API mirrors `docs/flamingo_schema.graphql` — treat that SDL as the contract; regenerate FE types from it.

## 5. Backend conventions
- All models extend `common.BaseModel`: `id: UUIDField(pk)`, `created_at`, `updated_at`; user-facing content adds `deleted_at` (soft delete via a manager that filters it out).
- Postgres native enums per ERD §4 (use `TextChoices` + DB-level enum or a single source enum module in `common/enums.py`).
- Files: store only the object **key** (string). Uploads go through `requestUpload` → presigned S3 URL → client uploads → mutation receives `fileKey`. Never stream file bytes through GraphQL.
- GraphQL resolvers stay **thin**: validate input, check permissions, delegate to a service function (`apps/<x>/services.py`). Business logic and DB writes live in services, not resolvers.
- **Authorization is server-side and per-resolver/field.** Never trust a client-provided role or id for access decisions. A student can only read their own metrics/submissions; a parent only their linked children (via `GUARDIANSHIP`); a teacher only their courses/groups; an admin only their institution.
- Celery tasks: recording post-processing, weekly parent digests, recommendation batch, certificate PDF generation. Redis is broker + channel layer.
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
- Aggregate to ~10-second buckets and emit `reportAttention({ sessionId, bucketStart, avgAttention })` (or the subscription channel). **Never** post frames, landmarks, or per-frame features anywhere.
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
python manage.py export_schema api.schema > ../docs/flamingo_schema.graphql   # keep SDL in sync
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
- Add any server path that receives raw video/audio/biometric frames.
- Store PII outside the RF region, or add non-approved data stores for PII.
- Hardcode UI strings (use i18n) or colors/sizes (use tokens).
- Add closed-source deps, or any deferred feature (blockchain/NFT, VR/AR, Open API, Neo4j, native mobile).
- Trust client-supplied role/ids for authorization; bypass per-resolver permission checks.
- Duplicate Apollo server state into Redux.

## 12. References (in `docs/`)
- `Flamingo_Product_Brief_v1.md` — product decisions (source of truth).
- `flamingo_ux_foundation_stage1.md` — user stories, flows, screen map (IDs).
- `flamingo_erd.md` — data model (entities map 1:1 to models).
- `flamingo_schema.graphql` — API contract.
- `Flamingo_DesignSystem_v1.md` + `tokens.css` + `FlamingoStyleguide.jsx` — UI system.
- `Flamingo_Brandbook_v1.md` — identity.
- `official-documents` skill — corporate document generation (certificates/letters).
