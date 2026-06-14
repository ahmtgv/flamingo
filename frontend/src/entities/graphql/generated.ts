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