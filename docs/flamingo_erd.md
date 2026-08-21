# Flamingo — Data Model (ERD)

**Version:** 1.0
**Date:** 2026-06-13
**Status:** foundation for the GraphQL schema and Django models (Stage 5).
**Scope:** MVP entities derived from the Stage 1 user stories and data flow. Deferred features (blockchain/NFT, Open API, VR/AR, Neo4j recommendations) are out of scope; PDF+QR certificate and PostgreSQL-backed metrics are in.

> Language note: entity/field names are in English (they map 1:1 to code). Rationale and trade-offs are summarised in Russian in the accompanying chat message.

---

## 1. Conventions

- **Primary keys:** `uuid` (v4). Non-enumerable, friendly to future distributed/verification features (certificate verification, eventual NFT bridge). Trade-off vs `bigint`: slightly larger indexes — acceptable at MVP scale.
- **Timestamps:** every table has `created_at timestamptz`; mutable tables add `updated_at`.
- **Soft delete:** user-facing content (course, lesson, homework) uses `deleted_at timestamptz NULL` rather than hard delete.
- **Money/percent:** attention/percent stored as `int` (0–100); progress as `int` (0–100).
- **Files:** stored in S3-compatible object storage (Yandex Object Storage); tables keep an object `key` (string), never blobs.
- **JSON:** flexible config uses `jsonb` (lesson options, branding, recommendation payload).
- **Enums:** Postgres native enums (listed in §4).

---

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
  USER ||--|| STUDENT_PROFILE : has
  USER ||--|| TEACHER_PROFILE : has
  USER ||--|| PARENT_PROFILE : has
  USER ||--|| ADMIN_PROFILE : has
  USER ||--o{ INSTITUTION_MEMBERSHIP : member
  INSTITUTION ||--o{ INSTITUTION_MEMBERSHIP : has
  USER ||--o{ GUARDIANSHIP : parent_of
  USER ||--o{ GUARDIANSHIP : child_of
  TEACHER_PROFILE ||--o{ VERIFICATION_DOCUMENT : submits

  USER ||--o{ COURSE : owns
  INSTITUTION ||--o{ COURSE : hosts
  COURSE ||--o{ SECTION : contains
  SECTION ||--o{ LESSON : contains
  LESSON ||--o{ LESSON_SESSION : scheduled_as
  LESSON ||--o{ MATERIAL : has
  COURSE ||--o{ ENROLLMENT : has
  USER ||--o{ ENROLLMENT : enrolls

  INSTITUTION ||--o{ GROUP : has
  GROUP ||--o{ GROUP_MEMBERSHIP : has
  USER ||--o{ GROUP_MEMBERSHIP : in
  GROUP ||--o{ GROUP_TEACHER : staffed_by
  USER ||--o{ GROUP_TEACHER : teaches
  GROUP ||--o{ LESSON_SESSION : targets

  COURSE ||--o{ HOMEWORK : has
  LESSON ||--o{ HOMEWORK : has
  HOMEWORK ||--o{ SUBMISSION : receives
  USER ||--o{ SUBMISSION : submits
  SUBMISSION ||--o{ SUBMISSION_FILE : attaches

  LESSON_SESSION ||--o{ ATTENDANCE : records
  USER ||--o{ ATTENDANCE : attends
  COURSE ||--o{ CERTIFICATE : grants
  USER ||--o{ CERTIFICATE : earns

  LESSON_SESSION ||--o{ ATTENTION_METRIC : aggregates
  USER ||--o{ ATTENTION_METRIC : measured
  USER ||--o| UBP_BACKUP : optional_backup
  USER ||--o{ RECOMMENDATION : receives

  ACHIEVEMENT ||--o{ USER_ACHIEVEMENT : awarded
  USER ||--o{ USER_ACHIEVEMENT : earns
  USER ||--o{ POINT_EVENT : earns
  USER ||--o{ REVIEW : receives
  USER ||--o{ REVIEW : writes

  USER ||--o{ NOTIFICATION : receives
  USER ||--o{ NOTIFICATION_PREFERENCE : configures

  USER {
    uuid id PK
    citext email
    string phone
    enum role
    string first_name
    string last_name
    string locale
    bool is_active
  }
  STUDENT_PROFILE {
    uuid user_id PK_FK
    date birth_date
    enum age_band
    string grade_level
    int points_cached
    uuid institution_id FK
  }
  TEACHER_PROFILE {
    uuid user_id PK_FK
    string specialty
    text bio
    enum verification_status
    numeric rating_cached
  }
  PARENT_PROFILE {
    uuid user_id PK_FK
  }
  ADMIN_PROFILE {
    uuid user_id PK_FK
    uuid institution_id FK
  }
  INSTITUTION {
    uuid id PK
    string name
    string subdomain
    jsonb branding
    enum status
  }
  INSTITUTION_MEMBERSHIP {
    uuid id PK
    uuid user_id FK
    uuid institution_id FK
    enum role
    enum status
  }
  GUARDIANSHIP {
    uuid id PK
    uuid parent_user_id FK
    uuid child_user_id FK
    enum status
    bool consent_152fz
    timestamptz consent_at
  }
  VERIFICATION_DOCUMENT {
    uuid id PK
    uuid teacher_user_id FK
    string file_key
    enum status
  }
  COURSE {
    uuid id PK
    string title
    enum level
    string subject
    string language
    uuid owner_teacher_id FK
    uuid institution_id FK
    uuid group_id FK
    enum status
    int lesson_minutes
    int lessons_per_week
    int_array lesson_days
  }
  SECTION {
    uuid id PK
    uuid course_id FK
    string title
    int order
  }
  LESSON {
    uuid id PK
    uuid section_id FK
    string title
    int duration_min
    jsonb options
    jsonb schedule_rule
    enum status
    int order
  }
  LESSON_SESSION {
    uuid id PK
    uuid lesson_id FK
    uuid group_id FK
    timestamptz start_at
    timestamptz end_at
    enum status
  }
  MATERIAL {
    uuid id PK
    uuid lesson_id FK
    uuid course_id FK
    enum type
    string title
    string file_key
    int order
  }
  ENROLLMENT {
    uuid id PK
    uuid student_user_id FK
    uuid course_id FK
    enum status
    int progress_pct
  }
  GROUP {
    uuid id PK
    uuid institution_id FK
    string name
    string level
  }
  GROUP_MEMBERSHIP {
    uuid id PK
    uuid group_id FK
    uuid student_user_id FK
  }
  GROUP_TEACHER {
    uuid id PK
    uuid group_id FK
    uuid teacher_user_id FK
    string subject
  }
  HOMEWORK {
    uuid id PK
    uuid lesson_id FK
    uuid course_id FK
    uuid group_id FK
    string title
    enum type
    timestamptz due_at
    bool allow_redo
    uuid created_by FK
  }
  SUBMISSION {
    uuid id PK
    uuid homework_id FK
    uuid student_user_id FK
    int attempt
    text content_text
    enum status
    timestamptz submitted_at
    int score
    text comment
    uuid graded_by FK
    timestamptz graded_at
  }
  SUBMISSION_FILE {
    uuid id PK
    uuid submission_id FK
    string file_key
    string name
  }
  ATTENDANCE {
    uuid id PK
    uuid lesson_session_id FK
    uuid student_user_id FK
    enum status
    timestamptz joined_at
  }
  CERTIFICATE {
    uuid id PK
    uuid student_user_id FK
    uuid course_id FK
    string pdf_key
    uuid verification_uuid
    timestamptz issued_at
  }
  ATTENTION_METRIC {
    uuid id PK
    uuid lesson_session_id FK
    uuid student_user_id FK
    timestamptz bucket_start
    int avg_attention
  }
  UBP_BACKUP {
    uuid id PK
    uuid user_id FK
    bytea encrypted_blob
    string key_hint
    timestamptz updated_at
  }
  RECOMMENDATION {
    uuid id PK
    uuid user_id FK
    enum kind
    string title
    jsonb payload
    bool dismissed
  }
  ACHIEVEMENT {
    uuid id PK
    string code
    string title
    jsonb criteria
  }
  USER_ACHIEVEMENT {
    uuid id PK
    uuid user_id FK
    uuid achievement_id FK
    timestamptz earned_at
  }
  POINT_EVENT {
    uuid id PK
    uuid user_id FK
    enum reason
    int amount
  }
  REVIEW {
    uuid id PK
    uuid teacher_user_id FK
    uuid author_user_id FK
    int rating
    text text
    enum status
  }
  NOTIFICATION {
    uuid id PK
    uuid user_id FK
    enum type
    string title
    jsonb payload
    bool is_read
  }
  NOTIFICATION_PREFERENCE {
    uuid id PK
    uuid user_id FK
    enum event_type
    enum channel
    bool enabled
    uuid child_user_id FK
  }
```

---

## 3. Entities by domain (fields)

### 3.1 Identity & organisation

**USER** — single account table (Django custom user).
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | citext UNIQUE | login |
| phone | varchar NULL | |
| password | varchar | hashed |
| role | enum user_role | student / parent / teacher / admin |
| first_name, last_name | varchar | |
| locale | varchar(8) | default `ru` (i18n-ready) |
| active_learning_profile | varchar(64) | which education the account is currently in — `"<kind>:<uuid>"`. A pointer only; the profiles themselves are **not stored** (see below) |
| is_active | bool | |
| created_at / updated_at | timestamptz | |

**LEARNING PROFILES — a projection, not an entity** (owner req. 15, PROMPT_13 R0.2, verified 2026-08-12).
One account holds several educations: a schoolchild who also takes evening courses is a *pupil*
(9А, Гимназия №1) **and** a *cadet* (English A2). No table was added, because the existing relations
already carry all of it:

| Profile | Derived from |
|---|---|
| PUPIL | `INSTITUTION_MEMBERSHIP` (role=student, status=active) + `GROUP_MEMBERSHIP` for the class + count of `ENROLLMENT` in that institution's courses |
| CADET | `ENROLLMENT` in a course with `institution_id IS NULL` (self-paced) |
| TEACHER | `INSTITUTION_MEMBERSHIP` (role=teacher, status=active) |

A stored profile row would duplicate enrolment state and drift out of sync with it the first time a
pupil joins or leaves a course. Implementation: `backend/apps/accounts/learning.py`.

**STUDENT_PROFILE / PARENT_PROFILE / TEACHER_PROFILE / ADMIN_PROFILE** — 1:1 with USER, role-specific fields.
- STUDENT_PROFILE: `birth_date`, `age_band` enum (junior/teen/adult, derived from birth_date), `grade_level`, `points_cached int`, `institution_id FK NULL`, `avatar_key`.
- TEACHER_PROFILE: `specialty`, `education`, `experience`, `bio`, `verification_status` enum, `rating_cached numeric(2,1)`, `avatar_key`.
- PARENT_PROFILE: minimal (link via GUARDIANSHIP).
- ADMIN_PROFILE: `institution_id FK`.

**INSTITUTION** — school / center (optional; B2C allows independent users).
`name, address, logo_key, website, subdomain UNIQUE NULL, status enum, default_locale, branding jsonb` (white-label colors/domain).

**INSTITUTION_MEMBERSHIP** — user ↔ institution (a teacher may belong to several).
`user_id, institution_id, role enum, status enum (pending/active/inactive), joined_at`.

**GUARDIANSHIP** — parent ↔ child + 152-FZ consent.
`parent_user_id, child_user_id, status enum (pending/active), consent_152fz bool, consent_at`. Unique (parent, child).

**VERIFICATION_DOCUMENT** — teacher diploma/certificate for moderation.
`teacher_user_id, file_key, status enum (pending/approved/rejected)`.

### 3.2 Learning content

**COURSE** `title, description, level enum, subject, language, owner_teacher_id FK, institution_id FK NULL, group_id FK NULL, status enum (draft/published/archived), cover_key, lesson_minutes NULL, lessons_per_week NULL, lesson_days int[] , deleted_at`.

> 🔴 **Ритм занятий — заявление, а не расписание** (решение владельца §50, лист «Создание
> курса и занятия»). Три поля описывают, что преподаватель ОБЕЩАЕТ: сколько идёт занятие,
> сколько раз в неделю, в какие дни (`lesson_days` — ISO-дни, 1 = понедельник). Все три
> пустые по умолчанию: курс без объявленного ритма законен.
>
> Правда о времени живёт в другом месте — `LESSON.schedule_rule` и сами `LESSON_SESSION`.
> **Выводить одно из другого молча нельзя:** учитель перенесёт первый же урок, и два
> источника правды разойдутся. Экран создания занятия вправе ПОДСТАВИТЬ значения из ритма
> как подсказку — и только.
>
> Количество занятий не хранится: «семнадцать занятий» считается по занятиям.
**SECTION** `course_id, title, description, cover_key, order int`.
**LESSON** `section_id, title, description, duration_min, options jsonb {camera,screen,chat,homework}, schedule_rule jsonb {type:once|weekly, days[], time}, status enum, order int, deleted_at`.
**LESSON_SESSION** — concrete occurrence (for attendance and CMF buckets).
`lesson_id, group_id FK NULL, start_at, end_at, status enum (scheduled/live/ended/canceled), room_token NULL`.
🔴 **No recording field** — lesson video/audio are never stored (CLAUDE.md §2.2, owner 2026-08-12).
What remains of a lesson is its summary, not a media file. Gate: `apps/seedum/tests/test_storage_policy.py`.
**MATERIAL** `lesson_id FK NULL, course_id FK NULL, type enum (file/link/text), title, file_key NULL, url NULL, body text NULL, order`.
**ENROLLMENT** — individual student ↔ course.
`student_user_id, course_id, status enum (active/completed/pending), progress_pct int, enrolled_at`. Unique (student, course).

### 3.3 Groups (institutional delivery)

**GROUP** `institution_id, name, level, created_at`.
**GROUP_MEMBERSHIP** `group_id, student_user_id`. Unique (group, student).
**GROUP_TEACHER** `group_id, teacher_user_id, subject`. Teacher assigned to a subject in a group.

### 3.4 Assessment & progress

**HOMEWORK** `lesson_id FK NULL, course_id FK NULL, group_id FK NULL, title, description, type enum (file/text/quiz), due_at, allow_redo bool, created_by FK, published_at, deleted_at`.
**SUBMISSION** — one row per attempt; grading fields inline.
`homework_id, student_user_id, attempt int, content_text, status enum (submitted/late/graded), submitted_at, score int NULL, comment text NULL, graded_by FK NULL, graded_at NULL`. Unique (homework, student, attempt).
**SUBMISSION_FILE** `submission_id, file_key, name`.
**ATTENDANCE** `lesson_session_id, student_user_id, status enum (present/absent/late), joined_at`. Unique (session, student).
**CERTIFICATE** `student_user_id, course_id, pdf_key, verification_uuid UNIQUE, issued_at`. Public page at `/verify/{verification_uuid}`.

### 3.5 SEduM (CMF) — privacy-first

**ATTENTION_METRIC** — aggregated attention only, per time bucket within a session.
`lesson_session_id, student_user_id, bucket_start timestamptz, avg_attention int (0–100)`. Index (student, bucket_start). Powers live chart, session report, per-subject/per-day analytics (rolled up in queries).
**UBP_BACKUP** — optional, opt-in, client-side encrypted blob (server cannot read).
`user_id UNIQUE, encrypted_blob bytea, key_hint, updated_at`.
**RECOMMENDATION** — generated suggestions for dashboards.
`user_id, kind enum (schedule/course/material/wellbeing), title, body, payload jsonb, dismissed bool, created_at`.

> **Not stored server-side:** raw camera video/audio, frame-level biometric features, plaintext UBP. See §6.

### 3.6 Engagement

**ACHIEVEMENT** `code UNIQUE, title, description, criteria jsonb, icon`.
**USER_ACHIEVEMENT** `user_id, achievement_id, earned_at`. Unique (user, achievement).
**POINT_EVENT** — append-only points ledger; group leaderboard derived; `points_cached` denormalised on STUDENT_PROFILE.
`user_id, reason enum (attendance/homework/grade/streak), amount int, created_at`.
**REVIEW** — student → teacher.
`teacher_user_id, author_user_id, rating int (1–5), text, status enum (visible/pending/hidden), created_at`.

### 3.7 Platform

**NOTIFICATION** `user_id, type enum, title, body, payload jsonb, is_read bool, created_at`.
**NOTIFICATION_PREFERENCE** `user_id, event_type enum, channel enum (push/email/in_app), enabled bool, child_user_id FK NULL`. Per-event, per-channel, optionally per-child (for parents).

---

## 4. Enums

| Enum | Values |
|---|---|
| user_role | student, parent, teacher, admin |
| age_band | junior, teen, adult |
| membership_role | teacher, student, admin |
| membership_status | pending, active, inactive |
| guardianship_status | pending, active |
| verification_status | pending, approved, rejected |
| course_level | grade_1…grade_11, adult |
| course_status | draft, published, archived |
| lesson_status | draft, published |
| session_status | scheduled, live, ended, canceled |
| material_type | file, link, text |
| enrollment_status | active, completed, pending |
| homework_type | file, text, quiz |
| submission_status | submitted, late, graded |
| attendance_status | present, absent, late |
| recommendation_kind | schedule, course, material, wellbeing |
| point_reason | attendance, homework, grade, streak |
| review_status | visible, pending, hidden |
| notification_type | grade, new_lesson, absence, homework_done, cmf_insight, weekly_digest |
| notification_channel | push, email, in_app |

---

## 5. Design decisions & alternatives

1. **Custom USER + role + 1:1 profile tables.** Chosen over (a) one fat user table (sparse columns) and (b) fully separate per-role user tables (breaks auth/relations). Profiles keep role-specific fields clean; `age_band` lives on STUDENT_PROFILE (derived), not as a separate role.
2. **LESSON (definition) vs LESSON_SESSION (occurrence).** A lesson defines content/options/recurrence; sessions are concrete instances. This is what makes per-occurrence attendance and CMF metrics possible. Alternative — baking schedule into LESSON and computing occurrences on the fly — was rejected because attendance and metrics need a stable per-occurrence row. (Recordings were part of the original rationale and are now excluded by §2.2.)
3. **Two delivery paths: individual ENROLLMENT and institutional GROUP.** B2C self-enrollment uses ENROLLMENT; schools use GROUP + GROUP_MEMBERSHIP, and a session may target a group. Course may carry an optional `group_id`. Alternative — a single CourseGroup M2M — is cleaner long-term; deferred to keep MVP simple. (Open question §7.)
4. **Grading inline on SUBMISSION, attempts as rows.** One submission row per attempt; “redo” creates a new attempt. Avoids a separate Grade table for MVP while preserving history. Alternative — dedicated GRADE table — kept in reserve if non-homework assessments arrive.
5. **CMF: only aggregates server-side; UBP on device + optional encrypted backup.** Core privacy decision (§6). ATTENTION_METRIC stores `avg_attention` per bucket; no raw signals. UBP_BACKUP is opaque to the server.
6. **Points as append-only POINT_EVENT ledger + cached total.** Auditable and lets leaderboards/streaks recompute; `points_cached` avoids per-request aggregation. Alternative — a single mutable counter — loses history.
7. **UUID PKs.** Non-enumerable (privacy for student/verification URLs), distribution-friendly, eases the future certificate→NFT bridge. Trade-off: larger indexes vs bigint — fine at MVP scale.
8. **Institution optional.** Independent teachers/tutors and self-enrolled students operate without an institution; institutional features unlock when present.
9. **Files in object storage by key.** S3-compatible (Yandex Object Storage); DB stores keys only. Materials, submission files, certificates and avatars follow this — lesson recordings do **not** exist (§2.2), and no upload purpose accepts an `audio/*` or `video/*` content type.

---

## 6. Privacy model (SEduM «user node»)

Direct mapping of the product principle “raw biometrics never leave the device”.

**Never stored server-side:**
- Raw camera video and microphone audio.
- Frame-level biometric features (gaze, landmarks, expressions).
- Plaintext UBP (biological passport).

**Stored server-side:**
- `ATTENTION_METRIC`: aggregated `avg_attention` (0–100) per time bucket per `(student, session)`. Sent from client over WebSocket as `{ session_id, student_id, bucket_start, avg_attention }`.
- Derived analytics (per subject, per day) computed by querying ATTENTION_METRIC — no extra raw data.
- `UBP_BACKUP` (optional, opt-in): a client-side-encrypted blob; the server stores and returns bytes it cannot decrypt.

On-device only (IndexedDB): UBP, per-frame analysis, calibration. MediaPipe runs in the browser/app.

---

## 7. Open questions

- **Group ↔ Course shape:** `group_id` on COURSE and on LESSON_SESSION vs a dedicated CourseGroup M2M. Decide before the schedule module.
- **Non-homework assessments** (tests/quizzes as gradable events): extend SUBMISSION typing or add an ASSESSMENT entity.
- **Recommendation engine:** batch job cadence and inputs (rule-based for MVP over ATTENTION_METRIC + grades).
- **Quiz storage** for `homework_type=quiz`: questions/answers schema (separate QUIZ/QUESTION tables) — define when the quiz feature is built.

---

## 8. Next

This model feeds **the GraphQL schema** (types, queries, mutations, subscriptions — including an attention-metrics subscription) and the **Django models** (apps split per domain: accounts, institutions, courses, scheduling, homework, seedum, engagement, notifications).
