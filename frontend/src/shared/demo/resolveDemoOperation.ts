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
  SessionAttendeesQuery,
  SessionAttentionQuery,
  SessionRoomQuery,
  SetAvatarMutation,
  StartSessionMutation,
  SubmitHomeworkMutation,
  SubmitVerificationDocumentMutation,
  UpdateBrandingMutation,
  UpdateCourseMutation,
  UpdateInstitutionMutation,
  UpdateMembershipMutation,
} from '@/entities/graphql/generated';

import { cohort, IDS, makeChild, nextId, store, times, users } from './demoData';
import { demoGraphQLRole } from './demoRole';

type Vars = Record<string, unknown>;

// --- small shared builders ---------------------------------------------------------------
const iso = () => new Date().toISOString();

function owner(u: (typeof users)[keyof typeof users], specialty: string) {
  return { __typename: 'TeacherProfile' as const, specialty, user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName } };
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
      me: { ...base, id: users.sasha.id, email: users.sasha.email, firstName: users.sasha.firstName, lastName: users.sasha.lastName, role: 'STUDENT', studentProfile: { __typename: 'StudentProfile', ageBand: 'TEEN', gradeLevel: '7 класс', points: 1240 } },
    };
  }
  if (role === 'PARENT') {
    return {
      __typename: 'Query',
      me: { ...base, id: users.olga.id, email: users.olga.email, firstName: users.olga.firstName, lastName: users.olga.lastName, role: 'PARENT', parentProfile: { __typename: 'ParentProfile', children: store.children } },
    };
  }
  if (role === 'ADMIN') {
    return {
      __typename: 'Query',
      me: { ...base, id: users.galina.id, email: users.galina.email, firstName: users.galina.firstName, lastName: users.galina.lastName, role: 'ADMIN' },
    };
  }
  return {
    __typename: 'Query',
    me: { ...base, id: users.maria.id, email: users.maria.email, firstName: users.maria.firstName, lastName: users.maria.lastName, role: 'TEACHER', teacherProfile: { __typename: 'TeacherProfile', verificationStatus: 'APPROVED', specialty: 'Математика' } },
  };
}

// --- Courses -----------------------------------------------------------------------------
function catalog(): CatalogQuery {
  return {
    __typename: 'Query',
    catalog: {
      __typename: 'CourseConnection',
      totalCount: 142,
      pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: null },
      nodes: [
        { __typename: 'Course', id: IDS.course.algebra, title: 'Алгебра: от уравнений к функциям', description: 'Системный курс на учебный год: линейные уравнения, системы, функции и графики.', subject: 'Математика', level: 'GRADE_7', status: 'PUBLISHED', lessonCount: 36, enrollmentCount: 18, owner: owner(users.maria, 'Математика') },
        { __typename: 'Course', id: IDS.course.english, title: 'Английский: разговорная практика', description: 'Группы до 5 человек, живой разбор ошибок.', subject: 'Языки', level: 'GRADE_7', status: 'PUBLISHED', lessonCount: 24, enrollmentCount: 12, owner: owner(users.ilya, 'Английский язык') },
        { __typename: 'Course', id: IDS.course.physics, title: 'Физика: решаем вторую часть', description: 'Интенсив по задачам с развёрнутым ответом (ОГЭ).', subject: 'Физика', level: 'GRADE_9', status: 'PUBLISHED', lessonCount: 16, enrollmentCount: 5, owner: owner(users.dmitry, 'Физика') },
      ],
    },
  };
}

function myCourses(): MyCoursesQuery {
  return {
    __typename: 'Query',
    myCourses: [
      { __typename: 'Course', id: IDS.course.algebra, title: 'Алгебра: от уравнений к функциям', subject: 'Математика', level: 'GRADE_7', status: 'PUBLISHED', lessonCount: 36, enrollmentCount: 18 },
      { __typename: 'Course', id: IDS.course.geometry, title: 'Геометрия: планиметрия с нуля', subject: 'Математика', level: 'GRADE_7', status: 'DRAFT', lessonCount: 4, enrollmentCount: 0 },
    ],
  };
}

function courseDetail(vars: Vars): CourseDetailQuery {
  const id = typeof vars.id === 'string' ? vars.id : IDS.course.algebra;
  const enrolled = store.enrolled.has(id);
  const material = (mid: string, type: 'FILE' | 'LINK' | 'TEXT', title: string, order: number) =>
    ({ __typename: 'Material' as const, id: mid, type, title, url: type === 'LINK' ? 'https://example.ru/тренажёр' : null, body: type === 'TEXT' ? 'Краткий конспект урока.' : null, fileUrl: type === 'FILE' ? 'https://example.ru/конспект.pdf' : null, order });
  return {
    __typename: 'Query',
    course: {
      __typename: 'Course',
      id,
      title: 'Алгебра: от уравнений к функциям',
      description: 'Системный курс на учебный год: линейные уравнения, системы, функции и графики.',
      subject: 'Математика',
      level: 'GRADE_7',
      status: 'PUBLISHED',
      lessonCount: 36,
      enrollmentCount: 18,
      owner: owner(users.maria, 'Математика'),
      sections: [
        {
          __typename: 'Section', id: 'sec-01', title: 'Линейные уравнения', description: '4 занятия · 4 домашних', order: 1,
          lessons: [
            { __typename: 'Lesson', id: 'les-1-1', title: 'Что такое уравнение', durationMin: 45, status: 'PUBLISHED', order: 1, materials: [material('mat-1', 'FILE', 'Конспект.pdf', 1), material('mat-2', 'LINK', 'Тренажёр', 2)] },
            { __typename: 'Lesson', id: 'les-1-2', title: 'Перенос слагаемых', durationMin: 45, status: 'PUBLISHED', order: 2, materials: [material('mat-3', 'TEXT', 'Памятка', 1)] },
          ],
        },
        {
          __typename: 'Section', id: 'sec-02', title: 'Системы уравнений', description: '6 занятий · 5 домашних', order: 2,
          lessons: [
            { __typename: 'Lesson', id: 'les-2-1', title: 'Метод подстановки', durationMin: 45, status: 'PUBLISHED', order: 1, materials: [] },
          ],
        },
        {
          __typename: 'Section', id: 'sec-03', title: 'Функции и графики', description: '8 занятий · 6 домашних', order: 3,
          lessons: [
            { __typename: 'Lesson', id: 'les-3-1', title: 'Что такое функция', durationMin: 45, status: 'PUBLISHED', order: 1, materials: [] },
          ],
        },
      ],
      viewerEnrollment: enrolled ? { __typename: 'Enrollment', id: 'enr-1', status: 'ACTIVE', progressPct: 33 } : null,
    },
  };
}

// --- Schedule ----------------------------------------------------------------------------
function mySchedule(): MyScheduleQuery {
  return {
    __typename: 'Query',
    mySchedule: [
      { __typename: 'LessonSession', id: IDS.session.live, startAt: times.todayLive, endAt: times.todayLiveEnd, status: 'LIVE', lesson: { __typename: 'Lesson', id: 'les-1-1', title: 'Алгебра — линейные уравнения' } },
      { __typename: 'LessonSession', id: IDS.session.english, startAt: times.todayEnglish, endAt: null, status: 'SCHEDULED', lesson: { __typename: 'Lesson', id: 'les-en-1', title: 'Английский — Present Perfect' } },
      { __typename: 'LessonSession', id: IDS.session.physics, startAt: times.tomorrowPhysics, endAt: null, status: 'SCHEDULED', lesson: { __typename: 'Lesson', id: 'les-ph-1', title: 'Физика — разбор задач' } },
      { __typename: 'LessonSession', id: IDS.session.past, startAt: times.yesterdayPast, endAt: null, status: 'ENDED', lesson: { __typename: 'Lesson', id: 'les-1-0', title: 'Алгебра — повторение' } },
      { __typename: 'LessonSession', id: IDS.session.canceled, startAt: times.yesterdayCanceled, endAt: null, status: 'CANCELED', lesson: { __typename: 'Lesson', id: 'les-en-0', title: 'Английский — чтение' } },
    ],
  };
}

// --- Homework ----------------------------------------------------------------------------
function mySubmissions(): MySubmissionsQuery {
  return {
    __typename: 'Query',
    mySubmissions: [
      { __typename: 'Submission', id: 'sub-present', status: 'SUBMITTED', score: null, comment: null, attempt: 1, submittedAt: times.yesterdayPast, homework: { __typename: 'Homework', id: IDS.homework.present, title: 'Present Perfect — письмо другу' } },
      { __typename: 'Submission', id: 'sub-motion', status: 'GRADED', score: 5, comment: 'Отлично, все шаги решения на месте.', attempt: 1, submittedAt: times.yesterdayCanceled, homework: { __typename: 'Homework', id: IDS.homework.motion, title: 'Задачи на движение' } },
      { __typename: 'Submission', id: 'sub-essay', status: 'LATE', score: null, comment: null, attempt: 1, submittedAt: times.yesterdayPast, homework: { __typename: 'Homework', id: IDS.homework.essay, title: 'Сочинение «Моё лето»' } },
    ],
  };
}

function lessonHomework(): LessonHomeworkQuery {
  return {
    __typename: 'Query',
    lessonHomework: [
      { __typename: 'Homework', id: IDS.homework.linear, title: 'Линейные уравнения — задачи 12–18', description: 'Реши задачи 12–18 из учебника (стр. 84). Ход решения обязателен.', type: 'FILE', dueAt: times.todayEnglish, allowRedo: false, publishedAt: times.yesterdayPast, submissionStats: { __typename: 'SubmissionStats', total: 7, submitted: 5, graded: 2, late: 1 }, viewerSubmission: null },
    ],
  };
}

function homeworkSubmissions(): HomeworkSubmissionsQuery {
  const row = (id: string, u: (typeof users)[keyof typeof users], status: 'SUBMITTED' | 'LATE' | 'GRADED', text: string, score: number | null) =>
    ({ __typename: 'Submission' as const, id, attempt: 1, status, score, comment: null, contentText: text, submittedAt: times.yesterdayPast, student: { __typename: 'StudentProfile' as const, user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName } } });
  return {
    __typename: 'Query',
    homeworkSubmissions: [
      row('grd-timur', users.timur, 'LATE', 'Задачи 12–15 решил через перенос слагаемых, 16–18 — через умножение.', null),
      row('grd-vera', users.vera, 'SUBMITTED', 'Приложила ход решения по всем номерам.', null),
      row('grd-sasha', users.sasha, 'SUBMITTED', 'Решение во вложении.', null),
    ],
  };
}

// --- Admin -------------------------------------------------------------------------------
function adminInstitution(): AdminInstitutionQuery {
  return {
    __typename: 'Query',
    me: {
      __typename: 'User', id: users.galina.id,
      adminProfile: {
        __typename: 'AdminProfile',
        institution: { __typename: 'Institution', id: IDS.institution, name: 'Гимназия №1', address: 'г. Москва, ул. Школьная, 1', website: 'https://gymnasium1.ru', subdomain: 'gymnasium1', status: 'ACTIVE', defaultLocale: 'ru', branding: { primaryColor: '#FF5A5F' }, logoUrl: null },
      },
    },
  };
}

function institutionMembers(): InstitutionMembersQuery {
  const m = (id: string, u: (typeof users)[keyof typeof users], role: 'STUDENT' | 'TEACHER' | 'ADMIN', status: 'ACTIVE' | 'PENDING' | 'INACTIVE') =>
    ({ __typename: 'InstitutionMembership' as const, id, role, status, joinedAt: status === 'PENDING' ? null : times.yesterdayPast, user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email } });
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
  const stud = (u: (typeof users)[keyof typeof users]) => ({ __typename: 'StudentProfile' as const, user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName } });
  const gt = (id: string, u: (typeof users)[keyof typeof users], subject: string) => ({ __typename: 'GroupTeacher' as const, id, subject, teacher: { __typename: 'TeacherProfile' as const, user: { __typename: 'User' as const, id: u.id, firstName: u.firstName, lastName: u.lastName } } });
  return {
    __typename: 'Query',
    groups: [
      { __typename: 'Group', id: IDS.group.g7a, name: '7А', level: '7 класс', students: [stud(users.sasha), stud(users.vera), stud(users.kostya)], teachers: [gt('gt-1', users.maria, 'Математика'), gt('gt-2', users.ilya, 'Английский язык')] },
      { __typename: 'Group', id: IDS.group.g7b, name: '7Б', level: '7 класс', students: [stud(users.liza), stud(users.mark)], teachers: [gt('gt-3', users.ilya, 'Английский язык')] },
      { __typename: 'Group', id: IDS.group.g8a, name: '8А', level: '8 класс', students: [stud(users.anya), stud(users.dima)], teachers: [gt('gt-4', users.dmitry, 'Физика')] },
    ],
  };
}

// --- Live room ---------------------------------------------------------------------------
function sessionRoom(vars: Vars): SessionRoomQuery {
  const id = typeof vars.id === 'string' ? vars.id : IDS.session.live;
  return {
    __typename: 'Query',
    session: { __typename: 'LessonSession', id, status: 'LIVE', roomToken: 'demo-room-token', teacherName: 'Мария Петровна', lesson: { __typename: 'Lesson', id: 'les-1-1', title: 'Алгебра — линейные уравнения' } },
  };
}

function sessionAttendees(vars: Vars): SessionAttendeesQuery {
  const id = typeof vars.id === 'string' ? vars.id : IDS.session.live;
  return {
    __typename: 'Query',
    session: {
      __typename: 'LessonSession', id,
      attendance: cohort.map((c) => ({ __typename: 'Attendance' as const, student: { __typename: 'StudentProfile' as const, user: { __typename: 'User' as const, id: c.user.id, firstName: c.user.firstName, lastName: c.user.lastName } } })),
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
      __typename: 'AttentionMetric', id: nextId('metric'), sessionId, studentId: c.user.id, bucketStart: iso(),
      avgAttention: v, gazeOnScreen: v, eyeOpenness: Math.min(100, v + 8), headYaw: 2, headPitch: -1, alertness: Math.max(0, v - 5),
    },
  };
}

// --- Mutations (success + optimistic store updates for the visible flows) ----------------
function authPayload(): LoginMutation['login'] {
  const u = users.maria;
  return { __typename: 'AuthPayload', token: 'demo-token', refreshToken: 'demo-refresh', user: { __typename: 'User', id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: 'TEACHER', locale: 'ru', studentProfile: null, teacherProfile: { __typename: 'TeacherProfile', verificationStatus: 'APPROVED' } } };
}

function input(vars: Vars): Vars {
  return (vars.input as Vars) ?? {};
}

// --- dispatch ----------------------------------------------------------------------------
/** Resolve one operation to its synthetic data payload (or null for unmapped ops). */
export function resolveDemoOperation(operationName: string | undefined, variables: Vars): Record<string, unknown> | null {
  switch (operationName) {
    // queries
    case 'Me': return me();
    case 'Catalog': return catalog();
    case 'MyCourses': return myCourses();
    case 'CourseDetail': return courseDetail(variables);
    case 'MySchedule': return mySchedule();
    case 'MySubmissions': return mySubmissions();
    case 'LessonHomework': return lessonHomework();
    case 'HomeworkSubmissions': return homeworkSubmissions();
    case 'AdminInstitution': return adminInstitution();
    case 'InstitutionMembers': return institutionMembers();
    case 'InstitutionGroups': return institutionGroups();
    case 'SessionRoom': return sessionRoom(variables);
    case 'SessionAttendees': return sessionAttendees(variables);
    case 'SessionAttention': return sessionAttention();

    // auth (screens skipped in preview — resolve gracefully)
    case 'Login': return { login: authPayload() } satisfies LoginMutation;
    case 'RegisterUser': return { registerUser: authPayload() } satisfies RegisterUserMutation;
    case 'RefreshToken': return { refreshToken: authPayload() } satisfies RefreshTokenMutation;
    case 'RequestPasswordReset': return { requestPasswordReset: true } satisfies RequestPasswordResetMutation;
    case 'ResetPassword': return { resetPassword: true } satisfies ResetPasswordMutation;

    // profile / parent
    case 'AddChild': {
      const inp = input(variables);
      const child = makeChild(String(inp.firstName ?? 'Новый'), String(inp.lastName ?? ''), (inp.gradeLevel as string | null) ?? null);
      store.children = [...store.children, child];
      return {
        addChild: { __typename: 'Guardianship', id: nextId('grd'), status: 'ACTIVE', consent152fz: Boolean(inp.consent152fz), consentAt: iso(), child: { __typename: 'User', id: child.user.id, firstName: child.user.firstName, lastName: child.user.lastName } },
      } satisfies AddChildMutation;
    }
    case 'SubmitVerificationDocument': return { submitVerificationDocument: { __typename: 'VerificationDocument', id: nextId('doc'), status: 'PENDING', fileUrl: 'https://example.ru/diploma.pdf', createdAt: iso() } } satisfies SubmitVerificationDocumentMutation;
    case 'SetAvatar': return { setAvatar: { __typename: 'User', id: users.maria.id, avatarUrl: null } } satisfies SetAvatarMutation;

    // courses (teacher authoring + student enroll)
    case 'CreateCourse': return { createCourse: { __typename: 'Course', id: nextId('course'), status: 'DRAFT' } } satisfies CreateCourseMutation;
    case 'UpdateCourse': return { updateCourse: { __typename: 'Course', id: String(variables.id ?? IDS.course.algebra), title: String(input(variables).title ?? 'Курс') } } satisfies UpdateCourseMutation;
    case 'PublishCourse': return { publishCourse: { __typename: 'Course', id: String(variables.id ?? IDS.course.algebra), status: 'PUBLISHED' } } satisfies PublishCourseMutation;
    case 'CreateSection': return { createSection: { __typename: 'Section', id: nextId('sec'), title: String(input(variables).title ?? 'Новый раздел'), order: 99 } } satisfies CreateSectionMutation;
    case 'CreateLesson': return { createLesson: { __typename: 'Lesson', id: nextId('les'), title: String(input(variables).title ?? 'Новый урок'), status: 'DRAFT' } } satisfies CreateLessonMutation;
    case 'PublishLesson': return { publishLesson: { __typename: 'Lesson', id: String(variables.id ?? 'les-1-1'), status: 'PUBLISHED' } } satisfies PublishLessonMutation;
    case 'DeleteSection': return { deleteSection: true } satisfies DeleteSectionMutation;
    case 'DeleteLesson': return { deleteLesson: true } satisfies DeleteLessonMutation;
    case 'DeleteMaterial': return { deleteMaterial: true } satisfies DeleteMaterialMutation;
    case 'ReorderSections': return { reorderSections: (Array.isArray(variables.orderedIds) ? variables.orderedIds : []).map((id, i) => ({ __typename: 'Section' as const, id: String(id), order: i + 1 })) } satisfies ReorderSectionsMutation;
    case 'ReorderLessons': return { reorderLessons: (Array.isArray(variables.orderedIds) ? variables.orderedIds : []).map((id, i) => ({ __typename: 'Lesson' as const, id: String(id), order: i + 1 })) } satisfies ReorderLessonsMutation;
    case 'AddMaterial': return { addMaterial: { __typename: 'Material', id: nextId('mat'), type: (input(variables).type as 'FILE' | 'LINK' | 'TEXT') ?? 'LINK', title: String(input(variables).title ?? 'Материал') } } satisfies AddMaterialMutation;
    case 'Enroll': {
      const courseId = String(variables.courseId ?? IDS.course.algebra);
      store.enrolled.add(courseId);
      return { enroll: { __typename: 'Enrollment', id: nextId('enr'), status: 'ACTIVE', progressPct: 0 } } satisfies EnrollMutation;
    }
    case 'Unenroll': {
      store.enrolled.delete(String(variables.courseId ?? IDS.course.algebra));
      return { unenroll: true };
    }

    // homework
    case 'CreateHomework': return { createHomework: { __typename: 'Homework', id: nextId('hw'), title: String(input(variables).title ?? 'Домашнее задание'), publishedAt: null } } satisfies CreateHomeworkMutation;
    case 'PublishHomework': return { publishHomework: { __typename: 'Homework', id: String(variables.id ?? IDS.homework.linear), publishedAt: iso() } } satisfies PublishHomeworkMutation;
    case 'DeleteHomework': return { deleteHomework: true } satisfies DeleteHomeworkMutation;
    case 'SubmitHomework': return { submitHomework: { __typename: 'Submission', id: nextId('sub'), status: 'SUBMITTED', attempt: 1 } } satisfies SubmitHomeworkMutation;
    case 'GradeSubmission': return { gradeSubmission: { __typename: 'Submission', id: String(input(variables).submissionId ?? 'grd-timur'), status: 'GRADED', score: Number(input(variables).score ?? 5), comment: (input(variables).comment as string | null) ?? null } } satisfies GradeSubmissionMutation;

    // scheduling
    case 'ScheduleSession': return { scheduleSession: { __typename: 'LessonSession', id: nextId('ses'), startAt: iso(), status: 'SCHEDULED' } } satisfies ScheduleSessionMutation;
    case 'StartSession': return { startSession: { __typename: 'LessonSession', id: String(variables.sessionId ?? IDS.session.live), status: 'LIVE' } } satisfies StartSessionMutation;
    case 'EndSession': return { endSession: { __typename: 'LessonSession', id: String(variables.sessionId ?? IDS.session.live), status: 'ENDED' } } satisfies EndSessionMutation;
    case 'JoinSession': return { joinSession: { __typename: 'SessionJoin', roomToken: 'demo-room-token', session: { __typename: 'LessonSession', id: String(variables.sessionId ?? IDS.session.live), status: 'LIVE' } } } satisfies JoinSessionMutation;

    // admin
    case 'UpdateInstitution': return { updateInstitution: { __typename: 'Institution', id: IDS.institution, name: String(input(variables).name ?? 'Гимназия №1'), address: (input(variables).address as string | null) ?? null, website: (input(variables).website as string | null) ?? null } } satisfies UpdateInstitutionMutation;
    case 'UpdateBranding': return { updateBranding: { __typename: 'Institution', id: IDS.institution, branding: (variables.branding as Record<string, unknown>) ?? null } } satisfies UpdateBrandingMutation;
    case 'InviteMember': return { inviteMember: { __typename: 'InstitutionMembership', id: nextId('mem'), role: (input(variables).role as 'STUDENT' | 'TEACHER' | 'ADMIN') ?? 'STUDENT', status: 'PENDING', user: { __typename: 'User', id: nextId('u'), firstName: 'Приглашён', lastName: '', email: String(input(variables).email ?? 'new@example.ru') } } } satisfies InviteMemberMutation;
    case 'UpdateMembership': return { updateMembership: { __typename: 'InstitutionMembership', id: String(variables.id ?? 'mem-annaR'), role: (variables.role as 'STUDENT' | 'TEACHER' | 'ADMIN') ?? 'STUDENT', status: (variables.status as 'ACTIVE' | 'PENDING' | 'INACTIVE') ?? 'ACTIVE' } } satisfies UpdateMembershipMutation;
    case 'RemoveMember': return { removeMember: true } satisfies RemoveMemberMutation;
    case 'CreateGroup': return { createGroup: { __typename: 'Group', id: nextId('grp'), name: String(input(variables).name ?? 'Новая группа'), level: (input(variables).level as string | null) ?? null } } satisfies CreateGroupMutation;
    case 'AddStudentsToGroup': return { addStudentsToGroup: { __typename: 'Group', id: String(variables.groupId ?? IDS.group.g7a), students: [{ __typename: 'StudentProfile', user: { __typename: 'User', id: users.kostya.id, firstName: users.kostya.firstName, lastName: users.kostya.lastName } }] } } satisfies AddStudentsToGroupMutation;
    case 'RemoveStudentFromGroup': return { removeStudentFromGroup: { __typename: 'Group', id: String(variables.groupId ?? IDS.group.g7a), students: [] } } satisfies RemoveStudentFromGroupMutation;
    case 'AssignTeacher': return { assignTeacher: { __typename: 'GroupTeacher', id: nextId('gt'), subject: String(variables.subject ?? 'Математика'), teacher: { __typename: 'TeacherProfile', user: { __typename: 'User', id: users.maria.id, firstName: users.maria.firstName, lastName: users.maria.lastName } } } } satisfies AssignTeacherMutation;

    // uploads / CMF egress (no-op — nothing leaves the device)
    case 'RequestUpload': return { requestUpload: { __typename: 'UploadTicket', uploadUrl: 'about:blank', fileKey: nextId('file'), expiresAt: iso() } } satisfies RequestUploadMutation;
    case 'ReportAttention': return { reportAttention: true };

    default:
      if (import.meta.env.DEV) console.warn(`[demo] unmapped operation: ${operationName ?? '(anonymous)'}`);
      return null;
  }
}
