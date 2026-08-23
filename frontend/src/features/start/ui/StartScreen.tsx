import { LogOut, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStartLesson } from '@/features/lesson/startLesson';
import { MutedDoor } from '@/shared/ui';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { VerificationBanner } from '@/features/cabinet/ui/VerificationBanner';
import { isDesktop } from '@/features/desktop/bridge';
import { ChatDock, useChatUnread } from '@/features/chat';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import {
  type StartPageQuery,
  useLearningProfilesQuery,
  useMeQuery,
  useWeekStripQuery,
  useSetActiveLearningProfileMutation,
  useStartPageQuery,
} from '@/entities/graphql/generated';
import { Button, ErrorState, Logo } from '@/shared/ui';
import { ICON_MD } from '@/shared/ui/iconSizes';

import styles from './start.module.css';
import { AccountMenu } from './AccountMenu';
import {
  clock,
  countdown,
  dayNumber,
  daysUntil,
  headerStamp,
  weekday,
  weekRange,
} from './startFormat';

type Page = StartPageQuery['startPage'];
/** The «требует внимания» rows ask for the widest StartEntry selection (count/ageDays). */
type AttentionEntry = Page['attention'][number];

/**
 * Start page — atlas sheet 00, the first window after signing in.
 *
 * One frame for every role: сейчас → сегодня → требует внимания → неделя → продолжить +
 * прогресс → быстрые входы. The role never changes the structure, only what fills it, so a
 * person who switches education does not have to relearn the screen.
 *
 * Every row arrives as data (`kind`, times, counts, domain titles) and is worded here through
 * i18n. AIR: the single coral accent is the «сейчас» card — the one thing asking for action.
 */
export function StartScreen() {
  const { t } = useTranslation(['start', 'common']);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const logout = useLogout();
  const goingDark = theme === 'light';
  const [chatOpen, setChatOpen] = useState(false);
  const unreadChats = useChatUnread();

  const { data: meData } = useMeQuery();
  const { data: profileData, refetch: refetchProfiles } = useLearningProfilesQuery();
  const { data, loading, error, refetch } = useStartPageQuery();
  const [setActiveProfile, { loading: switching }] = useSetActiveLearningProfileMutation();

  const me = meData?.me;
  // Своё зеркало есть только у ученика — см. дверь «Моя учёба» ниже.
  const isPupil = me?.role === 'STUDENT';
  const profiles = profileData?.learningProfiles ?? [];
  const page = data?.startPage;

  // Sheet 00 covers the release roles (ученик · курсант · учитель). A parent or an
  // institution admin has no learning profile of their own, so they keep going to their
  // existing cabinet instead of meeting an empty start page.
  if (me?.role === 'PARENT' || me?.role === 'ADMIN') return <Navigate to="/app" replace />;
  const kind = page?.profile?.kind ?? 'PUPIL';
  const isTeacher = kind === 'TEACHER';
  const isCadet = kind === 'CADET';
  const now = new Date();

  async function switchProfile(id: string) {
    await setActiveProfile({ variables: { id } });
    // The whole page is scoped by the active education, so both reads are refetched.
    await Promise.all([refetch(), refetchProfiles()]);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        {/* 🔴 ВТОРАЯ ПОЛОСА С ЛОГОТИПОМ ВНУТРИ ПРИЛОЖЕНИЯ (RnD 18.08, §2.4 — впервые увидено
            глазами). Строку заголовка рамы я починил в промпте 26 и спрятал дублирующую шапку
            в КОМНАТЕ. Стартовая осталась со своей: на снимке окна под строкой рамы стоит
            вторая полоса с тем же знаком бренда. Лист D1 показывает содержимое сразу под
            полосой состояния, без своей шапки.

            Убираем ЗНАК, а не всю полосу: в ней живёт настоящая навигация — чат, источники,
            тема, выход, учётная запись. Их прятать нельзя, а бренд рама уже несёт. */}
        {!isDesktop() && (
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => navigate('/start')}
            aria-label="Flamingo"
          >
            <Logo />
          </button>
        )}
        <div className={styles.navSpace}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setChatOpen((v) => !v)}
            aria-expanded={chatOpen}
          >
            {t('nav.chat')}
            {unreadChats > 0 && <span className={styles.badge}>{unreadChats}</span>}
          </button>
          {/* 🔴 Подпись обещала хаб источников (лист 12), а вела в архивный каталог курсов.
              Это первое, что назвал владелец 17.08. Теперь ведёт туда, что написано. */}
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => navigate('/источники')}
          >
            {t('nav.sources')}
          </button>
          {/*
            🔴 ДВЕРЬ В СВОЮ УЧЁБУ (наряд 36 §2). Зеркало наполнялось с промпта 29, и попасть
            на него было неоткуда: `myMirror` числился среди сирот. Обещание §20.5 — «учёба
            принадлежит ученику навсегда» — существовало только в тестах.

            Дверь только у ученика: у преподавателя своего зеркала нет, и пустой экран с
            обещанием «всё ваше останется у вас» в его меню читался бы как насмешка.
          */}
          {isPupil && (
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => navigate('/my-learning')}
            >
              {t('nav.myLearning')}
            </button>
          )}
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch(toggleTheme())}
            aria-label={goingDark ? t('common:theme.toDark') : t('common:theme.toLight')}
          >
            {goingDark ? <Moon size={ICON_MD} /> : <Sun size={ICON_MD} />}
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => void logout()}
            aria-label={t('common:actions.signOut')}
          >
            <LogOut size={ICON_MD} />
          </button>
          <span className={styles.stamp}>{headerStamp(now)}</span>
          {me && profiles.length > 0 && (
            <AccountMenu
              name={{ first: me.firstName, last: me.lastName }}
              profiles={profiles}
              onSwitch={(id) => void switchProfile(id)}
              switching={switching}
            />
          )}
        </div>
      </header>

      {/* 🔴 V-09 (волна 2, axe): <main> — точка, в которую скринридер прыгает, минуя шапку.
          Без неё человек каждый раз слушает навигацию заново, а всё содержимое страницы
          axe считает «вне ориентиров». */}
      <main className={styles.main}>
        {/*
          🔴 ПРИВЕТСТВИЯ ВО ВСЮ ШИРИНУ БОЛЬШЕ НЕТ (лист «Кабинет и учёба», наряд 42).
          Оно занимало 120 px первого экрана и сообщало ровно одно — что человек вошёл, о чём
          он и так знает. Имя переехало в учётку справа в шапке, дата и время — туда же.

          ⚠️ Заголовок странице всё-таки нужен: без него читалка объявляет страницу без имени.
          Он есть, но невидим — зрячему его роль играет отмеченный раздел «Кабинет» в шапке.
        */}
        <h1 className={styles.srOnly}>{t('nav.cabinet')}</h1>

        {/* 🔴 БАННЕР ВЕРИФИКАЦИИ ЖИЛ ТОЛЬКО В ПРЕЖНЕМ КАБИНЕТЕ (аудит продукта 17.08).
            Он стоял в `TeacherCabinet`, то есть на `/app`, а преподаватель после мастера
            живёт здесь и на `/app` не заходит вовсе. Единственное место, где человек узнаёт,
            что его документы на проверке — или что в них отказано и почему, — было ему
            недоступно. Лист D8 прямо называет это невыполненным обещанием.
            Компонент тот же самый: у экрана не должно быть своей версии этого разговора. */}
        {isTeacher && <VerificationBanner profile={me?.teacherProfile} />}

        {loading && !page ? (
          <Skeleton />
        ) : error && !page ? (
          <ErrorState text={t('error')} onRetry={() => void refetch()} />
        ) : !page?.profile ? (
          <NoProfile />
        ) : (
          <div className={styles.page}>
            {/*
              🔴 ТРИ КОЛОНКИ ЛИСТА, У КАЖДОЙ СВОЙ ВОПРОС (ПРАВИЛА 3.4: 1.05 / 1.2 / 0.85).
              Слева «что от меня ждут», в середине «что и когда», справа «как идёт».
              Прежде это была одна лента слотов сверху вниз: чтобы увидеть свой прогресс,
              преподаватель прокручивал мимо всего остального.

              ⚠️ Слота «Сегодня» на листе НЕТ — его работу делает недельная полоса, где
              сегодняшний день отмечен. Держать оба значило показывать одно дважды.
            */}
            <div className={styles.col}>
              <NowSlot page={page} isTeacher={isTeacher} isCadet={isCadet} now={now} />

              <section className={styles.slot} aria-label={t('slots.attention')}>
                <div className={styles.slotHead}>
                  <span className={styles.slotTitle}>{t('slots.attention')}</span>
                  {page.attention.length > 0 && (
                    <span className={styles.slotCount}>
                      {t('slots.attentionCount', { count: page.attention.length })}
                    </span>
                  )}
                </div>
                {page.attention.length === 0 ? (
                  <p className={styles.empty}>{t('empty.attention')}</p>
                ) : (
                  page.attention.map((entry) => (
                    <AttentionRow
                      key={entry.id}
                      entry={entry}
                      now={now}
                      navigate={navigate}
                      onOpenChat={() => setChatOpen(true)}
                    />
                  ))
                )}
              </section>

              {/* Ученику лист даёт «Сдать» на месте учительских дел: то же по смыслу — что
                  ждёт именно вас — но с ближним сроком в подписи. */}
              {!isTeacher && (
                <section className={styles.slot} aria-label={t('slots.continue')}>
                  <div className={styles.slotHead}>
                    <span className={styles.slotTitle}>{t('slots.continue')}</span>
                  </div>
                  {page.continueEntries.length === 0 ? (
                    <p className={styles.empty}>{t('empty.continue')}</p>
                  ) : (
                    page.continueEntries.map((entry) => (
                      <div className={`${styles.row} ${styles.rowNoTime}`} key={entry.id}>
                        <span>
                          <span className={styles.rName}>{entry.title}</span>
                          <span className={styles.rSub}>{entry.courseTitle}</span>
                        </span>
                        <button
                          type="button"
                          className={styles.rAct}
                          onClick={() =>
                            entry.lessonId && navigate(`/lessons/${entry.lessonId}/homework`)
                          }
                        >
                          {t('now.resume')}
                        </button>
                      </div>
                    ))
                  )}
                </section>
              )}
            </div>

            <div className={styles.col}>
              <WeekStrip week={page.week} isCadet={isCadet} />
              {isTeacher && <TeachingSlot rows={page.teaching} />}
            </div>

            <div className={styles.col}>
              {/* §27.5 п.3: «что я веду» и «как это зашло классу» — разные вопросы, лист
                  просит оба. Усвоение стоит выше: оно про класс, а не про меня. */}
              {isTeacher ? (
                <MasterySlot rows={page.mastery} />
              ) : (
                <section className={styles.slot} aria-label={t('slots.progress')}>
                  <div className={styles.slotHead}>
                    <span className={styles.slotTitle}>{t('slots.progress')}</span>
                  </div>
                  {page.progress.length === 0 ? (
                    <p className={styles.empty}>{t('empty.progress')}</p>
                  ) : (
                    page.progress.map((row) => (
                      // Отсюда дорога в кабинет предмета (лист «Кабинет предмета»).
                      <button
                        type="button"
                        className={styles.progRow}
                        key={row.courseId}
                        onClick={() => navigate(`/subjects/${row.courseId}`)}
                      >
                        <div className={styles.progName}>{row.courseTitle}</div>
                        <div className={styles.progMeta}>
                          <span>
                            {t('progress.lessons', {
                              done: row.doneLessons,
                              total: row.totalLessons,
                            })}
                          </span>
                          <span>{row.progressPct}%</span>
                        </div>
                        <div
                          className={styles.progressLine}
                          role="progressbar"
                          aria-valuenow={row.progressPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={row.courseTitle}
                        >
                          <i style={{ inlineSize: `${row.progressPct}%` }} />
                        </div>
                      </button>
                    ))
                  )}
                </section>
              )}

              <section className={styles.slot} aria-label={t('slots.quick')}>
                <div className={styles.slotHead}>
                  <span className={styles.slotTitle}>{t('slots.quick')}</span>
                </div>
                <div className={styles.quick}>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/courses')}
                  >
                    {t('quick.courses')}
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/schedule')}
                  >
                    {t('quick.schedule')}
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate(isTeacher ? '/grading' : '/homework')}
                  >
                    {t('quick.homework')}
                  </button>
                  {/* Пятый быстрый вход листа. Плитки «Кабинет», уводившей на `/app`, здесь
                      нет: этот экран САМ и есть кабинет. */}
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/источники')}
                  >
                    {t('quick.sources')}
                  </button>
                </div>
              </section>

              {/* Приглашение в зеркало — только ученику: у преподавателя своего зеркала нет. */}
              {isPupil && (
                <section className={`${styles.slot} ${styles.mirror}`} aria-label={t('nav.myLearning')}>
                  <h2 className={styles.mirrorTitle}>{t('nav.myLearning')}</h2>
                  <p className={styles.mirrorBody}>{t('mirror.body')}</p>
                  {/*
                    🔴 БЫЛА ЗАЛИВКОЙ — И СТАЛА ТРЕТЬИМ АКЦЕНТОМ НА ЭКРАНЕ (прибор: заливок 3
                    при пределе 2). Главный шаг вперёд в кабинете ученика один — войти в
                    идущий урок; зеркало ждёт и никуда не денется. Плюс прибор нашёл, что
                    подпись кнопки ложилась поверх текста карточки: `justify-self` вернул её
                    в поток, а не поверх него.
                  */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className={styles.mirrorBtn}
                    onClick={() => navigate('/my-learning')}
                  >
                    {t('mirror.open')}
                  </Button>
                  <p className={styles.mirrorNote}>{t('mirror.note')}</p>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      {/* The chat is a window over the page, never a screen (sheet 00). The header button
          and the bubble open the same one. */}
      {/* Пузыря здесь нет: чат вызывается кнопкой в шапке, и второе приглашение на том
          же экране только занимало место — стоя при этом на тексте правой колонки. */}
      <ChatDock open={chatOpen} onOpenChange={setChatOpen} bubble={false} />
    </div>
  );
}

// --- «сейчас» ------------------------------------------------------------------------------
function NowSlot({
  page,
  isTeacher,
  isCadet,
  now,
}: {
  page: Page;
  isTeacher: boolean;
  isCadet: boolean;
  now: Date;
}) {
  const { t } = useTranslation('start');
  const navigate = useNavigate();
  // 🔴 §47.1: кнопка обязана НАЧАТЬ урок, а не перейти в комнату. Раньше здесь стоял один
  // `navigate`, и занятие оставалось назначенным.
  const { start, starting, failed } = useStartLesson();
  const entry = page.now;

  if (!entry) {
    return (
      <section className={styles.slot} aria-label={t('slots.now')}>
        <p className={styles.empty}>
          {t(isTeacher ? 'now.emptyTeacher' : isCadet ? 'now.emptyCadet' : 'now.empty')}
        </p>
      </section>
    );
  }

  const isLesson = entry.kind === 'LESSON_SESSION';
  const kindLabel = entry.isLive
    ? t('now.live')
    : !isLesson
      ? t('now.continue')
      : isTeacher
        ? t('now.teaching')
        : t('now.starting');
  const until = entry.at ? countdown(entry.at, now) : null;

  return (
    <section
      className={`${styles.slot} ${styles.now} ${entry.isLive ? styles.nowLive : ''}`}
      aria-label={t('slots.now')}
    >
      <span className={styles.nowKind}>
        {(entry.isLive || isLesson) && <span className={styles.nowDot} aria-hidden="true" />}
        {kindLabel}
      </span>
      <div className={styles.nowTitle}>{entry.title}</div>
      <div className={styles.nowMeta}>
        {[entry.at && isLesson ? clock(entry.at) : null, entry.courseTitle, entry.teacherName]
          .filter(Boolean)
          .join(' · ')}
      </div>
      <div className={styles.nowRow}>
        <Button
          variant="go"
          loading={starting}
          onClick={() => {
            if (isLesson && entry.sessionId) {
              // Ученик не начинает занятие — он входит в идущее. Преподаватель начинает,
              // и ждёт ответа сервера, прежде чем оказаться в комнате.
              if (isTeacher) void start(entry.sessionId, entry.isLive);
              else navigate(`/sessions/${entry.sessionId}/room`);
              return;
            }
            if (entry.lessonId) navigate(`/lessons/${entry.lessonId}/homework`);
          }}
        >
          {isLesson ? (isTeacher ? t('now.start') : t('now.enter')) : t('now.resume')}
        </Button>
        {until && isLesson && !entry.isLive && until.count > 0 && (
          <span className={styles.nowNote}>
            {t(until.unit === 'hours' ? 'now.inHours' : 'now.inMinutes', { count: until.count })}
          </span>
        )}
        {/* Отказ произносится здесь же: молчаливое нажатие — это то, из-за чего
            преподаватель 23.08 сидел в комнате, где урок не шёл. */}
        {failed && (
          <span className={styles.nowFailed} role="alert">
            {failed}
          </span>
        )}
      </div>
    </section>
  );
}

// --- «требует внимания» --------------------------------------------------------------------
function AttentionRow({
  entry,
  now,
  navigate,
  onOpenChat,
}: {
  entry: AttentionEntry;
  now: Date;
  navigate: ReturnType<typeof useNavigate>;
  /** Чат — окно поверх страницы (лист 00), а не экран: строка открывает его же. */
  onOpenChat: () => void;
}) {
  const { t } = useTranslation(['start', 'common']);

  // 🔴 §27.5 п.1. Три вида записей листа, а не один. Ветки ЯВНЫЕ: неизвестный вид иначе
  // проваливался бы в ветку домашней работы ниже и рисовался как задание со сроком —
  // строка выглядела бы осмысленной и была бы неправдой.
  if (entry.kind === 'CHAT_QUESTIONS') {
    return (
      <div className={`${styles.row} ${styles.rowNoTime}`}>
        <span>
          <span className={styles.rName}>
            <span className={styles.rDot} aria-hidden="true" />
            {t('entry.chat', { count: entry.count ?? 0 })}
          </span>
        </span>
        <Button variant="secondary" size="sm" onClick={onOpenChat}>
          {t('entry.openChat')}
        </Button>
      </div>
    );
  }

  if (entry.kind === 'MATERIALS_MISSING') {
    return (
      <div className={`${styles.row} ${styles.rowNoTime}`}>
        <span>
          <span className={styles.rName}>
            <span className={styles.rDot} aria-hidden="true" />
            {t('entry.materials', { at: entry.at ? clock(entry.at) : '' })}
          </span>
          <span className={styles.rSub}>
            {entry.title}
            {entry.courseTitle ? ` · ${entry.courseTitle}` : ''}
          </span>
        </span>
        {entry.lessonId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/lessons/${entry.lessonId}/homework`)}
          >
            {t('entry.openLesson')}
          </Button>
        )}
      </div>
    );
  }

  if (entry.kind === 'REPETITION_DUE') {
    return (
      <div className={`${styles.row} ${styles.rowNoTime}`}>
        <span>
          <span className={styles.rName}>
            <span className={styles.rDot} aria-hidden="true" />
            {/* Ноль — отдельная фраза, а не «0 карточек ждут»: дверь в повторение теперь
                есть всегда, пока у ученика есть слова (наряд 34 §5). */}
            {t('entry.repetition', { count: entry.count ?? 0 })}
          </span>
        </span>
        {/* §59: экран повторения на старом оформлении и рисоваться сейчас не будет.
            Дверь остаётся видимой и названной — но не нажимается, и сказано почему. */}
        <MutedDoor label={t('entry.openRepetition')} why={t('common:soon.repetition')} />
      </div>
    );
  }

  if (entry.kind === 'GRADING_QUEUE') {
    return (
      <div className={`${styles.row} ${styles.rowNoTime}`}>
        <span>
          <span className={styles.rName}>
            <span className={styles.rDot} aria-hidden="true" />
            {t('entry.queue', { count: entry.count ?? 0 })}
          </span>
          {entry.ageDays != null && entry.ageDays > 0 && (
            <span className={styles.rSub}>{t('entry.queueAge', { count: entry.ageDays })}</span>
          )}
        </span>
        <Button variant="secondary" size="sm" onClick={() => navigate('/grading')}>
          {t('entry.openQueue')}
        </Button>
      </div>
    );
  }

  const due = entry.kind === 'HOMEWORK_DUE' && entry.at ? daysUntil(entry.at, now) : null;
  // 🔴 T-06 (аудит 14.08): «проверено, есть комментарий» ставилось при ЛЮБОМ `due === null` —
  // то есть и там, где работа не проверена, и там, где комментария нет. Штамп говорит теперь
  // только то, что известно: срока у этой строки нет.
  const tag =
    due === null
      ? t('entry.noDeadline')
      : due === 0
        ? t('entry.dueToday')
        : due === 1
          ? t('entry.dueTomorrow')
          : t('entry.dueInDays', { count: due });

  return (
    <div className={`${styles.row} ${styles.rowNoTime}`}>
      <span>
        <span className={styles.rName}>
          {due !== null && due <= 1 && <span className={styles.rDot} aria-hidden="true" />}
          {entry.title}
        </span>
        <span className={styles.rSub}>
          {entry.kind === 'HOMEWORK_GRADED' && entry.count != null
            ? t('entry.score', { score: entry.count })
            : entry.courseTitle}
        </span>
      </span>
      <span className={`${styles.rTag} ${due !== null && due <= 1 ? styles.rTagWarn : ''}`}>
        {tag}
      </span>
    </div>
  );
}

// --- мои курсы (преподаватель) ---------------------------------------------------------------
/**
 * «Что я веду» — список курсов преподавателя со состоянием каждого.
 *
 * Три вещи на карточке, и каждая отвечает на вопрос, который иначе стоит клика:
 * сколько уроков и сколько из них опубликовано · сколько учеников · когда ближайшее занятие.
 * Без последней строки «двадцать уроков» приходилось открывать по одному, чтобы понять, какой
 * из них уже назначен.
 *
 * Ссылка «все курсы →» ведёт в каталог; сам список — своё, а не выборка из общего.
 */
/**
 * «Усвоение группы» — лист 00.
 *
 * ⚠️ Процент считается по объективным ответам, и рядом с ним всегда стоит, СКОЛЬКИМИ ответами
 * он подкреплён: «84% по четырём ответам» и «84% по двумстам» — разные утверждения, и
 * преподаватель имеет право их различить. Числа без опоры выглядят точнее, чем есть.
 */
function MasterySlot({ rows }: { rows: Page['mastery'] }) {
  const { t } = useTranslation(['start', 'common']);
  const navigate = useNavigate();
  return (
    <section className={styles.slot} aria-label={t('slots.mastery')}>
      <div className={styles.slotHead}>
        <span className={styles.slotTitle}>{t('slots.mastery')}</span>
      </div>
      {rows.length === 0 ? (
        <p className={styles.empty}>{t('empty.mastery')}</p>
      ) : (
        rows.map((row) => (
          <button
            type="button"
            className={`${styles.row} ${styles.rowNoTime}`}
            key={row.lessonId}
            onClick={() => navigate(`/lessons/${row.lessonId}/homework`)}
          >
            <span>
              <span className={styles.rName}>{row.title}</span>
              <span className={styles.rSub}>
                {row.courseTitle} · {t('mastery.answers', { count: row.answers })}
                {row.struggling > 0 ? ` · ${t('mastery.struggling', { count: row.struggling })}` : ''}
              </span>
            </span>
            <span className={styles.masteryPct}>{t('mastery.pct', { n: row.masteryPct })}</span>
          </button>
        ))
      )}
    </section>
  );
}

function TeachingSlot({ rows }: { rows: Page['teaching'] }) {
  const { t } = useTranslation(['start', 'common']);
  const navigate = useNavigate();

  return (
    <section className={styles.slot} aria-label={t('slots.teaching')}>
      <div className={styles.slotHead}>
        <span className={styles.slotTitle}>{t('slots.teaching')}</span>
        <button type="button" className={styles.more} onClick={() => navigate('/courses')}>
          {t('slots.allCourses')}
        </button>
      </div>
      {rows.length === 0 ? (
        <>
          <p className={styles.empty}>{t('empty.teaching')}</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/courses/new')}>
            {t('empty.teachingCta')}
          </Button>
        </>
      ) : (
        <div className={styles.courses}>
          {rows.map((row) => (
            <button
              type="button"
              className={styles.courseCard}
              key={row.courseId}
              onClick={() => navigate(`/courses/${row.courseId}`)}
            >
              <span className={styles.courseName}>{row.title}</span>
              <span className={styles.courseSub}>
                {[
                  row.subject,
                  t('teaching.lessons', { count: row.lessonCount }),
                  row.studentCount > 0
                    ? t('teaching.students', { count: row.studentCount })
                    : t('teaching.noStudents'),
                ].join(' · ')}
              </span>
              <span className={styles.courseNext}>
                {row.nextAt && row.nextLessonTitle
                  ? `${clock(row.nextAt)} · ${t('teaching.next', { title: row.nextLessonTitle })}`
                  : t('teaching.noNext')}
              </span>
              <span className={styles.courseTags}>
                {row.isDraft && <span className={styles.tagDraft}>{t('teaching.draft')}</span>}
                <span className={styles.courseNext}>{publishedLabel(row, t)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Опубликовано ли всё — тремя разными словами, потому что это три разных положения дел. */
function publishedLabel(
  row: Page['teaching'][number],
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  if (row.lessonCount === 0) return t('teaching.sections', { count: row.sectionCount });
  if (row.publishedLessons === 0) return t('teaching.nothingPublished');
  if (row.publishedLessons === row.lessonCount) return t('teaching.allPublished');
  return t('teaching.publishedOf', { published: row.publishedLessons, total: row.lessonCount });
}

// --- недельный дневник ----------------------------------------------------------------------
/**
 * Полоса недели — лист 00: «Тап по дню открывает дневник этого дня; стрелки листают недели».
 *
 * 🔴 §27.5 п.2: была КАРТИНКА. Ни дня нажать, ни недели перелистнуть; ключи `week.openDay`,
 * `week.prev`, `week.next` лежали в словаре и не читались ниоткуда — обещание листа было
 * записано словами и не сделано.
 *
 * ⚠️ Соседняя неделя приезжает отдельным запросом (`weekStrip`), а не пересборкой стартовой:
 * восемь слотов работают, и перелистывание недели — не повод трогать их все.
 */
/** Дата через `days` дней, в том же виде `YYYY-MM-DD`, что отдаёт сервер. */
function shiftDate(iso: string | undefined, days: number): string {
  const base = iso ? new Date(iso) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function WeekStrip({ week, isCadet }: { week: Page['week']; isCadet: boolean }) {
  const { t } = useTranslation(['start', 'common']);
  const navigate = useNavigate();
  /** Насколько недель ушли от текущей. 0 — та, что пришла со стартовой. */
  const [offset, setOffset] = useState(0);
  const shifted = useWeekStripQuery({
    variables: { weekStart: shiftDate(week[0]?.date, offset * 7) },
    skip: offset === 0 || !week[0],
  });

  // Пока соседняя неделя едет, показываем ПРЕЖНЮЮ, а не пустоту: мигающая полоса читается
  // как «на той неделе ничего нет», хотя мы просто ещё не знаем.
  const shown = offset === 0 ? week : (shifted.data?.weekStrip ?? shifted.previousData?.weekStrip ?? []);
  const range = weekRange(shown.length ? shown : week);
  const hasAnything = shown.some((day) => day.entries.length > 0);

  return (
    <section className={styles.slot} aria-label={t('slots.week')}>
      <div className={styles.weekHead}>
        <span className={styles.slotTitle}>{t('slots.week')}</span>
        <span className={styles.weekNav}>
          <button
            type="button"
            className={styles.weekArrow}
            aria-label={t('week.prev')}
            onClick={() => setOffset((n) => n - 1)}
          >
            ‹
          </button>
          <span className={styles.weekRange}>{t('week.range', range)}</span>
          <button
            type="button"
            className={styles.weekArrow}
            aria-label={t('week.next')}
            onClick={() => setOffset((n) => n + 1)}
          >
            ›
          </button>
        </span>
      </div>
      {!hasAnything && (
        // A self-paced learner has no timetable; the sheet fills this with repetition load,
        // and spaced repetition is a later phase — so we say so instead of inventing counts.
        <p className={styles.empty}>{t(isCadet ? 'empty.weekCadet' : 'empty.week')}</p>
      )}
      <div className={styles.days}>
        {shown.map((day) => (
          // Тап по дню открывает расписание этого дня — то, что лист называет дневником дня.
          <button
            type="button"
            className={`${styles.day} ${day.isToday ? styles.dayToday : ''}`}
            key={day.date}
            aria-current={day.isToday ? 'date' : undefined}
            aria-label={t('week.openDay', { date: dayNumber(day.date) })}
            onClick={() => navigate(`/schedule?day=${day.date}`)}
          >
            <div className={styles.dHead}>
              <span>{weekday(day.date)}</span>
              <span className={styles.dNum}>{dayNumber(day.date)}</span>
            </div>
            {day.entries.slice(0, 3).map((entry) => (
              <span
                className={`${styles.ev} ${entry.isLive ? styles.evLive : ''}`}
                key={entry.id}
                title={entry.title}
              >
                {entry.at && <span className={styles.evTime}>{clock(entry.at)}</span>}
                <span className={styles.evName}>{entry.title}</span>
              </span>
            ))}
            {day.entries.length > 3 && (
              <span className={styles.dMore}>
                {t('week.more', { count: day.entries.length - 3 })}
              </span>
            )}
            {day.entries.length === 0 && <span className={styles.dMore}>{t('week.free')}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

// --- states -----------------------------------------------------------------------------------
function Skeleton() {
  return (
    <div className={styles.skel} data-testid="start-skeleton" aria-busy="true">
      <span className={`${styles.skel}`} style={{ height: 132 }} />
      <span className={`${styles.skel}`} style={{ height: 420 }} />
      <span className={`${styles.skel}`} style={{ height: 160 }} />
      <span className={`${styles.skel}`} style={{ height: 160 }} />
      <span className={`${styles.skel}`} style={{ height: 120 }} />
      <span className={`${styles.skel}`} style={{ height: 120 }} />
    </div>
  );
}

function NoProfile() {
  const { t } = useTranslation(['start', 'common']);
  const navigate = useNavigate();
  return (
    <div className={styles.blank}>
      <h2>{t('noProfile.title')}</h2>
      <p>{t('noProfile.body')}</p>
      <Button variant="primary" onClick={() => navigate('/courses')}>
        {t('noProfile.cta')}
      </Button>
    </div>
  );
}
