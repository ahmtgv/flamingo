import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type SubjectCabinetQuery,
  useCreateLessonMutation,
  useDeleteLessonMutation,
  useReorderLessonsMutation,
  useUpdateLessonMutation,
} from '@/entities/graphql/generated';
import { Button } from '@/shared/ui';
import { ICON_SM } from '@/shared/ui/iconSizes';

import styles from './subject.module.css';

type Cabinet = SubjectCabinetQuery['subjectCabinet'];
type Section = Cabinet['sections'][number];
type Lesson = Section['lessons'][number];

interface Draft {
  title: string;
  description: string;
  durationMin: number;
  device: boolean;
  deviceKey: string;
}

const EMPTY: Draft = { title: '', description: '', durationMin: 45, device: false, deviceKey: '' };

const draftOf = (lesson: Lesson): Draft => ({
  title: lesson.title,
  description: lesson.subtitle ?? '',
  durationMin: 45,
  device: lesson.kind === 'EXTERNAL_DEVICE',
  deviceKey: lesson.deviceKey ?? '',
});

/**
 * The teacher's programme edit mode (atlas sheet 01, owner answer 3): edit a lesson, add a
 * lesson, change the order — right here, without leaving the subject.
 *
 * Every one of these is a server-side decision. The button is hidden for anyone but the
 * owning teacher, but that is cosmetics: `_owned_lesson` / `_owned_section` refuse a
 * stranger regardless of what the client sends, and a test proves it.
 */
export function ProgrammeEditor({
  section,
  onChanged,
}: {
  section: Section;
  onChanged: () => Promise<unknown>;
}) {
  const { t } = useTranslation('subject');
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);

  const [updateLesson, { loading: saving }] = useUpdateLessonMutation();
  const [createLesson, { loading: creating }] = useCreateLessonMutation();
  const [deleteLesson] = useDeleteLessonMutation();
  const [reorderLessons, { loading: moving }] = useReorderLessonsMutation();

  const busy = saving || creating || moving;

  async function run(action: () => Promise<unknown>) {
    setFailed(false);
    try {
      await action();
      await onChanged();
    } catch {
      // The server refused (or the network did). Say so instead of pretending it worked.
      setFailed(true);
    }
  }

  const input = (draft: Draft) => ({
    title: draft.title,
    description: draft.description,
    durationMin: draft.durationMin,
    kind: draft.device ? ('EXTERNAL_DEVICE' as const) : ('STANDARD' as const),
    deviceKey: draft.device ? draft.deviceKey : '',
  });

  /** Move a lesson one place; the server renumbers, we just send the new order. */
  async function move(index: number, by: -1 | 1) {
    const ids = section.lessons.map((l) => l.id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => reorderLessons({ variables: { sectionId: section.id, orderedIds: ids } }));
  }

  return (
    <div className={styles.editWrap}>
      {failed && (
        <p className={styles.editError} role="alert">
          {t('edit.failed')}
        </p>
      )}

      {section.lessons.map((lesson, index) =>
        editing === lesson.id ? (
          <LessonForm
            key={lesson.id}
            initial={draftOf(lesson)}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
              await run(() => updateLesson({ variables: { id: lesson.id, input: input(draft) } }));
              setEditing(null);
            }}
          />
        ) : (
          <div className={styles.editRow} key={lesson.id}>
            <span className={styles.editOrder}>{lesson.orderLabel}</span>
            <span>
              <span className={styles.lesName}>{lesson.title}</span>
              {lesson.kind === 'EXTERNAL_DEVICE' && (
                <span className={styles.lesSub}>{t('lessons.chip.device')}</span>
              )}
            </span>
            <span className={styles.editActs}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={t('edit.up')}
                disabled={index === 0 || busy}
                onClick={() => void move(index, -1)}
              >
                <ChevronUp size={ICON_SM} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={t('edit.down')}
                disabled={index === section.lessons.length - 1 || busy}
                onClick={() => void move(index, 1)}
              >
                <ChevronDown size={ICON_SM} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={t('edit.editLesson')}
                onClick={() => setEditing(lesson.id)}
              >
                <Pencil size={ICON_SM} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={t('edit.remove')}
                onClick={() => {
                  // Deleting a lesson takes its materials and homework out of a learner's
                  // programme, so it asks first.
                  if (window.confirm(t('edit.confirmRemove', { title: lesson.title }))) {
                    void run(() => deleteLesson({ variables: { id: lesson.id } }));
                  }
                }}
              >
                <Trash2 size={ICON_SM} />
              </button>
            </span>
          </div>
        ),
      )}

      {adding ? (
        <LessonForm
          initial={EMPTY}
          busy={busy}
          onCancel={() => setAdding(false)}
          onSave={async (draft) => {
            await run(() =>
              createLesson({ variables: { sectionId: section.id, input: input(draft) } }),
            );
            setAdding(false);
          }}
        />
      ) : (
        <button type="button" className={styles.addLesson} onClick={() => setAdding(true)}>
          {t('edit.add')}
        </button>
      )}
    </div>
  );
}

function LessonForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: Draft;
  busy: boolean;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('subject');
  const [draft, setDraft] = useState<Draft>(initial);

  return (
    <form
      className={styles.editForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.title.trim()) onSave(draft);
      }}
    >
      <label className={styles.editField}>
        <span className={styles.editLabel}>{t('edit.title')}</span>
        <input
          className={styles.editInput}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          required
          autoFocus
        />
      </label>
      <label className={styles.editField}>
        <span className={styles.editLabel}>{t('edit.description')}</span>
        <input
          className={styles.editInput}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </label>
      <label className={styles.editCheck}>
        <input
          type="checkbox"
          checked={draft.device}
          onChange={(e) => setDraft({ ...draft, device: e.target.checked })}
        />
        <span>
          {t('edit.device')}
          <span className={styles.editHint}>{t('edit.deviceHint')}</span>
        </span>
      </label>
      {draft.device && (
        <label className={styles.editField}>
          <span className={styles.editLabel}>{t('edit.deviceKey')}</span>
          <input
            className={styles.editInput}
            value={draft.deviceKey}
            onChange={(e) => setDraft({ ...draft, deviceKey: e.target.value })}
          />
        </label>
      )}
      <div className={styles.editFormActs}>
        <Button size="sm" type="submit" loading={busy}>
          {t('edit.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('edit.cancel')}
        </Button>
      </div>
    </form>
  );
}
