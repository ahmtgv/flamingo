import { LogOut, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { ChatDock, useChatUnread } from '@/features/chat';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import {
  type StartPageQuery,
  useLearningProfilesQuery,
  useMeQuery,
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
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/start')}
          aria-label="Flamingo"
        >
          <Logo />
        </button>
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
          <button type="button" className={styles.navBtn} onClick={() => navigate('/courses')}>
            {t('nav.sources')}
          </button>
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
      <main className={styles.page}>
        <div className={styles.hi}>
          <h1 className={styles.hiName}>
            {t(isTeacher ? 'greetingTeacher' : 'greeting', { name: me?.firstName ?? '' })}
          </h1>
          <span className={styles.hiDate}>{headerStamp(now)}</span>
        </div>

        {loading && !page ? (
          <Skeleton />
        ) : error && !page ? (
          <ErrorState text={t('error')} onRetry={() => void refetch()} />
        ) : !page?.profile ? (
          <NoProfile />
        ) : (
          <div className={`${styles.grid} ${isTeacher ? styles.noContinue : ''}`}>
            <NowSlot page={page} isTeacher={isTeacher} isCadet={isCadet} now={now} />

            <section className={`${styles.slot} ${styles.sToday}`} aria-label={t('slots.today')}>
              <div className={styles.slotHead}>
                <span className={styles.slotTitle}>{t('slots.today')}</span>
                <button type="button" className={styles.more} onClick={() => navigate('/schedule')}>
                  {t('slots.allSchedule')}
                </button>
              </div>
              {page.today.length === 0 ? (
                <p className={styles.empty}>{t(isCadet ? 'empty.todayCadet' : 'empty.today')}</p>
              ) : (
                page.today.map((entry) => (
                  <div className={styles.row} key={entry.id}>
                    <span className={styles.rTime}>{entry.at ? clock(entry.at) : ''}</span>
                    <span>
                      <span className={styles.rName}>
                        {entry.isLive && <span className={styles.rDot} aria-hidden="true" />}
                        {entry.title}
                      </span>
                      <span className={styles.rSub}>
                        {[entry.courseTitle, entry.teacherName].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className={`${styles.rTag} ${entry.isLive ? styles.rTagWarn : ''}`}>
                      {entry.isLive ? t('entry.live') : t('entry.lesson')}
                    </span>
                  </div>
                ))
              )}
            </section>

            <section className={`${styles.slot} ${styles.sAttn}`} aria-label={t('slots.attention')}>
              <div className={styles.slotHead}>
                <span className={styles.slotTitle}>{t('slots.attention')}</span>
              </div>
              {page.attention.length === 0 ? (
                <p className={styles.empty}>{t('empty.attention')}</p>
              ) : (
                page.attention.map((entry) => (
                  <AttentionRow key={entry.id} entry={entry} now={now} navigate={navigate} />
                ))
              )}
            </section>

            <WeekStrip week={page.week} isCadet={isCadet} />

            {!isTeacher && (
              <section
                className={`${styles.slot} ${styles.sContinue}`}
                aria-label={t('slots.continue')}
              >
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          entry.lessonId && navigate(`/lessons/${entry.lessonId}/homework`)
                        }
                      >
                        {t('now.resume')}
                      </Button>
                    </div>
                  ))
                )}
              </section>
            )}

            {/* 🔴 Находка владельца 15.08, п.2: интерфейс был построен так, будто курс один.
                Слот прогресса у преподавателя всегда пуст — прогресс считается по записи
                ученика, которой у него нет. Здесь стоят ЕГО КУРСЫ: «что я веду» отвечается на
                первом же экране, без клика, и отсюда же переключаются между курсами. */}
            {isTeacher ? (
              <TeachingSlot rows={page.teaching} />
            ) : (
            <section
              className={`${styles.slot} ${styles.sProgress}`}
              aria-label={t('slots.progress')}
            >
              <div className={styles.slotHead}>
                <span className={styles.slotTitle}>{t('slots.progress')}</span>
              </div>
              {page.progress.length === 0 ? (
                <p className={styles.empty}>{t('empty.progress')}</p>
              ) : (
                page.progress.map((row) => (
                  // This is where «мои предметы» leads (atlas sheet 01): the subject cabinet.
                  <button
                    type="button"
                    className={styles.progRow}
                    key={row.courseId}
                    onClick={() => navigate(`/subjects/${row.courseId}`)}
                  >
                    <div className={styles.progName}>{row.courseTitle}</div>
                    <div className={styles.progMeta}>
                      <span>
                        {t('progress.lessons', { done: row.doneLessons, total: row.totalLessons })}
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
                      <i style={{ width: `${row.progressPct}%` }} />
                    </div>
                  </button>
                ))
              )}
            </section>
            )}

            <section className={`${styles.slot} ${styles.sQuick}`} aria-label={t('slots.quick')}>
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
                <button type="button" className={styles.quickBtn} onClick={() => navigate('/app')}>
                  {t('quick.cabinet')}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* The chat is a window over the page, never a screen (sheet 00). The header button
          and the bubble open the same one. */}
      <ChatDock open={chatOpen} onOpenChange={setChatOpen} />
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
  const entry = page.now;

  if (!entry) {
    return (
      <section className={`${styles.slot} ${styles.sNow}`} aria-label={t('slots.now')}>
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
      className={`${styles.slot} ${styles.sNow} ${styles.now} ${entry.isLive ? styles.nowLive : ''}`}
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
          variant="primary"
          onClick={() =>
            isLesson && entry.sessionId
              ? navigate(`/sessions/${entry.sessionId}/room`)
              : entry.lessonId && navigate(`/lessons/${entry.lessonId}/homework`)
          }
        >
          {isLesson ? (isTeacher ? t('now.start') : t('now.enter')) : t('now.resume')}
        </Button>
        {until && isLesson && !entry.isLive && until.count > 0 && (
          <span className={styles.nowNote}>
            {t(until.unit === 'hours' ? 'now.inHours' : 'now.inMinutes', { count: until.count })}
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
}: {
  entry: AttentionEntry;
  now: Date;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useTranslation('start');

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
function TeachingSlot({ rows }: { rows: Page['teaching'] }) {
  const { t } = useTranslation('start');
  const navigate = useNavigate();

  return (
    <section className={`${styles.slot} ${styles.sProgress}`} aria-label={t('slots.teaching')}>
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
function WeekStrip({ week, isCadet }: { week: Page['week']; isCadet: boolean }) {
  const { t } = useTranslation('start');
  const range = weekRange(week);
  const hasAnything = week.some((day) => day.entries.length > 0);

  return (
    <section className={`${styles.slot} ${styles.sWeek}`} aria-label={t('slots.week')}>
      <div className={styles.weekHead}>
        <span className={styles.slotTitle}>{t('slots.week')}</span>
        <span className={styles.weekRange}>{t('week.range', range)}</span>
      </div>
      {!hasAnything && (
        // A self-paced learner has no timetable; the sheet fills this with repetition load,
        // and spaced repetition is a later phase — so we say so instead of inventing counts.
        <p className={styles.empty}>{t(isCadet ? 'empty.weekCadet' : 'empty.week')}</p>
      )}
      <div className={styles.days}>
        {week.map((day) => (
          <div
            className={`${styles.day} ${day.isToday ? styles.dayToday : ''}`}
            key={day.date}
            aria-current={day.isToday ? 'date' : undefined}
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
                {entry.title}
                {entry.at ? ` · ${clock(entry.at)}` : ''}
              </span>
            ))}
            {day.entries.length > 3 && (
              <span className={styles.dMore}>
                {t('week.more', { count: day.entries.length - 3 })}
              </span>
            )}
            {day.entries.length === 0 && <span className={styles.dMore}>{t('week.free')}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

// --- states -----------------------------------------------------------------------------------
function Skeleton() {
  return (
    <div className={styles.grid} data-testid="start-skeleton" aria-busy="true">
      <span className={`${styles.skel} ${styles.sNow}`} style={{ height: 132 }} />
      <span className={`${styles.skel} ${styles.sWeek}`} style={{ height: 420 }} />
      <span className={`${styles.skel} ${styles.sToday}`} style={{ height: 160 }} />
      <span className={`${styles.skel} ${styles.sAttn}`} style={{ height: 160 }} />
      <span className={`${styles.skel} ${styles.sContinue}`} style={{ height: 120 }} />
      <span className={`${styles.skel} ${styles.sProgress}`} style={{ height: 120 }} />
    </div>
  );
}

function NoProfile() {
  const { t } = useTranslation('start');
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
