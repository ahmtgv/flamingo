import {
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  Video,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStartLesson } from '@/features/lesson/startLesson';
import { useNavigate } from 'react-router-dom';

import type { MeQuery } from '@/entities/graphql/generated';
import { useTeacherDashboardQuery } from '@/entities/graphql/generated';
import { Button, ErrorState } from '@/shared/ui';

import { CabinetLayout, type CabinetNavItem } from './CabinetLayout';
import { VerificationBanner } from './VerificationBanner';
import styles from './cabinet.module.css';
import { initialsOf } from './initials';
import {
  formatClock,
  formatHeaderMeta,
  fullDaysSince,
  humanizeDuration,
  minutesUntil,
} from './teacherDashboardFormat';

type Me = NonNullable<MeQuery['me']>;

/**
 * Teacher cabinet — atlas sheet 03. The teacher arrives asking "what needs me right now?";
 * the answer is three numbers (today's sessions · ungraded homework · students), then today's
 * sessions and my courses. AIR: exactly one coral accent per state — the ungraded-homework
 * task-metric in a calm day, intercepted by a LIVE session's "return to air" button.
 */
export function TeacherCabinet({ me }: { me: Me }) {
  const { t } = useTranslation('cabinet');
  const navigate = useNavigate();
  const tp = me.teacherProfile;
  // §47.1: начать урок — значит дождаться сервера, а не перейти по адресу.
  const { start, starting, failed } = useStartLesson();
  const { data, loading, error, refetch } = useTeacherDashboardQuery();

  const nav: CabinetNavItem[] = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, active: true },
    { key: 'courses', label: t('nav.courses'), icon: BookOpen, to: '/courses' },
    { key: 'lessons', label: t('nav.lessons'), icon: Video, to: '/schedule' },
    { key: 'grading', label: t('nav.grading'), icon: FileText, to: '/grading' },
    { key: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
  ];

  const units = { hour: t('teacher.units.hour'), minute: t('teacher.units.minute') };

  const dash = data?.teacherDashboard;
  const view = useMemo(() => {
    if (!dash) return null;
    const now = new Date();
    // "What needs me now" = today's ongoing/upcoming sessions (ended/cancelled ones are done).
    const active = dash.upcomingSessions
      .filter((s) => s.status === 'LIVE' || s.status === 'SCHEDULED')
      .slice()
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const isLive = active.some((s) => s.status === 'LIVE');
    const oldest = dash.pendingSubmissions
      .map((s) => s.submittedAt)
      .filter((x): x is string => Boolean(x))
      .sort()[0];
    return {
      now,
      active,
      isLive,
      pendingCount: dash.pendingSubmissions.length,
      oldestDays: oldest ? fullDaysSince(oldest, now) : 0,
    };
  }, [dash]);

  return (
    <CabinetLayout
      nav={nav}
      canUploadAvatar
      user={{
        name: me.firstName,
        initials: initialsOf(me.firstName, me.lastName),
        avatarUrl: me.avatarUrl,
      }}
    >
      <div className={styles.content}>
        <div className={styles.headRow}>
          <h1 className={styles.pageTitle}>
            {t('teacher.greeting', { name: me.displayName })}
          </h1>
          <span className={styles.headMeta}>{formatHeaderMeta(new Date())}</span>
        </div>

        {/* Верификация — свой блок: у неё четыре состояния и своя кнопка загрузки, а не
            одна строка текста (находка владельца 15.08, п.4). */}
        <VerificationBanner profile={tp} />

        {loading && !dash ? (
          <div data-testid="teacher-dash-skeleton" aria-busy="true">
            <span
              className={styles.skelBar}
              style={{ width: '44%', height: 38, marginTop: 'var(--space-6)' }}
            />
            <div className={styles.skelMetrics}>
              <span className={styles.skelBar} style={{ height: 72 }} />
              <span className={styles.skelBar} style={{ height: 72 }} />
              <span className={styles.skelBar} style={{ height: 72 }} />
            </div>
            <span className={styles.skelBar} style={{ height: 56, marginBottom: 'var(--space-3)' }} />
            <span className={styles.skelBar} style={{ height: 56, marginBottom: 'var(--space-6)' }} />
            <div className={styles.skelCourses}>
              <span className={styles.skelBar} style={{ height: 110 }} />
              <span className={styles.skelBar} style={{ height: 110 }} />
              <span className={styles.skelBar} style={{ height: 110 }} />
            </div>
          </div>
        ) : error && !dash ? (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <ErrorState text={t('teacher.error')} onRetry={() => void refetch()} />
          </div>
        ) : dash && view && dash.courses.length === 0 ? (
          <div className={styles.emptyBig}>
            <h2>{t('teacher.empty.title')}</h2>
            <p>{t('teacher.empty.text')}</p>
            <Button variant="primary" onClick={() => navigate('/courses/new')}>
              {t('teacher.empty.cta')}
            </Button>
          </div>
        ) : dash && view ? (
          <>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <div className={styles.metricNum}>{view.active.length}</div>
                <div className={styles.metricCap}>{t('teacher.metrics.sessionsToday')}</div>
                <div className={styles.metricNote}>
                  {view.active[0]
                    ? t('teacher.metrics.nearest', { time: formatClock(view.active[0].startAt) })
                    : t('teacher.metrics.noSessions')}
                </div>
              </div>

              {view.pendingCount > 0 ? (
                <button
                  type="button"
                  className={`${styles.metricLink} ${view.isLive ? '' : styles.metricAccent}`}
                  onClick={() => navigate('/grading')}
                >
                  <div className={styles.metricNum}>{view.pendingCount}</div>
                  <div className={styles.metricCap}>{t('teacher.metrics.pending')}</div>
                  <div className={styles.metricNote}>
                    {view.oldestDays > 0
                      ? t('teacher.metrics.oldest', { count: view.oldestDays })
                      : t('teacher.metrics.oldestToday')}
                  </div>
                </button>
              ) : (
                <div className={styles.metric}>
                  <div className={styles.metricNum}>0</div>
                  <div className={styles.metricCap}>{t('teacher.metrics.pending')}</div>
                  <div className={styles.metricNote}>{t('teacher.metrics.allChecked')}</div>
                </div>
              )}

              <div className={styles.metric}>
                <div className={styles.metricNum}>{dash.studentCount}</div>
                <div className={styles.metricCap}>{t('teacher.metrics.students')}</div>
                {dash.newStudentsThisWeek > 0 && (
                  <div className={styles.metricNote}>
                    {t('teacher.metrics.newThisWeek', { count: dash.newStudentsThisWeek })}
                  </div>
                )}
              </div>
            </div>

            <p className={styles.secTitle}>{t('teacher.sections.today')}</p>
            {/* Отказ запуска — словами и на месте: молчаливое нажатие уже стоило владельцу
                урока 23.08. */}
            {failed && (
              <p className={styles.rowSub} role="alert">
                {failed}
              </p>
            )}
            {view.active.length === 0 ? (
              <p className={styles.rowEmpty}>{t('teacher.metrics.noSessions')}</p>
            ) : (
              <div>
                {view.active.map((s) => {
                  const startMs = new Date(s.startAt).getTime();
                  const startable = s.status === 'SCHEDULED' && startMs <= view.now.getTime();
                  return (
                    <div className={styles.row} key={s.id}>
                      <span className={styles.rowTime}>{formatClock(s.startAt)}</span>
                      <div>
                        <div className={styles.rowTitle}>{s.lesson?.title ?? '—'}</div>
                        {s.status === 'LIVE' && (
                          <div className={styles.rowSub}>{t('teacher.session.live')}</div>
                        )}
                      </div>
                      {s.status === 'LIVE' ? (
                        <button
                          type="button"
                          className={`${styles.liveBtn} ${styles.rowAction}`}
                          onClick={() => navigate(`/sessions/${s.id}/room`)}
                        >
                          <span className={styles.liveDot} aria-hidden="true" />
                          {t('teacher.session.returnLive')}
                        </button>
                      ) : startable ? (
                        <span className={styles.rowAction}>
                          {/* 🔴 §47.1: вторая кнопка-обманка. Делала только переход —
                              занятие оставалось назначенным, а комната пустой. */}
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={starting}
                            onClick={() => void start(s.id)}
                          >
                            {t('teacher.session.start')}
                          </Button>
                        </span>
                      ) : (
                        <span className={`${styles.rowGhost} ${styles.rowAction}`}>
                          {t('teacher.session.startsIn', {
                            value: humanizeDuration(minutesUntil(s.startAt, view.now), units),
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className={styles.secTitle}>{t('teacher.sections.courses')}</p>
            <div className={styles.courses}>
              {dash.courses.map((c) => {
                const published = c.status === 'PUBLISHED';
                return (
                  <button
                    type="button"
                    className={styles.course}
                    key={c.id}
                    onClick={() => navigate(`/courses/${c.id}`)}
                  >
                    <div className={styles.courseHead}>
                      <span className={`${styles.pill} ${published ? '' : styles.pillDraft}`}>
                        {published ? t('teacher.course.published') : t('teacher.course.draft')}
                      </span>
                      <span className={styles.courseMeta}>
                        {t('teacher.course.lessons', { count: c.lessonCount })}
                      </span>
                    </div>
                    <div className={styles.courseTitle}>{c.title}</div>
                    <div className={styles.courseMeta}>
                      {published
                        ? t('teacher.course.students', { count: c.enrollmentCount })
                        : t('teacher.course.unpublished')}
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                className={`${styles.course} ${styles.newCourse}`}
                onClick={() => navigate('/courses/new')}
              >
                + {t('teacher.course.new')}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </CabinetLayout>
  );
}
