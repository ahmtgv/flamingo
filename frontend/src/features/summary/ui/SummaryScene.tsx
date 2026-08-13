import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type LessonSummaryQuery,
  type SummarySection,
  useAssembleLessonSummaryMutation,
  useLessonSummaryQuery,
  useRemoveSummaryItemMutation,
  useSendLessonSummaryMutation,
  useUpdateSummaryItemMutation,
} from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';

import styles from './summary.module.css';

type Summary = NonNullable<LessonSummaryQuery['lessonSummary']>;
type Item = Summary['items'][number];

/** The order of sheet 02, and it is the order of the lesson: what it was about, the words it
 *  left behind, what to watch for, what was said in the chat, what was set. */
const SECTIONS: SummarySection[] = ['TOPIC', 'WORDS', 'WATCH', 'CHAT', 'HOMEWORK'];

/**
 * The «саммари» scene of atlas sheet 02.
 *
 * The summary is what a lesson leaves behind now that nothing is recorded, so the screen says
 * that out loud rather than leaving it to be inferred: speech is processed on the fly, audio
 * and video are not kept, and the summary itself stays with the teacher AND the participants.
 *
 * A learner reaching a lesson whose summary has not been sent gets nothing at all — not an
 * error, not «нет доступа». Whether the teacher has started writing is not their business.
 */
export function SummaryScene({ sessionId, isTeacher }: { sessionId: string; isTeacher: boolean }) {
  const { t } = useTranslation('summary');
  const { data, loading, error, refetch } = useLessonSummaryQuery({ variables: { sessionId } });
  const [assemble, { loading: assembling }] = useAssembleLessonSummaryMutation();
  const [send, { loading: sending }] = useSendLessonSummaryMutation();
  const [failed, setFailed] = useState(false);

  const summary = data?.lessonSummary ?? null;

  async function run(action: () => Promise<unknown>) {
    setFailed(false);
    try {
      await action();
      await refetch();
    } catch {
      setFailed(true);
    }
  }

  if (loading && !data) return <p className={styles.hint}>…</p>;
  if (error && !data) {
    return (
      <p className={styles.hint} role="status">
        {t('error')}
      </p>
    );
  }

  if (!summary) {
    return (
      <div className={styles.paper}>
        <p className={styles.hint}>{isTeacher ? t('empty.teacher') : t('empty.learner')}</p>
        {isTeacher && (
          <div>
            <Button
              size="sm"
              loading={assembling}
              onClick={() => void run(() => assemble({ variables: { sessionId } }))}
            >
              {t('assemble')}
            </Button>
          </div>
        )}
        {failed && (
          <p className={styles.failed} role="alert">
            {t('failed')}
          </p>
        )}
      </div>
    );
  }

  const isDraft = summary.status === 'DRAFT';

  return (
    <div className={styles.paper}>
      <header className={styles.head}>
        <p className={styles.title}>{t('title')}</p>
        <span className={isDraft ? styles.draft : styles.sent}>
          {isDraft ? t('badge.draft') : t('badge.sent')}
        </span>
        {summary.canEdit && (
          <span className={styles.acts}>
            <Button
              size="sm"
              variant="ghost"
              loading={assembling}
              onClick={() => void run(() => assemble({ variables: { sessionId } }))}
            >
              {t('reassemble')}
            </Button>
            <Button
              size="sm"
              loading={sending}
              onClick={() => void run(() => send({ variables: { sessionId } }))}
            >
              {t('send')}
            </Button>
          </span>
        )}
      </header>

      {/* The storage promise, in the words the sheet uses. */}
      <p className={styles.meta}>{t('promise')}</p>
      <p className={styles.lead}>{isTeacher ? t('lead.teacher') : t('lead.learner')}</p>

      {summary.speechOmitted && <p className={styles.omitted}>{t('speechOmitted')}</p>}

      {SECTIONS.map((section) => {
        const rows = summary.items.filter((i) => i.section === section);
        if (rows.length === 0) return null;
        return (
          <section key={section} aria-labelledby={`sum-${section}`}>
            <h4 className={styles.section} id={`sum-${section}`}>
              {t(`section.${section}`)}
            </h4>
            {rows.map((item) => (
              <SummaryLine
                key={item.id}
                item={item}
                editable={summary.canEdit}
                onChanged={() => void refetch()}
              />
            ))}
          </section>
        );
      })}

      {failed && (
        <p className={styles.failed} role="alert">
          {t('failed')}
        </p>
      )}
    </div>
  );
}

/** One line: the stamp on the left, the text and its provenance on the right. */
function SummaryLine({
  item,
  editable,
  onChanged,
}: {
  item: Item;
  editable: boolean;
  onChanged: () => void;
}) {
  const { t } = useTranslation('summary');
  const [draft, setDraft] = useState<string | null>(null);
  const [update, { loading: saving }] = useUpdateSummaryItemMutation();
  const [remove] = useRemoveSummaryItemMutation();

  return (
    <div className={styles.item}>
      <span className={styles.stamp}>{stampOf(item, t)}</span>
      <span>
        {draft === null ? (
          <span className={styles.text}>{item.text}</span>
        ) : (
          <span className={styles.editRow}>
            <textarea
              className={styles.input}
              value={draft}
              rows={2}
              aria-label={t('edit.label')}
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className={styles.itemActs}>
              <Button
                size="sm"
                loading={saving}
                onClick={async () => {
                  await update({ variables: { itemId: item.id, text: draft } });
                  setDraft(null);
                  onChanged();
                }}
              >
                {t('edit.save')}
              </Button>
              <button type="button" className={styles.linkBtn} onClick={() => setDraft(null)}>
                {t('edit.cancel')}
              </button>
            </span>
          </span>
        )}
        <span className={styles.sub}>{sourceLine(item, t)}</span>
        {editable && draft === null && (
          <span className={styles.itemActs}>
            <button type="button" className={styles.linkBtn} onClick={() => setDraft(item.text)}>
              {t('edit.start')}
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={async () => {
                await remove({ variables: { itemId: item.id } });
                onChanged();
              }}
            >
              {t('edit.remove')}
            </button>
          </span>
        )}
      </span>
    </div>
  );
}

type Translate = (key: string, vars?: Record<string, unknown>) => string;

/** The left column: a moment, a count, or a due date — whichever the item actually is. */
function stampOf(item: Item, t: Translate): string {
  if (item.section === 'WORDS') {
    const count = Number((item.sourceMeta as { count?: number })?.count ?? 0);
    return count ? t('stamp.words', { count }) : t('stamp.wordsPlain');
  }
  if (item.section === 'WATCH') return t('stamp.watch');
  if (item.section === 'HOMEWORK') {
    return item.dueAt ? t('stamp.due', { date: shortDate(item.dueAt) }) : t('stamp.homework');
  }
  if (item.atOffsetSec == null) return '';
  return clock(item.atOffsetSec);
}

/**
 * The caption under every line — composed here, from `source` + `sourceMeta`.
 *
 * This is why the server ships data and not a sentence: «с доски · 4 объекта · Петя» is
 * Russian, it declines with the count, and the same item has to read in whatever locale the
 * person is in.
 *
 * Two sections say where the line is GOING rather than where it came from, and the sheet is
 * right that this is the more useful fact: new words go into the repetition queue, and
 * homework goes into «Задания».
 */
function sourceLine(item: Item, t: Translate): string {
  const meta = (item.sourceMeta ?? {}) as Record<string, unknown>;
  if (item.section === 'WORDS') return t('source.words');
  if (item.section === 'HOMEWORK') {
    return item.homeworkId ? t('source.homeworkDone') : t('source.homeworkPending');
  }
  switch (item.source) {
    case 'BOARD':
      return t('source.board', {
        count: Number(meta.elements ?? 0),
        name: String(meta.authorName ?? ''),
      });
    case 'SPEECH':
      return t('source.speech');
    case 'TEST':
      return t('source.test', {
        answered: Number(meta.answered ?? 0),
        correct: Number(meta.correct ?? 0),
        total: Number(meta.groupSize ?? 0),
      });
    case 'MATERIAL':
      return t('source.material');
    case 'CHAT':
      return item.authorName ? t('source.chatBy', { name: item.authorName }) : t('source.chat');
    case 'TEACHER':
      return t('source.teacher');
    case 'PLAN':
    default:
      return t('source.plan');
  }
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(iso));
}
