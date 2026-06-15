# Plan (DRAFT — owner review) — SEduM Lite

**Status:** investigation + plan only. **Nothing implemented.** Built plan-first per request;
STOP and wait for owner approval (and the §6 decisions) before any code. SEduM is the
differentiator and is **privacy-critical** — the design is anchored on the node principle below.

## 1. Contract summary (verified against the repo)
- **`CLAUDE.md` §2.1 (most important principle) + §7:** camera/mic frames and frame-level
  biometric features (gaze, landmarks, expressions) are processed **in the browser via MediaPipe
  (`seedum/mediapipe.worker.ts`, WASM Web Worker) and NEVER sent to the server**. The only thing
  that leaves the device is an aggregate `{ sessionId, studentId, bucketStart, avgAttention }`
  (~10s buckets) via `reportAttention` / the `attentionUpdates` channel. **No server endpoint may
  accept raw video/audio/frames.** UBP (biological passport) lives in IndexedDB on-device; the
  optional cloud backup is **client-side encrypted** (WebCrypto) — the server stores an opaque blob
  + `keyHint` it cannot read. Always show the on-device privacy indicator on any camera screen.
- **ERD §3.5 / §6 entities (seedum app):** `ATTENTION_METRIC {lesson_session_id, student_user_id,
  bucket_start, avg_attention int 0–100}` (index (student, bucket_start)); `UBP_BACKUP {user_id,
  encrypted_blob bytea, key_hint, updated_at}` (opaque to server); `RECOMMENDATION {user_id, kind
  enum, title, payload jsonb, dismissed}`. **Not stored server-side:** raw video/audio, frame-level
  features, plaintext UBP.
- **SDL (`docs/flamingo_schema.graphql`) — already defines the whole contract** (no SDL edits
  expected): types `AttentionMetric`, `AttentionPoint/Summary`, `AttentionAnalytics`,
  `SubjectAttention`, `DailyAttention`, `Recommendation`, `UbpBackup`; inputs `AttentionInput
  {sessionId, bucketStart, avgAttention}`, `UbpBackupInput {encryptedBlob, keyHint}`; queries
  `attentionAnalytics`, `sessionAttention`, `recommendations`, `ubpBackup`; mutations
  `reportAttention(AttentionInput!): Boolean!`, `backupUbp`, `deleteUbpBackup`,
  `dismissRecommendation`; and **`type Subscription { attentionUpdates(sessionId): AttentionMetric!
  · sessionStatusChanged · chatMessageReceived · notificationReceived }`**.
- **Scheduling / LiveKit today (`apps/scheduling`):** `LessonSession` lifecycle
  `start_session`→`join_session`(student → roomToken + ATTENDANCE)→`end_session`; `room_token_for`
  mints a LiveKit JWT (`common/livekit.py`); **LiveKit is mocked (no media server)** — join only
  acquires a token. `LessonSession.roomToken`/`SessionJoin` exist; `attentionSummary` is on the SDL
  session type.
- **Infra reality:** `config/asgi.py` is **HTTP-only** (`get_asgi_application()`); `api/schema.py`
  builds `strawberry.Schema(query, mutation)` with **no `subscription=`**. BUT the deps are already
  present (`requirements.txt`: `channels>=4.1`, `channels-redis>=4.2`, `uvicorn[standard]`,
  `redis`; `strawberry.channels` importable). So sub-slice (a) is **wiring, not installing**.
  Redis is **not running natively** (docker-only) → dev uses an in-memory channel layer.

## 2. ⚠️ Node-principle compliance (the design anchor — do NOT violate)
1. **No frame ingress.** Do NOT add any mutation/endpoint/field that accepts video, audio, images,
   landmarks, or per-frame features. `reportAttention` accepts EXACTLY `AttentionInput {sessionId,
   bucketStart, avgAttention}` — nothing else. A test asserts the seedum schema exposes no media
   field and `AttentionInput` has only those 3 fields.
2. **Aggregates only leave the device.** Bucketing (~10s) + the attention score happen in the Web
   Worker; only `avgAttention` (int 0–100) per bucket is emitted. `attentionUpdates` payload is
   `AttentionMetric` (aggregate), never video.
3. **UBP stays on-device.** UBP + per-frame analysis + calibration live in IndexedDB. `backupUbp`
   uploads only a **client-side-encrypted** blob; the server never decrypts (stores `encrypted_blob`
   + `key_hint`). No plaintext UBP field anywhere server-side.
4. **Privacy indicator** is mandatory on every camera-using screen.
5. **Authz:** a student reports only their **own** metrics (`studentId` derived from the auth'd user,
   not trusted from input); only the **session's teacher** may `attentionUpdates`-subscribe;
   `attentionAnalytics`/`ubpBackup` are self-only (or parent-of-child / teacher-of-course per
   `CLAUDE.md` §5).

## 3. Proposed split into sub-slices (NOT one big drop)
### (a) Channels + subscription infra + attention metrics backend — *backend only*
- `backend/config/asgi.py` — `ProtocolTypeRouter`: keep HTTP (`get_asgi_application`) + add a
  `websocket` route to a Strawberry GraphQL-WS consumer (`strawberry.channels.GraphQLWSConsumer`
  with the root schema), JWT-authenticated from the graphql-ws `connection_init` params (reuse
  `common/auth.py`).
- `backend/config/settings.py` — add `channels` to `INSTALLED_APPS`; set `ASGI_APPLICATION`;
  `CHANNEL_LAYERS` = in-memory for dev (env-switch to `channels_redis` for prod).
- `backend/api/schema.py` — `strawberry.Schema(query=…, mutation=…, subscription=Subscription)`;
  compose a `SeedumSubscription` (`attentionUpdates`) [+ later `sessionStatusChanged` etc.].
- `backend/apps/seedum/` (new) — `models.py` (`AttentionMetric`, `UbpBackup`, `Recommendation` per
  ERD; reuse `common.enums.RecommendationKind`), migration `0001` (new tables only); `services.py`
  (`record_attention` — persist + publish to channel group `attention.{sessionId}`;
  `attention_analytics`, `session_attention`; `backup_ubp`/`delete_ubp_backup`/`get_ubp_backup`);
  `graphql/{types,queries,mutations,subscriptions}.py` (`reportAttention`, `attentionAnalytics`,
  `sessionAttention`, `backupUbp`, `deleteUbpBackup`, `ubpBackup`, `attentionUpdates`). Wire
  `SeedumQuery/Mutation/Subscription` into `api/schema.py`.
- **Tests:** `reportAttention` persists an `AttentionMetric` + publishes; only the auth'd student's
  id is stored; teacher-only subscribe; **privacy-invariant test** (no media field; `AttentionInput`
  shape); `schema.subscribe` smoke test for `attentionUpdates`. No ML.
- Commit: `feat(seedum): channels infra + attention metrics backend (reportAttention/attentionUpdates)`.

### (b) On-device pipeline — *frontend only*
- `frontend/src/seedum/mediapipe.worker.ts` — Web Worker; MediaPipe Tasks Vision `FaceLandmarker`
  (WASM); per-frame gaze/pose/expression → attention score; **aggregate to ~10s buckets**; post only
  `{ bucketStart, avgAttention }` to the main thread (never frames/landmarks).
- `frontend/src/seedum/attention.ts` — orchestration (camera `MediaStream` → worker → bucket
  emitter); `frontend/src/seedum/bucketing.ts` — **pure** aggregation fn (unit-tested).
- `frontend/src/seedum/ubp.ts` — UBP in IndexedDB (`idb`); calibration baseline; `backupUbp`
  (WebCrypto encrypt → opaque upload) *if in scope (§6.2)*.
- `frontend/src/seedum/calibration.ts` — calibration (scope per §6.1).
- `frontend/src/seedum/ui/AttentionChart.tsx` (inline SVG on tokens) + `PrivacyIndicator.tsx`.
- **New deps (open-source):** `@mediapipe/tasks-vision`, `idb` (and `graphql-ws` in slice c). See §6.3.
- **Tests:** bucketing unit test; worker mocked. Commit: `feat(seedum): on-device MediaPipe attention pipeline + UBP (aggregates only)`.

### (c) Live CMF room — *frontend, wires (a)+(b) into the lesson UI*
- `frontend/src/app/apolloClient.ts` — add a `graphql-ws` WebSocket link + `split()` (subscriptions
  → WS, queries/mutations → HTTP); JWT in `connectionParams`.
- New live-room screen (extend `features/schedule` or new `features/lesson`): **student view** =
  camera + pipeline + local live `AttentionChart` (fed by the local pipeline, NOT the server) +
  privacy indicator; each bucket → `reportAttention`. **Teacher view** = `attentionUpdates`
  subscription → live class attention (per-student / class average). Post-session: `sessionAttention`
  → `AttentionSummary` chart. `ru/seedum.json`.
- **Tests:** vitest for the room screen with a mocked subscription. Commit: `feat(seedum): live CMF room — student pipeline + teacher attentionUpdates`.

## 4. File paths touched (summary)
Backend (a): `config/asgi.py`, `config/settings.py`, `api/schema.py`, new `apps/seedum/**`.
Frontend (b): new `src/seedum/**`, `package.json` (deps). Frontend (c): `app/apolloClient.ts`,
new live-room feature, `src/entities/graphql/*.graphql` + codegen, `i18n/` (+`seedum` namespace),
`features/schedule` wiring.

## 5. Suggested commit sequence
1. (a) backend channels + attention metrics — green (pytest incl. privacy invariant).
2. (b) on-device pipeline — green (vitest bucketing; build/lint).
3. (c) live room + apollo WS link — green (vitest; manual browser check of a live session).
Each its own commit; backend-then-FE; handoff updated per slice.

## 6. Owner questions (decide before building)
1. **"База тест" (3-stage baseline):** the Product Brief MVP includes a 3-stage baseline test to
   establish the learner's attention baseline. In **this** slice or a **follow-up**? *Recommend:* a
   minimal single-pass calibration in Lite (enough to normalize scores); full 3-stage as a follow-up.
2. **Encrypted UBP cloud backup:** in scope or deferred? *Recommend:* include the **backend** opaque
   `backupUbp`/`ubpBackup`/`deleteUbpBackup` (cheap, locks in the privacy contract) + a **minimal**
   FE WebCrypto encrypt/backup; defer restore-UX polish. (Or defer FE entirely and stub.)
3. **New FE dependencies** (`@mediapipe/tasks-vision`, `idb`, `graphql-ws`) — all OSS; OK to add?
   (MediaPipe ships sizable WASM/model assets — host locally per "open-source only".)
4. **Dev channel layer:** use `InMemoryChannelLayer` for native dev (Redis isn't run locally),
   `channels_redis` for prod? *Recommend:* yes (env-switched).
5. **Recommendations:** ship only the `Recommendation` model + `recommendations` (empty) +
   `dismissRecommendation`, and **defer the generation engine** (rule-based batch over
   ATTENTION_METRIC + grades) to a follow-up? *Recommend:* yes.
6. **Scope of subscriptions in slice (a):** just `attentionUpdates` now, or also wire
   `sessionStatusChanged` / `chatMessageReceived` / `notificationReceived` (they share the same
   infra)? *Recommend:* `attentionUpdates` only for Lite; others when their features land.

## 7. Verification approach (when built)
Backend `pytest` (persist/publish, authz boundaries, **privacy invariant**: no media field, input
shape) + `ruff`/`black`; frontend `build`/`lint`/`vitest` (bucketing, room screen). Browser E2E:
teacher starts a session → student joins, grants camera, sees the local live chart + privacy
indicator → teacher sees `attentionUpdates` live → end → `sessionAttention` report. Confirm via
network inspection that **only aggregates** (no frames) ever hit the server.
