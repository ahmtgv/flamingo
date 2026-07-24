import { ArrowLeft, LogOut, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import { useTeacherDashboardQuery } from '@/entities/graphql/generated';
import { ICON_MD, ICON_SM } from '@/shared/ui/iconSizes';
import { Button, ErrorState, Logo } from '@/shared/ui';

import styles from './gradingQueue.module.css';

const MS_PER_DAY = 86_400_000;

/**
 * Teacher grading queue — the destination of the cabinet's "ungraded homework" task-metric
 * (atlas 03). Reuses the composite `teacherDashboard.pendingSubmissions` (owner-scoped
 * server-side, oldest first) rather than a second query; each row opens the homework's
 * grading view. No new atlas contract — a functional work-list on the design system.
 */
export function GradingQueueScreen() {
  const { t } = useTranslation(['cabinet', 'common']);
  const navigate = useNavigate();
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const logout = useLogout();
  const goingDark = theme === 'light';

  const { data, loading, error, refetch } = useTeacherDashboardQuery();
  const pending = data?.teacherDashboard.pendingSubmissions ?? [];
  const now = Date.now();

  function waitLabel(submittedAt: string | null | undefined): string {
    if (!submittedAt) return '';
    const days = Math.max(0, Math.floor((now - new Date(submittedAt).getTime()) / MS_PER_DAY));
    return days > 0 ? t('grading.waiting', { count: days }) : t('grading.waitingToday');
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/app')}
          aria-label="Flamingo"
        >
          <Logo />
        </button>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => dispatch(toggleTheme())}
            aria-label={goingDark ? t('common:theme.toDark') : t('common:theme.toLight')}
          >
            {goingDark ? <Moon size={ICON_MD} /> : <Sun size={ICON_MD} />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => void logout()}
            aria-label={t('common:actions.signOut')}
          >
            <LogOut size={ICON_MD} />
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/app')}>
          <ArrowLeft size={ICON_SM} /> {t('grading.back')}
        </button>
        <h1 className={styles.pageTitle}>{t('grading.title')}</h1>
        <p className={styles.pageSub}>{t('grading.sub')}</p>

        {error && pending.length === 0 ? (
          <ErrorState text={t('grading.error')} onRetry={() => void refetch()} />
        ) : pending.length === 0 ? (
          <p className={styles.empty}>
            {loading ? t('common:actions.loading') : t('grading.empty')}
          </p>
        ) : (
          pending.map((s) => (
            <div className={styles.row} key={s.id}>
              <div className={styles.rowMain}>
                <div className={styles.student}>
                  {s.student.user.firstName} {s.student.user.lastName}
                </div>
                <div className={styles.homework}>{s.homework.title}</div>
              </div>
              <span className={`${styles.wait} ${s.status === 'LATE' ? styles.late : ''}`}>
                {s.status === 'LATE' ? t('grading.late') : waitLabel(s.submittedAt)}
              </span>
              {s.homework.lesson && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/lessons/${s.homework.lesson!.id}/homework`)}
                >
                  {t('grading.grade')}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
