import { LogOut, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import {
  useGradeSubmissionMutation,
  useTeacherDashboardQuery,
} from '@/entities/graphql/generated';
import { ICON_MD } from '@/shared/ui/iconSizes';
import { Button, ErrorState, Input, Logo, StateCard } from '@/shared/ui';

import styles from './gradingQueue.module.css';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';

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

  /*
   * 🔴 ПРОВЕРКА ЖИВЁТ В ОДНОМ МЕСТЕ (лист «Задания и конспект», вид «проверка»).
   * Прежде каждая строка уводила на экран урока: двадцать работ — двадцать переходов туда и
   * обратно. Теперь работа открывается справа, а «Отправить и взять следующую» делает то же
   * действие без дороги.
   */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = pending.find((s) => s.id === pickedId) ?? pending[0] ?? null;
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [grade, { loading: sending }] = useGradeSubmissionMutation();

  async function sendAndTakeNext() {
    if (!picked) return;
    const index = pending.findIndex((s) => s.id === picked.id);
    await grade({
      variables: {
        input: { submissionId: picked.id, score: score ?? undefined, comment: comment || undefined },
      },
    }).catch(() => undefined);
    // Следующая по очереди — та, что ждёт дольше всех после этой. Сбрасываем оценку и слова:
    // перенести их на чужую работу было бы худшей из возможных ошибок.
    setPickedId(pending[index + 1]?.id ?? null);
    setScore(null);
    setComment('');
    await refetch();
  }

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
          onClick={() => navigate(HOME_ROUTE)}
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
        <aside className={styles.queue} aria-label={t('grading.title')}>
          <div className={styles.queueHead}>
            <h1 className={styles.queueTitle}>{t('grading.title')}</h1>
            {pending.length > 0 && (
              <span className={styles.queueCount}>
                {t('grading.count', { count: pending.length })}
              </span>
            )}
          </div>

          <div className={styles.queueList}>
            {pending.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.row}
                aria-current={picked?.id === s.id}
                onClick={() => {
                  setPickedId(s.id);
                  setScore(null);
                  setComment('');
                }}
              >
                <span className={styles.student}>{s.student.user.formalName}</span>
                <span className={`${styles.wait} ${s.status === 'LATE' ? styles.late : ''}`}>
                  {s.status === 'LATE' ? t('grading.late') : waitLabel(s.submittedAt)}
                </span>
                <span className={styles.homework}>{s.homework.title}</span>
              </button>
            ))}
          </div>

          {/* Порядок очереди назван словами: иначе он выглядит случайным. */}
          <p className={styles.queueFoot}>{t('grading.order')}</p>
        </aside>

        <section className={styles.work} aria-label={t('grading.workLabel')}>
          {error && pending.length === 0 ? (
            <div className={styles.workBody}>
              <ErrorState text={t('grading.error')} onRetry={() => void refetch()} />
            </div>
          ) : !picked ? (
            <div className={styles.workBody}>
              <StateCard
                kind="empty"
                where={t('grading.emptyWhere')}
                title={loading ? t('common:actions.loading') : t('grading.emptyTitle')}
                actions={
                  <Button variant="secondary" size="sm" onClick={() => navigate(HOME_ROUTE)}>
                    {t('grading.back')}
                  </Button>
                }
              >
                <p>{t('grading.emptyBody')}</p>
              </StateCard>
            </div>
          ) : (
            <>
              <div className={styles.workHead}>
                <h2 className={styles.workTitle}>
                  {picked.homework.title}
                  <span className={styles.workWho}>
                    {[picked.student.user.formalName, t('grading.attempt', { n: picked.attempt })]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </h2>
                <p className={styles.workMeta}>
                  {picked.status === 'LATE' ? t('grading.late') : waitLabel(picked.submittedAt)}
                </p>
              </div>

              <div className={styles.workBody}>
                {picked.contentText ? (
                  <p className={styles.answer}>{picked.contentText}</p>
                ) : (
                  /* Работа без текста — это вложение; сказать это прямо честнее, чем пустой
                     прямоугольник, который читается как «ученик ничего не прислал». */
                  <p className={styles.empty}>{t('grading.noText')}</p>
                )}
              </div>

              <div className={styles.grade}>
                <div className={styles.gradeRow}>
                  <span className={styles.gradeLabel}>{t('grading.mark')}</span>
                  {/* 🔴 Безотметочному ученику отметок не ставят — ФГОС НОО и ФЗ-273.
                      Слова при этом остаются: они не отметка. */}
                  {!picked.markless &&
                    [1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={styles.mark}
                        aria-pressed={score === n}
                        onClick={() => setScore(n)}
                      >
                        {n}
                      </button>
                    ))}
                  <span className={styles.gradeNote}>
                    {picked.markless ? t('grading.marklessNote') : t('grading.markNote')}
                  </span>
                </div>
                <div className={styles.send}>
                  <div className={styles.comment}>
                    <Input
                      placeholder={t('grading.commentPh')}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      aria-label={t('grading.commentPh')}
                    />
                  </div>
                  <Button
                    variant="primary"
                    loading={sending}
                    onClick={() => void sendAndTakeNext()}
                  >
                    {t('grading.sendNext')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
