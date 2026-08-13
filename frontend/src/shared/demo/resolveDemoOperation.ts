/**
 * TEMPORARY browser demo resolver (VITE_PREVIEW=1).
 *
 * Maps a GraphQL operationName (+ variables) to a synthetic result of the exact generated
 * shape — no network. Queries read the in-memory store; mutations return a plausible success
 * and optimistically mutate the store for the few flows a screen re-reads (AddChild, Enroll).
 * Every result is typed against `@/entities/graphql/generated`, so the shapes stay in lockstep
 * with the operations in `*.graphql`. Remove with the VITE_PREVIEW short-circuit before launch.
 */
import type {
  AddChildMutation,
  AdminInstitutionQuery,
  AddMaterialMutation,
  AddStudentsToGroupMutation,
  AssignTeacherMutation,
  AttentionUpdatesSubscription,
  CatalogQuery,
  CourseDetailQuery,
  CreateCourseMutation,
  CreateGroupMutation,
  CreateHomeworkMutation,
  CreateLessonMutation,
  CreateSectionMutation,
  DeleteHomeworkMutation,
  DeleteLessonMutation,
  DeleteMaterialMutation,
  DeleteSectionMutation,
  EndSessionMutation,
  EnrollMutation,
  GradeSubmissionMutation,
  HomeworkSubmissionsQuery,
  InstitutionGroupsQuery,
  InstitutionMembersQuery,
  InviteMemberMutation,
  JoinSessionMutation,
  LearningProfilesQuery,
  LessonHomeworkQuery,
  LoginMutation,
  MeQuery,
  MyCoursesQuery,
  MyScheduleQuery,
  MySubmissionsQuery,
  PublishCourseMutation,
  PublishHomeworkMutation,
  PublishLessonMutation,
  RefreshTokenMutation,
  RegisterUserMutation,
  RemoveMemberMutation,
  RemoveStudentFromGroupMutation,
  ReorderLessonsMutation,
  ReorderSectionsMutation,
  RequestPasswordResetMutation,
  RequestUploadMutation,
  ResetPasswordMutation,
  ScheduleSessionMutation,
  SetActiveLearningProfileMutation,
  SessionAttendeesQuery,
  SessionAttentionQuery,
  SessionRoomQuery,
  StartPageQuery,
  SubjectCabinetQuery,
  ChannelMessagesQuery,
  ChatPolicyQuery,
  ChatReportsQuery,
  ChatUnreadQuery,
  AnswerExerciseMutation,
  ExerciseLivePictureQuery,
  HandInExerciseSetMutation,
  LessonExerciseSetsQuery,
  MyExerciseAttemptsQuery,
  SetProgressQuery,
  BoardQuery,
  CourseBoardsQuery,
  PutBoardElementMutation,
  RemoveBoardElementMutation,
  SaveBoardMutation,
  SetBoardOpenMutation,
  CreateProjectorCodeMutation,
  RedeemProjectorCodeMutation,
  SetProjectorFocusMutation,
  MarkChannelReadMutation,
  MyChannelsQuery,
  OpenSubjectChannelMutation,
  ReportChannelMutation,
  SendChannelMessageMutation,
  SubjectProgressQuery,
  SubjectTasksQuery,
  SaveItemMutation,
  RemoveSavedItemMutation,
  SetAvatarMutation,
  StartSessionMutation,
  SubmitHomeworkMutation,
  SubmitVerificationDocumentMutation,
  TeacherDashboardQuery,
  UnpublishCourseMutation,
  UpdateBrandingMutation,
  UpdateLessonMutation,
  UpdateSectionMutation,
  UpdateCourseMutation,
  UpdateInstitutionMutation,
  UpdateMembershipMutation,
} from '@/entities/graphql/generated';

import { cohort, IDS, makeChild, nextId, PROFILE_IDS, store, times, users } from './demoData';
import { demoGraphQLRole } from './demoRole';

type Vars = Record<string, unknown>;

// --- small shared builders ---------------------------------------------------------------
const iso = () => new Date().toISOString();

function owner(u: (typeof users)[keyof typeof users], specialty: string) {
  return {
    __typename: 'TeacherProfile' as const,
    specialty,
    user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName },
  };
}

// --- Me (role-driven linchpin) -----------------------------------------------------------
function me(): MeQuery {
  const role = demoGraphQLRole();
  const base = {
    __typename: 'User' as const,
    locale: 'ru',
    avatarUrl: null,
    studentProfile: null,
    teacherProfile: null,
    parentProfile: null,
  };
  if (role === 'STUDENT') {
    return {
      __typename: 'Query',
      me: {
        ...base,
        id: users.sasha.id,
        email: users.sasha.email,
        firstName: users.sasha.firstName,
        lastName: users.sasha.lastName,
        role: 'STUDENT',
        studentProfile: {
          __typename: 'StudentProfile',
          ageBand: 'TEEN',
          gradeLevel: '7 класс',
          points: 1240,
        },
      },
    };
  }
  if (role === 'PARENT') {
    return {
      __typename: 'Query',
      me: {
        ...base,
        id: users.olga.id,
        email: users.olga.email,
        firstName: users.olga.firstName,
        lastName: users.olga.lastName,
        role: 'PARENT',
        parentProfile: { __typename: 'ParentProfile', children: store.children },
      },
    };
  }
  if (role === 'ADMIN') {
    return {
      __typename: 'Query',
      me: {
        ...base,
        id: users.galina.id,
        email: users.galina.email,
        firstName: users.galina.firstName,
        lastName: users.galina.lastName,
        role: 'ADMIN',
      },
    };
  }
  return {
    __typename: 'Query',
    me: {
      ...base,
      id: users.maria.id,
      email: users.maria.email,
      firstName: users.maria.firstName,
      lastName: users.maria.lastName,
      role: 'TEACHER',
      teacherProfile: {
        __typename: 'TeacherProfile',
        verificationStatus: 'APPROVED',
        specialty: 'Математика',
      },
    },
  };
}

// --- Learning profiles (R0.2) --------------------------------------------------------------
/** The educations inside the demo account, per atlas sheet 00: Аня is a pupil of 9А AND a
 *  cadet on English A2; Мария teaches at the same school. Shapes and the "<kind>:<uuid>" ids
 *  mirror the server projection, so the preview exercises the real switch, not a mock of it. */
function learningProfiles(): LearningProfilesQuery {
  const role = demoGraphQLRole();
  const profile = (
    over: Partial<LearningProfilesQuery['learningProfiles'][number]>,
  ): LearningProfilesQuery['learningProfiles'][number] => ({
    __typename: 'LearningProfile',
    id: '',
    kind: 'PUPIL',
    institutionId: null,
    institutionName: null,
    groupName: null,
    courseId: null,
    courseTitle: null,
    courseCount: 0,
    isActive: false,
    ...over,
  });

  const profiles =
    role === 'TEACHER'
      ? [
          profile({
            id: PROFILE_IDS.teacher,
            kind: 'TEACHER',
            institutionId: IDS.institution,
            institutionName: 'Гимназия №1',
          }),
        ]
      : role === 'STUDENT'
        ? [
            profile({
              id: PROFILE_IDS.pupil,
              kind: 'PUPIL',
              institutionId: IDS.institution,
              institutionName: 'Гимназия №1',
              groupName: '9А',
              courseCount: 3,
            }),
            profile({
              id: PROFILE_IDS.cadet,
              kind: 'CADET',
              courseId: IDS.course.english,
              courseTitle: 'English A2',
              courseCount: 1,
            }),
          ]
        : []; // parent/admin hold no learning profile of their own

  if (profiles.length === 0) return { __typename: 'Query', learningProfiles: [] };
  // Same fallback as the server: an unset or stale choice lands on the first profile.
  const chosen = profiles.some((p) => p.id === store.activeLearningProfile)
    ? store.activeLearningProfile
    : profiles[0].id;
  return {
    __typename: 'Query',
    learningProfiles: profiles.map((p) => ({ ...p, isActive: p.id === chosen })),
  };
}

// --- Start page (atlas sheet 00, R0.4) ------------------------------------------------------
/** The sheet's own scenario: Аня has a lesson starting, homework due and returned feedback;
 *  as a cadet she has no timetable but something to carry on with; Мария teaches today and
 *  has a queue waiting. Times are clock-relative so "сегодня" always reads as today. */
function startPage(): StartPageQuery {
  const role = demoGraphQLRole();
  const profiles = learningProfiles().learningProfiles;
  const active = profiles.find((p) => p.isActive) ?? null;
  const inMin = (n: number) => new Date(Date.now() + n * 60_000).toISOString();
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

  // `now` carries the widest StartEntry selection in the document — use it as the shape so
  // rows meant for `now`/`attention` (count, ageDays, courseId) type-check too.
  type Entry = NonNullable<StartPageQuery['startPage']['now']>;
  // Defaults cover EVERY field of the widest selection: a row reused across `now`/`today`/
  // `attention` must satisfy the whole document, or Apollo reports missing fields at runtime.
  const entry = (
    over: Partial<Entry> & { id: string; kind: Entry['kind']; title: string },
  ): Entry => ({
    __typename: 'StartEntry',
    courseTitle: null,
    teacherName: null,
    at: null,
    count: null,
    ageDays: null,
    sessionId: null,
    lessonId: null,
    courseId: null,
    isLive: false,
    ...over,
  });

  const emptyWeek = (entries: Record<number, Entry[]> = {}) =>
    Array.from({ length: 7 }, (_, i) => ({
      __typename: 'StartDay' as const,
      date: new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
      isToday: i === 0,
      entries: entries[i] ?? [],
    }));

  if (active?.kind === 'CADET') {
    const carryOn = entry({
      id: 'continue:les-en-3',
      kind: 'CONTINUE_LESSON',
      title: 'Unit 4 — Travel',
      courseTitle: 'English A2',
      lessonId: 'les-en-3',
      courseId: IDS.course.english,
    });
    return {
      __typename: 'Query',
      startPage: {
        __typename: 'StartPage',
        profile: active,
        now: carryOn,
        today: [],
        attention: [],
        week: emptyWeek(), // no timetable; repetition load arrives with FSRS (R4.4)
        continueEntries: [carryOn],
        progress: [
          {
            __typename: 'StartProgress',
            courseId: IDS.course.english,
            courseTitle: 'English A2',
            doneLessons: 5,
            totalLessons: 24,
            progressPct: 21,
          },
        ],
      },
    };
  }

  if (role === 'TEACHER') {
    const lesson = entry({
      id: 'session:ses-1',
      kind: 'LESSON_SESSION',
      title: 'Экзопланеты',
      courseTitle: 'Астрономия · 9А',
      teacherName: 'Мария Петровна',
      at: inMin(17),
      sessionId: IDS.session.live,
      lessonId: 'les-1-1',
    });
    const later = entry({
      id: 'session:ses-2',
      kind: 'LESSON_SESSION',
      title: 'Present Perfect',
      courseTitle: 'Английский · 7Б',
      teacherName: 'Мария Петровна',
      at: inMin(120),
      sessionId: IDS.session.english,
      lessonId: 'les-en-1',
    });
    return {
      __typename: 'Query',
      startPage: {
        __typename: 'StartPage',
        profile: active,
        now: lesson,
        today: [lesson, later],
        attention: [
          entry({ id: 'grading-queue', kind: 'GRADING_QUEUE', title: '', count: 11, ageDays: 2 }),
        ],
        week: emptyWeek({ 0: [lesson, later], 2: [later], 4: [lesson] }),
        continueEntries: [],
        progress: [],
      },
    };
  }

  const lesson = entry({
    id: 'session:ses-1',
    kind: 'LESSON_SESSION',
    title: 'Экзопланеты',
    courseTitle: 'Астрономия',
    teacherName: 'Мария Петровна',
    at: inMin(17),
    sessionId: IDS.session.live,
    lessonId: 'les-1-1',
  });
  const english = entry({
    id: 'session:ses-2',
    kind: 'LESSON_SESSION',
    title: 'Present Perfect',
    courseTitle: 'Английский',
    teacherName: 'Илья Сергеевич',
    at: inMin(120),
    sessionId: IDS.session.english,
    lessonId: 'les-en-1',
  });
  const due = entry({
    id: 'homework:hw-1',
    kind: 'HOMEWORK_DUE',
    title: 'Астрономия · задание',
    courseTitle: 'Астрономия',
    at: inDays(1),
    ageDays: 1,
    lessonId: 'les-1-1',
  });
  const graded = entry({
    id: 'submission:sub-1',
    kind: 'HOMEWORK_GRADED',
    title: 'Английский · эссе',
    at: inDays(-1),
    count: 5,
    lessonId: 'les-en-1',
  });
  const carryOn = entry({
    id: 'continue:les-1-2',
    kind: 'CONTINUE_LESSON',
    title: 'Транзитный метод',
    courseTitle: 'Астрономия',
    lessonId: 'les-1-2',
    courseId: IDS.course.algebra,
  });
  return {
    __typename: 'Query',
    startPage: {
      __typename: 'StartPage',
      profile: active,
      now: lesson,
      today: [lesson, english],
      attention: [due, graded],
      week: emptyWeek({ 0: [lesson, english], 1: [due], 2: [english], 3: [lesson] }),
      continueEntries: [carryOn],
      progress: [
        {
          __typename: 'StartProgress',
          courseId: IDS.course.algebra,
          courseTitle: 'Астрономия',
          doneLessons: 12,
          totalLessons: 34,
          progressPct: 35,
        },
        {
          __typename: 'StartProgress',
          courseId: IDS.course.english,
          courseTitle: 'Английский',
          doneLessons: 8,
          totalLessons: 24,
          progressPct: 33,
        },
      ],
    },
  };
}

// --- Subject cabinet (atlas sheet 01, R1.1) ---------------------------------------------
/** The sheet's own scenario. Пупил/учитель: Астрономия, раздел 2 «Планетные системы», урок 12
 *  идёт сегодня, урок 14 — наблюдение на школьном телескопе (внешний прибор). Курсант:
 *  English A2, Unit 4, урок 3 — остановился посередине. Saved items come from the store, so
 *  the quiet corner behaves like the real one in the preview. */
function subjectCabinet(vars: Vars): SubjectCabinetQuery {
  // The server derives the viewer's kind from the COURSE, not from the active profile:
  // its owner is the teacher, a course with an institution is a school subject (pupil), a
  // standalone one is self-paced (cadet). The preview mirrors that rule exactly.
  const isTeacher = demoGraphQLRole() === 'TEACHER';
  const english = String(vars.courseId ?? '') === IDS.course.english;
  const kind = isTeacher ? 'TEACHER' : english ? 'CADET' : 'PUPIL';

  type Cabinet = SubjectCabinetQuery['subjectCabinet'];
  type Lesson = Cabinet['sections'][number]['lessons'][number];
  type Material = Cabinet['materials'][number];
  type Source = Cabinet['sources'][number];

  const lesson = (
    over: Partial<Lesson> & {
      id: string;
      title: string;
      orderLabel: string;
      progress: Lesson['progress'];
    },
  ): Lesson => ({
    __typename: 'SubjectLesson',
    subtitle: null,
    kind: 'STANDARD',
    deviceKey: null,
    materialCount: 0,
    hasHomework: false,
    sessionId: null,
    sessionAt: null,
    isLive: false,
    grade: null,
    completedBy: null,
    groupSize: null,
    ...over,
  });

  /** A material row; `savedId` reflects the in-memory store so the corner toggles for real. */
  const material = (over: Partial<Material> & { id: string; title: string }): Material => {
    const kept = store.saved.get(over.id);
    return {
      __typename: 'SubjectMaterial',
      subtitle: null,
      type: null,
      url: null,
      fromLabel: null,
      lessonId: null,
      savedId: null,
      note: null,
      savedKind: null,
      ...over,
      ...(kept && {
        savedId: kept.savedId,
        note: kept.note || null,
        savedKind: kept.watchLater ? ('WATCH_LATER' as const) : ('SAVED' as const),
      }),
    };
  };

  const source = (
    over: Partial<Source> & { id: string; name: string; sourceName: string },
  ): Source => ({
    __typename: 'SubjectSource',
    url: null,
    note: null,
    inLesson: true,
    savedId: over.url ? (store.saved.get(over.url)?.savedId ?? null) : null,
    ...over,
    ...(over.url && store.saved.has(over.url)
      ? { savedId: store.saved.get(over.url)!.savedId }
      : {}),
  });

  /** Apply the teacher's edit-mode changes to a section's lessons: renames, kind switches,
   *  removals, additions and the new order. Without this the preview would accept an edit
   *  and then show the old programme on the next read. */
  const withEdits = (sectionId: string, base: Lesson[]): Lesson[] => {
    const edits = store.programme;
    let list = base.filter((l) => !edits.removed.has(l.id));
    list = list.map((l) => {
      const patch = edits.edits.get(l.id);
      if (!patch) return l;
      return {
        ...l,
        title: patch.title ?? l.title,
        subtitle: patch.description ?? l.subtitle,
        kind: (patch.kind as Lesson['kind']) ?? l.kind,
        deviceKey: patch.deviceKey ?? l.deviceKey,
      };
    });
    for (const extra of edits.added.get(sectionId) ?? []) {
      list.push(
        lesson({
          id: extra.id,
          title: extra.title,
          subtitle: extra.description || null,
          orderLabel: String(list.length + 1),
          progress: 'AHEAD',
          kind: extra.kind as Lesson['kind'],
          deviceKey: extra.deviceKey || null,
        }),
      );
    }
    const order = edits.order.get(sectionId);
    if (order) {
      const byId = new Map(list.map((l) => [l.id, l]));
      list = [
        ...order
          .map((id) => byId.get(id))
          .filter(Boolean as unknown as (l: Lesson | undefined) => l is Lesson),
        ...list.filter((l) => !order.includes(l.id)),
      ];
    }
    return list;
  };

  /** Everything the caller kept by hand — the second, never-merged block of the sheet: the
   *  course's own materials they saved, plus finds brought in from outside. */
  const savedBlock = (pool: Material[]): Material[] => {
    const byId = new Set(pool.map((m) => m.id));
    const extras = [...store.saved.entries()]
      .filter(([key]) => !byId.has(key))
      .map(([, kept]) =>
        material({
          id: kept.savedId,
          title: kept.title,
          url: kept.url,
          type: 'LINK',
          fromLabel: kept.sourceName,
          note: kept.note || null,
          savedId: kept.savedId,
          savedKind: kept.watchLater ? 'WATCH_LATER' : 'SAVED',
        }),
      );
    return [...pool.filter((m) => m.savedId !== null), ...extras];
  };

  if (english) {
    const l3 = lesson({
      id: 'les-en-3',
      title: 'Listening: at the station',
      orderLabel: '3',
      subtitle: 'Ты остановился на 3-м задании из 6',
      progress: 'CURRENT',
      materialCount: 2,
    });
    const materials: Material[] = [
      material({
        id: 'mat-en-1',
        title: 'Travel vocabulary · 28 карточек',
        subtitle: 'Озвучка Common Voice · открытая лицензия',
        type: 'LINK',
        url: 'https://commonvoice.mozilla.org/',
        fromLabel: 'курс · Unit 4',
        lessonId: 'les-en-1',
      }),
      material({
        id: 'mat-en-2',
        title: 'Tatoeba · фразы про дорогу',
        subtitle: 'Живые примеры употребления с переводом',
        type: 'LINK',
        url: 'https://tatoeba.org/',
        fromLabel: 'преподаватель Ирина',
        lessonId: 'les-en-2',
      }),
    ];
    return {
      __typename: 'Query',
      subjectCabinet: {
        __typename: 'SubjectCabinet',
        courseId: IDS.course.english,
        title: 'English · A2',
        // A standalone course reads in percent (owner decision 2026-08-13).
        gradingScale: 'PERCENT',
        profileKind: kind,
        institutionName: null,
        groupName: null,
        teacherName: 'Ирина Соколова',
        teacherId: users.ilya.id,
        lessonCount: 24,
        studentCount: null,
        progressPct: 34,
        sections: [
          {
            __typename: 'SubjectSection',
            id: 'sec-en-4',
            title: 'Unit 4 · Travel',
            doneLessons: 2,
            totalLessons: 8,
            lessons: withEdits('sec-en-4', [
              lesson({
                id: 'les-en-1',
                title: 'Words: transport',
                orderLabel: '1',
                subtitle: '28 слов · карточки и аудирование',
                progress: 'DONE',
                materialCount: 1,
                sessionAt: times.yesterdayPast,
                grade: 5,
              }),
              lesson({
                id: 'les-en-2',
                title: 'Asking for directions',
                orderLabel: '2',
                subtitle: 'Диалоги, произношение',
                progress: 'DONE',
                materialCount: 1,
                grade: 4,
              }),
              l3,
              lesson({
                id: 'les-en-4',
                title: 'Speaking club',
                orderLabel: '4',
                subtitle: 'Живое занятие с преподавателем, 6 человек',
                progress: 'AHEAD',
                sessionAt: times.tomorrowPhysics,
              }),
              lesson({
                id: 'les-en-5',
                title: 'Writing: a postcard',
                orderLabel: '5',
                subtitle: 'Откроется после урока 4',
                progress: 'AHEAD',
              }),
            ]),
          },
        ],
        materials,
        savedMaterials: savedBlock(materials),
        sources: [
          source({
            id: 'src-en-1',
            name: 'Фразы про дорогу',
            sourceName: 'Tatoeba',
            url: 'https://tatoeba.org/',
            note: 'открытая лицензия',
            inLesson: true,
          }),
        ],
        nextLesson: l3,
      },
    };
  }

  const l12 = lesson({
    id: 'les-1-12',
    title: 'Экзопланеты',
    orderLabel: '12',
    subtitle: 'Горячие юпитеры, зона обитаемости',
    progress: 'CURRENT',
    materialCount: 2,
    hasHomework: true,
    sessionId: IDS.session.live,
    sessionAt: times.todayLive,
    isLive: true,
    ...(isTeacher ? { completedBy: 11, groupSize: 24 } : {}),
  });
  const materials: Material[] = [
    material({
      id: 'mat-a-1',
      title: 'NASA Live · трансляция миссий',
      subtitle: 'Открывается в новой вкладке — так требует лицензия',
      type: 'LINK',
      url: 'https://www.nasa.gov/nasalive/',
      fromLabel: 'учитель · к уроку 12',
      lessonId: 'les-1-12',
    }),
    material({
      id: 'mat-a-2',
      title: 'NASA Exoplanet Archive',
      subtitle: 'Каталог подтверждённых планет — данные для лабораторной',
      type: 'LINK',
      url: 'https://exoplanetarchive.ipac.caltech.edu/',
      fromLabel: 'учитель · задание урока',
      lessonId: 'les-1-12',
    }),
    material({
      id: 'mat-a-3',
      title: 'Как устроен транзитный метод',
      subtitle: 'Разбор на 6 минут, записан Марией Петровной',
      type: 'FILE',
      fromLabel: 'учитель · к уроку 11',
      lessonId: 'les-1-11',
    }),
    material({
      id: 'mat-a-4',
      title: 'Конспект раздела 2',
      subtitle: 'PDF, 14 страниц',
      type: 'FILE',
      fromLabel: 'программа гимназии №1',
    }),
  ];

  return {
    __typename: 'Query',
    subjectCabinet: {
      __typename: 'SubjectCabinet',
      courseId: IDS.course.algebra,
      title: 'Астрономия',
      // A school subject keeps the five-point mark a parent recognises.
      gradingScale: 'FIVE_POINT',
      profileKind: isTeacher ? 'TEACHER' : 'PUPIL',
      institutionName: 'Гимназия №1',
      groupName: '9А',
      teacherName: 'Мария Петровна',
      teacherId: users.maria.id,
      lessonCount: 34,
      studentCount: isTeacher ? 24 : null,
      progressPct: isTeacher ? 71 : 62,
      sections: [
        {
          __typename: 'SubjectSection',
          id: 'sec-a-2',
          title: 'Раздел 2 · Планетные системы',
          doneLessons: 6,
          totalLessons: 8,
          lessons: withEdits('sec-a-2', [
            lesson({
              id: 'les-1-10',
              title: 'Как ищут планеты',
              orderLabel: '10',
              subtitle: 'Методы поиска, история открытий',
              progress: 'DONE',
              materialCount: 2,
              sessionAt: times.yesterdayPast,
              ...(isTeacher ? { completedBy: 24, groupSize: 24 } : { grade: 5 }),
            }),
            lesson({
              id: 'les-1-11',
              title: 'Транзитный метод',
              orderLabel: '11',
              subtitle: 'Кривая блеска, глубина и период',
              progress: 'DONE',
              materialCount: 2,
              hasHomework: true,
              ...(isTeacher ? { completedBy: 22, groupSize: 24 } : { grade: 4 }),
            }),
            l12,
            lesson({
              id: 'les-1-13',
              title: 'Атмосферы далёких миров',
              orderLabel: '13',
              subtitle: 'Спектроскопия, что уже видел JWST',
              progress: 'AHEAD',
              materialCount: 1,
              sessionAt: times.tomorrowPhysics,
            }),
            lesson({
              id: 'les-1-14',
              title: 'Своё наблюдение',
              orderLabel: '14',
              subtitle: 'Заказ снимка на школьном телескопе MicroObservatory',
              progress: 'AHEAD',
              kind: 'EXTERNAL_DEVICE',
              deviceKey: 'microobservatory',
            }),
          ]),
        },
        {
          __typename: 'SubjectSection',
          id: 'sec-a-3',
          title: 'Раздел 3 · Звёзды и их жизнь',
          doneLessons: 0,
          totalLessons: 6,
          lessons: withEdits('sec-a-3', [
            lesson({
              id: 'les-1-15',
              title: 'Диаграмма Герцшпрунга — Рессела',
              orderLabel: '15',
              subtitle: 'Откроется после раздела 2',
              progress: 'AHEAD',
            }),
          ]),
        },
      ],
      materials,
      savedMaterials: savedBlock(materials),
      sources: [
        source({
          id: 'src-a-1',
          name: 'NASA Live',
          sourceName: 'NASA',
          url: 'https://www.nasa.gov/nasalive/',
          note: 'откроется в новой вкладке',
          inLesson: true,
        }),
        source({
          id: 'src-a-2',
          name: 'NASA Exoplanet Archive',
          sourceName: 'NASA',
          url: 'https://exoplanetarchive.ipac.caltech.edu/',
          note: 'данные для лабораторной',
          inLesson: true,
        }),
      ],
      nextLesson: l12,
    },
  };
}

/** Apollo normalises `SubjectLesson` by id, so the rail's copy of a lesson and the one in the
 *  programme are the SAME cache entity. If the two carry different field values the last write
 *  silently wins — which is how one row kept a stale ordinal after a reorder. The real server
 *  cannot disagree with itself; the preview must not either. */
function consistentCabinet(result: SubjectCabinetQuery): SubjectCabinetQuery {
  const cab = result.subjectCabinet;
  // Lessons are numbered across the WHOLE programme, section after section — the same rule
  // `_lesson_ordinals` applies on the server. Numbering per section would restart at 1 in
  // section 3 and quietly disagree with the real API.
  let n = 0;
  const sections = cab.sections.map((section) => ({
    ...section,
    lessons: section.lessons.map((l) => ({ ...l, orderLabel: String(++n) })),
  }));
  const byId = new Map(sections.flatMap((s) => s.lessons).map((l) => [l.id, l]));
  return {
    ...result,
    subjectCabinet: {
      ...cab,
      sections,
      nextLesson: cab.nextLesson ? (byId.get(cab.nextLesson.id) ?? cab.nextLesson) : null,
    },
  };
}

// --- Subject tasks & progress (atlas sheet 01, R1.2) --------------------------------------
/** The sheet's own rows. Pupil: a lab due tomorrow, a retake open on the light curve with the
 *  teacher's words attached, and a test already marked. Teacher: the same work as a queue —
 *  counts only, never a list of children. */
function subjectTasks(vars: Vars): SubjectTasksQuery {
  const isTeacher = demoGraphQLRole() === 'TEACHER';
  const english = String(vars.courseId ?? '') === IDS.course.english;
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

  type Task = SubjectTasksQuery['subjectTasks'][number];
  const task = (
    over: Partial<Task> & { id: string; title: string; state: Task['state'] },
  ): Task => ({
    __typename: 'SubjectTask',
    lessonId: null,
    lessonLabel: null,
    dueAt: null,
    submittedAt: null,
    score: null,
    comment: null,
    attempts: 0,
    redoOpen: false,
    submittedBy: null,
    groupSize: null,
    gradedCount: null,
    waitingCount: null,
    staleCount: null,
    retakeCount: null,
    ...over,
  });

  if (english) {
    return {
      __typename: 'Query',
      subjectTasks: [
        task({
          id: 'hw-en-1',
          title: 'Listening: at the station · упражнения',
          state: 'TODO',
          lessonId: 'les-en-3',
          lessonLabel: '3',
          dueAt: inDays(2),
        }),
        task({
          id: 'hw-en-2',
          title: 'Words: transport · тест',
          state: 'GRADED',
          lessonId: 'les-en-1',
          lessonLabel: '1',
          submittedAt: inDays(-2),
          score: 92,
          attempts: 1,
        }),
      ],
    };
  }

  if (isTeacher) {
    return {
      __typename: 'Query',
      subjectTasks: [
        task({
          id: 'hw-lab',
          title: 'Лабораторная · распределение экзопланет',
          state: 'SUBMITTED',
          lessonId: 'les-1-12',
          lessonLabel: '12',
          dueAt: inDays(1),
          submittedBy: 11,
          groupSize: 24,
          gradedCount: 0,
          waitingCount: 11,
          staleCount: 7,
          retakeCount: 0,
        }),
        task({
          id: 'hw-curve',
          title: 'Кривая блеска · разбор',
          state: 'GRADED',
          lessonId: 'les-1-11',
          lessonLabel: '11',
          submittedBy: 24,
          groupSize: 24,
          gradedCount: 24,
          waitingCount: 0,
          staleCount: 0,
          retakeCount: 3,
        }),
      ],
    };
  }

  return {
    __typename: 'Query',
    subjectTasks: [
      task({
        id: 'hw-lab',
        title: 'Лабораторная · распределение экзопланет',
        state: 'TODO',
        lessonId: 'les-1-12',
        lessonLabel: '12',
        dueAt: inDays(1),
      }),
      task({
        id: 'hw-curve',
        title: 'Кривая блеска · разбор',
        state: 'GRADED',
        lessonId: 'les-1-11',
        lessonLabel: '11',
        submittedAt: inDays(-1),
        score: 64,
        comment:
          'Глубина посчитана верно, но период — по двум минимумам, а не по одному. Пересчитай, и будет 5.',
        attempts: 1,
        redoOpen: true,
      }),
      task({
        id: 'hw-methods',
        title: 'Методы поиска планет · тест',
        state: 'GRADED',
        lessonId: 'les-1-10',
        lessonLabel: '10',
        submittedAt: inDays(-7),
        score: 88,
        attempts: 1,
      }),
    ],
  };
}

/** Mastery per topic. The learner's rows carry a comparison with their own past week; the
 *  teacher's carry the group's mastery and a COUNT of who is struggling — no names. */
function subjectProgress(vars: Vars): SubjectProgressQuery {
  const isTeacher = demoGraphQLRole() === 'TEACHER';
  const english = String(vars.courseId ?? '') === IDS.course.english;

  type Topic = SubjectProgressQuery['subjectProgress']['topics'][number];
  const topic = (over: Partial<Topic> & { id: string; title: string }): Topic => ({
    __typename: 'SubjectTopic',
    lessonFrom: null,
    lessonTo: null,
    isCurrent: false,
    pct: null,
    previousPct: null,
    weakCount: null,
    learnerCount: null,
    ...over,
  });

  if (english) {
    return {
      __typename: 'Query',
      subjectProgress: {
        __typename: 'SubjectProgress',
        profileKind: isTeacher ? 'TEACHER' : 'CADET',
        overallPct: 75,
        previousOverallPct: isTeacher ? null : 68,
        weakBelowPct: 60,
        topics: [
          topic({
            id: 'sec-en-4',
            title: 'Unit 4 · Travel',
            lessonFrom: '1',
            lessonTo: '5',
            pct: 75,
            previousPct: isTeacher ? null : 68,
            isCurrent: true,
            weakCount: isTeacher ? 1 : null,
            learnerCount: isTeacher ? 6 : null,
          }),
        ],
      },
    };
  }

  return {
    __typename: 'Query',
    subjectProgress: {
      __typename: 'SubjectProgress',
      profileKind: isTeacher ? 'TEACHER' : 'PUPIL',
      overallPct: isTeacher ? 57 : 62,
      previousOverallPct: isTeacher ? null : 55,
      weakBelowPct: 60,
      topics: [
        topic({
          id: 'sec-a-2',
          title: 'Раздел 2 · Планетные системы',
          lessonFrom: '10',
          lessonTo: '14',
          pct: isTeacher ? 84 : 88,
          previousPct: isTeacher ? null : 80,
          weakCount: isTeacher ? 0 : null,
          learnerCount: isTeacher ? 24 : null,
        }),
        topic({
          id: 'sec-a-2b',
          title: 'Транзитная кривая блеска',
          lessonFrom: '11',
          lessonTo: '11',
          pct: isTeacher ? 57 : 54,
          previousPct: isTeacher ? null : 54,
          weakCount: isTeacher ? 9 : null,
          learnerCount: isTeacher ? 24 : null,
        }),
        topic({
          id: 'sec-a-2c',
          title: 'Типы экзопланет',
          lessonFrom: '12',
          lessonTo: '12',
          isCurrent: true,
          pct: isTeacher ? 29 : 31,
          weakCount: isTeacher ? 14 : null,
          learnerCount: isTeacher ? 11 : null,
        }),
        topic({
          id: 'sec-a-3',
          title: 'Раздел 3 · Звёзды и их жизнь',
          lessonFrom: '15',
          lessonTo: '15',
        }),
      ],
    },
  };
}

// --- Chat (R2) ------------------------------------------------------------------------------
/** The channels sheet 00 promises: the subject room, the teacher, a classmate, and — for a
 *  teacher — the staff room. Membership is the whole authorisation model, so the preview
 *  simply shows different rooms per role rather than filtering one list. */
const CHANNEL_IDS = {
  subject: 'ch-astro',
  teacher: 'ch-maria',
  peer: 'ch-vera',
  staff: 'ch-staff',
} as const;

function chatChannels(): MyChannelsQuery['myChannels'] {
  const isTeacher = demoGraphQLRole() === 'TEACHER';
  type Channel = MyChannelsQuery['myChannels'][number];
  const person = (u: { id: string; firstName: string; lastName: string }, role: string) => ({
    __typename: 'ChatParticipant' as const,
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    role,
  });
  const channel = (over: Partial<Channel> & { id: string; kind: Channel['kind'] }): Channel => {
    const sent = store.chat.sent.get(over.id) ?? [];
    const last = sent.at(-1);
    return {
      __typename: 'ChatChannel',
      courseId: null,
      courseTitle: null,
      groupName: null,
      institutionName: null,
      participants: [],
      unread: store.chat.read.has(over.id) ? 0 : 0,
      lastMessageAt: null,
      lastMessageText: null,
      readOnly: false,
      openReports: store.chat.reported.has(over.id) ? 1 : 0,
      ...over,
      ...(last ? { lastMessageText: last.text, lastMessageAt: last.sentAt } : {}),
      ...(store.chat.read.has(over.id) ? { unread: 0 } : {}),
    };
  };

  if (isTeacher) {
    return [
      channel({
        id: CHANNEL_IDS.subject,
        kind: 'SUBJECT_GROUP',
        courseId: IDS.course.algebra,
        courseTitle: 'Астрономия',
        groupName: '9А',
        institutionName: 'Гимназия №1',
        unread: store.chat.read.has(CHANNEL_IDS.subject) ? 0 : 2,
        lastMessageText: 'А лабораторную сдавать до завтра?',
        participants: [person(users.sasha, 'STUDENT'), person(users.vera, 'STUDENT')],
      }),
      channel({
        id: CHANNEL_IDS.staff,
        kind: 'STAFF_ROOM',
        institutionName: 'Гимназия №1',
        lastMessageText: 'Педсовет перенесли на четверг',
        participants: [person(users.ilya, 'TEACHER'), person(users.galina, 'ADMIN')],
      }),
    ];
  }

  return [
    channel({
      id: CHANNEL_IDS.subject,
      kind: 'SUBJECT_GROUP',
      courseId: IDS.course.algebra,
      courseTitle: 'Астрономия',
      groupName: '9А',
      institutionName: 'Гимназия №1',
      unread: store.chat.read.has(CHANNEL_IDS.subject) ? 0 : 2,
      lastMessageText: 'Мария Петровна: материалы к уроку 12 добавила',
      participants: [person(users.maria, 'TEACHER'), person(users.vera, 'STUDENT')],
    }),
    channel({
      id: CHANNEL_IDS.teacher,
      kind: 'PUPIL_TEACHER',
      institutionName: 'Гимназия №1',
      lastMessageText: 'Пересчитай период и присылай',
      participants: [person(users.maria, 'TEACHER')],
    }),
    channel({
      id: CHANNEL_IDS.peer,
      kind: 'PEER',
      institutionName: 'Гимназия №1',
      lastMessageText: 'скинешь конспект?',
      participants: [person(users.vera, 'STUDENT')],
    }),
  ];
}

function chatMessages(vars: Vars): ChannelMessagesQuery {
  const id = String(vars.channelId ?? '');
  type Message = ChannelMessagesQuery['channelMessages'][number];
  const seed: Record<string, [string, string, boolean][]> = {
    [CHANNEL_IDS.subject]: [
      ['Мария Петровна', 'Материалы к уроку 12 добавила, посмотрите до занятия', false],
      ['Вера Смирнова', 'А лабораторную сдавать до завтра?', false],
    ],
    [CHANNEL_IDS.teacher]: [
      ['Мария Петровна', 'Глубина посчитана верно, период — по двум минимумам', false],
      ['Саша Иванов', 'Понял, пересчитаю', true],
    ],
    [CHANNEL_IDS.peer]: [['Вера Смирнова', 'скинешь конспект?', false]],
    [CHANNEL_IDS.staff]: [['Галина Андреева', 'Педсовет перенесли на четверг', false]],
  };
  const base: Message[] = (seed[id] ?? []).map(([who, text, mine], i) => ({
    __typename: 'ChannelMessage',
    id: `${id}-m${i}`,
    channelId: id,
    senderId: mine ? users.sasha.id : users.maria.id,
    senderName: who,
    text,
    sentAt: new Date(Date.now() - (10 - i) * 60_000).toISOString(),
    mine,
  }));
  const mine: Message[] = (store.chat.sent.get(id) ?? []).map((m) => ({
    __typename: 'ChannelMessage',
    id: m.id,
    channelId: id,
    senderId: users.sasha.id,
    senderName: 'Саша Иванов',
    text: m.text,
    sentAt: m.sentAt,
    mine: true,
  }));
  return { __typename: 'Query', channelMessages: [...base, ...mine] };
}

// --- Board (R3.2) ----------------------------------------------------------------------------
/** A board with something already on it, so the showcase shows a lesson that happened rather
 *  than an empty rectangle. Edits stick for the session — the preview behaves like the real
 *  canvas, including the teacher's switch. */
function boardElements(): BoardQuery['board']['elements'] {
  type El = BoardQuery['board']['elements'][number];
  const el = (over: Partial<El> & { id: string; kind: El['kind'] }): El => ({
    __typename: 'BoardElement',
    authorId: users.maria.id,
    authorName: 'Ирина Соколова',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    data: {},
    revision: 1,
    ...over,
  });
  const seeded: El[] = [
    el({
      id: 'b-1',
      kind: 'TEXT',
      x: 60,
      y: 40,
      width: 260,
      height: 40,
      data: { text: 'Asking for directions' },
    }),
    el({
      id: 'b-2',
      kind: 'STICKER',
      x: 60,
      y: 110,
      width: 200,
      height: 110,
      data: { text: 'Excuse me, how do I get to…?' },
    }),
    el({
      id: 'b-3',
      kind: 'STICKER',
      x: 320,
      y: 110,
      width: 200,
      height: 110,
      data: { text: 'Is it far from here?' },
    }),
    el({
      id: 'b-4',
      kind: 'STICKER',
      x: 190,
      y: 260,
      width: 220,
      height: 110,
      authorId: users.sasha.id,
      authorName: 'Саша Иванов',
      data: { text: 'turn left / right' },
    }),
    el({ id: 'b-5', kind: 'LINK', data: { from: 'b-2', to: 'b-4' } }),
    el({ id: 'b-6', kind: 'LINK', data: { from: 'b-3', to: 'b-4' } }),
    el({
      id: 'b-7',
      kind: 'PEN',
      x: 560,
      y: 90,
      width: 120,
      height: 80,
      data: { points: [560, 150, 600, 90, 640, 160, 680, 100] },
    }),
  ];
  const live = seeded
    .filter((e) => !store.board.removed.has(e.id))
    .map((e) => ({ ...e, ...(store.board.edits.get(e.id) ?? {}) }));
  return [...live, ...store.board.added];
}

// --- Exercises (R4.1) --------------------------------------------------------------------------
/** The sheet's own quick test: «Быстрый тест · directions», six questions, the first of them
 *  the multiple choice the class picture is built on. Answers stick for the session so the
 *  preview behaves like the real run, including the teacher's histogram. */
const DEMO_EXERCISES = [
  {
    id: 'ex-1',
    kind: 'CHOICE' as const,
    prompt: { text: 'Choose the natural phrase: “Excuse me, how do I ___ to the station?”' },
    payload: { options: ['come', 'get', 'arrive', 'reach out'] },
    correct: 1,
  },
  {
    id: 'ex-2',
    kind: 'LISTENING' as const,
    prompt: { text: 'Послушай и выбери маршрут, который описал говорящий.' },
    payload: {
      options: [
        'налево, потом прямо два квартала',
        'прямо, потом второй поворот направо',
        'направо, потом мимо парка',
      ],
    },
    correct: 1,
  },
  {
    id: 'ex-3',
    kind: 'CLOZE' as const,
    prompt: { text: 'Is it ___ from here? (далеко)' },
    payload: {},
    correct: null,
  },
  {
    id: 'ex-4',
    kind: 'WRITING' as const,
    prompt: { text: 'Опиши дорогу от дома до школы, 5–7 предложений.' },
    payload: {},
    correct: null,
  },
];

function exerciseSets(): LessonExerciseSetsQuery {
  type Set = LessonExerciseSetsQuery['lessonExerciseSets'][number];
  const exercises: Set['exercises'] = DEMO_EXERCISES.map((e, i) => ({
    __typename: 'Exercise',
    id: e.id,
    kind: e.kind,
    skill: e.kind === 'LISTENING' ? 'LISTENING' : 'GRAMMAR',
    cefrLevel: 'A2',
    skillTags: ['grammar.questions.word_order'],
    prompt: e.prompt,
    payload: e.payload,
    points: 1,
    order: i,
    assetId: null,
  }));
  return {
    __typename: 'Query',
    lessonExerciseSets: [
      {
        __typename: 'ExerciseSet',
        id: 'set-directions',
        lessonId: 'les-1-12',
        title: 'Быстрый тест · directions',
        mode: 'LIVE',
        // Deliberately absent: the preview shows the teacher WHY «зачесть как работу» is
        // unavailable until a homework is attached.
        homeworkId: null,
        exercises,
      },
    ],
  };
}

function exerciseLivePicture(): ExerciseLivePictureQuery {
  // The sheet's numbers: «ответили 5 из 6 · верно 4 · один выбрал come».
  const seeded: Record<
    string,
    { answered: number; correct: number; spread: Record<string, number> }
  > = {
    'ex-1': { answered: 5, correct: 4, spread: { '0': 1, '1': 4 } },
    'ex-2': { answered: 4, correct: 3, spread: { '1': 3, '2': 1 } },
    'ex-3': { answered: 2, correct: 2, spread: {} },
    'ex-4': { answered: 1, correct: 0, spread: {} },
  };
  return {
    __typename: 'Query',
    exerciseLivePicture: DEMO_EXERCISES.map((e) => {
      const own = store.exercises.answers.get(e.id);
      const base = seeded[e.id];
      const spread = { ...base.spread };
      if (own?.choice !== undefined) {
        spread[String(own.choice)] = (spread[String(own.choice)] ?? 0) + 1;
      }
      return {
        __typename: 'ExerciseLiveRow' as const,
        exerciseId: e.id,
        answered: base.answered + (own ? 1 : 0),
        groupSize: 6,
        correct: base.correct + (own?.correct ? 1 : 0),
        spread,
      };
    }),
  };
}

// --- Courses -----------------------------------------------------------------------------
/** Preview-only platform-zero toggle for the catalog (?catalog=zero) — mirrors demoRole's
 *  ?role= convention so the "Каталог наполняется" state is reachable in the preview. */
function catalogIsZero(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('catalog') === 'zero';
  } catch {
    return false;
  }
}

type CatalogNode = CatalogQuery['catalog']['nodes'][number];

function catalog(vars: Vars): CatalogQuery {
  const conn = (nodes: CatalogNode[], totalCount: number, subjectCount: number): CatalogQuery => ({
    __typename: 'Query',
    catalog: {
      __typename: 'CourseConnection',
      totalCount,
      subjectCount,
      pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: null },
      nodes,
    },
  });
  if (catalogIsZero()) return conn([], 0, 0);

  const all: CatalogNode[] = [
    {
      __typename: 'Course',
      id: IDS.course.algebra,
      title: 'Алгебра: от уравнений к функциям',
      description: 'Системный курс на учебный год: линейные уравнения, системы, функции и графики.',
      subject: 'Математика',
      level: 'GRADE_7',
      status: 'PUBLISHED',
      lessonCount: 36,
      enrollmentCount: 18,
      owner: owner(users.maria, 'Математика'),
    },
    {
      __typename: 'Course',
      id: IDS.course.english,
      title: 'Английский: разговорная практика',
      description: 'Группы до 5 человек, живой разбор ошибок.',
      subject: 'Языки',
      level: 'GRADE_7',
      status: 'PUBLISHED',
      lessonCount: 24,
      enrollmentCount: 12,
      owner: owner(users.ilya, 'Английский язык'),
    },
    {
      __typename: 'Course',
      id: IDS.course.physics,
      title: 'Физика: решаем вторую часть',
      description: 'Интенсив по задачам с развёрнутым ответом (ОГЭ).',
      subject: 'Физика',
      level: 'GRADE_9',
      status: 'PUBLISHED',
      lessonCount: 16,
      enrollmentCount: 0,
      owner: owner(users.dmitry, 'Физика'),
    },
  ];

  const f = (vars.filter as Vars | null) ?? {};
  const search = typeof f.search === 'string' ? f.search.trim().toLowerCase() : '';
  const subject = typeof f.subject === 'string' ? f.subject.trim().toLowerCase() : '';
  const level = typeof f.level === 'string' ? f.level : '';
  const hasFilter = Boolean(search || subject || level);

  let nodes = all;
  if (subject) nodes = nodes.filter((n) => n.subject.toLowerCase().includes(subject));
  if (level) nodes = nodes.filter((n) => n.level === level);
  if (search) {
    nodes = nodes.filter((n) =>
      [n.title, n.description ?? '', n.subject, n.owner.user.firstName, n.owner.user.lastName]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }
  // Unfiltered meta mirrors the atlas illusion of a large catalog (142 · 12); a filter narrows
  // both counts to the matching set.
  const totalCount = hasFilter ? nodes.length : 142;
  const subjectCount = hasFilter ? new Set(nodes.map((n) => n.subject)).size : 12;
  return conn(nodes, totalCount, subjectCount);
}

function myCourses(): MyCoursesQuery {
  return {
    __typename: 'Query',
    myCourses: [
      {
        __typename: 'Course',
        id: IDS.course.algebra,
        title: 'Алгебра: от уравнений к функциям',
        subject: 'Математика',
        level: 'GRADE_7',
        status: 'PUBLISHED',
        lessonCount: 36,
        enrollmentCount: 18,
      },
      {
        __typename: 'Course',
        id: IDS.course.geometry,
        title: 'Геометрия: планиметрия с нуля',
        subject: 'Математика',
        level: 'GRADE_7',
        status: 'DRAFT',
        lessonCount: 4,
        enrollmentCount: 0,
      },
    ],
  };
}

type DetailLesson = NonNullable<CourseDetailQuery['course']>['sections'][number]['lessons'][number];

const detailMaterial = (
  mid: string,
  type: 'FILE' | 'LINK' | 'TEXT',
  title: string,
  order: number,
) => ({
  __typename: 'Material' as const,
  id: mid,
  type,
  title,
  url: type === 'LINK' ? 'https://example.ru/тренажёр' : null,
  body: type === 'TEXT' ? 'Краткий конспект урока.' : null,
  fileUrl: type === 'FILE' ? 'https://example.ru/конспект.pdf' : null,
  order,
});

const detailLesson = (
  id: string,
  title: string,
  order: number,
  opts: {
    status?: 'PUBLISHED' | 'DRAFT';
    homework?: boolean;
    materials?: DetailLesson['materials'];
  } = {},
): DetailLesson => ({
  __typename: 'Lesson',
  id,
  title,
  durationMin: 45,
  status: opts.status ?? 'PUBLISHED',
  order,
  options: { __typename: 'LessonOptions', homework: opts.homework ?? false },
  materials: opts.materials ?? [],
});

/** DRAFT geometry course — the owner/constructor projection (publish CTA + draft pills). */
function courseDetailGeometry(id: string): CourseDetailQuery {
  return {
    __typename: 'Query',
    course: {
      __typename: 'Course',
      id,
      title: 'Геометрия: планиметрия с нуля',
      description: 'Курс в разработке: разделы, уроки и материалы наполняются.',
      subject: 'Математика',
      level: 'GRADE_7',
      status: 'DRAFT',
      lessonCount: 4,
      enrollmentCount: 0,
      updatedAt: new Date(Date.now() - 4 * 3_600_000).toISOString(),
      owner: owner(users.maria, 'Математика'),
      sections: [
        {
          __typename: 'Section',
          id: 'sec-g-01',
          title: 'Планиметрия',
          description: '',
          order: 1,
          lessons: [
            detailLesson('les-g-1', 'Точка, прямая, плоскость', 1, {
              status: 'PUBLISHED',
              homework: true,
              materials: [
                detailMaterial('mat-g-1', 'FILE', 'конспект.pdf', 1),
                detailMaterial('mat-g-2', 'LINK', 'тренажёр', 2),
              ],
            }),
            detailLesson('les-g-2', 'Углы и их измерение', 2, {
              status: 'DRAFT',
              materials: [detailMaterial('mat-g-3', 'TEXT', 'памятка', 1)],
            }),
          ],
        },
        {
          __typename: 'Section',
          id: 'sec-g-02',
          title: 'Треугольники',
          description: '',
          order: 2,
          lessons: [detailLesson('les-g-3', 'Признаки равенства', 1, { status: 'DRAFT' })],
        },
      ],
      viewerEnrollment: null,
    },
  };
}

function courseDetail(vars: Vars): CourseDetailQuery {
  const id = typeof vars.id === 'string' ? vars.id : IDS.course.algebra;
  if (id === IDS.course.geometry) return courseDetailGeometry(id);

  const enrolled = store.enrolled.has(id);
  return {
    __typename: 'Query',
    course: {
      __typename: 'Course',
      id,
      title: 'Алгебра: от уравнений к функциям',
      description:
        'Системный курс на учебный год: линейные уравнения, системы, функции и графики. Каждое занятие — живой разбор с преподавателем и домашнее задание с проверкой.',
      subject: 'Математика',
      level: 'GRADE_7',
      status: 'PUBLISHED',
      lessonCount: 7,
      enrollmentCount: 18,
      updatedAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
      owner: owner(users.maria, 'Математика'),
      sections: [
        {
          __typename: 'Section',
          id: 'sec-01',
          title: 'Линейные уравнения',
          description: '',
          order: 1,
          lessons: [
            detailLesson('les-1-1', 'Что такое уравнение', 1, {
              homework: true,
              materials: [
                detailMaterial('mat-1', 'FILE', 'конспект.pdf', 1),
                detailMaterial('mat-2', 'LINK', 'тренажёр', 2),
              ],
            }),
            detailLesson('les-1-2', 'Перенос слагаемых', 2, {
              homework: true,
              materials: [detailMaterial('mat-3', 'TEXT', 'памятка', 1)],
            }),
          ],
        },
        {
          __typename: 'Section',
          id: 'sec-02',
          title: 'Системы уравнений',
          description: '',
          order: 2,
          lessons: [
            detailLesson('les-2-1', 'Метод подстановки', 1, { homework: true }),
            detailLesson('les-2-2', 'Метод сложения', 2),
            detailLesson('les-2-3', 'Задачи на системы', 3, { homework: true }),
          ],
        },
        {
          __typename: 'Section',
          id: 'sec-03',
          title: 'Функции и графики',
          description: '',
          order: 3,
          lessons: [
            detailLesson('les-3-1', 'Что такое функция', 1),
            detailLesson('les-3-2', 'График линейной функции', 2, { homework: true }),
          ],
        },
      ],
      // Section 01 fully viewed → done; 02 in-progress; 03 locked (sequential unlock).
      viewerEnrollment: enrolled
        ? {
            __typename: 'Enrollment',
            id: 'enr-1',
            status: 'ACTIVE',
            progressPct: 29,
            viewedLessonIds: ['les-1-1', 'les-1-2'],
          }
        : null,
    },
  };
}

// --- Schedule ----------------------------------------------------------------------------
function mySchedule(): MyScheduleQuery {
  return {
    __typename: 'Query',
    mySchedule: [
      {
        __typename: 'LessonSession',
        id: IDS.session.live,
        startAt: times.todayLive,
        endAt: times.todayLiveEnd,
        status: 'LIVE',
        lesson: { __typename: 'Lesson', id: 'les-1-1', title: 'Алгебра — линейные уравнения' },
      },
      {
        __typename: 'LessonSession',
        id: IDS.session.english,
        startAt: times.todayEnglish,
        endAt: null,
        status: 'SCHEDULED',
        lesson: { __typename: 'Lesson', id: 'les-en-1', title: 'Английский — Present Perfect' },
      },
      {
        __typename: 'LessonSession',
        id: IDS.session.physics,
        startAt: times.tomorrowPhysics,
        endAt: null,
        status: 'SCHEDULED',
        lesson: { __typename: 'Lesson', id: 'les-ph-1', title: 'Физика — разбор задач' },
      },
      {
        __typename: 'LessonSession',
        id: IDS.session.past,
        startAt: times.yesterdayPast,
        endAt: null,
        status: 'ENDED',
        lesson: { __typename: 'Lesson', id: 'les-1-0', title: 'Алгебра — повторение' },
      },
      {
        __typename: 'LessonSession',
        id: IDS.session.canceled,
        startAt: times.yesterdayCanceled,
        endAt: null,
        status: 'CANCELED',
        lesson: { __typename: 'Lesson', id: 'les-en-0', title: 'Английский — чтение' },
      },
    ],
  };
}

// --- Homework ----------------------------------------------------------------------------
function mySubmissions(): MySubmissionsQuery {
  return {
    __typename: 'Query',
    mySubmissions: [
      {
        __typename: 'Submission',
        id: 'sub-present',
        status: 'SUBMITTED',
        score: null,
        comment: null,
        attempt: 1,
        submittedAt: times.yesterdayPast,
        homework: {
          __typename: 'Homework',
          id: IDS.homework.present,
          title: 'Present Perfect — письмо другу',
        },
      },
      {
        __typename: 'Submission',
        id: 'sub-motion',
        status: 'GRADED',
        score: 5,
        comment: 'Отлично, все шаги решения на месте.',
        attempt: 1,
        submittedAt: times.yesterdayCanceled,
        homework: { __typename: 'Homework', id: IDS.homework.motion, title: 'Задачи на движение' },
      },
      {
        __typename: 'Submission',
        id: 'sub-essay',
        status: 'LATE',
        score: null,
        comment: null,
        attempt: 1,
        submittedAt: times.yesterdayPast,
        homework: { __typename: 'Homework', id: IDS.homework.essay, title: 'Сочинение «Моё лето»' },
      },
    ],
  };
}

function lessonHomework(): LessonHomeworkQuery {
  return {
    __typename: 'Query',
    lessonHomework: [
      {
        __typename: 'Homework',
        id: IDS.homework.linear,
        title: 'Линейные уравнения — задачи 12–18',
        description: 'Реши задачи 12–18 из учебника (стр. 84). Ход решения обязателен.',
        type: 'FILE',
        dueAt: times.todayEnglish,
        allowRedo: false,
        publishedAt: times.yesterdayPast,
        submissionStats: {
          __typename: 'SubmissionStats',
          total: 7,
          submitted: 5,
          graded: 2,
          late: 1,
        },
        viewerSubmission: null,
      },
    ],
  };
}

function homeworkSubmissions(): HomeworkSubmissionsQuery {
  const row = (
    id: string,
    u: (typeof users)[keyof typeof users],
    status: 'SUBMITTED' | 'LATE' | 'GRADED',
    text: string,
    score: number | null,
  ) => ({
    __typename: 'Submission' as const,
    id,
    attempt: 1,
    status,
    score,
    comment: null,
    contentText: text,
    submittedAt: times.yesterdayPast,
    student: {
      __typename: 'StudentProfile' as const,
      user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName },
    },
  });
  return {
    __typename: 'Query',
    homeworkSubmissions: [
      row(
        'grd-timur',
        users.timur,
        'LATE',
        'Задачи 12–15 решил через перенос слагаемых, 16–18 — через умножение.',
        null,
      ),
      row('grd-vera', users.vera, 'SUBMITTED', 'Приложила ход решения по всем номерам.', null),
      row('grd-sasha', users.sasha, 'SUBMITTED', 'Решение во вложении.', null),
    ],
  };
}

// --- Teacher dashboard (atlas 03) --------------------------------------------------------
/** Calm-day teacher dashboard: 3 upcoming sessions (nearest is startable), a 7-deep grading
 *  queue (oldest 2 days, one LATE), 23 students (+2). Times are relative to the real run
 *  clock so "сегодня"/countdowns always read correctly. No LIVE session by default (the
 *  sheet's default state is "обычный день"). */
function teacherDashboard(): TeacherDashboardQuery {
  const now = Date.now();
  const inMin = (n: number) => new Date(now + n * 60_000).toISOString();
  const daysAgo = (d: number, h: number) =>
    new Date(now - d * 86_400_000 - h * 3_600_000).toISOString();
  const lesson = (id: string, title: string) => ({ __typename: 'Lesson' as const, id, title });
  const pending = (
    id: string,
    u: (typeof users)[keyof typeof users],
    status: 'SUBMITTED' | 'LATE',
    submittedAt: string,
    hwTitle: string,
    les: { id: string; title: string },
  ) => ({
    __typename: 'Submission' as const,
    id,
    submittedAt,
    status,
    student: {
      __typename: 'StudentProfile' as const,
      user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName },
    },
    homework: {
      __typename: 'Homework' as const,
      id: `hw-${id}`,
      title: hwTitle,
      lesson: { __typename: 'Lesson' as const, ...les },
    },
  });
  const linear = { id: 'les-1-1', title: 'Линейные уравнения' };
  const systems = { id: 'les-2-1', title: 'Системы уравнений' };
  const functions = { id: 'les-3-1', title: 'Функции и графики' };
  return {
    __typename: 'Query',
    teacherDashboard: {
      __typename: 'TeacherDashboard',
      studentCount: 23,
      newStudentsThisWeek: 2,
      courses: [
        {
          __typename: 'Course',
          id: IDS.course.algebra,
          title: 'Алгебра: от уравнений к функциям',
          status: 'PUBLISHED',
          lessonCount: 36,
          enrollmentCount: 18,
        },
        {
          __typename: 'Course',
          id: IDS.course.geometry,
          title: 'Геометрия: планиметрия с нуля',
          status: 'DRAFT',
          lessonCount: 4,
          enrollmentCount: 0,
        },
      ],
      upcomingSessions: [
        {
          __typename: 'LessonSession',
          id: IDS.session.live,
          startAt: inMin(-3),
          endAt: inMin(42),
          status: 'SCHEDULED',
          lesson: lesson('les-1-1', 'Алгебра — линейные уравнения'),
        },
        {
          __typename: 'LessonSession',
          id: IDS.session.english,
          startAt: inMin(90),
          endAt: null,
          status: 'SCHEDULED',
          lesson: lesson('les-2-1', 'Алгебра — системы уравнений'),
        },
        {
          __typename: 'LessonSession',
          id: IDS.session.physics,
          startAt: inMin(210),
          endAt: null,
          status: 'SCHEDULED',
          lesson: lesson('les-3-1', 'Консультация — подготовка к контрольной'),
        },
      ],
      pendingSubmissions: [
        pending(
          'pq-timur',
          users.timur,
          'LATE',
          daysAgo(2, 3),
          'Линейные уравнения — задачи 12–18',
          linear,
        ),
        pending(
          'pq-vera',
          users.vera,
          'SUBMITTED',
          daysAgo(2, 1),
          'Линейные уравнения — задачи 12–18',
          linear,
        ),
        pending(
          'pq-sasha',
          users.sasha,
          'SUBMITTED',
          daysAgo(1, 5),
          'Системы уравнений — самостоятельная',
          systems,
        ),
        pending(
          'pq-kostya',
          users.kostya,
          'SUBMITTED',
          daysAgo(1, 2),
          'Системы уравнений — самостоятельная',
          systems,
        ),
        pending(
          'pq-liza',
          users.liza,
          'SUBMITTED',
          daysAgo(0, 6),
          'Функции — построить графики',
          functions,
        ),
        pending(
          'pq-mark',
          users.mark,
          'SUBMITTED',
          daysAgo(0, 3),
          'Функции — построить графики',
          functions,
        ),
        pending(
          'pq-anya',
          users.anya,
          'SUBMITTED',
          daysAgo(0, 1),
          'Функции — построить графики',
          functions,
        ),
      ],
    },
  };
}

// --- Admin -------------------------------------------------------------------------------
function adminInstitution(): AdminInstitutionQuery {
  return {
    __typename: 'Query',
    me: {
      __typename: 'User',
      id: users.galina.id,
      adminProfile: {
        __typename: 'AdminProfile',
        institution: {
          __typename: 'Institution',
          id: IDS.institution,
          name: 'Гимназия №1',
          address: 'г. Москва, ул. Школьная, 1',
          website: 'https://gymnasium1.ru',
          subdomain: 'gymnasium1',
          status: 'ACTIVE',
          defaultLocale: 'ru',
          branding: { primaryColor: '#FF5A5F' },
          logoUrl: null,
        },
      },
    },
  };
}

function institutionMembers(): InstitutionMembersQuery {
  const m = (
    id: string,
    u: (typeof users)[keyof typeof users],
    role: 'STUDENT' | 'TEACHER' | 'ADMIN',
    status: 'ACTIVE' | 'PENDING' | 'INACTIVE',
  ) => ({
    __typename: 'InstitutionMembership' as const,
    id,
    role,
    status,
    joinedAt: status === 'PENDING' ? null : times.yesterdayPast,
    user: {
      __typename: 'User' as const,
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    },
  });
  return {
    __typename: 'Query',
    institutionMembers: [
      m('mem-maria', users.maria, 'TEACHER', 'ACTIVE'),
      m('mem-ilya', users.ilya, 'TEACHER', 'ACTIVE'),
      m('mem-sasha', users.sasha, 'STUDENT', 'ACTIVE'),
      m('mem-vera', users.vera, 'STUDENT', 'ACTIVE'),
      m('mem-annaR', users.annaR, 'TEACHER', 'PENDING'),
      m('mem-petrK', users.petrK, 'STUDENT', 'PENDING'),
    ],
  };
}

function institutionGroups(): InstitutionGroupsQuery {
  const stud = (u: (typeof users)[keyof typeof users]) => ({
    __typename: 'StudentProfile' as const,
    user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName },
  });
  const gt = (id: string, u: (typeof users)[keyof typeof users], subject: string) => ({
    __typename: 'GroupTeacher' as const,
    id,
    subject,
    teacher: {
      __typename: 'TeacherProfile' as const,
      user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName },
    },
  });
  return {
    __typename: 'Query',
    groups: [
      {
        __typename: 'Group',
        id: IDS.group.g7a,
        name: '7А',
        level: '7 класс',
        students: [stud(users.sasha), stud(users.vera), stud(users.kostya)],
        teachers: [
          gt('gt-1', users.maria, 'Математика'),
          gt('gt-2', users.ilya, 'Английский язык'),
        ],
      },
      {
        __typename: 'Group',
        id: IDS.group.g7b,
        name: '7Б',
        level: '7 класс',
        students: [stud(users.liza), stud(users.mark)],
        teachers: [gt('gt-3', users.ilya, 'Английский язык')],
      },
      {
        __typename: 'Group',
        id: IDS.group.g8a,
        name: '8А',
        level: '8 класс',
        students: [stud(users.anya), stud(users.dima)],
        teachers: [gt('gt-4', users.dmitry, 'Физика')],
      },
    ],
  };
}

// --- Live room ---------------------------------------------------------------------------
function sessionRoom(vars: Vars): SessionRoomQuery {
  const id = typeof vars.id === 'string' ? vars.id : IDS.session.live;
  return {
    __typename: 'Query',
    session: {
      __typename: 'LessonSession',
      id,
      status: 'LIVE',
      roomToken: 'demo-room-token',
      teacherName: 'Мария Петровна',
      lesson: { __typename: 'Lesson', id: 'les-1-1', title: 'Алгебра — линейные уравнения' },
    },
  };
}

function sessionAttendees(vars: Vars): SessionAttendeesQuery {
  const id = typeof vars.id === 'string' ? vars.id : IDS.session.live;
  return {
    __typename: 'Query',
    session: {
      __typename: 'LessonSession',
      id,
      attendance: cohort.map((c) => ({
        __typename: 'Attendance' as const,
        student: {
          __typename: 'StudentProfile' as const,
          user: {
            __typename: 'User' as const,
            id: c.user.id,
            firstName: c.user.firstName,
            lastName: c.user.lastName,
          },
        },
      })),
    },
  };
}

/** ~12 points around the class average, for the post-session report chart. */
export function attentionPoints(): { at: string; value: number }[] {
  const base = [70, 74, 81, 86, 78, 69, 64, 72, 84, 88, 75, 80];
  const start = Date.now() - base.length * 10_000;
  return base.map((value, i) => ({ at: new Date(start + i * 10_000).toISOString(), value }));
}

function sessionAttention(): SessionAttentionQuery {
  const pts = attentionPoints();
  const values = pts.map((p) => p.value);
  return {
    __typename: 'Query',
    sessionAttention: {
      __typename: 'AttentionSummary',
      averageAttention: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      peak: Math.max(...values),
      low: Math.min(...values),
      points: pts.map((p) => ({ __typename: 'AttentionPoint' as const, at: p.at, value: p.value })),
    },
  };
}

// --- Subscription: synthetic attention ticks (never persisted, on-device by design) ------
let tickIdx = 0;
export function nextAttentionMetric(sessionId: string): AttentionUpdatesSubscription {
  const c = cohort[tickIdx % cohort.length];
  tickIdx += 1;
  const jitter = (tickIdx % 7) - 3; // -3..+3, deterministic (no Math.random)
  const v = Math.max(0, Math.min(100, c.attention + jitter));
  return {
    __typename: 'Subscription',
    attentionUpdates: {
      __typename: 'AttentionMetric',
      id: nextId('metric'),
      sessionId,
      studentId: c.user.id,
      bucketStart: iso(),
      avgAttention: v,
      gazeOnScreen: v,
      eyeOpenness: Math.min(100, v + 8),
      headYaw: 2,
      headPitch: -1,
      alertness: Math.max(0, v - 5),
    },
  };
}

// --- Mutations (success + optimistic store updates for the visible flows) ----------------
function authPayload(): LoginMutation['login'] {
  const u = users.maria;
  return {
    __typename: 'AuthPayload',
    token: 'demo-token',
    refreshToken: 'demo-refresh',
    user: {
      __typename: 'User',
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: 'TEACHER',
      locale: 'ru',
      studentProfile: null,
      teacherProfile: { __typename: 'TeacherProfile', verificationStatus: 'APPROVED' },
    },
  };
}

function input(vars: Vars): Vars {
  return (vars.input as Vars) ?? {};
}

// --- dispatch ----------------------------------------------------------------------------
/** Resolve one operation to its synthetic data payload (or null for unmapped ops). */
export function resolveDemoOperation(
  operationName: string | undefined,
  variables: Vars,
): Record<string, unknown> | null {
  switch (operationName) {
    // queries
    case 'Me':
      return me();
    case 'LearningProfiles':
      return learningProfiles();
    case 'StartPage':
      return startPage();
    case 'SubjectCabinet':
      return consistentCabinet(subjectCabinet(variables));
    case 'SubjectTasks':
      return subjectTasks(variables);
    case 'SubjectProgress':
      return subjectProgress(variables);
    case 'LessonExerciseSets':
      return exerciseSets();
    case 'ExerciseLivePicture':
      return exerciseLivePicture();
    case 'MyExerciseAttempts':
      return {
        myAttempts: [...store.exercises.answers.entries()].map(([exerciseId, a]) => ({
          __typename: 'Attempt' as const,
          id: `att-${exerciseId}`,
          exerciseId,
          context: 'LIVE' as const,
          isCorrect: a.correct,
          score: a.correct ? 1 : 0,
          createdAt: a.at,
        })),
      } satisfies MyExerciseAttemptsQuery;
    case 'SetProgress': {
      const answered = store.exercises.answers.size;
      return {
        setProgress: {
          __typename: 'SetProgress',
          total: DEMO_EXERCISES.length,
          answered,
          correct: [...store.exercises.answers.values()].filter((a) => a.correct).length,
        },
      } satisfies SetProgressQuery;
    }
    case 'Board':
      return {
        board: {
          __typename: 'Board',
          lessonId: String(variables.lessonId ?? 'les-1-12'),
          openForStudents: store.board.open,
          // The preview's teacher may draw; a pupil may only when the board is open —
          // exactly the rule the server enforces.
          canWrite: demoGraphQLRole() === 'TEACHER' || store.board.open,
          isTeacher: demoGraphQLRole() === 'TEACHER',
          elements: boardElements(),
        },
      } satisfies BoardQuery;
    case 'CourseBoards':
      return {
        courseBoards: store.board.saved.map((b) => ({
          __typename: 'BoardSnapshot' as const,
          id: b.id,
          title: b.title,
          savedAt: b.savedAt,
          savedByName: 'Ирина Соколова',
          lessonId: 'les-1-11',
          lessonTitle: 'Транзитный метод',
        })),
      } satisfies CourseBoardsQuery;
    case 'MyChannels':
      return { myChannels: chatChannels() } satisfies MyChannelsQuery;
    case 'ChatUnread':
      return {
        chatUnread: chatChannels().reduce((sum, c) => sum + c.unread, 0),
      } satisfies ChatUnreadQuery;
    case 'ChannelMessages':
      return chatMessages(variables);
    case 'ChatPolicy':
      // The preview runs a RU tenant, so peer chat is on — the same answer the matrix gives.
      return {
        chatPolicy: {
          __typename: 'ChatPolicyView',
          peerChat: true,
          directMessages: true,
          teacherVisibleAlways: false,
          premoderation: false,
        },
      } satisfies ChatPolicyQuery;
    case 'ChatReports':
      return { chatReports: [] } satisfies ChatReportsQuery;
    case 'Catalog':
      return catalog(variables);
    case 'MyCourses':
      return myCourses();
    case 'CourseDetail':
      return courseDetail(variables);
    case 'MySchedule':
      return mySchedule();
    case 'MySubmissions':
      return mySubmissions();
    case 'LessonHomework':
      return lessonHomework();
    case 'HomeworkSubmissions':
      return homeworkSubmissions();
    case 'TeacherDashboard':
      return teacherDashboard();
    case 'AdminInstitution':
      return adminInstitution();
    case 'InstitutionMembers':
      return institutionMembers();
    case 'InstitutionGroups':
      return institutionGroups();
    case 'SessionRoom':
      return sessionRoom(variables);
    case 'SessionAttendees':
      return sessionAttendees(variables);
    case 'SessionAttention':
      return sessionAttention();

    // auth (screens skipped in preview — resolve gracefully)
    case 'Login':
      return { login: authPayload() } satisfies LoginMutation;
    case 'RegisterUser':
      return { registerUser: authPayload() } satisfies RegisterUserMutation;
    case 'RefreshToken':
      return { refreshToken: authPayload() } satisfies RefreshTokenMutation;
    case 'RequestPasswordReset':
      return { requestPasswordReset: true } satisfies RequestPasswordResetMutation;
    case 'ResetPassword':
      return { resetPassword: true } satisfies ResetPasswordMutation;

    // subject cabinet — the quiet corner keeps a LINK, never a copy (atlas 01 / owner req. 12)
    case 'SaveItem': {
      const inp = input(variables);
      const key = String(inp.materialId ?? inp.url ?? nextId('saved'));
      const savedId = store.saved.get(key)?.savedId ?? nextId('saved');
      const kind = inp.kind === 'WATCH_LATER' ? 'WATCH_LATER' : 'SAVED';
      store.saved.set(key, {
        savedId,
        note: String(inp.note ?? ''),
        watchLater: kind === 'WATCH_LATER',
        title: String(inp.title ?? ''),
        url: (inp.url as string | null) ?? null,
        sourceName: (inp.sourceName as string | null) ?? null,
      });
      return {
        saveItem: {
          __typename: 'SubjectMaterial',
          id: savedId,
          title: String(inp.title ?? ''),
          savedId,
          note: String(inp.note ?? '') || null,
          savedKind: kind,
        },
      } satisfies SaveItemMutation;
    }
    case 'RemoveSavedItem': {
      const id = String(variables.id ?? '');
      for (const [key, kept] of store.saved) if (kept.savedId === id) store.saved.delete(key);
      return { removeSavedItem: true } satisfies RemoveSavedItemMutation;
    }

    // chat (R2) — the preview keeps what you send, so the window behaves like the real one
    case 'SendChannelMessage': {
      const channelId = String(variables.channelId ?? '');
      const message = {
        id: nextId('msg'),
        text: String(variables.text ?? ''),
        sentAt: iso(),
      };
      store.chat.sent.set(channelId, [...(store.chat.sent.get(channelId) ?? []), message]);
      store.chat.read.add(channelId);
      return {
        sendChannelMessage: {
          __typename: 'ChannelMessage',
          id: message.id,
          channelId,
          senderId: users.sasha.id,
          senderName: 'Саша Иванов',
          text: message.text,
          sentAt: message.sentAt,
          mine: true,
        },
      } satisfies SendChannelMessageMutation;
    }
    case 'MarkChannelRead':
      store.chat.read.add(String(variables.channelId ?? ''));
      return { markChannelRead: true } satisfies MarkChannelReadMutation;
    case 'ReportChannel': {
      const channelId = String(variables.channelId ?? '');
      store.chat.reported.add(channelId);
      return {
        reportChannel: {
          __typename: 'ChatReport',
          id: nextId('rep'),
          channelId,
          status: 'OPEN',
        },
      } satisfies ReportChannelMutation;
    }
    case 'OpenSubjectChannel':
      return {
        openSubjectChannel: {
          __typename: 'ChatChannel',
          id: CHANNEL_IDS.subject,
          kind: 'SUBJECT_GROUP',
          courseTitle: 'Астрономия',
          unread: 0,
        },
      } satisfies OpenSubjectChannelMutation;

    // second screen (R3.1) — cast a code, redeem it for a watch-only connection
    case 'CreateProjectorCode':
      return {
        createProjectorCode: {
          __typename: 'ProjectorCast',
          code: 'K7M2RQ',
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          sessionId: String(variables.sessionId ?? IDS.session.live),
        },
      } satisfies CreateProjectorCodeMutation;
    case 'RedeemProjectorCode':
      return {
        redeemProjectorCode: {
          __typename: 'ProjectorJoin',
          sessionId: IDS.session.live,
          lessonTitle: 'Экзопланеты',
          // A demo token is still a watch-only one: the preview never publishes anything.
          roomToken: 'demo-projector-token',
        },
      } satisfies RedeemProjectorCodeMutation;
    case 'SetProjectorFocus':
      return {
        setProjectorFocus: {
          __typename: 'ProjectorFocus',
          sessionId: String(variables.sessionId ?? IDS.session.live),
          studentId: (variables.studentId as string | null) ?? null,
        },
      } satisfies SetProjectorFocusMutation;

    // board (R3.2) — the preview canvas behaves like the real one
    case 'PutBoardElement': {
      const inp = input(variables);
      const id = String(inp.id ?? nextId('b'));
      const element = {
        __typename: 'BoardElement' as const,
        id,
        kind: inp.kind as BoardQuery['board']['elements'][number]['kind'],
        authorId: users.sasha.id,
        authorName: 'Саша Иванов',
        x: Number(inp.x ?? 0),
        y: Number(inp.y ?? 0),
        width: Number(inp.width ?? 0),
        height: Number(inp.height ?? 0),
        data: (inp.data as Record<string, unknown>) ?? {},
        revision: 1,
      };
      if (inp.id) store.board.edits.set(id, element);
      else store.board.added.push(element);
      return { putBoardElement: element } satisfies PutBoardElementMutation;
    }
    case 'RemoveBoardElement': {
      const id = String(variables.elementId ?? '');
      store.board.removed.add(id);
      store.board.added = store.board.added.filter((e) => e.id !== id);
      return { removeBoardElement: true } satisfies RemoveBoardElementMutation;
    }
    case 'SetBoardOpen':
      store.board.open = Boolean(variables.isOpen);
      return { setBoardOpen: store.board.open } satisfies SetBoardOpenMutation;
    case 'SaveBoard': {
      const snapshot = {
        id: nextId('snap'),
        title: String(variables.title ?? 'Доска · сегодня'),
        savedAt: iso(),
      };
      store.board.saved = [snapshot, ...store.board.saved];
      return {
        saveBoard: { __typename: 'BoardSnapshot', ...snapshot },
      } satisfies SaveBoardMutation;
    }

    // exercises (R4.1) — an answer sticks, so the preview run behaves like the real one
    case 'AnswerExercise': {
      const exerciseId = String(variables.exerciseId ?? '');
      const response = (variables.response ?? {}) as { choice?: number; text?: string };
      const seeded = DEMO_EXERCISES.find((e) => e.id === exerciseId);
      // An open kind has no machine verdict — null, exactly as the server answers.
      const correct =
        seeded?.correct == null
          ? seeded?.kind === 'CLOZE'
            ? String(response.text ?? '')
                .trim()
                .toLowerCase() === 'far'
            : null
          : response.choice === seeded.correct;
      store.exercises.answers.set(exerciseId, {
        choice: response.choice,
        correct,
        at: iso(),
      });
      return {
        answerExercise: {
          __typename: 'Attempt',
          id: nextId('att'),
          exerciseId,
          isCorrect: correct,
          score: correct ? 1 : 0,
          createdAt: iso(),
        },
      } satisfies AnswerExerciseMutation;
    }
    case 'HandInExerciseSet':
      return {
        handInExerciseSet: {
          __typename: 'HomeworkHandIn',
          submissionId: nextId('sub'),
          score: 75,
          autoChecked: 3,
          awaitingTeacher: 1,
        },
      } satisfies HandInExerciseSetMutation;

    // profile / parent
    case 'AddChild': {
      const inp = input(variables);
      const child = makeChild(
        String(inp.firstName ?? 'Новый'),
        String(inp.lastName ?? ''),
        (inp.gradeLevel as string | null) ?? null,
      );
      store.children = [...store.children, child];
      return {
        addChild: {
          __typename: 'Guardianship',
          id: nextId('grd'),
          status: 'ACTIVE',
          consent152fz: Boolean(inp.consent152fz),
          consentAt: iso(),
          child: {
            __typename: 'User',
            id: child.user.id,
            firstName: child.user.firstName,
            lastName: child.user.lastName,
          },
        },
      } satisfies AddChildMutation;
    }
    case 'SubmitVerificationDocument':
      return {
        submitVerificationDocument: {
          __typename: 'VerificationDocument',
          id: nextId('doc'),
          status: 'PENDING',
          fileUrl: 'https://example.ru/diploma.pdf',
          createdAt: iso(),
        },
      } satisfies SubmitVerificationDocumentMutation;
    case 'SetActiveLearningProfile': {
      const id = String(variables.id ?? '');
      store.activeLearningProfile = id;
      const kind = id.startsWith('teacher:')
        ? 'TEACHER'
        : id.startsWith('cadet:')
          ? 'CADET'
          : 'PUPIL';
      return {
        setActiveLearningProfile: { __typename: 'LearningProfile', id, kind, isActive: true },
      } satisfies SetActiveLearningProfileMutation;
    }
    case 'SetAvatar':
      return {
        setAvatar: { __typename: 'User', id: users.maria.id, avatarUrl: null },
      } satisfies SetAvatarMutation;

    // courses (teacher authoring + student enroll)
    case 'CreateCourse':
      return {
        createCourse: { __typename: 'Course', id: nextId('course'), status: 'DRAFT' },
      } satisfies CreateCourseMutation;
    case 'UpdateCourse':
      return {
        updateCourse: {
          __typename: 'Course',
          id: String(variables.id ?? IDS.course.algebra),
          title: String(input(variables).title ?? 'Курс'),
        },
      } satisfies UpdateCourseMutation;
    case 'PublishCourse':
      return {
        publishCourse: {
          __typename: 'Course',
          id: String(variables.id ?? IDS.course.algebra),
          status: 'PUBLISHED',
        },
      } satisfies PublishCourseMutation;
    case 'UnpublishCourse':
      return {
        unpublishCourse: {
          __typename: 'Course',
          id: String(variables.id ?? IDS.course.geometry),
          status: 'DRAFT',
        },
      } satisfies UnpublishCourseMutation;
    case 'UpdateSection':
      return {
        updateSection: {
          __typename: 'Section',
          id: String(variables.id ?? 'sec-01'),
          title: String(input(variables).title ?? 'Раздел'),
        },
      } satisfies UpdateSectionMutation;
    case 'UpdateLesson': {
      // The edit-mode changes are remembered, so the next read of the cabinet shows them
      // (a preview that forgets an edit teaches the wrong thing about the feature).
      const inp = input(variables);
      const id = String(variables.id ?? 'les-1-1');
      const kind = inp.kind === 'EXTERNAL_DEVICE' ? 'EXTERNAL_DEVICE' : 'STANDARD';
      const deviceKey = kind === 'EXTERNAL_DEVICE' ? String(inp.deviceKey ?? '') : '';
      store.programme.edits.set(id, {
        title: String(inp.title ?? 'Урок'),
        description: String(inp.description ?? ''),
        kind,
        deviceKey,
      });
      return {
        updateLesson: {
          __typename: 'Lesson',
          id,
          title: String(inp.title ?? 'Урок'),
          description: String(inp.description ?? ''),
          kind,
          deviceKey: deviceKey || null,
        },
      } satisfies UpdateLessonMutation;
    }
    case 'CreateSection':
      return {
        createSection: {
          __typename: 'Section',
          id: nextId('sec'),
          title: String(input(variables).title ?? 'Новый раздел'),
          order: 99,
        },
      } satisfies CreateSectionMutation;
    case 'CreateLesson': {
      const inp = input(variables);
      const id = nextId('les');
      const sectionId = String(variables.sectionId ?? '');
      const kind = inp.kind === 'EXTERNAL_DEVICE' ? 'EXTERNAL_DEVICE' : 'STANDARD';
      const deviceKey = kind === 'EXTERNAL_DEVICE' ? String(inp.deviceKey ?? '') : '';
      store.programme.added.set(sectionId, [
        ...(store.programme.added.get(sectionId) ?? []),
        {
          id,
          title: String(inp.title ?? 'Новый урок'),
          description: String(inp.description ?? ''),
          kind,
          deviceKey,
        },
      ]);
      return {
        createLesson: {
          __typename: 'Lesson',
          id,
          title: String(inp.title ?? 'Новый урок'),
          status: 'DRAFT',
          kind,
          deviceKey: deviceKey || null,
        },
      } satisfies CreateLessonMutation;
    }
    case 'PublishLesson':
      return {
        publishLesson: {
          __typename: 'Lesson',
          id: String(variables.id ?? 'les-1-1'),
          status: 'PUBLISHED',
        },
      } satisfies PublishLessonMutation;
    case 'DeleteSection':
      return { deleteSection: true } satisfies DeleteSectionMutation;
    case 'DeleteLesson':
      store.programme.removed.add(String(variables.id ?? ''));
      return { deleteLesson: true } satisfies DeleteLessonMutation;
    case 'DeleteMaterial':
      return { deleteMaterial: true } satisfies DeleteMaterialMutation;
    case 'ReorderSections':
      return {
        reorderSections: (Array.isArray(variables.orderedIds) ? variables.orderedIds : []).map(
          (id, i) => ({ __typename: 'Section' as const, id: String(id), order: i + 1 }),
        ),
      } satisfies ReorderSectionsMutation;
    case 'ReorderLessons': {
      const ordered = (Array.isArray(variables.orderedIds) ? variables.orderedIds : []).map(String);
      store.programme.order.set(String(variables.sectionId ?? ''), ordered);
      return {
        reorderLessons: ordered.map((id, i) => ({
          __typename: 'Lesson' as const,
          id,
          order: i + 1,
        })),
      } satisfies ReorderLessonsMutation;
    }
    case 'AddMaterial':
      return {
        addMaterial: {
          __typename: 'Material',
          id: nextId('mat'),
          type: (input(variables).type as 'FILE' | 'LINK' | 'TEXT') ?? 'LINK',
          title: String(input(variables).title ?? 'Материал'),
        },
      } satisfies AddMaterialMutation;
    case 'Enroll': {
      const courseId = String(variables.courseId ?? IDS.course.algebra);
      store.enrolled.add(courseId);
      return {
        enroll: { __typename: 'Enrollment', id: nextId('enr'), status: 'ACTIVE', progressPct: 0 },
      } satisfies EnrollMutation;
    }
    case 'Unenroll': {
      store.enrolled.delete(String(variables.courseId ?? IDS.course.algebra));
      return { unenroll: true };
    }

    // homework
    case 'CreateHomework':
      return {
        createHomework: {
          __typename: 'Homework',
          id: nextId('hw'),
          title: String(input(variables).title ?? 'Домашнее задание'),
          publishedAt: null,
        },
      } satisfies CreateHomeworkMutation;
    case 'PublishHomework':
      return {
        publishHomework: {
          __typename: 'Homework',
          id: String(variables.id ?? IDS.homework.linear),
          publishedAt: iso(),
        },
      } satisfies PublishHomeworkMutation;
    case 'DeleteHomework':
      return { deleteHomework: true } satisfies DeleteHomeworkMutation;
    case 'SubmitHomework':
      return {
        submitHomework: {
          __typename: 'Submission',
          id: nextId('sub'),
          status: 'SUBMITTED',
          attempt: 1,
        },
      } satisfies SubmitHomeworkMutation;
    case 'GradeSubmission':
      return {
        gradeSubmission: {
          __typename: 'Submission',
          id: String(input(variables).submissionId ?? 'grd-timur'),
          status: 'GRADED',
          score: Number(input(variables).score ?? 5),
          comment: (input(variables).comment as string | null) ?? null,
        },
      } satisfies GradeSubmissionMutation;

    // scheduling
    case 'ScheduleSession':
      return {
        scheduleSession: {
          __typename: 'LessonSession',
          id: nextId('ses'),
          startAt: iso(),
          status: 'SCHEDULED',
        },
      } satisfies ScheduleSessionMutation;
    case 'StartSession':
      return {
        startSession: {
          __typename: 'LessonSession',
          id: String(variables.sessionId ?? IDS.session.live),
          status: 'LIVE',
        },
      } satisfies StartSessionMutation;
    case 'EndSession':
      return {
        endSession: {
          __typename: 'LessonSession',
          id: String(variables.sessionId ?? IDS.session.live),
          status: 'ENDED',
        },
      } satisfies EndSessionMutation;
    case 'JoinSession':
      return {
        joinSession: {
          __typename: 'SessionJoin',
          roomToken: 'demo-room-token',
          session: {
            __typename: 'LessonSession',
            id: String(variables.sessionId ?? IDS.session.live),
            status: 'LIVE',
          },
        },
      } satisfies JoinSessionMutation;

    // admin
    case 'UpdateInstitution':
      return {
        updateInstitution: {
          __typename: 'Institution',
          id: IDS.institution,
          name: String(input(variables).name ?? 'Гимназия №1'),
          address: (input(variables).address as string | null) ?? null,
          website: (input(variables).website as string | null) ?? null,
        },
      } satisfies UpdateInstitutionMutation;
    case 'UpdateBranding':
      return {
        updateBranding: {
          __typename: 'Institution',
          id: IDS.institution,
          branding: (variables.branding as Record<string, unknown>) ?? null,
        },
      } satisfies UpdateBrandingMutation;
    case 'InviteMember':
      return {
        inviteMember: {
          __typename: 'InstitutionMembership',
          id: nextId('mem'),
          role: (input(variables).role as 'STUDENT' | 'TEACHER' | 'ADMIN') ?? 'STUDENT',
          status: 'PENDING',
          user: {
            __typename: 'User',
            id: nextId('u'),
            firstName: 'Приглашён',
            lastName: '',
            email: String(input(variables).email ?? 'new@example.ru'),
          },
        },
      } satisfies InviteMemberMutation;
    case 'UpdateMembership':
      return {
        updateMembership: {
          __typename: 'InstitutionMembership',
          id: String(variables.id ?? 'mem-annaR'),
          role: (variables.role as 'STUDENT' | 'TEACHER' | 'ADMIN') ?? 'STUDENT',
          status: (variables.status as 'ACTIVE' | 'PENDING' | 'INACTIVE') ?? 'ACTIVE',
        },
      } satisfies UpdateMembershipMutation;
    case 'RemoveMember':
      return { removeMember: true } satisfies RemoveMemberMutation;
    case 'CreateGroup':
      return {
        createGroup: {
          __typename: 'Group',
          id: nextId('grp'),
          name: String(input(variables).name ?? 'Новая группа'),
          level: (input(variables).level as string | null) ?? null,
        },
      } satisfies CreateGroupMutation;
    case 'AddStudentsToGroup':
      return {
        addStudentsToGroup: {
          __typename: 'Group',
          id: String(variables.groupId ?? IDS.group.g7a),
          students: [
            {
              __typename: 'StudentProfile',
              user: {
                __typename: 'User',
                id: users.kostya.id,
                firstName: users.kostya.firstName,
                lastName: users.kostya.lastName,
              },
            },
          ],
        },
      } satisfies AddStudentsToGroupMutation;
    case 'RemoveStudentFromGroup':
      return {
        removeStudentFromGroup: {
          __typename: 'Group',
          id: String(variables.groupId ?? IDS.group.g7a),
          students: [],
        },
      } satisfies RemoveStudentFromGroupMutation;
    case 'AssignTeacher':
      return {
        assignTeacher: {
          __typename: 'GroupTeacher',
          id: nextId('gt'),
          subject: String(variables.subject ?? 'Математика'),
          teacher: {
            __typename: 'TeacherProfile',
            user: {
              __typename: 'User',
              id: users.maria.id,
              firstName: users.maria.firstName,
              lastName: users.maria.lastName,
            },
          },
        },
      } satisfies AssignTeacherMutation;

    // uploads / CMF egress (no-op — nothing leaves the device)
    case 'RequestUpload':
      return {
        requestUpload: {
          __typename: 'UploadTicket',
          uploadUrl: 'about:blank',
          fileKey: nextId('file'),
          expiresAt: iso(),
        },
      } satisfies RequestUploadMutation;
    case 'ReportAttention':
      return { reportAttention: true };

    default:
      if (import.meta.env.DEV)
        console.warn(`[demo] unmapped operation: ${operationName ?? '(anonymous)'}`);
      return null;
  }
}
