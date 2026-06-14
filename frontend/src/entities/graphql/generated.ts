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