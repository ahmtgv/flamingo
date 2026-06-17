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
  DateTime: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type Achievement = {
  __typename?: 'Achievement';
  code: Scalars['String']['output'];
  criteria?: Maybe<Scalars['JSON']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

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
  avgAttention: Scalars['Int']['input'];
  bucketStart: Scalars['DateTime']['input'];
  sessionId: Scalars['ID']['input'];
};

export type AttentionMetric = {
  __typename?: 'AttentionMetric';
  avgAttention: Scalars['Int']['output'];
  bucketStart: Scalars['DateTime']['output'];
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

export type AuthPayload = {
  __typename?: 'AuthPayload';
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user: User;
};

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

export type ChatMessage = {
  __typename?: 'ChatMessage';
  id: Scalars['ID']['output'];
  sender: User;
  sentAt: Scalars['DateTime']['output'];
  sessionId: Scalars['ID']['output'];
  text: Scalars['String']['output'];
};

export type Course = {
  __typename?: 'Course';
  coverUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  enrollmentCount: Scalars['Int']['output'];
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
  viewerEnrollment?: Maybe<Enrollment>;
};

export type CourseConnection = {
  __typename?: 'CourseConnection';
  nodes: Array<Course>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CourseFilter = {
  language?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<CourseLevel>;
  search?: InputMaybe<Scalars['String']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
};

export type CourseInput = {
  coverKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  institutionId?: InputMaybe<Scalars['ID']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  level: CourseLevel;
  subject: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CourseLevel =
  | 'ADULT'
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
  | 'GRADE_11';

export type CourseStatus =
  | 'ARCHIVED'
  | 'DRAFT'
  | 'PUBLISHED';

export type DailyAttention = {
  __typename?: 'DailyAttention';
  averageAttention: Scalars['Int']['output'];
  weekday: Scalars['Int']['output'];
};

export type Enrollment = {
  __typename?: 'Enrollment';
  course: Course;
  enrolledAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  progressPct: Scalars['Int']['output'];
  status: EnrollmentStatus;
  student: StudentProfile;
};

export type EnrollmentStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'PENDING';

export type GradeInput = {
  allowRedo?: InputMaybe<Scalars['Boolean']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  score: Scalars['Int']['input'];
  submissionId: Scalars['ID']['input'];
};

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

export type LeaderboardEntry = {
  __typename?: 'LeaderboardEntry';
  points: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  student: StudentProfile;
};

export type Lesson = {
  __typename?: 'Lesson';
  description?: Maybe<Scalars['String']['output']>;
  durationMin: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  materials: Array<Material>;
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
  durationMin: Scalars['Int']['input'];
  options?: InputMaybe<LessonOptionsInput>;
  scheduleRule?: InputMaybe<Scalars['JSON']['input']>;
  title: Scalars['String']['input'];
};

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

export type LessonSession = {
  __typename?: 'LessonSession';
  attendance: Array<Attendance>;
  attentionSummary?: Maybe<AttentionSummary>;
  endAt?: Maybe<Scalars['DateTime']['output']>;
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  lesson: Lesson;
  recordingUrl?: Maybe<Scalars['String']['output']>;
  roomToken?: Maybe<Scalars['String']['output']>;
  startAt: Scalars['DateTime']['output'];
  status: SessionStatus;
};

export type LessonStatus =
  | 'DRAFT'
  | 'PUBLISHED';

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

export type MembershipRole =
  | 'ADMIN'
  | 'STUDENT'
  | 'TEACHER';

export type MembershipStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING';

export type Mutation = {
  __typename?: 'Mutation';
  addChild: Guardianship;
  addMaterial: Material;
  addStudentsToGroup: Group;
  archiveCourse: Course;
  assignTeacher: GroupTeacher;
  backupUbp: UbpBackup;
  createCourse: Course;
  createGroup: Group;
  createHomework: Homework;
  createInstitution: Institution;
  createLesson: Lesson;
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
  gradeSubmission: Submission;
  inviteMember: InstitutionMembership;
  issueCertificate: Certificate;
  joinSession: SessionJoin;
  login: AuthPayload;
  logout: Scalars['Boolean']['output'];
  markAllNotificationsRead: Scalars['Boolean']['output'];
  markLessonViewed: Enrollment;
  markNotificationRead: Notification;
  moderateReview: Review;
  publishCourse: Course;
  publishHomework: Homework;
  publishLesson: Lesson;
  refreshToken: AuthPayload;
  registerUser: AuthPayload;
  removeMember: Scalars['Boolean']['output'];
  removeStudentFromGroup: Group;
  reorderLessons: Array<Lesson>;
  reorderSections: Array<Section>;
  reportAttention: Scalars['Boolean']['output'];
  requestPasswordReset: Scalars['Boolean']['output'];
  requestUpload: UploadTicket;
  resetPassword: Scalars['Boolean']['output'];
  respondGuardianship: Guardianship;
  scheduleSession: LessonSession;
  sendChatMessage: ChatMessage;
  setAttendance: Attendance;
  startSession: LessonSession;
  submitHomework: Submission;
  submitVerificationDocument: VerificationDocument;
  unenroll: Scalars['Boolean']['output'];
  updateBranding: Institution;
  updateCourse: Course;
  updateGroup: Group;
  updateHomework: Homework;
  updateInstitution: Institution;
  updateLesson: Lesson;
  updateMembership: InstitutionMembership;
  updateNotificationPreference: NotificationPreference;
  updateSection: Section;
  verifyEmail: Scalars['Boolean']['output'];
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


export type MutationArchiveCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAssignTeacherArgs = {
  groupId: Scalars['ID']['input'];
  subject: Scalars['String']['input'];
  teacherId: Scalars['ID']['input'];
};


export type MutationBackupUbpArgs = {
  input: UbpBackupInput;
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


export type MutationGradeSubmissionArgs = {
  input: GradeInput;
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


export type MutationPublishCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishHomeworkArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishLessonArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRegisterUserArgs = {
  input: RegisterUserInput;
};


export type MutationRemoveMemberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveStudentFromGroupArgs = {
  groupId: Scalars['ID']['input'];
  studentId: Scalars['ID']['input'];
};


export type MutationReorderLessonsArgs = {
  orderedIds: Array<Scalars['ID']['input']>;
  sectionId: Scalars['ID']['input'];
};


export type MutationReorderSectionsArgs = {
  courseId: Scalars['ID']['input'];
  orderedIds: Array<Scalars['ID']['input']>;
};


export type MutationReportAttentionArgs = {
  input: AttentionInput;
};


export type MutationRequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


export type MutationRequestUploadArgs = {
  input: UploadRequestInput;
};


export type MutationResetPasswordArgs = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationRespondGuardianshipArgs = {
  accept: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationScheduleSessionArgs = {
  input: ScheduleSessionInput;
};


export type MutationSendChatMessageArgs = {
  sessionId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationSetAttendanceArgs = {
  sessionId: Scalars['ID']['input'];
  status: AttendanceStatus;
  studentId: Scalars['ID']['input'];
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


export type MutationUpdateNotificationPreferenceArgs = {
  input: NotificationPreferenceInput;
};


export type MutationUpdateSectionArgs = {
  id: Scalars['ID']['input'];
  input: SectionInput;
};


export type MutationVerifyEmailArgs = {
  token: Scalars['String']['input'];
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

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
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

export type Query = {
  __typename?: 'Query';
  adminDashboard: AdminDashboard;
  attentionAnalytics: AttentionAnalytics;
  catalog: CourseConnection;
  certificate?: Maybe<Certificate>;
  course?: Maybe<Course>;
  group?: Maybe<Group>;
  groupAnalytics: GroupAnalytics;
  groups: Array<Group>;
  homework?: Maybe<Homework>;
  homeworkSubmissions: Array<Submission>;
  institution?: Maybe<Institution>;
  institutionMembers: Array<InstitutionMembership>;
  leaderboard: Array<LeaderboardEntry>;
  lesson?: Maybe<Lesson>;
  lessonHomework: Array<Homework>;
  me?: Maybe<User>;
  myAchievements: Array<UserAchievement>;
  myCourses: Array<Course>;
  mySchedule: Array<LessonSession>;
  mySubmissions: Array<Submission>;
  notificationPreferences: Array<NotificationPreference>;
  notifications: NotificationConnection;
  parentChildOverview: ParentChildOverview;
  parentChildren: Array<StudentProfile>;
  recommendations: Array<Recommendation>;
  session?: Maybe<LessonSession>;
  sessionAttention: AttentionSummary;
  studentDashboard: StudentDashboard;
  teacher?: Maybe<TeacherProfile>;
  teacherDashboard: TeacherDashboard;
  teacherReviews: Array<Review>;
  ubpBackup?: Maybe<UbpBackup>;
  verifyCertificate: CertificateVerification;
};


export type QueryAttentionAnalyticsArgs = {
  courseId?: InputMaybe<Scalars['ID']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  studentId?: InputMaybe<Scalars['ID']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryCatalogArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<CourseFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCertificateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCourseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGroupAnalyticsArgs = {
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


export type QueryLeaderboardArgs = {
  groupId: Scalars['ID']['input'];
};


export type QueryLessonArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLessonHomeworkArgs = {
  lessonId: Scalars['ID']['input'];
};


export type QueryMyScheduleArgs = {
  from: Scalars['DateTime']['input'];
  to: Scalars['DateTime']['input'];
};


export type QueryMySubmissionsArgs = {
  courseId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  unreadOnly?: InputMaybe<Scalars['Boolean']['input']>;
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


export type QueryTeacherArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTeacherReviewsArgs = {
  teacherId: Scalars['ID']['input'];
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
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  role: Role;
  student?: InputMaybe<StudentInfoInput>;
  teacher?: InputMaybe<TeacherInfoInput>;
};

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

export type ReviewStatus =
  | 'HIDDEN'
  | 'PENDING'
  | 'VISIBLE';

export type Role =
  | 'ADMIN'
  | 'PARENT'
  | 'STUDENT'
  | 'TEACHER';

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
  chatMessageReceived: ChatMessage;
  notificationReceived: Notification;
  sessionStatusChanged: LessonSession;
};


export type SubscriptionAttentionUpdatesArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionChatMessageReceivedArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionSessionStatusChangedArgs = {
  sessionId: Scalars['ID']['input'];
};

export type TeacherDashboard = {
  __typename?: 'TeacherDashboard';
  classAttentionAverage?: Maybe<Scalars['Int']['output']>;
  courses: Array<Course>;
  pendingSubmissions: Array<Submission>;
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
  verificationStatus: VerificationStatus;
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
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  locale: Scalars['String']['output'];
  parentProfile?: Maybe<ParentProfile>;
  phone?: Maybe<Scalars['String']['output']>;
  role: Role;
  studentProfile?: Maybe<StudentProfile>;
  teacherProfile?: Maybe<TeacherProfile>;
};

export type UserAchievement = {
  __typename?: 'UserAchievement';
  achievement: Achievement;
  earnedAt: Scalars['DateTime']['output'];
};

export type VerificationDocument = {
  __typename?: 'VerificationDocument';
  createdAt: Scalars['DateTime']['output'];
  fileUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: VerificationStatus;
};

export type VerificationStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED';

export type AdminInstitutionQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminInstitutionQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, adminProfile?: { __typename?: 'AdminProfile', institution?: { __typename?: 'Institution', id: string, name: string, address?: string | null, website?: string | null, subdomain?: string | null, status: InstitutionStatus, defaultLocale: string, branding?: Record<string, unknown> | null, logoUrl?: string | null } | null } | null } | null };

export type InstitutionGroupsQueryVariables = Exact<{
  institutionId: Scalars['ID']['input'];
}>;


export type InstitutionGroupsQuery = { __typename?: 'Query', groups: Array<{ __typename?: 'Group', id: string, name: string, level?: string | null, students: Array<{ __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string } }>, teachers: Array<{ __typename?: 'GroupTeacher', id: string, subject: string, teacher: { __typename?: 'TeacherProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string } } }> }> };

export type InstitutionMembersQueryVariables = Exact<{
  institutionId: Scalars['ID']['input'];
  role?: InputMaybe<MembershipRole>;
}>;


export type InstitutionMembersQuery = { __typename?: 'Query', institutionMembers: Array<{ __typename?: 'InstitutionMembership', id: string, role: MembershipRole, status: MembershipStatus, joinedAt?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } }> };

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


export type InviteMemberMutation = { __typename?: 'Mutation', inviteMember: { __typename?: 'InstitutionMembership', id: string, role: MembershipRole, status: MembershipStatus, user: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } } };

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


export type AddStudentsToGroupMutation = { __typename?: 'Mutation', addStudentsToGroup: { __typename?: 'Group', id: string, students: Array<{ __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string } }> } };

export type RemoveStudentFromGroupMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  studentId: Scalars['ID']['input'];
}>;


export type RemoveStudentFromGroupMutation = { __typename?: 'Mutation', removeStudentFromGroup: { __typename?: 'Group', id: string, students: Array<{ __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string } }> } };

export type AssignTeacherMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  teacherId: Scalars['ID']['input'];
  subject: Scalars['String']['input'];
}>;


export type AssignTeacherMutation = { __typename?: 'Mutation', assignTeacher: { __typename?: 'GroupTeacher', id: string, subject: string, teacher: { __typename?: 'TeacherProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string } } } };

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', token: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: Role, locale: string, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus } | null } } };

export type RegisterUserMutationVariables = Exact<{
  input: RegisterUserInput;
}>;


export type RegisterUserMutation = { __typename?: 'Mutation', registerUser: { __typename?: 'AuthPayload', token: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: Role, locale: string, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus } | null } } };

export type RefreshTokenMutationVariables = Exact<{
  refreshToken: Scalars['String']['input'];
}>;


export type RefreshTokenMutation = { __typename?: 'Mutation', refreshToken: { __typename?: 'AuthPayload', token: string, refreshToken: string, user: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: Role, locale: string, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus } | null } } };

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


export type AddChildMutation = { __typename?: 'Mutation', addChild: { __typename?: 'Guardianship', id: string, status: GuardianshipStatus, consent152fz: boolean, consentAt?: string | null, child: { __typename?: 'User', id: string, firstName: string, lastName: string } } };

export type SubmitVerificationDocumentMutationVariables = Exact<{
  fileKey: Scalars['String']['input'];
}>;


export type SubmitVerificationDocumentMutation = { __typename?: 'Mutation', submitVerificationDocument: { __typename?: 'VerificationDocument', id: string, status: VerificationStatus, fileUrl: string, createdAt: string } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string, role: Role, locale: string, studentProfile?: { __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, points: number } | null, teacherProfile?: { __typename?: 'TeacherProfile', verificationStatus: VerificationStatus, specialty?: string | null } | null, parentProfile?: { __typename?: 'ParentProfile', children: Array<{ __typename?: 'StudentProfile', ageBand: AgeBand, gradeLevel?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string } }> } | null } | null };

export type CatalogQueryVariables = Exact<{
  filter?: InputMaybe<CourseFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type CatalogQuery = { __typename?: 'Query', catalog: { __typename?: 'CourseConnection', totalCount: number, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'Course', id: string, title: string, description?: string | null, subject: string, level: CourseLevel, status: CourseStatus, lessonCount: number, enrollmentCount: number, owner: { __typename?: 'TeacherProfile', specialty?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string } } }> } };

export type CourseDetailQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CourseDetailQuery = { __typename?: 'Query', course?: { __typename?: 'Course', id: string, title: string, description?: string | null, subject: string, level: CourseLevel, status: CourseStatus, lessonCount: number, enrollmentCount: number, owner: { __typename?: 'TeacherProfile', specialty?: string | null, user: { __typename?: 'User', id: string, firstName: string, lastName: string } }, sections: Array<{ __typename?: 'Section', id: string, title: string, description?: string | null, order: number, lessons: Array<{ __typename?: 'Lesson', id: string, title: string, durationMin: number, status: LessonStatus, order: number, materials: Array<{ __typename?: 'Material', id: string, type: MaterialType, title: string, url?: string | null, body?: string | null, order: number }> }> }>, viewerEnrollment?: { __typename?: 'Enrollment', id: string, status: EnrollmentStatus, progressPct: number } | null } | null };

export type MyCoursesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyCoursesQuery = { __typename?: 'Query', myCourses: Array<{ __typename?: 'Course', id: string, title: string, subject: string, level: CourseLevel, status: CourseStatus, lessonCount: number, enrollmentCount: number }> };

export type CreateCourseMutationVariables = Exact<{
  input: CourseInput;
}>;


export type CreateCourseMutation = { __typename?: 'Mutation', createCourse: { __typename?: 'Course', id: string, status: CourseStatus } };

export type PublishCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishCourseMutation = { __typename?: 'Mutation', publishCourse: { __typename?: 'Course', id: string, status: CourseStatus } };

export type CreateSectionMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
  input: SectionInput;
}>;


export type CreateSectionMutation = { __typename?: 'Mutation', createSection: { __typename?: 'Section', id: string, title: string, order: number } };

export type CreateLessonMutationVariables = Exact<{
  sectionId: Scalars['ID']['input'];
  input: LessonInput;
}>;


export type CreateLessonMutation = { __typename?: 'Mutation', createLesson: { __typename?: 'Lesson', id: string, title: string, status: LessonStatus } };

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

export type LessonHomeworkQueryVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type LessonHomeworkQuery = { __typename?: 'Query', lessonHomework: Array<{ __typename?: 'Homework', id: string, title: string, description?: string | null, type: HomeworkType, dueAt?: string | null, allowRedo: boolean, publishedAt?: string | null, submissionStats: { __typename?: 'SubmissionStats', total: number, submitted: number, graded: number, late: number }, viewerSubmission?: { __typename?: 'Submission', id: string, status: SubmissionStatus, score?: number | null, comment?: string | null, attempt: number } | null }> };

export type HomeworkSubmissionsQueryVariables = Exact<{
  homeworkId: Scalars['ID']['input'];
}>;


export type HomeworkSubmissionsQuery = { __typename?: 'Query', homeworkSubmissions: Array<{ __typename?: 'Submission', id: string, attempt: number, status: SubmissionStatus, score?: number | null, comment?: string | null, contentText?: string | null, submittedAt?: string | null, student: { __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string } } }> };

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


export type AttentionUpdatesSubscription = { __typename?: 'Subscription', attentionUpdates: { __typename?: 'AttentionMetric', id: string, sessionId: string, studentId: string, bucketStart: string, avgAttention: number } };

export type SessionAttentionQueryVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type SessionAttentionQuery = { __typename?: 'Query', sessionAttention: { __typename?: 'AttentionSummary', averageAttention: number, peak: number, low: number, points: Array<{ __typename?: 'AttentionPoint', at: string, value: number }> } };

export type SessionRoomQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SessionRoomQuery = { __typename?: 'Query', session?: { __typename?: 'LessonSession', id: string, status: SessionStatus, roomToken?: string | null, lesson: { __typename?: 'Lesson', id: string, title: string } } | null };

export type SessionAttendeesQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SessionAttendeesQuery = { __typename?: 'Query', session?: { __typename?: 'LessonSession', id: string, attendance: Array<{ __typename?: 'Attendance', student: { __typename?: 'StudentProfile', user: { __typename?: 'User', id: string, firstName: string, lastName: string } } }> } | null };

export type MyScheduleQueryVariables = Exact<{
  from: Scalars['DateTime']['input'];
  to: Scalars['DateTime']['input'];
}>;


export type MyScheduleQuery = { __typename?: 'Query', mySchedule: Array<{ __typename?: 'LessonSession', id: string, startAt: string, endAt?: string | null, status: SessionStatus, lesson: { __typename?: 'Lesson', id: string, title: string } }> };

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

export type RequestUploadMutationVariables = Exact<{
  input: UploadRequestInput;
}>;


export type RequestUploadMutation = { __typename?: 'Mutation', requestUpload: { __typename?: 'UploadTicket', uploadUrl: string, fileKey: string, expiresAt: string } };


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
    status
    fileUrl
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
    role
    locale
    studentProfile {
      ageBand
      gradeLevel
      points
    }
    teacherProfile {
      verificationStatus
      specialty
    }
    parentProfile {
      children {
        ageBand
        gradeLevel
        user {
          id
          firstName
          lastName
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
export const CatalogDocument = gql`
    query Catalog($filter: CourseFilter, $first: Int, $after: String) {
  catalog(filter: $filter, first: $first, after: $after) {
    totalCount
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
      status
      lessonCount
      enrollmentCount
      owner {
        specialty
        user {
          id
          firstName
          lastName
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
    status
    lessonCount
    enrollmentCount
    owner {
      specialty
      user {
        id
        firstName
        lastName
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
        materials {
          id
          type
          title
          url
          body
          order
        }
      }
    }
    viewerEnrollment {
      id
      status
      progressPct
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
export const CreateLessonDocument = gql`
    mutation CreateLesson($sectionId: ID!, $input: LessonInput!) {
  createLesson(sectionId: $sectionId, input: $input) {
    id
    title
    status
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
    roomToken
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
export const MyScheduleDocument = gql`
    query MySchedule($from: DateTime!, $to: DateTime!) {
  mySchedule(from: $from, to: $to) {
    id
    startAt
    endAt
    status
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