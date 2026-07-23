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
} from '@/entities/graphql/generated';
import { useUpload } from '@/shared/lib/useUpload';
import { Badge, type BadgeTone, Button, Checkbox, ErrorState, Input, TextArea, TextField } from '@/shared/ui';

import { HomeworkLayout } from './HomeworkLayout';
import styles from './homework.module.css';

const STATUS_TONE: Record<SubmissionStatus, BadgeTone> = {
  SUBMITTED: 'info',
  LATE: 'warning',
  GRADED: 'success',
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

  if (!lessonId) return <Navigate to="/app" replace />;

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

  const stats = hw.submissionStats;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{hw.title}</span>
        <Badge tone={hw.publishedAt ? 'success' : 'neutral'}>
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
      <div className={styles.actionsRow}>
        {!hw.publishedAt && (
          <Button
            variant="secondary"
            size="sm"
            loading={publishing}
            onClick={async () => {
              await publishHomework({ variables: { id: hw.id } });
              await onDone();
            }}
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
          variant="ghost"
          size="sm"
          icon={<Trash2 size={ICON_SM} />}
          loading={deleting}
          onClick={async () => {
            await deleteHomework({ variables: { id: hw.id } });
            await onDone();
          }}
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

  const who = `${submission.student.user.firstName} ${submission.student.user.lastName}`.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (score === '') return;
    await gradeSubmission({
      variables: { input: { submissionId: submission.id, score: Number(score), comment } },
    });
    onGraded();
  }

  return (
    <form className={styles.submission} onSubmit={submit}>
      <div className={styles.submissionHead}>
        <span className={styles.submissionWho}>{who}</span>
        <Badge tone={STATUS_TONE[submission.status]}>{t(`status.${submission.status}`)}</Badge>
      </div>
      {submission.contentText && <p className={styles.submissionBody}>{submission.contentText}</p>}
      <div className={styles.formRow}>
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
        <div>
          <Input
            placeholder={t('grade.commentPh')}
            aria-label={t('grade.comment')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" loading={loading}>
          {t('grade.submit')}
        </Button>
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
        {sub?.score != null && <Badge tone="neutral">{t('my.score', { n: sub.score })}</Badge>}
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
    } catch {
      setError(t('upload:uploadFailed'));
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
          accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
          className={styles.fileInput}
          onChange={(e) => {
            setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
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
