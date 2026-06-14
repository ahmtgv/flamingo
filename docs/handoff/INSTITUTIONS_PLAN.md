# Plan (DRAFT — owner review) — Institutions / Admin module

**Status:** investigation + plan only. **Nothing implemented.** Written during the overnight
run for morning review. Implementation is **blocked on one product decision** (§1) and will
touch existing tables via migration, so it must not start without owner sign-off.

## Why
`apps/institutions` is the next module in the build order (`CLAUDE.md` §10: `… → admin → SEduM`;
handoff §5). It turns the B2B side on: schools (INSTITUTION) with members, student GROUPs,
group teachers, white-label branding, and review moderation. Several apps already reserve
nullable FKs "added with the institutions module" (accounts, courses, scheduling, homework).
The SDL already defines the full contract; the enums already exist in `common/enums.py`
(`InstitutionStatus`, `MembershipRole`, `MembershipStatus`, `ReviewStatus`).

## 1. ⚠️ BLOCKING DECISION (owner) — Group ↔ Course shape
ERD §7 open question, quoted: *"`group_id` on COURSE and on LESSON_SESSION vs a dedicated
CourseGroup M2M. Decide before the schedule module."* ERD §5: a single `CourseGroup` M2M is
*"cleaner long-term; deferred to keep MVP simple."*
- **Option A — `group_id` FK (1:N), recommended for MVP.** Nullable `group_id` on `Course`,
  `LessonSession`, `Homework` (matches the ERD entity blocks today; `HomeworkInput` already
  accepts `groupId`). Simple queries, least code. Limit: a course/session belongs to ≤1 group;
  sharing one course across groups means duplicate course rows.
- **Option B — `CourseGroup` M2M.** Join table(s) course↔group (and session↔group). Cleaner
  for sharing a course across many groups; ERD calls it better long-term. Cost: extra tables,
  more complex access/scheduling queries.
- **Tension to resolve:** ERD narrative says a session *"targets GROUP(s)"* (plural) while the
  `LESSON_SESSION` entity carries a single `group_id`. If sessions must target multiple groups,
  that pushes toward B (at least for sessions).
- **Recommendation:** Option A for MVP (least risk, matches existing nullable fields), revisit B
  when multi-group sharing is a real requirement. **Owner: please pick A or B.** Everything in §5
  (cross-app FKs) depends on this.

## 2. Scope
- **In:** new `backend/apps/institutions/` — models `Institution`, `InstitutionMembership`,
  `Group`, `GroupMembership`, `GroupTeacher`; services (admin-scoped); GraphQL
  types/queries/mutations matching the SDL; tests; then the admin FE (institution settings +
  branding, members, groups). Backend-then-FE commit pattern.
- **Decision needed — REVIEW placement.** `CLAUDE.md` §4 puts `REVIEW` in `apps/engagement`, but
  the SDL's `createReview`/`moderateReview`/`teacherReviews` and admin moderation read as
  institutions-admin work. **Recommend:** keep the `Review` *model* for the engagement module and
  **defer all review queries/mutations** out of this slice (don't half-build them here). Flag for
  owner. (`TeacherProfile.review_count`/`Course.rating` already return stubs "populated by the
  engagement module".)
- **Out / deferred:** engagement (reviews/points/leaderboard), AdminDashboard/GroupStat analytics
  (need SEduM + grades aggregation), `StudentProfile.institution` for pure-B2C (see §7), any
  payment/SEduM work.

## 3. Models — `backend/apps/institutions/models.py` (ERD §3.1, §3.3)
Reuse `common.enums` (`InstitutionStatus`, `MembershipRole`, `MembershipStatus`) via `choices()`.
All extend `common.BaseModel` (uuid pk + timestamps); none need soft-delete except `Institution`
(`SoftDeleteModel`).
- `Institution(SoftDeleteModel)`: `name`, `address` (blank), `logo_key` (blank), `website`
  (blank), `subdomain` (unique, null), `status` (default per enum), `default_locale` (default
  "ru"), `branding` (JSONField, default dict — white-label colors/domain).
- `InstitutionMembership(BaseModel)`: `user` (FK accounts.User), `institution` (FK), `role`
  (MembershipRole), `status` (MembershipStatus, default pending), `joined_at` (null). Unique
  (user, institution).
- `Group(BaseModel)`: `institution` (FK), `name`, `level` (blank).
- `GroupMembership(BaseModel)`: `group` (FK), `student` (FK accounts.StudentProfile). Unique
  (group, student). *(ERD keys on student_user_id; StudentProfile pk == user id, so FK to
  StudentProfile matches, consistent with Enrollment.)*
- `GroupTeacher(BaseModel)`: `group` (FK), `teacher` (FK accounts.TeacherProfile), `subject`.
Migration: `institutions/0001_initial`.

## 4. Services + authorization — `services.py`
**Authorization (CLAUDE.md §5/§6):** "an admin only their institution." Add helper
`_admin_institution(user) -> Institution` (user is ADMIN role + has an active admin membership /
`AdminProfile.institution`); every mutation asserts the target institution/group belongs to the
caller's institution. Mirrors the `_owned_course` pattern in `courses/services.py`.
Functions map 1:1 to the SDL mutations: `create_institution`, `update_institution`,
`update_branding`, `invite_member`, `update_membership`, `remove_member`, `create_group`,
`update_group`, `add_students_to_group`, `remove_student_from_group`, `assign_teacher`; query
services `get_institution`, `groups`, `group`, `institution_members`.

## 5. ⚠️ Cross-app FK wiring (migrations touch existing tables — owner approval required)
Once §1 is decided, add the reserved nullable FKs (all additive nullable columns — no data
migration, but they alter existing tables, so they need owner sign-off per the overnight rules):
- `accounts.AdminProfile.institution` (required per ERD) and optionally
  `accounts.StudentProfile.institution` (nullable; only if B2C students can belong to a school).
- `courses.Course.institution` (+ `group` if Option A).
- `scheduling.LessonSession.group` (Option A).
- `homework.Homework.group` (Option A) — and forward `HomeworkInput.groupId` (currently accepted
  but dropped, `homework/graphql/mutations.py:25`) to the service.
- Then expose the SDL cross-app fields currently omitted in the live types: `Course.institution`,
  `LessonSession.group`, `Homework.group`, `StudentProfile.institution`, `AdminProfile.institution`.
- **Access implication:** group-based delivery means `courses/access.py: can_access_course` should
  later also grant access to students in a group the course targets — that rule goes **inside**
  `can_access_course` (the chokepoint), not scattered. Out of scope until the model lands.

## 6. GraphQL — `graphql/{types,queries,mutations}.py`
Live type names match the SDL (`Institution`, `InstitutionMembership`, `Group`, `GroupTeacher`).
Cross-app: import `UserType`/`StudentProfileType`/`TeacherProfileType` from accounts. Compose
`InstitutionsQuery`/`InstitutionsMutation` into `api/schema.py`. Queries: `institution(id)`,
`groups(institutionId)`, `group(id)`, `institutionMembers(institutionId, role)`. Mutations per
the SDL block (createInstitution … assignTeacher). Inputs `InstitutionInput`, `GroupInput`,
`InviteInput` already specified in the SDL. `Institution.branding`/`logoUrl` resolvers
(`/files/{logo_key}`). **No SDL edits needed** (the contract already covers this), unlike the
hand-added `myCourses`/`lessonHomework`.

## 7. Open questions for the owner (decide before/at implementation)
1. **§1 group shape: Option A (`group_id`) vs B (`CourseGroup` M2M).** Blocks §5.
2. **REVIEW home:** keep reviews entirely in the future `engagement` app (recommended) vs include
   `moderateReview` here?
3. **B2C `StudentProfile.institution`:** does an independent B2C pupil ever belong to an
   institution, or is institution membership teacher/admin-only for MVP? (Affects whether to add
   that nullable FK now.)
4. **Institution onboarding:** how is the first admin + institution created — self-serve
   `createInstitution` by a new admin, or seeded/back-office? `InstitutionMembership.status`
   starts `pending` — what approves it?
5. **Subdomain/white-label:** is subdomain routing/branding actually wired in MVP, or is
   `branding` JSON stored-but-unused for now (like cover/file keys today)?

## 8. Suggested sequencing (when approved)
Large module — split into green commits: (a) `institutions` models + migration + services +
GraphQL + tests (no cross-app FKs yet); (b) cross-app FKs + expose SDL fields + access wiring
(the migration-touching step — owner-gated); (c) admin FE (institution settings + branding,
members, groups) mirroring `features/courses` patterns + a `ru/institutions.json` namespace.
Keep CLAUDE.md invariants: access via `can_access_course`, design tokens, ru i18n, per-resolver
admin-scoping, no PII store outside RF.

## 9. Verification (when implemented)
Backend `pytest` (models, admin-scoping permission boundaries, the privacy/authorization
invariants) + `ruff`/`black`; FE `build`/`lint`/`vitest`; browser E2E: admin creates institution
→ sets branding → invites a teacher (pending→active) → creates a group → adds students + assigns a
teacher → confirms a non-member admin cannot touch it.
