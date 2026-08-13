import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type SubjectTasksQuery, useSubjectTasksQuery } from '@/entities/graphql/generated';
import { Button, ErrorState } from '@/shared/ui';

import styles from './subject.module.css';
import { whenParts } from './subjectFormat';

type Task = SubjectTasksQuery['subjectTasks'][number];

/**
 * «Задания» — for a teacher, «На проверке» (atlas sheet 01).
 *
 * A retake shows the NEW mark, which is the owner's decision: an old grade should not keep
 * stinging. Nothing is lost by that — the row says how many attempts there were, and the
 * teacher's journal holds every one of them.
 *
 * The teacher's side is counts: how many handed in, how many wait, how many retook. Which
 * child is behind is a conversation, not a column.
 */
export function TasksPanel({
  courseId,
  isTeacher,
  teacherName,
  scale = 'PERCENT',
}: {
  courseId: string;
  isTeacher: boolean;
  teacherName: string | null;
  /** The course's own scale — display only (owner decision 2026-08-13). */
  scale?: 'FIVE_POINT' | 'PERCENT';
}) {
  const { t } = useTranslation('subject');
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useSubjectTasksQuery({ variables: { courseId } });
  const rows = data?.subjectTasks ?? [];
  const now = new Date();

  if (loading && !data) return <PanelSkeleton />;
  if (error && !data) return <ErrorState text={t('error')} onRetry={() => void refetch()} />;
  if (rows.length === 0) {
    return <p className={styles.empty}>{t(isTeacher ? 'tasks.emptyTeacher' : 'tasks.empty')}</p>;
  }

  return (
    <div>
      {rows.map((task) =>
        isTeacher ? (
          <TeacherRow key={task.id} task={task} onOpen={() => navigate('/grading')} />
        ) : (
          <LearnerRow
            key={task.id}
            task={task}
            now={now}
            teacherName={teacherName}
            scale={scale}
            onOpen={() =>
              navigate(task.lessonId ? `/lessons/${task.lessonId}/homework` : '/homework')
            }
          />
        ),
      )}
    </div>
  );
}

function LearnerRow({
  task,
  now,
  teacherName,
  scale,
  onOpen,
}: {
  task: Task;
  now: Date;
  teacherName: string | null;
  scale: 'FIVE_POINT' | 'PERCENT';
  onOpen: () => void;
}) {
  const { t } = useTranslation('subject');
  const graded = task.state === 'GRADED';

  /** The one line under the title: when it is due, or when it was handed in. */
  function status(): string {
    if (task.submittedAt) {
      const parts = whenParts(task.submittedAt, now);
      return t('tasks.submittedAt', {
        when:
          parts.bucket === 'date'
            ? parts.date
            : t(`when.${parts.bucket}`, { time: parts.time, date: parts.date }),
      });
    }
    if (task.state === 'OVERDUE') return t('tasks.overdue');
    if (!task.dueAt) return '';
    const parts = whenParts(task.dueAt, now);
    if (parts.bucket === 'today') return t('tasks.dueToday', { time: parts.time });
    if (parts.bucket === 'tomorrow') return t('tasks.dueTomorrow', { time: parts.time });
    return t('tasks.dueAt', { when: `${parts.date}, ${parts.time}` });
  }

  return (
    <div className={styles.task}>
      <div>
        <span className={styles.taskName}>{task.title}</span>
        <span className={styles.taskSub}>
          {[task.lessonLabel && t('tasks.lesson', { n: task.lessonLabel }), status()]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {/* The teacher's words sit with the work they are about, not in a notifications pile. */}
        {task.comment && (
          <p className={styles.taskFb}>
            {teacherName && <b>{t('tasks.feedback', { teacher: teacherName })} </b>}
            {task.comment}
          </p>
        )}
      </div>
      <div className={styles.taskRight}>
        {graded && task.score != null && (
          <span className={styles.taskScore}>
            {t(scale === 'PERCENT' ? 'tasks.scorePercent' : 'tasks.scoreFive', {
              value: task.score,
            })}
          </span>
        )}
        {task.attempts > 1 && (
          <span className={styles.taskMeta}>{t('tasks.attempts', { count: task.attempts })}</span>
        )}
        {task.redoOpen ? (
          <>
            <Button size="sm" variant="secondary" onClick={onOpen}>
              {t('tasks.redo')}
            </Button>
            <span className={styles.taskMeta}>{t('tasks.redoHint')}</span>
          </>
        ) : (
          !graded && (
            <Button size="sm" onClick={onOpen}>
              {t('tasks.open')}
            </Button>
          )
        )}
        {task.state === 'SUBMITTED' && (
          <span className={styles.taskMeta}>{t('tasks.waiting')}</span>
        )}
      </div>
    </div>
  );
}

function TeacherRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { t } = useTranslation('subject');
  const waiting = task.waitingCount ?? 0;
  const total = task.groupSize ?? 0;

  return (
    <div className={styles.task}>
      <div>
        <span className={styles.taskName}>{task.title}</span>
        <span className={styles.taskSub}>
          {[
            task.lessonLabel && t('tasks.lesson', { n: task.lessonLabel }),
            waiting > 0
              ? t('tasks.teacher.handedIn', { done: task.submittedBy ?? 0, total })
              : t('tasks.teacher.checked', { done: task.gradedCount ?? 0, total }),
            (task.staleCount ?? 0) > 0 && t('tasks.teacher.stale', { count: task.staleCount ?? 0 }),
            (task.retakeCount ?? 0) > 0 &&
              t('tasks.teacher.retakes', { count: task.retakeCount ?? 0 }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {/* Every attempt is kept; the journal is where the teacher raises the history. */}
        {(task.retakeCount ?? 0) > 0 && (
          <span className={styles.taskMeta}>{t('tasks.teacher.history')}</span>
        )}
      </div>
      <div className={styles.taskRight}>
        {waiting > 0 ? (
          <>
            <span className={`${styles.chip} ${styles.chipLive}`}>{t('tasks.teacher.queue')}</span>
            <Button size="sm" onClick={onOpen}>
              {t('tasks.teacher.check')}
            </Button>
          </>
        ) : (
          <span className={styles.taskMeta}>{t('tasks.teacher.closed')}</span>
        )}
      </div>
    </div>
  );
}

export function PanelSkeleton() {
  const { t } = useTranslation('common');
  return (
    <div aria-busy="true" aria-label={t('actions.loading')}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${styles.sk} ${styles.skLine}`} style={{ height: 48 }} />
      ))}
    </div>
  );
}
