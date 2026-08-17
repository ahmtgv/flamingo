import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  DateTime: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type AccessLogRow = {
  __typename?: 'AccessLogRow';
  action: Scalars['String']['output'];
  actorName: Scalars['String']['output'];
  at: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  objectLabel: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  subjectName: Scalars['String']['output'];
};

export type AccountStateRow = {
  __typename?: 'AccountStateRow';
  actorName: Scalars['String']['output'];
  at: Scalars['DateTime']['output'];
  reason: Scalars['String']['output'];
  state: AccountStateValue;
};

export type AccountStateValue =
  | 'ACTIVE'
  | 'BLOCKED'
  | 'LIMITED';

export type Achievement = {
  __typename?: 'Achievement';
  earnedAt: Scalars['DateTime']['output'];
  key: AchievementKey;
};

export type AchievementKey =
  | 'FIFTY_WORDS'
  | 'FIRST_MASTERED'
  | 'FIRST_WORD'
  | 'HUNDRED_REVIEWS'
  | 'STREAK_3'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'TEN_MASTERED'
  | 'TEN_WORDS';

export type AddChildInput = {
  birthDate?: InputMaybe<Scalars['DateTime']['input']>;
  childEmail?: InputMaybe<Scalars['String']['input']>;
  consent152fz: Scalars['Boolean']['input'];
  firstName: Scalars['String']['input'];
  gradeLevel?: InputMaybe<Scalars['String']['input']>;
  lastName: Scalars['String']['input'];
};

export type AdminDashboard = {
  __typename?: 'AdminDashboard';
  activeUsers: Scalars['Int']['output'];
  attendancePct: Scalars['Int']['output'];
  averageAttention: Scalars['Int']['output'];
  averageGrade?: Maybe<Scalars['Float']['output']>;
  problemGroups: Array<GroupStat>;
};

export type AdminProfile = {
  __typename?: 'AdminProfile';
  institution?: Maybe<Institution>;
  user: User;
};

export type AgeBand =
  | 'ADULT'
  | 'JUNIOR'
  | 'TEEN';

export type Attempt = {
  __typename?: 'Attempt';
  context: AttemptContext;
  createdAt: Scalars['DateTime']['output'];
  exerciseId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isCorrect?: Maybe<Scalars['Boolean']['output']>;
  score: Scalars['Int']['output'];
};

export type AttemptContext =
  | 'HOMEWORK'
  | 'LIVE'
  | 'PRACTICE';

export type Attendance = {
  __typename?: 'Attendance';
  id: Scalars['ID']['output'];
  joinedAt?: Maybe<Scalars['DateTime']['output']>;
  session: LessonSession;
  status: AttendanceStatus;
  student: StudentProfile;
};

export type AttendanceStatus =
  | 'ABSENT'
  | 'LATE'
  | 'PRESENT';

export type AttentionAnalytics = {
  __typename?: 'AttentionAnalytics';
  averageAttention: Scalars['Int']['output'];
  bySubject: Array<SubjectAttention>;
  byWeekday: Array<DailyAttention>;
  insights: Array<Insight>;
};

export type AttentionInput = {
  alertness?: InputMaybe<Scalars['Int']['input']>;
  avgAttention: Scalars['Int']['input'];
  bucketStart: Scalars['DateTime']['input'];
  eyeOpenness?: InputMaybe<Scalars['Int']['input']>;
  gazeOnScreen?: InputMaybe<Scalars['Int']['input']>;
  headPitch?: InputMaybe<Scalars['Int']['input']>;
  headYaw?: InputMaybe<Scalars['Int']['input']>;
  sessionId: Scalars['ID']['input'];
};

export type AttentionMetric = {
  __typename?: 'AttentionMetric';
  alertness?: Maybe<Scalars['Int']['output']>;
  avgAttention: Scalars['Int']['output'];
  bucketStart: Scalars['DateTime']['output'];
  eyeOpenness?: Maybe<Scalars['Int']['output']>;
  gazeOnScreen?: Maybe<Scalars['Int']['output']>;
  headPitch?: Maybe<Scalars['Int']['output']>;
  headYaw?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  sessionId: Scalars['ID']['output'];
  studentId: Scalars['ID']['output'];
};

export type AttentionPoint = {
  __typename?: 'AttentionPoint';
  at: Scalars['DateTime']['output'];
  value: Scalars['Int']['output'];
};

export type AttentionSummary = {
  __typename?: 'AttentionSummary';
  averageAttention: Scalars['Int']['output'];
  low: Scalars['Int']['output'];
  peak: Scalars['Int']['output'];
  points: Array<AttentionPoint>;
};

export type Attribution = {
  __typename?: 'Attribution';
  attribution: Scalars['String']['output'];
  license: Scalars['String']['output'];
  source: LexicalSource;
  sourceUrl?: Maybe<Scalars['String']['output']>;
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user: User;
};

export type BackupKind =
  | 'CLOUD_FOLDER'
  | 'EXTERNAL_DISK'
  | 'NONE';

export type Board = {
  __typename?: 'Board';
  canWrite: Scalars['Boolean']['output'];
  elements: Array<BoardElement>;
  isTeacher: Scalars['Boolean']['output'];
  lessonId: Scalars['ID']['output'];
  openForStudents: Scalars['Boolean']['output'];
};

export type BoardChange = {
  __typename?: 'BoardChange';
  element?: Maybe<BoardElement>;
  elementId?: Maybe<Scalars['ID']['output']>;
  kind: Scalars['String']['output'];
  lessonId: Scalars['ID']['output'];
  openForStudents?: Maybe<Scalars['Boolean']['output']>;
};

export type BoardElement = {
  __typename?: 'BoardElement';
  authorId: Scalars['ID']['output'];
  authorName: Scalars['String']['output'];
  data: Scalars['JSON']['output'];
  height: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  kind: BoardElementKind;
  revision: Scalars['Int']['output'];
  width: Scalars['Float']['output'];
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type BoardElementInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
  height?: InputMaybe<Scalars['Float']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  kind: BoardElementKind;
  width?: InputMaybe<Scalars['Float']['input']>;
  x?: InputMaybe<Scalars['Float']['input']>;
  y?: InputMaybe<Scalars['Float']['input']>;
};

export type BoardElementKind =
  | 'IMAGE'
  | 'LINK'
  | 'PEN'
  | 'SHAPE'
  | 'STICKER'
  | 'TEXT';

export type BoardSnapshot = {
  __typename?: 'BoardSnapshot';
  elements: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  lessonId: Scalars['ID']['output'];
  lessonTitle: Scalars['String']['output'];
  savedAt: Scalars['DateTime']['output'];
  savedByName: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type CabinetBackup = {
  __typename?: 'CabinetBackup';
  createdAt: Scalars['DateTime']['output'];
  fileName: Scalars['String']['output'];
  files: Scalars['Int']['output'];
  rows: Scalars['Int']['output'];
  sealed: Scalars['Boolean']['output'];
  tables: Scalars['Int']['output'];
};

export type CardDirection =
  | 'RECALL'
  | 'RECOGNITION';

export type CardState =
  | 'LEARNING'
  | 'NEW'
  | 'RELEARNING'
  | 'REVIEW';

export type Certificate = {
  __typename?: 'Certificate';
  course: Course;
  id: Scalars['ID']['output'];
  issuedAt: Scalars['DateTime']['output'];
  pdfUrl: Scalars['String']['output'];
  student: StudentProfile;
  verificationId: Scalars['ID']['output'];
};

export type CertificateVerification = {
  __typename?: 'CertificateVerification';
  courseTitle?: Maybe<Scalars['String']['output']>;
  institutionName?: Maybe<Scalars['String']['output']>;
  issuedAt?: Maybe<Scalars['DateTime']['output']>;
  studentName?: Maybe<Scalars['String']['output']>;
  valid: Scalars['Boolean']['output'];
};

export type ChannelKind =
  | 'PEER'
  | 'PUPIL_TEACHER'
  | 'STAFF_ROOM'
  | 'SUBJECT_GROUP';

export type ChannelMessage = {
  __typename?: 'ChannelMessage';
  channelId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  mine: Scalars['Boolean']['output'];
  senderId: Scalars['ID']['output'];
  senderName: Scalars['String']['output'];
  sentAt: Scalars['DateTime']['output'];
  text: Scalars['String']['output'];
};

export type ChatChannel = {
  __typename?: 'ChatChannel';
  courseId?: Maybe<Scalars['ID']['output']>;
  courseTitle?: Maybe<Scalars['String']['output']>;
  groupName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  institutionName?: Maybe<Scalars['String']['output']>;
  kind: ChannelKind;
  lastMessageAt?: Maybe<Scalars['DateTime']['output']>;
  lastMessageText?: Maybe<Scalars['String']['output']>;
  openReports: Scalars['Int']['output'];
  participants: Array<ChatParticipant>;
  readOnly: Scalars['Boolean']['output'];
  unread: Scalars['Int']['output'];
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  id: Scalars['ID']['output'];
  senderId: Scalars['ID']['output'];
  senderName: Scalars['String']['output'];
  sentAt: Scalars['DateTime']['output'];
  sessionId: Scalars['ID']['output'];
  text: Scalars['String']['output'];
};

export type ChatParticipant = {
  __typename?: 'ChatParticipant';
  displayName: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
  role: Scalars['String']['output'];
  shortName: Scalars['String']['output'];
};

export type ChatPolicyView = {
  __typename?: 'ChatPolicyView';
  directMessages: Scalars['Boolean']['output'];
  peerChat: Scalars['Boolean']['output'];
  premoderation: Scalars['Boolean']['output'];
  teacherVisibleAlways: Scalars['Boolean']['output'];
};

export type ChatReport = {
  __typename?: 'ChatReport';
  channelId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  reporterName: Scalars['String']['output'];
  status: ReportStatus;
};

export type ConnectionType =
  | 'DIRECT'
  | 'RELAY'
  | 'UNKNOWN';

export type Course = {
  __typename?: 'Course';
  coverUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  enrollmentCount: Scalars['Int']['output'];
  format: CourseFormat;
  id: Scalars['ID']['output'];
  institution?: Maybe<Institution>;
  language: Scalars['String']['output'];
  lessonCount: Scalars['Int']['output'];
  level: CourseLevel;
  owner: TeacherProfile;
  rating?: Maybe<Scalars['Float']['output']>;
  sections: Array<Section>;
  status: CourseStatus;
  subject: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  viewerEnrollment?: Maybe<Enrollment>;
};

export type CourseConnection = {
  __typename?: 'CourseConnection';
  nodes: Array<Course>;
  pageInfo: PageInfo;
  subjectCount: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
};

export type CourseFilter = {
  format?: InputMaybe<CourseFormat>;
  language?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<CourseLevel>;
  search?: InputMaybe<Scalars['String']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
};

export type CourseFormat =
  | 'COURSE'
  | 'PROFESSIONAL'
  | 'PROGRAM';

export type CourseInput = {
  coverKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  format?: InputMaybe<CourseFormat>;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  institutionId?: InputMaybe<Scalars['ID']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  level: CourseLevel;
  subject: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CourseLevel =
  | 'ADULT'
  | 'COLLEGE'
  | 'GRADE_1'
  | 'GRADE_2'
  | 'GRADE_3'
  | 'GRADE_4'
  | 'GRADE_5'
  | 'GRADE_6'
  | 'GRADE_7'
  | 'GRADE_8'
  | 'GRADE_9'
  | 'GRADE_10'
  | 'GRADE_11'
  | 'PRESCHOOL'
  | 'UNIVERSITY';

export type CourseStatus =
  | 'ARCHIVED'
  | 'DRAFT'
  | 'PUBLISHED';

export type DailyAttention = {
  __typename?: 'DailyAttention';
  averageAttention: Scalars['Int']['output'];
  weekday: Scalars['Int']['output'];
};

export type Device = {
  __typename?: 'Device';
  appVersion: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastSeenAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  online: Scalars['Boolean']['output'];
  pairedAt: Scalars['DateTime']['output'];
  platform: DevicePlatform;
  setup: DeviceSetup;
  uplink?: Maybe<UplinkAssessment>;
};

export type DeviceClaim = {
  __typename?: 'DeviceClaim';
  device: Device;
  session: DeviceSession;
  token: Scalars['String']['output'];
};

export type DevicePlatform =
  | 'LINUX'
  | 'MACOS'
  | 'OTHER'
  | 'WINDOWS';

export type DeviceSession = {
  __typename?: 'DeviceSession';
  displayName: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type DeviceSetup = {
  __typename?: 'DeviceSetup';
  backupConfiguredAt?: Maybe<Scalars['DateTime']['output']>;
  backupDue: Scalars['Boolean']['output'];
  backupKind: BackupKind;
  cloudCopyEnabled: Scalars['Boolean']['output'];
  completed: Scalars['Boolean']['output'];
  lastBackupAt?: Maybe<Scalars['DateTime']['output']>;
  step: Scalars['Int']['output'];
};

export type DueCard = {
  __typename?: 'DueCard';
  difficulty: Scalars['Float']['output'];
  direction: CardDirection;
  dueAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  item: LexicalItem;
  lapses: Scalars['Int']['output'];
  lastReviewAt?: Maybe<Scalars['DateTime']['output']>;
  learningSteps: Scalars['Int']['output'];
  reps: Scalars['Int']['output'];
  stability: Scalars['Float']['output'];
  state: CardState;
};

export type Enrollment = {
  __typename?: 'Enrollment';
  course: Course;
  enrolledAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  progressPct: Scalars['Int']['output'];
  status: EnrollmentStatus;
  student: StudentProfile;
  viewedLessonIds: Array<Scalars['ID']['output']>;
};

export type EnrollmentStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'PENDING';

export type Exercise = {
  __typename?: 'Exercise';
  assetId?: Maybe<Scalars['ID']['output']>;
  cefrLevel?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: ExerciseKind;
  order: Scalars['Int']['output'];
  payload: Scalars['JSON']['output'];
  points: Scalars['Int']['output'];
  prompt: Scalars['JSON']['output'];
  skill: SkillArea;
  skillTags: Array<Scalars['String']['output']>;
};

export type ExerciseKind =
  | 'CHOICE'
  | 'CLOZE'
  | 'DICTATION'
  | 'LISTENING'
  | 'MATCH'
  | 'PRONUNCIATION'
  | 'ROLEPLAY'
  | 'SPEAKING'
  | 'TRANSFORM'
  | 'VOCAB_CARD'
  | 'WORD_ORDER'
  | 'WRITING';

export type ExerciseLiveRow = {
  __typename?: 'ExerciseLiveRow';
  answered: Scalars['Int']['output'];
  correct: Scalars['Int']['output'];
  exerciseId: Scalars['ID']['output'];
  groupSize: Scalars['Int']['output'];
  spread: Scalars['JSON']['output'];
};

export type ExerciseMode =
  | 'HOMEWORK'
  | 'LIVE'
  | 'PRACTICE';

export type ExerciseSet = {
  __typename?: 'ExerciseSet';
  exercises: Array<Exercise>;
  homeworkId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  lessonId: Scalars['ID']['output'];
  mode: ExerciseMode;
  title: Scalars['String']['output'];
};

export type ExternalDictionary = {
  __typename?: 'ExternalDictionary';
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type GradeInput = {
  allowRedo?: InputMaybe<Scalars['Boolean']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  score: Scalars['Int']['input'];
  submissionId: Scalars['ID']['input'];
};

export type GradingScale =
  | 'FIVE_POINT'
  | 'PERCENT';

export type Group = {
  __typename?: 'Group';
  id: Scalars['ID']['output'];
  institution: Institution;
  level?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  students: Array<StudentProfile>;
  teachers: Array<GroupTeacher>;
};

export type GroupAnalytics = {
  __typename?: 'GroupAnalytics';
  attendancePct: Scalars['Int']['output'];
  attentionBySession: Array<AttentionPoint>;
  averageAttention: Scalars['Int']['output'];
  averageGrade?: Maybe<Scalars['Float']['output']>;
  group: Group;
  insights: Array<Insight>;
  students: Array<StudentStat>;
};

export type GroupInput = {
  institutionId: Scalars['ID']['input'];
  level?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type GroupStat = {
  __typename?: 'GroupStat';
  attendancePct: Scalars['Int']['output'];
  averageAttention: Scalars['Int']['output'];
  averageGrade?: Maybe<Scalars['Float']['output']>;
  group: Group;
};

export type GroupTeacher = {
  __typename?: 'GroupTeacher';
  id: Scalars['ID']['output'];
  subject: Scalars['String']['output'];
  teacher: TeacherProfile;
};

export type Guardianship = {
  __typename?: 'Guardianship';
  child: User;
  consent152fz: Scalars['Boolean']['output'];
  consentAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  parent: User;
  status: GuardianshipStatus;
};

export type GuardianshipStatus =
  | 'ACTIVE'
  | 'PENDING';

export type Homework = {
  __typename?: 'Homework';
  allowRedo: Scalars['Boolean']['output'];
  course?: Maybe<Course>;
  createdBy: User;
  description?: Maybe<Scalars['String']['output']>;
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  lesson?: Maybe<Lesson>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  submissionStats: SubmissionStats;
  submissions: Array<Submission>;
  title: Scalars['String']['output'];
  type: HomeworkType;
  viewerSubmission?: Maybe<Submission>;
};

export type HomeworkHandIn = {
  __typename?: 'HomeworkHandIn';
  autoChecked: Scalars['Int']['output'];
  awaitingTeacher: Scalars['Int']['output'];
  score?: Maybe<Scalars['Int']['output']>;
  submissionId: Scalars['ID']['output'];
};

export type HomeworkInput = {
  allowRedo?: InputMaybe<Scalars['Boolean']['input']>;
  courseId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  lessonId?: InputMaybe<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
  type: HomeworkType;
};

export type HomeworkType =
  | 'FILE'
  | 'QUIZ'
  | 'TEXT';

export type HostPresence = {
  __typename?: 'HostPresence';
  online: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
};

export type Insight = {
  __typename?: 'Insight';
  kind: InsightKind;
  text: Scalars['String']['output'];
};

export type InsightKind =
  | 'GOOD'
  | 'WATCH';

export type Institution = {
  __typename?: 'Institution';
  address?: Maybe<Scalars['String']['output']>;
  branding?: Maybe<Scalars['JSON']['output']>;
  defaultLocale: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  status: InstitutionStatus;
  subdomain?: Maybe<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type InstitutionInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  defaultLocale?: InputMaybe<Scalars['String']['input']>;
  logoKey?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  subdomain?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type InstitutionMembership = {
  __typename?: 'InstitutionMembership';
  id: Scalars['ID']['output'];
  institution: Institution;
  joinedAt?: Maybe<Scalars['DateTime']['output']>;
  role: MembershipRole;
  status: MembershipStatus;
  user: User;
};

export type InstitutionStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING';

export type InviteInput = {
  email: Scalars['String']['input'];
  groupId?: InputMaybe<Scalars['ID']['input']>;
  institutionId: Scalars['ID']['input'];
  role: MembershipRole;
};

export type JoinDecision =
  | 'ALLOWED'
  | 'KNOCK_REQUIRED'
  | 'LINK_REPLACED'
  | 'NOT_IN_GROUP';

export type LearningProfile = {
  __typename?: 'LearningProfile';
  courseCount: Scalars['Int']['output'];
  courseId?: Maybe<Scalars['ID']['output']>;
  courseTitle?: Maybe<Scalars['String']['output']>;
  groupName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  institutionId?: Maybe<Scalars['ID']['output']>;
  institutionName?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  kind: LearningProfileKind;
};

export type LearningProfileKind =
  | 'CADET'
  | 'PUPIL'
  | 'TEACHER';

export type Lesson = {
  __typename?: 'Lesson';
  description?: Maybe<Scalars['String']['output']>;
  deviceKey?: Maybe<Scalars['String']['output']>;
  durationMin: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  kind: LessonKind;
  materials: Array<Material>;
  nextSessionAt?: Maybe<Scalars['DateTime']['output']>;
  options: LessonOptions;
  order: Scalars['Int']['output'];
  scheduleRule?: Maybe<Scalars['JSON']['output']>;
  sessions: Array<LessonSession>;
  status: LessonStatus;
  title: Scalars['String']['output'];
};


export type LessonSessionsArgs = {
  from?: InputMaybe<Scalars['DateTime']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
};

export type LessonInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  deviceKey?: InputMaybe<Scalars['String']['input']>;
  durationMin: Scalars['Int']['input'];
  kind?: InputMaybe<LessonKind>;
  options?: InputMaybe<LessonOptionsInput>;
  scheduleRule?: InputMaybe<Scalars['JSON']['input']>;
  title: Scalars['String']['input'];
};

export type LessonKind =
  | 'EXTERNAL_DEVICE'
  | 'STANDARD';

export type LessonOptions = {
  __typename?: 'LessonOptions';
  camera: Scalars['Boolean']['output'];
  chat: Scalars['Boolean']['output'];
  homework: Scalars['Boolean']['output'];
  screen: Scalars['Boolean']['output'];
};

export type LessonOptionsInput = {
  camera?: InputMaybe<Scalars['Boolean']['input']>;
  chat?: InputMaybe<Scalars['Boolean']['input']>;
  homework?: InputMaybe<Scalars['Boolean']['input']>;
  screen?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LessonProgress =
  | 'AHEAD'
  | 'CURRENT'
  | 'DONE';

export type LessonSession = {
  __typename?: 'LessonSession';
  attendance: Array<Attendance>;
  attentionSummary?: Maybe<AttentionSummary>;
  courseId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  endAt?: Maybe<Scalars['DateTime']['output']>;
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  lesson: Lesson;
  roomToken?: Maybe<Scalars['String']['output']>;
  startAt: Scalars['DateTime']['output'];
  status: SessionStatus;
  teacherId?: Maybe<Scalars['ID']['output']>;
  teacherName?: Maybe<Scalars['String']['output']>;
};

export type LessonStatus =
  | 'DRAFT'
  | 'PUBLISHED';

export type LessonSummary = {
  __typename?: 'LessonSummary';
  assembledAt?: Maybe<Scalars['DateTime']['output']>;
  canEdit: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  intro: Scalars['String']['output'];
  items: Array<SummaryItem>;
  sentAt?: Maybe<Scalars['DateTime']['output']>;
  sessionId: Scalars['ID']['output'];
  speechOmitted: Scalars['Boolean']['output'];
  status: SummaryStatus;
};

export type LexicalExample = {
  __typename?: 'LexicalExample';
  credit: Attribution;
  id: Scalars['ID']['output'];
  text: Scalars['String']['output'];
  translationRu?: Maybe<Scalars['String']['output']>;
};

export type LexicalItem = {
  __typename?: 'LexicalItem';
  cefrLevel?: Maybe<Scalars['String']['output']>;
  credit: Attribution;
  definitionRu?: Maybe<Scalars['String']['output']>;
  examples: Array<LexicalExample>;
  id: Scalars['ID']['output'];
  ipa?: Maybe<Scalars['String']['output']>;
  lemma: Scalars['String']['output'];
  pos: PartOfSpeech;
  pronunciationId?: Maybe<Scalars['ID']['output']>;
  senseId?: Maybe<Scalars['String']['output']>;
  translationRu?: Maybe<Scalars['String']['output']>;
};

export type LexicalSource =
  | 'COMMON_VOICE'
  | 'OWN'
  | 'TATOEBA'
  | 'WORDNET';

export type Material = {
  __typename?: 'Material';
  body?: Maybe<Scalars['String']['output']>;
  fileUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  order: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  type: MaterialType;
  url?: Maybe<Scalars['String']['output']>;
};

export type MaterialInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['ID']['input']>;
  fileKey?: InputMaybe<Scalars['String']['input']>;
  lessonId?: InputMaybe<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
  type: MaterialType;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type MaterialType =
  | 'FILE'
  | 'LINK'
  | 'TEXT';

export type MeetingAccessMode =
  | 'ANY_AUTHENTICATED'
  | 'GROUP_ONLY'
  | 'KNOCK';

export type MeetingParticipant = {
  __typename?: 'MeetingParticipant';
  name: Scalars['String']['output'];
  since?: Maybe<Scalars['DateTime']['output']>;
  state: ParticipantState;
  studentId: Scalars['ID']['output'];
};

export type MeetingPoint = {
  __typename?: 'MeetingPoint';
  accessMode: MeetingAccessMode;
  code: Scalars['String']['output'];
  groupId: Scalars['ID']['output'];
  hostOnline: Scalars['Boolean']['output'];
  nextLesson?: Maybe<UpcomingLesson>;
  slug: Scalars['String']['output'];
};

export type MeetingPointView = {
  __typename?: 'MeetingPointView';
  capabilities: OfflineCapabilities;
  decision: JoinDecision;
  groupName: Scalars['String']['output'];
  hostOnline: Scalars['Boolean']['output'];
  nextLesson?: Maybe<UpcomingLesson>;
  slug: Scalars['String']['output'];
  teacherName: Scalars['String']['output'];
};

export type MembershipRole =
  | 'ADMIN'
  | 'STUDENT'
  | 'TEACHER';

export type MembershipStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING';

export type MirrorKind =
  | 'ACHIEVEMENT'
  | 'BOARD'
  | 'CHAT'
  | 'DIARY'
  | 'MATERIAL'
  | 'SUMMARY'
  | 'WORK';

export type MirroredRecord = {
  __typename?: 'MirroredRecord';
  id: Scalars['ID']['output'];
  kind: MirrorKind;
  occurredAt: Scalars['DateTime']['output'];
  payload: Scalars['JSON']['output'];
  sourceId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addChild: Guardianship;
  addMaterial: Material;
  addStudentsToGroup: Group;
  addSummaryItem: SummaryItem;
  addWordToMyList: SrsCard;
  advanceDeviceSetup: Device;
  answerExercise: Attempt;
  archiveCourse: Course;
  assembleLessonSummary: LessonSummary;
  assignTeacher: GroupTeacher;
  backupUbp: UbpBackup;
  claimDeviceToken: DeviceClaim;
  completeDeviceSetup: Device;
  configureCabinetBackup: Device;
  confirmPairingCode: Device;
  countLiveAsClasswork: Scalars['ID']['output'];
  createCourse: Course;
  createGroup: Group;
  createHomework: Homework;
  createInstitution: Institution;
  createLesson: Lesson;
  createProjectorCode: ProjectorCast;
  createReview: Review;
  createSection: Section;
  deleteCourse: Scalars['Boolean']['output'];
  deleteHomework: Scalars['Boolean']['output'];
  deleteLesson: Scalars['Boolean']['output'];
  deleteMaterial: Scalars['Boolean']['output'];
  deleteSection: Scalars['Boolean']['output'];
  deleteUbpBackup: Scalars['Boolean']['output'];
  dismissRecommendation: Recommendation;
  endSession: LessonSession;
  enroll: Enrollment;
  exportCabinet: CabinetBackup;
  gradeSubmission: Submission;
  handInExerciseSet: HomeworkHandIn;
  hostHeartbeat: HostPresence;
  inviteMember: InstitutionMembership;
  issueCertificate: Certificate;
  joinSession: SessionJoin;
  login: AuthPayload;
  logout: Scalars['Boolean']['output'];
  markAllNotificationsRead: Scalars['Boolean']['output'];
  markChannelRead: Scalars['Boolean']['output'];
  markLessonViewed: Enrollment;
  markNotificationRead: Notification;
  moderateReview: Review;
  openDirectChannel: ChatChannel;
  openStaffChannel: ChatChannel;
  openSubjectChannel: ChatChannel;
  publishCourse: Course;
  publishHomework: Homework;
  publishLesson: Lesson;
  putBoardElement: BoardElement;
  putWordOnBoard: Scalars['ID']['output'];
  recordCabinetBackup: Device;
  redeemProjectorCode: ProjectorJoin;
  refreshToken: AuthPayload;
  registerUser: AuthPayload;
  rejectTeacher: User;
  removeBoardElement: Scalars['Boolean']['output'];
  removeMember: Scalars['Boolean']['output'];
  removeSavedItem: Scalars['Boolean']['output'];
  removeStudentFromGroup: Group;
  removeSummaryItem: Scalars['Boolean']['output'];
  reorderLessons: Array<Lesson>;
  reorderSections: Array<Section>;
  replaceMeetingLink: MeetingPoint;
  reportAttention: Scalars['Boolean']['output'];
  reportChannel: ChatReport;
  reportUplink: Device;
  requestPairingCode: PairingRequest;
  requestPasswordReset: Scalars['Boolean']['output'];
  requestUpload: UploadTicket;
  requestVerificationDocuments: User;
  resetPassword: Scalars['Boolean']['output'];
  resolveChatReport: ChatReport;
  respondGuardianship: Guardianship;
  reviewWord: DueCard;
  revokeDevice: Scalars['Boolean']['output'];
  saveBoard: BoardSnapshot;
  saveItem: SubjectMaterial;
  scheduleSession: LessonSession;
  sendChannelMessage: ChannelMessage;
  sendChatMessage: ChatMessage;
  sendLessonSummary: LessonSummary;
  sendSignal: Scalars['Boolean']['output'];
  setAccountState: User;
  setActiveLearningProfile: LearningProfile;
  setAttendance: Attendance;
  setAttentionConsent: Scalars['Boolean']['output'];
  setAvatar: User;
  setBoardOpen: Scalars['Boolean']['output'];
  setMeetingAccess: MeetingPoint;
  setProjectorFocus: ProjectorFocus;
  setSpeechConsent: Scalars['Boolean']['output'];
  setSummaryIntro: LessonSummary;
  showWordToClass: WordShown;
  startSession: LessonSession;
  submitHomework: Submission;
  submitVerificationDocument: VerificationDocument;
  unenroll: Scalars['Boolean']['output'];
  unpublishCourse: Course;
  updateBranding: Institution;
  updateCourse: Course;
  updateGroup: Group;
  updateHomework: Homework;
  updateInstitution: Institution;
  updateLesson: Lesson;
  updateMembership: InstitutionMembership;
  updateMyName: User;
  updateNotificationPreference: NotificationPreference;
  updateSection: Section;
  updateSummaryItem: SummaryItem;
  verifyEmail: Scalars['Boolean']['output'];
  verifyTeacher: User;
};


export type MutationAddChildArgs = {
  input: AddChildInput;
};


export type MutationAddMaterialArgs = {
  input: MaterialInput;
};


export type MutationAddStudentsToGroupArgs = {
  groupId: Scalars['ID']['input'];
  studentIds: Array<Scalars['ID']['input']>;
};


export type MutationAddSummaryItemArgs = {
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  section: SummarySection;
  sessionId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationAddWordToMyListArgs = {
  direction?: InputMaybe<CardDirection>;
  itemId: Scalars['ID']['input'];
};


export type MutationAdvanceDeviceSetupArgs = {
  step: Scalars['Int']['input'];
};


export type MutationAnswerExerciseArgs = {
  context?: InputMaybe<AttemptContext>;
  exerciseId: Scalars['ID']['input'];
  hintsUsed?: InputMaybe<Scalars['Int']['input']>;
  latencyMs?: InputMaybe<Scalars['Int']['input']>;
  response: Scalars['JSON']['input'];
  sessionId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationArchiveCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAssembleLessonSummaryArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationAssignTeacherArgs = {
  groupId: Scalars['ID']['input'];
  subject: Scalars['String']['input'];
  teacherId: Scalars['ID']['input'];
};


export type MutationBackupUbpArgs = {
  input: UbpBackupInput;
};


export type MutationClaimDeviceTokenArgs = {
  code: Scalars['String']['input'];
  secret: Scalars['String']['input'];
};


export type MutationConfigureCabinetBackupArgs = {
  cloudCopy?: InputMaybe<Scalars['Boolean']['input']>;
  kind: BackupKind;
};


export type MutationConfirmPairingCodeArgs = {
  code: Scalars['String']['input'];
};


export type MutationCountLiveAsClassworkArgs = {
  setId: Scalars['ID']['input'];
  studentId: Scalars['ID']['input'];
};


export type MutationCreateCourseArgs = {
  input: CourseInput;
};


export type MutationCreateGroupArgs = {
  input: GroupInput;
};


export type MutationCreateHomeworkArgs = {
  input: HomeworkInput;
};


export type MutationCreateInstitutionArgs = {
  input: InstitutionInput;
};


export type MutationCreateLessonArgs = {
  input: LessonInput;
  sectionId: Scalars['ID']['input'];
};


export type MutationCreateProjectorCodeArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationCreateReviewArgs = {
  rating: Scalars['Int']['input'];
  teacherId: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateSectionArgs = {
  courseId: Scalars['ID']['input'];
  input: SectionInput;
};


export type MutationDeleteCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteHomeworkArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLessonArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMaterialArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDismissRecommendationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEndSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationEnrollArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationExportCabinetArgs = {
  passphrase?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGradeSubmissionArgs = {
  input: GradeInput;
};


export type MutationHandInExerciseSetArgs = {
  setId: Scalars['ID']['input'];
};


export type MutationInviteMemberArgs = {
  input: InviteInput;
};


export type MutationIssueCertificateArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationJoinSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationMarkChannelReadArgs = {
  channelId: Scalars['ID']['input'];
};


export type MutationMarkLessonViewedArgs = {
  lessonId: Scalars['ID']['input'];
};


export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationModerateReviewArgs = {
  id: Scalars['ID']['input'];
  status: ReviewStatus;
};


export type MutationOpenDirectChannelArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationOpenStaffChannelArgs = {
  institutionId: Scalars['ID']['input'];
};


export type MutationOpenSubjectChannelArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationPublishCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishHomeworkArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishLessonArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPutBoardElementArgs = {
  input: BoardElementInput;
  lessonId: Scalars['ID']['input'];
};


export type MutationPutWordOnBoardArgs = {
  itemId: Scalars['ID']['input'];
  lessonId: Scalars['ID']['input'];
};


export type MutationRedeemProjectorCodeArgs = {
  code: Scalars['String']['input'];
};


export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRegisterUserArgs = {
  input: RegisterUserInput;
};


export type MutationRejectTeacherArgs = {
  reason: Scalars['String']['input'];
  teacherUserId: Scalars['ID']['input'];
};


export type MutationRemoveBoardElementArgs = {
  elementId: Scalars['ID']['input'];
  lessonId: Scalars['ID']['input'];
};


export type MutationRemoveMemberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveSavedItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveStudentFromGroupArgs = {
  groupId: Scalars['ID']['input'];
  studentId: Scalars['ID']['input'];
};


export type MutationRemoveSummaryItemArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationReorderLessonsArgs = {
  orderedIds: Array<Scalars['ID']['input']>;
  sectionId: Scalars['ID']['input'];
};


export type MutationReorderSectionsArgs = {
  courseId: Scalars['ID']['input'];
  orderedIds: Array<Scalars['ID']['input']>;
};


export type MutationReplaceMeetingLinkArgs = {
  groupId: Scalars['ID']['input'];
};


export type MutationReportAttentionArgs = {
  input: AttentionInput;
};


export type MutationReportChannelArgs = {
  channelId: Scalars['ID']['input'];
  messageId?: InputMaybe<Scalars['ID']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReportUplinkArgs = {
  connectionType?: InputMaybe<ConnectionType>;
  mbps: Scalars['Float']['input'];
};


export type MutationRequestPairingCodeArgs = {
  appVersion?: InputMaybe<Scalars['String']['input']>;
  deviceName: Scalars['String']['input'];
  platform?: InputMaybe<DevicePlatform>;
};


export type MutationRequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


export type MutationRequestUploadArgs = {
  input: UploadRequestInput;
};


export type MutationRequestVerificationDocumentsArgs = {
  reason: Scalars['String']['input'];
  teacherUserId: Scalars['ID']['input'];
};


export type MutationResetPasswordArgs = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationResolveChatReportArgs = {
  dismiss?: InputMaybe<Scalars['Boolean']['input']>;
  reportId: Scalars['ID']['input'];
};


export type MutationRespondGuardianshipArgs = {
  accept: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationReviewWordArgs = {
  cardId: Scalars['ID']['input'];
  difficulty: Scalars['Float']['input'];
  dueAt: Scalars['DateTime']['input'];
  learningSteps?: InputMaybe<Scalars['Int']['input']>;
  rating: ReviewRating;
  stability: Scalars['Float']['input'];
  state: CardState;
};


export type MutationRevokeDeviceArgs = {
  deviceId: Scalars['ID']['input'];
};


export type MutationSaveBoardArgs = {
  lessonId: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSaveItemArgs = {
  input: SaveItemInput;
};


export type MutationScheduleSessionArgs = {
  input: ScheduleSessionInput;
};


export type MutationSendChannelMessageArgs = {
  channelId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationSendChatMessageArgs = {
  sessionId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationSendLessonSummaryArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationSendSignalArgs = {
  kind: SignalKind;
  payload: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
  toPeer: Scalars['ID']['input'];
};


export type MutationSetAccountStateArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  state: AccountStateValue;
  userId: Scalars['ID']['input'];
};


export type MutationSetActiveLearningProfileArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetAttendanceArgs = {
  sessionId: Scalars['ID']['input'];
  status: AttendanceStatus;
  studentId: Scalars['ID']['input'];
};


export type MutationSetAttentionConsentArgs = {
  granted: Scalars['Boolean']['input'];
};


export type MutationSetAvatarArgs = {
  fileKey: Scalars['String']['input'];
};


export type MutationSetBoardOpenArgs = {
  isOpen: Scalars['Boolean']['input'];
  lessonId: Scalars['ID']['input'];
};


export type MutationSetMeetingAccessArgs = {
  groupId: Scalars['ID']['input'];
  mode: MeetingAccessMode;
};


export type MutationSetProjectorFocusArgs = {
  sessionId: Scalars['ID']['input'];
  studentId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSetSpeechConsentArgs = {
  granted: Scalars['Boolean']['input'];
};


export type MutationSetSummaryIntroArgs = {
  sessionId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationShowWordToClassArgs = {
  itemId: Scalars['ID']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationStartSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationSubmitHomeworkArgs = {
  input: SubmitHomeworkInput;
};


export type MutationSubmitVerificationDocumentArgs = {
  fileKey: Scalars['String']['input'];
};


export type MutationUnenrollArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationUnpublishCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateBrandingArgs = {
  branding: Scalars['JSON']['input'];
  institutionId: Scalars['ID']['input'];
};


export type MutationUpdateCourseArgs = {
  id: Scalars['ID']['input'];
  input: CourseInput;
};


export type MutationUpdateGroupArgs = {
  id: Scalars['ID']['input'];
  input: GroupInput;
};


export type MutationUpdateHomeworkArgs = {
  id: Scalars['ID']['input'];
  input: HomeworkInput;
};


export type MutationUpdateInstitutionArgs = {
  id: Scalars['ID']['input'];
  input: InstitutionInput;
};


export type MutationUpdateLessonArgs = {
  id: Scalars['ID']['input'];
  input: LessonInput;
};


export type MutationUpdateMembershipArgs = {
  id: Scalars['ID']['input'];
  role?: InputMaybe<MembershipRole>;
  status?: InputMaybe<MembershipStatus>;
};


export type MutationUpdateMyNameArgs = {
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  middleName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateNotificationPreferenceArgs = {
  input: NotificationPreferenceInput;
};


export type MutationUpdateSectionArgs = {
  id: Scalars['ID']['input'];
  input: SectionInput;
};


export type MutationUpdateSummaryItemArgs = {
  itemId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationVerifyEmailArgs = {
  token: Scalars['String']['input'];
};


export type MutationVerifyTeacherArgs = {
  teacherUserId: Scalars['ID']['input'];
};

export type Notification = {
  __typename?: 'Notification';
  body?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isRead: Scalars['Boolean']['output'];
  payload?: Maybe<Scalars['JSON']['output']>;
  title: Scalars['String']['output'];
  type: NotificationType;
};

export type NotificationChannel =
  | 'EMAIL'
  | 'IN_APP'
  | 'PUSH';

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  nodes: Array<Notification>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type NotificationPreference = {
  __typename?: 'NotificationPreference';
  channel: NotificationChannel;
  child?: Maybe<User>;
  enabled: Scalars['Boolean']['output'];
  eventType: NotificationType;
  id: Scalars['ID']['output'];
};

export type NotificationPreferenceInput = {
  channel: NotificationChannel;
  childId?: InputMaybe<Scalars['ID']['input']>;
  enabled: Scalars['Boolean']['input'];
  eventType: NotificationType;
};

export type NotificationType =
  | 'ABSENCE'
  | 'CMF_INSIGHT'
  | 'GRADE'
  | 'HOMEWORK_DONE'
  | 'NEW_LESSON'
  | 'WEEKLY_DIGEST';

export type OfflineCapabilities = {
  __typename?: 'OfflineCapabilities';
  chat: Scalars['Boolean']['output'];
  homework: Scalars['Boolean']['output'];
  lessonMaterials: Scalars['Boolean']['output'];
  liveBoard: Scalars['Boolean']['output'];
  myBoards: Scalars['Boolean']['output'];
  myDiary: Scalars['Boolean']['output'];
  myGrades: Scalars['Boolean']['output'];
  myMaterials: Scalars['Boolean']['output'];
  mySummaries: Scalars['Boolean']['output'];
  myWork: Scalars['Boolean']['output'];
  room: Scalars['Boolean']['output'];
  schedule: Scalars['Boolean']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type PairingRequest = {
  __typename?: 'PairingRequest';
  code: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  secret: Scalars['String']['output'];
};

export type ParentChildOverview = {
  __typename?: 'ParentChildOverview';
  attendancePct: Scalars['Int']['output'];
  attentionAverage: Scalars['Int']['output'];
  attentionWeek: Array<DailyAttention>;
  child: StudentProfile;
  recentGrades: Array<Submission>;
  todaySchedule: Array<LessonSession>;
};

export type ParentProfile = {
  __typename?: 'ParentProfile';
  children: Array<StudentProfile>;
  user: User;
};

export type PartOfSpeech =
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'NOUN'
  | 'OTHER'
  | 'PHRASE'
  | 'VERB';

export type ParticipantState =
  | 'AT_THE_DOOR'
  | 'INVITED'
  | 'IN_ROOM'
  | 'NEVER_OPENED';

export type PersonRow = {
  __typename?: 'PersonRow';
  email: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  role: Scalars['String']['output'];
  state: AccountStateValue;
  userId: Scalars['ID']['output'];
};

export type PointEvent = {
  __typename?: 'PointEvent';
  amount: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  reason: PointReason;
};

export type PointReason =
  | 'ATTENDANCE'
  | 'GRADE'
  | 'HOMEWORK'
  | 'STREAK';

export type ProjectorCast = {
  __typename?: 'ProjectorCast';
  code: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  sessionId: Scalars['ID']['output'];
};

export type ProjectorFocus = {
  __typename?: 'ProjectorFocus';
  sessionId: Scalars['ID']['output'];
  studentId?: Maybe<Scalars['ID']['output']>;
};

export type ProjectorJoin = {
  __typename?: 'ProjectorJoin';
  lessonTitle: Scalars['String']['output'];
  roomToken: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  accountStateHistory: Array<AccountStateRow>;
  adminDashboard: AdminDashboard;
  attentionAnalytics: AttentionAnalytics;
  board: Board;
  boardSnapshots: Array<BoardSnapshot>;
  catalog: CourseConnection;
  certificate?: Maybe<Certificate>;
  channelMessages: Array<ChannelMessage>;
  chatPolicy: ChatPolicyView;
  chatReports: Array<ChatReport>;
  chatUnread: Scalars['Int']['output'];
  course?: Maybe<Course>;
  courseBoards: Array<BoardSnapshot>;
  exerciseLivePicture: Array<ExerciseLiveRow>;
  externalDictionaries: Array<ExternalDictionary>;
  group?: Maybe<Group>;
  groupAnalytics: GroupAnalytics;
  groupMeetingPoint: MeetingPoint;
  groups: Array<Group>;
  homework?: Maybe<Homework>;
  homeworkSubmissions: Array<Submission>;
  institution?: Maybe<Institution>;
  institutionMembers: Array<InstitutionMembership>;
  learningProfiles: Array<LearningProfile>;
  lesson?: Maybe<Lesson>;
  lessonChat: Array<ChatMessage>;
  lessonExerciseSets: Array<ExerciseSet>;
  lessonHomework: Array<Homework>;
  lessonSummary?: Maybe<LessonSummary>;
  lessonWords: Array<LexicalItem>;
  lookupWord: Array<LexicalItem>;
  me?: Maybe<User>;
  meetingParticipants: Array<MeetingParticipant>;
  meetingPoint: MeetingPointView;
  meetingPointByCode: MeetingPointView;
  mirroredFileUrl: Scalars['String']['output'];
  myAchievements: Array<Achievement>;
  myAttempts: Array<Attempt>;
  myChannels: Array<ChatChannel>;
  myCourses: Array<Course>;
  myDevices: Array<Device>;
  myMirror: Array<MirroredRecord>;
  myRepetitionProgress: RepetitionProgress;
  myRepetitionQueue: Array<DueCard>;
  mySavedItems: Array<SubjectMaterial>;
  mySchedule: Array<LessonSession>;
  mySkillMastery: Array<SkillMastery>;
  mySubmissions: Array<Submission>;
  myWords: Array<SrsCard>;
  notificationPreferences: Array<NotificationPreference>;
  notifications: NotificationConnection;
  oversightLog: Array<AccessLogRow>;
  oversightPeople: Array<PersonRow>;
  parentChildOverview: ParentChildOverview;
  parentChildren: Array<StudentProfile>;
  recommendations: Array<Recommendation>;
  session?: Maybe<LessonSession>;
  sessionAttention: AttentionSummary;
  setProgress: SetProgress;
  startPage: StartPage;
  studentDashboard: StudentDashboard;
  subjectCabinet: SubjectCabinet;
  subjectProgress: SubjectProgress;
  subjectTasks: Array<SubjectTask>;
  teacher?: Maybe<TeacherProfile>;
  teacherDashboard: TeacherDashboard;
  teacherReviews: Array<Review>;
  thisDevice: Device;
  turnCredentials: TurnCredentials;
  ubpBackup?: Maybe<UbpBackup>;
  uplinkProbe: UplinkProbe;
  uploadPolicy: UploadPolicy;
  verificationDocumentUrl: Scalars['String']['output'];
  verificationQueue: Array<VerificationQueueEntry>;
  verifyCertificate: CertificateVerification;
};


export type QueryAccountStateHistoryArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryAttentionAnalyticsArgs = {
  courseId?: InputMaybe<Scalars['ID']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  studentId?: InputMaybe<Scalars['ID']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryBoardArgs = {
  lessonId: Scalars['ID']['input'];
};


export type QueryBoardSnapshotsArgs = {
  lessonId: Scalars['ID']['input'];
};


export type QueryCatalogArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<CourseFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCertificateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryChannelMessagesArgs = {
  channelId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCourseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCourseBoardsArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryExerciseLivePictureArgs = {
  setId: Scalars['ID']['input'];
};


export type QueryGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGroupAnalyticsArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryGroupMeetingPointArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryGroupsArgs = {
  institutionId: Scalars['ID']['input'];
};


export type QueryHomeworkArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHomeworkSubmissionsArgs = {
  homeworkId: Scalars['ID']['input'];
};


export type QueryInstitutionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInstitutionMembersArgs = {
  institutionId: Scalars['ID']['input'];
  role?: InputMaybe<MembershipRole>;
};


export type QueryLessonArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLessonChatArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryLessonExerciseSetsArgs = {
  lessonId: Scalars['ID']['input'];
};


export type QueryLessonHomeworkArgs = {
  lessonId: Scalars['ID']['input'];
};


export type QueryLessonSummaryArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryLessonWordsArgs = {
  lessonId: Scalars['ID']['input'];
};


export type QueryLookupWordArgs = {
  lemma: Scalars['String']['input'];
};


export type QueryMeetingParticipantsArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryMeetingPointArgs = {
  slug: Scalars['String']['input'];
};


export type QueryMeetingPointByCodeArgs = {
  code: Scalars['String']['input'];
};


export type QueryMirroredFileUrlArgs = {
  objectKey: Scalars['String']['input'];
  recordId: Scalars['ID']['input'];
};


export type QueryMyAttemptsArgs = {
  setId: Scalars['ID']['input'];
};


export type QueryMyMirrorArgs = {
  kind?: InputMaybe<MirrorKind>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyRepetitionQueueArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMySavedItemsArgs = {
  courseId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyScheduleArgs = {
  from: Scalars['DateTime']['input'];
  to: Scalars['DateTime']['input'];
};


export type QueryMySkillMasteryArgs = {
  masteredOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryMySubmissionsArgs = {
  courseId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  unreadOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryOversightLogArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOversightPeopleArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryParentChildOverviewArgs = {
  childId: Scalars['ID']['input'];
};


export type QuerySessionArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySessionAttentionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QuerySetProgressArgs = {
  setId: Scalars['ID']['input'];
};


export type QuerySubjectCabinetArgs = {
  courseId: Scalars['ID']['input'];
};


export type QuerySubjectProgressArgs = {
  courseId: Scalars['ID']['input'];
};


export type QuerySubjectTasksArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryTeacherArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTeacherReviewsArgs = {
  teacherId: Scalars['ID']['input'];
};


export type QueryUploadPolicyArgs = {
  purpose: UploadPurpose;
};


export type QueryVerificationDocumentUrlArgs = {
  id: Scalars['ID']['input'];
};


export type QueryVerifyCertificateArgs = {
  verificationId: Scalars['ID']['input'];
};

export type Recommendation = {
  __typename?: 'Recommendation';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  dismissed: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  kind: RecommendationKind;
  payload?: Maybe<Scalars['JSON']['output']>;
  title: Scalars['String']['output'];
};

export type RecommendationKind =
  | 'COURSE'
  | 'MATERIAL'
  | 'SCHEDULE'
  | 'WELLBEING';

export type RegisterUserInput = {
  consent152fz?: InputMaybe<Scalars['Boolean']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  role: Role;
  student?: InputMaybe<StudentInfoInput>;
  teacher?: InputMaybe<TeacherInfoInput>;
};

export type RepetitionProgress = {
  __typename?: 'RepetitionProgress';
  currentStreak: Scalars['Int']['output'];
  due: Scalars['Int']['output'];
  learning: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  mastered: Scalars['Int']['output'];
  reviews: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type ReportStatus =
  | 'DISMISSED'
  | 'OPEN'
  | 'REVIEWED';

export type Review = {
  __typename?: 'Review';
  author: User;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  rating: Scalars['Int']['output'];
  status: ReviewStatus;
  teacher: TeacherProfile;
  text?: Maybe<Scalars['String']['output']>;
};

export type ReviewRating =
  | 'AGAIN'
  | 'EASY'
  | 'GOOD'
  | 'HARD';

export type ReviewStatus =
  | 'HIDDEN'
  | 'PENDING'
  | 'VISIBLE';

export type Role =
  | 'ADMIN'
  | 'PARENT'
  | 'STUDENT'
  | 'TEACHER';

export type SaveItemInput = {
  courseId?: InputMaybe<Scalars['ID']['input']>;
  kind?: InputMaybe<SavedItemKind>;
  lessonId?: InputMaybe<Scalars['ID']['input']>;
  materialId?: InputMaybe<Scalars['ID']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  sourceName?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type SavedItemKind =
  | 'SAVED'
  | 'WATCH_LATER';

export type ScheduleSessionInput = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  lessonId: Scalars['ID']['input'];
  startAt: Scalars['DateTime']['input'];
};

export type Section = {
  __typename?: 'Section';
  coverUrl?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lessons: Array<Lesson>;
  order: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type SectionInput = {
  coverKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type SessionJoin = {
  __typename?: 'SessionJoin';
  roomToken: Scalars['String']['output'];
  session: LessonSession;
};

export type SessionStatus =
  | 'CANCELED'
  | 'ENDED'
  | 'LIVE'
  | 'SCHEDULED';

export type SetProgress = {
  __typename?: 'SetProgress';
  answered: Scalars['Int']['output'];
  correct: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type Signal = {
  __typename?: 'Signal';
  fromPeer: Scalars['ID']['output'];
  kind: SignalKind;
  payload: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
  toPeer: Scalars['ID']['output'];
};

export type SignalKind =
  | 'ANSWER'
  | 'BYE'
  | 'ICE'
  | 'OFFER';

export type SkillArea =
  | 'GRAMMAR'
  | 'LISTENING'
  | 'PRONUNCIATION'
  | 'READING'
  | 'SPEAKING'
  | 'VOCAB'
  | 'WRITING';

export type SkillMastery = {
  __typename?: 'SkillMastery';
  opportunities: Scalars['Int']['output'];
  pKnown: Scalars['Float']['output'];
  skillTag: Scalars['String']['output'];
};

export type SrsCard = {
  __typename?: 'SrsCard';
  direction: CardDirection;
  dueAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  item: LexicalItem;
  lapses: Scalars['Int']['output'];
  reps: Scalars['Int']['output'];
  state: CardState;
};

export type StartCourse = {
  __typename?: 'StartCourse';
  courseId: Scalars['ID']['output'];
  isDraft: Scalars['Boolean']['output'];
  lessonCount: Scalars['Int']['output'];
  nextAt?: Maybe<Scalars['DateTime']['output']>;
  nextLessonTitle?: Maybe<Scalars['String']['output']>;
  publishedLessons: Scalars['Int']['output'];
  sectionCount: Scalars['Int']['output'];
  studentCount: Scalars['Int']['output'];
  subject: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type StartDay = {
  __typename?: 'StartDay';
  date: Scalars['Date']['output'];
  entries: Array<StartEntry>;
  isToday: Scalars['Boolean']['output'];
};

export type StartEntry = {
  __typename?: 'StartEntry';
  ageDays?: Maybe<Scalars['Int']['output']>;
  at?: Maybe<Scalars['DateTime']['output']>;
  count?: Maybe<Scalars['Int']['output']>;
  courseId?: Maybe<Scalars['ID']['output']>;
  courseTitle?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isLive: Scalars['Boolean']['output'];
  kind: StartEntryKind;
  lessonId?: Maybe<Scalars['ID']['output']>;
  sessionId?: Maybe<Scalars['ID']['output']>;
  teacherName?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type StartEntryKind =
  | 'CONTINUE_LESSON'
  | 'GRADING_QUEUE'
  | 'HOMEWORK_DUE'
  | 'HOMEWORK_GRADED'
  | 'LESSON_SESSION';

export type StartPage = {
  __typename?: 'StartPage';
  attention: Array<StartEntry>;
  continueEntries: Array<StartEntry>;
  now?: Maybe<StartEntry>;
  profile?: Maybe<LearningProfile>;
  progress: Array<StartProgress>;
  teaching: Array<StartCourse>;
  today: Array<StartEntry>;
  week: Array<StartDay>;
};

export type StartProgress = {
  __typename?: 'StartProgress';
  courseId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  doneLessons: Scalars['Int']['output'];
  progressPct: Scalars['Int']['output'];
  totalLessons: Scalars['Int']['output'];
};

export type StudentDashboard = {
  __typename?: 'StudentDashboard';
  enrollments: Array<Enrollment>;
  points: Scalars['Int']['output'];
  rank?: Maybe<Scalars['Int']['output']>;
  recommendations: Array<Recommendation>;
  today: Array<LessonSession>;
};

export type StudentInfoInput = {
  birthDate?: InputMaybe<Scalars['DateTime']['input']>;
  gradeLevel?: InputMaybe<Scalars['String']['input']>;
  parentEmail?: InputMaybe<Scalars['String']['input']>;
};

export type StudentProfile = {
  __typename?: 'StudentProfile';
  ageBand: AgeBand;
  birthDate?: Maybe<Scalars['DateTime']['output']>;
  gradeLevel?: Maybe<Scalars['String']['output']>;
  institution?: Maybe<Institution>;
  points: Scalars['Int']['output'];
  user: User;
};

export type StudentStat = {
  __typename?: 'StudentStat';
  attendancePct: Scalars['Int']['output'];
  averageAttention?: Maybe<Scalars['Int']['output']>;
  averageGrade?: Maybe<Scalars['Float']['output']>;
  student: StudentProfile;
};

export type SubjectAttention = {
  __typename?: 'SubjectAttention';
  averageAttention: Scalars['Int']['output'];
  subject: Scalars['String']['output'];
};

export type SubjectCabinet = {
  __typename?: 'SubjectCabinet';
  courseId: Scalars['ID']['output'];
  gradingScale: GradingScale;
  groupName?: Maybe<Scalars['String']['output']>;
  institutionName?: Maybe<Scalars['String']['output']>;
  lessonCount: Scalars['Int']['output'];
  materials: Array<SubjectMaterial>;
  nextLesson?: Maybe<SubjectLesson>;
  profileKind: LearningProfileKind;
  progressPct: Scalars['Int']['output'];
  savedMaterials: Array<SubjectMaterial>;
  sections: Array<SubjectSection>;
  sources: Array<SubjectSource>;
  studentCount?: Maybe<Scalars['Int']['output']>;
  teacherId?: Maybe<Scalars['ID']['output']>;
  teacherName?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type SubjectLesson = {
  __typename?: 'SubjectLesson';
  completedBy?: Maybe<Scalars['Int']['output']>;
  deviceKey?: Maybe<Scalars['String']['output']>;
  grade?: Maybe<Scalars['Int']['output']>;
  groupSize?: Maybe<Scalars['Int']['output']>;
  hasHomework: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isLive: Scalars['Boolean']['output'];
  kind: LessonKind;
  materialCount: Scalars['Int']['output'];
  orderLabel: Scalars['String']['output'];
  progress: LessonProgress;
  sessionAt?: Maybe<Scalars['DateTime']['output']>;
  sessionId?: Maybe<Scalars['ID']['output']>;
  subtitle?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type SubjectMaterial = {
  __typename?: 'SubjectMaterial';
  fromLabel?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lessonId?: Maybe<Scalars['ID']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  savedId?: Maybe<Scalars['ID']['output']>;
  savedKind?: Maybe<SavedItemKind>;
  subtitle?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type?: Maybe<MaterialType>;
  url?: Maybe<Scalars['String']['output']>;
};

export type SubjectProgress = {
  __typename?: 'SubjectProgress';
  overallPct?: Maybe<Scalars['Int']['output']>;
  previousOverallPct?: Maybe<Scalars['Int']['output']>;
  profileKind: LearningProfileKind;
  topics: Array<SubjectTopic>;
  weakBelowPct: Scalars['Int']['output'];
};

export type SubjectSection = {
  __typename?: 'SubjectSection';
  doneLessons: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lessons: Array<SubjectLesson>;
  title: Scalars['String']['output'];
  totalLessons: Scalars['Int']['output'];
};

export type SubjectSource = {
  __typename?: 'SubjectSource';
  id: Scalars['ID']['output'];
  inLesson: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  savedId?: Maybe<Scalars['ID']['output']>;
  sourceName?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type SubjectTask = {
  __typename?: 'SubjectTask';
  attempts: Scalars['Int']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  gradedCount?: Maybe<Scalars['Int']['output']>;
  groupSize?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  lessonId?: Maybe<Scalars['ID']['output']>;
  lessonLabel?: Maybe<Scalars['String']['output']>;
  redoOpen: Scalars['Boolean']['output'];
  retakeCount?: Maybe<Scalars['Int']['output']>;
  score?: Maybe<Scalars['Int']['output']>;
  staleCount?: Maybe<Scalars['Int']['output']>;
  state: TaskState;
  submittedAt?: Maybe<Scalars['DateTime']['output']>;
  submittedBy?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  waitingCount?: Maybe<Scalars['Int']['output']>;
};

export type SubjectTopic = {
  __typename?: 'SubjectTopic';
  id: Scalars['ID']['output'];
  isCurrent: Scalars['Boolean']['output'];
  learnerCount?: Maybe<Scalars['Int']['output']>;
  lessonFrom?: Maybe<Scalars['String']['output']>;
  lessonTo?: Maybe<Scalars['String']['output']>;
  pct?: Maybe<Scalars['Int']['output']>;
  previousPct?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  weakCount?: Maybe<Scalars['Int']['output']>;
};

export type Submission = {
  __typename?: 'Submission';
  attempt: Scalars['Int']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  contentText?: Maybe<Scalars['String']['output']>;
  files: Array<SubmissionFile>;
  gradedAt?: Maybe<Scalars['DateTime']['output']>;
  gradedBy?: Maybe<User>;
  homework: Homework;
  id: Scalars['ID']['output'];
  score?: Maybe<Scalars['Int']['output']>;
  status: SubmissionStatus;
  student: StudentProfile;
  submittedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type SubmissionFile = {
  __typename?: 'SubmissionFile';
  fileUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type SubmissionStats = {
  __typename?: 'SubmissionStats';
  graded: Scalars['Int']['output'];
  late: Scalars['Int']['output'];
  submitted: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type SubmissionStatus =
  | 'GRADED'
  | 'LATE'
  | 'SUBMITTED';

export type SubmitHomeworkInput = {
  contentText?: InputMaybe<Scalars['String']['input']>;
  fileKeys?: InputMaybe<Array<Scalars['String']['input']>>;
  homeworkId: Scalars['ID']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  attentionUpdates: AttentionMetric;
  boardChanged: BoardChange;
  channelMessageReceived: ChannelMessage;
  chatMessageReceived: ChatMessage;
  hostPresenceChanged: HostPresence;
  notificationReceived: Notification;
  projectorFocusChanged: ProjectorFocus;
  sessionStatusChanged: LessonSession;
  signals: Signal;
  wordShown: WordShown;
};


export type SubscriptionAttentionUpdatesArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionBoardChangedArgs = {
  lessonId: Scalars['ID']['input'];
};


export type SubscriptionChannelMessageReceivedArgs = {
  channelId: Scalars['ID']['input'];
};


export type SubscriptionChatMessageReceivedArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionHostPresenceChangedArgs = {
  slug: Scalars['String']['input'];
};


export type SubscriptionProjectorFocusChangedArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionSessionStatusChangedArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionSignalsArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionWordShownArgs = {
  sessionId: Scalars['ID']['input'];
};

export type SummaryItem = {
  __typename?: 'SummaryItem';
  atOffsetSec?: Maybe<Scalars['Int']['output']>;
  authorId?: Maybe<Scalars['ID']['output']>;
  authorName: Scalars['String']['output'];
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  edited: Scalars['Boolean']['output'];
  homeworkId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  section: SummarySection;
  source: SummarySource;
  sourceMeta: Scalars['JSON']['output'];
  text: Scalars['String']['output'];
};

export type SummarySection =
  | 'CHAT'
  | 'HOMEWORK'
  | 'TOPIC'
  | 'WATCH'
  | 'WORDS';

export type SummarySource =
  | 'BOARD'
  | 'CHAT'
  | 'MATERIAL'
  | 'PLAN'
  | 'SPEECH'
  | 'TEACHER'
  | 'TEST';

export type SummaryStatus =
  | 'DRAFT'
  | 'SENT';

export type TaskState =
  | 'GRADED'
  | 'OVERDUE'
  | 'SUBMITTED'
  | 'TODO';

export type TeacherDashboard = {
  __typename?: 'TeacherDashboard';
  classAttentionAverage?: Maybe<Scalars['Int']['output']>;
  courses: Array<Course>;
  newStudentsThisWeek: Scalars['Int']['output'];
  pendingSubmissions: Array<Submission>;
  studentCount: Scalars['Int']['output'];
  upcomingSessions: Array<LessonSession>;
};

export type TeacherInfoInput = {
  education?: InputMaybe<Scalars['String']['input']>;
  experience?: InputMaybe<Scalars['String']['input']>;
  specialty?: InputMaybe<Scalars['String']['input']>;
};

export type TeacherProfile = {
  __typename?: 'TeacherProfile';
  bio?: Maybe<Scalars['String']['output']>;
  education?: Maybe<Scalars['String']['output']>;
  experience?: Maybe<Scalars['String']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  reviewCount: Scalars['Int']['output'];
  specialty?: Maybe<Scalars['String']['output']>;
  user: User;
  verificationDocuments: Array<VerificationDocument>;
  verificationStatus: VerificationStatus;
};

export type TurnCredentials = {
  __typename?: 'TurnCredentials';
  configured: Scalars['Boolean']['output'];
  credential: Scalars['String']['output'];
  ttlSeconds: Scalars['Int']['output'];
  urls: Array<Scalars['String']['output']>;
  username: Scalars['String']['output'];
};

export type UbpBackup = {
  __typename?: 'UbpBackup';
  encryptedBlob: Scalars['String']['output'];
  keyHint?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type UbpBackupInput = {
  encryptedBlob: Scalars['String']['input'];
  keyHint?: InputMaybe<Scalars['String']['input']>;
};

export type UpcomingLesson = {
  __typename?: 'UpcomingLesson';
  isLive: Scalars['Boolean']['output'];
  sessionId: Scalars['ID']['output'];
  startAt: Scalars['DateTime']['output'];
  title: Scalars['String']['output'];
};

export type UplinkAssessment = {
  __typename?: 'UplinkAssessment';
  connectionType: ConnectionType;
  groupSize: Scalars['Int']['output'];
  mbps: Scalars['Float']['output'];
  requiredForEight: Scalars['Float']['output'];
  stale: Scalars['Boolean']['output'];
  verdict: UplinkVerdict;
};

export type UplinkProbe = {
  __typename?: 'UplinkProbe';
  requiredForEight: Scalars['Float']['output'];
  requiredForFour: Scalars['Float']['output'];
  requiredForTwo: Scalars['Float']['output'];
  seconds: Scalars['Int']['output'];
};

export type UplinkVerdict =
  | 'COMFORTABLE'
  | 'TIGHT'
  | 'TOO_WEAK'
  | 'UNKNOWN'
  | 'WORKABLE';

export type UploadPolicy = {
  __typename?: 'UploadPolicy';
  contentTypes: Array<Scalars['String']['output']>;
  maxBytes: Scalars['Int']['output'];
  purpose: UploadPurpose;
};

export type UploadPurpose =
  | 'AVATAR'
  | 'COVER'
  | 'INSTITUTION_LOGO'
  | 'MATERIAL'
  | 'SUBMISSION'
  | 'VERIFICATION';

export type UploadRequestInput = {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  purpose: UploadPurpose;
};

export type UploadTicket = {
  __typename?: 'UploadTicket';
  expiresAt: Scalars['DateTime']['output'];
  fileKey: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  adminProfile?: Maybe<AdminProfile>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  consent152fzAt?: Maybe<Scalars['DateTime']['output']>;
  consentAttention: Scalars['Boolean']['output'];
  consentSpeech: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  formalName: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  locale: Scalars['String']['output'];
  middleName: Scalars['String']['output'];
  parentProfile?: Maybe<ParentProfile>;
  phone?: Maybe<Scalars['String']['output']>;
  role: Role;
  shortName: Scalars['String']['output'];
  studentProfile?: Maybe<StudentProfile>;
  teacherProfile?: Maybe<TeacherProfile>;
};

export type VerificationDocument = {
  __typename?: 'VerificationDocument';
  createdAt: Scalars['DateTime']['output'];
  fileUrl?: Maybe<Scalars['String']['output']>;
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reason: Scalars['String']['output'];
  reviewedAt?: Maybe<Scalars['DateTime']['output']>;
  sizeBytes?: Maybe<Scalars['Int']['output']>;
  status: VerificationStatus;
};

export type VerificationQueueDocument = {
  __typename?: 'VerificationQueueDocument';
  createdAt: Scalars['DateTime']['output'];
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  sizeBytes?: Maybe<Scalars['Int']['output']>;
};

export type VerificationQueueEntry = {
  __typename?: 'VerificationQueueEntry';
  courseCount: Scalars['Int']['output'];
  documents: Array<VerificationQueueDocument>;
  education: Scalars['String']['output'];
  email: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  sessionCount: Scalars['Int']['output'];
  specialty: Scalars['String']['output'];
  submittedAt: Scalars['DateTime']['output'];
  teacherUserId: Scalars['ID']['output'];
};

export type VerificationStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED';

export type WordShown = {
  __typename?: 'WordShown';
  itemId: Scalars['ID']['output'];
  lemma: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
};

export type AdminInstitutionQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminInstitutionQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, adminProfile?: { __typename?: 'AdminProfile', institution?: { __typename?: 'Institution', id: string, name: string, address?: string | null, website?: string | null, subdomain?: string | null, status: InstitutionStatus, defaultLocale: string, branding?: Record<string, unknown> | null, logoUrl?: string | null } | null } | null } | null };

export type InstitutionGroupsQueryVariables = Exact<{
  institutionId: Scalars['ID']['input'];
}>;


export type InstitutionGroupsQuery = { __typename?: 'Query', groups: Array<{ __typename?: 'Group', id: string, name: string, level?: string | null, students: Array<{ __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, fullName: string } }>, teachers: Array<{ __typename?: 'GroupTeacher', id: string, subject: string, teacher: { __typename?: 'TeacherProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, fullName: string } } }> }> };

export type InstitutionMembersQueryVariables = Exact<{
  institutionId: Scalars['ID']['input'];
  role?: InputMaybe<MembershipRole>;
}>;


export type InstitutionMembersQuery = { __typename?: 'Query', institutionMembers: Array<{ __typename?: 'InstitutionMembership', id: string, role: MembershipRole, status: MembershipStatus, joinedAt?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, fullName: string, email: string } }> };

export type UpdateInstitutionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: InstitutionInput;
}>;


export type UpdateInstitutionMutation = { __typename?: 'Mutation', updateInstitution: { __typename?: 'Institution', id: string, name: string, address?: string | null, website?: string | null } };

export type UpdateBrandingMutationVariables = Exact<{
  institutionId: Scalars['ID']['input'];
  branding: Scalars['JSON']['input'];
}>;


export type UpdateBrandingMutation = { __typename?: 'Mutation', updateBranding: { __typename?: 'Institution', id: string, branding?: Record<string, unknown> | null } };

export type InviteMemberMutationVariables = Exact<{
  input: InviteInput;
}>;


export type InviteMemberMutation = { __typename?: 'Mutation', inviteMember: { __typename?: 'InstitutionMembership', id: string, role: MembershipRole, status: MembershipStatus, user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, fullName: string, email: string } } };

export type UpdateMembershipMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  role?: InputMaybe<MembershipRole>;
  status?: InputMaybe<MembershipStatus>;
}>;


export type UpdateMembershipMutation = { __typename?: 'Mutation', updateMembership: { __typename?: 'InstitutionMembership', id: string, role: MembershipRole, status: MembershipStatus } };

export type RemoveMemberMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveMemberMutation = { __typename?: 'Mutation', removeMember: boolean };

export type CreateGroupMutationVariables = Exact<{
  input: GroupInput;
}>;


export type CreateGroupMutation = { __typename?: 'Mutation', createGroup: { __typename?: 'Group', id: string, name: string, level?: string | null } };

export type AddStudentsToGroupMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  studentIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type AddStudentsToGroupMutation = { __typename?: 'Mutation', addStudentsToGroup: { __typename?: 'Group', id: string, students: Array<{ __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, fullName: string } }> } };

export type RemoveStudentFromGroupMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  studentId: Scalars['ID']['input'];
}>;


export type RemoveStudentFromGroupMutation = { __typename?: 'Mutation', removeStudentFromGroup: { __typename?: 'Group', id: string, students: Array<{ __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, fullName: string } }> } };

export type AssignTeacherMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  teacherId: Scalars['ID']['input'];
  subject: Scalars['String']['input'];
}>;


export type AssignTeacherMutation = { __typename?: 'Mutation', assignTeacher: { __typename?: 'GroupTeacher', id: string, subject: string, teacher: { __typename?: 'TeacherProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, fullName: string } } } };

export type VerificationQueueQueryVariables = Exact<{ [key: string]: never; }>;


export type VerificationQueueQuery = { __typename?: 'Query', verificationQueue: Array<{ __typename?: 'VerificationQueueEntry', teacherUserId: string, fullName: string, email: string, specialty: string, education: string, submittedAt: string, courseCount: number, sessionCount: number, documents: Array<{ __typename?: 'VerificationQueueDocument', id: string, filename: string, sizeBytes?: number | null, createdAt: string }> }> };

export type VerificationDocumentUrlQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type VerificationDocumentUrlQuery = { __typename?: 'Query', verificationDocumentUrl: string };

export type OversightLogQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type OversightLogQuery = { __typename?: 'Query', oversightLog: Array<{ __typename?: 'AccessLogRow', id: string, action: string, actorName: string, subjectName: string, objectLabel: string, reason: string, at: string }> };

export type VerifyTeacherMutationVariables = Exact<{
  teacherUserId: Scalars['ID']['input'];
}>;


export type VerifyTeacherMutation = { __typename?: 'Mutation', verifyTeacher: { __typename?: 'User', id: string } };

export type RejectTeacherMutationVariables = Exact<{
  teacherUserId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
}>;


export type RejectTeacherMutation = { __typename?: 'Mutation', rejectTeacher: { __typename?: 'User', id: string } };

export type RequestVerificationDocumentsMutationVariables = Exact<{
  teacherUserId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
}>;


export type RequestVerificationDocumentsMutation = { __typename?: 'Mutation', requestVerificationDocuments: { __typename?: 'User', id: string } };

export type OversightPeopleQueryVariables = Exact<{
  query?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type OversightPeopleQuery = { __typename?: 'Query', oversightPeople: Array<{ __typename?: 'PersonRow', userId: string, fullName: string, email: string, role: string, state: AccountStateValue }> };

export type AccountStateHistoryQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type AccountStateHistoryQuery = { __typename?: 'Query', accountStateHistory: Array<{ __typename?: 'AccountStateRow', state: AccountStateValue, reason: string, actorName: string, at: string }> };

export type SetAccountStateMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  state: AccountStateValue;
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetAccountStateMutation = { __typename?: 'Mutation', setAccountState: { __typename?: 'User', id: string } };

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', token: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, displayName: string, shortName: string, role: Role, locale: string, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus } | null } } };

export type RegisterUserMutationVariables = Exact<{
  input: RegisterUserInput;
}>;


export type RegisterUserMutation = { __typename?: 'Mutation', registerUser: { __typename?: 'AuthPayload', token: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, displayName: string, shortName: string, role: Role, locale: string, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus } | null } } };

export type RefreshTokenMutationVariables = Exact<{
  refreshToken: Scalars['String']['input'];
}>;


export type RefreshTokenMutation = { __typename?: 'Mutation', refreshToken: { __typename?: 'AuthPayload', token: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, displayName: string, shortName: string, role: Role, locale: string, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus } | null } } };

export type RequestPasswordResetMutationVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type RequestPasswordResetMutation = { __typename?: 'Mutation', requestPasswordReset: boolean };

export type ResetPasswordMutationVariables = Exact<{
  token: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ResetPasswordMutation = { __typename?: 'Mutation', resetPassword: boolean };

export type AddChildMutationVariables = Exact<{
  input: AddChildInput;
}>;


export type AddChildMutation = { __typename?: 'Mutation', addChild: { __typename?: 'Guardianship', id: string, status: GuardianshipStatus, consent152fz: boolean, consentAt?: string | null, child: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string } } };

export type SubmitVerificationDocumentMutationVariables = Exact<{
  fileKey: Scalars['String']['input'];
}>;


export type SubmitVerificationDocumentMutation = { __typename?: 'Mutation', submitVerificationDocument: { __typename?: 'VerificationDocument', id: string, filename: string, status: VerificationStatus, createdAt: string } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, displayName: string, shortName: string, role: Role, locale: string, avatarUrl?: string | null, consentSpeech: boolean, consentAttention: boolean, consent152fzAt?: string | null, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus, specialty?: string | null, verificationDocuments: Array<{ __typename?: 'VerificationDocument', id: string, filename: string, sizeBytes?: number | null, status: VerificationStatus, reason: string, createdAt: string }> } | null, parentProfile?: { __typename?: 'ParentProfile', children: Array<{ __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string } }> } | null } | null };

export type SetAvatarMutationVariables = Exact<{
  fileKey: Scalars['String']['input'];
}>;


export type SetAvatarMutation = { __typename?: 'Mutation', setAvatar: { __typename?: 'User', id: string, avatarUrl?: string | null } };

export type LearningProfilesQueryVariables = Exact<{ [key: string]: never; }>;


export type LearningProfilesQuery = { __typename?: 'Query', learningProfiles: Array<{ __typename?: 'LearningProfile', id: string, kind: LearningProfileKind, institutionId?: string | null, institutionName?: string | null, groupName?: string | null, courseId?: string | null, courseTitle?: string | null, courseCount: number, isActive: boolean }> };

export type SetActiveLearningProfileMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SetActiveLearningProfileMutation = { __typename?: 'Mutation', setActiveLearningProfile: { __typename?: 'LearningProfile', id: string, kind: LearningProfileKind, isActive: boolean } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type BoardQueryVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type BoardQuery = { __typename?: 'Query', board: { __typename?: 'Board', lessonId: string, openForStudents: boolean, canWrite: boolean, isTeacher: boolean, elements: Array<{ __typename?: 'BoardElement', id: string, kind: BoardElementKind, authorId: string, authorName: string, x: number, y: number, width: number, height: number, data: Record<string, unknown>, revision: number }> } };

export type CourseBoardsQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type CourseBoardsQuery = { __typename?: 'Query', courseBoards: Array<{ __typename?: 'BoardSnapshot', id: string, title: string, savedAt: string, savedByName: string, lessonId: string, lessonTitle: string }> };

export type PutBoardElementMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  input: BoardElementInput;
}>;


export type PutBoardElementMutation = { __typename?: 'Mutation', putBoardElement: { __typename?: 'BoardElement', id: string, kind: BoardElementKind, authorId: string, authorName: string, x: number, y: number, width: number, height: number, data: Record<string, unknown>, revision: number } };

export type RemoveBoardElementMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  elementId: Scalars['ID']['input'];
}>;


export type RemoveBoardElementMutation = { __typename?: 'Mutation', removeBoardElement: boolean };

export type SetBoardOpenMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  isOpen: Scalars['Boolean']['input'];
}>;


export type SetBoardOpenMutation = { __typename?: 'Mutation', setBoardOpen: boolean };

export type SaveBoardMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
}>;


export type SaveBoardMutation = { __typename?: 'Mutation', saveBoard: { __typename?: 'BoardSnapshot', id: string, title: string, savedAt: string } };

export type BoardChangedSubscriptionVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type BoardChangedSubscription = { __typename?: 'Subscription', boardChanged: { __typename?: 'BoardChange', lessonId: string, kind: string, elementId?: string | null, openForStudents?: boolean | null, element?: { __typename?: 'BoardElement', id: string, kind: BoardElementKind, authorId: string, authorName: string, x: number, y: number, width: number, height: number, data: Record<string, unknown>, revision: number } | null } };

export type TeacherDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type TeacherDashboardQuery = { __typename?: 'Query', teacherDashboard: { __typename?: 'TeacherDashboard', studentCount: number, newStudentsThisWeek: number, courses: Array<{ __typename?: 'Course', id: string, title: string, status: CourseStatus, lessonCount: number, enrollmentCount: number }>, upcomingSessions: Array<{ __typename?: 'LessonSession', id: string, startAt: string, endAt?: string | null, status: SessionStatus, lesson: { __typename?: 'Lesson', id: string, title: string } }>, pendingSubmissions: Array<{ __typename?: 'Submission', id: string, submittedAt?: string | null, status: SubmissionStatus, student: { __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, formalName: string } }, homework: { __typename?: 'Homework', id: string, title: string, lesson?: { __typename?: 'Lesson', id: string, title: string } | null } }> } };

export type MyChannelsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyChannelsQuery = { __typename?: 'Query', myChannels: Array<{ __typename?: 'ChatChannel', id: string, kind: ChannelKind, courseId?: string | null, courseTitle?: string | null, groupName?: string | null, institutionName?: string | null, unread: number, lastMessageAt?: string | null, lastMessageText?: string | null, readOnly: boolean, openReports: number, participants: Array<{ __typename?: 'ChatParticipant', id: string, firstName: string, lastName: string, displayName: string, shortName: string, role: string }> }> };

export type ChatUnreadQueryVariables = Exact<{ [key: string]: never; }>;


export type ChatUnreadQuery = { __typename?: 'Query', chatUnread: number };

export type ChannelMessagesQueryVariables = Exact<{
  channelId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ChannelMessagesQuery = { __typename?: 'Query', channelMessages: Array<{ __typename?: 'ChannelMessage', id: string, channelId: string, senderId: string, senderName: string, text: string, sentAt: string, mine: boolean }> };

export type ChatPolicyQueryVariables = Exact<{ [key: string]: never; }>;


export type ChatPolicyQuery = { __typename?: 'Query', chatPolicy: { __typename?: 'ChatPolicyView', peerChat: boolean, directMessages: boolean, teacherVisibleAlways: boolean, premoderation: boolean } };

export type ChatReportsQueryVariables = Exact<{ [key: string]: never; }>;


export type ChatReportsQuery = { __typename?: 'Query', chatReports: Array<{ __typename?: 'ChatReport', id: string, channelId: string, reporterName: string, reason?: string | null, status: ReportStatus, createdAt: string }> };

export type OpenSubjectChannelMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type OpenSubjectChannelMutation = { __typename?: 'Mutation', openSubjectChannel: { __typename?: 'ChatChannel', id: string, kind: ChannelKind, courseTitle?: string | null, unread: number } };

export type OpenDirectChannelMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type OpenDirectChannelMutation = { __typename?: 'Mutation', openDirectChannel: { __typename?: 'ChatChannel', id: string, kind: ChannelKind, unread: number } };

export type SendChannelMessageMutationVariables = Exact<{
  channelId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
}>;


export type SendChannelMessageMutation = { __typename?: 'Mutation', sendChannelMessage: { __typename?: 'ChannelMessage', id: string, channelId: string, senderId: string, senderName: string, text: string, sentAt: string, mine: boolean } };

export type MarkChannelReadMutationVariables = Exact<{
  channelId: Scalars['ID']['input'];
}>;


export type MarkChannelReadMutation = { __typename?: 'Mutation', markChannelRead: boolean };

export type ReportChannelMutationVariables = Exact<{
  channelId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReportChannelMutation = { __typename?: 'Mutation', reportChannel: { __typename?: 'ChatReport', id: string, channelId: string, status: ReportStatus } };

export type ResolveChatReportMutationVariables = Exact<{
  reportId: Scalars['ID']['input'];
  dismiss?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ResolveChatReportMutation = { __typename?: 'Mutation', resolveChatReport: { __typename?: 'ChatReport', id: string, status: ReportStatus } };

export type ChannelMessageReceivedSubscriptionVariables = Exact<{
  channelId: Scalars['ID']['input'];
}>;


export type ChannelMessageReceivedSubscription = { __typename?: 'Subscription', channelMessageReceived: { __typename?: 'ChannelMessage', id: string, channelId: string, senderId: string, senderName: string, text: string, sentAt: string, mine: boolean } };

export type CatalogQueryVariables = Exact<{
  filter?: InputMaybe<CourseFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type CatalogQuery = { __typename?: 'Query', catalog: { __typename?: 'CourseConnection', totalCount: number, subjectCount: number, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'Course', id: string, title: string, description?: string | null, subject: string, level: CourseLevel, format: CourseFormat, status: CourseStatus, lessonCount: number, enrollmentCount: number, owner: { __typename?: 'TeacherProfile', specialty?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, formalName: string } } }> } };

export type CourseDetailQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CourseDetailQuery = { __typename?: 'Query', course?: { __typename?: 'Course', id: string, title: string, description?: string | null, subject: string, level: CourseLevel, format: CourseFormat, status: CourseStatus, lessonCount: number, enrollmentCount: number, updatedAt: string, owner: { __typename?: 'TeacherProfile', specialty?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string, displayName: string, shortName: string, formalName: string } }, sections: Array<{ __typename?: 'Section', id: string, title: string, description?: string | null, order: number, lessons: Array<{ __typename?: 'Lesson', id: string, title: string, durationMin: number, status: LessonStatus, order: number, nextSessionAt?: string | null, options: { __typename?: 'LessonOptions', homework: boolean }, materials: Array<{ __typename?: 'Material', id: string, type: MaterialType, title: string, url?: string | null, body?: string | null, fileUrl?: string | null, order: number }> }> }>, viewerEnrollment?: { __typename?: 'Enrollment', id: string, status: EnrollmentStatus, progressPct: number, viewedLessonIds: Array<string> } | null } | null };

export type MyCoursesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyCoursesQuery = { __typename?: 'Query', myCourses: Array<{ __typename?: 'Course', id: string, title: string, subject: string, level: CourseLevel, format: CourseFormat, status: CourseStatus, lessonCount: number, enrollmentCount: number }> };

export type CreateCourseMutationVariables = Exact<{
  input: CourseInput;
}>;


export type CreateCourseMutation = { __typename?: 'Mutation', createCourse: { __typename?: 'Course', id: string, status: CourseStatus } };

export type PublishCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishCourseMutation = { __typename?: 'Mutation', publishCourse: { __typename?: 'Course', id: string, status: CourseStatus } };

export type UnpublishCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnpublishCourseMutation = { __typename?: 'Mutation', unpublishCourse: { __typename?: 'Course', id: string, status: CourseStatus } };

export type CreateSectionMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
  input: SectionInput;
}>;


export type CreateSectionMutation = { __typename?: 'Mutation', createSection: { __typename?: 'Section', id: string, title: string, order: number } };

export type UpdateSectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: SectionInput;
}>;


export type UpdateSectionMutation = { __typename?: 'Mutation', updateSection: { __typename?: 'Section', id: string, title: string } };

export type UpdateLessonMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: LessonInput;
}>;


export type UpdateLessonMutation = { __typename?: 'Mutation', updateLesson: { __typename?: 'Lesson', id: string, title: string, description?: string | null, kind: LessonKind, deviceKey?: string | null } };

export type CreateLessonMutationVariables = Exact<{
  sectionId: Scalars['ID']['input'];
  input: LessonInput;
}>;


export type CreateLessonMutation = { __typename?: 'Mutation', createLesson: { __typename?: 'Lesson', id: string, title: string, status: LessonStatus, kind: LessonKind, deviceKey?: string | null } };

export type PublishLessonMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishLessonMutation = { __typename?: 'Mutation', publishLesson: { __typename?: 'Lesson', id: string, status: LessonStatus } };

export type EnrollMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type EnrollMutation = { __typename?: 'Mutation', enroll: { __typename?: 'Enrollment', id: string, status: EnrollmentStatus, progressPct: number } };

export type UnenrollMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type UnenrollMutation = { __typename?: 'Mutation', unenroll: boolean };

export type UpdateCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: CourseInput;
}>;


export type UpdateCourseMutation = { __typename?: 'Mutation', updateCourse: { __typename?: 'Course', id: string, title: string } };

export type DeleteSectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSectionMutation = { __typename?: 'Mutation', deleteSection: boolean };

export type DeleteLessonMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLessonMutation = { __typename?: 'Mutation', deleteLesson: boolean };

export type ReorderSectionsMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
  orderedIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type ReorderSectionsMutation = { __typename?: 'Mutation', reorderSections: Array<{ __typename?: 'Section', id: string, order: number }> };

export type ReorderLessonsMutationVariables = Exact<{
  sectionId: Scalars['ID']['input'];
  orderedIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type ReorderLessonsMutation = { __typename?: 'Mutation', reorderLessons: Array<{ __typename?: 'Lesson', id: string, order: number }> };

export type AddMaterialMutationVariables = Exact<{
  input: MaterialInput;
}>;


export type AddMaterialMutation = { __typename?: 'Mutation', addMaterial: { __typename?: 'Material', id: string, type: MaterialType, title: string } };

export type DeleteMaterialMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMaterialMutation = { __typename?: 'Mutation', deleteMaterial: boolean };

export type RequestPairingCodeMutationVariables = Exact<{
  deviceName: Scalars['String']['input'];
  platform?: InputMaybe<DevicePlatform>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
}>;


export type RequestPairingCodeMutation = { __typename?: 'Mutation', requestPairingCode: { __typename?: 'PairingRequest', code: string, secret: string, expiresAt: string } };

export type ClaimDeviceTokenMutationVariables = Exact<{
  code: Scalars['String']['input'];
  secret: Scalars['String']['input'];
}>;


export type ClaimDeviceTokenMutation = { __typename?: 'Mutation', claimDeviceToken: { __typename?: 'DeviceClaim', token: string, session: { __typename?: 'DeviceSession', token: string, refreshToken: string, displayName: string }, device: { __typename?: 'Device', id: string, name: string, platform: DevicePlatform, appVersion: string, lastSeenAt?: string | null, online: boolean, pairedAt: string, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, backupConfiguredAt?: string | null, cloudCopyEnabled: boolean, lastBackupAt?: string | null } } } };

export type ConfirmPairingCodeMutationVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type ConfirmPairingCodeMutation = { __typename?: 'Mutation', confirmPairingCode: { __typename?: 'Device', id: string, name: string, platform: DevicePlatform, pairedAt: string } };

export type MyDevicesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyDevicesQuery = { __typename?: 'Query', myDevices: Array<{ __typename?: 'Device', id: string, name: string, platform: DevicePlatform, appVersion: string, lastSeenAt?: string | null, online: boolean, pairedAt: string, uplink?: { __typename?: 'UplinkAssessment', mbps: number, verdict: UplinkVerdict, groupSize: number, requiredForEight: number, stale: boolean, connectionType: ConnectionType } | null, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, backupConfiguredAt?: string | null, cloudCopyEnabled: boolean, lastBackupAt?: string | null, backupDue: boolean } }> };

export type ThisDeviceQueryVariables = Exact<{ [key: string]: never; }>;


export type ThisDeviceQuery = { __typename?: 'Query', thisDevice: { __typename?: 'Device', id: string, name: string, uplink?: { __typename?: 'UplinkAssessment', mbps: number, verdict: UplinkVerdict, groupSize: number } | null, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, cloudCopyEnabled: boolean } } };

export type RevokeDeviceMutationVariables = Exact<{
  deviceId: Scalars['ID']['input'];
}>;


export type RevokeDeviceMutation = { __typename?: 'Mutation', revokeDevice: boolean };

export type ConfigureCabinetBackupMutationVariables = Exact<{
  kind: BackupKind;
  cloudCopy?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ConfigureCabinetBackupMutation = { __typename?: 'Mutation', configureCabinetBackup: { __typename?: 'Device', id: string, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, backupConfiguredAt?: string | null, cloudCopyEnabled: boolean, lastBackupAt?: string | null, backupDue: boolean } } };

export type ExportCabinetMutationVariables = Exact<{
  passphrase?: InputMaybe<Scalars['String']['input']>;
}>;


export type ExportCabinetMutation = { __typename?: 'Mutation', exportCabinet: { __typename?: 'CabinetBackup', createdAt: string, fileName: string, sealed: boolean, rows: number, files: number, tables: number } };

export type RecordCabinetBackupMutationVariables = Exact<{ [key: string]: never; }>;


export type RecordCabinetBackupMutation = { __typename?: 'Mutation', recordCabinetBackup: { __typename?: 'Device', id: string, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, backupConfiguredAt?: string | null, cloudCopyEnabled: boolean, lastBackupAt?: string | null, backupDue: boolean } } };

export type SetSpeechConsentMutationVariables = Exact<{
  granted: Scalars['Boolean']['input'];
}>;


export type SetSpeechConsentMutation = { __typename?: 'Mutation', setSpeechConsent: boolean };

export type SetAttentionConsentMutationVariables = Exact<{
  granted: Scalars['Boolean']['input'];
}>;


export type SetAttentionConsentMutation = { __typename?: 'Mutation', setAttentionConsent: boolean };

export type ReportUplinkMutationVariables = Exact<{
  mbps: Scalars['Float']['input'];
  connectionType?: InputMaybe<ConnectionType>;
}>;


export type ReportUplinkMutation = { __typename?: 'Mutation', reportUplink: { __typename?: 'Device', id: string, uplink?: { __typename?: 'UplinkAssessment', mbps: number, verdict: UplinkVerdict, groupSize: number, requiredForEight: number, stale: boolean, connectionType: ConnectionType } | null, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, backupConfiguredAt?: string | null, cloudCopyEnabled: boolean, lastBackupAt?: string | null, backupDue: boolean } } };

export type AdvanceDeviceSetupMutationVariables = Exact<{
  step: Scalars['Int']['input'];
}>;


export type AdvanceDeviceSetupMutation = { __typename?: 'Mutation', advanceDeviceSetup: { __typename?: 'Device', id: string, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, backupConfiguredAt?: string | null, cloudCopyEnabled: boolean, lastBackupAt?: string | null, backupDue: boolean } } };

export type CompleteDeviceSetupMutationVariables = Exact<{ [key: string]: never; }>;


export type CompleteDeviceSetupMutation = { __typename?: 'Mutation', completeDeviceSetup: { __typename?: 'Device', id: string, setup: { __typename?: 'DeviceSetup', step: number, completed: boolean, backupKind: BackupKind, backupConfiguredAt?: string | null, cloudCopyEnabled: boolean, lastBackupAt?: string | null, backupDue: boolean } } };

export type HostHeartbeatMutationVariables = Exact<{ [key: string]: never; }>;


export type HostHeartbeatMutation = { __typename?: 'Mutation', hostHeartbeat: { __typename?: 'HostPresence', slug: string, online: boolean } };

export type LookupWordQueryVariables = Exact<{
  lemma: Scalars['String']['input'];
}>;


export type LookupWordQuery = { __typename?: 'Query', lookupWord: Array<{ __typename?: 'LexicalItem', id: string, lemma: string, pos: PartOfSpeech, senseId?: string | null, cefrLevel?: string | null, ipa?: string | null, definitionRu?: string | null, translationRu?: string | null, pronunciationId?: string | null, credit: { __typename?: 'Attribution', source: LexicalSource, license: string, attribution: string, sourceUrl?: string | null }, examples: Array<{ __typename?: 'LexicalExample', id: string, text: string, translationRu?: string | null, credit: { __typename?: 'Attribution', source: LexicalSource, license: string, attribution: string, sourceUrl?: string | null } }> }> };

export type LessonWordsQueryVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type LessonWordsQuery = { __typename?: 'Query', lessonWords: Array<{ __typename?: 'LexicalItem', id: string, lemma: string, pos: PartOfSpeech, senseId?: string | null, cefrLevel?: string | null, ipa?: string | null, definitionRu?: string | null, translationRu?: string | null, pronunciationId?: string | null, credit: { __typename?: 'Attribution', source: LexicalSource, license: string, attribution: string, sourceUrl?: string | null }, examples: Array<{ __typename?: 'LexicalExample', id: string, text: string, translationRu?: string | null, credit: { __typename?: 'Attribution', source: LexicalSource, license: string, attribution: string, sourceUrl?: string | null } }> }> };

export type MyWordsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyWordsQuery = { __typename?: 'Query', myWords: Array<{ __typename?: 'SrsCard', id: string, direction: CardDirection, state: CardState, dueAt: string, reps: number, lapses: number, item: { __typename?: 'LexicalItem', id: string, lemma: string, pos: PartOfSpeech, ipa?: string | null, translationRu?: string | null, credit: { __typename?: 'Attribution', source: LexicalSource, license: string, attribution: string, sourceUrl?: string | null } } }> };

export type ExternalDictionariesQueryVariables = Exact<{ [key: string]: never; }>;


export type ExternalDictionariesQuery = { __typename?: 'Query', externalDictionaries: Array<{ __typename?: 'ExternalDictionary', key: string, name: string, url: string }> };

export type AddWordToMyListMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
}>;


export type AddWordToMyListMutation = { __typename?: 'Mutation', addWordToMyList: { __typename?: 'SrsCard', id: string, state: CardState, dueAt: string } };

export type PutWordOnBoardMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  itemId: Scalars['ID']['input'];
}>;


export type PutWordOnBoardMutation = { __typename?: 'Mutation', putWordOnBoard: string };

export type ShowWordToClassMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  itemId: Scalars['ID']['input'];
}>;


export type ShowWordToClassMutation = { __typename?: 'Mutation', showWordToClass: { __typename?: 'WordShown', sessionId: string, itemId: string, lemma: string } };

export type WordShownSubscriptionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type WordShownSubscription = { __typename?: 'Subscription', wordShown: { __typename?: 'WordShown', sessionId: string, itemId: string, lemma: string } };

export type LessonExerciseSetsQueryVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type LessonExerciseSetsQuery = { __typename?: 'Query', lessonExerciseSets: Array<{ __typename?: 'ExerciseSet', id: string, lessonId: string, title: string, mode: ExerciseMode, homeworkId?: string | null, exercises: Array<{ __typename?: 'Exercise', id: string, kind: ExerciseKind, skill: SkillArea, cefrLevel?: string | null, skillTags: Array<string>, prompt: Record<string, unknown>, payload: Record<string, unknown>, points: number, order: number, assetId?: string | null }> }> };

export type MyExerciseAttemptsQueryVariables = Exact<{
  setId: Scalars['ID']['input'];
}>;


export type MyExerciseAttemptsQuery = { __typename?: 'Query', myAttempts: Array<{ __typename?: 'Attempt', id: string, exerciseId: string, context: AttemptContext, isCorrect?: boolean | null, score: number, createdAt: string }> };

export type SetProgressQueryVariables = Exact<{
  setId: Scalars['ID']['input'];
}>;


export type SetProgressQuery = { __typename?: 'Query', setProgress: { __typename?: 'SetProgress', total: number, answered: number, correct: number } };

export type ExerciseLivePictureQueryVariables = Exact<{
  setId: Scalars['ID']['input'];
}>;


export type ExerciseLivePictureQuery = { __typename?: 'Query', exerciseLivePicture: Array<{ __typename?: 'ExerciseLiveRow', exerciseId: string, answered: number, groupSize: number, correct: number, spread: Record<string, unknown> }> };

export type AnswerExerciseMutationVariables = Exact<{
  exerciseId: Scalars['ID']['input'];
  response: Scalars['JSON']['input'];
  context?: InputMaybe<AttemptContext>;
}>;


export type AnswerExerciseMutation = { __typename?: 'Mutation', answerExercise: { __typename?: 'Attempt', id: string, exerciseId: string, isCorrect?: boolean | null, score: number, createdAt: string } };

export type HandInExerciseSetMutationVariables = Exact<{
  setId: Scalars['ID']['input'];
}>;


export type HandInExerciseSetMutation = { __typename?: 'Mutation', handInExerciseSet: { __typename?: 'HomeworkHandIn', submissionId: string, score?: number | null, autoChecked: number, awaitingTeacher: number } };

export type LessonHomeworkQueryVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type LessonHomeworkQuery = { __typename?: 'Query', lessonHomework: Array<{ __typename?: 'Homework', id: string, title: string, description?: string | null, type: HomeworkType, dueAt?: string | null, allowRedo: boolean, publishedAt?: string | null, submissionStats: { __typename?: 'SubmissionStats', total: number, submitted: number, graded: number, late: number }, viewerSubmission?: { __typename?: 'Submission', id: string, status: SubmissionStatus, score?: number | null, comment?: string | null, attempt: number } | null }> };

export type HomeworkSubmissionsQueryVariables = Exact<{
  homeworkId: Scalars['ID']['input'];
}>;


export type HomeworkSubmissionsQuery = { __typename?: 'Query', homeworkSubmissions: Array<{ __typename?: 'Submission', id: string, attempt: number, status: SubmissionStatus, score?: number | null, comment?: string | null, contentText?: string | null, submittedAt?: string | null, student: { __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, formalName: string, shortName: string, displayName: string } } }> };

export type MySubmissionsQueryVariables = Exact<{
  courseId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type MySubmissionsQuery = { __typename?: 'Query', mySubmissions: Array<{ __typename?: 'Submission', id: string, status: SubmissionStatus, score?: number | null, comment?: string | null, attempt: number, submittedAt?: string | null, homework: { __typename?: 'Homework', id: string, title: string } }> };

export type CreateHomeworkMutationVariables = Exact<{
  input: HomeworkInput;
}>;


export type CreateHomeworkMutation = { __typename?: 'Mutation', createHomework: { __typename?: 'Homework', id: string, title: string, publishedAt?: string | null } };

export type PublishHomeworkMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishHomeworkMutation = { __typename?: 'Mutation', publishHomework: { __typename?: 'Homework', id: string, publishedAt?: string | null } };

export type DeleteHomeworkMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteHomeworkMutation = { __typename?: 'Mutation', deleteHomework: boolean };

export type SubmitHomeworkMutationVariables = Exact<{
  input: SubmitHomeworkInput;
}>;


export type SubmitHomeworkMutation = { __typename?: 'Mutation', submitHomework: { __typename?: 'Submission', id: string, status: SubmissionStatus, attempt: number } };

export type GradeSubmissionMutationVariables = Exact<{
  input: GradeInput;
}>;


export type GradeSubmissionMutation = { __typename?: 'Mutation', gradeSubmission: { __typename?: 'Submission', id: string, status: SubmissionStatus, score?: number | null, comment?: string | null } };

export type ReportAttentionMutationVariables = Exact<{
  input: AttentionInput;
}>;


export type ReportAttentionMutation = { __typename?: 'Mutation', reportAttention: boolean };

export type AttentionUpdatesSubscriptionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type AttentionUpdatesSubscription = { __typename?: 'Subscription', attentionUpdates: { __typename?: 'AttentionMetric', id: string, sessionId: string, studentId: string, bucketStart: string, avgAttention: number, gazeOnScreen?: number | null, eyeOpenness?: number | null, headYaw?: number | null, headPitch?: number | null, alertness?: number | null } };

export type SessionAttentionQueryVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type SessionAttentionQuery = { __typename?: 'Query', sessionAttention: { __typename?: 'AttentionSummary', averageAttention: number, peak: number, low: number, points: Array<{ __typename?: 'AttentionPoint', at: string, value: number }> } };

export type SessionRoomQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SessionRoomQuery = { __typename?: 'Query', session?: { __typename?: 'LessonSession', id: string, status: SessionStatus, startAt: string, roomToken?: string | null, teacherName?: string | null, teacherId?: string | null, lesson: { __typename?: 'Lesson', id: string, title: string } } | null };

export type SessionAttendeesQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SessionAttendeesQuery = { __typename?: 'Query', session?: { __typename?: 'LessonSession', id: string, attendance: Array<{ __typename?: 'Attendance', student: { __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string, formalName: string, shortName: string, displayName: string } } }> } | null };

export type CreateProjectorCodeMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type CreateProjectorCodeMutation = { __typename?: 'Mutation', createProjectorCode: { __typename?: 'ProjectorCast', code: string, expiresAt: string, sessionId: string } };

export type RedeemProjectorCodeMutationVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type RedeemProjectorCodeMutation = { __typename?: 'Mutation', redeemProjectorCode: { __typename?: 'ProjectorJoin', sessionId: string, lessonTitle: string, roomToken: string } };

export type SetProjectorFocusMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  studentId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type SetProjectorFocusMutation = { __typename?: 'Mutation', setProjectorFocus: { __typename?: 'ProjectorFocus', sessionId: string, studentId?: string | null } };

export type ProjectorFocusChangedSubscriptionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type ProjectorFocusChangedSubscription = { __typename?: 'Subscription', projectorFocusChanged: { __typename?: 'ProjectorFocus', sessionId: string, studentId?: string | null } };

export type MeetingPointQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type MeetingPointQuery = { __typename?: 'Query', meetingPoint: { __typename?: 'MeetingPointView', slug: string, decision: JoinDecision, groupName: string, teacherName: string, hostOnline: boolean, nextLesson?: { __typename?: 'UpcomingLesson', sessionId: string, title: string, startAt: string, isLive: boolean } | null, capabilities: { __typename?: 'OfflineCapabilities', schedule: boolean, chat: boolean, homework: boolean, myWork: boolean, myGrades: boolean, mySummaries: boolean, myDiary: boolean, myBoards: boolean, myMaterials: boolean, lessonMaterials: boolean, liveBoard: boolean, room: boolean } } };

export type MeetingPointByCodeQueryVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type MeetingPointByCodeQuery = { __typename?: 'Query', meetingPointByCode: { __typename?: 'MeetingPointView', slug: string, decision: JoinDecision, groupName: string, teacherName: string, hostOnline: boolean, nextLesson?: { __typename?: 'UpcomingLesson', sessionId: string, title: string, startAt: string, isLive: boolean } | null, capabilities: { __typename?: 'OfflineCapabilities', schedule: boolean, chat: boolean, homework: boolean, myWork: boolean, myGrades: boolean, mySummaries: boolean, myDiary: boolean, myBoards: boolean, myMaterials: boolean, lessonMaterials: boolean, liveBoard: boolean, room: boolean } } };

export type GroupMeetingPointQueryVariables = Exact<{
  groupId: Scalars['ID']['input'];
}>;


export type GroupMeetingPointQuery = { __typename?: 'Query', groupMeetingPoint: { __typename?: 'MeetingPoint', groupId: string, slug: string, code: string, accessMode: MeetingAccessMode, hostOnline: boolean, nextLesson?: { __typename?: 'UpcomingLesson', sessionId: string, title: string, startAt: string, isLive: boolean } | null } };

export type MeetingParticipantsQueryVariables = Exact<{
  groupId: Scalars['ID']['input'];
}>;


export type MeetingParticipantsQuery = { __typename?: 'Query', meetingParticipants: Array<{ __typename?: 'MeetingParticipant', studentId: string, name: string, state: ParticipantState, since?: string | null }> };

export type SetMeetingAccessMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  mode: MeetingAccessMode;
}>;


export type SetMeetingAccessMutation = { __typename?: 'Mutation', setMeetingAccess: { __typename?: 'MeetingPoint', groupId: string, slug: string, code: string, accessMode: MeetingAccessMode, hostOnline: boolean } };

export type ReplaceMeetingLinkMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
}>;


export type ReplaceMeetingLinkMutation = { __typename?: 'Mutation', replaceMeetingLink: { __typename?: 'MeetingPoint', groupId: string, slug: string, code: string, accessMode: MeetingAccessMode, hostOnline: boolean } };

export type MyMirrorQueryVariables = Exact<{
  kind?: InputMaybe<MirrorKind>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyMirrorQuery = { __typename?: 'Query', myMirror: Array<{ __typename?: 'MirroredRecord', id: string, kind: MirrorKind, sourceId: string, occurredAt: string, payload: Record<string, unknown> }> };

export type MyRepetitionQueueQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyRepetitionQueueQuery = { __typename?: 'Query', myRepetitionQueue: Array<{ __typename?: 'DueCard', id: string, direction: CardDirection, state: CardState, stability: number, difficulty: number, dueAt: string, lastReviewAt?: string | null, reps: number, lapses: number, learningSteps: number, item: { __typename?: 'LexicalItem', id: string, lemma: string, pos: PartOfSpeech, ipa?: string | null, definitionRu?: string | null, translationRu?: string | null, credit: { __typename?: 'Attribution', source: LexicalSource, license: string, attribution: string, sourceUrl?: string | null }, examples: Array<{ __typename?: 'LexicalExample', id: string, text: string, translationRu?: string | null, credit: { __typename?: 'Attribution', source: LexicalSource, license: string, attribution: string, sourceUrl?: string | null } }> } }> };

export type MyRepetitionProgressQueryVariables = Exact<{ [key: string]: never; }>;


export type MyRepetitionProgressQuery = { __typename?: 'Query', myRepetitionProgress: { __typename?: 'RepetitionProgress', total: number, due: number, learning: number, mastered: number, reviews: number, currentStreak: number, longestStreak: number } };

export type MyAchievementsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyAchievementsQuery = { __typename?: 'Query', myAchievements: Array<{ __typename?: 'Achievement', key: AchievementKey, earnedAt: string }> };

export type ReviewWordMutationVariables = Exact<{
  cardId: Scalars['ID']['input'];
  rating: ReviewRating;
  stability: Scalars['Float']['input'];
  difficulty: Scalars['Float']['input'];
  dueAt: Scalars['DateTime']['input'];
  state: CardState;
  learningSteps?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ReviewWordMutation = { __typename?: 'Mutation', reviewWord: { __typename?: 'DueCard', id: string, direction: CardDirection, state: CardState, stability: number, difficulty: number, dueAt: string, lastReviewAt?: string | null, reps: number, lapses: number, learningSteps: number } };

export type MyScheduleQueryVariables = Exact<{
  from: Scalars['DateTime']['input'];
  to: Scalars['DateTime']['input'];
}>;


export type MyScheduleQuery = { __typename?: 'Query', mySchedule: Array<{ __typename?: 'LessonSession', id: string, startAt: string, endAt?: string | null, status: SessionStatus, courseId: string, courseTitle: string, lesson: { __typename?: 'Lesson', id: string, title: string } }> };

export type ScheduleSessionMutationVariables = Exact<{
  input: ScheduleSessionInput;
}>;


export type ScheduleSessionMutation = { __typename?: 'Mutation', scheduleSession: { __typename?: 'LessonSession', id: string, startAt: string, status: SessionStatus } };

export type StartSessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type StartSessionMutation = { __typename?: 'Mutation', startSession: { __typename?: 'LessonSession', id: string, status: SessionStatus } };

export type EndSessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type EndSessionMutation = { __typename?: 'Mutation', endSession: { __typename?: 'LessonSession', id: string, status: SessionStatus } };

export type JoinSessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type JoinSessionMutation = { __typename?: 'Mutation', joinSession: { __typename?: 'SessionJoin', roomToken: string, session: { __typename?: 'LessonSession', id: string, status: SessionStatus } } };

export type StartPageQueryVariables = Exact<{ [key: string]: never; }>;


export type StartPageQuery = { __typename?: 'Query', startPage: { __typename?: 'StartPage', profile?: { __typename?: 'LearningProfile', id: string, kind: LearningProfileKind, institutionName?: string | null, groupName?: string | null, courseTitle?: string | null, courseCount: number } | null, now?: { __typename?: 'StartEntry', id: string, kind: StartEntryKind, title: string, courseTitle?: string | null, teacherName?: string | null, at?: string | null, count?: number | null, ageDays?: number | null, sessionId?: string | null, lessonId?: string | null, courseId?: string | null, isLive: boolean } | null, today: Array<{ __typename?: 'StartEntry', id: string, kind: StartEntryKind, title: string, courseTitle?: string | null, teacherName?: string | null, at?: string | null, isLive: boolean, sessionId?: string | null, lessonId?: string | null }>, attention: Array<{ __typename?: 'StartEntry', id: string, kind: StartEntryKind, title: string, courseTitle?: string | null, at?: string | null, count?: number | null, ageDays?: number | null, lessonId?: string | null }>, week: Array<{ __typename?: 'StartDay', date: any, isToday: boolean, entries: Array<{ __typename?: 'StartEntry', id: string, kind: StartEntryKind, title: string, at?: string | null, isLive: boolean }> }>, continueEntries: Array<{ __typename?: 'StartEntry', id: string, kind: StartEntryKind, title: string, courseTitle?: string | null, lessonId?: string | null, courseId?: string | null }>, progress: Array<{ __typename?: 'StartProgress', courseId: string, courseTitle: string, doneLessons: number, totalLessons: number, progressPct: number }>, teaching: Array<{ __typename?: 'StartCourse', courseId: string, title: string, subject: string, sectionCount: number, lessonCount: number, publishedLessons: number, studentCount: number, isDraft: boolean, nextAt?: string | null, nextLessonTitle?: string | null }> } };

export type SubjectCabinetQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type SubjectCabinetQuery = { __typename?: 'Query', subjectCabinet: { __typename?: 'SubjectCabinet', courseId: string, title: string, profileKind: LearningProfileKind, institutionName?: string | null, groupName?: string | null, teacherName?: string | null, teacherId?: string | null, lessonCount: number, studentCount?: number | null, progressPct: number, gradingScale: GradingScale, sections: Array<{ __typename?: 'SubjectSection', id: string, title: string, doneLessons: number, totalLessons: number, lessons: Array<{ __typename?: 'SubjectLesson', id: string, title: string, subtitle?: string | null, progress: LessonProgress, kind: LessonKind, deviceKey?: string | null, orderLabel: string, materialCount: number, hasHomework: boolean, sessionId?: string | null, sessionAt?: string | null, isLive: boolean, grade?: number | null, completedBy?: number | null, groupSize?: number | null }> }>, materials: Array<{ __typename?: 'SubjectMaterial', id: string, title: string, subtitle?: string | null, type?: MaterialType | null, url?: string | null, fromLabel?: string | null, lessonId?: string | null, savedId?: string | null, note?: string | null, savedKind?: SavedItemKind | null }>, savedMaterials: Array<{ __typename?: 'SubjectMaterial', id: string, title: string, subtitle?: string | null, type?: MaterialType | null, url?: string | null, fromLabel?: string | null, lessonId?: string | null, savedId?: string | null, note?: string | null, savedKind?: SavedItemKind | null }>, sources: Array<{ __typename?: 'SubjectSource', id: string, name: string, sourceName?: string | null, url?: string | null, note?: string | null, inLesson: boolean, savedId?: string | null }>, nextLesson?: { __typename?: 'SubjectLesson', id: string, title: string, subtitle?: string | null, progress: LessonProgress, kind: LessonKind, deviceKey?: string | null, orderLabel: string, materialCount: number, hasHomework: boolean, sessionId?: string | null, sessionAt?: string | null, isLive: boolean, grade?: number | null, completedBy?: number | null, groupSize?: number | null } | null } };

export type SaveItemMutationVariables = Exact<{
  input: SaveItemInput;
}>;


export type SaveItemMutation = { __typename?: 'Mutation', saveItem: { __typename?: 'SubjectMaterial', id: string, title: string, savedId?: string | null, note?: string | null, savedKind?: SavedItemKind | null } };

export type RemoveSavedItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveSavedItemMutation = { __typename?: 'Mutation', removeSavedItem: boolean };

export type SubjectTasksQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type SubjectTasksQuery = { __typename?: 'Query', subjectTasks: Array<{ __typename?: 'SubjectTask', id: string, title: string, lessonId?: string | null, lessonLabel?: string | null, dueAt?: string | null, state: TaskState, submittedAt?: string | null, score?: number | null, comment?: string | null, attempts: number, redoOpen: boolean, submittedBy?: number | null, groupSize?: number | null, gradedCount?: number | null, waitingCount?: number | null, staleCount?: number | null, retakeCount?: number | null }> };

export type SubjectProgressQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type SubjectProgressQuery = { __typename?: 'Query', subjectProgress: { __typename?: 'SubjectProgress', profileKind: LearningProfileKind, overallPct?: number | null, previousOverallPct?: number | null, weakBelowPct: number, topics: Array<{ __typename?: 'SubjectTopic', id: string, title: string, lessonFrom?: string | null, lessonTo?: string | null, isCurrent: boolean, pct?: number | null, previousPct?: number | null, weakCount?: number | null, learnerCount?: number | null }> } };

export type LessonSummaryQueryVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type LessonSummaryQuery = { __typename?: 'Query', lessonSummary?: { __typename?: 'LessonSummary', id: string, sessionId: string, status: SummaryStatus, intro: string, assembledAt?: string | null, sentAt?: string | null, speechOmitted: boolean, canEdit: boolean, items: Array<{ __typename?: 'SummaryItem', id: string, section: SummarySection, source: SummarySource, sourceMeta: Record<string, unknown>, atOffsetSec?: number | null, text: string, authorId?: string | null, authorName: string, dueAt?: string | null, homeworkId?: string | null, edited: boolean }> } | null };

export type LessonChatQueryVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type LessonChatQuery = { __typename?: 'Query', lessonChat: Array<{ __typename?: 'ChatMessage', id: string, sessionId: string, senderId: string, senderName: string, text: string, sentAt: string }> };

export type AssembleLessonSummaryMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type AssembleLessonSummaryMutation = { __typename?: 'Mutation', assembleLessonSummary: { __typename?: 'LessonSummary', id: string, status: SummaryStatus, speechOmitted: boolean, assembledAt?: string | null, canEdit: boolean, items: Array<{ __typename?: 'SummaryItem', id: string, section: SummarySection, source: SummarySource, sourceMeta: Record<string, unknown>, atOffsetSec?: number | null, text: string, authorId?: string | null, authorName: string, dueAt?: string | null, homeworkId?: string | null, edited: boolean }> } };

export type UpdateSummaryItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
}>;


export type UpdateSummaryItemMutation = { __typename?: 'Mutation', updateSummaryItem: { __typename?: 'SummaryItem', id: string, text: string, edited: boolean } };

export type RemoveSummaryItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
}>;


export type RemoveSummaryItemMutation = { __typename?: 'Mutation', removeSummaryItem: boolean };

export type AddSummaryItemMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  section: SummarySection;
  text: Scalars['String']['input'];
}>;


export type AddSummaryItemMutation = { __typename?: 'Mutation', addSummaryItem: { __typename?: 'SummaryItem', id: string, section: SummarySection, source: SummarySource, text: string, edited: boolean } };

export type SendLessonSummaryMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type SendLessonSummaryMutation = { __typename?: 'Mutation', sendLessonSummary: { __typename?: 'LessonSummary', id: string, status: SummaryStatus, sentAt?: string | null } };

export type SendChatMessageMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
}>;


export type SendChatMessageMutation = { __typename?: 'Mutation', sendChatMessage: { __typename?: 'ChatMessage', id: string, sessionId: string, senderId: string, senderName: string, text: string, sentAt: string } };

export type RequestUploadMutationVariables = Exact<{
  input: UploadRequestInput;
}>;


export type RequestUploadMutation = { __typename?: 'Mutation', requestUpload: { __typename?: 'UploadTicket', uploadUrl: string, fileKey: string, expiresAt: string } };

export type UploadPolicyQueryVariables = Exact<{
  purpose: UploadPurpose;
}>;


export type UploadPolicyQuery = { __typename?: 'Query', uploadPolicy: { __typename?: 'UploadPolicy', purpose: UploadPurpose, maxBytes: number, contentTypes: Array<string> } };


export const AdminInstitutionDocument = gql`
    query AdminInstitution {
  me {
    id
    adminProfile {
      institution {
        id
        name
        address
        website
        subdomain
        status
        defaultLocale
        branding
        logoUrl
      }
    }
  }
}
    `;

/**
 * __useAdminInstitutionQuery__
 *
 * To run a query within a React component, call `useAdminInstitutionQuery` and pass it any options that fit your needs.
 * When your component renders, `useAdminInstitutionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAdminInstitutionQuery({
 *   variables: {
 *   },
 * });
 */
export function useAdminInstitutionQuery(baseOptions?: Apollo.QueryHookOptions<AdminInstitutionQuery, AdminInstitutionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AdminInstitutionQuery, AdminInstitutionQueryVariables>(AdminInstitutionDocument, options);
      }
export function useAdminInstitutionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AdminInstitutionQuery, AdminInstitutionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AdminInstitutionQuery, AdminInstitutionQueryVariables>(AdminInstitutionDocument, options);
        }
// @ts-ignore
export function useAdminInstitutionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AdminInstitutionQuery, AdminInstitutionQueryVariables>): Apollo.UseSuspenseQueryResult<AdminInstitutionQuery, AdminInstitutionQueryVariables>;
export function useAdminInstitutionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AdminInstitutionQuery, AdminInstitutionQueryVariables>): Apollo.UseSuspenseQueryResult<AdminInstitutionQuery | undefined, AdminInstitutionQueryVariables>;
export function useAdminInstitutionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AdminInstitutionQuery, AdminInstitutionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AdminInstitutionQuery, AdminInstitutionQueryVariables>(AdminInstitutionDocument, options);
        }
export type AdminInstitutionQueryHookResult = ReturnType<typeof useAdminInstitutionQuery>;
export type AdminInstitutionLazyQueryHookResult = ReturnType<typeof useAdminInstitutionLazyQuery>;
export type AdminInstitutionSuspenseQueryHookResult = ReturnType<typeof useAdminInstitutionSuspenseQuery>;
export type AdminInstitutionQueryResult = Apollo.QueryResult<AdminInstitutionQuery, AdminInstitutionQueryVariables>;
export const InstitutionGroupsDocument = gql`
    query InstitutionGroups($institutionId: ID!) {
  groups(institutionId: $institutionId) {
    id
    name
    level
    students {
      user {
        id
        firstName
        lastName
        displayName
        shortName
        fullName
      }
    }
    teachers {
      id
      subject
      teacher {
        user {
          id
          firstName
          lastName
          displayName
          shortName
          fullName
        }
      }
    }
  }
}
    `;

/**
 * __useInstitutionGroupsQuery__
 *
 * To run a query within a React component, call `useInstitutionGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstitutionGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstitutionGroupsQuery({
 *   variables: {
 *      institutionId: // value for 'institutionId'
 *   },
 * });
 */
export function useInstitutionGroupsQuery(baseOptions: Apollo.QueryHookOptions<InstitutionGroupsQuery, InstitutionGroupsQueryVariables> & ({ variables: InstitutionGroupsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>(InstitutionGroupsDocument, options);
      }
export function useInstitutionGroupsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>(InstitutionGroupsDocument, options);
        }
// @ts-ignore
export function useInstitutionGroupsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>): Apollo.UseSuspenseQueryResult<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>;
export function useInstitutionGroupsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>): Apollo.UseSuspenseQueryResult<InstitutionGroupsQuery | undefined, InstitutionGroupsQueryVariables>;
export function useInstitutionGroupsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>(InstitutionGroupsDocument, options);
        }
export type InstitutionGroupsQueryHookResult = ReturnType<typeof useInstitutionGroupsQuery>;
export type InstitutionGroupsLazyQueryHookResult = ReturnType<typeof useInstitutionGroupsLazyQuery>;
export type InstitutionGroupsSuspenseQueryHookResult = ReturnType<typeof useInstitutionGroupsSuspenseQuery>;
export type InstitutionGroupsQueryResult = Apollo.QueryResult<InstitutionGroupsQuery, InstitutionGroupsQueryVariables>;
export const InstitutionMembersDocument = gql`
    query InstitutionMembers($institutionId: ID!, $role: MembershipRole) {
  institutionMembers(institutionId: $institutionId, role: $role) {
    id
    role
    status
    joinedAt
    user {
      id
      firstName
      lastName
      displayName
      shortName
      fullName
      email
    }
  }
}
    `;

/**
 * __useInstitutionMembersQuery__
 *
 * To run a query within a React component, call `useInstitutionMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstitutionMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstitutionMembersQuery({
 *   variables: {
 *      institutionId: // value for 'institutionId'
 *      role: // value for 'role'
 *   },
 * });
 */
export function useInstitutionMembersQuery(baseOptions: Apollo.QueryHookOptions<InstitutionMembersQuery, InstitutionMembersQueryVariables> & ({ variables: InstitutionMembersQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstitutionMembersQuery, InstitutionMembersQueryVariables>(InstitutionMembersDocument, options);
      }
export function useInstitutionMembersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionMembersQuery, InstitutionMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstitutionMembersQuery, InstitutionMembersQueryVariables>(InstitutionMembersDocument, options);
        }
// @ts-ignore
export function useInstitutionMembersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<InstitutionMembersQuery, InstitutionMembersQueryVariables>): Apollo.UseSuspenseQueryResult<InstitutionMembersQuery, InstitutionMembersQueryVariables>;
export function useInstitutionMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InstitutionMembersQuery, InstitutionMembersQueryVariables>): Apollo.UseSuspenseQueryResult<InstitutionMembersQuery | undefined, InstitutionMembersQueryVariables>;
export function useInstitutionMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InstitutionMembersQuery, InstitutionMembersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InstitutionMembersQuery, InstitutionMembersQueryVariables>(InstitutionMembersDocument, options);
        }
export type InstitutionMembersQueryHookResult = ReturnType<typeof useInstitutionMembersQuery>;
export type InstitutionMembersLazyQueryHookResult = ReturnType<typeof useInstitutionMembersLazyQuery>;
export type InstitutionMembersSuspenseQueryHookResult = ReturnType<typeof useInstitutionMembersSuspenseQuery>;
export type InstitutionMembersQueryResult = Apollo.QueryResult<InstitutionMembersQuery, InstitutionMembersQueryVariables>;
export const UpdateInstitutionDocument = gql`
    mutation UpdateInstitution($id: ID!, $input: InstitutionInput!) {
  updateInstitution(id: $id, input: $input) {
    id
    name
    address
    website
  }
}
    `;
export type UpdateInstitutionMutationFn = Apollo.MutationFunction<UpdateInstitutionMutation, UpdateInstitutionMutationVariables>;

/**
 * __useUpdateInstitutionMutation__
 *
 * To run a mutation, you first call `useUpdateInstitutionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateInstitutionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateInstitutionMutation, { data, loading, error }] = useUpdateInstitutionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateInstitutionMutation(baseOptions?: Apollo.MutationHookOptions<UpdateInstitutionMutation, UpdateInstitutionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateInstitutionMutation, UpdateInstitutionMutationVariables>(UpdateInstitutionDocument, options);
      }
export type UpdateInstitutionMutationHookResult = ReturnType<typeof useUpdateInstitutionMutation>;
export type UpdateInstitutionMutationResult = Apollo.MutationResult<UpdateInstitutionMutation>;
export type UpdateInstitutionMutationOptions = Apollo.BaseMutationOptions<UpdateInstitutionMutation, UpdateInstitutionMutationVariables>;
export const UpdateBrandingDocument = gql`
    mutation UpdateBranding($institutionId: ID!, $branding: JSON!) {
  updateBranding(institutionId: $institutionId, branding: $branding) {
    id
    branding
  }
}
    `;
export type UpdateBrandingMutationFn = Apollo.MutationFunction<UpdateBrandingMutation, UpdateBrandingMutationVariables>;

/**
 * __useUpdateBrandingMutation__
 *
 * To run a mutation, you first call `useUpdateBrandingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBrandingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBrandingMutation, { data, loading, error }] = useUpdateBrandingMutation({
 *   variables: {
 *      institutionId: // value for 'institutionId'
 *      branding: // value for 'branding'
 *   },
 * });
 */
export function useUpdateBrandingMutation(baseOptions?: Apollo.MutationHookOptions<UpdateBrandingMutation, UpdateBrandingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateBrandingMutation, UpdateBrandingMutationVariables>(UpdateBrandingDocument, options);
      }
export type UpdateBrandingMutationHookResult = ReturnType<typeof useUpdateBrandingMutation>;
export type UpdateBrandingMutationResult = Apollo.MutationResult<UpdateBrandingMutation>;
export type UpdateBrandingMutationOptions = Apollo.BaseMutationOptions<UpdateBrandingMutation, UpdateBrandingMutationVariables>;
export const InviteMemberDocument = gql`
    mutation InviteMember($input: InviteInput!) {
  inviteMember(input: $input) {
    id
    role
    status
    user {
      id
      firstName
      lastName
      displayName
      shortName
      fullName
      email
    }
  }
}
    `;
export type InviteMemberMutationFn = Apollo.MutationFunction<InviteMemberMutation, InviteMemberMutationVariables>;

/**
 * __useInviteMemberMutation__
 *
 * To run a mutation, you first call `useInviteMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInviteMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [inviteMemberMutation, { data, loading, error }] = useInviteMemberMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useInviteMemberMutation(baseOptions?: Apollo.MutationHookOptions<InviteMemberMutation, InviteMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<InviteMemberMutation, InviteMemberMutationVariables>(InviteMemberDocument, options);
      }
export type InviteMemberMutationHookResult = ReturnType<typeof useInviteMemberMutation>;
export type InviteMemberMutationResult = Apollo.MutationResult<InviteMemberMutation>;
export type InviteMemberMutationOptions = Apollo.BaseMutationOptions<InviteMemberMutation, InviteMemberMutationVariables>;
export const UpdateMembershipDocument = gql`
    mutation UpdateMembership($id: ID!, $role: MembershipRole, $status: MembershipStatus) {
  updateMembership(id: $id, role: $role, status: $status) {
    id
    role
    status
  }
}
    `;
export type UpdateMembershipMutationFn = Apollo.MutationFunction<UpdateMembershipMutation, UpdateMembershipMutationVariables>;

/**
 * __useUpdateMembershipMutation__
 *
 * To run a mutation, you first call `useUpdateMembershipMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMembershipMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMembershipMutation, { data, loading, error }] = useUpdateMembershipMutation({
 *   variables: {
 *      id: // value for 'id'
 *      role: // value for 'role'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useUpdateMembershipMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMembershipMutation, UpdateMembershipMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMembershipMutation, UpdateMembershipMutationVariables>(UpdateMembershipDocument, options);
      }
export type UpdateMembershipMutationHookResult = ReturnType<typeof useUpdateMembershipMutation>;
export type UpdateMembershipMutationResult = Apollo.MutationResult<UpdateMembershipMutation>;
export type UpdateMembershipMutationOptions = Apollo.BaseMutationOptions<UpdateMembershipMutation, UpdateMembershipMutationVariables>;
export const RemoveMemberDocument = gql`
    mutation RemoveMember($id: ID!) {
  removeMember(id: $id)
}
    `;
export type RemoveMemberMutationFn = Apollo.MutationFunction<RemoveMemberMutation, RemoveMemberMutationVariables>;

/**
 * __useRemoveMemberMutation__
 *
 * To run a mutation, you first call `useRemoveMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeMemberMutation, { data, loading, error }] = useRemoveMemberMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveMemberMutation(baseOptions?: Apollo.MutationHookOptions<RemoveMemberMutation, RemoveMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveMemberMutation, RemoveMemberMutationVariables>(RemoveMemberDocument, options);
      }
export type RemoveMemberMutationHookResult = ReturnType<typeof useRemoveMemberMutation>;
export type RemoveMemberMutationResult = Apollo.MutationResult<RemoveMemberMutation>;
export type RemoveMemberMutationOptions = Apollo.BaseMutationOptions<RemoveMemberMutation, RemoveMemberMutationVariables>;
export const CreateGroupDocument = gql`
    mutation CreateGroup($input: GroupInput!) {
  createGroup(input: $input) {
    id
    name
    level
  }
}
    `;
export type CreateGroupMutationFn = Apollo.MutationFunction<CreateGroupMutation, CreateGroupMutationVariables>;

/**
 * __useCreateGroupMutation__
 *
 * To run a mutation, you first call `useCreateGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGroupMutation, { data, loading, error }] = useCreateGroupMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGroupMutation(baseOptions?: Apollo.MutationHookOptions<CreateGroupMutation, CreateGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGroupMutation, CreateGroupMutationVariables>(CreateGroupDocument, options);
      }
export type CreateGroupMutationHookResult = ReturnType<typeof useCreateGroupMutation>;
export type CreateGroupMutationResult = Apollo.MutationResult<CreateGroupMutation>;
export type CreateGroupMutationOptions = Apollo.BaseMutationOptions<CreateGroupMutation, CreateGroupMutationVariables>;
export const AddStudentsToGroupDocument = gql`
    mutation AddStudentsToGroup($groupId: ID!, $studentIds: [ID!]!) {
  addStudentsToGroup(groupId: $groupId, studentIds: $studentIds) {
    id
    students {
      user {
        id
        firstName
        lastName
        displayName
        shortName
        fullName
      }
    }
  }
}
    `;
export type AddStudentsToGroupMutationFn = Apollo.MutationFunction<AddStudentsToGroupMutation, AddStudentsToGroupMutationVariables>;

/**
 * __useAddStudentsToGroupMutation__
 *
 * To run a mutation, you first call `useAddStudentsToGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddStudentsToGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addStudentsToGroupMutation, { data, loading, error }] = useAddStudentsToGroupMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      studentIds: // value for 'studentIds'
 *   },
 * });
 */
export function useAddStudentsToGroupMutation(baseOptions?: Apollo.MutationHookOptions<AddStudentsToGroupMutation, AddStudentsToGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddStudentsToGroupMutation, AddStudentsToGroupMutationVariables>(AddStudentsToGroupDocument, options);
      }
export type AddStudentsToGroupMutationHookResult = ReturnType<typeof useAddStudentsToGroupMutation>;
export type AddStudentsToGroupMutationResult = Apollo.MutationResult<AddStudentsToGroupMutation>;
export type AddStudentsToGroupMutationOptions = Apollo.BaseMutationOptions<AddStudentsToGroupMutation, AddStudentsToGroupMutationVariables>;
export const RemoveStudentFromGroupDocument = gql`
    mutation RemoveStudentFromGroup($groupId: ID!, $studentId: ID!) {
  removeStudentFromGroup(groupId: $groupId, studentId: $studentId) {
    id
    students {
      user {
        id
        firstName
        lastName
        displayName
        shortName
        fullName
      }
    }
  }
}
    `;
export type RemoveStudentFromGroupMutationFn = Apollo.MutationFunction<RemoveStudentFromGroupMutation, RemoveStudentFromGroupMutationVariables>;

/**
 * __useRemoveStudentFromGroupMutation__
 *
 * To run a mutation, you first call `useRemoveStudentFromGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveStudentFromGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeStudentFromGroupMutation, { data, loading, error }] = useRemoveStudentFromGroupMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      studentId: // value for 'studentId'
 *   },
 * });
 */
export function useRemoveStudentFromGroupMutation(baseOptions?: Apollo.MutationHookOptions<RemoveStudentFromGroupMutation, RemoveStudentFromGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveStudentFromGroupMutation, RemoveStudentFromGroupMutationVariables>(RemoveStudentFromGroupDocument, options);
      }
export type RemoveStudentFromGroupMutationHookResult = ReturnType<typeof useRemoveStudentFromGroupMutation>;
export type RemoveStudentFromGroupMutationResult = Apollo.MutationResult<RemoveStudentFromGroupMutation>;
export type RemoveStudentFromGroupMutationOptions = Apollo.BaseMutationOptions<RemoveStudentFromGroupMutation, RemoveStudentFromGroupMutationVariables>;
export const AssignTeacherDocument = gql`
    mutation AssignTeacher($groupId: ID!, $teacherId: ID!, $subject: String!) {
  assignTeacher(groupId: $groupId, teacherId: $teacherId, subject: $subject) {
    id
    subject
    teacher {
      user {
        id
        firstName
        lastName
        displayName
        shortName
        fullName
      }
    }
  }
}
    `;
export type AssignTeacherMutationFn = Apollo.MutationFunction<AssignTeacherMutation, AssignTeacherMutationVariables>;

/**
 * __useAssignTeacherMutation__
 *
 * To run a mutation, you first call `useAssignTeacherMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssignTeacherMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [assignTeacherMutation, { data, loading, error }] = useAssignTeacherMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      teacherId: // value for 'teacherId'
 *      subject: // value for 'subject'
 *   },
 * });
 */
export function useAssignTeacherMutation(baseOptions?: Apollo.MutationHookOptions<AssignTeacherMutation, AssignTeacherMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AssignTeacherMutation, AssignTeacherMutationVariables>(AssignTeacherDocument, options);
      }
export type AssignTeacherMutationHookResult = ReturnType<typeof useAssignTeacherMutation>;
export type AssignTeacherMutationResult = Apollo.MutationResult<AssignTeacherMutation>;
export type AssignTeacherMutationOptions = Apollo.BaseMutationOptions<AssignTeacherMutation, AssignTeacherMutationVariables>;
export const VerificationQueueDocument = gql`
    query VerificationQueue {
  verificationQueue {
    teacherUserId
    fullName
    email
    specialty
    education
    submittedAt
    courseCount
    sessionCount
    documents {
      id
      filename
      sizeBytes
      createdAt
    }
  }
}
    `;

/**
 * __useVerificationQueueQuery__
 *
 * To run a query within a React component, call `useVerificationQueueQuery` and pass it any options that fit your needs.
 * When your component renders, `useVerificationQueueQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVerificationQueueQuery({
 *   variables: {
 *   },
 * });
 */
export function useVerificationQueueQuery(baseOptions?: Apollo.QueryHookOptions<VerificationQueueQuery, VerificationQueueQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<VerificationQueueQuery, VerificationQueueQueryVariables>(VerificationQueueDocument, options);
      }
export function useVerificationQueueLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<VerificationQueueQuery, VerificationQueueQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<VerificationQueueQuery, VerificationQueueQueryVariables>(VerificationQueueDocument, options);
        }
// @ts-ignore
export function useVerificationQueueSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<VerificationQueueQuery, VerificationQueueQueryVariables>): Apollo.UseSuspenseQueryResult<VerificationQueueQuery, VerificationQueueQueryVariables>;
export function useVerificationQueueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<VerificationQueueQuery, VerificationQueueQueryVariables>): Apollo.UseSuspenseQueryResult<VerificationQueueQuery | undefined, VerificationQueueQueryVariables>;
export function useVerificationQueueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<VerificationQueueQuery, VerificationQueueQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<VerificationQueueQuery, VerificationQueueQueryVariables>(VerificationQueueDocument, options);
        }
export type VerificationQueueQueryHookResult = ReturnType<typeof useVerificationQueueQuery>;
export type VerificationQueueLazyQueryHookResult = ReturnType<typeof useVerificationQueueLazyQuery>;
export type VerificationQueueSuspenseQueryHookResult = ReturnType<typeof useVerificationQueueSuspenseQuery>;
export type VerificationQueueQueryResult = Apollo.QueryResult<VerificationQueueQuery, VerificationQueueQueryVariables>;
export const VerificationDocumentUrlDocument = gql`
    query VerificationDocumentUrl($id: ID!) {
  verificationDocumentUrl(id: $id)
}
    `;

/**
 * __useVerificationDocumentUrlQuery__
 *
 * To run a query within a React component, call `useVerificationDocumentUrlQuery` and pass it any options that fit your needs.
 * When your component renders, `useVerificationDocumentUrlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVerificationDocumentUrlQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useVerificationDocumentUrlQuery(baseOptions: Apollo.QueryHookOptions<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables> & ({ variables: VerificationDocumentUrlQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>(VerificationDocumentUrlDocument, options);
      }
export function useVerificationDocumentUrlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>(VerificationDocumentUrlDocument, options);
        }
// @ts-ignore
export function useVerificationDocumentUrlSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>): Apollo.UseSuspenseQueryResult<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>;
export function useVerificationDocumentUrlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>): Apollo.UseSuspenseQueryResult<VerificationDocumentUrlQuery | undefined, VerificationDocumentUrlQueryVariables>;
export function useVerificationDocumentUrlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>(VerificationDocumentUrlDocument, options);
        }
export type VerificationDocumentUrlQueryHookResult = ReturnType<typeof useVerificationDocumentUrlQuery>;
export type VerificationDocumentUrlLazyQueryHookResult = ReturnType<typeof useVerificationDocumentUrlLazyQuery>;
export type VerificationDocumentUrlSuspenseQueryHookResult = ReturnType<typeof useVerificationDocumentUrlSuspenseQuery>;
export type VerificationDocumentUrlQueryResult = Apollo.QueryResult<VerificationDocumentUrlQuery, VerificationDocumentUrlQueryVariables>;
export const OversightLogDocument = gql`
    query OversightLog($limit: Int) {
  oversightLog(limit: $limit) {
    id
    action
    actorName
    subjectName
    objectLabel
    reason
    at
  }
}
    `;

/**
 * __useOversightLogQuery__
 *
 * To run a query within a React component, call `useOversightLogQuery` and pass it any options that fit your needs.
 * When your component renders, `useOversightLogQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOversightLogQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useOversightLogQuery(baseOptions?: Apollo.QueryHookOptions<OversightLogQuery, OversightLogQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OversightLogQuery, OversightLogQueryVariables>(OversightLogDocument, options);
      }
export function useOversightLogLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OversightLogQuery, OversightLogQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OversightLogQuery, OversightLogQueryVariables>(OversightLogDocument, options);
        }
// @ts-ignore
export function useOversightLogSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<OversightLogQuery, OversightLogQueryVariables>): Apollo.UseSuspenseQueryResult<OversightLogQuery, OversightLogQueryVariables>;
export function useOversightLogSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OversightLogQuery, OversightLogQueryVariables>): Apollo.UseSuspenseQueryResult<OversightLogQuery | undefined, OversightLogQueryVariables>;
export function useOversightLogSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OversightLogQuery, OversightLogQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OversightLogQuery, OversightLogQueryVariables>(OversightLogDocument, options);
        }
export type OversightLogQueryHookResult = ReturnType<typeof useOversightLogQuery>;
export type OversightLogLazyQueryHookResult = ReturnType<typeof useOversightLogLazyQuery>;
export type OversightLogSuspenseQueryHookResult = ReturnType<typeof useOversightLogSuspenseQuery>;
export type OversightLogQueryResult = Apollo.QueryResult<OversightLogQuery, OversightLogQueryVariables>;
export const VerifyTeacherDocument = gql`
    mutation VerifyTeacher($teacherUserId: ID!) {
  verifyTeacher(teacherUserId: $teacherUserId) {
    id
  }
}
    `;
export type VerifyTeacherMutationFn = Apollo.MutationFunction<VerifyTeacherMutation, VerifyTeacherMutationVariables>;

/**
 * __useVerifyTeacherMutation__
 *
 * To run a mutation, you first call `useVerifyTeacherMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVerifyTeacherMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [verifyTeacherMutation, { data, loading, error }] = useVerifyTeacherMutation({
 *   variables: {
 *      teacherUserId: // value for 'teacherUserId'
 *   },
 * });
 */
export function useVerifyTeacherMutation(baseOptions?: Apollo.MutationHookOptions<VerifyTeacherMutation, VerifyTeacherMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<VerifyTeacherMutation, VerifyTeacherMutationVariables>(VerifyTeacherDocument, options);
      }
export type VerifyTeacherMutationHookResult = ReturnType<typeof useVerifyTeacherMutation>;
export type VerifyTeacherMutationResult = Apollo.MutationResult<VerifyTeacherMutation>;
export type VerifyTeacherMutationOptions = Apollo.BaseMutationOptions<VerifyTeacherMutation, VerifyTeacherMutationVariables>;
export const RejectTeacherDocument = gql`
    mutation RejectTeacher($teacherUserId: ID!, $reason: String!) {
  rejectTeacher(teacherUserId: $teacherUserId, reason: $reason) {
    id
  }
}
    `;
export type RejectTeacherMutationFn = Apollo.MutationFunction<RejectTeacherMutation, RejectTeacherMutationVariables>;

/**
 * __useRejectTeacherMutation__
 *
 * To run a mutation, you first call `useRejectTeacherMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRejectTeacherMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [rejectTeacherMutation, { data, loading, error }] = useRejectTeacherMutation({
 *   variables: {
 *      teacherUserId: // value for 'teacherUserId'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useRejectTeacherMutation(baseOptions?: Apollo.MutationHookOptions<RejectTeacherMutation, RejectTeacherMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RejectTeacherMutation, RejectTeacherMutationVariables>(RejectTeacherDocument, options);
      }
export type RejectTeacherMutationHookResult = ReturnType<typeof useRejectTeacherMutation>;
export type RejectTeacherMutationResult = Apollo.MutationResult<RejectTeacherMutation>;
export type RejectTeacherMutationOptions = Apollo.BaseMutationOptions<RejectTeacherMutation, RejectTeacherMutationVariables>;
export const RequestVerificationDocumentsDocument = gql`
    mutation RequestVerificationDocuments($teacherUserId: ID!, $reason: String!) {
  requestVerificationDocuments(teacherUserId: $teacherUserId, reason: $reason) {
    id
  }
}
    `;
export type RequestVerificationDocumentsMutationFn = Apollo.MutationFunction<RequestVerificationDocumentsMutation, RequestVerificationDocumentsMutationVariables>;

/**
 * __useRequestVerificationDocumentsMutation__
 *
 * To run a mutation, you first call `useRequestVerificationDocumentsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestVerificationDocumentsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestVerificationDocumentsMutation, { data, loading, error }] = useRequestVerificationDocumentsMutation({
 *   variables: {
 *      teacherUserId: // value for 'teacherUserId'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useRequestVerificationDocumentsMutation(baseOptions?: Apollo.MutationHookOptions<RequestVerificationDocumentsMutation, RequestVerificationDocumentsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestVerificationDocumentsMutation, RequestVerificationDocumentsMutationVariables>(RequestVerificationDocumentsDocument, options);
      }
export type RequestVerificationDocumentsMutationHookResult = ReturnType<typeof useRequestVerificationDocumentsMutation>;
export type RequestVerificationDocumentsMutationResult = Apollo.MutationResult<RequestVerificationDocumentsMutation>;
export type RequestVerificationDocumentsMutationOptions = Apollo.BaseMutationOptions<RequestVerificationDocumentsMutation, RequestVerificationDocumentsMutationVariables>;
export const OversightPeopleDocument = gql`
    query OversightPeople($query: String, $limit: Int) {
  oversightPeople(query: $query, limit: $limit) {
    userId
    fullName
    email
    role
    state
  }
}
    `;

/**
 * __useOversightPeopleQuery__
 *
 * To run a query within a React component, call `useOversightPeopleQuery` and pass it any options that fit your needs.
 * When your component renders, `useOversightPeopleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOversightPeopleQuery({
 *   variables: {
 *      query: // value for 'query'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useOversightPeopleQuery(baseOptions?: Apollo.QueryHookOptions<OversightPeopleQuery, OversightPeopleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OversightPeopleQuery, OversightPeopleQueryVariables>(OversightPeopleDocument, options);
      }
export function useOversightPeopleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OversightPeopleQuery, OversightPeopleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OversightPeopleQuery, OversightPeopleQueryVariables>(OversightPeopleDocument, options);
        }
// @ts-ignore
export function useOversightPeopleSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<OversightPeopleQuery, OversightPeopleQueryVariables>): Apollo.UseSuspenseQueryResult<OversightPeopleQuery, OversightPeopleQueryVariables>;
export function useOversightPeopleSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OversightPeopleQuery, OversightPeopleQueryVariables>): Apollo.UseSuspenseQueryResult<OversightPeopleQuery | undefined, OversightPeopleQueryVariables>;
export function useOversightPeopleSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OversightPeopleQuery, OversightPeopleQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OversightPeopleQuery, OversightPeopleQueryVariables>(OversightPeopleDocument, options);
        }
export type OversightPeopleQueryHookResult = ReturnType<typeof useOversightPeopleQuery>;
export type OversightPeopleLazyQueryHookResult = ReturnType<typeof useOversightPeopleLazyQuery>;
export type OversightPeopleSuspenseQueryHookResult = ReturnType<typeof useOversightPeopleSuspenseQuery>;
export type OversightPeopleQueryResult = Apollo.QueryResult<OversightPeopleQuery, OversightPeopleQueryVariables>;
export const AccountStateHistoryDocument = gql`
    query AccountStateHistory($userId: ID!) {
  accountStateHistory(userId: $userId) {
    state
    reason
    actorName
    at
  }
}
    `;

/**
 * __useAccountStateHistoryQuery__
 *
 * To run a query within a React component, call `useAccountStateHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccountStateHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountStateHistoryQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useAccountStateHistoryQuery(baseOptions: Apollo.QueryHookOptions<AccountStateHistoryQuery, AccountStateHistoryQueryVariables> & ({ variables: AccountStateHistoryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>(AccountStateHistoryDocument, options);
      }
export function useAccountStateHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>(AccountStateHistoryDocument, options);
        }
// @ts-ignore
export function useAccountStateHistorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>;
export function useAccountStateHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<AccountStateHistoryQuery | undefined, AccountStateHistoryQueryVariables>;
export function useAccountStateHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>(AccountStateHistoryDocument, options);
        }
export type AccountStateHistoryQueryHookResult = ReturnType<typeof useAccountStateHistoryQuery>;
export type AccountStateHistoryLazyQueryHookResult = ReturnType<typeof useAccountStateHistoryLazyQuery>;
export type AccountStateHistorySuspenseQueryHookResult = ReturnType<typeof useAccountStateHistorySuspenseQuery>;
export type AccountStateHistoryQueryResult = Apollo.QueryResult<AccountStateHistoryQuery, AccountStateHistoryQueryVariables>;
export const SetAccountStateDocument = gql`
    mutation SetAccountState($userId: ID!, $state: AccountStateValue!, $reason: String) {
  setAccountState(userId: $userId, state: $state, reason: $reason) {
    id
  }
}
    `;
export type SetAccountStateMutationFn = Apollo.MutationFunction<SetAccountStateMutation, SetAccountStateMutationVariables>;

/**
 * __useSetAccountStateMutation__
 *
 * To run a mutation, you first call `useSetAccountStateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetAccountStateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setAccountStateMutation, { data, loading, error }] = useSetAccountStateMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      state: // value for 'state'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useSetAccountStateMutation(baseOptions?: Apollo.MutationHookOptions<SetAccountStateMutation, SetAccountStateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetAccountStateMutation, SetAccountStateMutationVariables>(SetAccountStateDocument, options);
      }
export type SetAccountStateMutationHookResult = ReturnType<typeof useSetAccountStateMutation>;
export type SetAccountStateMutationResult = Apollo.MutationResult<SetAccountStateMutation>;
export type SetAccountStateMutationOptions = Apollo.BaseMutationOptions<SetAccountStateMutation, SetAccountStateMutationVariables>;
export const LoginDocument = gql`
    mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    refreshToken
    user {
      id
      email
      firstName
      lastName
      displayName
      shortName
      role
      locale
      studentProfile {
        ageBand
        gradeLevel
        points
      }
      teacherProfile {
        verificationStatus
      }
    }
  }
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      email: // value for 'email'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const RegisterUserDocument = gql`
    mutation RegisterUser($input: RegisterUserInput!) {
  registerUser(input: $input) {
    token
    refreshToken
    user {
      id
      email
      firstName
      lastName
      displayName
      shortName
      role
      locale
      studentProfile {
        ageBand
        gradeLevel
        points
      }
      teacherProfile {
        verificationStatus
      }
    }
  }
}
    `;
export type RegisterUserMutationFn = Apollo.MutationFunction<RegisterUserMutation, RegisterUserMutationVariables>;

/**
 * __useRegisterUserMutation__
 *
 * To run a mutation, you first call `useRegisterUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerUserMutation, { data, loading, error }] = useRegisterUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterUserMutation(baseOptions?: Apollo.MutationHookOptions<RegisterUserMutation, RegisterUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterUserMutation, RegisterUserMutationVariables>(RegisterUserDocument, options);
      }
export type RegisterUserMutationHookResult = ReturnType<typeof useRegisterUserMutation>;
export type RegisterUserMutationResult = Apollo.MutationResult<RegisterUserMutation>;
export type RegisterUserMutationOptions = Apollo.BaseMutationOptions<RegisterUserMutation, RegisterUserMutationVariables>;
export const RefreshTokenDocument = gql`
    mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    token
    refreshToken
    user {
      id
      email
      firstName
      lastName
      displayName
      shortName
      role
      locale
      studentProfile {
        ageBand
        gradeLevel
        points
      }
      teacherProfile {
        verificationStatus
      }
    }
  }
}
    `;
export type RefreshTokenMutationFn = Apollo.MutationFunction<RefreshTokenMutation, RefreshTokenMutationVariables>;

/**
 * __useRefreshTokenMutation__
 *
 * To run a mutation, you first call `useRefreshTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshTokenMutation, { data, loading, error }] = useRefreshTokenMutation({
 *   variables: {
 *      refreshToken: // value for 'refreshToken'
 *   },
 * });
 */
export function useRefreshTokenMutation(baseOptions?: Apollo.MutationHookOptions<RefreshTokenMutation, RefreshTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RefreshTokenMutation, RefreshTokenMutationVariables>(RefreshTokenDocument, options);
      }
export type RefreshTokenMutationHookResult = ReturnType<typeof useRefreshTokenMutation>;
export type RefreshTokenMutationResult = Apollo.MutationResult<RefreshTokenMutation>;
export type RefreshTokenMutationOptions = Apollo.BaseMutationOptions<RefreshTokenMutation, RefreshTokenMutationVariables>;
export const RequestPasswordResetDocument = gql`
    mutation RequestPasswordReset($email: String!) {
  requestPasswordReset(email: $email)
}
    `;
export type RequestPasswordResetMutationFn = Apollo.MutationFunction<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>;

/**
 * __useRequestPasswordResetMutation__
 *
 * To run a mutation, you first call `useRequestPasswordResetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestPasswordResetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestPasswordResetMutation, { data, loading, error }] = useRequestPasswordResetMutation({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useRequestPasswordResetMutation(baseOptions?: Apollo.MutationHookOptions<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>(RequestPasswordResetDocument, options);
      }
export type RequestPasswordResetMutationHookResult = ReturnType<typeof useRequestPasswordResetMutation>;
export type RequestPasswordResetMutationResult = Apollo.MutationResult<RequestPasswordResetMutation>;
export type RequestPasswordResetMutationOptions = Apollo.BaseMutationOptions<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>;
export const ResetPasswordDocument = gql`
    mutation ResetPassword($token: String!, $newPassword: String!) {
  resetPassword(token: $token, newPassword: $newPassword)
}
    `;
export type ResetPasswordMutationFn = Apollo.MutationFunction<ResetPasswordMutation, ResetPasswordMutationVariables>;

/**
 * __useResetPasswordMutation__
 *
 * To run a mutation, you first call `useResetPasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetPasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetPasswordMutation, { data, loading, error }] = useResetPasswordMutation({
 *   variables: {
 *      token: // value for 'token'
 *      newPassword: // value for 'newPassword'
 *   },
 * });
 */
export function useResetPasswordMutation(baseOptions?: Apollo.MutationHookOptions<ResetPasswordMutation, ResetPasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetPasswordMutation, ResetPasswordMutationVariables>(ResetPasswordDocument, options);
      }
export type ResetPasswordMutationHookResult = ReturnType<typeof useResetPasswordMutation>;
export type ResetPasswordMutationResult = Apollo.MutationResult<ResetPasswordMutation>;
export type ResetPasswordMutationOptions = Apollo.BaseMutationOptions<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const AddChildDocument = gql`
    mutation AddChild($input: AddChildInput!) {
  addChild(input: $input) {
    id
    status
    consent152fz
    consentAt
    child {
      id
      firstName
      lastName
      displayName
      shortName
    }
  }
}
    `;
export type AddChildMutationFn = Apollo.MutationFunction<AddChildMutation, AddChildMutationVariables>;

/**
 * __useAddChildMutation__
 *
 * To run a mutation, you first call `useAddChildMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddChildMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addChildMutation, { data, loading, error }] = useAddChildMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddChildMutation(baseOptions?: Apollo.MutationHookOptions<AddChildMutation, AddChildMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddChildMutation, AddChildMutationVariables>(AddChildDocument, options);
      }
export type AddChildMutationHookResult = ReturnType<typeof useAddChildMutation>;
export type AddChildMutationResult = Apollo.MutationResult<AddChildMutation>;
export type AddChildMutationOptions = Apollo.BaseMutationOptions<AddChildMutation, AddChildMutationVariables>;
export const SubmitVerificationDocumentDocument = gql`
    mutation SubmitVerificationDocument($fileKey: String!) {
  submitVerificationDocument(fileKey: $fileKey) {
    id
    filename
    status
    createdAt
  }
}
    `;
export type SubmitVerificationDocumentMutationFn = Apollo.MutationFunction<SubmitVerificationDocumentMutation, SubmitVerificationDocumentMutationVariables>;

/**
 * __useSubmitVerificationDocumentMutation__
 *
 * To run a mutation, you first call `useSubmitVerificationDocumentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSubmitVerificationDocumentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [submitVerificationDocumentMutation, { data, loading, error }] = useSubmitVerificationDocumentMutation({
 *   variables: {
 *      fileKey: // value for 'fileKey'
 *   },
 * });
 */
export function useSubmitVerificationDocumentMutation(baseOptions?: Apollo.MutationHookOptions<SubmitVerificationDocumentMutation, SubmitVerificationDocumentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SubmitVerificationDocumentMutation, SubmitVerificationDocumentMutationVariables>(SubmitVerificationDocumentDocument, options);
      }
export type SubmitVerificationDocumentMutationHookResult = ReturnType<typeof useSubmitVerificationDocumentMutation>;
export type SubmitVerificationDocumentMutationResult = Apollo.MutationResult<SubmitVerificationDocumentMutation>;
export type SubmitVerificationDocumentMutationOptions = Apollo.BaseMutationOptions<SubmitVerificationDocumentMutation, SubmitVerificationDocumentMutationVariables>;
export const MeDocument = gql`
    query Me {
  me {
    id
    email
    firstName
    lastName
    displayName
    shortName
    role
    locale
    avatarUrl
    consentSpeech
    consentAttention
    consent152fzAt
    studentProfile {
      ageBand
      gradeLevel
      points
    }
    teacherProfile {
      verificationStatus
      specialty
      verificationDocuments {
        id
        filename
        sizeBytes
        status
        reason
        createdAt
      }
    }
    parentProfile {
      children {
        ageBand
        gradeLevel
        user {
          id
          firstName
          lastName
          displayName
          shortName
        }
      }
    }
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
// @ts-ignore
export function useMeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery | undefined, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const SetAvatarDocument = gql`
    mutation SetAvatar($fileKey: String!) {
  setAvatar(fileKey: $fileKey) {
    id
    avatarUrl
  }
}
    `;
export type SetAvatarMutationFn = Apollo.MutationFunction<SetAvatarMutation, SetAvatarMutationVariables>;

/**
 * __useSetAvatarMutation__
 *
 * To run a mutation, you first call `useSetAvatarMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetAvatarMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setAvatarMutation, { data, loading, error }] = useSetAvatarMutation({
 *   variables: {
 *      fileKey: // value for 'fileKey'
 *   },
 * });
 */
export function useSetAvatarMutation(baseOptions?: Apollo.MutationHookOptions<SetAvatarMutation, SetAvatarMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetAvatarMutation, SetAvatarMutationVariables>(SetAvatarDocument, options);
      }
export type SetAvatarMutationHookResult = ReturnType<typeof useSetAvatarMutation>;
export type SetAvatarMutationResult = Apollo.MutationResult<SetAvatarMutation>;
export type SetAvatarMutationOptions = Apollo.BaseMutationOptions<SetAvatarMutation, SetAvatarMutationVariables>;
export const LearningProfilesDocument = gql`
    query LearningProfiles {
  learningProfiles {
    id
    kind
    institutionId
    institutionName
    groupName
    courseId
    courseTitle
    courseCount
    isActive
  }
}
    `;

/**
 * __useLearningProfilesQuery__
 *
 * To run a query within a React component, call `useLearningProfilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useLearningProfilesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLearningProfilesQuery({
 *   variables: {
 *   },
 * });
 */
export function useLearningProfilesQuery(baseOptions?: Apollo.QueryHookOptions<LearningProfilesQuery, LearningProfilesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LearningProfilesQuery, LearningProfilesQueryVariables>(LearningProfilesDocument, options);
      }
export function useLearningProfilesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LearningProfilesQuery, LearningProfilesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LearningProfilesQuery, LearningProfilesQueryVariables>(LearningProfilesDocument, options);
        }
// @ts-ignore
export function useLearningProfilesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LearningProfilesQuery, LearningProfilesQueryVariables>): Apollo.UseSuspenseQueryResult<LearningProfilesQuery, LearningProfilesQueryVariables>;
export function useLearningProfilesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LearningProfilesQuery, LearningProfilesQueryVariables>): Apollo.UseSuspenseQueryResult<LearningProfilesQuery | undefined, LearningProfilesQueryVariables>;
export function useLearningProfilesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LearningProfilesQuery, LearningProfilesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LearningProfilesQuery, LearningProfilesQueryVariables>(LearningProfilesDocument, options);
        }
export type LearningProfilesQueryHookResult = ReturnType<typeof useLearningProfilesQuery>;
export type LearningProfilesLazyQueryHookResult = ReturnType<typeof useLearningProfilesLazyQuery>;
export type LearningProfilesSuspenseQueryHookResult = ReturnType<typeof useLearningProfilesSuspenseQuery>;
export type LearningProfilesQueryResult = Apollo.QueryResult<LearningProfilesQuery, LearningProfilesQueryVariables>;
export const SetActiveLearningProfileDocument = gql`
    mutation SetActiveLearningProfile($id: ID!) {
  setActiveLearningProfile(id: $id) {
    id
    kind
    isActive
  }
}
    `;
export type SetActiveLearningProfileMutationFn = Apollo.MutationFunction<SetActiveLearningProfileMutation, SetActiveLearningProfileMutationVariables>;

/**
 * __useSetActiveLearningProfileMutation__
 *
 * To run a mutation, you first call `useSetActiveLearningProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetActiveLearningProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setActiveLearningProfileMutation, { data, loading, error }] = useSetActiveLearningProfileMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSetActiveLearningProfileMutation(baseOptions?: Apollo.MutationHookOptions<SetActiveLearningProfileMutation, SetActiveLearningProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetActiveLearningProfileMutation, SetActiveLearningProfileMutationVariables>(SetActiveLearningProfileDocument, options);
      }
export type SetActiveLearningProfileMutationHookResult = ReturnType<typeof useSetActiveLearningProfileMutation>;
export type SetActiveLearningProfileMutationResult = Apollo.MutationResult<SetActiveLearningProfileMutation>;
export type SetActiveLearningProfileMutationOptions = Apollo.BaseMutationOptions<SetActiveLearningProfileMutation, SetActiveLearningProfileMutationVariables>;
export const LogoutDocument = gql`
    mutation Logout {
  logout
}
    `;
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutation, LogoutMutationVariables>;

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutMutation(baseOptions?: Apollo.MutationHookOptions<LogoutMutation, LogoutMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options);
      }
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>;
export const BoardDocument = gql`
    query Board($lessonId: ID!) {
  board(lessonId: $lessonId) {
    lessonId
    openForStudents
    canWrite
    isTeacher
    elements {
      id
      kind
      authorId
      authorName
      x
      y
      width
      height
      data
      revision
    }
  }
}
    `;

/**
 * __useBoardQuery__
 *
 * To run a query within a React component, call `useBoardQuery` and pass it any options that fit your needs.
 * When your component renders, `useBoardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBoardQuery({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *   },
 * });
 */
export function useBoardQuery(baseOptions: Apollo.QueryHookOptions<BoardQuery, BoardQueryVariables> & ({ variables: BoardQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BoardQuery, BoardQueryVariables>(BoardDocument, options);
      }
export function useBoardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BoardQuery, BoardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BoardQuery, BoardQueryVariables>(BoardDocument, options);
        }
// @ts-ignore
export function useBoardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<BoardQuery, BoardQueryVariables>): Apollo.UseSuspenseQueryResult<BoardQuery, BoardQueryVariables>;
export function useBoardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BoardQuery, BoardQueryVariables>): Apollo.UseSuspenseQueryResult<BoardQuery | undefined, BoardQueryVariables>;
export function useBoardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BoardQuery, BoardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BoardQuery, BoardQueryVariables>(BoardDocument, options);
        }
export type BoardQueryHookResult = ReturnType<typeof useBoardQuery>;
export type BoardLazyQueryHookResult = ReturnType<typeof useBoardLazyQuery>;
export type BoardSuspenseQueryHookResult = ReturnType<typeof useBoardSuspenseQuery>;
export type BoardQueryResult = Apollo.QueryResult<BoardQuery, BoardQueryVariables>;
export const CourseBoardsDocument = gql`
    query CourseBoards($courseId: ID!) {
  courseBoards(courseId: $courseId) {
    id
    title
    savedAt
    savedByName
    lessonId
    lessonTitle
  }
}
    `;

/**
 * __useCourseBoardsQuery__
 *
 * To run a query within a React component, call `useCourseBoardsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCourseBoardsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCourseBoardsQuery({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useCourseBoardsQuery(baseOptions: Apollo.QueryHookOptions<CourseBoardsQuery, CourseBoardsQueryVariables> & ({ variables: CourseBoardsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CourseBoardsQuery, CourseBoardsQueryVariables>(CourseBoardsDocument, options);
      }
export function useCourseBoardsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CourseBoardsQuery, CourseBoardsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CourseBoardsQuery, CourseBoardsQueryVariables>(CourseBoardsDocument, options);
        }
// @ts-ignore
export function useCourseBoardsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CourseBoardsQuery, CourseBoardsQueryVariables>): Apollo.UseSuspenseQueryResult<CourseBoardsQuery, CourseBoardsQueryVariables>;
export function useCourseBoardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CourseBoardsQuery, CourseBoardsQueryVariables>): Apollo.UseSuspenseQueryResult<CourseBoardsQuery | undefined, CourseBoardsQueryVariables>;
export function useCourseBoardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CourseBoardsQuery, CourseBoardsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CourseBoardsQuery, CourseBoardsQueryVariables>(CourseBoardsDocument, options);
        }
export type CourseBoardsQueryHookResult = ReturnType<typeof useCourseBoardsQuery>;
export type CourseBoardsLazyQueryHookResult = ReturnType<typeof useCourseBoardsLazyQuery>;
export type CourseBoardsSuspenseQueryHookResult = ReturnType<typeof useCourseBoardsSuspenseQuery>;
export type CourseBoardsQueryResult = Apollo.QueryResult<CourseBoardsQuery, CourseBoardsQueryVariables>;
export const PutBoardElementDocument = gql`
    mutation PutBoardElement($lessonId: ID!, $input: BoardElementInput!) {
  putBoardElement(lessonId: $lessonId, input: $input) {
    id
    kind
    authorId
    authorName
    x
    y
    width
    height
    data
    revision
  }
}
    `;
export type PutBoardElementMutationFn = Apollo.MutationFunction<PutBoardElementMutation, PutBoardElementMutationVariables>;

/**
 * __usePutBoardElementMutation__
 *
 * To run a mutation, you first call `usePutBoardElementMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutBoardElementMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putBoardElementMutation, { data, loading, error }] = usePutBoardElementMutation({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePutBoardElementMutation(baseOptions?: Apollo.MutationHookOptions<PutBoardElementMutation, PutBoardElementMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutBoardElementMutation, PutBoardElementMutationVariables>(PutBoardElementDocument, options);
      }
export type PutBoardElementMutationHookResult = ReturnType<typeof usePutBoardElementMutation>;
export type PutBoardElementMutationResult = Apollo.MutationResult<PutBoardElementMutation>;
export type PutBoardElementMutationOptions = Apollo.BaseMutationOptions<PutBoardElementMutation, PutBoardElementMutationVariables>;
export const RemoveBoardElementDocument = gql`
    mutation RemoveBoardElement($lessonId: ID!, $elementId: ID!) {
  removeBoardElement(lessonId: $lessonId, elementId: $elementId)
}
    `;
export type RemoveBoardElementMutationFn = Apollo.MutationFunction<RemoveBoardElementMutation, RemoveBoardElementMutationVariables>;

/**
 * __useRemoveBoardElementMutation__
 *
 * To run a mutation, you first call `useRemoveBoardElementMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveBoardElementMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeBoardElementMutation, { data, loading, error }] = useRemoveBoardElementMutation({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *      elementId: // value for 'elementId'
 *   },
 * });
 */
export function useRemoveBoardElementMutation(baseOptions?: Apollo.MutationHookOptions<RemoveBoardElementMutation, RemoveBoardElementMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveBoardElementMutation, RemoveBoardElementMutationVariables>(RemoveBoardElementDocument, options);
      }
export type RemoveBoardElementMutationHookResult = ReturnType<typeof useRemoveBoardElementMutation>;
export type RemoveBoardElementMutationResult = Apollo.MutationResult<RemoveBoardElementMutation>;
export type RemoveBoardElementMutationOptions = Apollo.BaseMutationOptions<RemoveBoardElementMutation, RemoveBoardElementMutationVariables>;
export const SetBoardOpenDocument = gql`
    mutation SetBoardOpen($lessonId: ID!, $isOpen: Boolean!) {
  setBoardOpen(lessonId: $lessonId, isOpen: $isOpen)
}
    `;
export type SetBoardOpenMutationFn = Apollo.MutationFunction<SetBoardOpenMutation, SetBoardOpenMutationVariables>;

/**
 * __useSetBoardOpenMutation__
 *
 * To run a mutation, you first call `useSetBoardOpenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetBoardOpenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setBoardOpenMutation, { data, loading, error }] = useSetBoardOpenMutation({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *      isOpen: // value for 'isOpen'
 *   },
 * });
 */
export function useSetBoardOpenMutation(baseOptions?: Apollo.MutationHookOptions<SetBoardOpenMutation, SetBoardOpenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetBoardOpenMutation, SetBoardOpenMutationVariables>(SetBoardOpenDocument, options);
      }
export type SetBoardOpenMutationHookResult = ReturnType<typeof useSetBoardOpenMutation>;
export type SetBoardOpenMutationResult = Apollo.MutationResult<SetBoardOpenMutation>;
export type SetBoardOpenMutationOptions = Apollo.BaseMutationOptions<SetBoardOpenMutation, SetBoardOpenMutationVariables>;
export const SaveBoardDocument = gql`
    mutation SaveBoard($lessonId: ID!, $title: String) {
  saveBoard(lessonId: $lessonId, title: $title) {
    id
    title
    savedAt
  }
}
    `;
export type SaveBoardMutationFn = Apollo.MutationFunction<SaveBoardMutation, SaveBoardMutationVariables>;

/**
 * __useSaveBoardMutation__
 *
 * To run a mutation, you first call `useSaveBoardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveBoardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveBoardMutation, { data, loading, error }] = useSaveBoardMutation({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *      title: // value for 'title'
 *   },
 * });
 */
export function useSaveBoardMutation(baseOptions?: Apollo.MutationHookOptions<SaveBoardMutation, SaveBoardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveBoardMutation, SaveBoardMutationVariables>(SaveBoardDocument, options);
      }
export type SaveBoardMutationHookResult = ReturnType<typeof useSaveBoardMutation>;
export type SaveBoardMutationResult = Apollo.MutationResult<SaveBoardMutation>;
export type SaveBoardMutationOptions = Apollo.BaseMutationOptions<SaveBoardMutation, SaveBoardMutationVariables>;
export const BoardChangedDocument = gql`
    subscription BoardChanged($lessonId: ID!) {
  boardChanged(lessonId: $lessonId) {
    lessonId
    kind
    elementId
    openForStudents
    element {
      id
      kind
      authorId
      authorName
      x
      y
      width
      height
      data
      revision
    }
  }
}
    `;

/**
 * __useBoardChangedSubscription__
 *
 * To run a query within a React component, call `useBoardChangedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useBoardChangedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBoardChangedSubscription({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *   },
 * });
 */
export function useBoardChangedSubscription(baseOptions: Apollo.SubscriptionHookOptions<BoardChangedSubscription, BoardChangedSubscriptionVariables> & ({ variables: BoardChangedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<BoardChangedSubscription, BoardChangedSubscriptionVariables>(BoardChangedDocument, options);
      }
export type BoardChangedSubscriptionHookResult = ReturnType<typeof useBoardChangedSubscription>;
export type BoardChangedSubscriptionResult = Apollo.SubscriptionResult<BoardChangedSubscription>;
export const TeacherDashboardDocument = gql`
    query TeacherDashboard {
  teacherDashboard {
    studentCount
    newStudentsThisWeek
    courses {
      id
      title
      status
      lessonCount
      enrollmentCount
    }
    upcomingSessions {
      id
      startAt
      endAt
      status
      lesson {
        id
        title
      }
    }
    pendingSubmissions {
      id
      submittedAt
      status
      student {
        user {
          id
          firstName
          lastName
          displayName
          shortName
          formalName
        }
      }
      homework {
        id
        title
        lesson {
          id
          title
        }
      }
    }
  }
}
    `;

/**
 * __useTeacherDashboardQuery__
 *
 * To run a query within a React component, call `useTeacherDashboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useTeacherDashboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTeacherDashboardQuery({
 *   variables: {
 *   },
 * });
 */
export function useTeacherDashboardQuery(baseOptions?: Apollo.QueryHookOptions<TeacherDashboardQuery, TeacherDashboardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TeacherDashboardQuery, TeacherDashboardQueryVariables>(TeacherDashboardDocument, options);
      }
export function useTeacherDashboardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TeacherDashboardQuery, TeacherDashboardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TeacherDashboardQuery, TeacherDashboardQueryVariables>(TeacherDashboardDocument, options);
        }
// @ts-ignore
export function useTeacherDashboardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TeacherDashboardQuery, TeacherDashboardQueryVariables>): Apollo.UseSuspenseQueryResult<TeacherDashboardQuery, TeacherDashboardQueryVariables>;
export function useTeacherDashboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TeacherDashboardQuery, TeacherDashboardQueryVariables>): Apollo.UseSuspenseQueryResult<TeacherDashboardQuery | undefined, TeacherDashboardQueryVariables>;
export function useTeacherDashboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TeacherDashboardQuery, TeacherDashboardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TeacherDashboardQuery, TeacherDashboardQueryVariables>(TeacherDashboardDocument, options);
        }
export type TeacherDashboardQueryHookResult = ReturnType<typeof useTeacherDashboardQuery>;
export type TeacherDashboardLazyQueryHookResult = ReturnType<typeof useTeacherDashboardLazyQuery>;
export type TeacherDashboardSuspenseQueryHookResult = ReturnType<typeof useTeacherDashboardSuspenseQuery>;
export type TeacherDashboardQueryResult = Apollo.QueryResult<TeacherDashboardQuery, TeacherDashboardQueryVariables>;
export const MyChannelsDocument = gql`
    query MyChannels {
  myChannels {
    id
    kind
    courseId
    courseTitle
    groupName
    institutionName
    unread
    lastMessageAt
    lastMessageText
    readOnly
    openReports
    participants {
      id
      firstName
      lastName
      displayName
      shortName
      role
    }
  }
}
    `;

/**
 * __useMyChannelsQuery__
 *
 * To run a query within a React component, call `useMyChannelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyChannelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyChannelsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyChannelsQuery(baseOptions?: Apollo.QueryHookOptions<MyChannelsQuery, MyChannelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyChannelsQuery, MyChannelsQueryVariables>(MyChannelsDocument, options);
      }
export function useMyChannelsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyChannelsQuery, MyChannelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyChannelsQuery, MyChannelsQueryVariables>(MyChannelsDocument, options);
        }
// @ts-ignore
export function useMyChannelsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyChannelsQuery, MyChannelsQueryVariables>): Apollo.UseSuspenseQueryResult<MyChannelsQuery, MyChannelsQueryVariables>;
export function useMyChannelsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyChannelsQuery, MyChannelsQueryVariables>): Apollo.UseSuspenseQueryResult<MyChannelsQuery | undefined, MyChannelsQueryVariables>;
export function useMyChannelsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyChannelsQuery, MyChannelsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyChannelsQuery, MyChannelsQueryVariables>(MyChannelsDocument, options);
        }
export type MyChannelsQueryHookResult = ReturnType<typeof useMyChannelsQuery>;
export type MyChannelsLazyQueryHookResult = ReturnType<typeof useMyChannelsLazyQuery>;
export type MyChannelsSuspenseQueryHookResult = ReturnType<typeof useMyChannelsSuspenseQuery>;
export type MyChannelsQueryResult = Apollo.QueryResult<MyChannelsQuery, MyChannelsQueryVariables>;
export const ChatUnreadDocument = gql`
    query ChatUnread {
  chatUnread
}
    `;

/**
 * __useChatUnreadQuery__
 *
 * To run a query within a React component, call `useChatUnreadQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatUnreadQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatUnreadQuery({
 *   variables: {
 *   },
 * });
 */
export function useChatUnreadQuery(baseOptions?: Apollo.QueryHookOptions<ChatUnreadQuery, ChatUnreadQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChatUnreadQuery, ChatUnreadQueryVariables>(ChatUnreadDocument, options);
      }
export function useChatUnreadLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChatUnreadQuery, ChatUnreadQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChatUnreadQuery, ChatUnreadQueryVariables>(ChatUnreadDocument, options);
        }
// @ts-ignore
export function useChatUnreadSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ChatUnreadQuery, ChatUnreadQueryVariables>): Apollo.UseSuspenseQueryResult<ChatUnreadQuery, ChatUnreadQueryVariables>;
export function useChatUnreadSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatUnreadQuery, ChatUnreadQueryVariables>): Apollo.UseSuspenseQueryResult<ChatUnreadQuery | undefined, ChatUnreadQueryVariables>;
export function useChatUnreadSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatUnreadQuery, ChatUnreadQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ChatUnreadQuery, ChatUnreadQueryVariables>(ChatUnreadDocument, options);
        }
export type ChatUnreadQueryHookResult = ReturnType<typeof useChatUnreadQuery>;
export type ChatUnreadLazyQueryHookResult = ReturnType<typeof useChatUnreadLazyQuery>;
export type ChatUnreadSuspenseQueryHookResult = ReturnType<typeof useChatUnreadSuspenseQuery>;
export type ChatUnreadQueryResult = Apollo.QueryResult<ChatUnreadQuery, ChatUnreadQueryVariables>;
export const ChannelMessagesDocument = gql`
    query ChannelMessages($channelId: ID!, $limit: Int) {
  channelMessages(channelId: $channelId, limit: $limit) {
    id
    channelId
    senderId
    senderName
    text
    sentAt
    mine
  }
}
    `;

/**
 * __useChannelMessagesQuery__
 *
 * To run a query within a React component, call `useChannelMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useChannelMessagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChannelMessagesQuery({
 *   variables: {
 *      channelId: // value for 'channelId'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useChannelMessagesQuery(baseOptions: Apollo.QueryHookOptions<ChannelMessagesQuery, ChannelMessagesQueryVariables> & ({ variables: ChannelMessagesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChannelMessagesQuery, ChannelMessagesQueryVariables>(ChannelMessagesDocument, options);
      }
export function useChannelMessagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChannelMessagesQuery, ChannelMessagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChannelMessagesQuery, ChannelMessagesQueryVariables>(ChannelMessagesDocument, options);
        }
// @ts-ignore
export function useChannelMessagesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ChannelMessagesQuery, ChannelMessagesQueryVariables>): Apollo.UseSuspenseQueryResult<ChannelMessagesQuery, ChannelMessagesQueryVariables>;
export function useChannelMessagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChannelMessagesQuery, ChannelMessagesQueryVariables>): Apollo.UseSuspenseQueryResult<ChannelMessagesQuery | undefined, ChannelMessagesQueryVariables>;
export function useChannelMessagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChannelMessagesQuery, ChannelMessagesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ChannelMessagesQuery, ChannelMessagesQueryVariables>(ChannelMessagesDocument, options);
        }
export type ChannelMessagesQueryHookResult = ReturnType<typeof useChannelMessagesQuery>;
export type ChannelMessagesLazyQueryHookResult = ReturnType<typeof useChannelMessagesLazyQuery>;
export type ChannelMessagesSuspenseQueryHookResult = ReturnType<typeof useChannelMessagesSuspenseQuery>;
export type ChannelMessagesQueryResult = Apollo.QueryResult<ChannelMessagesQuery, ChannelMessagesQueryVariables>;
export const ChatPolicyDocument = gql`
    query ChatPolicy {
  chatPolicy {
    peerChat
    directMessages
    teacherVisibleAlways
    premoderation
  }
}
    `;

/**
 * __useChatPolicyQuery__
 *
 * To run a query within a React component, call `useChatPolicyQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatPolicyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatPolicyQuery({
 *   variables: {
 *   },
 * });
 */
export function useChatPolicyQuery(baseOptions?: Apollo.QueryHookOptions<ChatPolicyQuery, ChatPolicyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChatPolicyQuery, ChatPolicyQueryVariables>(ChatPolicyDocument, options);
      }
export function useChatPolicyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChatPolicyQuery, ChatPolicyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChatPolicyQuery, ChatPolicyQueryVariables>(ChatPolicyDocument, options);
        }
// @ts-ignore
export function useChatPolicySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ChatPolicyQuery, ChatPolicyQueryVariables>): Apollo.UseSuspenseQueryResult<ChatPolicyQuery, ChatPolicyQueryVariables>;
export function useChatPolicySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatPolicyQuery, ChatPolicyQueryVariables>): Apollo.UseSuspenseQueryResult<ChatPolicyQuery | undefined, ChatPolicyQueryVariables>;
export function useChatPolicySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatPolicyQuery, ChatPolicyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ChatPolicyQuery, ChatPolicyQueryVariables>(ChatPolicyDocument, options);
        }
export type ChatPolicyQueryHookResult = ReturnType<typeof useChatPolicyQuery>;
export type ChatPolicyLazyQueryHookResult = ReturnType<typeof useChatPolicyLazyQuery>;
export type ChatPolicySuspenseQueryHookResult = ReturnType<typeof useChatPolicySuspenseQuery>;
export type ChatPolicyQueryResult = Apollo.QueryResult<ChatPolicyQuery, ChatPolicyQueryVariables>;
export const ChatReportsDocument = gql`
    query ChatReports {
  chatReports {
    id
    channelId
    reporterName
    reason
    status
    createdAt
  }
}
    `;

/**
 * __useChatReportsQuery__
 *
 * To run a query within a React component, call `useChatReportsQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatReportsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatReportsQuery({
 *   variables: {
 *   },
 * });
 */
export function useChatReportsQuery(baseOptions?: Apollo.QueryHookOptions<ChatReportsQuery, ChatReportsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChatReportsQuery, ChatReportsQueryVariables>(ChatReportsDocument, options);
      }
export function useChatReportsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChatReportsQuery, ChatReportsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChatReportsQuery, ChatReportsQueryVariables>(ChatReportsDocument, options);
        }
// @ts-ignore
export function useChatReportsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ChatReportsQuery, ChatReportsQueryVariables>): Apollo.UseSuspenseQueryResult<ChatReportsQuery, ChatReportsQueryVariables>;
export function useChatReportsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatReportsQuery, ChatReportsQueryVariables>): Apollo.UseSuspenseQueryResult<ChatReportsQuery | undefined, ChatReportsQueryVariables>;
export function useChatReportsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatReportsQuery, ChatReportsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ChatReportsQuery, ChatReportsQueryVariables>(ChatReportsDocument, options);
        }
export type ChatReportsQueryHookResult = ReturnType<typeof useChatReportsQuery>;
export type ChatReportsLazyQueryHookResult = ReturnType<typeof useChatReportsLazyQuery>;
export type ChatReportsSuspenseQueryHookResult = ReturnType<typeof useChatReportsSuspenseQuery>;
export type ChatReportsQueryResult = Apollo.QueryResult<ChatReportsQuery, ChatReportsQueryVariables>;
export const OpenSubjectChannelDocument = gql`
    mutation OpenSubjectChannel($courseId: ID!) {
  openSubjectChannel(courseId: $courseId) {
    id
    kind
    courseTitle
    unread
  }
}
    `;
export type OpenSubjectChannelMutationFn = Apollo.MutationFunction<OpenSubjectChannelMutation, OpenSubjectChannelMutationVariables>;

/**
 * __useOpenSubjectChannelMutation__
 *
 * To run a mutation, you first call `useOpenSubjectChannelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useOpenSubjectChannelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [openSubjectChannelMutation, { data, loading, error }] = useOpenSubjectChannelMutation({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useOpenSubjectChannelMutation(baseOptions?: Apollo.MutationHookOptions<OpenSubjectChannelMutation, OpenSubjectChannelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<OpenSubjectChannelMutation, OpenSubjectChannelMutationVariables>(OpenSubjectChannelDocument, options);
      }
export type OpenSubjectChannelMutationHookResult = ReturnType<typeof useOpenSubjectChannelMutation>;
export type OpenSubjectChannelMutationResult = Apollo.MutationResult<OpenSubjectChannelMutation>;
export type OpenSubjectChannelMutationOptions = Apollo.BaseMutationOptions<OpenSubjectChannelMutation, OpenSubjectChannelMutationVariables>;
export const OpenDirectChannelDocument = gql`
    mutation OpenDirectChannel($userId: ID!) {
  openDirectChannel(userId: $userId) {
    id
    kind
    unread
  }
}
    `;
export type OpenDirectChannelMutationFn = Apollo.MutationFunction<OpenDirectChannelMutation, OpenDirectChannelMutationVariables>;

/**
 * __useOpenDirectChannelMutation__
 *
 * To run a mutation, you first call `useOpenDirectChannelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useOpenDirectChannelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [openDirectChannelMutation, { data, loading, error }] = useOpenDirectChannelMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useOpenDirectChannelMutation(baseOptions?: Apollo.MutationHookOptions<OpenDirectChannelMutation, OpenDirectChannelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<OpenDirectChannelMutation, OpenDirectChannelMutationVariables>(OpenDirectChannelDocument, options);
      }
export type OpenDirectChannelMutationHookResult = ReturnType<typeof useOpenDirectChannelMutation>;
export type OpenDirectChannelMutationResult = Apollo.MutationResult<OpenDirectChannelMutation>;
export type OpenDirectChannelMutationOptions = Apollo.BaseMutationOptions<OpenDirectChannelMutation, OpenDirectChannelMutationVariables>;
export const SendChannelMessageDocument = gql`
    mutation SendChannelMessage($channelId: ID!, $text: String!) {
  sendChannelMessage(channelId: $channelId, text: $text) {
    id
    channelId
    senderId
    senderName
    text
    sentAt
    mine
  }
}
    `;
export type SendChannelMessageMutationFn = Apollo.MutationFunction<SendChannelMessageMutation, SendChannelMessageMutationVariables>;

/**
 * __useSendChannelMessageMutation__
 *
 * To run a mutation, you first call `useSendChannelMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendChannelMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendChannelMessageMutation, { data, loading, error }] = useSendChannelMessageMutation({
 *   variables: {
 *      channelId: // value for 'channelId'
 *      text: // value for 'text'
 *   },
 * });
 */
export function useSendChannelMessageMutation(baseOptions?: Apollo.MutationHookOptions<SendChannelMessageMutation, SendChannelMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendChannelMessageMutation, SendChannelMessageMutationVariables>(SendChannelMessageDocument, options);
      }
export type SendChannelMessageMutationHookResult = ReturnType<typeof useSendChannelMessageMutation>;
export type SendChannelMessageMutationResult = Apollo.MutationResult<SendChannelMessageMutation>;
export type SendChannelMessageMutationOptions = Apollo.BaseMutationOptions<SendChannelMessageMutation, SendChannelMessageMutationVariables>;
export const MarkChannelReadDocument = gql`
    mutation MarkChannelRead($channelId: ID!) {
  markChannelRead(channelId: $channelId)
}
    `;
export type MarkChannelReadMutationFn = Apollo.MutationFunction<MarkChannelReadMutation, MarkChannelReadMutationVariables>;

/**
 * __useMarkChannelReadMutation__
 *
 * To run a mutation, you first call `useMarkChannelReadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkChannelReadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markChannelReadMutation, { data, loading, error }] = useMarkChannelReadMutation({
 *   variables: {
 *      channelId: // value for 'channelId'
 *   },
 * });
 */
export function useMarkChannelReadMutation(baseOptions?: Apollo.MutationHookOptions<MarkChannelReadMutation, MarkChannelReadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MarkChannelReadMutation, MarkChannelReadMutationVariables>(MarkChannelReadDocument, options);
      }
export type MarkChannelReadMutationHookResult = ReturnType<typeof useMarkChannelReadMutation>;
export type MarkChannelReadMutationResult = Apollo.MutationResult<MarkChannelReadMutation>;
export type MarkChannelReadMutationOptions = Apollo.BaseMutationOptions<MarkChannelReadMutation, MarkChannelReadMutationVariables>;
export const ReportChannelDocument = gql`
    mutation ReportChannel($channelId: ID!, $reason: String) {
  reportChannel(channelId: $channelId, reason: $reason) {
    id
    channelId
    status
  }
}
    `;
export type ReportChannelMutationFn = Apollo.MutationFunction<ReportChannelMutation, ReportChannelMutationVariables>;

/**
 * __useReportChannelMutation__
 *
 * To run a mutation, you first call `useReportChannelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReportChannelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reportChannelMutation, { data, loading, error }] = useReportChannelMutation({
 *   variables: {
 *      channelId: // value for 'channelId'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useReportChannelMutation(baseOptions?: Apollo.MutationHookOptions<ReportChannelMutation, ReportChannelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReportChannelMutation, ReportChannelMutationVariables>(ReportChannelDocument, options);
      }
export type ReportChannelMutationHookResult = ReturnType<typeof useReportChannelMutation>;
export type ReportChannelMutationResult = Apollo.MutationResult<ReportChannelMutation>;
export type ReportChannelMutationOptions = Apollo.BaseMutationOptions<ReportChannelMutation, ReportChannelMutationVariables>;
export const ResolveChatReportDocument = gql`
    mutation ResolveChatReport($reportId: ID!, $dismiss: Boolean) {
  resolveChatReport(reportId: $reportId, dismiss: $dismiss) {
    id
    status
  }
}
    `;
export type ResolveChatReportMutationFn = Apollo.MutationFunction<ResolveChatReportMutation, ResolveChatReportMutationVariables>;

/**
 * __useResolveChatReportMutation__
 *
 * To run a mutation, you first call `useResolveChatReportMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResolveChatReportMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resolveChatReportMutation, { data, loading, error }] = useResolveChatReportMutation({
 *   variables: {
 *      reportId: // value for 'reportId'
 *      dismiss: // value for 'dismiss'
 *   },
 * });
 */
export function useResolveChatReportMutation(baseOptions?: Apollo.MutationHookOptions<ResolveChatReportMutation, ResolveChatReportMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResolveChatReportMutation, ResolveChatReportMutationVariables>(ResolveChatReportDocument, options);
      }
export type ResolveChatReportMutationHookResult = ReturnType<typeof useResolveChatReportMutation>;
export type ResolveChatReportMutationResult = Apollo.MutationResult<ResolveChatReportMutation>;
export type ResolveChatReportMutationOptions = Apollo.BaseMutationOptions<ResolveChatReportMutation, ResolveChatReportMutationVariables>;
export const ChannelMessageReceivedDocument = gql`
    subscription ChannelMessageReceived($channelId: ID!) {
  channelMessageReceived(channelId: $channelId) {
    id
    channelId
    senderId
    senderName
    text
    sentAt
    mine
  }
}
    `;

/**
 * __useChannelMessageReceivedSubscription__
 *
 * To run a query within a React component, call `useChannelMessageReceivedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useChannelMessageReceivedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChannelMessageReceivedSubscription({
 *   variables: {
 *      channelId: // value for 'channelId'
 *   },
 * });
 */
export function useChannelMessageReceivedSubscription(baseOptions: Apollo.SubscriptionHookOptions<ChannelMessageReceivedSubscription, ChannelMessageReceivedSubscriptionVariables> & ({ variables: ChannelMessageReceivedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<ChannelMessageReceivedSubscription, ChannelMessageReceivedSubscriptionVariables>(ChannelMessageReceivedDocument, options);
      }
export type ChannelMessageReceivedSubscriptionHookResult = ReturnType<typeof useChannelMessageReceivedSubscription>;
export type ChannelMessageReceivedSubscriptionResult = Apollo.SubscriptionResult<ChannelMessageReceivedSubscription>;
export const CatalogDocument = gql`
    query Catalog($filter: CourseFilter, $first: Int, $after: String) {
  catalog(filter: $filter, first: $first, after: $after) {
    totalCount
    subjectCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      title
      description
      subject
      level
      format
      status
      lessonCount
      enrollmentCount
      owner {
        specialty
        user {
          id
          firstName
          lastName
          displayName
          shortName
          formalName
        }
      }
    }
  }
}
    `;

/**
 * __useCatalogQuery__
 *
 * To run a query within a React component, call `useCatalogQuery` and pass it any options that fit your needs.
 * When your component renders, `useCatalogQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCatalogQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useCatalogQuery(baseOptions?: Apollo.QueryHookOptions<CatalogQuery, CatalogQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CatalogQuery, CatalogQueryVariables>(CatalogDocument, options);
      }
export function useCatalogLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CatalogQuery, CatalogQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CatalogQuery, CatalogQueryVariables>(CatalogDocument, options);
        }
// @ts-ignore
export function useCatalogSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CatalogQuery, CatalogQueryVariables>): Apollo.UseSuspenseQueryResult<CatalogQuery, CatalogQueryVariables>;
export function useCatalogSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CatalogQuery, CatalogQueryVariables>): Apollo.UseSuspenseQueryResult<CatalogQuery | undefined, CatalogQueryVariables>;
export function useCatalogSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CatalogQuery, CatalogQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CatalogQuery, CatalogQueryVariables>(CatalogDocument, options);
        }
export type CatalogQueryHookResult = ReturnType<typeof useCatalogQuery>;
export type CatalogLazyQueryHookResult = ReturnType<typeof useCatalogLazyQuery>;
export type CatalogSuspenseQueryHookResult = ReturnType<typeof useCatalogSuspenseQuery>;
export type CatalogQueryResult = Apollo.QueryResult<CatalogQuery, CatalogQueryVariables>;
export const CourseDetailDocument = gql`
    query CourseDetail($id: ID!) {
  course(id: $id) {
    id
    title
    description
    subject
    level
    format
    status
    lessonCount
    enrollmentCount
    updatedAt
    owner {
      specialty
      user {
        id
        firstName
        lastName
        displayName
        shortName
        formalName
      }
    }
    sections {
      id
      title
      description
      order
      lessons {
        id
        title
        durationMin
        status
        order
        nextSessionAt
        options {
          homework
        }
        materials {
          id
          type
          title
          url
          body
          fileUrl
          order
        }
      }
    }
    viewerEnrollment {
      id
      status
      progressPct
      viewedLessonIds
    }
  }
}
    `;

/**
 * __useCourseDetailQuery__
 *
 * To run a query within a React component, call `useCourseDetailQuery` and pass it any options that fit your needs.
 * When your component renders, `useCourseDetailQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCourseDetailQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCourseDetailQuery(baseOptions: Apollo.QueryHookOptions<CourseDetailQuery, CourseDetailQueryVariables> & ({ variables: CourseDetailQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CourseDetailQuery, CourseDetailQueryVariables>(CourseDetailDocument, options);
      }
export function useCourseDetailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CourseDetailQuery, CourseDetailQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CourseDetailQuery, CourseDetailQueryVariables>(CourseDetailDocument, options);
        }
// @ts-ignore
export function useCourseDetailSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CourseDetailQuery, CourseDetailQueryVariables>): Apollo.UseSuspenseQueryResult<CourseDetailQuery, CourseDetailQueryVariables>;
export function useCourseDetailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CourseDetailQuery, CourseDetailQueryVariables>): Apollo.UseSuspenseQueryResult<CourseDetailQuery | undefined, CourseDetailQueryVariables>;
export function useCourseDetailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CourseDetailQuery, CourseDetailQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CourseDetailQuery, CourseDetailQueryVariables>(CourseDetailDocument, options);
        }
export type CourseDetailQueryHookResult = ReturnType<typeof useCourseDetailQuery>;
export type CourseDetailLazyQueryHookResult = ReturnType<typeof useCourseDetailLazyQuery>;
export type CourseDetailSuspenseQueryHookResult = ReturnType<typeof useCourseDetailSuspenseQuery>;
export type CourseDetailQueryResult = Apollo.QueryResult<CourseDetailQuery, CourseDetailQueryVariables>;
export const MyCoursesDocument = gql`
    query MyCourses {
  myCourses {
    id
    title
    subject
    level
    format
    status
    lessonCount
    enrollmentCount
  }
}
    `;

/**
 * __useMyCoursesQuery__
 *
 * To run a query within a React component, call `useMyCoursesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyCoursesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyCoursesQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyCoursesQuery(baseOptions?: Apollo.QueryHookOptions<MyCoursesQuery, MyCoursesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyCoursesQuery, MyCoursesQueryVariables>(MyCoursesDocument, options);
      }
export function useMyCoursesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyCoursesQuery, MyCoursesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyCoursesQuery, MyCoursesQueryVariables>(MyCoursesDocument, options);
        }
// @ts-ignore
export function useMyCoursesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyCoursesQuery, MyCoursesQueryVariables>): Apollo.UseSuspenseQueryResult<MyCoursesQuery, MyCoursesQueryVariables>;
export function useMyCoursesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyCoursesQuery, MyCoursesQueryVariables>): Apollo.UseSuspenseQueryResult<MyCoursesQuery | undefined, MyCoursesQueryVariables>;
export function useMyCoursesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyCoursesQuery, MyCoursesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyCoursesQuery, MyCoursesQueryVariables>(MyCoursesDocument, options);
        }
export type MyCoursesQueryHookResult = ReturnType<typeof useMyCoursesQuery>;
export type MyCoursesLazyQueryHookResult = ReturnType<typeof useMyCoursesLazyQuery>;
export type MyCoursesSuspenseQueryHookResult = ReturnType<typeof useMyCoursesSuspenseQuery>;
export type MyCoursesQueryResult = Apollo.QueryResult<MyCoursesQuery, MyCoursesQueryVariables>;
export const CreateCourseDocument = gql`
    mutation CreateCourse($input: CourseInput!) {
  createCourse(input: $input) {
    id
    status
  }
}
    `;
export type CreateCourseMutationFn = Apollo.MutationFunction<CreateCourseMutation, CreateCourseMutationVariables>;

/**
 * __useCreateCourseMutation__
 *
 * To run a mutation, you first call `useCreateCourseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCourseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCourseMutation, { data, loading, error }] = useCreateCourseMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCourseMutation(baseOptions?: Apollo.MutationHookOptions<CreateCourseMutation, CreateCourseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCourseMutation, CreateCourseMutationVariables>(CreateCourseDocument, options);
      }
export type CreateCourseMutationHookResult = ReturnType<typeof useCreateCourseMutation>;
export type CreateCourseMutationResult = Apollo.MutationResult<CreateCourseMutation>;
export type CreateCourseMutationOptions = Apollo.BaseMutationOptions<CreateCourseMutation, CreateCourseMutationVariables>;
export const PublishCourseDocument = gql`
    mutation PublishCourse($id: ID!) {
  publishCourse(id: $id) {
    id
    status
  }
}
    `;
export type PublishCourseMutationFn = Apollo.MutationFunction<PublishCourseMutation, PublishCourseMutationVariables>;

/**
 * __usePublishCourseMutation__
 *
 * To run a mutation, you first call `usePublishCourseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishCourseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishCourseMutation, { data, loading, error }] = usePublishCourseMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePublishCourseMutation(baseOptions?: Apollo.MutationHookOptions<PublishCourseMutation, PublishCourseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PublishCourseMutation, PublishCourseMutationVariables>(PublishCourseDocument, options);
      }
export type PublishCourseMutationHookResult = ReturnType<typeof usePublishCourseMutation>;
export type PublishCourseMutationResult = Apollo.MutationResult<PublishCourseMutation>;
export type PublishCourseMutationOptions = Apollo.BaseMutationOptions<PublishCourseMutation, PublishCourseMutationVariables>;
export const UnpublishCourseDocument = gql`
    mutation UnpublishCourse($id: ID!) {
  unpublishCourse(id: $id) {
    id
    status
  }
}
    `;
export type UnpublishCourseMutationFn = Apollo.MutationFunction<UnpublishCourseMutation, UnpublishCourseMutationVariables>;

/**
 * __useUnpublishCourseMutation__
 *
 * To run a mutation, you first call `useUnpublishCourseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnpublishCourseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unpublishCourseMutation, { data, loading, error }] = useUnpublishCourseMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnpublishCourseMutation(baseOptions?: Apollo.MutationHookOptions<UnpublishCourseMutation, UnpublishCourseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnpublishCourseMutation, UnpublishCourseMutationVariables>(UnpublishCourseDocument, options);
      }
export type UnpublishCourseMutationHookResult = ReturnType<typeof useUnpublishCourseMutation>;
export type UnpublishCourseMutationResult = Apollo.MutationResult<UnpublishCourseMutation>;
export type UnpublishCourseMutationOptions = Apollo.BaseMutationOptions<UnpublishCourseMutation, UnpublishCourseMutationVariables>;
export const CreateSectionDocument = gql`
    mutation CreateSection($courseId: ID!, $input: SectionInput!) {
  createSection(courseId: $courseId, input: $input) {
    id
    title
    order
  }
}
    `;
export type CreateSectionMutationFn = Apollo.MutationFunction<CreateSectionMutation, CreateSectionMutationVariables>;

/**
 * __useCreateSectionMutation__
 *
 * To run a mutation, you first call `useCreateSectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSectionMutation, { data, loading, error }] = useCreateSectionMutation({
 *   variables: {
 *      courseId: // value for 'courseId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateSectionMutation(baseOptions?: Apollo.MutationHookOptions<CreateSectionMutation, CreateSectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSectionMutation, CreateSectionMutationVariables>(CreateSectionDocument, options);
      }
export type CreateSectionMutationHookResult = ReturnType<typeof useCreateSectionMutation>;
export type CreateSectionMutationResult = Apollo.MutationResult<CreateSectionMutation>;
export type CreateSectionMutationOptions = Apollo.BaseMutationOptions<CreateSectionMutation, CreateSectionMutationVariables>;
export const UpdateSectionDocument = gql`
    mutation UpdateSection($id: ID!, $input: SectionInput!) {
  updateSection(id: $id, input: $input) {
    id
    title
  }
}
    `;
export type UpdateSectionMutationFn = Apollo.MutationFunction<UpdateSectionMutation, UpdateSectionMutationVariables>;

/**
 * __useUpdateSectionMutation__
 *
 * To run a mutation, you first call `useUpdateSectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSectionMutation, { data, loading, error }] = useUpdateSectionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateSectionMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSectionMutation, UpdateSectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSectionMutation, UpdateSectionMutationVariables>(UpdateSectionDocument, options);
      }
export type UpdateSectionMutationHookResult = ReturnType<typeof useUpdateSectionMutation>;
export type UpdateSectionMutationResult = Apollo.MutationResult<UpdateSectionMutation>;
export type UpdateSectionMutationOptions = Apollo.BaseMutationOptions<UpdateSectionMutation, UpdateSectionMutationVariables>;
export const UpdateLessonDocument = gql`
    mutation UpdateLesson($id: ID!, $input: LessonInput!) {
  updateLesson(id: $id, input: $input) {
    id
    title
    description
    kind
    deviceKey
  }
}
    `;
export type UpdateLessonMutationFn = Apollo.MutationFunction<UpdateLessonMutation, UpdateLessonMutationVariables>;

/**
 * __useUpdateLessonMutation__
 *
 * To run a mutation, you first call `useUpdateLessonMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateLessonMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateLessonMutation, { data, loading, error }] = useUpdateLessonMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateLessonMutation(baseOptions?: Apollo.MutationHookOptions<UpdateLessonMutation, UpdateLessonMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateLessonMutation, UpdateLessonMutationVariables>(UpdateLessonDocument, options);
      }
export type UpdateLessonMutationHookResult = ReturnType<typeof useUpdateLessonMutation>;
export type UpdateLessonMutationResult = Apollo.MutationResult<UpdateLessonMutation>;
export type UpdateLessonMutationOptions = Apollo.BaseMutationOptions<UpdateLessonMutation, UpdateLessonMutationVariables>;
export const CreateLessonDocument = gql`
    mutation CreateLesson($sectionId: ID!, $input: LessonInput!) {
  createLesson(sectionId: $sectionId, input: $input) {
    id
    title
    status
    kind
    deviceKey
  }
}
    `;
export type CreateLessonMutationFn = Apollo.MutationFunction<CreateLessonMutation, CreateLessonMutationVariables>;

/**
 * __useCreateLessonMutation__
 *
 * To run a mutation, you first call `useCreateLessonMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateLessonMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createLessonMutation, { data, loading, error }] = useCreateLessonMutation({
 *   variables: {
 *      sectionId: // value for 'sectionId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateLessonMutation(baseOptions?: Apollo.MutationHookOptions<CreateLessonMutation, CreateLessonMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateLessonMutation, CreateLessonMutationVariables>(CreateLessonDocument, options);
      }
export type CreateLessonMutationHookResult = ReturnType<typeof useCreateLessonMutation>;
export type CreateLessonMutationResult = Apollo.MutationResult<CreateLessonMutation>;
export type CreateLessonMutationOptions = Apollo.BaseMutationOptions<CreateLessonMutation, CreateLessonMutationVariables>;
export const PublishLessonDocument = gql`
    mutation PublishLesson($id: ID!) {
  publishLesson(id: $id) {
    id
    status
  }
}
    `;
export type PublishLessonMutationFn = Apollo.MutationFunction<PublishLessonMutation, PublishLessonMutationVariables>;

/**
 * __usePublishLessonMutation__
 *
 * To run a mutation, you first call `usePublishLessonMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishLessonMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishLessonMutation, { data, loading, error }] = usePublishLessonMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePublishLessonMutation(baseOptions?: Apollo.MutationHookOptions<PublishLessonMutation, PublishLessonMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PublishLessonMutation, PublishLessonMutationVariables>(PublishLessonDocument, options);
      }
export type PublishLessonMutationHookResult = ReturnType<typeof usePublishLessonMutation>;
export type PublishLessonMutationResult = Apollo.MutationResult<PublishLessonMutation>;
export type PublishLessonMutationOptions = Apollo.BaseMutationOptions<PublishLessonMutation, PublishLessonMutationVariables>;
export const EnrollDocument = gql`
    mutation Enroll($courseId: ID!) {
  enroll(courseId: $courseId) {
    id
    status
    progressPct
  }
}
    `;
export type EnrollMutationFn = Apollo.MutationFunction<EnrollMutation, EnrollMutationVariables>;

/**
 * __useEnrollMutation__
 *
 * To run a mutation, you first call `useEnrollMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnrollMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enrollMutation, { data, loading, error }] = useEnrollMutation({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useEnrollMutation(baseOptions?: Apollo.MutationHookOptions<EnrollMutation, EnrollMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnrollMutation, EnrollMutationVariables>(EnrollDocument, options);
      }
export type EnrollMutationHookResult = ReturnType<typeof useEnrollMutation>;
export type EnrollMutationResult = Apollo.MutationResult<EnrollMutation>;
export type EnrollMutationOptions = Apollo.BaseMutationOptions<EnrollMutation, EnrollMutationVariables>;
export const UnenrollDocument = gql`
    mutation Unenroll($courseId: ID!) {
  unenroll(courseId: $courseId)
}
    `;
export type UnenrollMutationFn = Apollo.MutationFunction<UnenrollMutation, UnenrollMutationVariables>;

/**
 * __useUnenrollMutation__
 *
 * To run a mutation, you first call `useUnenrollMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnenrollMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unenrollMutation, { data, loading, error }] = useUnenrollMutation({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useUnenrollMutation(baseOptions?: Apollo.MutationHookOptions<UnenrollMutation, UnenrollMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnenrollMutation, UnenrollMutationVariables>(UnenrollDocument, options);
      }
export type UnenrollMutationHookResult = ReturnType<typeof useUnenrollMutation>;
export type UnenrollMutationResult = Apollo.MutationResult<UnenrollMutation>;
export type UnenrollMutationOptions = Apollo.BaseMutationOptions<UnenrollMutation, UnenrollMutationVariables>;
export const UpdateCourseDocument = gql`
    mutation UpdateCourse($id: ID!, $input: CourseInput!) {
  updateCourse(id: $id, input: $input) {
    id
    title
  }
}
    `;
export type UpdateCourseMutationFn = Apollo.MutationFunction<UpdateCourseMutation, UpdateCourseMutationVariables>;

/**
 * __useUpdateCourseMutation__
 *
 * To run a mutation, you first call `useUpdateCourseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCourseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCourseMutation, { data, loading, error }] = useUpdateCourseMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCourseMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCourseMutation, UpdateCourseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCourseMutation, UpdateCourseMutationVariables>(UpdateCourseDocument, options);
      }
export type UpdateCourseMutationHookResult = ReturnType<typeof useUpdateCourseMutation>;
export type UpdateCourseMutationResult = Apollo.MutationResult<UpdateCourseMutation>;
export type UpdateCourseMutationOptions = Apollo.BaseMutationOptions<UpdateCourseMutation, UpdateCourseMutationVariables>;
export const DeleteSectionDocument = gql`
    mutation DeleteSection($id: ID!) {
  deleteSection(id: $id)
}
    `;
export type DeleteSectionMutationFn = Apollo.MutationFunction<DeleteSectionMutation, DeleteSectionMutationVariables>;

/**
 * __useDeleteSectionMutation__
 *
 * To run a mutation, you first call `useDeleteSectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSectionMutation, { data, loading, error }] = useDeleteSectionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteSectionMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSectionMutation, DeleteSectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSectionMutation, DeleteSectionMutationVariables>(DeleteSectionDocument, options);
      }
export type DeleteSectionMutationHookResult = ReturnType<typeof useDeleteSectionMutation>;
export type DeleteSectionMutationResult = Apollo.MutationResult<DeleteSectionMutation>;
export type DeleteSectionMutationOptions = Apollo.BaseMutationOptions<DeleteSectionMutation, DeleteSectionMutationVariables>;
export const DeleteLessonDocument = gql`
    mutation DeleteLesson($id: ID!) {
  deleteLesson(id: $id)
}
    `;
export type DeleteLessonMutationFn = Apollo.MutationFunction<DeleteLessonMutation, DeleteLessonMutationVariables>;

/**
 * __useDeleteLessonMutation__
 *
 * To run a mutation, you first call `useDeleteLessonMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLessonMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLessonMutation, { data, loading, error }] = useDeleteLessonMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteLessonMutation(baseOptions?: Apollo.MutationHookOptions<DeleteLessonMutation, DeleteLessonMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteLessonMutation, DeleteLessonMutationVariables>(DeleteLessonDocument, options);
      }
export type DeleteLessonMutationHookResult = ReturnType<typeof useDeleteLessonMutation>;
export type DeleteLessonMutationResult = Apollo.MutationResult<DeleteLessonMutation>;
export type DeleteLessonMutationOptions = Apollo.BaseMutationOptions<DeleteLessonMutation, DeleteLessonMutationVariables>;
export const ReorderSectionsDocument = gql`
    mutation ReorderSections($courseId: ID!, $orderedIds: [ID!]!) {
  reorderSections(courseId: $courseId, orderedIds: $orderedIds) {
    id
    order
  }
}
    `;
export type ReorderSectionsMutationFn = Apollo.MutationFunction<ReorderSectionsMutation, ReorderSectionsMutationVariables>;

/**
 * __useReorderSectionsMutation__
 *
 * To run a mutation, you first call `useReorderSectionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReorderSectionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reorderSectionsMutation, { data, loading, error }] = useReorderSectionsMutation({
 *   variables: {
 *      courseId: // value for 'courseId'
 *      orderedIds: // value for 'orderedIds'
 *   },
 * });
 */
export function useReorderSectionsMutation(baseOptions?: Apollo.MutationHookOptions<ReorderSectionsMutation, ReorderSectionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReorderSectionsMutation, ReorderSectionsMutationVariables>(ReorderSectionsDocument, options);
      }
export type ReorderSectionsMutationHookResult = ReturnType<typeof useReorderSectionsMutation>;
export type ReorderSectionsMutationResult = Apollo.MutationResult<ReorderSectionsMutation>;
export type ReorderSectionsMutationOptions = Apollo.BaseMutationOptions<ReorderSectionsMutation, ReorderSectionsMutationVariables>;
export const ReorderLessonsDocument = gql`
    mutation ReorderLessons($sectionId: ID!, $orderedIds: [ID!]!) {
  reorderLessons(sectionId: $sectionId, orderedIds: $orderedIds) {
    id
    order
  }
}
    `;
export type ReorderLessonsMutationFn = Apollo.MutationFunction<ReorderLessonsMutation, ReorderLessonsMutationVariables>;

/**
 * __useReorderLessonsMutation__
 *
 * To run a mutation, you first call `useReorderLessonsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReorderLessonsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reorderLessonsMutation, { data, loading, error }] = useReorderLessonsMutation({
 *   variables: {
 *      sectionId: // value for 'sectionId'
 *      orderedIds: // value for 'orderedIds'
 *   },
 * });
 */
export function useReorderLessonsMutation(baseOptions?: Apollo.MutationHookOptions<ReorderLessonsMutation, ReorderLessonsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReorderLessonsMutation, ReorderLessonsMutationVariables>(ReorderLessonsDocument, options);
      }
export type ReorderLessonsMutationHookResult = ReturnType<typeof useReorderLessonsMutation>;
export type ReorderLessonsMutationResult = Apollo.MutationResult<ReorderLessonsMutation>;
export type ReorderLessonsMutationOptions = Apollo.BaseMutationOptions<ReorderLessonsMutation, ReorderLessonsMutationVariables>;
export const AddMaterialDocument = gql`
    mutation AddMaterial($input: MaterialInput!) {
  addMaterial(input: $input) {
    id
    type
    title
  }
}
    `;
export type AddMaterialMutationFn = Apollo.MutationFunction<AddMaterialMutation, AddMaterialMutationVariables>;

/**
 * __useAddMaterialMutation__
 *
 * To run a mutation, you first call `useAddMaterialMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddMaterialMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addMaterialMutation, { data, loading, error }] = useAddMaterialMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddMaterialMutation(baseOptions?: Apollo.MutationHookOptions<AddMaterialMutation, AddMaterialMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddMaterialMutation, AddMaterialMutationVariables>(AddMaterialDocument, options);
      }
export type AddMaterialMutationHookResult = ReturnType<typeof useAddMaterialMutation>;
export type AddMaterialMutationResult = Apollo.MutationResult<AddMaterialMutation>;
export type AddMaterialMutationOptions = Apollo.BaseMutationOptions<AddMaterialMutation, AddMaterialMutationVariables>;
export const DeleteMaterialDocument = gql`
    mutation DeleteMaterial($id: ID!) {
  deleteMaterial(id: $id)
}
    `;
export type DeleteMaterialMutationFn = Apollo.MutationFunction<DeleteMaterialMutation, DeleteMaterialMutationVariables>;

/**
 * __useDeleteMaterialMutation__
 *
 * To run a mutation, you first call `useDeleteMaterialMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMaterialMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMaterialMutation, { data, loading, error }] = useDeleteMaterialMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteMaterialMutation(baseOptions?: Apollo.MutationHookOptions<DeleteMaterialMutation, DeleteMaterialMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteMaterialMutation, DeleteMaterialMutationVariables>(DeleteMaterialDocument, options);
      }
export type DeleteMaterialMutationHookResult = ReturnType<typeof useDeleteMaterialMutation>;
export type DeleteMaterialMutationResult = Apollo.MutationResult<DeleteMaterialMutation>;
export type DeleteMaterialMutationOptions = Apollo.BaseMutationOptions<DeleteMaterialMutation, DeleteMaterialMutationVariables>;
export const RequestPairingCodeDocument = gql`
    mutation RequestPairingCode($deviceName: String!, $platform: DevicePlatform, $appVersion: String) {
  requestPairingCode(
    deviceName: $deviceName
    platform: $platform
    appVersion: $appVersion
  ) {
    code
    secret
    expiresAt
  }
}
    `;
export type RequestPairingCodeMutationFn = Apollo.MutationFunction<RequestPairingCodeMutation, RequestPairingCodeMutationVariables>;

/**
 * __useRequestPairingCodeMutation__
 *
 * To run a mutation, you first call `useRequestPairingCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestPairingCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestPairingCodeMutation, { data, loading, error }] = useRequestPairingCodeMutation({
 *   variables: {
 *      deviceName: // value for 'deviceName'
 *      platform: // value for 'platform'
 *      appVersion: // value for 'appVersion'
 *   },
 * });
 */
export function useRequestPairingCodeMutation(baseOptions?: Apollo.MutationHookOptions<RequestPairingCodeMutation, RequestPairingCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestPairingCodeMutation, RequestPairingCodeMutationVariables>(RequestPairingCodeDocument, options);
      }
export type RequestPairingCodeMutationHookResult = ReturnType<typeof useRequestPairingCodeMutation>;
export type RequestPairingCodeMutationResult = Apollo.MutationResult<RequestPairingCodeMutation>;
export type RequestPairingCodeMutationOptions = Apollo.BaseMutationOptions<RequestPairingCodeMutation, RequestPairingCodeMutationVariables>;
export const ClaimDeviceTokenDocument = gql`
    mutation ClaimDeviceToken($code: String!, $secret: String!) {
  claimDeviceToken(code: $code, secret: $secret) {
    token
    session {
      token
      refreshToken
      displayName
    }
    device {
      id
      name
      platform
      appVersion
      lastSeenAt
      online
      pairedAt
      setup {
        step
        completed
        backupKind
        backupConfiguredAt
        cloudCopyEnabled
        lastBackupAt
      }
    }
  }
}
    `;
export type ClaimDeviceTokenMutationFn = Apollo.MutationFunction<ClaimDeviceTokenMutation, ClaimDeviceTokenMutationVariables>;

/**
 * __useClaimDeviceTokenMutation__
 *
 * To run a mutation, you first call `useClaimDeviceTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useClaimDeviceTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [claimDeviceTokenMutation, { data, loading, error }] = useClaimDeviceTokenMutation({
 *   variables: {
 *      code: // value for 'code'
 *      secret: // value for 'secret'
 *   },
 * });
 */
export function useClaimDeviceTokenMutation(baseOptions?: Apollo.MutationHookOptions<ClaimDeviceTokenMutation, ClaimDeviceTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ClaimDeviceTokenMutation, ClaimDeviceTokenMutationVariables>(ClaimDeviceTokenDocument, options);
      }
export type ClaimDeviceTokenMutationHookResult = ReturnType<typeof useClaimDeviceTokenMutation>;
export type ClaimDeviceTokenMutationResult = Apollo.MutationResult<ClaimDeviceTokenMutation>;
export type ClaimDeviceTokenMutationOptions = Apollo.BaseMutationOptions<ClaimDeviceTokenMutation, ClaimDeviceTokenMutationVariables>;
export const ConfirmPairingCodeDocument = gql`
    mutation ConfirmPairingCode($code: String!) {
  confirmPairingCode(code: $code) {
    id
    name
    platform
    pairedAt
  }
}
    `;
export type ConfirmPairingCodeMutationFn = Apollo.MutationFunction<ConfirmPairingCodeMutation, ConfirmPairingCodeMutationVariables>;

/**
 * __useConfirmPairingCodeMutation__
 *
 * To run a mutation, you first call `useConfirmPairingCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useConfirmPairingCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [confirmPairingCodeMutation, { data, loading, error }] = useConfirmPairingCodeMutation({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useConfirmPairingCodeMutation(baseOptions?: Apollo.MutationHookOptions<ConfirmPairingCodeMutation, ConfirmPairingCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ConfirmPairingCodeMutation, ConfirmPairingCodeMutationVariables>(ConfirmPairingCodeDocument, options);
      }
export type ConfirmPairingCodeMutationHookResult = ReturnType<typeof useConfirmPairingCodeMutation>;
export type ConfirmPairingCodeMutationResult = Apollo.MutationResult<ConfirmPairingCodeMutation>;
export type ConfirmPairingCodeMutationOptions = Apollo.BaseMutationOptions<ConfirmPairingCodeMutation, ConfirmPairingCodeMutationVariables>;
export const MyDevicesDocument = gql`
    query MyDevices {
  myDevices {
    id
    name
    platform
    appVersion
    lastSeenAt
    online
    pairedAt
    uplink {
      mbps
      verdict
      groupSize
      requiredForEight
      stale
      connectionType
    }
    setup {
      step
      completed
      backupKind
      backupConfiguredAt
      cloudCopyEnabled
      lastBackupAt
      backupDue
    }
  }
}
    `;

/**
 * __useMyDevicesQuery__
 *
 * To run a query within a React component, call `useMyDevicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyDevicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyDevicesQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyDevicesQuery(baseOptions?: Apollo.QueryHookOptions<MyDevicesQuery, MyDevicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyDevicesQuery, MyDevicesQueryVariables>(MyDevicesDocument, options);
      }
export function useMyDevicesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyDevicesQuery, MyDevicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyDevicesQuery, MyDevicesQueryVariables>(MyDevicesDocument, options);
        }
// @ts-ignore
export function useMyDevicesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyDevicesQuery, MyDevicesQueryVariables>): Apollo.UseSuspenseQueryResult<MyDevicesQuery, MyDevicesQueryVariables>;
export function useMyDevicesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyDevicesQuery, MyDevicesQueryVariables>): Apollo.UseSuspenseQueryResult<MyDevicesQuery | undefined, MyDevicesQueryVariables>;
export function useMyDevicesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyDevicesQuery, MyDevicesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyDevicesQuery, MyDevicesQueryVariables>(MyDevicesDocument, options);
        }
export type MyDevicesQueryHookResult = ReturnType<typeof useMyDevicesQuery>;
export type MyDevicesLazyQueryHookResult = ReturnType<typeof useMyDevicesLazyQuery>;
export type MyDevicesSuspenseQueryHookResult = ReturnType<typeof useMyDevicesSuspenseQuery>;
export type MyDevicesQueryResult = Apollo.QueryResult<MyDevicesQuery, MyDevicesQueryVariables>;
export const ThisDeviceDocument = gql`
    query ThisDevice {
  thisDevice {
    id
    name
    uplink {
      mbps
      verdict
      groupSize
    }
    setup {
      step
      completed
      backupKind
      cloudCopyEnabled
    }
  }
}
    `;

/**
 * __useThisDeviceQuery__
 *
 * To run a query within a React component, call `useThisDeviceQuery` and pass it any options that fit your needs.
 * When your component renders, `useThisDeviceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useThisDeviceQuery({
 *   variables: {
 *   },
 * });
 */
export function useThisDeviceQuery(baseOptions?: Apollo.QueryHookOptions<ThisDeviceQuery, ThisDeviceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ThisDeviceQuery, ThisDeviceQueryVariables>(ThisDeviceDocument, options);
      }
export function useThisDeviceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ThisDeviceQuery, ThisDeviceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ThisDeviceQuery, ThisDeviceQueryVariables>(ThisDeviceDocument, options);
        }
// @ts-ignore
export function useThisDeviceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ThisDeviceQuery, ThisDeviceQueryVariables>): Apollo.UseSuspenseQueryResult<ThisDeviceQuery, ThisDeviceQueryVariables>;
export function useThisDeviceSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ThisDeviceQuery, ThisDeviceQueryVariables>): Apollo.UseSuspenseQueryResult<ThisDeviceQuery | undefined, ThisDeviceQueryVariables>;
export function useThisDeviceSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ThisDeviceQuery, ThisDeviceQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ThisDeviceQuery, ThisDeviceQueryVariables>(ThisDeviceDocument, options);
        }
export type ThisDeviceQueryHookResult = ReturnType<typeof useThisDeviceQuery>;
export type ThisDeviceLazyQueryHookResult = ReturnType<typeof useThisDeviceLazyQuery>;
export type ThisDeviceSuspenseQueryHookResult = ReturnType<typeof useThisDeviceSuspenseQuery>;
export type ThisDeviceQueryResult = Apollo.QueryResult<ThisDeviceQuery, ThisDeviceQueryVariables>;
export const RevokeDeviceDocument = gql`
    mutation RevokeDevice($deviceId: ID!) {
  revokeDevice(deviceId: $deviceId)
}
    `;
export type RevokeDeviceMutationFn = Apollo.MutationFunction<RevokeDeviceMutation, RevokeDeviceMutationVariables>;

/**
 * __useRevokeDeviceMutation__
 *
 * To run a mutation, you first call `useRevokeDeviceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeDeviceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeDeviceMutation, { data, loading, error }] = useRevokeDeviceMutation({
 *   variables: {
 *      deviceId: // value for 'deviceId'
 *   },
 * });
 */
export function useRevokeDeviceMutation(baseOptions?: Apollo.MutationHookOptions<RevokeDeviceMutation, RevokeDeviceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RevokeDeviceMutation, RevokeDeviceMutationVariables>(RevokeDeviceDocument, options);
      }
export type RevokeDeviceMutationHookResult = ReturnType<typeof useRevokeDeviceMutation>;
export type RevokeDeviceMutationResult = Apollo.MutationResult<RevokeDeviceMutation>;
export type RevokeDeviceMutationOptions = Apollo.BaseMutationOptions<RevokeDeviceMutation, RevokeDeviceMutationVariables>;
export const ConfigureCabinetBackupDocument = gql`
    mutation ConfigureCabinetBackup($kind: BackupKind!, $cloudCopy: Boolean) {
  configureCabinetBackup(kind: $kind, cloudCopy: $cloudCopy) {
    id
    setup {
      step
      completed
      backupKind
      backupConfiguredAt
      cloudCopyEnabled
      lastBackupAt
      backupDue
    }
  }
}
    `;
export type ConfigureCabinetBackupMutationFn = Apollo.MutationFunction<ConfigureCabinetBackupMutation, ConfigureCabinetBackupMutationVariables>;

/**
 * __useConfigureCabinetBackupMutation__
 *
 * To run a mutation, you first call `useConfigureCabinetBackupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useConfigureCabinetBackupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [configureCabinetBackupMutation, { data, loading, error }] = useConfigureCabinetBackupMutation({
 *   variables: {
 *      kind: // value for 'kind'
 *      cloudCopy: // value for 'cloudCopy'
 *   },
 * });
 */
export function useConfigureCabinetBackupMutation(baseOptions?: Apollo.MutationHookOptions<ConfigureCabinetBackupMutation, ConfigureCabinetBackupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ConfigureCabinetBackupMutation, ConfigureCabinetBackupMutationVariables>(ConfigureCabinetBackupDocument, options);
      }
export type ConfigureCabinetBackupMutationHookResult = ReturnType<typeof useConfigureCabinetBackupMutation>;
export type ConfigureCabinetBackupMutationResult = Apollo.MutationResult<ConfigureCabinetBackupMutation>;
export type ConfigureCabinetBackupMutationOptions = Apollo.BaseMutationOptions<ConfigureCabinetBackupMutation, ConfigureCabinetBackupMutationVariables>;
export const ExportCabinetDocument = gql`
    mutation ExportCabinet($passphrase: String) {
  exportCabinet(passphrase: $passphrase) {
    createdAt
    fileName
    sealed
    rows
    files
    tables
  }
}
    `;
export type ExportCabinetMutationFn = Apollo.MutationFunction<ExportCabinetMutation, ExportCabinetMutationVariables>;

/**
 * __useExportCabinetMutation__
 *
 * To run a mutation, you first call `useExportCabinetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useExportCabinetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [exportCabinetMutation, { data, loading, error }] = useExportCabinetMutation({
 *   variables: {
 *      passphrase: // value for 'passphrase'
 *   },
 * });
 */
export function useExportCabinetMutation(baseOptions?: Apollo.MutationHookOptions<ExportCabinetMutation, ExportCabinetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ExportCabinetMutation, ExportCabinetMutationVariables>(ExportCabinetDocument, options);
      }
export type ExportCabinetMutationHookResult = ReturnType<typeof useExportCabinetMutation>;
export type ExportCabinetMutationResult = Apollo.MutationResult<ExportCabinetMutation>;
export type ExportCabinetMutationOptions = Apollo.BaseMutationOptions<ExportCabinetMutation, ExportCabinetMutationVariables>;
export const RecordCabinetBackupDocument = gql`
    mutation RecordCabinetBackup {
  recordCabinetBackup {
    id
    setup {
      step
      completed
      backupKind
      backupConfiguredAt
      cloudCopyEnabled
      lastBackupAt
      backupDue
    }
  }
}
    `;
export type RecordCabinetBackupMutationFn = Apollo.MutationFunction<RecordCabinetBackupMutation, RecordCabinetBackupMutationVariables>;

/**
 * __useRecordCabinetBackupMutation__
 *
 * To run a mutation, you first call `useRecordCabinetBackupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRecordCabinetBackupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [recordCabinetBackupMutation, { data, loading, error }] = useRecordCabinetBackupMutation({
 *   variables: {
 *   },
 * });
 */
export function useRecordCabinetBackupMutation(baseOptions?: Apollo.MutationHookOptions<RecordCabinetBackupMutation, RecordCabinetBackupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RecordCabinetBackupMutation, RecordCabinetBackupMutationVariables>(RecordCabinetBackupDocument, options);
      }
export type RecordCabinetBackupMutationHookResult = ReturnType<typeof useRecordCabinetBackupMutation>;
export type RecordCabinetBackupMutationResult = Apollo.MutationResult<RecordCabinetBackupMutation>;
export type RecordCabinetBackupMutationOptions = Apollo.BaseMutationOptions<RecordCabinetBackupMutation, RecordCabinetBackupMutationVariables>;
export const SetSpeechConsentDocument = gql`
    mutation SetSpeechConsent($granted: Boolean!) {
  setSpeechConsent(granted: $granted)
}
    `;
export type SetSpeechConsentMutationFn = Apollo.MutationFunction<SetSpeechConsentMutation, SetSpeechConsentMutationVariables>;

/**
 * __useSetSpeechConsentMutation__
 *
 * To run a mutation, you first call `useSetSpeechConsentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetSpeechConsentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setSpeechConsentMutation, { data, loading, error }] = useSetSpeechConsentMutation({
 *   variables: {
 *      granted: // value for 'granted'
 *   },
 * });
 */
export function useSetSpeechConsentMutation(baseOptions?: Apollo.MutationHookOptions<SetSpeechConsentMutation, SetSpeechConsentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetSpeechConsentMutation, SetSpeechConsentMutationVariables>(SetSpeechConsentDocument, options);
      }
export type SetSpeechConsentMutationHookResult = ReturnType<typeof useSetSpeechConsentMutation>;
export type SetSpeechConsentMutationResult = Apollo.MutationResult<SetSpeechConsentMutation>;
export type SetSpeechConsentMutationOptions = Apollo.BaseMutationOptions<SetSpeechConsentMutation, SetSpeechConsentMutationVariables>;
export const SetAttentionConsentDocument = gql`
    mutation SetAttentionConsent($granted: Boolean!) {
  setAttentionConsent(granted: $granted)
}
    `;
export type SetAttentionConsentMutationFn = Apollo.MutationFunction<SetAttentionConsentMutation, SetAttentionConsentMutationVariables>;

/**
 * __useSetAttentionConsentMutation__
 *
 * To run a mutation, you first call `useSetAttentionConsentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetAttentionConsentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setAttentionConsentMutation, { data, loading, error }] = useSetAttentionConsentMutation({
 *   variables: {
 *      granted: // value for 'granted'
 *   },
 * });
 */
export function useSetAttentionConsentMutation(baseOptions?: Apollo.MutationHookOptions<SetAttentionConsentMutation, SetAttentionConsentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetAttentionConsentMutation, SetAttentionConsentMutationVariables>(SetAttentionConsentDocument, options);
      }
export type SetAttentionConsentMutationHookResult = ReturnType<typeof useSetAttentionConsentMutation>;
export type SetAttentionConsentMutationResult = Apollo.MutationResult<SetAttentionConsentMutation>;
export type SetAttentionConsentMutationOptions = Apollo.BaseMutationOptions<SetAttentionConsentMutation, SetAttentionConsentMutationVariables>;
export const ReportUplinkDocument = gql`
    mutation ReportUplink($mbps: Float!, $connectionType: ConnectionType) {
  reportUplink(mbps: $mbps, connectionType: $connectionType) {
    id
    uplink {
      mbps
      verdict
      groupSize
      requiredForEight
      stale
      connectionType
    }
    setup {
      step
      completed
      backupKind
      backupConfiguredAt
      cloudCopyEnabled
      lastBackupAt
      backupDue
    }
  }
}
    `;
export type ReportUplinkMutationFn = Apollo.MutationFunction<ReportUplinkMutation, ReportUplinkMutationVariables>;

/**
 * __useReportUplinkMutation__
 *
 * To run a mutation, you first call `useReportUplinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReportUplinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reportUplinkMutation, { data, loading, error }] = useReportUplinkMutation({
 *   variables: {
 *      mbps: // value for 'mbps'
 *      connectionType: // value for 'connectionType'
 *   },
 * });
 */
export function useReportUplinkMutation(baseOptions?: Apollo.MutationHookOptions<ReportUplinkMutation, ReportUplinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReportUplinkMutation, ReportUplinkMutationVariables>(ReportUplinkDocument, options);
      }
export type ReportUplinkMutationHookResult = ReturnType<typeof useReportUplinkMutation>;
export type ReportUplinkMutationResult = Apollo.MutationResult<ReportUplinkMutation>;
export type ReportUplinkMutationOptions = Apollo.BaseMutationOptions<ReportUplinkMutation, ReportUplinkMutationVariables>;
export const AdvanceDeviceSetupDocument = gql`
    mutation AdvanceDeviceSetup($step: Int!) {
  advanceDeviceSetup(step: $step) {
    id
    setup {
      step
      completed
      backupKind
      backupConfiguredAt
      cloudCopyEnabled
      lastBackupAt
      backupDue
    }
  }
}
    `;
export type AdvanceDeviceSetupMutationFn = Apollo.MutationFunction<AdvanceDeviceSetupMutation, AdvanceDeviceSetupMutationVariables>;

/**
 * __useAdvanceDeviceSetupMutation__
 *
 * To run a mutation, you first call `useAdvanceDeviceSetupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAdvanceDeviceSetupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [advanceDeviceSetupMutation, { data, loading, error }] = useAdvanceDeviceSetupMutation({
 *   variables: {
 *      step: // value for 'step'
 *   },
 * });
 */
export function useAdvanceDeviceSetupMutation(baseOptions?: Apollo.MutationHookOptions<AdvanceDeviceSetupMutation, AdvanceDeviceSetupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AdvanceDeviceSetupMutation, AdvanceDeviceSetupMutationVariables>(AdvanceDeviceSetupDocument, options);
      }
export type AdvanceDeviceSetupMutationHookResult = ReturnType<typeof useAdvanceDeviceSetupMutation>;
export type AdvanceDeviceSetupMutationResult = Apollo.MutationResult<AdvanceDeviceSetupMutation>;
export type AdvanceDeviceSetupMutationOptions = Apollo.BaseMutationOptions<AdvanceDeviceSetupMutation, AdvanceDeviceSetupMutationVariables>;
export const CompleteDeviceSetupDocument = gql`
    mutation CompleteDeviceSetup {
  completeDeviceSetup {
    id
    setup {
      step
      completed
      backupKind
      backupConfiguredAt
      cloudCopyEnabled
      lastBackupAt
      backupDue
    }
  }
}
    `;
export type CompleteDeviceSetupMutationFn = Apollo.MutationFunction<CompleteDeviceSetupMutation, CompleteDeviceSetupMutationVariables>;

/**
 * __useCompleteDeviceSetupMutation__
 *
 * To run a mutation, you first call `useCompleteDeviceSetupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteDeviceSetupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeDeviceSetupMutation, { data, loading, error }] = useCompleteDeviceSetupMutation({
 *   variables: {
 *   },
 * });
 */
export function useCompleteDeviceSetupMutation(baseOptions?: Apollo.MutationHookOptions<CompleteDeviceSetupMutation, CompleteDeviceSetupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CompleteDeviceSetupMutation, CompleteDeviceSetupMutationVariables>(CompleteDeviceSetupDocument, options);
      }
export type CompleteDeviceSetupMutationHookResult = ReturnType<typeof useCompleteDeviceSetupMutation>;
export type CompleteDeviceSetupMutationResult = Apollo.MutationResult<CompleteDeviceSetupMutation>;
export type CompleteDeviceSetupMutationOptions = Apollo.BaseMutationOptions<CompleteDeviceSetupMutation, CompleteDeviceSetupMutationVariables>;
export const HostHeartbeatDocument = gql`
    mutation HostHeartbeat {
  hostHeartbeat {
    slug
    online
  }
}
    `;
export type HostHeartbeatMutationFn = Apollo.MutationFunction<HostHeartbeatMutation, HostHeartbeatMutationVariables>;

/**
 * __useHostHeartbeatMutation__
 *
 * To run a mutation, you first call `useHostHeartbeatMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useHostHeartbeatMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [hostHeartbeatMutation, { data, loading, error }] = useHostHeartbeatMutation({
 *   variables: {
 *   },
 * });
 */
export function useHostHeartbeatMutation(baseOptions?: Apollo.MutationHookOptions<HostHeartbeatMutation, HostHeartbeatMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<HostHeartbeatMutation, HostHeartbeatMutationVariables>(HostHeartbeatDocument, options);
      }
export type HostHeartbeatMutationHookResult = ReturnType<typeof useHostHeartbeatMutation>;
export type HostHeartbeatMutationResult = Apollo.MutationResult<HostHeartbeatMutation>;
export type HostHeartbeatMutationOptions = Apollo.BaseMutationOptions<HostHeartbeatMutation, HostHeartbeatMutationVariables>;
export const LookupWordDocument = gql`
    query LookupWord($lemma: String!) {
  lookupWord(lemma: $lemma) {
    id
    lemma
    pos
    senseId
    cefrLevel
    ipa
    definitionRu
    translationRu
    pronunciationId
    credit {
      source
      license
      attribution
      sourceUrl
    }
    examples {
      id
      text
      translationRu
      credit {
        source
        license
        attribution
        sourceUrl
      }
    }
  }
}
    `;

/**
 * __useLookupWordQuery__
 *
 * To run a query within a React component, call `useLookupWordQuery` and pass it any options that fit your needs.
 * When your component renders, `useLookupWordQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLookupWordQuery({
 *   variables: {
 *      lemma: // value for 'lemma'
 *   },
 * });
 */
export function useLookupWordQuery(baseOptions: Apollo.QueryHookOptions<LookupWordQuery, LookupWordQueryVariables> & ({ variables: LookupWordQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LookupWordQuery, LookupWordQueryVariables>(LookupWordDocument, options);
      }
export function useLookupWordLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LookupWordQuery, LookupWordQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LookupWordQuery, LookupWordQueryVariables>(LookupWordDocument, options);
        }
// @ts-ignore
export function useLookupWordSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LookupWordQuery, LookupWordQueryVariables>): Apollo.UseSuspenseQueryResult<LookupWordQuery, LookupWordQueryVariables>;
export function useLookupWordSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LookupWordQuery, LookupWordQueryVariables>): Apollo.UseSuspenseQueryResult<LookupWordQuery | undefined, LookupWordQueryVariables>;
export function useLookupWordSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LookupWordQuery, LookupWordQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LookupWordQuery, LookupWordQueryVariables>(LookupWordDocument, options);
        }
export type LookupWordQueryHookResult = ReturnType<typeof useLookupWordQuery>;
export type LookupWordLazyQueryHookResult = ReturnType<typeof useLookupWordLazyQuery>;
export type LookupWordSuspenseQueryHookResult = ReturnType<typeof useLookupWordSuspenseQuery>;
export type LookupWordQueryResult = Apollo.QueryResult<LookupWordQuery, LookupWordQueryVariables>;
export const LessonWordsDocument = gql`
    query LessonWords($lessonId: ID!) {
  lessonWords(lessonId: $lessonId) {
    id
    lemma
    pos
    senseId
    cefrLevel
    ipa
    definitionRu
    translationRu
    pronunciationId
    credit {
      source
      license
      attribution
      sourceUrl
    }
    examples {
      id
      text
      translationRu
      credit {
        source
        license
        attribution
        sourceUrl
      }
    }
  }
}
    `;

/**
 * __useLessonWordsQuery__
 *
 * To run a query within a React component, call `useLessonWordsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLessonWordsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLessonWordsQuery({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *   },
 * });
 */
export function useLessonWordsQuery(baseOptions: Apollo.QueryHookOptions<LessonWordsQuery, LessonWordsQueryVariables> & ({ variables: LessonWordsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LessonWordsQuery, LessonWordsQueryVariables>(LessonWordsDocument, options);
      }
export function useLessonWordsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LessonWordsQuery, LessonWordsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LessonWordsQuery, LessonWordsQueryVariables>(LessonWordsDocument, options);
        }
// @ts-ignore
export function useLessonWordsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LessonWordsQuery, LessonWordsQueryVariables>): Apollo.UseSuspenseQueryResult<LessonWordsQuery, LessonWordsQueryVariables>;
export function useLessonWordsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonWordsQuery, LessonWordsQueryVariables>): Apollo.UseSuspenseQueryResult<LessonWordsQuery | undefined, LessonWordsQueryVariables>;
export function useLessonWordsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonWordsQuery, LessonWordsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LessonWordsQuery, LessonWordsQueryVariables>(LessonWordsDocument, options);
        }
export type LessonWordsQueryHookResult = ReturnType<typeof useLessonWordsQuery>;
export type LessonWordsLazyQueryHookResult = ReturnType<typeof useLessonWordsLazyQuery>;
export type LessonWordsSuspenseQueryHookResult = ReturnType<typeof useLessonWordsSuspenseQuery>;
export type LessonWordsQueryResult = Apollo.QueryResult<LessonWordsQuery, LessonWordsQueryVariables>;
export const MyWordsDocument = gql`
    query MyWords {
  myWords {
    id
    direction
    state
    dueAt
    reps
    lapses
    item {
      id
      lemma
      pos
      ipa
      translationRu
      credit {
        source
        license
        attribution
        sourceUrl
      }
    }
  }
}
    `;

/**
 * __useMyWordsQuery__
 *
 * To run a query within a React component, call `useMyWordsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyWordsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyWordsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyWordsQuery(baseOptions?: Apollo.QueryHookOptions<MyWordsQuery, MyWordsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyWordsQuery, MyWordsQueryVariables>(MyWordsDocument, options);
      }
export function useMyWordsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyWordsQuery, MyWordsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyWordsQuery, MyWordsQueryVariables>(MyWordsDocument, options);
        }
// @ts-ignore
export function useMyWordsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyWordsQuery, MyWordsQueryVariables>): Apollo.UseSuspenseQueryResult<MyWordsQuery, MyWordsQueryVariables>;
export function useMyWordsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyWordsQuery, MyWordsQueryVariables>): Apollo.UseSuspenseQueryResult<MyWordsQuery | undefined, MyWordsQueryVariables>;
export function useMyWordsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyWordsQuery, MyWordsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyWordsQuery, MyWordsQueryVariables>(MyWordsDocument, options);
        }
export type MyWordsQueryHookResult = ReturnType<typeof useMyWordsQuery>;
export type MyWordsLazyQueryHookResult = ReturnType<typeof useMyWordsLazyQuery>;
export type MyWordsSuspenseQueryHookResult = ReturnType<typeof useMyWordsSuspenseQuery>;
export type MyWordsQueryResult = Apollo.QueryResult<MyWordsQuery, MyWordsQueryVariables>;
export const ExternalDictionariesDocument = gql`
    query ExternalDictionaries {
  externalDictionaries {
    key
    name
    url
  }
}
    `;

/**
 * __useExternalDictionariesQuery__
 *
 * To run a query within a React component, call `useExternalDictionariesQuery` and pass it any options that fit your needs.
 * When your component renders, `useExternalDictionariesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExternalDictionariesQuery({
 *   variables: {
 *   },
 * });
 */
export function useExternalDictionariesQuery(baseOptions?: Apollo.QueryHookOptions<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>(ExternalDictionariesDocument, options);
      }
export function useExternalDictionariesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>(ExternalDictionariesDocument, options);
        }
// @ts-ignore
export function useExternalDictionariesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>): Apollo.UseSuspenseQueryResult<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>;
export function useExternalDictionariesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>): Apollo.UseSuspenseQueryResult<ExternalDictionariesQuery | undefined, ExternalDictionariesQueryVariables>;
export function useExternalDictionariesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>(ExternalDictionariesDocument, options);
        }
export type ExternalDictionariesQueryHookResult = ReturnType<typeof useExternalDictionariesQuery>;
export type ExternalDictionariesLazyQueryHookResult = ReturnType<typeof useExternalDictionariesLazyQuery>;
export type ExternalDictionariesSuspenseQueryHookResult = ReturnType<typeof useExternalDictionariesSuspenseQuery>;
export type ExternalDictionariesQueryResult = Apollo.QueryResult<ExternalDictionariesQuery, ExternalDictionariesQueryVariables>;
export const AddWordToMyListDocument = gql`
    mutation AddWordToMyList($itemId: ID!) {
  addWordToMyList(itemId: $itemId) {
    id
    state
    dueAt
  }
}
    `;
export type AddWordToMyListMutationFn = Apollo.MutationFunction<AddWordToMyListMutation, AddWordToMyListMutationVariables>;

/**
 * __useAddWordToMyListMutation__
 *
 * To run a mutation, you first call `useAddWordToMyListMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddWordToMyListMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addWordToMyListMutation, { data, loading, error }] = useAddWordToMyListMutation({
 *   variables: {
 *      itemId: // value for 'itemId'
 *   },
 * });
 */
export function useAddWordToMyListMutation(baseOptions?: Apollo.MutationHookOptions<AddWordToMyListMutation, AddWordToMyListMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddWordToMyListMutation, AddWordToMyListMutationVariables>(AddWordToMyListDocument, options);
      }
export type AddWordToMyListMutationHookResult = ReturnType<typeof useAddWordToMyListMutation>;
export type AddWordToMyListMutationResult = Apollo.MutationResult<AddWordToMyListMutation>;
export type AddWordToMyListMutationOptions = Apollo.BaseMutationOptions<AddWordToMyListMutation, AddWordToMyListMutationVariables>;
export const PutWordOnBoardDocument = gql`
    mutation PutWordOnBoard($lessonId: ID!, $itemId: ID!) {
  putWordOnBoard(lessonId: $lessonId, itemId: $itemId)
}
    `;
export type PutWordOnBoardMutationFn = Apollo.MutationFunction<PutWordOnBoardMutation, PutWordOnBoardMutationVariables>;

/**
 * __usePutWordOnBoardMutation__
 *
 * To run a mutation, you first call `usePutWordOnBoardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutWordOnBoardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putWordOnBoardMutation, { data, loading, error }] = usePutWordOnBoardMutation({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *      itemId: // value for 'itemId'
 *   },
 * });
 */
export function usePutWordOnBoardMutation(baseOptions?: Apollo.MutationHookOptions<PutWordOnBoardMutation, PutWordOnBoardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutWordOnBoardMutation, PutWordOnBoardMutationVariables>(PutWordOnBoardDocument, options);
      }
export type PutWordOnBoardMutationHookResult = ReturnType<typeof usePutWordOnBoardMutation>;
export type PutWordOnBoardMutationResult = Apollo.MutationResult<PutWordOnBoardMutation>;
export type PutWordOnBoardMutationOptions = Apollo.BaseMutationOptions<PutWordOnBoardMutation, PutWordOnBoardMutationVariables>;
export const ShowWordToClassDocument = gql`
    mutation ShowWordToClass($sessionId: ID!, $itemId: ID!) {
  showWordToClass(sessionId: $sessionId, itemId: $itemId) {
    sessionId
    itemId
    lemma
  }
}
    `;
export type ShowWordToClassMutationFn = Apollo.MutationFunction<ShowWordToClassMutation, ShowWordToClassMutationVariables>;

/**
 * __useShowWordToClassMutation__
 *
 * To run a mutation, you first call `useShowWordToClassMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useShowWordToClassMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [showWordToClassMutation, { data, loading, error }] = useShowWordToClassMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      itemId: // value for 'itemId'
 *   },
 * });
 */
export function useShowWordToClassMutation(baseOptions?: Apollo.MutationHookOptions<ShowWordToClassMutation, ShowWordToClassMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ShowWordToClassMutation, ShowWordToClassMutationVariables>(ShowWordToClassDocument, options);
      }
export type ShowWordToClassMutationHookResult = ReturnType<typeof useShowWordToClassMutation>;
export type ShowWordToClassMutationResult = Apollo.MutationResult<ShowWordToClassMutation>;
export type ShowWordToClassMutationOptions = Apollo.BaseMutationOptions<ShowWordToClassMutation, ShowWordToClassMutationVariables>;
export const WordShownDocument = gql`
    subscription WordShown($sessionId: ID!) {
  wordShown(sessionId: $sessionId) {
    sessionId
    itemId
    lemma
  }
}
    `;

/**
 * __useWordShownSubscription__
 *
 * To run a query within a React component, call `useWordShownSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWordShownSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWordShownSubscription({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useWordShownSubscription(baseOptions: Apollo.SubscriptionHookOptions<WordShownSubscription, WordShownSubscriptionVariables> & ({ variables: WordShownSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WordShownSubscription, WordShownSubscriptionVariables>(WordShownDocument, options);
      }
export type WordShownSubscriptionHookResult = ReturnType<typeof useWordShownSubscription>;
export type WordShownSubscriptionResult = Apollo.SubscriptionResult<WordShownSubscription>;
export const LessonExerciseSetsDocument = gql`
    query LessonExerciseSets($lessonId: ID!) {
  lessonExerciseSets(lessonId: $lessonId) {
    id
    lessonId
    title
    mode
    homeworkId
    exercises {
      id
      kind
      skill
      cefrLevel
      skillTags
      prompt
      payload
      points
      order
      assetId
    }
  }
}
    `;

/**
 * __useLessonExerciseSetsQuery__
 *
 * To run a query within a React component, call `useLessonExerciseSetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLessonExerciseSetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLessonExerciseSetsQuery({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *   },
 * });
 */
export function useLessonExerciseSetsQuery(baseOptions: Apollo.QueryHookOptions<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables> & ({ variables: LessonExerciseSetsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>(LessonExerciseSetsDocument, options);
      }
export function useLessonExerciseSetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>(LessonExerciseSetsDocument, options);
        }
// @ts-ignore
export function useLessonExerciseSetsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>): Apollo.UseSuspenseQueryResult<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>;
export function useLessonExerciseSetsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>): Apollo.UseSuspenseQueryResult<LessonExerciseSetsQuery | undefined, LessonExerciseSetsQueryVariables>;
export function useLessonExerciseSetsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>(LessonExerciseSetsDocument, options);
        }
export type LessonExerciseSetsQueryHookResult = ReturnType<typeof useLessonExerciseSetsQuery>;
export type LessonExerciseSetsLazyQueryHookResult = ReturnType<typeof useLessonExerciseSetsLazyQuery>;
export type LessonExerciseSetsSuspenseQueryHookResult = ReturnType<typeof useLessonExerciseSetsSuspenseQuery>;
export type LessonExerciseSetsQueryResult = Apollo.QueryResult<LessonExerciseSetsQuery, LessonExerciseSetsQueryVariables>;
export const MyExerciseAttemptsDocument = gql`
    query MyExerciseAttempts($setId: ID!) {
  myAttempts(setId: $setId) {
    id
    exerciseId
    context
    isCorrect
    score
    createdAt
  }
}
    `;

/**
 * __useMyExerciseAttemptsQuery__
 *
 * To run a query within a React component, call `useMyExerciseAttemptsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyExerciseAttemptsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyExerciseAttemptsQuery({
 *   variables: {
 *      setId: // value for 'setId'
 *   },
 * });
 */
export function useMyExerciseAttemptsQuery(baseOptions: Apollo.QueryHookOptions<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables> & ({ variables: MyExerciseAttemptsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>(MyExerciseAttemptsDocument, options);
      }
export function useMyExerciseAttemptsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>(MyExerciseAttemptsDocument, options);
        }
// @ts-ignore
export function useMyExerciseAttemptsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>): Apollo.UseSuspenseQueryResult<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>;
export function useMyExerciseAttemptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>): Apollo.UseSuspenseQueryResult<MyExerciseAttemptsQuery | undefined, MyExerciseAttemptsQueryVariables>;
export function useMyExerciseAttemptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>(MyExerciseAttemptsDocument, options);
        }
export type MyExerciseAttemptsQueryHookResult = ReturnType<typeof useMyExerciseAttemptsQuery>;
export type MyExerciseAttemptsLazyQueryHookResult = ReturnType<typeof useMyExerciseAttemptsLazyQuery>;
export type MyExerciseAttemptsSuspenseQueryHookResult = ReturnType<typeof useMyExerciseAttemptsSuspenseQuery>;
export type MyExerciseAttemptsQueryResult = Apollo.QueryResult<MyExerciseAttemptsQuery, MyExerciseAttemptsQueryVariables>;
export const SetProgressDocument = gql`
    query SetProgress($setId: ID!) {
  setProgress(setId: $setId) {
    total
    answered
    correct
  }
}
    `;

/**
 * __useSetProgressQuery__
 *
 * To run a query within a React component, call `useSetProgressQuery` and pass it any options that fit your needs.
 * When your component renders, `useSetProgressQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSetProgressQuery({
 *   variables: {
 *      setId: // value for 'setId'
 *   },
 * });
 */
export function useSetProgressQuery(baseOptions: Apollo.QueryHookOptions<SetProgressQuery, SetProgressQueryVariables> & ({ variables: SetProgressQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SetProgressQuery, SetProgressQueryVariables>(SetProgressDocument, options);
      }
export function useSetProgressLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SetProgressQuery, SetProgressQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SetProgressQuery, SetProgressQueryVariables>(SetProgressDocument, options);
        }
// @ts-ignore
export function useSetProgressSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SetProgressQuery, SetProgressQueryVariables>): Apollo.UseSuspenseQueryResult<SetProgressQuery, SetProgressQueryVariables>;
export function useSetProgressSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SetProgressQuery, SetProgressQueryVariables>): Apollo.UseSuspenseQueryResult<SetProgressQuery | undefined, SetProgressQueryVariables>;
export function useSetProgressSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SetProgressQuery, SetProgressQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SetProgressQuery, SetProgressQueryVariables>(SetProgressDocument, options);
        }
export type SetProgressQueryHookResult = ReturnType<typeof useSetProgressQuery>;
export type SetProgressLazyQueryHookResult = ReturnType<typeof useSetProgressLazyQuery>;
export type SetProgressSuspenseQueryHookResult = ReturnType<typeof useSetProgressSuspenseQuery>;
export type SetProgressQueryResult = Apollo.QueryResult<SetProgressQuery, SetProgressQueryVariables>;
export const ExerciseLivePictureDocument = gql`
    query ExerciseLivePicture($setId: ID!) {
  exerciseLivePicture(setId: $setId) {
    exerciseId
    answered
    groupSize
    correct
    spread
  }
}
    `;

/**
 * __useExerciseLivePictureQuery__
 *
 * To run a query within a React component, call `useExerciseLivePictureQuery` and pass it any options that fit your needs.
 * When your component renders, `useExerciseLivePictureQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExerciseLivePictureQuery({
 *   variables: {
 *      setId: // value for 'setId'
 *   },
 * });
 */
export function useExerciseLivePictureQuery(baseOptions: Apollo.QueryHookOptions<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables> & ({ variables: ExerciseLivePictureQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>(ExerciseLivePictureDocument, options);
      }
export function useExerciseLivePictureLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>(ExerciseLivePictureDocument, options);
        }
// @ts-ignore
export function useExerciseLivePictureSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>): Apollo.UseSuspenseQueryResult<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>;
export function useExerciseLivePictureSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>): Apollo.UseSuspenseQueryResult<ExerciseLivePictureQuery | undefined, ExerciseLivePictureQueryVariables>;
export function useExerciseLivePictureSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>(ExerciseLivePictureDocument, options);
        }
export type ExerciseLivePictureQueryHookResult = ReturnType<typeof useExerciseLivePictureQuery>;
export type ExerciseLivePictureLazyQueryHookResult = ReturnType<typeof useExerciseLivePictureLazyQuery>;
export type ExerciseLivePictureSuspenseQueryHookResult = ReturnType<typeof useExerciseLivePictureSuspenseQuery>;
export type ExerciseLivePictureQueryResult = Apollo.QueryResult<ExerciseLivePictureQuery, ExerciseLivePictureQueryVariables>;
export const AnswerExerciseDocument = gql`
    mutation AnswerExercise($exerciseId: ID!, $response: JSON!, $context: AttemptContext) {
  answerExercise(exerciseId: $exerciseId, response: $response, context: $context) {
    id
    exerciseId
    isCorrect
    score
    createdAt
  }
}
    `;
export type AnswerExerciseMutationFn = Apollo.MutationFunction<AnswerExerciseMutation, AnswerExerciseMutationVariables>;

/**
 * __useAnswerExerciseMutation__
 *
 * To run a mutation, you first call `useAnswerExerciseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnswerExerciseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [answerExerciseMutation, { data, loading, error }] = useAnswerExerciseMutation({
 *   variables: {
 *      exerciseId: // value for 'exerciseId'
 *      response: // value for 'response'
 *      context: // value for 'context'
 *   },
 * });
 */
export function useAnswerExerciseMutation(baseOptions?: Apollo.MutationHookOptions<AnswerExerciseMutation, AnswerExerciseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnswerExerciseMutation, AnswerExerciseMutationVariables>(AnswerExerciseDocument, options);
      }
export type AnswerExerciseMutationHookResult = ReturnType<typeof useAnswerExerciseMutation>;
export type AnswerExerciseMutationResult = Apollo.MutationResult<AnswerExerciseMutation>;
export type AnswerExerciseMutationOptions = Apollo.BaseMutationOptions<AnswerExerciseMutation, AnswerExerciseMutationVariables>;
export const HandInExerciseSetDocument = gql`
    mutation HandInExerciseSet($setId: ID!) {
  handInExerciseSet(setId: $setId) {
    submissionId
    score
    autoChecked
    awaitingTeacher
  }
}
    `;
export type HandInExerciseSetMutationFn = Apollo.MutationFunction<HandInExerciseSetMutation, HandInExerciseSetMutationVariables>;

/**
 * __useHandInExerciseSetMutation__
 *
 * To run a mutation, you first call `useHandInExerciseSetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useHandInExerciseSetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [handInExerciseSetMutation, { data, loading, error }] = useHandInExerciseSetMutation({
 *   variables: {
 *      setId: // value for 'setId'
 *   },
 * });
 */
export function useHandInExerciseSetMutation(baseOptions?: Apollo.MutationHookOptions<HandInExerciseSetMutation, HandInExerciseSetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<HandInExerciseSetMutation, HandInExerciseSetMutationVariables>(HandInExerciseSetDocument, options);
      }
export type HandInExerciseSetMutationHookResult = ReturnType<typeof useHandInExerciseSetMutation>;
export type HandInExerciseSetMutationResult = Apollo.MutationResult<HandInExerciseSetMutation>;
export type HandInExerciseSetMutationOptions = Apollo.BaseMutationOptions<HandInExerciseSetMutation, HandInExerciseSetMutationVariables>;
export const LessonHomeworkDocument = gql`
    query LessonHomework($lessonId: ID!) {
  lessonHomework(lessonId: $lessonId) {
    id
    title
    description
    type
    dueAt
    allowRedo
    publishedAt
    submissionStats {
      total
      submitted
      graded
      late
    }
    viewerSubmission {
      id
      status
      score
      comment
      attempt
    }
  }
}
    `;

/**
 * __useLessonHomeworkQuery__
 *
 * To run a query within a React component, call `useLessonHomeworkQuery` and pass it any options that fit your needs.
 * When your component renders, `useLessonHomeworkQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLessonHomeworkQuery({
 *   variables: {
 *      lessonId: // value for 'lessonId'
 *   },
 * });
 */
export function useLessonHomeworkQuery(baseOptions: Apollo.QueryHookOptions<LessonHomeworkQuery, LessonHomeworkQueryVariables> & ({ variables: LessonHomeworkQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LessonHomeworkQuery, LessonHomeworkQueryVariables>(LessonHomeworkDocument, options);
      }
export function useLessonHomeworkLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LessonHomeworkQuery, LessonHomeworkQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LessonHomeworkQuery, LessonHomeworkQueryVariables>(LessonHomeworkDocument, options);
        }
// @ts-ignore
export function useLessonHomeworkSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LessonHomeworkQuery, LessonHomeworkQueryVariables>): Apollo.UseSuspenseQueryResult<LessonHomeworkQuery, LessonHomeworkQueryVariables>;
export function useLessonHomeworkSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonHomeworkQuery, LessonHomeworkQueryVariables>): Apollo.UseSuspenseQueryResult<LessonHomeworkQuery | undefined, LessonHomeworkQueryVariables>;
export function useLessonHomeworkSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonHomeworkQuery, LessonHomeworkQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LessonHomeworkQuery, LessonHomeworkQueryVariables>(LessonHomeworkDocument, options);
        }
export type LessonHomeworkQueryHookResult = ReturnType<typeof useLessonHomeworkQuery>;
export type LessonHomeworkLazyQueryHookResult = ReturnType<typeof useLessonHomeworkLazyQuery>;
export type LessonHomeworkSuspenseQueryHookResult = ReturnType<typeof useLessonHomeworkSuspenseQuery>;
export type LessonHomeworkQueryResult = Apollo.QueryResult<LessonHomeworkQuery, LessonHomeworkQueryVariables>;
export const HomeworkSubmissionsDocument = gql`
    query HomeworkSubmissions($homeworkId: ID!) {
  homeworkSubmissions(homeworkId: $homeworkId) {
    id
    attempt
    status
    score
    comment
    contentText
    submittedAt
    student {
      user {
        id
        firstName
        lastName
        formalName
        shortName
        displayName
        shortName
        formalName
      }
    }
  }
}
    `;

/**
 * __useHomeworkSubmissionsQuery__
 *
 * To run a query within a React component, call `useHomeworkSubmissionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useHomeworkSubmissionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHomeworkSubmissionsQuery({
 *   variables: {
 *      homeworkId: // value for 'homeworkId'
 *   },
 * });
 */
export function useHomeworkSubmissionsQuery(baseOptions: Apollo.QueryHookOptions<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables> & ({ variables: HomeworkSubmissionsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>(HomeworkSubmissionsDocument, options);
      }
export function useHomeworkSubmissionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>(HomeworkSubmissionsDocument, options);
        }
// @ts-ignore
export function useHomeworkSubmissionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>): Apollo.UseSuspenseQueryResult<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>;
export function useHomeworkSubmissionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>): Apollo.UseSuspenseQueryResult<HomeworkSubmissionsQuery | undefined, HomeworkSubmissionsQueryVariables>;
export function useHomeworkSubmissionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>(HomeworkSubmissionsDocument, options);
        }
export type HomeworkSubmissionsQueryHookResult = ReturnType<typeof useHomeworkSubmissionsQuery>;
export type HomeworkSubmissionsLazyQueryHookResult = ReturnType<typeof useHomeworkSubmissionsLazyQuery>;
export type HomeworkSubmissionsSuspenseQueryHookResult = ReturnType<typeof useHomeworkSubmissionsSuspenseQuery>;
export type HomeworkSubmissionsQueryResult = Apollo.QueryResult<HomeworkSubmissionsQuery, HomeworkSubmissionsQueryVariables>;
export const MySubmissionsDocument = gql`
    query MySubmissions($courseId: ID) {
  mySubmissions(courseId: $courseId) {
    id
    status
    score
    comment
    attempt
    submittedAt
    homework {
      id
      title
    }
  }
}
    `;

/**
 * __useMySubmissionsQuery__
 *
 * To run a query within a React component, call `useMySubmissionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMySubmissionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMySubmissionsQuery({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useMySubmissionsQuery(baseOptions?: Apollo.QueryHookOptions<MySubmissionsQuery, MySubmissionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MySubmissionsQuery, MySubmissionsQueryVariables>(MySubmissionsDocument, options);
      }
export function useMySubmissionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MySubmissionsQuery, MySubmissionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MySubmissionsQuery, MySubmissionsQueryVariables>(MySubmissionsDocument, options);
        }
// @ts-ignore
export function useMySubmissionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MySubmissionsQuery, MySubmissionsQueryVariables>): Apollo.UseSuspenseQueryResult<MySubmissionsQuery, MySubmissionsQueryVariables>;
export function useMySubmissionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MySubmissionsQuery, MySubmissionsQueryVariables>): Apollo.UseSuspenseQueryResult<MySubmissionsQuery | undefined, MySubmissionsQueryVariables>;
export function useMySubmissionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MySubmissionsQuery, MySubmissionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MySubmissionsQuery, MySubmissionsQueryVariables>(MySubmissionsDocument, options);
        }
export type MySubmissionsQueryHookResult = ReturnType<typeof useMySubmissionsQuery>;
export type MySubmissionsLazyQueryHookResult = ReturnType<typeof useMySubmissionsLazyQuery>;
export type MySubmissionsSuspenseQueryHookResult = ReturnType<typeof useMySubmissionsSuspenseQuery>;
export type MySubmissionsQueryResult = Apollo.QueryResult<MySubmissionsQuery, MySubmissionsQueryVariables>;
export const CreateHomeworkDocument = gql`
    mutation CreateHomework($input: HomeworkInput!) {
  createHomework(input: $input) {
    id
    title
    publishedAt
  }
}
    `;
export type CreateHomeworkMutationFn = Apollo.MutationFunction<CreateHomeworkMutation, CreateHomeworkMutationVariables>;

/**
 * __useCreateHomeworkMutation__
 *
 * To run a mutation, you first call `useCreateHomeworkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateHomeworkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createHomeworkMutation, { data, loading, error }] = useCreateHomeworkMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateHomeworkMutation(baseOptions?: Apollo.MutationHookOptions<CreateHomeworkMutation, CreateHomeworkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateHomeworkMutation, CreateHomeworkMutationVariables>(CreateHomeworkDocument, options);
      }
export type CreateHomeworkMutationHookResult = ReturnType<typeof useCreateHomeworkMutation>;
export type CreateHomeworkMutationResult = Apollo.MutationResult<CreateHomeworkMutation>;
export type CreateHomeworkMutationOptions = Apollo.BaseMutationOptions<CreateHomeworkMutation, CreateHomeworkMutationVariables>;
export const PublishHomeworkDocument = gql`
    mutation PublishHomework($id: ID!) {
  publishHomework(id: $id) {
    id
    publishedAt
  }
}
    `;
export type PublishHomeworkMutationFn = Apollo.MutationFunction<PublishHomeworkMutation, PublishHomeworkMutationVariables>;

/**
 * __usePublishHomeworkMutation__
 *
 * To run a mutation, you first call `usePublishHomeworkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishHomeworkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishHomeworkMutation, { data, loading, error }] = usePublishHomeworkMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePublishHomeworkMutation(baseOptions?: Apollo.MutationHookOptions<PublishHomeworkMutation, PublishHomeworkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PublishHomeworkMutation, PublishHomeworkMutationVariables>(PublishHomeworkDocument, options);
      }
export type PublishHomeworkMutationHookResult = ReturnType<typeof usePublishHomeworkMutation>;
export type PublishHomeworkMutationResult = Apollo.MutationResult<PublishHomeworkMutation>;
export type PublishHomeworkMutationOptions = Apollo.BaseMutationOptions<PublishHomeworkMutation, PublishHomeworkMutationVariables>;
export const DeleteHomeworkDocument = gql`
    mutation DeleteHomework($id: ID!) {
  deleteHomework(id: $id)
}
    `;
export type DeleteHomeworkMutationFn = Apollo.MutationFunction<DeleteHomeworkMutation, DeleteHomeworkMutationVariables>;

/**
 * __useDeleteHomeworkMutation__
 *
 * To run a mutation, you first call `useDeleteHomeworkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteHomeworkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteHomeworkMutation, { data, loading, error }] = useDeleteHomeworkMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteHomeworkMutation(baseOptions?: Apollo.MutationHookOptions<DeleteHomeworkMutation, DeleteHomeworkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteHomeworkMutation, DeleteHomeworkMutationVariables>(DeleteHomeworkDocument, options);
      }
export type DeleteHomeworkMutationHookResult = ReturnType<typeof useDeleteHomeworkMutation>;
export type DeleteHomeworkMutationResult = Apollo.MutationResult<DeleteHomeworkMutation>;
export type DeleteHomeworkMutationOptions = Apollo.BaseMutationOptions<DeleteHomeworkMutation, DeleteHomeworkMutationVariables>;
export const SubmitHomeworkDocument = gql`
    mutation SubmitHomework($input: SubmitHomeworkInput!) {
  submitHomework(input: $input) {
    id
    status
    attempt
  }
}
    `;
export type SubmitHomeworkMutationFn = Apollo.MutationFunction<SubmitHomeworkMutation, SubmitHomeworkMutationVariables>;

/**
 * __useSubmitHomeworkMutation__
 *
 * To run a mutation, you first call `useSubmitHomeworkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSubmitHomeworkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [submitHomeworkMutation, { data, loading, error }] = useSubmitHomeworkMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSubmitHomeworkMutation(baseOptions?: Apollo.MutationHookOptions<SubmitHomeworkMutation, SubmitHomeworkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SubmitHomeworkMutation, SubmitHomeworkMutationVariables>(SubmitHomeworkDocument, options);
      }
export type SubmitHomeworkMutationHookResult = ReturnType<typeof useSubmitHomeworkMutation>;
export type SubmitHomeworkMutationResult = Apollo.MutationResult<SubmitHomeworkMutation>;
export type SubmitHomeworkMutationOptions = Apollo.BaseMutationOptions<SubmitHomeworkMutation, SubmitHomeworkMutationVariables>;
export const GradeSubmissionDocument = gql`
    mutation GradeSubmission($input: GradeInput!) {
  gradeSubmission(input: $input) {
    id
    status
    score
    comment
  }
}
    `;
export type GradeSubmissionMutationFn = Apollo.MutationFunction<GradeSubmissionMutation, GradeSubmissionMutationVariables>;

/**
 * __useGradeSubmissionMutation__
 *
 * To run a mutation, you first call `useGradeSubmissionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGradeSubmissionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [gradeSubmissionMutation, { data, loading, error }] = useGradeSubmissionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGradeSubmissionMutation(baseOptions?: Apollo.MutationHookOptions<GradeSubmissionMutation, GradeSubmissionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GradeSubmissionMutation, GradeSubmissionMutationVariables>(GradeSubmissionDocument, options);
      }
export type GradeSubmissionMutationHookResult = ReturnType<typeof useGradeSubmissionMutation>;
export type GradeSubmissionMutationResult = Apollo.MutationResult<GradeSubmissionMutation>;
export type GradeSubmissionMutationOptions = Apollo.BaseMutationOptions<GradeSubmissionMutation, GradeSubmissionMutationVariables>;
export const ReportAttentionDocument = gql`
    mutation ReportAttention($input: AttentionInput!) {
  reportAttention(input: $input)
}
    `;
export type ReportAttentionMutationFn = Apollo.MutationFunction<ReportAttentionMutation, ReportAttentionMutationVariables>;

/**
 * __useReportAttentionMutation__
 *
 * To run a mutation, you first call `useReportAttentionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReportAttentionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reportAttentionMutation, { data, loading, error }] = useReportAttentionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useReportAttentionMutation(baseOptions?: Apollo.MutationHookOptions<ReportAttentionMutation, ReportAttentionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReportAttentionMutation, ReportAttentionMutationVariables>(ReportAttentionDocument, options);
      }
export type ReportAttentionMutationHookResult = ReturnType<typeof useReportAttentionMutation>;
export type ReportAttentionMutationResult = Apollo.MutationResult<ReportAttentionMutation>;
export type ReportAttentionMutationOptions = Apollo.BaseMutationOptions<ReportAttentionMutation, ReportAttentionMutationVariables>;
export const AttentionUpdatesDocument = gql`
    subscription AttentionUpdates($sessionId: ID!) {
  attentionUpdates(sessionId: $sessionId) {
    id
    sessionId
    studentId
    bucketStart
    avgAttention
    gazeOnScreen
    eyeOpenness
    headYaw
    headPitch
    alertness
  }
}
    `;

/**
 * __useAttentionUpdatesSubscription__
 *
 * To run a query within a React component, call `useAttentionUpdatesSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAttentionUpdatesSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAttentionUpdatesSubscription({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useAttentionUpdatesSubscription(baseOptions: Apollo.SubscriptionHookOptions<AttentionUpdatesSubscription, AttentionUpdatesSubscriptionVariables> & ({ variables: AttentionUpdatesSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<AttentionUpdatesSubscription, AttentionUpdatesSubscriptionVariables>(AttentionUpdatesDocument, options);
      }
export type AttentionUpdatesSubscriptionHookResult = ReturnType<typeof useAttentionUpdatesSubscription>;
export type AttentionUpdatesSubscriptionResult = Apollo.SubscriptionResult<AttentionUpdatesSubscription>;
export const SessionAttentionDocument = gql`
    query SessionAttention($sessionId: ID!) {
  sessionAttention(sessionId: $sessionId) {
    averageAttention
    peak
    low
    points {
      at
      value
    }
  }
}
    `;

/**
 * __useSessionAttentionQuery__
 *
 * To run a query within a React component, call `useSessionAttentionQuery` and pass it any options that fit your needs.
 * When your component renders, `useSessionAttentionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSessionAttentionQuery({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useSessionAttentionQuery(baseOptions: Apollo.QueryHookOptions<SessionAttentionQuery, SessionAttentionQueryVariables> & ({ variables: SessionAttentionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SessionAttentionQuery, SessionAttentionQueryVariables>(SessionAttentionDocument, options);
      }
export function useSessionAttentionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SessionAttentionQuery, SessionAttentionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SessionAttentionQuery, SessionAttentionQueryVariables>(SessionAttentionDocument, options);
        }
// @ts-ignore
export function useSessionAttentionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SessionAttentionQuery, SessionAttentionQueryVariables>): Apollo.UseSuspenseQueryResult<SessionAttentionQuery, SessionAttentionQueryVariables>;
export function useSessionAttentionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SessionAttentionQuery, SessionAttentionQueryVariables>): Apollo.UseSuspenseQueryResult<SessionAttentionQuery | undefined, SessionAttentionQueryVariables>;
export function useSessionAttentionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SessionAttentionQuery, SessionAttentionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SessionAttentionQuery, SessionAttentionQueryVariables>(SessionAttentionDocument, options);
        }
export type SessionAttentionQueryHookResult = ReturnType<typeof useSessionAttentionQuery>;
export type SessionAttentionLazyQueryHookResult = ReturnType<typeof useSessionAttentionLazyQuery>;
export type SessionAttentionSuspenseQueryHookResult = ReturnType<typeof useSessionAttentionSuspenseQuery>;
export type SessionAttentionQueryResult = Apollo.QueryResult<SessionAttentionQuery, SessionAttentionQueryVariables>;
export const SessionRoomDocument = gql`
    query SessionRoom($id: ID!) {
  session(id: $id) {
    id
    status
    startAt
    roomToken
    teacherName
    teacherId
    lesson {
      id
      title
    }
  }
}
    `;

/**
 * __useSessionRoomQuery__
 *
 * To run a query within a React component, call `useSessionRoomQuery` and pass it any options that fit your needs.
 * When your component renders, `useSessionRoomQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSessionRoomQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSessionRoomQuery(baseOptions: Apollo.QueryHookOptions<SessionRoomQuery, SessionRoomQueryVariables> & ({ variables: SessionRoomQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SessionRoomQuery, SessionRoomQueryVariables>(SessionRoomDocument, options);
      }
export function useSessionRoomLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SessionRoomQuery, SessionRoomQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SessionRoomQuery, SessionRoomQueryVariables>(SessionRoomDocument, options);
        }
// @ts-ignore
export function useSessionRoomSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SessionRoomQuery, SessionRoomQueryVariables>): Apollo.UseSuspenseQueryResult<SessionRoomQuery, SessionRoomQueryVariables>;
export function useSessionRoomSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SessionRoomQuery, SessionRoomQueryVariables>): Apollo.UseSuspenseQueryResult<SessionRoomQuery | undefined, SessionRoomQueryVariables>;
export function useSessionRoomSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SessionRoomQuery, SessionRoomQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SessionRoomQuery, SessionRoomQueryVariables>(SessionRoomDocument, options);
        }
export type SessionRoomQueryHookResult = ReturnType<typeof useSessionRoomQuery>;
export type SessionRoomLazyQueryHookResult = ReturnType<typeof useSessionRoomLazyQuery>;
export type SessionRoomSuspenseQueryHookResult = ReturnType<typeof useSessionRoomSuspenseQuery>;
export type SessionRoomQueryResult = Apollo.QueryResult<SessionRoomQuery, SessionRoomQueryVariables>;
export const SessionAttendeesDocument = gql`
    query SessionAttendees($id: ID!) {
  session(id: $id) {
    id
    attendance {
      student {
        user {
          id
          firstName
          lastName
          formalName
          shortName
          displayName
          shortName
          formalName
        }
      }
    }
  }
}
    `;

/**
 * __useSessionAttendeesQuery__
 *
 * To run a query within a React component, call `useSessionAttendeesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSessionAttendeesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSessionAttendeesQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSessionAttendeesQuery(baseOptions: Apollo.QueryHookOptions<SessionAttendeesQuery, SessionAttendeesQueryVariables> & ({ variables: SessionAttendeesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SessionAttendeesQuery, SessionAttendeesQueryVariables>(SessionAttendeesDocument, options);
      }
export function useSessionAttendeesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SessionAttendeesQuery, SessionAttendeesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SessionAttendeesQuery, SessionAttendeesQueryVariables>(SessionAttendeesDocument, options);
        }
// @ts-ignore
export function useSessionAttendeesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SessionAttendeesQuery, SessionAttendeesQueryVariables>): Apollo.UseSuspenseQueryResult<SessionAttendeesQuery, SessionAttendeesQueryVariables>;
export function useSessionAttendeesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SessionAttendeesQuery, SessionAttendeesQueryVariables>): Apollo.UseSuspenseQueryResult<SessionAttendeesQuery | undefined, SessionAttendeesQueryVariables>;
export function useSessionAttendeesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SessionAttendeesQuery, SessionAttendeesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SessionAttendeesQuery, SessionAttendeesQueryVariables>(SessionAttendeesDocument, options);
        }
export type SessionAttendeesQueryHookResult = ReturnType<typeof useSessionAttendeesQuery>;
export type SessionAttendeesLazyQueryHookResult = ReturnType<typeof useSessionAttendeesLazyQuery>;
export type SessionAttendeesSuspenseQueryHookResult = ReturnType<typeof useSessionAttendeesSuspenseQuery>;
export type SessionAttendeesQueryResult = Apollo.QueryResult<SessionAttendeesQuery, SessionAttendeesQueryVariables>;
export const CreateProjectorCodeDocument = gql`
    mutation CreateProjectorCode($sessionId: ID!) {
  createProjectorCode(sessionId: $sessionId) {
    code
    expiresAt
    sessionId
  }
}
    `;
export type CreateProjectorCodeMutationFn = Apollo.MutationFunction<CreateProjectorCodeMutation, CreateProjectorCodeMutationVariables>;

/**
 * __useCreateProjectorCodeMutation__
 *
 * To run a mutation, you first call `useCreateProjectorCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProjectorCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProjectorCodeMutation, { data, loading, error }] = useCreateProjectorCodeMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useCreateProjectorCodeMutation(baseOptions?: Apollo.MutationHookOptions<CreateProjectorCodeMutation, CreateProjectorCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateProjectorCodeMutation, CreateProjectorCodeMutationVariables>(CreateProjectorCodeDocument, options);
      }
export type CreateProjectorCodeMutationHookResult = ReturnType<typeof useCreateProjectorCodeMutation>;
export type CreateProjectorCodeMutationResult = Apollo.MutationResult<CreateProjectorCodeMutation>;
export type CreateProjectorCodeMutationOptions = Apollo.BaseMutationOptions<CreateProjectorCodeMutation, CreateProjectorCodeMutationVariables>;
export const RedeemProjectorCodeDocument = gql`
    mutation RedeemProjectorCode($code: String!) {
  redeemProjectorCode(code: $code) {
    sessionId
    lessonTitle
    roomToken
  }
}
    `;
export type RedeemProjectorCodeMutationFn = Apollo.MutationFunction<RedeemProjectorCodeMutation, RedeemProjectorCodeMutationVariables>;

/**
 * __useRedeemProjectorCodeMutation__
 *
 * To run a mutation, you first call `useRedeemProjectorCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRedeemProjectorCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [redeemProjectorCodeMutation, { data, loading, error }] = useRedeemProjectorCodeMutation({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useRedeemProjectorCodeMutation(baseOptions?: Apollo.MutationHookOptions<RedeemProjectorCodeMutation, RedeemProjectorCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RedeemProjectorCodeMutation, RedeemProjectorCodeMutationVariables>(RedeemProjectorCodeDocument, options);
      }
export type RedeemProjectorCodeMutationHookResult = ReturnType<typeof useRedeemProjectorCodeMutation>;
export type RedeemProjectorCodeMutationResult = Apollo.MutationResult<RedeemProjectorCodeMutation>;
export type RedeemProjectorCodeMutationOptions = Apollo.BaseMutationOptions<RedeemProjectorCodeMutation, RedeemProjectorCodeMutationVariables>;
export const SetProjectorFocusDocument = gql`
    mutation SetProjectorFocus($sessionId: ID!, $studentId: ID) {
  setProjectorFocus(sessionId: $sessionId, studentId: $studentId) {
    sessionId
    studentId
  }
}
    `;
export type SetProjectorFocusMutationFn = Apollo.MutationFunction<SetProjectorFocusMutation, SetProjectorFocusMutationVariables>;

/**
 * __useSetProjectorFocusMutation__
 *
 * To run a mutation, you first call `useSetProjectorFocusMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetProjectorFocusMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setProjectorFocusMutation, { data, loading, error }] = useSetProjectorFocusMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      studentId: // value for 'studentId'
 *   },
 * });
 */
export function useSetProjectorFocusMutation(baseOptions?: Apollo.MutationHookOptions<SetProjectorFocusMutation, SetProjectorFocusMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetProjectorFocusMutation, SetProjectorFocusMutationVariables>(SetProjectorFocusDocument, options);
      }
export type SetProjectorFocusMutationHookResult = ReturnType<typeof useSetProjectorFocusMutation>;
export type SetProjectorFocusMutationResult = Apollo.MutationResult<SetProjectorFocusMutation>;
export type SetProjectorFocusMutationOptions = Apollo.BaseMutationOptions<SetProjectorFocusMutation, SetProjectorFocusMutationVariables>;
export const ProjectorFocusChangedDocument = gql`
    subscription ProjectorFocusChanged($sessionId: ID!) {
  projectorFocusChanged(sessionId: $sessionId) {
    sessionId
    studentId
  }
}
    `;

/**
 * __useProjectorFocusChangedSubscription__
 *
 * To run a query within a React component, call `useProjectorFocusChangedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useProjectorFocusChangedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProjectorFocusChangedSubscription({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useProjectorFocusChangedSubscription(baseOptions: Apollo.SubscriptionHookOptions<ProjectorFocusChangedSubscription, ProjectorFocusChangedSubscriptionVariables> & ({ variables: ProjectorFocusChangedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<ProjectorFocusChangedSubscription, ProjectorFocusChangedSubscriptionVariables>(ProjectorFocusChangedDocument, options);
      }
export type ProjectorFocusChangedSubscriptionHookResult = ReturnType<typeof useProjectorFocusChangedSubscription>;
export type ProjectorFocusChangedSubscriptionResult = Apollo.SubscriptionResult<ProjectorFocusChangedSubscription>;
export const MeetingPointDocument = gql`
    query MeetingPoint($slug: String!) {
  meetingPoint(slug: $slug) {
    slug
    decision
    groupName
    teacherName
    hostOnline
    nextLesson {
      sessionId
      title
      startAt
      isLive
    }
    capabilities {
      schedule
      chat
      homework
      myWork
      myGrades
      mySummaries
      myDiary
      myBoards
      myMaterials
      lessonMaterials
      liveBoard
      room
    }
  }
}
    `;

/**
 * __useMeetingPointQuery__
 *
 * To run a query within a React component, call `useMeetingPointQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeetingPointQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeetingPointQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useMeetingPointQuery(baseOptions: Apollo.QueryHookOptions<MeetingPointQuery, MeetingPointQueryVariables> & ({ variables: MeetingPointQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeetingPointQuery, MeetingPointQueryVariables>(MeetingPointDocument, options);
      }
export function useMeetingPointLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeetingPointQuery, MeetingPointQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeetingPointQuery, MeetingPointQueryVariables>(MeetingPointDocument, options);
        }
// @ts-ignore
export function useMeetingPointSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeetingPointQuery, MeetingPointQueryVariables>): Apollo.UseSuspenseQueryResult<MeetingPointQuery, MeetingPointQueryVariables>;
export function useMeetingPointSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeetingPointQuery, MeetingPointQueryVariables>): Apollo.UseSuspenseQueryResult<MeetingPointQuery | undefined, MeetingPointQueryVariables>;
export function useMeetingPointSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeetingPointQuery, MeetingPointQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeetingPointQuery, MeetingPointQueryVariables>(MeetingPointDocument, options);
        }
export type MeetingPointQueryHookResult = ReturnType<typeof useMeetingPointQuery>;
export type MeetingPointLazyQueryHookResult = ReturnType<typeof useMeetingPointLazyQuery>;
export type MeetingPointSuspenseQueryHookResult = ReturnType<typeof useMeetingPointSuspenseQuery>;
export type MeetingPointQueryResult = Apollo.QueryResult<MeetingPointQuery, MeetingPointQueryVariables>;
export const MeetingPointByCodeDocument = gql`
    query MeetingPointByCode($code: String!) {
  meetingPointByCode(code: $code) {
    slug
    decision
    groupName
    teacherName
    hostOnline
    nextLesson {
      sessionId
      title
      startAt
      isLive
    }
    capabilities {
      schedule
      chat
      homework
      myWork
      myGrades
      mySummaries
      myDiary
      myBoards
      myMaterials
      lessonMaterials
      liveBoard
      room
    }
  }
}
    `;

/**
 * __useMeetingPointByCodeQuery__
 *
 * To run a query within a React component, call `useMeetingPointByCodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeetingPointByCodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeetingPointByCodeQuery({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useMeetingPointByCodeQuery(baseOptions: Apollo.QueryHookOptions<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables> & ({ variables: MeetingPointByCodeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>(MeetingPointByCodeDocument, options);
      }
export function useMeetingPointByCodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>(MeetingPointByCodeDocument, options);
        }
// @ts-ignore
export function useMeetingPointByCodeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>): Apollo.UseSuspenseQueryResult<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>;
export function useMeetingPointByCodeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>): Apollo.UseSuspenseQueryResult<MeetingPointByCodeQuery | undefined, MeetingPointByCodeQueryVariables>;
export function useMeetingPointByCodeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>(MeetingPointByCodeDocument, options);
        }
export type MeetingPointByCodeQueryHookResult = ReturnType<typeof useMeetingPointByCodeQuery>;
export type MeetingPointByCodeLazyQueryHookResult = ReturnType<typeof useMeetingPointByCodeLazyQuery>;
export type MeetingPointByCodeSuspenseQueryHookResult = ReturnType<typeof useMeetingPointByCodeSuspenseQuery>;
export type MeetingPointByCodeQueryResult = Apollo.QueryResult<MeetingPointByCodeQuery, MeetingPointByCodeQueryVariables>;
export const GroupMeetingPointDocument = gql`
    query GroupMeetingPoint($groupId: ID!) {
  groupMeetingPoint(groupId: $groupId) {
    groupId
    slug
    code
    accessMode
    hostOnline
    nextLesson {
      sessionId
      title
      startAt
      isLive
    }
  }
}
    `;

/**
 * __useGroupMeetingPointQuery__
 *
 * To run a query within a React component, call `useGroupMeetingPointQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupMeetingPointQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupMeetingPointQuery({
 *   variables: {
 *      groupId: // value for 'groupId'
 *   },
 * });
 */
export function useGroupMeetingPointQuery(baseOptions: Apollo.QueryHookOptions<GroupMeetingPointQuery, GroupMeetingPointQueryVariables> & ({ variables: GroupMeetingPointQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>(GroupMeetingPointDocument, options);
      }
export function useGroupMeetingPointLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>(GroupMeetingPointDocument, options);
        }
// @ts-ignore
export function useGroupMeetingPointSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>): Apollo.UseSuspenseQueryResult<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>;
export function useGroupMeetingPointSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>): Apollo.UseSuspenseQueryResult<GroupMeetingPointQuery | undefined, GroupMeetingPointQueryVariables>;
export function useGroupMeetingPointSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>(GroupMeetingPointDocument, options);
        }
export type GroupMeetingPointQueryHookResult = ReturnType<typeof useGroupMeetingPointQuery>;
export type GroupMeetingPointLazyQueryHookResult = ReturnType<typeof useGroupMeetingPointLazyQuery>;
export type GroupMeetingPointSuspenseQueryHookResult = ReturnType<typeof useGroupMeetingPointSuspenseQuery>;
export type GroupMeetingPointQueryResult = Apollo.QueryResult<GroupMeetingPointQuery, GroupMeetingPointQueryVariables>;
export const MeetingParticipantsDocument = gql`
    query MeetingParticipants($groupId: ID!) {
  meetingParticipants(groupId: $groupId) {
    studentId
    name
    state
    since
  }
}
    `;

/**
 * __useMeetingParticipantsQuery__
 *
 * To run a query within a React component, call `useMeetingParticipantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeetingParticipantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeetingParticipantsQuery({
 *   variables: {
 *      groupId: // value for 'groupId'
 *   },
 * });
 */
export function useMeetingParticipantsQuery(baseOptions: Apollo.QueryHookOptions<MeetingParticipantsQuery, MeetingParticipantsQueryVariables> & ({ variables: MeetingParticipantsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>(MeetingParticipantsDocument, options);
      }
export function useMeetingParticipantsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>(MeetingParticipantsDocument, options);
        }
// @ts-ignore
export function useMeetingParticipantsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>): Apollo.UseSuspenseQueryResult<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>;
export function useMeetingParticipantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>): Apollo.UseSuspenseQueryResult<MeetingParticipantsQuery | undefined, MeetingParticipantsQueryVariables>;
export function useMeetingParticipantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>(MeetingParticipantsDocument, options);
        }
export type MeetingParticipantsQueryHookResult = ReturnType<typeof useMeetingParticipantsQuery>;
export type MeetingParticipantsLazyQueryHookResult = ReturnType<typeof useMeetingParticipantsLazyQuery>;
export type MeetingParticipantsSuspenseQueryHookResult = ReturnType<typeof useMeetingParticipantsSuspenseQuery>;
export type MeetingParticipantsQueryResult = Apollo.QueryResult<MeetingParticipantsQuery, MeetingParticipantsQueryVariables>;
export const SetMeetingAccessDocument = gql`
    mutation SetMeetingAccess($groupId: ID!, $mode: MeetingAccessMode!) {
  setMeetingAccess(groupId: $groupId, mode: $mode) {
    groupId
    slug
    code
    accessMode
    hostOnline
  }
}
    `;
export type SetMeetingAccessMutationFn = Apollo.MutationFunction<SetMeetingAccessMutation, SetMeetingAccessMutationVariables>;

/**
 * __useSetMeetingAccessMutation__
 *
 * To run a mutation, you first call `useSetMeetingAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetMeetingAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setMeetingAccessMutation, { data, loading, error }] = useSetMeetingAccessMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      mode: // value for 'mode'
 *   },
 * });
 */
export function useSetMeetingAccessMutation(baseOptions?: Apollo.MutationHookOptions<SetMeetingAccessMutation, SetMeetingAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetMeetingAccessMutation, SetMeetingAccessMutationVariables>(SetMeetingAccessDocument, options);
      }
export type SetMeetingAccessMutationHookResult = ReturnType<typeof useSetMeetingAccessMutation>;
export type SetMeetingAccessMutationResult = Apollo.MutationResult<SetMeetingAccessMutation>;
export type SetMeetingAccessMutationOptions = Apollo.BaseMutationOptions<SetMeetingAccessMutation, SetMeetingAccessMutationVariables>;
export const ReplaceMeetingLinkDocument = gql`
    mutation ReplaceMeetingLink($groupId: ID!) {
  replaceMeetingLink(groupId: $groupId) {
    groupId
    slug
    code
    accessMode
    hostOnline
  }
}
    `;
export type ReplaceMeetingLinkMutationFn = Apollo.MutationFunction<ReplaceMeetingLinkMutation, ReplaceMeetingLinkMutationVariables>;

/**
 * __useReplaceMeetingLinkMutation__
 *
 * To run a mutation, you first call `useReplaceMeetingLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReplaceMeetingLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [replaceMeetingLinkMutation, { data, loading, error }] = useReplaceMeetingLinkMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *   },
 * });
 */
export function useReplaceMeetingLinkMutation(baseOptions?: Apollo.MutationHookOptions<ReplaceMeetingLinkMutation, ReplaceMeetingLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReplaceMeetingLinkMutation, ReplaceMeetingLinkMutationVariables>(ReplaceMeetingLinkDocument, options);
      }
export type ReplaceMeetingLinkMutationHookResult = ReturnType<typeof useReplaceMeetingLinkMutation>;
export type ReplaceMeetingLinkMutationResult = Apollo.MutationResult<ReplaceMeetingLinkMutation>;
export type ReplaceMeetingLinkMutationOptions = Apollo.BaseMutationOptions<ReplaceMeetingLinkMutation, ReplaceMeetingLinkMutationVariables>;
export const MyMirrorDocument = gql`
    query MyMirror($kind: MirrorKind, $limit: Int) {
  myMirror(kind: $kind, limit: $limit) {
    id
    kind
    sourceId
    occurredAt
    payload
  }
}
    `;

/**
 * __useMyMirrorQuery__
 *
 * To run a query within a React component, call `useMyMirrorQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyMirrorQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyMirrorQuery({
 *   variables: {
 *      kind: // value for 'kind'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useMyMirrorQuery(baseOptions?: Apollo.QueryHookOptions<MyMirrorQuery, MyMirrorQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyMirrorQuery, MyMirrorQueryVariables>(MyMirrorDocument, options);
      }
export function useMyMirrorLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyMirrorQuery, MyMirrorQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyMirrorQuery, MyMirrorQueryVariables>(MyMirrorDocument, options);
        }
// @ts-ignore
export function useMyMirrorSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyMirrorQuery, MyMirrorQueryVariables>): Apollo.UseSuspenseQueryResult<MyMirrorQuery, MyMirrorQueryVariables>;
export function useMyMirrorSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyMirrorQuery, MyMirrorQueryVariables>): Apollo.UseSuspenseQueryResult<MyMirrorQuery | undefined, MyMirrorQueryVariables>;
export function useMyMirrorSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyMirrorQuery, MyMirrorQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyMirrorQuery, MyMirrorQueryVariables>(MyMirrorDocument, options);
        }
export type MyMirrorQueryHookResult = ReturnType<typeof useMyMirrorQuery>;
export type MyMirrorLazyQueryHookResult = ReturnType<typeof useMyMirrorLazyQuery>;
export type MyMirrorSuspenseQueryHookResult = ReturnType<typeof useMyMirrorSuspenseQuery>;
export type MyMirrorQueryResult = Apollo.QueryResult<MyMirrorQuery, MyMirrorQueryVariables>;
export const MyRepetitionQueueDocument = gql`
    query MyRepetitionQueue($limit: Int) {
  myRepetitionQueue(limit: $limit) {
    id
    direction
    state
    stability
    difficulty
    dueAt
    lastReviewAt
    reps
    lapses
    learningSteps
    item {
      id
      lemma
      pos
      ipa
      definitionRu
      translationRu
      credit {
        source
        license
        attribution
        sourceUrl
      }
      examples {
        id
        text
        translationRu
        credit {
          source
          license
          attribution
          sourceUrl
        }
      }
    }
  }
}
    `;

/**
 * __useMyRepetitionQueueQuery__
 *
 * To run a query within a React component, call `useMyRepetitionQueueQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyRepetitionQueueQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRepetitionQueueQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useMyRepetitionQueueQuery(baseOptions?: Apollo.QueryHookOptions<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>(MyRepetitionQueueDocument, options);
      }
export function useMyRepetitionQueueLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>(MyRepetitionQueueDocument, options);
        }
// @ts-ignore
export function useMyRepetitionQueueSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>): Apollo.UseSuspenseQueryResult<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>;
export function useMyRepetitionQueueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>): Apollo.UseSuspenseQueryResult<MyRepetitionQueueQuery | undefined, MyRepetitionQueueQueryVariables>;
export function useMyRepetitionQueueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>(MyRepetitionQueueDocument, options);
        }
export type MyRepetitionQueueQueryHookResult = ReturnType<typeof useMyRepetitionQueueQuery>;
export type MyRepetitionQueueLazyQueryHookResult = ReturnType<typeof useMyRepetitionQueueLazyQuery>;
export type MyRepetitionQueueSuspenseQueryHookResult = ReturnType<typeof useMyRepetitionQueueSuspenseQuery>;
export type MyRepetitionQueueQueryResult = Apollo.QueryResult<MyRepetitionQueueQuery, MyRepetitionQueueQueryVariables>;
export const MyRepetitionProgressDocument = gql`
    query MyRepetitionProgress {
  myRepetitionProgress {
    total
    due
    learning
    mastered
    reviews
    currentStreak
    longestStreak
  }
}
    `;

/**
 * __useMyRepetitionProgressQuery__
 *
 * To run a query within a React component, call `useMyRepetitionProgressQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyRepetitionProgressQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRepetitionProgressQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyRepetitionProgressQuery(baseOptions?: Apollo.QueryHookOptions<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>(MyRepetitionProgressDocument, options);
      }
export function useMyRepetitionProgressLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>(MyRepetitionProgressDocument, options);
        }
// @ts-ignore
export function useMyRepetitionProgressSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>): Apollo.UseSuspenseQueryResult<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>;
export function useMyRepetitionProgressSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>): Apollo.UseSuspenseQueryResult<MyRepetitionProgressQuery | undefined, MyRepetitionProgressQueryVariables>;
export function useMyRepetitionProgressSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>(MyRepetitionProgressDocument, options);
        }
export type MyRepetitionProgressQueryHookResult = ReturnType<typeof useMyRepetitionProgressQuery>;
export type MyRepetitionProgressLazyQueryHookResult = ReturnType<typeof useMyRepetitionProgressLazyQuery>;
export type MyRepetitionProgressSuspenseQueryHookResult = ReturnType<typeof useMyRepetitionProgressSuspenseQuery>;
export type MyRepetitionProgressQueryResult = Apollo.QueryResult<MyRepetitionProgressQuery, MyRepetitionProgressQueryVariables>;
export const MyAchievementsDocument = gql`
    query MyAchievements {
  myAchievements {
    key
    earnedAt
  }
}
    `;

/**
 * __useMyAchievementsQuery__
 *
 * To run a query within a React component, call `useMyAchievementsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyAchievementsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyAchievementsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyAchievementsQuery(baseOptions?: Apollo.QueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyAchievementsQuery, MyAchievementsQueryVariables>(MyAchievementsDocument, options);
      }
export function useMyAchievementsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyAchievementsQuery, MyAchievementsQueryVariables>(MyAchievementsDocument, options);
        }
// @ts-ignore
export function useMyAchievementsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>): Apollo.UseSuspenseQueryResult<MyAchievementsQuery, MyAchievementsQueryVariables>;
export function useMyAchievementsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>): Apollo.UseSuspenseQueryResult<MyAchievementsQuery | undefined, MyAchievementsQueryVariables>;
export function useMyAchievementsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyAchievementsQuery, MyAchievementsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyAchievementsQuery, MyAchievementsQueryVariables>(MyAchievementsDocument, options);
        }
export type MyAchievementsQueryHookResult = ReturnType<typeof useMyAchievementsQuery>;
export type MyAchievementsLazyQueryHookResult = ReturnType<typeof useMyAchievementsLazyQuery>;
export type MyAchievementsSuspenseQueryHookResult = ReturnType<typeof useMyAchievementsSuspenseQuery>;
export type MyAchievementsQueryResult = Apollo.QueryResult<MyAchievementsQuery, MyAchievementsQueryVariables>;
export const ReviewWordDocument = gql`
    mutation ReviewWord($cardId: ID!, $rating: ReviewRating!, $stability: Float!, $difficulty: Float!, $dueAt: DateTime!, $state: CardState!, $learningSteps: Int) {
  reviewWord(
    cardId: $cardId
    rating: $rating
    stability: $stability
    difficulty: $difficulty
    dueAt: $dueAt
    state: $state
    learningSteps: $learningSteps
  ) {
    id
    direction
    state
    stability
    difficulty
    dueAt
    lastReviewAt
    reps
    lapses
    learningSteps
  }
}
    `;
export type ReviewWordMutationFn = Apollo.MutationFunction<ReviewWordMutation, ReviewWordMutationVariables>;

/**
 * __useReviewWordMutation__
 *
 * To run a mutation, you first call `useReviewWordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReviewWordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reviewWordMutation, { data, loading, error }] = useReviewWordMutation({
 *   variables: {
 *      cardId: // value for 'cardId'
 *      rating: // value for 'rating'
 *      stability: // value for 'stability'
 *      difficulty: // value for 'difficulty'
 *      dueAt: // value for 'dueAt'
 *      state: // value for 'state'
 *      learningSteps: // value for 'learningSteps'
 *   },
 * });
 */
export function useReviewWordMutation(baseOptions?: Apollo.MutationHookOptions<ReviewWordMutation, ReviewWordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReviewWordMutation, ReviewWordMutationVariables>(ReviewWordDocument, options);
      }
export type ReviewWordMutationHookResult = ReturnType<typeof useReviewWordMutation>;
export type ReviewWordMutationResult = Apollo.MutationResult<ReviewWordMutation>;
export type ReviewWordMutationOptions = Apollo.BaseMutationOptions<ReviewWordMutation, ReviewWordMutationVariables>;
export const MyScheduleDocument = gql`
    query MySchedule($from: DateTime!, $to: DateTime!) {
  mySchedule(from: $from, to: $to) {
    id
    startAt
    endAt
    status
    courseId
    courseTitle
    lesson {
      id
      title
    }
  }
}
    `;

/**
 * __useMyScheduleQuery__
 *
 * To run a query within a React component, call `useMyScheduleQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyScheduleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyScheduleQuery({
 *   variables: {
 *      from: // value for 'from'
 *      to: // value for 'to'
 *   },
 * });
 */
export function useMyScheduleQuery(baseOptions: Apollo.QueryHookOptions<MyScheduleQuery, MyScheduleQueryVariables> & ({ variables: MyScheduleQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyScheduleQuery, MyScheduleQueryVariables>(MyScheduleDocument, options);
      }
export function useMyScheduleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyScheduleQuery, MyScheduleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyScheduleQuery, MyScheduleQueryVariables>(MyScheduleDocument, options);
        }
// @ts-ignore
export function useMyScheduleSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyScheduleQuery, MyScheduleQueryVariables>): Apollo.UseSuspenseQueryResult<MyScheduleQuery, MyScheduleQueryVariables>;
export function useMyScheduleSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyScheduleQuery, MyScheduleQueryVariables>): Apollo.UseSuspenseQueryResult<MyScheduleQuery | undefined, MyScheduleQueryVariables>;
export function useMyScheduleSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyScheduleQuery, MyScheduleQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyScheduleQuery, MyScheduleQueryVariables>(MyScheduleDocument, options);
        }
export type MyScheduleQueryHookResult = ReturnType<typeof useMyScheduleQuery>;
export type MyScheduleLazyQueryHookResult = ReturnType<typeof useMyScheduleLazyQuery>;
export type MyScheduleSuspenseQueryHookResult = ReturnType<typeof useMyScheduleSuspenseQuery>;
export type MyScheduleQueryResult = Apollo.QueryResult<MyScheduleQuery, MyScheduleQueryVariables>;
export const ScheduleSessionDocument = gql`
    mutation ScheduleSession($input: ScheduleSessionInput!) {
  scheduleSession(input: $input) {
    id
    startAt
    status
  }
}
    `;
export type ScheduleSessionMutationFn = Apollo.MutationFunction<ScheduleSessionMutation, ScheduleSessionMutationVariables>;

/**
 * __useScheduleSessionMutation__
 *
 * To run a mutation, you first call `useScheduleSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useScheduleSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [scheduleSessionMutation, { data, loading, error }] = useScheduleSessionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useScheduleSessionMutation(baseOptions?: Apollo.MutationHookOptions<ScheduleSessionMutation, ScheduleSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ScheduleSessionMutation, ScheduleSessionMutationVariables>(ScheduleSessionDocument, options);
      }
export type ScheduleSessionMutationHookResult = ReturnType<typeof useScheduleSessionMutation>;
export type ScheduleSessionMutationResult = Apollo.MutationResult<ScheduleSessionMutation>;
export type ScheduleSessionMutationOptions = Apollo.BaseMutationOptions<ScheduleSessionMutation, ScheduleSessionMutationVariables>;
export const StartSessionDocument = gql`
    mutation StartSession($sessionId: ID!) {
  startSession(sessionId: $sessionId) {
    id
    status
  }
}
    `;
export type StartSessionMutationFn = Apollo.MutationFunction<StartSessionMutation, StartSessionMutationVariables>;

/**
 * __useStartSessionMutation__
 *
 * To run a mutation, you first call `useStartSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startSessionMutation, { data, loading, error }] = useStartSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useStartSessionMutation(baseOptions?: Apollo.MutationHookOptions<StartSessionMutation, StartSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StartSessionMutation, StartSessionMutationVariables>(StartSessionDocument, options);
      }
export type StartSessionMutationHookResult = ReturnType<typeof useStartSessionMutation>;
export type StartSessionMutationResult = Apollo.MutationResult<StartSessionMutation>;
export type StartSessionMutationOptions = Apollo.BaseMutationOptions<StartSessionMutation, StartSessionMutationVariables>;
export const EndSessionDocument = gql`
    mutation EndSession($sessionId: ID!) {
  endSession(sessionId: $sessionId) {
    id
    status
  }
}
    `;
export type EndSessionMutationFn = Apollo.MutationFunction<EndSessionMutation, EndSessionMutationVariables>;

/**
 * __useEndSessionMutation__
 *
 * To run a mutation, you first call `useEndSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEndSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [endSessionMutation, { data, loading, error }] = useEndSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useEndSessionMutation(baseOptions?: Apollo.MutationHookOptions<EndSessionMutation, EndSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EndSessionMutation, EndSessionMutationVariables>(EndSessionDocument, options);
      }
export type EndSessionMutationHookResult = ReturnType<typeof useEndSessionMutation>;
export type EndSessionMutationResult = Apollo.MutationResult<EndSessionMutation>;
export type EndSessionMutationOptions = Apollo.BaseMutationOptions<EndSessionMutation, EndSessionMutationVariables>;
export const JoinSessionDocument = gql`
    mutation JoinSession($sessionId: ID!) {
  joinSession(sessionId: $sessionId) {
    roomToken
    session {
      id
      status
    }
  }
}
    `;
export type JoinSessionMutationFn = Apollo.MutationFunction<JoinSessionMutation, JoinSessionMutationVariables>;

/**
 * __useJoinSessionMutation__
 *
 * To run a mutation, you first call `useJoinSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJoinSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [joinSessionMutation, { data, loading, error }] = useJoinSessionMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useJoinSessionMutation(baseOptions?: Apollo.MutationHookOptions<JoinSessionMutation, JoinSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<JoinSessionMutation, JoinSessionMutationVariables>(JoinSessionDocument, options);
      }
export type JoinSessionMutationHookResult = ReturnType<typeof useJoinSessionMutation>;
export type JoinSessionMutationResult = Apollo.MutationResult<JoinSessionMutation>;
export type JoinSessionMutationOptions = Apollo.BaseMutationOptions<JoinSessionMutation, JoinSessionMutationVariables>;
export const StartPageDocument = gql`
    query StartPage {
  startPage {
    profile {
      id
      kind
      institutionName
      groupName
      courseTitle
      courseCount
    }
    now {
      id
      kind
      title
      courseTitle
      teacherName
      at
      count
      ageDays
      sessionId
      lessonId
      courseId
      isLive
    }
    today {
      id
      kind
      title
      courseTitle
      teacherName
      at
      isLive
      sessionId
      lessonId
    }
    attention {
      id
      kind
      title
      courseTitle
      at
      count
      ageDays
      lessonId
    }
    week {
      date
      isToday
      entries {
        id
        kind
        title
        at
        isLive
      }
    }
    continueEntries {
      id
      kind
      title
      courseTitle
      lessonId
      courseId
    }
    progress {
      courseId
      courseTitle
      doneLessons
      totalLessons
      progressPct
    }
    teaching {
      courseId
      title
      subject
      sectionCount
      lessonCount
      publishedLessons
      studentCount
      isDraft
      nextAt
      nextLessonTitle
    }
  }
}
    `;

/**
 * __useStartPageQuery__
 *
 * To run a query within a React component, call `useStartPageQuery` and pass it any options that fit your needs.
 * When your component renders, `useStartPageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStartPageQuery({
 *   variables: {
 *   },
 * });
 */
export function useStartPageQuery(baseOptions?: Apollo.QueryHookOptions<StartPageQuery, StartPageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StartPageQuery, StartPageQueryVariables>(StartPageDocument, options);
      }
export function useStartPageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StartPageQuery, StartPageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StartPageQuery, StartPageQueryVariables>(StartPageDocument, options);
        }
// @ts-ignore
export function useStartPageSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StartPageQuery, StartPageQueryVariables>): Apollo.UseSuspenseQueryResult<StartPageQuery, StartPageQueryVariables>;
export function useStartPageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StartPageQuery, StartPageQueryVariables>): Apollo.UseSuspenseQueryResult<StartPageQuery | undefined, StartPageQueryVariables>;
export function useStartPageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StartPageQuery, StartPageQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StartPageQuery, StartPageQueryVariables>(StartPageDocument, options);
        }
export type StartPageQueryHookResult = ReturnType<typeof useStartPageQuery>;
export type StartPageLazyQueryHookResult = ReturnType<typeof useStartPageLazyQuery>;
export type StartPageSuspenseQueryHookResult = ReturnType<typeof useStartPageSuspenseQuery>;
export type StartPageQueryResult = Apollo.QueryResult<StartPageQuery, StartPageQueryVariables>;
export const SubjectCabinetDocument = gql`
    query SubjectCabinet($courseId: ID!) {
  subjectCabinet(courseId: $courseId) {
    courseId
    title
    profileKind
    institutionName
    groupName
    teacherName
    teacherId
    lessonCount
    studentCount
    progressPct
    gradingScale
    sections {
      id
      title
      doneLessons
      totalLessons
      lessons {
        id
        title
        subtitle
        progress
        kind
        deviceKey
        orderLabel
        materialCount
        hasHomework
        sessionId
        sessionAt
        isLive
        grade
        completedBy
        groupSize
      }
    }
    materials {
      id
      title
      subtitle
      type
      url
      fromLabel
      lessonId
      savedId
      note
      savedKind
    }
    savedMaterials {
      id
      title
      subtitle
      type
      url
      fromLabel
      lessonId
      savedId
      note
      savedKind
    }
    sources {
      id
      name
      sourceName
      url
      note
      inLesson
      savedId
    }
    nextLesson {
      id
      title
      subtitle
      progress
      kind
      deviceKey
      orderLabel
      materialCount
      hasHomework
      sessionId
      sessionAt
      isLive
      grade
      completedBy
      groupSize
    }
  }
}
    `;

/**
 * __useSubjectCabinetQuery__
 *
 * To run a query within a React component, call `useSubjectCabinetQuery` and pass it any options that fit your needs.
 * When your component renders, `useSubjectCabinetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSubjectCabinetQuery({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useSubjectCabinetQuery(baseOptions: Apollo.QueryHookOptions<SubjectCabinetQuery, SubjectCabinetQueryVariables> & ({ variables: SubjectCabinetQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SubjectCabinetQuery, SubjectCabinetQueryVariables>(SubjectCabinetDocument, options);
      }
export function useSubjectCabinetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SubjectCabinetQuery, SubjectCabinetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SubjectCabinetQuery, SubjectCabinetQueryVariables>(SubjectCabinetDocument, options);
        }
// @ts-ignore
export function useSubjectCabinetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SubjectCabinetQuery, SubjectCabinetQueryVariables>): Apollo.UseSuspenseQueryResult<SubjectCabinetQuery, SubjectCabinetQueryVariables>;
export function useSubjectCabinetSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubjectCabinetQuery, SubjectCabinetQueryVariables>): Apollo.UseSuspenseQueryResult<SubjectCabinetQuery | undefined, SubjectCabinetQueryVariables>;
export function useSubjectCabinetSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubjectCabinetQuery, SubjectCabinetQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SubjectCabinetQuery, SubjectCabinetQueryVariables>(SubjectCabinetDocument, options);
        }
export type SubjectCabinetQueryHookResult = ReturnType<typeof useSubjectCabinetQuery>;
export type SubjectCabinetLazyQueryHookResult = ReturnType<typeof useSubjectCabinetLazyQuery>;
export type SubjectCabinetSuspenseQueryHookResult = ReturnType<typeof useSubjectCabinetSuspenseQuery>;
export type SubjectCabinetQueryResult = Apollo.QueryResult<SubjectCabinetQuery, SubjectCabinetQueryVariables>;
export const SaveItemDocument = gql`
    mutation SaveItem($input: SaveItemInput!) {
  saveItem(input: $input) {
    id
    title
    savedId
    note
    savedKind
  }
}
    `;
export type SaveItemMutationFn = Apollo.MutationFunction<SaveItemMutation, SaveItemMutationVariables>;

/**
 * __useSaveItemMutation__
 *
 * To run a mutation, you first call `useSaveItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveItemMutation, { data, loading, error }] = useSaveItemMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSaveItemMutation(baseOptions?: Apollo.MutationHookOptions<SaveItemMutation, SaveItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveItemMutation, SaveItemMutationVariables>(SaveItemDocument, options);
      }
export type SaveItemMutationHookResult = ReturnType<typeof useSaveItemMutation>;
export type SaveItemMutationResult = Apollo.MutationResult<SaveItemMutation>;
export type SaveItemMutationOptions = Apollo.BaseMutationOptions<SaveItemMutation, SaveItemMutationVariables>;
export const RemoveSavedItemDocument = gql`
    mutation RemoveSavedItem($id: ID!) {
  removeSavedItem(id: $id)
}
    `;
export type RemoveSavedItemMutationFn = Apollo.MutationFunction<RemoveSavedItemMutation, RemoveSavedItemMutationVariables>;

/**
 * __useRemoveSavedItemMutation__
 *
 * To run a mutation, you first call `useRemoveSavedItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveSavedItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeSavedItemMutation, { data, loading, error }] = useRemoveSavedItemMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveSavedItemMutation(baseOptions?: Apollo.MutationHookOptions<RemoveSavedItemMutation, RemoveSavedItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveSavedItemMutation, RemoveSavedItemMutationVariables>(RemoveSavedItemDocument, options);
      }
export type RemoveSavedItemMutationHookResult = ReturnType<typeof useRemoveSavedItemMutation>;
export type RemoveSavedItemMutationResult = Apollo.MutationResult<RemoveSavedItemMutation>;
export type RemoveSavedItemMutationOptions = Apollo.BaseMutationOptions<RemoveSavedItemMutation, RemoveSavedItemMutationVariables>;
export const SubjectTasksDocument = gql`
    query SubjectTasks($courseId: ID!) {
  subjectTasks(courseId: $courseId) {
    id
    title
    lessonId
    lessonLabel
    dueAt
    state
    submittedAt
    score
    comment
    attempts
    redoOpen
    submittedBy
    groupSize
    gradedCount
    waitingCount
    staleCount
    retakeCount
  }
}
    `;

/**
 * __useSubjectTasksQuery__
 *
 * To run a query within a React component, call `useSubjectTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useSubjectTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSubjectTasksQuery({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useSubjectTasksQuery(baseOptions: Apollo.QueryHookOptions<SubjectTasksQuery, SubjectTasksQueryVariables> & ({ variables: SubjectTasksQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SubjectTasksQuery, SubjectTasksQueryVariables>(SubjectTasksDocument, options);
      }
export function useSubjectTasksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SubjectTasksQuery, SubjectTasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SubjectTasksQuery, SubjectTasksQueryVariables>(SubjectTasksDocument, options);
        }
// @ts-ignore
export function useSubjectTasksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SubjectTasksQuery, SubjectTasksQueryVariables>): Apollo.UseSuspenseQueryResult<SubjectTasksQuery, SubjectTasksQueryVariables>;
export function useSubjectTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubjectTasksQuery, SubjectTasksQueryVariables>): Apollo.UseSuspenseQueryResult<SubjectTasksQuery | undefined, SubjectTasksQueryVariables>;
export function useSubjectTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubjectTasksQuery, SubjectTasksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SubjectTasksQuery, SubjectTasksQueryVariables>(SubjectTasksDocument, options);
        }
export type SubjectTasksQueryHookResult = ReturnType<typeof useSubjectTasksQuery>;
export type SubjectTasksLazyQueryHookResult = ReturnType<typeof useSubjectTasksLazyQuery>;
export type SubjectTasksSuspenseQueryHookResult = ReturnType<typeof useSubjectTasksSuspenseQuery>;
export type SubjectTasksQueryResult = Apollo.QueryResult<SubjectTasksQuery, SubjectTasksQueryVariables>;
export const SubjectProgressDocument = gql`
    query SubjectProgress($courseId: ID!) {
  subjectProgress(courseId: $courseId) {
    profileKind
    overallPct
    previousOverallPct
    weakBelowPct
    topics {
      id
      title
      lessonFrom
      lessonTo
      isCurrent
      pct
      previousPct
      weakCount
      learnerCount
    }
  }
}
    `;

/**
 * __useSubjectProgressQuery__
 *
 * To run a query within a React component, call `useSubjectProgressQuery` and pass it any options that fit your needs.
 * When your component renders, `useSubjectProgressQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSubjectProgressQuery({
 *   variables: {
 *      courseId: // value for 'courseId'
 *   },
 * });
 */
export function useSubjectProgressQuery(baseOptions: Apollo.QueryHookOptions<SubjectProgressQuery, SubjectProgressQueryVariables> & ({ variables: SubjectProgressQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SubjectProgressQuery, SubjectProgressQueryVariables>(SubjectProgressDocument, options);
      }
export function useSubjectProgressLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SubjectProgressQuery, SubjectProgressQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SubjectProgressQuery, SubjectProgressQueryVariables>(SubjectProgressDocument, options);
        }
// @ts-ignore
export function useSubjectProgressSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SubjectProgressQuery, SubjectProgressQueryVariables>): Apollo.UseSuspenseQueryResult<SubjectProgressQuery, SubjectProgressQueryVariables>;
export function useSubjectProgressSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubjectProgressQuery, SubjectProgressQueryVariables>): Apollo.UseSuspenseQueryResult<SubjectProgressQuery | undefined, SubjectProgressQueryVariables>;
export function useSubjectProgressSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubjectProgressQuery, SubjectProgressQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SubjectProgressQuery, SubjectProgressQueryVariables>(SubjectProgressDocument, options);
        }
export type SubjectProgressQueryHookResult = ReturnType<typeof useSubjectProgressQuery>;
export type SubjectProgressLazyQueryHookResult = ReturnType<typeof useSubjectProgressLazyQuery>;
export type SubjectProgressSuspenseQueryHookResult = ReturnType<typeof useSubjectProgressSuspenseQuery>;
export type SubjectProgressQueryResult = Apollo.QueryResult<SubjectProgressQuery, SubjectProgressQueryVariables>;
export const LessonSummaryDocument = gql`
    query LessonSummary($sessionId: ID!) {
  lessonSummary(sessionId: $sessionId) {
    id
    sessionId
    status
    intro
    assembledAt
    sentAt
    speechOmitted
    canEdit
    items {
      id
      section
      source
      sourceMeta
      atOffsetSec
      text
      authorId
      authorName
      dueAt
      homeworkId
      edited
    }
  }
}
    `;

/**
 * __useLessonSummaryQuery__
 *
 * To run a query within a React component, call `useLessonSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useLessonSummaryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLessonSummaryQuery({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useLessonSummaryQuery(baseOptions: Apollo.QueryHookOptions<LessonSummaryQuery, LessonSummaryQueryVariables> & ({ variables: LessonSummaryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LessonSummaryQuery, LessonSummaryQueryVariables>(LessonSummaryDocument, options);
      }
export function useLessonSummaryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LessonSummaryQuery, LessonSummaryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LessonSummaryQuery, LessonSummaryQueryVariables>(LessonSummaryDocument, options);
        }
// @ts-ignore
export function useLessonSummarySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LessonSummaryQuery, LessonSummaryQueryVariables>): Apollo.UseSuspenseQueryResult<LessonSummaryQuery, LessonSummaryQueryVariables>;
export function useLessonSummarySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonSummaryQuery, LessonSummaryQueryVariables>): Apollo.UseSuspenseQueryResult<LessonSummaryQuery | undefined, LessonSummaryQueryVariables>;
export function useLessonSummarySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonSummaryQuery, LessonSummaryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LessonSummaryQuery, LessonSummaryQueryVariables>(LessonSummaryDocument, options);
        }
export type LessonSummaryQueryHookResult = ReturnType<typeof useLessonSummaryQuery>;
export type LessonSummaryLazyQueryHookResult = ReturnType<typeof useLessonSummaryLazyQuery>;
export type LessonSummarySuspenseQueryHookResult = ReturnType<typeof useLessonSummarySuspenseQuery>;
export type LessonSummaryQueryResult = Apollo.QueryResult<LessonSummaryQuery, LessonSummaryQueryVariables>;
export const LessonChatDocument = gql`
    query LessonChat($sessionId: ID!) {
  lessonChat(sessionId: $sessionId) {
    id
    sessionId
    senderId
    senderName
    text
    sentAt
  }
}
    `;

/**
 * __useLessonChatQuery__
 *
 * To run a query within a React component, call `useLessonChatQuery` and pass it any options that fit your needs.
 * When your component renders, `useLessonChatQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLessonChatQuery({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useLessonChatQuery(baseOptions: Apollo.QueryHookOptions<LessonChatQuery, LessonChatQueryVariables> & ({ variables: LessonChatQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LessonChatQuery, LessonChatQueryVariables>(LessonChatDocument, options);
      }
export function useLessonChatLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LessonChatQuery, LessonChatQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LessonChatQuery, LessonChatQueryVariables>(LessonChatDocument, options);
        }
// @ts-ignore
export function useLessonChatSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LessonChatQuery, LessonChatQueryVariables>): Apollo.UseSuspenseQueryResult<LessonChatQuery, LessonChatQueryVariables>;
export function useLessonChatSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonChatQuery, LessonChatQueryVariables>): Apollo.UseSuspenseQueryResult<LessonChatQuery | undefined, LessonChatQueryVariables>;
export function useLessonChatSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LessonChatQuery, LessonChatQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LessonChatQuery, LessonChatQueryVariables>(LessonChatDocument, options);
        }
export type LessonChatQueryHookResult = ReturnType<typeof useLessonChatQuery>;
export type LessonChatLazyQueryHookResult = ReturnType<typeof useLessonChatLazyQuery>;
export type LessonChatSuspenseQueryHookResult = ReturnType<typeof useLessonChatSuspenseQuery>;
export type LessonChatQueryResult = Apollo.QueryResult<LessonChatQuery, LessonChatQueryVariables>;
export const AssembleLessonSummaryDocument = gql`
    mutation AssembleLessonSummary($sessionId: ID!) {
  assembleLessonSummary(sessionId: $sessionId) {
    id
    status
    speechOmitted
    assembledAt
    canEdit
    items {
      id
      section
      source
      sourceMeta
      atOffsetSec
      text
      authorId
      authorName
      dueAt
      homeworkId
      edited
    }
  }
}
    `;
export type AssembleLessonSummaryMutationFn = Apollo.MutationFunction<AssembleLessonSummaryMutation, AssembleLessonSummaryMutationVariables>;

/**
 * __useAssembleLessonSummaryMutation__
 *
 * To run a mutation, you first call `useAssembleLessonSummaryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssembleLessonSummaryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [assembleLessonSummaryMutation, { data, loading, error }] = useAssembleLessonSummaryMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useAssembleLessonSummaryMutation(baseOptions?: Apollo.MutationHookOptions<AssembleLessonSummaryMutation, AssembleLessonSummaryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AssembleLessonSummaryMutation, AssembleLessonSummaryMutationVariables>(AssembleLessonSummaryDocument, options);
      }
export type AssembleLessonSummaryMutationHookResult = ReturnType<typeof useAssembleLessonSummaryMutation>;
export type AssembleLessonSummaryMutationResult = Apollo.MutationResult<AssembleLessonSummaryMutation>;
export type AssembleLessonSummaryMutationOptions = Apollo.BaseMutationOptions<AssembleLessonSummaryMutation, AssembleLessonSummaryMutationVariables>;
export const UpdateSummaryItemDocument = gql`
    mutation UpdateSummaryItem($itemId: ID!, $text: String!) {
  updateSummaryItem(itemId: $itemId, text: $text) {
    id
    text
    edited
  }
}
    `;
export type UpdateSummaryItemMutationFn = Apollo.MutationFunction<UpdateSummaryItemMutation, UpdateSummaryItemMutationVariables>;

/**
 * __useUpdateSummaryItemMutation__
 *
 * To run a mutation, you first call `useUpdateSummaryItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSummaryItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSummaryItemMutation, { data, loading, error }] = useUpdateSummaryItemMutation({
 *   variables: {
 *      itemId: // value for 'itemId'
 *      text: // value for 'text'
 *   },
 * });
 */
export function useUpdateSummaryItemMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSummaryItemMutation, UpdateSummaryItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSummaryItemMutation, UpdateSummaryItemMutationVariables>(UpdateSummaryItemDocument, options);
      }
export type UpdateSummaryItemMutationHookResult = ReturnType<typeof useUpdateSummaryItemMutation>;
export type UpdateSummaryItemMutationResult = Apollo.MutationResult<UpdateSummaryItemMutation>;
export type UpdateSummaryItemMutationOptions = Apollo.BaseMutationOptions<UpdateSummaryItemMutation, UpdateSummaryItemMutationVariables>;
export const RemoveSummaryItemDocument = gql`
    mutation RemoveSummaryItem($itemId: ID!) {
  removeSummaryItem(itemId: $itemId)
}
    `;
export type RemoveSummaryItemMutationFn = Apollo.MutationFunction<RemoveSummaryItemMutation, RemoveSummaryItemMutationVariables>;

/**
 * __useRemoveSummaryItemMutation__
 *
 * To run a mutation, you first call `useRemoveSummaryItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveSummaryItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeSummaryItemMutation, { data, loading, error }] = useRemoveSummaryItemMutation({
 *   variables: {
 *      itemId: // value for 'itemId'
 *   },
 * });
 */
export function useRemoveSummaryItemMutation(baseOptions?: Apollo.MutationHookOptions<RemoveSummaryItemMutation, RemoveSummaryItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveSummaryItemMutation, RemoveSummaryItemMutationVariables>(RemoveSummaryItemDocument, options);
      }
export type RemoveSummaryItemMutationHookResult = ReturnType<typeof useRemoveSummaryItemMutation>;
export type RemoveSummaryItemMutationResult = Apollo.MutationResult<RemoveSummaryItemMutation>;
export type RemoveSummaryItemMutationOptions = Apollo.BaseMutationOptions<RemoveSummaryItemMutation, RemoveSummaryItemMutationVariables>;
export const AddSummaryItemDocument = gql`
    mutation AddSummaryItem($sessionId: ID!, $section: SummarySection!, $text: String!) {
  addSummaryItem(sessionId: $sessionId, section: $section, text: $text) {
    id
    section
    source
    text
    edited
  }
}
    `;
export type AddSummaryItemMutationFn = Apollo.MutationFunction<AddSummaryItemMutation, AddSummaryItemMutationVariables>;

/**
 * __useAddSummaryItemMutation__
 *
 * To run a mutation, you first call `useAddSummaryItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddSummaryItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addSummaryItemMutation, { data, loading, error }] = useAddSummaryItemMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      section: // value for 'section'
 *      text: // value for 'text'
 *   },
 * });
 */
export function useAddSummaryItemMutation(baseOptions?: Apollo.MutationHookOptions<AddSummaryItemMutation, AddSummaryItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddSummaryItemMutation, AddSummaryItemMutationVariables>(AddSummaryItemDocument, options);
      }
export type AddSummaryItemMutationHookResult = ReturnType<typeof useAddSummaryItemMutation>;
export type AddSummaryItemMutationResult = Apollo.MutationResult<AddSummaryItemMutation>;
export type AddSummaryItemMutationOptions = Apollo.BaseMutationOptions<AddSummaryItemMutation, AddSummaryItemMutationVariables>;
export const SendLessonSummaryDocument = gql`
    mutation SendLessonSummary($sessionId: ID!) {
  sendLessonSummary(sessionId: $sessionId) {
    id
    status
    sentAt
  }
}
    `;
export type SendLessonSummaryMutationFn = Apollo.MutationFunction<SendLessonSummaryMutation, SendLessonSummaryMutationVariables>;

/**
 * __useSendLessonSummaryMutation__
 *
 * To run a mutation, you first call `useSendLessonSummaryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendLessonSummaryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendLessonSummaryMutation, { data, loading, error }] = useSendLessonSummaryMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useSendLessonSummaryMutation(baseOptions?: Apollo.MutationHookOptions<SendLessonSummaryMutation, SendLessonSummaryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendLessonSummaryMutation, SendLessonSummaryMutationVariables>(SendLessonSummaryDocument, options);
      }
export type SendLessonSummaryMutationHookResult = ReturnType<typeof useSendLessonSummaryMutation>;
export type SendLessonSummaryMutationResult = Apollo.MutationResult<SendLessonSummaryMutation>;
export type SendLessonSummaryMutationOptions = Apollo.BaseMutationOptions<SendLessonSummaryMutation, SendLessonSummaryMutationVariables>;
export const SendChatMessageDocument = gql`
    mutation SendChatMessage($sessionId: ID!, $text: String!) {
  sendChatMessage(sessionId: $sessionId, text: $text) {
    id
    sessionId
    senderId
    senderName
    text
    sentAt
  }
}
    `;
export type SendChatMessageMutationFn = Apollo.MutationFunction<SendChatMessageMutation, SendChatMessageMutationVariables>;

/**
 * __useSendChatMessageMutation__
 *
 * To run a mutation, you first call `useSendChatMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendChatMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendChatMessageMutation, { data, loading, error }] = useSendChatMessageMutation({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      text: // value for 'text'
 *   },
 * });
 */
export function useSendChatMessageMutation(baseOptions?: Apollo.MutationHookOptions<SendChatMessageMutation, SendChatMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendChatMessageMutation, SendChatMessageMutationVariables>(SendChatMessageDocument, options);
      }
export type SendChatMessageMutationHookResult = ReturnType<typeof useSendChatMessageMutation>;
export type SendChatMessageMutationResult = Apollo.MutationResult<SendChatMessageMutation>;
export type SendChatMessageMutationOptions = Apollo.BaseMutationOptions<SendChatMessageMutation, SendChatMessageMutationVariables>;
export const RequestUploadDocument = gql`
    mutation RequestUpload($input: UploadRequestInput!) {
  requestUpload(input: $input) {
    uploadUrl
    fileKey
    expiresAt
  }
}
    `;
export type RequestUploadMutationFn = Apollo.MutationFunction<RequestUploadMutation, RequestUploadMutationVariables>;

/**
 * __useRequestUploadMutation__
 *
 * To run a mutation, you first call `useRequestUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestUploadMutation, { data, loading, error }] = useRequestUploadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestUploadMutation(baseOptions?: Apollo.MutationHookOptions<RequestUploadMutation, RequestUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestUploadMutation, RequestUploadMutationVariables>(RequestUploadDocument, options);
      }
export type RequestUploadMutationHookResult = ReturnType<typeof useRequestUploadMutation>;
export type RequestUploadMutationResult = Apollo.MutationResult<RequestUploadMutation>;
export type RequestUploadMutationOptions = Apollo.BaseMutationOptions<RequestUploadMutation, RequestUploadMutationVariables>;
export const UploadPolicyDocument = gql`
    query UploadPolicy($purpose: UploadPurpose!) {
  uploadPolicy(purpose: $purpose) {
    purpose
    maxBytes
    contentTypes
  }
}
    `;

/**
 * __useUploadPolicyQuery__
 *
 * To run a query within a React component, call `useUploadPolicyQuery` and pass it any options that fit your needs.
 * When your component renders, `useUploadPolicyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUploadPolicyQuery({
 *   variables: {
 *      purpose: // value for 'purpose'
 *   },
 * });
 */
export function useUploadPolicyQuery(baseOptions: Apollo.QueryHookOptions<UploadPolicyQuery, UploadPolicyQueryVariables> & ({ variables: UploadPolicyQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UploadPolicyQuery, UploadPolicyQueryVariables>(UploadPolicyDocument, options);
      }
export function useUploadPolicyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UploadPolicyQuery, UploadPolicyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UploadPolicyQuery, UploadPolicyQueryVariables>(UploadPolicyDocument, options);
        }
// @ts-ignore
export function useUploadPolicySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UploadPolicyQuery, UploadPolicyQueryVariables>): Apollo.UseSuspenseQueryResult<UploadPolicyQuery, UploadPolicyQueryVariables>;
export function useUploadPolicySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UploadPolicyQuery, UploadPolicyQueryVariables>): Apollo.UseSuspenseQueryResult<UploadPolicyQuery | undefined, UploadPolicyQueryVariables>;
export function useUploadPolicySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UploadPolicyQuery, UploadPolicyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UploadPolicyQuery, UploadPolicyQueryVariables>(UploadPolicyDocument, options);
        }
export type UploadPolicyQueryHookResult = ReturnType<typeof useUploadPolicyQuery>;
export type UploadPolicyLazyQueryHookResult = ReturnType<typeof useUploadPolicyLazyQuery>;
export type UploadPolicySuspenseQueryHookResult = ReturnType<typeof useUploadPolicySuspenseQuery>;
export type UploadPolicyQueryResult = Apollo.QueryResult<UploadPolicyQuery, UploadPolicyQueryVariables>;