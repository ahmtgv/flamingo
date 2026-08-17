"""Single source for enums (ERD §4).

Each enum is a plain ``Enum`` decorated for GraphQL (`@strawberry.enum`) and
reused as Django field choices via :func:`choices`. The DB stores the member
*value*; GraphQL exposes the member *name* (UPPER_SNAKE).
"""

from enum import Enum

import strawberry


def choices(enum_cls: type[Enum]) -> list[tuple[str, str]]:
    """Django ``choices=`` from an Enum: (value, member_name)."""
    return [(member.value, member.name) for member in enum_cls]


@strawberry.enum
class Role(Enum):
    STUDENT = "student"
    PARENT = "parent"
    TEACHER = "teacher"
    ADMIN = "admin"


@strawberry.enum
class AgeBand(Enum):
    JUNIOR = "junior"
    TEEN = "teen"
    ADULT = "adult"


@strawberry.enum
class LearningProfileKind(Enum):
    """One learning context inside a single account (owner decision 2026-08-12, req. 15).

    PUPIL — studying inside an institution: class, timetable, deadlines set from outside.
    CADET — self-paced study on a standalone course.
    TEACHER — teaching inside an institution.

    A schoolchild taking evening courses holds a PUPIL and a CADET profile at once. These
    are projections over existing relations (INSTITUTION_MEMBERSHIP / ENROLLMENT), not a
    stored entity — see apps/accounts/learning.py.
    """

    PUPIL = "pupil"
    CADET = "cadet"
    TEACHER = "teacher"


@strawberry.enum
class VerificationStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@strawberry.enum
class InstitutionStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"


@strawberry.enum
class MembershipRole(Enum):
    TEACHER = "teacher"
    STUDENT = "student"
    ADMIN = "admin"


@strawberry.enum
class MembershipStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"


@strawberry.enum
class GuardianshipStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"


@strawberry.enum
class CourseLevel(Enum):
    """WHERE in the education system the learner stands — one of two independent axes of a
    course's audience (owner decision 2026-08-15). The other is :class:`CourseFormat`.

    Two axes and not one, because the owner's list mixes them: «дошкольники · колледжи · вузы»
    are places in the system, «курсы · повышение квалификации» are kinds of programme, and a
    single list cannot express «курс английского для 7 класса» without inventing a combined
    item for every pair. It also matches the law: ФЗ-273 ст. 10 counts дошкольное · общее ·
    среднее профессиональное · высшее as levels, and ст. 75/76 puts дополнительное and
    дополнительное профессиональное alongside them as a separate branch — which is exactly
    CourseFormat.

    The school years stay per-grade rather than collapsing into «начальная/средняя/старшая»:
    a course for grade 5 is not a course for grade 9, and the constructor already stores one
    value. The UI keeps the list short by asking the stage first (five options) and the class
    only when the stage is school — never twenty items in one select.
    """

    PRESCHOOL = "preschool"
    GRADE_1 = "grade_1"
    GRADE_2 = "grade_2"
    GRADE_3 = "grade_3"
    GRADE_4 = "grade_4"
    GRADE_5 = "grade_5"
    GRADE_6 = "grade_6"
    GRADE_7 = "grade_7"
    GRADE_8 = "grade_8"
    GRADE_9 = "grade_9"
    GRADE_10 = "grade_10"
    GRADE_11 = "grade_11"
    COLLEGE = "college"
    UNIVERSITY = "university"
    ADULT = "adult"


@strawberry.enum
class CourseFormat(Enum):
    """WHAT KIND of programme it is — the second audience axis (owner decision 2026-08-15).

    PROGRAM — a subject inside a stage: a school year of algebra, a university course.
    COURSE — дополнительное образование: a standalone course, the thing a CADET profile takes.
    PROFESSIONAL — дополнительное профессиональное: повышение квалификации, профпереподготовка.

    Default PROGRAM, which is what every course created before this field existed actually was.
    """

    PROGRAM = "program"
    COURSE = "course"
    PROFESSIONAL = "professional"


@strawberry.enum
class CourseStatus(Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


@strawberry.enum
class LessonStatus(Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


@strawberry.enum
class LessonKind(Enum):
    """What a lesson runs on. Owner decision 2026-08-12 (atlas sheet 01, question 1): a
    telescope lesson stays a lesson in the programme, but doing it opens the device's own
    page — the instrument behaves like a subject of its own. EXTERNAL_DEVICE is the seam for
    the shared ExternalDevice abstraction (CLAUDE.md §11), not a per-vendor hack."""

    STANDARD = "standard"
    EXTERNAL_DEVICE = "external_device"


@strawberry.enum
class SavedItemKind(Enum):
    """Why a learner kept something — the two tags atlas sheet 01 shows on saved items."""

    SAVED = "saved"  # "в мои материалы", usually with a note
    WATCH_LATER = "watch_later"


@strawberry.enum
class SessionStatus(Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"
    CANCELED = "canceled"


@strawberry.enum
class MaterialType(Enum):
    FILE = "file"
    LINK = "link"
    TEXT = "text"


@strawberry.enum
class UploadPurpose(Enum):
    """What a presigned upload is for — gates the requestUpload role check, key prefix, and
    per-purpose size/type limits (see apps/files/services.py). Not a DB enum."""

    AVATAR = "avatar"
    MATERIAL = "material"
    SUBMISSION = "submission"
    VERIFICATION = "verification"
    COVER = "cover"
    INSTITUTION_LOGO = "institution_logo"
    # 🔴 §28.1.1: картинка на доске уходила в `data` целиком, base64 (~5 МБ с телефона), и
    # оттуда — подпиской КАЖДОМУ в классе плюс в каждый ответ `board(lessonId:)`. Один
    # снимок клал канал всему классу. Теперь она идёт тем же путём, что любой файл продукта.
    BOARD_IMAGE = "board_image"


@strawberry.enum
class EnrollmentStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PENDING = "pending"


@strawberry.enum
class AccessStatus(Enum):
    """Payment-gating seam for an enrollment (distinct from the lifecycle
    ``EnrollmentStatus``). Default ``ACTIVE`` keeps everything open/free until a
    monetization model is chosen; ``PENDING_PAYMENT`` is reserved for the future
    ``billing`` app. See ``courses/access.py``."""

    ACTIVE = "active"
    PENDING_PAYMENT = "pending_payment"


@strawberry.enum
class HomeworkType(Enum):
    FILE = "file"
    TEXT = "text"
    QUIZ = "quiz"


@strawberry.enum
class SubmissionStatus(Enum):
    SUBMITTED = "submitted"
    LATE = "late"
    GRADED = "graded"


@strawberry.enum
class AttendanceStatus(Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"


@strawberry.enum
class RecommendationKind(Enum):
    SCHEDULE = "schedule"
    COURSE = "course"
    MATERIAL = "material"
    WELLBEING = "wellbeing"


@strawberry.enum
class InsightKind(Enum):
    GOOD = "good"
    WATCH = "watch"


@strawberry.enum
class PointReason(Enum):
    ATTENDANCE = "attendance"
    HOMEWORK = "homework"
    GRADE = "grade"
    STREAK = "streak"


@strawberry.enum
class ReviewStatus(Enum):
    VISIBLE = "visible"
    PENDING = "pending"
    HIDDEN = "hidden"


@strawberry.enum
class NotificationType(Enum):
    GRADE = "grade"
    NEW_LESSON = "new_lesson"
    ABSENCE = "absence"
    HOMEWORK_DONE = "homework_done"
    CMF_INSIGHT = "cmf_insight"
    WEEKLY_DIGEST = "weekly_digest"


@strawberry.enum
class NotificationChannel(Enum):
    PUSH = "push"
    EMAIL = "email"
    IN_APP = "in_app"


# --- Chat (R2) ---------------------------------------------------------------
@strawberry.enum
class ChannelKind(Enum):
    """Who a conversation is between. The kind decides who may be a member and which
    safety options apply — it is never a display label."""

    SUBJECT_GROUP = "subject_group"  # предмет × группа
    PUPIL_TEACHER = "pupil_teacher"  # ученик ↔ учитель
    PEER = "peer"  # ученик ↔ ученик
    STAFF_ROOM = "staff_room"  # учительская


@strawberry.enum
class ReportStatus(Enum):
    """A complaint about a conversation. OPEN is what lets a group teacher open it."""

    OPEN = "open"
    REVIEWED = "reviewed"
    DISMISSED = "dismissed"


# --- Exercises (R4.1, RND_01_SPEC_ENGLISH §3/§7.2) -----------------------------
@strawberry.enum
class ExerciseKind(Enum):
    """The typology from the English spec §3. Subject-neutral on purpose — the same kinds
    serve Russian and astronomy, which is why the app is `exercises`, not `english`."""

    VOCAB_CARD = "vocab_card"
    CLOZE = "cloze"
    CHOICE = "choice"
    WORD_ORDER = "word_order"
    MATCH = "match"
    LISTENING = "listening"
    DICTATION = "dictation"
    PRONUNCIATION = "pronunciation"
    SPEAKING = "speaking"
    WRITING = "writing"
    TRANSFORM = "transform"
    ROLEPLAY = "roleplay"


@strawberry.enum
class SkillArea(Enum):
    VOCAB = "vocab"
    GRAMMAR = "grammar"
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    SPEAKING = "speaking"
    PRONUNCIATION = "pronunciation"


@strawberry.enum
class ExerciseMode(Enum):
    """Where a set is used — and, with it, whether the journal ever hears about it (§7.4)."""

    LIVE = "live"
    HOMEWORK = "homework"
    PRACTICE = "practice"


@strawberry.enum
class AttemptContext(Enum):
    LIVE = "live"
    HOMEWORK = "homework"
    PRACTICE = "practice"


# --- Grading (R4.1, owner decision 2026-08-13) --------------------------------
@strawberry.enum
class GradingScale(Enum):
    """How a course's marks are ENTERED and SHOWN. Storage is one number either way.

    A school subject keeps the five-point mark a parent recognises; a self-paced course reads
    in percent, which is honest about what «92%» on a test actually means. The scale never
    touches analytics — topic mastery is computed in internal fractions so a coarse scale
    cannot blur the picture.
    """

    FIVE_POINT = "five_point"
    PERCENT = "percent"
    # 🔴 Решение владельца §28.2: второй вид отметки — зачёт/незачёт, БЕЗ числа. Не «ноль или
    # сто»: «зачтено» и «100%» — разные утверждения, и превращать первое во второе значит
    # придумывать точность, которой преподаватель не ставил.
    PASS_FAIL = "pass_fail"
    # 🔴 ТРЕБОВАНИЕ ИЗВНЕ, А НЕ ОСТОРОЖНОСТЬ (проверено 17.08 по заданию §28.2).
    #
    # В РФ первый класс учится БЕЗ ОТМЕТОК. Основание: ФГОС начального общего образования
    # (приказ Минобрнауки РФ № 373 от 06.10.2009, ныне в редакции приказа Минпросвещения
    # № 286 от 31.05.2021) плюс ФЗ-273 «Об образовании в РФ»; школы вводят это своими
    # положениями о безотметочном обучении.
    #
    # ⚠️ И вторая половина требования, которую легко потерять: **значки вместо цифр тоже
    # запрещены** — ни звёздочек, ни солнышек, ни самолётиков. Разрешена только словесная
    # оценка. То есть «пятибалльную шкалу спрятать за смайликами» — не решение.
    MARKLESS = "markless"


# --- Board (R3.2) -------------------------------------------------------------
@strawberry.enum
class BoardElementKind(Enum):
    """What can live on the canvas. A mind-map is these plus LINK, not a separate mode."""

    PEN = "pen"
    TEXT = "text"
    STICKER = "sticker"
    SHAPE = "shape"
    LINK = "link"  # a connector between two elements — this is what makes it a mind-map
    IMAGE = "image"  # pasted from the clipboard


# --- Dictionary (R4.3, RND_01_SPEC_ENGLISH §5.1/§7.2) -------------------------
@strawberry.enum
class LexicalSource(Enum):
    """Where a piece of the word card came from — and, with it, which licence applies.

    The list is closed on purpose (owner decision 2026-08-12, sheet 02): only open bases are
    pulled INSIDE the product. A closed dictionary is a link that opens in a new tab, never a
    row in this table. Adding a member here is a licensing decision, not a code change.
    """

    WORDNET = "wordnet"  # Open English WordNet — CC BY 4.0 + Princeton WordNet License
    TATOEBA = "tatoeba"  # example sentences — CC BY 2.0 FR, credit the sentence author
    COMMON_VOICE = "common_voice"  # Mozilla Common Voice — CC0
    OWN = "own"  # written by our own methodologist


@strawberry.enum
class PartOfSpeech(Enum):
    NOUN = "noun"
    VERB = "verb"
    ADJECTIVE = "adjective"
    ADVERB = "adverb"
    PHRASE = "phrase"
    OTHER = "other"


# --- Spaced repetition (R4.3/R4.4, RND_01_SPEC_ENGLISH §7.2/§7.3) --------------
@strawberry.enum
class CardDirection(Enum):
    """Recognition (en→ru) is easier than recall (ru→en); the spec keeps them apart because
    knowing a word one way is genuinely not knowing it the other."""

    RECOGNITION = "recognition"
    RECALL = "recall"


@strawberry.enum
class CardState(Enum):
    """FSRS states. Not SM-2 — see §7.3."""

    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    RELEARNING = "relearning"


@strawberry.enum
class ReviewRating(Enum):
    """The four FSRS grades. Named, not numbered, so the contract does not depend on the
    library's integer ordering staying put."""

    AGAIN = "again"
    HARD = "hard"
    GOOD = "good"
    EASY = "easy"


@strawberry.enum
class AchievementKey(Enum):
    """Milestones a learner passes ON THEIR OWN (owner decision: no leaderboards, no
    comparing children with each other — only with who they were).

    Every key is a fact about one person's own history, and none of them can be earned by
    being ahead of somebody else. That is not a UI choice that could be revisited later: it
    is the shape of this enum.
    """

    FIRST_WORD = "first_word"
    TEN_WORDS = "ten_words"
    FIFTY_WORDS = "fifty_words"
    FIRST_MASTERED = "first_mastered"
    TEN_MASTERED = "ten_mastered"
    STREAK_3 = "streak_3"
    STREAK_7 = "streak_7"
    STREAK_30 = "streak_30"
    HUNDRED_REVIEWS = "hundred_reviews"


# --- Lesson summary (R4.2, atlas sheet 02) ------------------------------------
@strawberry.enum
class SummaryStatus(Enum):
    """A summary is a teacher's draft until they send it. Learners only ever see SENT."""

    DRAFT = "draft"
    SENT = "sent"


@strawberry.enum
class SummarySection(Enum):
    """The five blocks of sheet 02. CHAT is one of them by owner decision: the lesson chat
    lives INSIDE the summary and has no eternal feed of its own (§4.2 п.1)."""

    TOPIC = "topic"  # «О чём был урок»
    WORDS = "words"  # «Новые слова» — these feed the repetition queue (R4.4)
    WATCH = "watch"  # «На что обратить внимание»
    CHAT = "chat"  # «Чат занятия»
    HOMEWORK = "homework"  # «Задано» — becomes a real HOMEWORK row on send


@strawberry.enum
class SummarySource(Enum):
    """Where a line came from. Sheet 02 requires this to be visible on every item, so it is
    stored as DATA — the client composes «с доски · 4 узла, добавил Петя» from the source and
    its meta, the server never ships display text.

    SPEECH is the one source that is gated: it appears only where `lesson_transcription` is
    allowed AND the speaker consented, and the speech itself is never stored (§4.1) — the
    point is assembled from an in-memory stream that is dropped immediately after.
    """

    PLAN = "plan"  # из плана занятия
    BOARD = "board"  # с доски
    SPEECH = "speech"  # из речи занятия — разобрано на лету, запись не велась
    MATERIAL = "material"  # из материалов урока
    TEST = "test"  # из результатов теста
    CHAT = "chat"  # переписка занятия
    TEACHER = "teacher"  # написал преподаватель


# --- Desktop host: devices and the meeting point (Р5.0, PROMPT_14) ------------
@strawberry.enum
class DevicePlatform(Enum):
    """What kind of machine is hosting. Reported by the app, used for nothing but telling
    two of a teacher's machines apart in the revoke list."""

    MACOS = "macos"
    WINDOWS = "windows"
    LINUX = "linux"
    OTHER = "other"


@strawberry.enum
class MeetingAccessMode(Enum):
    """Who may come in by the group's link (atlas D3).

    The default is the sheet's default and stays that way until the owner answers §5.1 of
    PROMPT_14 — this enum exists so the answer is a one-line change, not a redesign.
    """

    GROUP_ONLY = "group_only"  # только ученики этой группы
    ANY_AUTHENTICATED = "any_authenticated"  # любой, кто вошёл в Flamingo
    KNOCK = "knock"  # с подтверждением преподавателя на входе


@strawberry.enum
class SignalKind(Enum):
    """One step of a WebRTC handshake (Р5.1).

    These cross the server and are never written down: an SDP carries IP addresses and codec
    detail, and a routing message that outlives the call it routed is a record nobody asked
    for. `test_signalling.py` asserts there is no model for them.
    """

    OFFER = "offer"
    ANSWER = "answer"
    ICE = "ice"
    BYE = "bye"


@strawberry.enum
class ConnectionType(Enum):
    """How the media actually got there (Р5.1).

    Shown to the teacher because it explains what they are feeling: RELAY means the network
    would not allow a direct path and every packet is going through our server, which is
    slower and is worth knowing before blaming the laptop.
    """

    DIRECT = "direct"
    RELAY = "relay"
    UNKNOWN = "unknown"


@strawberry.enum
class UplinkVerdict(Enum):
    """What an uplink measurement means, in words (§19.3 — «предупреждаем, не запрещаем»).

    The product never blocks a lesson on this. It says what the channel is good for and
    leaves the choice with the teacher, who knows what the lesson is and who the children are.
    """

    COMFORTABLE = "comfortable"  # eight, with headroom
    WORKABLE = "workable"  # the group it names, and no more
    TIGHT = "tight"  # a pair; wired cable strongly advised
    TOO_WEAK = "too_weak"  # even a pair will break up
    UNKNOWN = "unknown"  # never measured


@strawberry.enum
class BackupKind(Enum):
    """Where the teacher's copy of the cabinet goes (D2 step 2, OWNER_SCOPE §19.1).

    The copy is the one thing in this product that is **not optional**: the laptop holds the
    work and the grades of living children, and there is no second place they exist. So NONE
    is a state the setup will not let a machine finish in — it is here to describe a machine
    that has not got there yet, not a choice offered on the screen.
    """

    NONE = "none"  # setup has not reached step 2
    EXTERNAL_DISK = "external_disk"  # «на внешний диск»
    CLOUD_FOLDER = "cloud_folder"  # «или в вашу папку облака» — theirs, not ours


@strawberry.enum
class MirrorKind(Enum):
    """What a pupil keeps at the meeting point (Р5.0-Б, OWNER_SCOPE §20.3).

    The list is the owner's ownership boundary, in one enum: **выдал классу — стало общим и
    появилось у ученика; не выдал — своё.**

    ⚠️ Р5.4-Б widened WHAT a pupil keeps and did **not** move that boundary. `MATERIAL` and
    `BOARD` are here because §20.5.1 says a pupil keeps the guides and the boards of their own
    lessons — but only ones that were **handed out**: a material mirrors on `share_material`,
    a board on the teacher saving it into the lesson's materials. There is still no member a
    teacher's unshared programme or an unsaved draft could be written under, which is what
    keeps `test_an_unshared_material_never_appears_in_a_mirror` biting.
    """

    WORK = "work"  # a submission — its text, its attempt number, its score and comment
    SUMMARY = "summary"  # a SENT lesson summary, chat section included
    ACHIEVEMENT = "achievement"  # progress that is the child's own history
    CHAT = "chat"  # a message from a conversation this pupil is in
    # --- Р5.4-Б, OWNER_SCOPE §20.5.1: у ученика лежит вся его учёба, а не только написанное им
    DIARY = "diary"  # одно занятие: когда, был ли, что получил
    BOARD = "board"  # сохранённая доска или майндмап — то, что класс видел на экране
    MATERIAL = "material"  # ВЫДАННАЯ методичка или материал — содержимым, не ссылкой
    # 🔴 §27.2 (решение владельца 17.08): «мои материалы» — личная папка ученика. Она
    # принадлежит ему навсегда (§20.5), значит обязана уезжать в зеркало вместе с остальной
    # его учёбой. Хранится ССЫЛКА и заметка, никогда не копия содержимого: лицензия едет с
    # источником, а не с нами (RND_02 §1).
    SAVED = "saved"  # то, что ученик сохранил себе сам — из урока или из хаба источников


@strawberry.enum
class JoinDecision(Enum):
    """What the person holding a link is told. Never a bare «нет» — D3 is explicit that a
    stranger sees «вы не в этой группе» with a way forward, and an old link says it was
    replaced rather than that it never existed."""

    ALLOWED = "allowed"
    NOT_IN_GROUP = "not_in_group"
    KNOCK_REQUIRED = "knock_required"
    LINK_REPLACED = "link_replaced"


# --- Jurisdiction gate (docs/rnd/RND_01_JURISDICTION.md) ---------------------
# Deliberately NOT @strawberry.enum: the compliance layer is server-side only. A client
# must never be able to read (let alone influence) the jurisdiction decision, and keeping
# these out of the schema also keeps the published contract free of compliance internals.


class Jurisdiction(Enum):
    """Legal regime a tenant operates under. UNKNOWN is a real, strictest-profile value —
    never a placeholder to be treated as "probably fine" (fail-closed, red line 7)."""

    RU = "ru"
    EU = "eu"
    UNKNOWN = "unknown"


class JurisdictionSource(Enum):
    """How a tenant's jurisdiction was established — governs whether it may *lower*
    strictness (§6.2). CONTRACT/KYC_VERIFIED are evidence about the tenant; DEPLOYMENT is
    the operator's own data contour (§6.1: deployment region is the strongest technical
    criterion). SELF_DECLARED/INFERRED are claims: they may raise strictness, never lower it.
    IP/locale are INFERRED and are only ever an anomaly signal (§6.1)."""

    CONTRACT = "contract"
    KYC_VERIFIED = "kyc_verified"
    DEPLOYMENT = "deployment"
    SELF_DECLARED = "self_declared"
    INFERRED = "inferred"
