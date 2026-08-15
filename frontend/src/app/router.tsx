import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

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
import { AdminInstitutionScreen, VerificationScreen } from '@/features/admin';
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
import { isDesktop } from '@/features/desktop/bridge';
import { DesktopShell } from '@/features/desktop/DesktopShell';
import { withReturnTo } from '@/shared/lib/returnTo';
import { useSession } from '@/shared/hooks/useSession';

import { entryRoute } from './entryRoute';

import styles from './app.module.css';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW === '1';

/**
 * 🔴 ЗАГРУЗКА, КОТОРАЯ НЕ КОНЧАЕТСЯ, — ЭТО МОЛЧАЩИЙ ЭКРАН (промпт 21 §2.1 п.3).
 *
 * Находка владельца 16.08: приложение открывалось и висело на «Загрузка…». Ни мастера, ни
 * ошибки — статус навсегда `unknown`, потому что обновление сессии не возвращалось.
 * Причину закрыли в `refresh.ts` таймаутом, но одного таймаута мало: десять секунд перед
 * пустым словом «Загрузка…» человек уже считает зависанием.
 *
 * Через четыре секунды экран говорит, что происходит, и даёт кнопку. Четыре — потому что
 * нормальный ответ приходит за доли секунды, и всё, что дольше, уже не «сейчас загрузится».
 */
const SLOW_AFTER_MS = 4000;

function FullScreenLoader() {
  const { t } = useTranslation('common');
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (!slow) return <div className={styles.loader}>{t('actions.loading')}</div>;

  return (
    <div className={styles.loader} role="alert">
      <p>{t('failure.slowBoot')}</p>
      <button type="button" className={styles.loaderRetry} onClick={() => location.reload()}>
        {t('actions.retry')}
      </button>
    </div>
  );
}

/** Gate authenticated areas; redirect anonymous users to the right door (см. entryRoute). */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'unknown') return <FullScreenLoader />;
  if (status !== 'authenticated') {
    // 🔴 §26.4: адрес назначения обязан пережить вход и регистрацию. Здесь он терялся —
    // человека уносило на вход, и после регистрации он оказывался на стартовой, а не там,
    // куда шёл. Для `/link?code=…` это значит вернуться к приложению за кодом руками.
    const target = `${location.pathname}${location.search}`;
    return <Navigate to={withReturnTo(entryRoute(), target)} replace />;
  }
  return <>{children}</>;
}

/**
 * 🔴 ЭКРАН МАШИНЫ, А НЕ ЧЕЛОВЕКА (владелец 16.08, промпт 21 §2.3).
 *
 * Владелец сообщил ПОВТОРНО: шестерёнка в раме не работает. Кнопка при этом была на месте и
 * обработчик тоже — `onSettings={() => navigate('/settings')}`. Не работала не кнопка, а
 * маршрут: `/settings` стоял под `ProtectedRoute`, а в мастере пользовательской сессии ещё
 * нет. Нажатие уводило на `/settings`, охрана видела «не вошёл» и возвращала на `entryRoute()`
 * — то есть на `/setup`. Человек нажимал и оставался там же, где стоял.
 *
 * ⚠️ Почему проверка это пропустила: смотрели, что кнопка есть и обработчик привязан. Нажать
 * её В МАСТЕРЕ, то есть без сессии, никто не пробовал — а это единственное состояние, в
 * котором приложение живёт первые десять минут. Ровно ловушка №1: наличие вместо работы.
 *
 * И это снова «переход, который никуда не привёл» — третий случай подряд.
 *
 * Настройки приложения принадлежат МАШИНЕ: экран ходит `require_device`-операциями
 * (`exportCabinet`, `configureCabinetBackup`), а не пользовательскими. Ключ машины и есть
 * его пропуск. В браузере экран смысла не имеет — там правило прежнее.
 */
function MachineRoute({ children }: { children: ReactNode }) {
  if (isDesktop()) return <>{children}</>;
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

/** Keep authenticated users out of the auth screens. */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useSession();
  // В приложении формы входа и регистрации не показываются вовсе: пароль здесь не спрашивают,
  // а регистрация и восстановление живут в вебе, где видны адресная строка и замок (§19.4).
  if (isDesktop()) return <Navigate to="/setup" replace />;
  // 🔴 R-17 (волна 2). Витрина собирается с VITE_PREVIEW=1 и потому «всегда вошедшая» — а
  // значит вход и регистрация недостижимы: посетителя уносит на /start. Аудит требует, чтобы
  // регистрация ЧЕСТНО говорила, что запись закрыта (§0.1), а сказать это может только экран,
  // до которого можно дойти. На витрине пускаем; в бою правило прежнее.
  if (status === 'authenticated' && !IS_PREVIEW) return <Navigate to="/start" replace />;
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
  return <Navigate to={status === 'authenticated' ? '/start' : entryRoute()} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      {/* Рама приложения (лист D1) — внутри роутера: её кнопки ведут по маршрутам, а снаружи
          роутера обращение к навигации падает и уносит с собой всё приложение. В браузере
          DesktopShell отдаёт детей как есть. */}
      <DesktopShell>
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
        <Route path="/settings" element={<MachineRoute><SettingsScreen /></MachineRoute>} />
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
        {/* Надзор · верификация — лист D7. Отдельный маршрут на пилоте; фаза 17 сводит его
            в панель надзора вместе с учётом людей и блокировками. */}
        <Route
          path="/admin/verification"
          element={
            <ProtectedRoute>
              <VerificationScreen />
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
      </DesktopShell>
    </BrowserRouter>
  );
}
