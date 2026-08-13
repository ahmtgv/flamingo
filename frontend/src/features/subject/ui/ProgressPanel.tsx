import { useTranslation } from 'react-i18next';

import { type SubjectProgressQuery, useSubjectProgressQuery } from '@/entities/graphql/generated';
import { ErrorState } from '@/shared/ui';

import styles from './subject.module.css';
import { PanelSkeleton } from './TasksPanel';

type Topic = SubjectProgressQuery['subjectProgress']['topics'][number];

/**
 * «Прогресс» — for a teacher, «Усвоение темы» (atlas sheet 01).
 *
 * Mastery per topic, never one blended percentage: a single number tells you nothing about
 * what to do next. A learner is compared only with their own past week — there is no cohort
 * ranking on this screen and no way to ask for one.
 *
 * A weak topic is drawn in grey, not red. It is a place to go back to, not a verdict.
 */
export function ProgressPanel({ courseId, isTeacher }: { courseId: string; isTeacher: boolean }) {
  const { t } = useTranslation('subject');
  const { data, loading, error, refetch } = useSubjectProgressQuery({ variables: { courseId } });
  const progress = data?.subjectProgress;

  if (loading && !data) return <PanelSkeleton />;
  if (error && !data) return <ErrorState text={t('error')} onRetry={() => void refetch()} />;
  if (!progress || progress.topics.length === 0) {
    return <p className={styles.empty}>{t('progress.empty')}</p>;
  }

  const weakBelow = progress.weakBelowPct;
  const was = progress.previousOverallPct;
  const now = progress.overallPct;
  const delta = was != null && now != null ? now - was : null;

  return (
    <div>
      {progress.topics.map((topic) => (
        <Row key={topic.id} topic={topic} isTeacher={isTeacher} weakBelow={weakBelow} />
      ))}

      {/* The footer is the promise, spelled out where it is easy to check. */}
      {isTeacher ? (
        <p className={styles.selfNote}>{t('progress.teacherNote')}</p>
      ) : (
        <p className={styles.selfNote}>
          {delta != null &&
            was != null &&
            `${
              delta > 0
                ? t('progress.selfGrew', { was, delta })
                : delta < 0
                  ? t('progress.selfFell', { was, delta: Math.abs(delta) })
                  : t('progress.selfSame')
            } · `}
          {t('progress.selfNote')}
        </p>
      )}
    </div>
  );
}

function Row({
  topic,
  isTeacher,
  weakBelow,
}: {
  topic: Topic;
  isTeacher: boolean;
  weakBelow: number;
}) {
  const { t } = useTranslation('subject');
  const weak = topic.pct != null && topic.pct < weakBelow;

  /** The quiet line under the topic: where it sits, or how the group took it. */
  function note(): string {
    if (topic.isCurrent) return t('progress.current');
    if (topic.pct == null) return t('progress.ahead');
    if (isTeacher) {
      return (topic.weakCount ?? 0) > 0
        ? t('progress.weak', { count: topic.weakCount ?? 0 })
        : t('progress.confident');
    }
    return topic.lessonFrom && topic.lessonTo && topic.lessonFrom !== topic.lessonTo
      ? t('progress.lessons', { from: topic.lessonFrom, to: topic.lessonTo })
      : t('progress.lesson', { n: topic.lessonFrom ?? '' });
  }

  return (
    <div className={styles.topic}>
      <div>
        <span className={styles.tName}>{topic.title}</span>
        <span className={styles.tSub}>{note()}</span>
      </div>
      <div
        className={styles.tBar}
        // Grey, not red: a topic that has not landed yet is not a failure.
        data-weak={weak || undefined}
        role="progressbar"
        aria-valuenow={topic.pct ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progress.mastery', { topic: topic.title })}
      >
        <i style={{ width: `${topic.pct ?? 0}%` }} />
      </div>
      <span className={styles.tVal}>
        {topic.pct == null ? t('progress.noMark') : `${topic.pct}%`}
      </span>
    </div>
  );
}
