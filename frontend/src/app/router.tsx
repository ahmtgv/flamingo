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
import { AccountScreen } from '@/features/account';
import { Cabinet } from '@/features/cabinet';
import { LinkMachineScreen, SettingsScreen, SetupScreen } from '@/features/desktop';
import { ArrivalScreen, InvitePanel } from '@/features/meeting';
import { AdminInstitutionScreen, PeopleScreen, VerificationScreen } from '@/features/admin';
import { ScheduleLessonScreen } from '@/features/courses/ui/ScheduleLessonScreen';
import { InviteScreen } from '@/features/courses/ui/InviteScreen';
import { JoinRoute } from '@/features/courses/ui/JoinRoute';
import { CatalogScreen, CourseDetailScreen, CreateCourseScreen } from '@/features/courses';
import {
  GradingQueueScreen,
  LessonHomeworkScreen,
  StudentHomeworkScreen,
} from '@/features/homework';
import { LiveRoomScreen, ProjectorScreen, RoomWindowScreen } from '@/features/lesson';
import { ScheduleScreen } from '@/features/schedule';
import { RepetitionScreen } from '@/features/repetition';
import { SourcesScreen } from '@/features/sources';
import { StartScreen } from '@/features/start';
import { SubjectScreen } from '@/features/subject';
import { isDesktop } from '@/features/desktop/bridge';
import { DemoRoomScreen } from '@/features/demo/ui/DemoRoomScreen';
import { JournalScreen } from '@/features/journal/ui/JournalScreen';
import { LandingScreen } from '@/features/landing/ui/LandingScreen';
import { NotFoundScreen } from '@/features/notfound/NotFoundScreen';
import { MyLearningScreen } from '@/features/mylearning/ui/MyLearningScreen';
import { ConnectionLine } from '@/shared/ui/ConnectionLine/ConnectionLine';
import { DesktopShell } from '@/features/desktop/DesktopShell';
import { returnTo, withReturnTo } from '@/shared/lib/returnTo';
import { useThisDeviceQuery } from '@/entities/graphql/generated';
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
  const location = useLocation();
  // В приложении формы входа и регистрации не показываются вовсе: пароль здесь не спрашивают,
  // а регистрация и восстановление живут в вебе, где видны адресная строка и замок (§19.4).
  if (isDesktop()) return <Navigate to="/setup" replace />;
  // 🔴 R-17 (волна 2). Витрина собирается с VITE_PREVIEW=1 и потому «всегда вошедшая» — а
  // значит вход и регистрация недостижимы: посетителя уносит на /start. Аудит требует, чтобы
  // регистрация ЧЕСТНО говорила, что запись закрыта (§0.1), а сказать это может только экран,
  // до которого можно дойти. На витрине пускаем; в бою правило прежнее.
  // 🔴 Найдено замером 22.08: сюда приходят С АДРЕСОМ НАЗНАЧЕНИЯ (`?next=/join/FLM-…`), и
  // отправлять такого человека на /start — значит терять приглашение ровно в тот миг, когда
  // оно сработало. Форма входа честно звала `navigate(back)`, но эта переадресация случалась
  // раньше и уводила на стартовую: посторонний, пришедший по ссылке на курс, после входа
  // оказывался в пустом кабинете и второй раз ссылку уже не открывал.
  if (status === 'authenticated' && !IS_PREVIEW) {
    return <Navigate to={returnTo(location.search) ?? '/start'} replace />;
  }
  return <>{children}</>;
}

/** Мастер первого запуска. Не под ProtectedRoute: связывание — это и есть вход. */
function InviteRoute() {
  const { groupId = '' } = useParams();
  // §27.4: панель сама открывает комнату того занятия, которое начинает. Прежде отсюда
  // приезжал переход в расписание — и «Начать урок» уводило в список занятий.
  return <InvitePanel groupId={groupId} />;
}

function SetupScreenRoute() {
  const navigate = useNavigate();
  return <SetupScreen onFinished={() => navigate('/start')} />;
}

/**
 * 🔴 МАСТЕР ПРИНАДЛЕЖИТ МАШИНЕ, А НЕ СЕАНСУ (найдено 16.08 на живом проходе).
 *
 * Пройдя связывание, приложение перезапустили — и оно открыло КАБИНЕТ, хотя мастер стоял на
 * шаге 2. Обещание на самом же экране — «настройку можно прервать: приложение вернёт на тот
 * же шаг» — перестало быть правдой.
 *
 * Почему: до §Б0-септ пользовательской сессии в приложении не бывало, и «не вошёл ⇒ мастер»
 * покрывало все случаи. Связывание начало выдавать сессию, и человек стал «вошедшим» уже
 * на шаге 1 — с этого момента корень уводил его на `/start` мимо шагов 2–5.
 *
 * Ровно тот же механизм, что в Р-2 и Р-3 (см. REGRESSION_LOG): правка сделала возможным
 * состояние, которого раньше не бывало, и правило, написанное без него, стало неверным.
 *
 * Настройка не косметика: на шаге 2 настраивается ОБЯЗАТЕЛЬНАЯ копия кабинета (§19.1), на
 * шаге 3 — согласия. Пропустить их значит начать первый урок без копии данных детей.
 */
function RootRedirect() {
  const { status } = useSession();
  const { data, loading } = useThisDeviceQuery({
    skip: !isDesktop(),
    fetchPolicy: 'cache-and-network',
  });

  if (status === 'unknown') return <FullScreenLoader />;
  /**
   * 🔴 КОРЕНЬ ПОКАЗЫВАЕТ СТРАНИЦУ, А НЕ ФОРМУ ВХОДА (наряд 35 §3.1).
   *
   * Здесь стоял общий `entryRoute()`, и для постороннего человека flamingo.plus выглядел
   * как окно логина: он приходил посмотреть, что это, а его просили представиться.
   *
   * ⚠️ `entryRoute()` НЕ ТРОНУТ и трогать его нельзя: он отвечает на другой вопрос — «куда
   * отправить того, кто ломится в закрытую дверь», и там ответ по-прежнему форма входа
   * (а в приложении — мастер, §19.4). Изменился только корень.
   */
  if (status !== 'authenticated') {
    return isDesktop() ? <Navigate to={entryRoute()} replace /> : <LandingScreen />;
  }

  // В браузере машины нет и мастера нет — сразу в кабинет.
  if (!isDesktop()) return <Navigate to="/start" replace />;

  // Ответа ещё нет: ждём. Отправить в кабинет «пока не знаем» — это и есть тот пропуск.
  if (loading && !data) return <FullScreenLoader />;

  const done = data?.thisDevice?.setup?.completed ?? false;
  return <Navigate to={done ? '/start' : '/setup'} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      {/* Рама приложения (лист D1) — внутри роутера: её кнопки ведут по маршрутам, а снаружи
          роутера обращение к навигации падает и уносит с собой всё приложение. В браузере
          DesktopShell отдаёт детей как есть. */}
      <DesktopShell>
      {/*
        🔴 ОДНА СТРОКА ПРО СВЯЗЬ НА ВЕСЬ ПРОДУКТ (решение владельца §32.3, наряд 34 §2.2).
        Стоит здесь, а не на экранах: экранов десятки, и «не забыть добавить» на каждом —
        это гарантия, что на половине забудут. Тихо; урок берёт разговор себе и говорит громко.
      */}
      <ConnectionLine />
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
        {/*
          🔴 ДЕМО-КОМНАТА ДЛЯ ГОСТЯ (наряд 36 §3, решение владельца §34.9). Маршрут ПУБЛИЧНЫЙ и
          намеренно не обёрнут ни в `ProtectedRoute`, ни в `PublicOnlyRoute`: смотреть демо
          можно и не входя, и уже войдя.

          🔒 Экран не принимает никакого идентификатора — ни в пути, ни в запросе. До
          настоящего занятия отсюда дотянуться нечем: дотягиваться неоткуда.
        */}
        <Route path="/demo" element={<DemoRoomScreen />} />
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
        {/*
          🔴 ЭКРАН ПОД УЖЕ ДАННЫМ ОБЕЩАНИЕМ (наряд 36 §2). `OWNER_SCOPE §20.5`: учёба
          принадлежит ученику навсегда, открывается с любого устройства и переживает уход
          преподавателя. Зеркало наполнялось с промпта 29, `myMirror` числился среди сирот —
          ни один экран его не читал, и обещание жило только в тестах.
        */}
        <Route
          path="/my-learning"
          element={
            <ProtectedRoute>
              <MyLearningScreen />
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
          element={<CatalogScreen />}
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
        {/* 🔴 Лист D8 не имел маршрута ВООБЩЕ, и это стоило продукту главной функции:
            согласие на анализ внимания давалось только в мастере ПРЕПОДАВАТЕЛЯ, а ученику
            дать его было негде — SEduM не записал ни одного числа. См. AttentionConsentCard. */}
        {/* 🔴 Лист 12 утверждён 12.08 и не имел маршрута ВООБЩЕ, при четырёх кнопках,
            которые на него вели. Все четыре открывали архивный каталог курсов — это и есть
            «получаем кабинет преподавателя, курсы» из письма владельца. */}
        <Route
          path="/источники"
          element={<SourcesScreen />}
        />
        {/*
          🔴 АФИША ОБЕЩАЛА ГОСТЮ ТО, КУДА ЕГО НЕ ПУСКАЛИ (найдено на пустой базе, наряд 40-бис §4).
          «Источники мира» и «Предметы» стоят в верхней строке афиши — и обе вели на форму
          входа: посторонний приходил посмотреть и упирался в «представьтесь».
          Сервер их приватными не считал: `catalog` — публичный запрос без пользователя, хаб
          источников вообще ничего не спрашивает. Стеной был только роутер.
          ⚠️ Права не ослаблены: что именно видно, решают резолверы, а не эта строка.
        */}
        <Route
          path="/sources"
          element={<SourcesScreen />}
        />
        <Route
          path="/кабинет"
          element={
            <ProtectedRoute>
              <AccountScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountScreen />
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
        {/*
          🔴 СВОЙ ЖУРНАЛ ВМЕСТО ОЧЕРЕДИ ПРОВЕРКИ В СТАРОЙ РАМЕ (наряд 36 §5). Кнопка «Открыть
          журнал» с листа 01 вела на `/grading` — экран прежнего кабинета со своей шапкой.
        */}
        <Route
          path="/journal/:courseId"
          element={
            <ProtectedRoute>
              <JournalScreen />
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
          path="/admin/people"
          element={
            <ProtectedRoute>
              <PeopleScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/verification"
          element={
            <ProtectedRoute>
              <VerificationScreen />
            </ProtectedRoute>
          }
        />
        {/* Создание занятия — лист «Создание курса и занятия». Курс в адресе, потому что
            «кого это касается» считается по записанным на КУРС, а не на урок. */}
        {/* Преподаватель зовёт: код, ссылка, кто уже вошёл. */}
        <Route
          path="/courses/:courseId/invite"
          element={
            <ProtectedRoute>
              <InviteScreen />
            </ProtectedRoute>
          }
        />
        {/* 🔴 Человек приходит ПО ССЫЛКЕ. Адрес открытый: он ещё не наш, у него нет учётки.
            Вход по коду требует входа в продукт — `ProtectedRoute` отправит на форму и
            вернёт сюда же (`returnTo`), а код останется в адресе. */}
        <Route path="/join/:code" element={<JoinRoute />} />
        <Route
          path="/courses/:courseId/lessons/:lessonId/schedule"
          element={
            <ProtectedRoute>
              <ScheduleLessonScreen />
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
        {/*
          🔴 НЕИЗВЕСТНЫЙ АДРЕС МОЛЧА УВОДИЛ НА КОРЕНЬ (находка ревьюера Р-5, 18.08).
          `/mylearning` вместо `/my-learning` — и человек на стартовой, не зная, что промахнулся.
          Он решит, что «ссылка не работает», хотя не работала опечатка.
        */}
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
      </DesktopShell>
    </BrowserRouter>
  );
}
