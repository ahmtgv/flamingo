import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';

import {
  LoginScreen,
  RegisterScreen,
  ResetConfirmScreen,
  ResetRequestScreen,
  RoleSelectScreen,
} from '@/features/auth';
import { Cabinet } from '@/features/cabinet';
import { LinkMachineScreen, SettingsScreen, SetupScreen } from '@/features/desktop';
import { ArrivalScreen, InvitePanel } from '@/features/meeting';
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

/** Мастер первого запуска. Не под ProtectedRoute: связывание — это и есть вход. */
function InviteRoute() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  return <InvitePanel groupId={groupId} onStart={() => navigate('/schedule')} />;
}

function SetupScreenRoute() {
  const navigate = useNavigate();
  return <SetupScreen onFinished={() => navigate('/start')} />;
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
        {/* Первый запуск приложения преподавателя — лист D2 (Р5.4). Шаг 1 идёт ДО входа:
            машина ещё не связана, и просить войти было бы просить пароль (§19.4). */}
        {/* Лист D3: ссылка группы одна и постоянная. Не под ProtectedRoute — по ссылке
            приходит и тот, кто ещё не вошёл; что ему покажут, решает `decision`. */}
        <Route path="/к/:slug" element={<ArrivalScreen />} />
        {/* Панель преподавателя — левая половина листа D3. */}
        <Route
          path="/groups/:groupId/invite"
          element={
            <ProtectedRoute>
              <InviteRoute />
            </ProtectedRoute>
          }
        />
        <Route path="/j/:slug" element={<ArrivalScreen />} />
        {/* 🔴 T-05: приложение печатало этот адрес, а маршрута не было — человек молча
            оказывался на главной, и связывание не завершалось ничем. Латинский псевдоним
            рядом: кириллицу в адресной строке набирают не все. */}
        <Route path="/связать" element={<ProtectedRoute><LinkMachineScreen /></ProtectedRoute>} />
        <Route path="/link" element={<ProtectedRoute><LinkMachineScreen /></ProtectedRoute>} />
        <Route path="/setup" element={<SetupScreenRoute />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsScreen />
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
