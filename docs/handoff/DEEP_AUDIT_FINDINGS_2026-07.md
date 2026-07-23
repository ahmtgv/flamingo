# DEEP_AUDIT_FINDINGS — full cross-cutting audit (backend · frontend · SEduM · UI/UX · repo)

**Prompt #9.** Date: 2026-07-23 · Branch: `chore/ertc-preview-launch-config` · HEAD at audit start: `0aab787`.

## Baseline gates (before)
| Gate | Result |
|---|---|
| backend `pytest` | 89 passed |
| backend `ruff` / `black --check` / `makemigrations --check` | clean / clean / no changes |
| frontend `vitest` | 129 passed |
| frontend `tsc -b` / `eslint` / `vite build` | clean / clean / OK |

## Method
Exhaustive parallel inventory (7 analyzers, tracks A–E) + tool sweeps: `git grep`/AST, `tsc`, `knip`, `depcheck`, `ruff`, `makemigrations --check`, `export_schema` diff, `npm run codegen` diff, and a full-git-history secret scan (`git log -p -S`). Every finding carries `file:line` + concrete evidence; SAFE-REMOVE items include a re-grep proving zero references. Classification: **SAFE-FIX / SAFE-REMOVE / KEEP / KEEP-INTENTIONAL / NEEDS-DECISION**.

## Overall health
The project is **broadly healthy**. Hard invariants hold: the **on-device privacy invariant is fully honored and guarded by an automated test** (`apps/seedum/tests/test_privacy.py`); **no real secret was ever committed** (history clean); codegen is fresh; migrations have zero drift and no orphans; `.gitignore` is correct with no tracked build artifacts; every route/module/i18n-namespace is reachable. The **material risks** are: (1) a HIGH content-authorization bypass via the public course-discovery path, (2) teacher contact PII exposed to anonymous callers, (3) absent refresh-token revocation, (4) AIR coral-accent discipline broken across most screens, and (5) a cluster of proven-dead code/deps/i18n. None violate an invariant beyond the authz ones, which are the top escalations.

---

## PHASE 1 — additive fixes completed this phase (can't break; committed)
| Commit | Finding | What |
|---|---|---|
| `97c6703` | B-eb-1 | Global **ErrorBoundary** wrapping the router + atlas-11 crash fallback (`common:crash.*`, role="alert", tokens) + 2 tests |
| `d1ee240` | B-a11y-1 | ScheduleScreen logout button announces «Выйти» (`common:actions.signOut`), not «Загрузка…» |
| `3c3cf83` | A-atomicity-verifdoc | `submit_verification_document` wrapped in `@transaction.atomic` |
| `dd4b55d` | A-envexample-drift | `backend/.env.example` → `CHANNELS_REDIS_URL` + `S3_REGION`, drop stale Celery wording |

Gates after Phase 1: **backend 89 pytest / ruff / black / migrations clean**; **frontend 131 vitest (+2) / tsc / eslint / build clean**.

**STOP after this document** — everything below (all SAFE-REMOVE and the larger fixes) awaits reviewer check-in (Phase 2), per §11.

---

## TRACK A — BACKEND

### A1. Authorization / IDOR / privacy
| ID | Cls | Conf | file:line | Finding |
|---|---|---|---|---|
| **A-authz-1** | **NEEDS-DECISION** | 96 | `courses/graphql/types.py:164` | **HIGH content-authz bypass.** `course()→sections→lessons→materials` returns gated lesson content — descriptions, TEXT material `body`, LINK `url`, and even **unpublished DRAFT** lessons — to ANY anonymous/unenrolled viewer, bypassing `can_access_course`. Proven by anon query; top-level `lesson()` correctly denies the same lesson. |
| **A-authz-2** | SAFE-FIX | 90 | `courses/graphql/types.py:108` | `Section.lessons` = `list(self.lessons.all())` with no status filter → DRAFT lessons visible to everyone. Fold into A-authz-1 fix. |
| **A-152fz-1** | **NEEDS-DECISION** | 92 | `accounts/graphql/types.py:106` | Teacher `email`+`phone` (PII, 152-FZ) exposed to anonymous via public `catalog` owner and `teacher(id)` card — `UserType.email/phone` have no field-level authz (whereas `avatar_url` calls `require_user`). Proven anon. |
| **A-authz-3** | **NEEDS-DECISION** | 95 | `accounts/graphql/mutations.py:85` | **Refresh-token revocation absent (A-H3):** `logout()` is a no-op, `refresh()` never invalidates the presented token, `reset_password()` doesn't invalidate sessions. Leaked refresh token valid until 14-day exp. |
| **A-authz-4** | **NEEDS-DECISION** | 88 | `seedum/services.py:74` | `record_attention` has no session-participation check — any authenticated student can inject attention rows into any session (integrity/data-pollution; **no privacy breach** — `studentId` derives from auth). |
| A-privacy-ok | KEEP | 98 | `seedum/tests/test_privacy.py:17` | **CONFIRMED:** `AttentionInput` = 8 scalars only, `studentId` from auth, only `avg_attention` persisted, no raw-media endpoint. Test present — keep as guardrail. |
| A-authz-ok-group | KEEP | 95 | `institutions/services.py:72` | CONFIRMED closed: group roster (minors' PII) scoped to staff/own-admin/assigned-teacher. |
| A-authz-ok-join | KEEP | 95 | `scheduling/services.py:73` | CONFIRMED closed: `join_session`/session reads honor `access_status` + group delivery via `can_access_course`. |

### A2. Performance / data hygiene
| ID | Cls | Conf | file:line | Finding |
|---|---|---|---|---|
| A-H1-catalog-counts | SAFE-FIX | 88 | `courses/graphql/types.py:168` | `Course.lessonCount`/`enrollmentCount` run a `COUNT` per node → N+1 on catalog. Annotate in `published_courses`. |
| A-H1-course-tree | NEEDS-DECISION | 82 | `courses/graphql/types.py:164` | Nested `sections→lessons→materials` list resolvers have no prefetch and no optimizer extension. Needs a strategy decision (optimizer ext vs explicit prefetch). |
| A-H1-schedule-teachername | SAFE-FIX | 80 | `scheduling/services.py:115` | `my_schedule` `select_related` stops at `course`; `teacherName` walks `owner.user` → N+1. Extend to `...course__owner__user`. |
| A-H1-attendance-roster | SAFE-FIX | 74 | `scheduling/services.py:146` | `attendance_for` returns `attendances.all()` w/o `select_related('student__user')` → N+1. |
| A-H1-members-avatar | NEEDS-DECISION | 58 | `accounts/graphql/types.py:119` | `institutionMembers` + `UserType.avatarUrl` → profile query per user. Low priority unless list surfaces avatars. |
| **A-deadpin-celery** | **SAFE-REMOVE** | 97 | `requirements.txt:7` | `celery>=5.3` — **zero usage** (only a stale comment `accounts/services.py:55`). Remove pin. Keep `redis`/`channels-redis` (channel layer). |
| A-drop-session-group | SAFE-FIX | 93 | `scheduling/services.py:53` | `schedule_session` accepts `group_id` but never persists it to `LessonSession.group`. Wire it (+ validate group∈lesson's institution) + test. |
| A-drop-course-inst-group | NEEDS-DECISION | 88 | `courses/graphql/mutations.py:22` | `CourseInput.institution_id/group_id` accepted but never persisted; wiring `course.group` grants group-member content access → authz reach. |
| A-atomicity-verifdoc | SAFE-FIX ✅ | 80 | `accounts/services.py:219` | **DONE** `3c3cf83`. |
| A-envexample-drift | SAFE-FIX ✅ | 90 | `backend/.env.example` | **DONE** `dd4b55d`. |
| A-settings-insecure-defaults | NEEDS-DECISION | 68 | `config/settings.py:15` | `SECRET_KEY='dev-insecure-change-me'`, `DEBUG=1`, `ALLOWED_HOSTS='*'` defaults. Env-driven (invariant OK) but should fail-fast in prod. |
| A-resolver-course-visibility | NEEDS-DECISION | 60 | `courses/graphql/queries.py:43` | `course` resolver embeds draft/owner visibility inline vs delegating to a service (parity with `lesson`/`homework`). Low. |
| A-keep-softdelete-api | KEEP-INTENTIONAL | 85 | `common/models.py:35` | `hard_delete`/`all_objects` unused but the deliberate soft-delete escape hatch. Keep. |

---

## TRACK B — FRONTEND

### B1. Dead code / types / deps
| ID | Cls | Conf | file:line | Finding |
|---|---|---|---|---|
| B-dep-graphql-ws-1 | SAFE-FIX | 95 | `frontend/package.json` | `graphql-ws` imported (`apolloClient.ts:13`) but not declared — resolves only transitively via `@apollo/client`. Add to `dependencies`. |
| B-css-cabinet-dead-1 | SAFE-REMOVE | 88 | `cabinet.module.css:237` | `.row/.rowName/.rowMeta/.formGrid` — 0 TSX refs. |
| B-css-liveroom-dead-1 | SAFE-REMOVE | 85 | `liveroom.module.css:81` | `.video/.videoWrap` — 0 refs (leftover from VideoRoom refactor). |
| B-i18n-auth-home-1 | SAFE-REMOVE | 90 | `auth.json:112` | Dead `home.*` block (9 keys) — placeholder screen replaced by cabinet. |
| B-i18n-common-actions-1 | SAFE-REMOVE | 80 | `common.json:7` | `actions.back` / `actions.continue` — 0 refs (`actions.loading`/`signOut` kept). |
| B-i18n-common-app-1 | NEEDS-DECISION | 70 | `common.json:2` | `app.name`/`app.tagline` unused (Logo hard-codes wordmark). Wire into title or remove. |
| B-i18n-courses-lessonDraft-1 | SAFE-REMOVE | 82 | `courses.json` | `detail.lessonDraft` — 0 refs, no dynamic prefix. |
| B-i18n-schedule-cancel-1 | SAFE-REMOVE | 80 | `schedule.json:24` | `lessonForm.cancel` — 0 refs. |
| B-i18n-lesson-dupes-1 | SAFE-REMOVE | 68 | `lesson.json:3` | `joining`/`noAccess` — 0 refs (dupes of `connecting`/`notLive`). |
| B-i18n-upload-validation-1 | NEEDS-DECISION | 72 | `upload.json:4` | `fileTooLarge`/`fileTypeNotAllowed` — no client validation wired. Add validation or remove. |
| B-seedum-calibration-unwired-1 | NEEDS-DECISION | 85 | `seedum/calibration.ts:20` | Calibration + `CALIBRATION_STAGES` built+tested, wired to no UI. **KEEP** (SEduM-NG) — feature gap, not rot. |
| B-seedum-ubp-writepath-1 | NEEDS-DECISION | 80 | `seedum/ubp.ts:39` | `saveUbp`/`clearUbp` no callers (read path wired). **KEEP** (SEduM-NG). |
| B-uislice-settheme-1 | SAFE-REMOVE | 65 | `app/uiSlice.ts:39` | `setTheme` never dispatched (theme via `toggleTheme`). |
| B-depcheck-codegen-fp | KEEP | 96 | `codegen.ts:15` | `@graphql-codegen/*` "unused devDeps" = false positive (plugin strings). |
| B-knip-barrel-fp | KEEP | 88 | `seedum/index.ts:1` | knip barrel/used-locally exports = false positive. |
| B-knip-unused-files-fp | KEEP-INTENTIONAL | 92 | `design-reference/*.jsx` | Design prototypes + vendored WASM = intentional non-build assets. |

### B2. Resilience / a11y / tokens
| ID | Cls | Conf | file:line | Finding |
|---|---|---|---|---|
| B-eb-1 | SAFE-FIX ✅ | 97 | `app/App.tsx` | **DONE** `97c6703` (global ErrorBoundary). |
| B-a11y-1 | SAFE-FIX ✅ | 96 | `ScheduleScreen.tsx:100` | **DONE** `d1ee240`. |
| B-states-1 | NEEDS-DECISION | 92 | `CatalogScreen.tsx:87` | **No data screen renders a distinct error state** — query errors silently degrade to empty/not-found (none *stick*, but no message/retry). Add shared `ErrorState` (atlas 11) + wire per screen. |
| B-states-2 | NEEDS-DECISION | 74 | `Cabinet.tsx:34` | Cabinet treats a `me`-query **error** as unauthenticated → redirects to `/login` (can bounce an authenticated user). Distinguish `error` from absent `me`. |
| B-states-3 | SAFE-FIX | 68 | `LiveRoomScreen.tsx:495` | LiveRoom initial load `return null` = blank screen (no loader). Add a loader for the `!session` initial case (keep null-equiv once cached to preserve the no-remount rule). |
| B-tokens-1 | SAFE-FIX | 58 | `cabinet.module.css:44` | `--icon-size-*` tokens defined but feature CSS hardcodes 16/20/24px. Consume the tokens. |
| B-i18n-1 | KEEP-INTENTIONAL | 84 | `PreviewRoom.tsx:141` | Hardcoded «Мария Петровна» — the VITE_PREVIEW demo layer. Keep (removes with demo). |
| B-i18n-2 | KEEP-INTENTIONAL | 84 | `CmfDebugHud.tsx:100` | Hardcoded Cyrillic in the dev-only `?cmfDebug=1` HUD. Keep. |
| B-verified-ok | KEEP | — | — | CONFIRMED good: 0 `any`; all ops on generated types; codegen fresh; Redux = UI-only; camera toggle = `track.enabled` (not `stop()`); tiles data-attr layout (no `<video>` remount); effect cleanup complete. |

---

## TRACK C — SEduM / CMF
| ID | Cls | Conf | file:line | Finding |
|---|---|---|---|---|
| C-priv-1/-2 | KEEP | 98 | `mediapipe.worker.ts:108`, `seedum/services.py:90` | **Privacy HOLDS end-to-end:** on-device worker, frames closed/never posted, egress = 8 scalars, only `avg_attention` persisted, sub-metrics live-only, UBP IndexedDB, backup client-encrypted (AES-GCM/PBKDF2). |
| C-RC4 | KEEP-INTENTIONAL | 93 | `mediapipe.worker.ts:111` | No-face zero-pollution **already solved** as skip-not-0 (empty bucket never emitted). Do not reintroduce zero-writing. |
| C-RC3 | SAFE-FIX | 82 | `mediapipe.worker.ts:121` | Per-frame EMA quantized to `int` inside its own feedback loop → precision loss/stair-stepping. Keep float, round only at emit. **Recommend Phase 2 / after owner D0** (changes scoring numerics that D0 measures). |
| C-RC1 | NEEDS-DECISION | 95 | `LiveRoomScreen.tsx:189` | Calibration/UBP-baseline chain built+tested but never invoked (`loadUbp()` always null) → scoring always baseline-free. **SEduM-NG.** |
| C-RC2 | NEEDS-DECISION | 90 | `seedum/metrics.ts:24` | Gaze from 8 eye-look blendshapes is coarse; iris landmarks unused. **SEduM-NG.** |
| C-RC5 | NEEDS-DECISION | 88 | `seedum/attention.ts:82` | 5fps `setTimeout` while-loop drifts / tab-throttles; head-pose sign + thresholds provisional. **SEduM-NG** (→ `requestVideoFrameCallback`). |
| C-display-1 | NEEDS-DECISION | 60 | `attentionView.ts:8` | Teacher view conflates a genuine 0 (present-but-disengaged) with "no reading" (both excluded from class avg). Decide if true-0 should count. |
| C-ubp-1 | KEEP-INTENTIONAL | 90 | `seedum/ubp.ts:84` | UBP cloud-backup/restore built+tested but unwired. Keep (on-device design, SEduM-NG). |
| C-eval-1 | KEEP (gap) | 85 | `seedum/score.test.ts:1` | No numeric fake-camera→ground-truth eval harness. Note the gap; **SEduM-NG**, do not build. |
| C-pose-1 | KEEP-INTENTIONAL | 70 | `seedum/headTolerance.ts:31` | `POSE_AXIS_MULTIPLE` forward scaffolding, no runtime consumer. Keep. |

---

## TRACK D — UI/UX (vs atlas)
| ID | Cls | Conf | file:line | Finding |
|---|---|---|---|---|
| D-air-2-live-green-cancel-red | SAFE-FIX | 82 | `ScheduleScreen.tsx:33` | LIVE→green, CANCELED→red traffic-light; approved sheet 05 forbids it (statuses as text, one coral = LIVE). |
| D-air-1-course-level-coral | SAFE-FIX | 88 | `CatalogScreen.tsx:97` | Course level as coral `Badge tone="accent"` on every card → coral spent decoratively (AIR: one accent/state). Use neutral. |
| D-air-3-cabinet-decorative-coral | SAFE-FIX | 80 | `cabinet.module.css:56` | Coral on active nav + every card-head icon + points number. Reserve coral for the single action-needed element. |
| D-air-4-homework-score-coral | SAFE-FIX | 72 | `LessonHomeworkScreen.tsx:307` | Grade rendered as coral badge; atlas 06 reserves accent for the nearest deadline. Use mono neutral. |
| D-type-1-uppercase-tracking-cyrillic | SAFE-FIX | 85 | `auth.module.css:87` | `uppercase`+`tracking-wide` on Cyrillic micro-labels (tokens.css says latin-only). Use sentence case. |
| D-state-3-catalog-empty-merged | SAFE-FIX | 80 | `CatalogScreen.tsx:86` | Loading+empty merged; a no-match search misleadingly reads "no courses". Split + skeleton (sheet 04). |
| D-state-4-empty-no-cta | SAFE-FIX | 78 | `Empty.tsx:6` | Empty states lack the single-CTA sheets mandate. Add optional CTA slot. |
| D-bp-1-adhoc-breakpoints | SAFE-FIX | 60 | `cabinet.module.css:158` | Ad-hoc breakpoints (520/720/820/860) off the documented scale. Snap to scale. |
| D-icon-1-raw-px-icon-sizing | SAFE-FIX | 45 | `cabinet.module.css:146` | Raw-px icon sizing incl. off-scale 18px. Use `--icon-size-*`. |
| D-state-1-schedule-missing-controls | NEEDS-DECISION | 85 | `ScheduleScreen.tsx:106` | Schedule list-only vs approved 05 (view switcher, hide-cancelled, skeleton). Confirm MVP trim vs build to contract. |
| D-state-2-teacher-cabinet-stub | NEEDS-DECISION | 80 | `TeacherCabinet.tsx:43` | Teacher cabinet is a stub vs approved 03 (three-metric row, session/course lists). |
| **D-auth-1-consent152fz** | **NEEDS-DECISION** | 70 | `RegisterScreen.tsx:236` | **152-FZ:** consent is a junior-only inline checkbox, **teens 13–17 (<18) uncovered**, and consent may not be transmitted. Route all <18 self-signup through a consent step that carries `consent152fz`. |
| D-hw-1-grade-scale-0-100 | NEEDS-DECISION | 65 | `LessonHomeworkScreen.tsx:267` | Grading 0–100 input vs atlas-06 drawn 2–5 scale + "save and next" queue. Resolve open question. |
| D-sys-1-no-404-offline-toast | NEEDS-DECISION | 65 | `router.tsx:159` | No 404 screen (silent redirect), no offline banner, no toast (atlas 11). |
| D-priv-1-privacy-indicator-green-pill | NEEDS-DECISION | 60 | `seedum/ui/seedum.module.css:1` | PrivacyIndicator is a green success pill; atlas 01 styles it as unobtrusive tertiary text. Confirm intent. |

---

## TRACK E — REPO / DOCS
| ID | Cls | Conf | file:line | Finding |
|---|---|---|---|---|
| E-dep-celery-1 | SAFE-REMOVE | 95 | `requirements.txt:7` | Dead `celery` pin (= A-deadpin-celery). |
| E-gitkeep-11 | SAFE-REMOVE | 90 | `frontend/src/seedum/.gitkeep` | Redundant `.gitkeep` in a now-populated dir. |
| E-env-fe-4 | SAFE-FIX | 90 | `frontend/.env.example` | Omits the optional `VITE_GRAPHQL_WS_URL` override. Add commented entry. |
| E-compose-redis-3 | NEEDS-DECISION | 85 | `infra/docker-compose.yml:70` | Compose sets `REDIS_URL` but backend reads `CHANNELS_REDIS_URL` → Redis channel layer never activates in the dev stack. Rename compose var. |
| E-dep-redis-2 | NEEDS-DECISION | 60 | `requirements.txt:8` | Explicit `redis>=5.0` redundant (transitive via `channels-redis`). Drop or keep as floor (cosmetic). |
| E-secretkey-weak-12 | NEEDS-DECISION | 55 | `backend/.env.example:6` | `SECRET_KEY=change-me` shorter than a safe HMAC key (JWT `InsecureKeyLengthWarning`). Raise placeholder to ≥32 bytes. |
| E-doc-readme-5 | NEEDS-DECISION (docs) | 95 | `README.md:17` | Status table stale ("frontend not scaffolded", "only accounts built"). **Docs batch only.** |
| E-doc-claudemd-layout-6 | NEEDS-DECISION (docs) | 95 | `CLAUDE.md:29` | §4 layout wrong (`config/` is a module not a package; no `celery.py`; missing `files` app; forward-plan apps listed as built). **Docs batch.** |
| E-doc-celery-active-7 | NEEDS-DECISION (docs) | 90 | `CLAUDE.md:67` | §3/§5 + architecture doc describe Celery/async as active — none implemented. Mark deferred. **Docs batch.** |
| E-sdl-regen-10 | NEEDS-DECISION (docs) | 75 | `CLAUDE.md:94` | §8 + `api/schema.py` docstring instruct `export_schema > SDL`, which would clobber the hand-maintained forward-contract SDL. Amend wording. **Docs batch.** |
| E-sdl-forward-ops-8 | KEEP-INTENTIONAL | 95 | `docs/flamingo_schema.graphql` | SDL vs live op drift is entirely forward-contract (SDL has extra ops w/o live resolver; **no live op absent from SDL**). Record only (invariant §10). |
| E-sdl-type-drift-9 | KEEP-INTENTIONAL | 90 | `docs/flamingo_schema.graphql:42` | Type-name (`*Type` suffix)/scalar/nullability drift — known & worked around (fragment-free, whole-object-input FE ops). Record only. |
| E-verified-ok | KEEP | — | — | CONFIRMED: **no secret ever committed** (full-history scan clean); codegen fresh; no orphan migrations; `.gitignore` correct; vendored `public/seedum/**` (~15MB) intentional. |

---

## NEEDS-DECISION — owner escalations (ranked; risk / effort)
**Security (highest priority):**
1. **A-authz-1 + A-authz-2 — content-authz bypass (HIGH).** Anon/unenrolled can read gated lesson content + DRAFT lessons via `course→sections→lessons→materials`. *Recommended:* gate the nested content behind `can_access_course`; discovery exposes a titles-only syllabus (no `Material.body/url`, no `Lesson.description`), drafts filtered for non-owners; add a GraphQL test. **Risk if unfixed: high (content leak). Effort: M.**
2. **A-152fz-1 — teacher PII leak (HIGH, 152-FZ).** `UserType.email/phone` unauthorized. *Recommended:* field-level authz (self / linked parent / same-institution admin); public teacher card = non-PII only. **Effort: S–M.**
3. **A-authz-3 — refresh-token revocation (A-H3).** *Recommended:* per-user `token_version` claim bumped on logout + password-reset; `logout()` bumps it. **Effort: M.**
4. **A-authz-4 — `record_attention` participation gate.** Require `can_access_course` before persisting. **Effort: S** (data-integrity, not privacy).
5. **A-drop-course-inst-group** — wiring `course.group`/`institution` has content-access reach; confirm authz. **Effort: S–M.**
6. **A-settings-insecure-defaults** — fail-fast prod hardening (DEBUG/ALLOWED_HOSTS/SECRET_KEY). **Effort: S.**

**Product / UX (atlas):**
7. **D-auth-1 — 152-FZ consent for teens (<18).** Consent path currently junior-only; teens uncovered. **Effort: M.**
8. D-hw-1 grade scale (2–5 vs 0–100); D-state-1/2 schedule controls / teacher-cabinet build-out (atlas 03/05); D-sys-1 404/offline/toast (atlas 11); D-priv-1 privacy-indicator styling; B-i18n-common-app-1; B-i18n-upload-validation.

**Performance:** A-H1-course-tree (optimizer strategy); A-H1-members-avatar (low).

**SEduM-NG (do not build now):** C-RC1 calibration wiring, C-RC2 iris gaze, C-RC5 fps/head-pose, C-display-1, C-eval-1 harness.

**Docs batch (docs/** — non-destructive, explicit):** E-doc-readme-5, E-doc-claudemd-layout-6, E-doc-celery-active-7, E-sdl-regen-10, E-secretkey-weak-12; SDL drift recorded (E-sdl-8/9) — do NOT regen.

---

## PHASE 2 — proposed batches (await go-ahead; one concern/commit, gates green each)
- **Batch 1 — SAFE-REMOVE (re-grep proven):** `celery` pin; dead CSS (`cabinet .row/.rowName/.rowMeta/.formGrid`, `liveroom .video/.videoWrap`); dead i18n (`auth home.*`, `common actions.back/continue`, `courses detail.lessonDraft`, `schedule lessonForm.cancel`, `lesson joining/noAccess`); `uiSlice setTheme`; `seedum/.gitkeep`.
- **Batch 2 — deps/config:** add `graphql-ws` to package.json; frontend `.env.example` `VITE_GRAPHQL_WS_URL`; `docker-compose` `CHANNELS_REDIS_URL`; (decision) drop redundant `redis` pin.
- **Batch 3 — resilience:** shared `ErrorState` (atlas 11) + wire error branches across data screens (B-states-1); Cabinet me-error no-bounce (B-states-2); LiveRoom initial loader (B-states-3).
- **Batch 4 — perf (N+1):** annotate catalog counts; `select_related` for schedule teacherName + attendance roster.
- **Batch 5 — backend correctness:** persist `schedule_session` `group_id` (+ test).
- **Batch 6 — UI/UX AIR:** coral discipline (D-air-1/2/3/4), Cyrillic case (D-type-1), catalog/empty CTA states (D-state-3/4), token cleanups (B-tokens-1, D-icon-1, D-bp-1) — with before/after screenshots.
- **Batch 7 — SEduM SAFE-FIX (after owner D0):** EMA float (C-RC3).
- **Security batches (on decision):** A-authz-1/2, A-152fz-1, A-authz-3, A-authz-4, A-drop-course-inst-group, A-settings hardening.
- **Docs batch (on decision):** README + CLAUDE.md §3/§4/§5/§8 + schema.py docstring + SECRET_KEY placeholder.

---

## REVIEWER DECISIONS — Phase 1 accepted → Phase 2 go-ahead (2026-07-23)

Phase 1 verified against git (commits `97c6703`, `d1ee240`, `3c3cf83`, `dd4b55d`, `c764ed9`; ErrorBoundary wraps the router in `App.tsx`; **A-authz-1 confirmed real** in `courses/graphql/types.py` — `sections/lessons/materials` resolvers ungated + no draft filter; `test_privacy.py` present). **Accepted.**

**Escalation rulings (architect):**
- **A-authz-1 / A-authz-2 → FIX.** Gate nested content behind `can_access_course`. Guest/unenrolled discovery = **published syllabus only** (course + section titles + published lesson titles + `lesson_count`). DRAFT lessons hidden from non-owners. Lesson `description`/body, TEXT material `body`, LINK `url`, material files → enrolled/owner only. Consistent with **atlas-04 "guest sees full program"** = titles/outline, NOT materials/bodies. Add anon-access regression tests.
- **A-152fz-1 → FIX.** `UserType.email/phone` field-level authz (self + own-institution admin only). Public teacher card = name + specialty only.
- **A-authz-3 (refresh revocation, A-H3) → FIX.** logout revokes; refresh rotates/invalidates the presented token; reset_password invalidates sessions. Server-side revocation list.
- **A-authz-4 → FIX.** `record_attention` gated by session participation (attendee-only).
- **A-drop-course-inst-group / group_id → FIX (persist + honor).** Persist `course.group`; `can_access_course` honors group membership (documented access path). +test.
- **A-settings hardening → FIX.** Fail-fast in prod: `DEBUG=0` + default `SECRET_KEY` / `ALLOWED_HOSTS='*'` → refuse boot.
- **D-auth-1 (consent <18) → PARTIAL now, full at launch.** FIX the consent-not-transmitted **bug** now (must carry `consent152fz`). Extending coverage to all <18 is correct per CLAUDE.md, but the teen-signup flow (age gate, parental email) is a launch-time product/legal item — LOW priority now (no real users).
- **C-display-1 → DECIDE:** a genuine 0 (present-but-disengaged) **counts** in class avg; only no-face/no-reading is excluded (→ null). Pairs with the no-face-null safe fix.

**Batch go-ahead + ordering:**
1. **Security first:** A-authz-1/2, A-152fz-1, A-authz-4, A-authz-3 (one concern/commit, with anon-access tests).
2. **Batch 3 (resilience)** — high value (fixes real-mode blank/bounce).
3. **Batch 1 (SAFE-REMOVE)** + **Batch 2 (deps/config).** Keep `redis`/`channels-redis`; keep the explicit `redis` floor pin WITH a comment (no churn); SECRET_KEY placeholder ≥32.
4. **Batch 4 (N+1)**, **Batch 5 (group_id).**
5. **Batch 6 (AIR discipline)** — ONLY on existing screens; do **NOT** rebuild cabinets/schedule to atlas here (separate implementation effort). `app.name` → wire into `<title>`; upload-validation keys → add client validation (keep keys).
6. **SEduM:** no-face → null + C-display-1 now (safe); **DEFER C-RC3 (EMA float) until owner D0.**
7. **Docs batch** — GO; reviewer reviews. Fix README status, CLAUDE.md §3/§4/§5, mark celery/async deferred. SDL: record drift only, **NO regen/prune** (forward contract).

**Out of scope for this audit (separate efforts):** implement approved atlas 03/04/05 into the app (D-state-1/2, D-hw-1); SEduM-NG (C-RC1/RC2/RC5, eval harness) — pending D0.

**Guardrails:** one concern/commit; gates green each (base 89 pytest / 131 vitest); re-grep proof per removal; never touch `VITE_PREVIEW`/demo layer or the 8-scalar egress; SDL/docs non-destructive. Report per phase: hashes, gate numbers, files+reasons, screenshots (Batch 6), `SESSION_HANDOFF` §0.

### Group 1 (SECURITY) — VERIFIED & ACCEPTED (2026-07-23)
Commits `961ef32` (A-authz-1/2), `f0c8cd0` (A-152fz-1), `5e04279` (A-authz-4), `6ed51f4` (A-authz-3) + `10c1574` (§0). Reviewer re-read the actual gate logic — all correct: `visible_lessons` (owner-only DRAFT, else PUBLISHED-only), `lesson_content_visible`/`visible_materials` (behind `can_access_course`, `[]` to guests), `contact_visible` (self / ACTIVE same-institution admin), `refresh` (`tv` + `RevokedToken` jti denylist + rotation). Migration `accounts/0002` present. Gates 89→95 pytest, ruff/black/migrations clean. Intentional SDL drift (email/phone nullable) left as forward contract per §10 — correct. **Go-ahead: Group 2 (CLEANUP)** in the executor's proposed order — resilience (Batch 3) → SAFE-REMOVE (1) + deps/config (2) → N+1 (4) → group_id (5). Same guardrails; stop after the group.

### Group 2 (CLEANUP) — VERIFIED & ACCEPTED (2026-07-23)
16 commits `62cbe34`…`b472df0` + `4d93d13` (§0). Reviewer confirmed: SAFE-REMOVE discipline held (celery dropped; `redis`/`channels-redis` kept with comment; re-grep of every removed i18n/CSS key = zero refs; `setTheme` gone, `setAgeMode`/`PayloadAction` intact); resilience real (`ErrorState` wired; Cabinet shows retry on `error && !me`, only `/login` on genuine anon); deps/config correct (`graphql-ws` declared `^6.0.8`, compose `CHANNELS_REDIS_URL`, prod fail-fast `_check_prod_security`); Batch 5 group binding is ACTIVE-member-only + honored by `can_access_course`. Gates 95→102 pytest / 131→135 vitest, all clean. **Go-ahead: Group 3 (UI)** — AIR discipline on EXISTING screens only (coral one-accent, Cyrillic case, empty CTAs) with before/after screenshots → SEduM no-face→null + C-display-1 (DEFER EMA/C-RC3 to post-D0) → docs batch (non-destructive; reviewer reviews; SDL drift record-only). Do NOT rebuild cabinets/schedule to atlas 03/04/05 (separate effort).

### Group 3 (UI) — VERIFIED & ACCEPTED — AUDIT #9 CLOSED (2026-07-23)
Commits `9e0f002` (single-CTA empty states), `7b4243f` (icon-size tokens), plus AIR coral/case fixes, `1f04a11` (SEduM C-display-1: no-face/no-reading→null excluded from class avg, genuine 0 counts — frontend display only, **8-scalar egress unchanged**), `4f3f7ab` (docs: README + CLAUDE.md §3/§4/§5 corrected, Celery deferred — **no SDL regen**, forward contract intact), `d55d585` (§0), `61e80fd` (dev-only preview-server port fix — dev server only, not `vite build`, `.env.preview` gitignored). Demo layer / `VITE_PREVIEW` untouched. Frontend gates green (135 vitest, tsc/eslint/build). **AUDIT #9 COMPLETE** across all 5 tracks. Deferred to separate efforts: SEduM-NG (post-D0), atlas 03/04/05 implementation, teen-consent flow (launch), refresh per-session logout. Reviewer to verify AIR discipline live on flamingo.plus after deploy.
