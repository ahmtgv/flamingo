import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import {
  LoginScreen,
  RegisterScreen,
  ResetConfirmScreen,
  ResetRequestScreen,
  RoleSelectScreen,
} from '@/features/auth';
import { Cabinet } from '@/features/cabinet';
import { AdminInstitutionScreen } from '@/features/admin';
import { CatalogScreen, CourseDetailScreen, CreateCourseScreen } from '@/features/courses';
import {
  GradingQueueScreen,
  LessonHomeworkScreen,
  StudentHomeworkScreen,
} from '@/features/homework';
import { LiveRoomScreen, ProjectorScreen, RoomWindowScreen } from '@/features/lesson';
import { ScheduleScreen } from '@/features/schedule';
import { RepetitionScreen } from '@/features/repetition';
import { StartScreen } from '@/features/start';
import { SubjectScreen } from '@/features/subject';
import { useSession } from '@/shared/hooks/useSession';

import styles from './app.module.css';

function FullScreenLoader() {
  const { t } = useTranslation('common');
  return <div className={styles.loader}>{t('actions.loading')}</div>;
}

/** Gate authenticated areas; redirect anonymous users to login. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'unknown') return <FullScreenLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Keep authenticated users out of the auth screens. */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'authenticated') return <Navigate to="/start" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { status } = useSession();
  if (status === 'unknown') return <FullScreenLoader />;
  return <Navigate to={status === 'authenticated' ? '/start' : '/login'} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginScreen />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RoleSelectScreen />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register/:role"
          element={
            <PublicOnlyRoute>
              <RegisterScreen />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset"
          element={
            <PublicOnlyRoute>
              <ResetRequestScreen />
            </PublicOnlyRoute>
          }
        />
        {/* Token-based; reachable whether or not signed in (from an email link). */}
        <Route path="/reset-password" element={<ResetConfirmScreen />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Cabinet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/start"
          element={
            <ProtectedRoute>
              <StartScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/repetition"
          element={
            <ProtectedRoute>
              <RepetitionScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <CatalogScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/new"
          element={
            <ProtectedRoute>
              <CreateCourseScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:id"
          element={
            <ProtectedRoute>
              <CourseDetailScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:courseId"
          element={
            <ProtectedRoute>
              <SubjectScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <ScheduleScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/homework"
          element={
            <ProtectedRoute>
              <StudentHomeworkScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grading"
          element={
            <ProtectedRoute>
              <GradingQueueScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminInstitutionScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lessons/:lessonId/homework"
          element={
            <ProtectedRoute>
              <LessonHomeworkScreen />
            </ProtectedRoute>
          }
        />
        {/* The second screen is a screen, not an account: it joins with a cast code, so it
            deliberately sits OUTSIDE ProtectedRoute. */}
        <Route path="/projector" element={<ProjectorScreen />} />
        <Route
          path="/sessions/:sessionId/window/:scene"
          element={
            <ProtectedRoute>
              <RoomWindowScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:sessionId/room"
          element={
            <ProtectedRoute>
              <LiveRoomScreen />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
