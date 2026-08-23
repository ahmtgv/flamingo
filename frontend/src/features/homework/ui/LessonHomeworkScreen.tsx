import { ICON_SM } from '@/shared/ui/iconSizes';
import { ArrowLeft, CheckCircle2, ClipboardList, Paperclip, Plus, Send, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  type SubmissionStatus,
  useCreateHomeworkMutation,
  useDeleteHomeworkMutation,
  useGradeSubmissionMutation,
  useHomeworkSubmissionsQuery,
  useLessonHomeworkQuery,
  useMeQuery,
  usePublishHomeworkMutation,
  useSubmitHomeworkMutation,
  useUploadPolicyQuery,
} from '@/entities/graphql/generated';
import { useUpload } from '@/shared/lib/useUpload';
import { failureText } from '@/shared/lib/requestFailure';
import { acceptAttribute, formatBytes, kindKeys, refuse } from '@/shared/lib/uploadLimits';
import { Badge, type BadgeTone, Button, Checkbox, ErrorState, Input, TextArea, TextField } from '@/shared/ui';

import { HomeworkLayout } from './HomeworkLayout';
import styles from './homework.module.css';
import { HOME_ROUTE } from '@/shared/lib/homeRoute';

const STATUS_TONE: Record<SubmissionStatus, BadgeTone> = {
  // Сдано — ещё не решено: работа ждёт преподавателя, требования к ученику нет.
  SUBMITTED: 'neutral',
  // Опоздание горит: это то, что ученику надо знать про себя.
  LATE: 'now',
  // Оценена — решено, можно дальше.
  GRADED: 'done',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type HomeworkRow = NonNullable<
  ReturnType<typeof useLessonHomeworkQuery>['data']
>['lessonHomework'][number];

export function LessonHomeworkScreen() {
  const { lessonId = '' } = useParams();
  const { t } = useTranslation(['homework', 'common']);
  const navigate = useNavigate();
  const { data: meData } = useMeQuery();
  const { data, loading, error, refetch } = useLessonHomeworkQuery({
    variables: { lessonId },
    skip: !lessonId,
  });

  if (!lessonId) return <Navigate to={HOME_ROUTE} replace />;

  const isTeacher = meData?.me?.role === 'TEACHER';
  const items = data?.lessonHomework ?? [];
  const reload = () => refetch();

  return (
    <HomeworkLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          <ArrowLeft size={ICON_SM} /> {t('back')}
        </button>
        <h1 className={styles.pageTitle}>{t('lesson.title')}</h1>
        <p className={styles.pageSub}>{isTeacher ? t('lesson.subtitleTeacher') : t('lesson.subtitle')}</p>

        {isTeacher && <CreateHomeworkForm lessonId={lessonId} onDone={reload} />}

        {error && items.length === 0 ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <p className={styles.empty}>
            {loading ? t('common:actions.loading') : isTeacher ? t('lesson.emptyTeacher') : t('lesson.empty')}
          </p>
        ) : (
          items.map((hw) =>
            isTeacher ? (
              <TeacherHomeworkCard key={hw.id} hw={hw} onDone={reload} />
            ) : (
              <StudentHomeworkCard key={hw.id} hw={hw} onDone={reload} />
            ),
          )
        )}
      </div>
    </HomeworkLayout>
  );
}

function CreateHomeworkForm({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const { t } = useTranslation('homework');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [allowRedo, setAllowRedo] = useState(false);
  const [createHomework, { loading }] = useCreateHomeworkMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createHomework({
      variables: {
        input: {
          lessonId,
          title,
          type: 'TEXT',
          dueAt: due ? new Date(due).toISOString() : null,
          allowRedo,
        },
      },
    });
    setTitle('');
    setDue('');
    setAllowRedo(false);
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formRow}>
        <TextField
          label={t('create.name')}
          placeholder={t('create.namePh')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className={styles.muted} htmlFor="hw-due">
            {t('create.due')}
          </label>
          <Input
            id="hw-due"
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
      </div>
      <Checkbox checked={allowRedo} onChange={(e) => setAllowRedo(e.target.checked)}>
        {t('create.allowRedo')}
      </Checkbox>
      <div className={styles.actionsRow}>
        <Button type="submit" variant="primary" icon={<Plus size={ICON_SM} />} loading={loading}>
          {t('create.submit')}
        </Button>
      </div>
    </form>
  );
}

function TeacherHomeworkCard({ hw, onDone }: { hw: HomeworkRow; onDone: () => void }) {
  const { t } = useTranslation('homework');
  const [grading, setGrading] = useState(false);
  const [publishHomework, { loading: publishing }] = usePublishHomeworkMutation();
  const [deleteHomework, { loading: deleting }] = useDeleteHomeworkMutation();
  // 🔴 Аудит 16.08: выдача, снятие и проверка домашней работы вызывались без перехвата —
  // сервер отказал, кнопка нажалась, не произошло ничего. Проверка работ идёт после каждого
  // урока, и молчащая кнопка здесь означает потерянную оценку.
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(run: () => Promise<unknown>) {
    setActionError(null);
    try {
      await run();
      await onDone();
    } catch (err) {
      setActionError(t(failureText(err)));
    }
  }

  const stats = hw.submissionStats;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{hw.title}</span>
        <Badge tone={hw.publishedAt ? 'done' : 'neutral'}>
          {hw.publishedAt ? t('published') : t('draft')}
        </Badge>
      </div>
      {hw.dueAt && <p className={styles.muted}>{t('due', { date: formatDate(hw.dueAt) })}</p>}
      <p className={styles.statsRow}>
        {t('stats', {
          total: stats.total,
          submitted: stats.submitted,
          graded: stats.graded,
          late: stats.late,
        })}
      </p>
      {actionError && (
        <p className={styles.formError} role="alert">
          {actionError}
        </p>
      )}
      <div className={styles.actionsRow}>
        {!hw.publishedAt && (
          <Button
            variant="secondary"
            size="sm"
            loading={publishing}
            onClick={() => void act(() => publishHomework({ variables: { id: hw.id } }))}
          >
            {t('actions.publish')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={<ClipboardList size={ICON_SM} />}
          onClick={() => setGrading((v) => !v)}
        >
          {grading ? t('actions.hideGrading') : t('actions.grade')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 size={ICON_SM} />}
          loading={deleting}
          onClick={() => void act(() => deleteHomework({ variables: { id: hw.id } }))}
        >
          {t('actions.delete')}
        </Button>
      </div>
      {grading && <GradingPanel homeworkId={hw.id} onGraded={onDone} />}
    </div>
  );
}

function GradingPanel({ homeworkId, onGraded }: { homeworkId: string; onGraded: () => void }) {
  const { t } = useTranslation('homework');
  const { data, loading, refetch } = useHomeworkSubmissionsQuery({ variables: { homeworkId } });
  const submissions = data?.homeworkSubmissions ?? [];

  if (loading) return <p className={styles.muted}>{t('common:actions.loading')}</p>;
  if (submissions.length === 0) return <p className={styles.muted}>{t('grade.empty')}</p>;

  return (
    <div>
      {submissions.map((s) => (
        <GradeRow
          key={s.id}
          submission={s}
          onGraded={() => {
            void refetch(); // refresh this grading list
            onGraded(); // refresh the parent card's submissionStats
          }}
        />
      ))}
    </div>
  );
}

type SubmissionRow = NonNullable<
  ReturnType<typeof useHomeworkSubmissionsQuery>['data']
>['homeworkSubmissions'][number];

function GradeRow({ submission, onGraded }: { submission: SubmissionRow; onGraded: () => void }) {
  const { t } = useTranslation('homework');
  const [score, setScore] = useState(submission.score?.toString() ?? '');
  const [comment, setComment] = useState(submission.comment ?? '');
  const [gradeSubmission, { loading }] = useGradeSubmissionMutation();
  // 🔴 Оценка, которая «как будто поставилась», — худший исход на этом экране: преподаватель
  // идёт дальше по списку, а работа осталась непроверенной, и узнает об этом ученик.
  const [failed, setFailed] = useState<string | null>(null);

  const who = submission.student.user.formalName;

  /**
   * 🔴 БЕЗ ОТМЕТОК — ДОШКОЛЬНИКИ И ПЕРВЫЙ КЛАСС (наряд §34.4).
   *
   * Основание внешнее: ФГОС НОО (приказ 373 от 06.10.2009, ред. 286 от 31.05.2021) и ФЗ-273.
   * Решает СЕРВЕР (`common/marking.py`) — здесь только показ. Экран, который решал бы сам,
   * разошёлся бы с сервером на первом изменении правила.
   *
   * ⚠️ Значки вместо цифр — тоже отметка, и они запрещены той же строкой закона. Поэтому
   * здесь не «звёздочки вместо поля», а СЛОВА: единственное, что разрешено.
   */
  const markless = submission.markless;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (markless ? comment.trim() === '' : score === '') return;
    setFailed(null);
    try {
      await gradeSubmission({
        variables: {
          input: {
            submissionId: submission.id,
            score: markless ? null : Number(score),
            comment,
          },
        },
      });
      onGraded();
    } catch (err) {
      setFailed(t(failureText(err)));
    }
  }

  return (
    <form className={styles.submission} onSubmit={submit}>
      <div className={styles.submissionHead}>
        <span className={styles.submissionWho}>{who}</span>
        <Badge tone={STATUS_TONE[submission.status]}>{t(`status.${submission.status}`)}</Badge>
      </div>
      {submission.contentText && <p className={styles.submissionBody}>{submission.contentText}</p>}
      <div className={styles.formRow}>
        {markless ? (
          <p className={styles.marklessNote}>{t('grade.markless')}</p>
        ) : (
          <div className={styles.scoreInput}>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder={t('grade.scorePh')}
              aria-label={t('grade.score')}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
        )}
        <div>
          <Input
            placeholder={t(markless ? 'grade.wordsPh' : 'grade.commentPh')}
            aria-label={t(markless ? 'grade.words' : 'grade.comment')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" loading={loading}>
          {t('grade.submit')}
        </Button>
        {failed && (
          <p className={styles.formError} role="alert">
            {failed}
          </p>
        )}
      </div>
    </form>
  );
}

function StudentHomeworkCard({ hw, onDone }: { hw: HomeworkRow; onDone: () => void }) {
  const { t } = useTranslation('homework');
  const sub = hw.viewerSubmission;
  const canSubmit = !sub || hw.allowRedo;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{hw.title}</span>
        {sub ? (
          <Badge tone={STATUS_TONE[sub.status]}>{t(`status.${sub.status}`)}</Badge>
        ) : (
          <Badge tone="neutral">{t('notSubmitted')}</Badge>
        )}
        {sub?.score != null && !sub.markless && (
          <Badge tone="neutral">{t('my.score', { n: sub.score })}</Badge>
        )}
      </div>
      {hw.description && <p className={styles.submissionBody}>{hw.description}</p>}
      {hw.dueAt && <p className={styles.muted}>{t('due', { date: formatDate(hw.dueAt) })}</p>}
      {sub?.comment && (
        <p className={styles.submissionBody}>
          <CheckCircle2 size={14} /> {sub.comment}
        </p>
      )}
      {canSubmit && <SubmitForm homeworkId={hw.id} resubmit={!!sub} onDone={onDone} />}
    </div>
  );
}

function SubmitForm({
  homeworkId,
  resubmit,
  onDone,
}: {
  homeworkId: string;
  resubmit: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation(['homework', 'upload']);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitHomework, { loading }] = useSubmitHomeworkMutation();
  const { upload } = useUpload();
  // 🔴 Аудит 16.08. Правила загрузки здесь не назывались ВОВСЕ: `accept` был вписан руками и
  // разошёлся с политикой сервера, а любой отказ — «Не удалось загрузить файл» одной строкой.
  // Ученик, приложивший тяжёлое видео, ждал загрузку и получал общую фразу без причины.
  // Строки `fileTooLarge` и `fileTypeNotAllowed` при этом лежали в словаре с самого начала —
  // написанные для сообщений, которых экран не показывал.
  const { data: policyData } = useUploadPolicyQuery({ variables: { purpose: 'SUBMISSION' } });
  const policy = policyData?.uploadPolicy ?? null;
  const kinds = policy
    ? kindKeys(policy.contentTypes)
        .map((k) => t(`upload:kinds.${k}`))
        .join(', ')
    : '';

  /** Проверка ДО загрузки — отказ на этом шаге стоит ноль секунд ожидания. */
  function pick(chosen: File[]) {
    setError(null);
    const good: File[] = [];
    for (const file of chosen) {
      const refusal = refuse(file, policy);
      if (refusal?.reason === 'too-large') {
        setError(
          t('upload:tooLargeNamed', {
            name: file.name,
            size: formatBytes(refusal.size),
            max: formatBytes(refusal.max),
          }),
        );
        continue;
      }
      if (refusal?.reason === 'bad-type') {
        setError(
          t('upload:typeNotAllowedNamed', { name: file.name, type: refusal.type, kinds }),
        );
        continue;
      }
      good.push(file);
    }
    if (good.length) setFiles((prev) => [...prev, ...good]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      // Each file uploads DIRECTLY to S3 via a presigned PUT; only the returned keys are
      // submitted to GraphQL (no bytes through the API).
      const fileKeys: string[] = [];
      for (const file of files) fileKeys.push(await upload(file, 'SUBMISSION'));
      await submitHomework({ variables: { input: { homeworkId, contentText: text, fileKeys } } });
      setText('');
      setFiles([]);
      onDone();
    } catch (err) {
      // «Сервера нет» и «сервер отказал» — разные вещи и для ученика тоже: в первом случае
      // работа не пропала и её стоит отправить снова, во втором — звать преподавателя.
      setError(t(failureText(err)));
    } finally {
      setUploading(false);
    }
  }

  const busy = loading || uploading;

  return (
    <form className={styles.form} onSubmit={submit}>
      <TextArea
        placeholder={t('submit.placeholder')}
        aria-label={t('submit.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <label className={styles.fileLabel}>
        <Paperclip size={ICON_SM} /> {t('upload:uploadFile')}
        <input
          type="file"
          multiple
          // Тот же список, что проверяет сервер: диалог и текст под ним не расходятся.
          accept={policy ? acceptAttribute(policy.contentTypes) : undefined}
          className={styles.fileInput}
          onChange={(e) => {
            pick(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className={styles.fileItem}>
              <span>{file.name}</span>
              <button
                type="button"
                className={styles.fileRemove}
                aria-label={t('upload:remove')}
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actionsRow}>
        <Button type="submit" variant="primary" icon={<Send size={ICON_SM} />} loading={busy}>
          {resubmit ? t('actions.resubmit') : t('actions.submit')}
        </Button>
      </div>
    </form>
  );
}
