import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type AttemptContext,
  type ExerciseLivePictureQuery,
  type LessonExerciseSetsQuery,
  useAnswerExerciseMutation,
  useExerciseLivePictureQuery,
  useHandInExerciseSetMutation,
  useLessonExerciseSetsQuery,
  useMyExerciseAttemptsQuery,
} from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';

import styles from './test.module.css';

type Set = LessonExerciseSetsQuery['lessonExerciseSets'][number];
type Exercise = Set['exercises'][number];
type LiveRow = ExerciseLivePictureQuery['exerciseLivePicture'][number];

/** The kinds a machine marks; the rest wait for the teacher (spec §3). */
const AUTO_CHECKED = new Set([
  'VOCAB_CARD',
  'CLOZE',
  'CHOICE',
  'WORD_ORDER',
  'MATCH',
  'LISTENING',
  'DICTATION',
  'PRONUNCIATION',
  'TRANSFORM',
]);

/**
 * The «тест» scene of atlas sheet 02.
 *
 * A learner answers; a teacher watches an aggregate. Those are two different screens over the
 * same set, and the difference is the point: the class picture says how many got it right and
 * which option they drifted to, never who. A teacher needs to know whether to re-explain, not
 * who to look at.
 */
export function TestScene({ lessonId, isTeacher }: { lessonId: string; isTeacher: boolean }) {
  const { t } = useTranslation('exercises');
  const { data, loading, error } = useLessonExerciseSetsQuery({ variables: { lessonId } });
  const sets = data?.lessonExerciseSets ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = sets.find((s) => s.id === activeId) ?? sets[0] ?? null;

  if (loading && !data) return <p className={styles.hint}>…</p>;
  if (error && !data) {
    return (
      <p className={styles.hint} role="status">
        {t('error')}
      </p>
    );
  }
  if (!active) return <p className={styles.hint}>{t('empty')}</p>;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <p className={styles.title}>{active.title}</p>
          <p className={styles.sub}>
            {t(`sub.${active.mode}`, { count: active.exercises.length })}
          </p>
        </div>
        {sets.length > 1 && (
          <div className={styles.setTabs} role="tablist" aria-label={t('title')}>
            {sets.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === active.id}
                className={styles.setTab}
                onClick={() => setActiveId(s.id)}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Mode and context mirror each other: a LIVE set answered in class is a LIVE attempt,
          and LIVE does not grade by itself (§7.4). */}
      {isTeacher ? (
        <TeacherPicture set={active} />
      ) : (
        <LearnerRun set={active} context={active.mode as AttemptContext} />
      )}
    </div>
  );
}

/** The learner's run through the set. */
function LearnerRun({ set, context }: { set: Set; context: AttemptContext }) {
  const { t } = useTranslation('exercises');
  const [answer, { loading: sending }] = useAnswerExerciseMutation();
  const [handIn, { data: handedIn }] = useHandInExerciseSetMutation();
  const { data: attemptsData, refetch } = useMyExerciseAttemptsQuery({
    variables: { setId: set.id },
  });
  const [failed, setFailed] = useState(false);

  // The latest attempt per exercise — the sheet says an answer can be changed until the end,
  // so what is shown is the last one, and every earlier one is still in the database.
  const latest = new Map<string, { isCorrect?: boolean | null }>();
  for (const a of attemptsData?.myAttempts ?? []) latest.set(a.exerciseId, a);
  const answered = set.exercises.filter((e) => latest.has(e.id)).length;

  async function send(exercise: Exercise, response: Record<string, unknown>) {
    setFailed(false);
    try {
      await answer({ variables: { exerciseId: exercise.id, response, context } });
      await refetch();
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <p className={styles.progress}>
        {t('answered', { done: answered, total: set.exercises.length })} · {t('changeable')}
      </p>

      {set.exercises.map((exercise, i) => (
        <QuestionCard
          key={exercise.id}
          exercise={exercise}
          index={i}
          total={set.exercises.length}
          verdict={latest.get(exercise.id)?.isCorrect ?? undefined}
          busy={sending}
          onAnswer={(response) => void send(exercise, response)}
        />
      ))}

      {failed && (
        <p className={styles.failed} role="alert">
          {t('failed')}
        </p>
      )}

      {set.mode === 'HOMEWORK' &&
        (handedIn ? (
          <p className={styles.done} role="status">
            {t('handedIn', {
              auto: handedIn.handInExerciseSet.autoChecked,
              pending: handedIn.handInExerciseSet.awaitingTeacher,
            })}
          </p>
        ) : (
          <Button
            size="sm"
            onClick={() =>
              void handIn({ variables: { setId: set.id } }).catch(() => setFailed(true))
            }
          >
            {t('handIn')}
          </Button>
        ))}
    </>
  );
}

function QuestionCard({
  exercise,
  index,
  total,
  verdict,
  busy,
  onAnswer,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  verdict?: boolean | null;
  busy: boolean;
  onAnswer: (response: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation('exercises');
  const [text, setText] = useState('');
  const prompt = (exercise.prompt ?? {}) as { text?: string };
  const payload = (exercise.payload ?? {}) as { options?: string[] };
  const auto = AUTO_CHECKED.has(exercise.kind);

  return (
    <section className={styles.card} aria-label={t('question', { n: index + 1, total })}>
      <p className={styles.qHead}>
        {t('question', { n: index + 1, total })} · {t(`kind.${exercise.kind}`)}
      </p>
      <p className={styles.qText}>{prompt.text}</p>

      {payload.options ? (
        <div className={styles.options}>
          {payload.options.map((option, i) => (
            <button
              key={option}
              type="button"
              className={styles.option}
              disabled={busy}
              onClick={() => onAnswer({ choice: i })}
            >
              <span className={styles.optionKey}>{String.fromCharCode(65 + i)}</span>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <form
          className={styles.answerRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onAnswer({ text });
          }}
        >
          <input
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('typeHere')}
            aria-label={t('typeHere')}
          />
          <Button size="sm" type="submit" loading={busy}>
            {t('send')}
          </Button>
        </form>
      )}

      <p className={styles.qFoot}>
        {auto ? t('checkedHere') : t('waitsTeacher')}
        {/* The privacy line the sheet puts on these two, in the learner's own words. */}
        {exercise.kind === 'LISTENING' && ` · ${t('onDevice')}`}
        {exercise.kind === 'PRONUNCIATION' && ` · ${t('speechOnDevice')}`}
      </p>
      {verdict !== undefined && verdict !== null && (
        <p className={styles.verdict} data-correct={verdict || undefined} role="status">
          {verdict ? '✓' : '×'}
        </p>
      )}
    </section>
  );
}

/** The teacher's live picture: counts and a spread, and it says so out loud. */
function TeacherPicture({ set }: { set: Set }) {
  const { t } = useTranslation('exercises');
  const { data } = useExerciseLivePictureQuery({
    variables: { setId: set.id },
    pollInterval: 5_000,
  });
  const rows = new Map<string, LiveRow>();
  for (const row of data?.exerciseLivePicture ?? []) rows.set(row.exerciseId, row);

  return (
    <>
      <p className={styles.progress}>
        {t('teacher.picture')} · {t('teacher.aggregate')}
      </p>

      {set.exercises.map((exercise, i) => {
        const row = rows.get(exercise.id);
        const spread = (row?.spread ?? {}) as Record<string, number>;
        const options = ((exercise.payload ?? {}) as { options?: string[] }).options ?? [];
        return (
          <section
            key={exercise.id}
            className={styles.card}
            aria-label={t('question', { n: i + 1, total: set.exercises.length })}
          >
            <p className={styles.qHead}>
              {t('question', { n: i + 1, total: set.exercises.length })}
            </p>
            <p className={styles.qText}>{((exercise.prompt ?? {}) as { text?: string }).text}</p>
            <p className={styles.qFoot}>
              {row
                ? `${t('teacher.answeredOf', { done: row.answered, total: row.groupSize })} · ${t(
                    'teacher.correctOf',
                    { n: row.correct },
                  )}`
                : t('teacher.noAnswers')}
            </p>
            {options.length > 0 && (
              <div className={styles.hist}>
                {options.map((option, index) => {
                  const count = spread[String(index)] ?? 0;
                  const width = row?.answered ? Math.round((100 * count) / row.answered) : 0;
                  return (
                    <div className={styles.histRow} key={option}>
                      <span className={styles.optionKey}>{String.fromCharCode(65 + index)}</span>
                      <span className={styles.histLabel}>{option}</span>
                      <span
                        className={styles.histBar}
                        role="img"
                        aria-label={t('teacher.spread', { option: option, count })}
                      >
                        <i style={{ width: `${width}%` }} />
                      </span>
                      <span className={styles.histCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <ClassworkNote set={set} />
    </>
  );
}

/**
 * «Зачесть как работу на уроке» — and, when it cannot be done, WHY.
 *
 * Counting classwork writes a row in the journal, so the set needs a homework to write it
 * against. Leaving the teacher to discover that from a button that does nothing is the kind
 * of small cruelty that makes people distrust a tool.
 */
function ClassworkNote({ set }: { set: Set }) {
  const { t } = useTranslation('exercises');
  if (set.mode !== 'LIVE') return null;
  if (!set.homeworkId) return <p className={styles.note}>{t('teacher.needsHomework')}</p>;
  return <p className={styles.hint}>{t('teacher.countAsClasswork')}</p>;
}
