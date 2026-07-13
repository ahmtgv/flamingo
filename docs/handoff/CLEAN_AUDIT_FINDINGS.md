# CLEAN_AUDIT_FINDINGS — deep code-cleanliness & robustness inventory

**Prompt #6, Phase 1 (INVENTORY — nothing deleted).**
Date: 2026-07-13 · Branch: `chore/ertc-preview-launch-config` · HEAD at audit: `80b18b9`

## Baseline (gates at audit time)
| Gate | Result |
|---|---|
| backend `pytest` | **89 passed**, 3 warnings (`InsecureKeyLengthWarning`) |
| backend `ruff check .` | All checks passed |
| backend `makemigrations --check --dry-run` | No changes detected |
| frontend `vitest run` | **115 passed** (26 files) |
| frontend `npm run codegen` | no diff (generated.ts up to date) |

> **Baseline correction.** Prompt #6 states "было: 88 pytest / 121 vitest". Actual current is **89 pytest / 115 vitest**. The +1 pytest is the A-C security test added in prompt #2; the −6 vitest is the B-3 / SEduM-reshape test deletions (AttentionStrip / AttentionBreakdown / HeadPoseBox / ClassField). Both are expected, not a regression.

## Method / tools
- Frontend dead code: `npx knip` (files, exports, deps, types), `npx depcheck` (deps), plus targeted `grep` for CSS/i18n/routes.
- Backend dead code: `ruff` (F401/F841), `vulture --min-confidence 80` (installed into the git-ignored `.venv`; no repo change).
- SDL drift: `python manage.py export_schema api.schema` → diff vs committed `docs/flamingo_schema.graphql` (committed file NOT regenerated).
- Secrets: `git log -p -S 'LIVEKIT_API_SECRET' --all`, `-S api_secret`, tracked-`.env` check.
- All scratch output lives outside the repo; working tree confirmed clean after scanning.

## Verdict legend
- **SAFE** — proven zero-reference; safe to delete/fix in Phase 2 after re-grep + gate.
- **KEEP-DORMANT** — SEduM-NG / future API surface, intentionally unwired; do not delete.
- **KEEP-PLANNED** — forward contract or planned feature (SDL / CLAUDE.md roadmap); do not delete.
- **KEEP** — false positive or intentional (barrel API, vendored asset, reference material).
- **NEEDS-DECISION** — see the dedicated section at the end.

---

## AREA A — DEAD CODE / DEPS / ASSETS / i18n / CSS

### A1 — Dead files / modules
| Item | Evidence | Verdict |
|---|---|---|
| `frontend/design-reference/*.jsx` (7 prototypes) | knip "unused files"; not imported by app | **KEEP** — cited by 5 docs (`Flamingo_DesignSystem_v1.md`, `flamingo_architecture.md`, `FIRST_CLAUDE_CODE_SESSION.md`, `SESSION_HANDOFF.md`, `CLAUDE.md`); canonical design source |
| `frontend/public/seedum/wasm/vision_wasm_module_internal.js` | knip "unused file" | **KEEP** — MediaPipe WASM glue loaded at runtime by the worker; part of the intentional vendored ~15 MB `public/seedum/` (do-not-touch) |
| Backend modules | `vulture` 80% → 0 dead modules/functions | **CLEAN** — no dead backend files |

**A1 = no files to delete.**

### A2 — Unused imports / variables
| Item | Evidence | Verdict |
|---|---|---|
| Backend imports/vars | `ruff` (F401/F841) clean | **CLEAN** |
| `backend/apps/seedum/tests/test_seedum.py:251` | `vulture` 100%: unused `groups`, `type_` (tuple unpack) | **SAFE** (trivial test tidy; optional) |
| Frontend imports/vars | `eslint` clean (gate green) | **CLEAN** |

### A3 — Dead exports (frontend, knip)
| Symbol | Location | Evidence | Verdict |
|---|---|---|---|
| `setTheme` | `src/app/uiSlice.ts:48` | 0 external refs (grep) | **SAFE** — dead Redux action |
| `UI_ROLES` | `src/features/auth/model/roles.ts:6` | 0 external refs | **SAFE** |
| `isEmail` | `src/features/auth/model/validation.ts:32` | 0 external refs | **SAFE** |
| `MAX_PARTICIPANTS` | `src/features/lesson/livekit/useLiveKitRoom.ts:23` | 0 external refs | **SAFE** |
| `saveUbp`, `clearUbp` | `src/seedum/ubp.ts:39,43` | knip unused; UBP cloud-backup API | **KEEP-DORMANT** (SEduM-NG) |
| `Calibration`, `CALIBRATION_STAGES`, `CalibrationResult`, `CalibrationStage` | `src/seedum/*` (via `index.ts`) | knip unused | **KEEP-DORMANT** (calibration wizard, SEduM-NG) |
| `average`, `BUCKET_MS`, `Bucketer`, `bucketStartFor`, `engagementScore`, `BucketAggregate`, `PipelineCallbacks`, `PipelineHandle`, `HeadState`, `AttentionSignals`, `Baseline` | `src/seedum/index.ts` re-exports | knip flags the *barrel* re-export; underlying symbols imported directly from source modules | **KEEP** (barrel API; verify per-item before any trim) |
| `shared/ui/index.ts` prop-type re-exports (`AvatarProps`, `BadgeProps`, `ButtonProps`, `ButtonSize`, `ButtonVariant`, `InputProps`, `TextFieldProps`, `TextAreaProps`, `SelectProps`, `SelectFieldProps`, `CheckboxProps`, `SegmentedOption`, `SegmentedProps`) | `src/shared/ui/index.ts` | knip "unused exported types" | **KEEP** — design-system public API surface (intentional) |
| `defaultNS`, `resources` | `src/i18n/index.ts:15,19` | knip unused | **NEEDS-DECISION** — likely feed react-i18next module type augmentation; verify a `.d.ts` `typeof resources` before touching |

### A3 — Dead / redundant / undeclared dependencies
| Dep | Where | Evidence | Verdict |
|---|---|---|---|
| `celery>=5.3` | `backend/requirements.txt:7` | **0 usage** — no `config/celery.py`, no `tasks.py`, no `@shared_task`, no `CELERY_*` in settings | **NEEDS-DECISION** — 100% unused, but CLAUDE.md §5 plans Celery tasks (digests, recommendations, cert PDF) |
| `redis>=5.0` | `backend/requirements.txt:8` | no direct import; only reachable transitively via `channels-redis` / `celery` | **NEEDS-DECISION** — redundant standalone pin |
| `channels>=4.1`, `channels-redis>=4.2` | `requirements.txt:9,10` | used in `config/settings.py:22,39` (env-gated `RedisChannelLayer`) | **KEEP** |
| `graphql-ws` | imported `src/app/apolloClient.ts:13` | **NOT in package.json**; present only transitively (4 lockfile entries) | **SAFE (add)** — declare as explicit dependency (fragile as transitive-only) |
| `@graphql-codegen/typescript*` (3) | package.json devDeps | depcheck "unused devDeps" | **KEEP** — false positive; referenced by `codegen.ts` plugins |

### A4 — Unused assets
Only the WASM glue above (A1). No stray images/fonts. **CLEAN.**

### A5 — i18n orphan keys
396 leaf keys. Automated full-path scan flags 100 "unreferenced", but **~90 % are dynamically-composed enum lookups** and are live:
- `t(\`status.${x}\`)` (schedule:124, admin:194, courses:68), `t(\`level.${x}\`)` (courses:66,97; CourseDetail:105), `t(\`roles.${role}.title|desc\`)` (auth RoleSelect:44-45, Register:97), `t(\`ageBand.${x}\`)` (ParentCabinet:176,179), `t(\`role.${x}\`)` (admin:193), `t(\`camera.error.${kind}\`)`.
- ⇒ families `admin:status.*`, `auth:roles.*`, `auth:register.age.*`, `cabinet:ageBand.*`, `courses:level.*`, `homework:status.*`, `schedule:status.*` = **KEEP** (dynamic).

**Genuinely-dead literal candidates (0 code refs):**
| Key | Evidence | Verdict |
|---|---|---|
| `common:actions.continue` | leaf `continue` → 0 refs | **SAFE** |
| `seedum:room.enableCamera` (and likely `room.stop`, `room.live`) | camera controls moved to `lesson:camera.*` in the monochrome reshape; `enableCamera` → 0 refs | **NEEDS-DECISION** — confirm each `seedum:room.*` control key per-key before trimming |

> A reliable full orphan list needs a per-key manual sweep (dynamic keys defeat static scan). Only the confirmed-zero literals above are proposed. Low severity (dead strings only).

### A6 — Dead CSS classes (298 total; 4 orphans, 0 TSX refs)
| Class | File | Verdict |
|---|---|---|
| `.rowName` | `src/features/cabinet/ui/cabinet.module.css` | **SAFE** |
| `.rowMeta` | `cabinet.module.css` | **SAFE** |
| `.formGrid` | `cabinet.module.css` | **SAFE** |
| `.videoWrap` | `src/features/lesson/ui/liveroom.module.css` | **SAFE** |

---

## AREA B — BROKEN LINKS

### B1 — Routes / navigation
- `src/app/router.tsx`: all 15 routes wired to imported, existing screens; all literal nav targets (`/`, `/app`, `/courses`, `/login`, `/register`, `/schedule`) resolve to declared routes. **No broken links.**
- Note (already in the UX audit): `path="*"` → `<Navigate to="/">` — there is **no dedicated 404 screen**. UX-states gap, not a broken link. **KEEP-PLANNED.**

### B2 — GraphQL contract / SDL drift / codegen freshness
- **Codegen fresh** — regenerating produced no diff to `generated.ts`. ✓
- **SDL is a forward contract.** Committed SDL = 102 types (hand-curated, richly commented); live schema = 79 types (MVP subset). **Every live root field exists in the SDL** (no undocumented live surface).
- **SDL-only (not-yet-built) roots** — KEEP-PLANNED:
  - Queries (13): `adminDashboard`, `certificate`, `groupAnalytics`, `leaderboard`, `myAchievements`, `notifications`, `notificationPreferences`, `parentChildOverview`, `parentChildren`, `studentDashboard`, `teacherDashboard`, `teacherReviews`, `verifyCertificate`.
  - Mutations (7): `createReview`, `issueCertificate`, `markAllNotificationsRead`, `markNotificationRead`, `moderateReview`, `sendChatMessage`, `updateNotificationPreference`.
  - Subscriptions (3 of 4): `chatMessageReceived`, `notificationReceived`, `sessionStatusChanged` (live implements only `attentionUpdates`).
- **Naming/shape drift (DOCUMENT ONLY — do NOT regenerate the committed SDL):**
  - Committed `type User` ↔ live `type UserType` (Strawberry auto-suffix). FE ops are fragment-free / whole-object-input, so this is tolerated at runtime.
  - `attentionSummary` present in committed SDL, absent from live schema.
- **Runtime safety (checked):** no FE operation references any SDL-only/unbuilt field. The lone grep hit (`notifications` in `ParentCabinet.tsx:69`) is a **false positive** — a nav-tab key string, not a query. ✓ No broken runtime query.

### B3 — Missing env / config wiring
| Item | Evidence | Verdict |
|---|---|---|
| `graphql-ws` undeclared dep | see A3 | **SAFE (add)** |
| `.env.example` completeness | backend + frontend `.env.example` present; documents `SECRET_KEY`, `S3_*`, `LIVEKIT_*`, `CHANNELS_REDIS_URL` | **OK** — no missing var found; `SECRET_KEY=change-me` is a placeholder (see C4 note) |

### B4 — Doc path-rot
| Claim | Reality | Verdict |
|---|---|---|
| CLAUDE.md §4: `backend/config/.../celery.py` | **file does not exist** | **NEEDS-DECISION** — tied to the celery dep decision (A3) |
| All other §4 layout paths (`common/models.py`, `api/schema.py`, `codegen.ts`, `mediapipe.worker.ts`, `cmfConfig.ts`, `infra/docker-compose.yml`, `flamingo_erd.md`, `flamingo_schema.graphql`) | exist | **OK** |

### B5 — Stale tests
- Gates green ⇒ no test imports a deleted module (would fail to compile/collect). Only finding: 2 unused vars in `test_seedum.py:251` (A2). **No broken test refs.**

---

## AREA C — ERRORS / ROBUSTNESS

### C1 — Unhandled promises
| Site | Evidence | Verdict |
|---|---|---|
| `src/features/lesson/ui/LiveRoomScreen.tsx:186` `void loadUbp().then(...)` | no `.catch`; IndexedDB read rejection → unhandled rejection | **SAFE (fix)** — add `.catch` fallback (Batch 4) |
| `LiveRoomScreen` `void reportRef.current({...})` (reportAttention) | no `.catch`; network rejection → unhandled | **NEEDS-DECISION** — pervasive "silent mutation" pattern; overlaps the UX audit's error-handling item |
| `useLiveKitRoom.ts:258` `.then((pub)=>…)` | **false positive** — chain ends `.catch(()=>undefined)` at :270 | **CLEAN** |

### C2 — React Error Boundary
- **NONE in the app** (`grep componentDidCatch|getDerivedStateFromError|ErrorBoundary` → 0). Any render throw unmounts the tree → blank white screen. **SAFE (fix)** — add a top-level `ErrorBoundary` + fallback UI + test (Batch 4). Highest-value robustness fix.

### C3 — Timers / listeners without cleanup
All five sites are correctly cleaned — **CLEAN**:
| Site | Cleanup |
|---|---|
| `LiveRoomScreen.tsx:383` `setInterval` | `clearInterval` in effect return |
| `VideoRoom.tsx:114` `addEventListener('keydown')` | `removeEventListener` in effect return |
| `useLiveKitRoom.ts:231` `setTimeout` | `clearTimeout` at :232 |
| `useLiveKitRoom.ts:263` `addEventListener('ended')` | `{ once: true }` (self-removing) + track lifecycle |
| `attention.ts:43` `new Worker` / `:82` `setTimeout` | `.terminate()` on stop; :82 is a self-resolving sleep |
| `CmfDebugHud.tsx:67` `setInterval` | `clearInterval` in effect return |

### C4 — Division-by-zero / transactions / hardcoded URLs
| Check | Evidence | Verdict |
|---|---|---|
| Aggregation division | `round(Avg(...))` guarded by `exists()` (services.py:147,168,238); `/half` & `/(len-half)` guarded by `len<4: continue` (:210); `/len(drops)` guarded by `bool(drops) and` (:217) | **CLEAN** |
| Transaction atomicity | `transaction.atomic` present across all 6 service apps | **OK** |
| Hardcoded URLs | none in hand-written code (env-driven via `shared/lib/env.ts`); the `generated.ts` hits are Apollo doc-comment links | **CLEAN** |
| JWT HMAC key length | pytest `InsecureKeyLengthWarning ×3` — key < 32 bytes; `.env.example SECRET_KEY=change-me` (11 chars) | **NEEDS-DECISION (low)** — prod risk if the placeholder is copied verbatim; consider raising the example to a 32-byte guidance string |

### C5 — Git-history secret scan
- `git log -S 'LIVEKIT_API_SECRET' --all` / `-S api_secret` → only env-var **names** + empty `.env.example` placeholders (`SECRET_KEY=change-me`, `LIVEKIT_API_SECRET=`). No real secret value ever committed. No `.env` is tracked. **CLEAN — no RED FLAG.**

### .gitignore
Already ignores `.env` / `.env.*` (with `!.env.example`), `node_modules`, `dist`, `__pycache__`, `.venv`, `.playwright-mcp/`, `/audit-*.jpeg`. **Nothing to add.**

---

## Scorecard
| Area | Status |
|---|---|
| A1 dead files | clean (all flags = KEEP reference/vendored) |
| A2 unused imports/vars | clean (1 trivial test var) |
| A3 dead exports | 4 SAFE + dormant/planned/barrel |
| A3 deps | `celery`/`redis` NEEDS-DECISION; `graphql-ws` add |
| A4 assets | clean |
| A5 i18n | mostly dynamic (KEEP); 1 SAFE + 1 NEEDS-DECISION family |
| A6 CSS | 4 SAFE orphans |
| B1 routes | clean (no 404 page = planned) |
| B2 GraphQL/SDL/codegen | codegen fresh; drift = forward contract; **no runtime break** |
| B3 env | `graphql-ws` add; else OK |
| B4 doc-rot | 1 stale claim (celery.py) |
| B5 stale tests | clean |
| C1 promises | 1 SAFE fix + 1 pattern (NEEDS-DECISION) |
| C2 error boundary | **missing → SAFE fix (high value)** |
| C3 timers/listeners | clean |
| C4 division/tx/urls | clean; 1 low env note |
| C5 secret history | **clean, no leak** |

**Overall: the codebase is clean and robust.** No leaked secrets, no broken runtime wiring, no unguarded aggregation math, no timer/listener leaks. The actionable set is small and low-risk.

---

## НУЖНО РЕШЕНИЕ (decisions for the reviewer)
1. **`celery` + `redis` deps + CLAUDE.md §4 `celery.py`.** Celery is 100 % unused today but CLAUDE.md §5 lists planned Celery tasks. Options: **(a)** remove both pins now and update CLAUDE.md §4 (drop the `celery.py` layout line, note "async tasks deferred") — leanest; **(b)** keep the pins and add a stub `config/celery.py` so §4 is truthful; **(c)** keep pins, only fix CLAUDE.md §4 wording. Recommend **(a)** for the MVP.
2. **`redis` standalone pin.** If (1a/c), drop `redis>=5.0` (it comes transitively via `channels-redis`), or keep for explicitness. Recommend drop.
3. **`i18n/index.ts` `defaultNS` / `resources`.** Confirm no react-i18next `typeof resources` type augmentation depends on them before any change. Recommend **KEEP** unless a `.d.ts` check proves them free.
4. **`seedum:room.*` camera keys.** Trim `room.enableCamera` (+`room.stop`/`room.live` if per-key confirmed dead) or keep for the future full-controls variant?
5. **`reportAttention` / silent mutations (C1).** Add `.catch` + a user-visible error path now, or fold into the broader UX error-handling prompt already queued?
6. **JWT/`SECRET_KEY` example (C4).** Raise `.env.example` `SECRET_KEY` from `change-me` to a ≥32-byte guidance placeholder?

---

## Proposed Phase-2 batches (AWAITING GO-AHEAD — nothing done yet)
> One concern = one commit; gates green after each. Ordered least→most risk.

- **Batch 1 — safe deletions (proven zero-ref).** Dead exports `setTheme`, `UI_ROLES`, `isEmail`, `MAX_PARTICIPANTS`; dead CSS `.rowName`/`.rowMeta`/`.formGrid` (cabinet), `.videoWrap` (liveroom); `common:actions.continue` i18n key; test-var tidy in `test_seedum.py:251`. (`.gitignore` already complete — no change.)
- **Batch 2 — deps.** Per decisions 1–2: drop `celery`/`redis` (or stub `celery.py`); **add `graphql-ws`** to frontend `package.json`.
- **Batch 3 — broken links / stale facts.** CLAUDE.md §4 celery.py line; (optional) `SECRET_KEY` example guidance. SDL naming drift stays **documented only** (no regeneration).
- **Batch 4 — robustness (with tests).** Top-level `ErrorBoundary` + fallback + test; `.catch` on `loadUbp().then` (LiveRoomScreen:186). (Silent-mutation handling per decision 5.)

**STOP here for Phase 1.** No deletions performed; working tree clean at report time except this new doc.
