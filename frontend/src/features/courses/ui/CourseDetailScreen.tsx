import { ICON_SM } from '@/shared/ui/iconSizes';
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  type CourseDetailQuery,
  type CourseLevel,
  type MaterialType,
  useAddMaterialMutation,
  useCourseDetailQuery,
  useCreateLessonMutation,
  useCreateSectionMutation,
  useDeleteLessonMutation,
  useDeleteMaterialMutation,
  useDeleteSectionMutation,
  useEnrollMutation,
  useMeQuery,
  usePublishCourseMutation,
  usePublishLessonMutation,
  useReorderLessonsMutation,
  useReorderSectionsMutation,
  useScheduleSessionMutation,
  useUnpublishCourseMutation,
  useUpdateCourseMutation,
  useUpdateLessonMutation,
  useUpdateSectionMutation,
} from '@/entities/graphql/generated';
import { useUpload } from '@/shared/lib/useUpload';
import { Button, ErrorState, Input, Select, TextField } from '@/shared/ui';

import { CoursesLayout } from './CoursesLayout';
import styles from './courses.module.css';
import { move } from './reorder';

const COURSE_LEVELS: CourseLevel[] = [
  'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6',
  'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'ADULT',
];

type CourseT = NonNullable<CourseDetailQuery['course']>;
type SectionT = CourseT['sections'][number];
type LessonT = SectionT['lessons'][number];

const idx2 = (n: number) => String(n).padStart(2, '0');
const publishedOf = (s: SectionT) => s.lessons.filter((l) => l.status === 'PUBLISHED');

/**
 * Course detail — atlas sheet 04, three projections keyed off the viewer:
 *  guest (open showcase: full program, content locked, one coral "Записаться"),
 *  enrolled (program = progress map, sequential unlock, one coral "Продолжить"),
 *  owner (constructor: sections/lessons, reorder, materials, publish). Content gating is
 *  server-side (audit #9) — a guest simply receives no lesson bodies/materials.
 */
export function CourseDetailScreen() {
  const { id = '' } = useParams();
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useCourseDetailQuery({ variables: { id }, skip: !id });
  const { data: meData } = useMeQuery();

  if (!id) return <Navigate to="/courses" replace />;

  const me = meData?.me;
  const course = data?.course;
  const isOwner = !!me && !!course && course.owner.user.id === me.id;
  const isStudent = me?.role === 'STUDENT';
  const reload = () => void refetch();

  return (
    <CoursesLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/courses')}>
          <ArrowLeft size={ICON_SM} /> {t('catalog.title')}
        </button>

        {error && !course ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !course ? (
          <p className={styles.empty}>{loading ? t('common:actions.loading') : t('catalog.empty')}</p>
        ) : isOwner ? (
          <OwnerConstructor course={course} onDone={reload} />
        ) : course.viewerEnrollment ? (
          <EnrolledView course={course} />
        ) : (
          <GuestView course={course} isStudent={isStudent} onDone={reload} />
        )}
      </div>
    </CoursesLayout>
  );
}

// --- Guest projection --------------------------------------------------------------------
function GuestView({
  course,
  isStudent,
  onDone,
}: {
  course: CourseT;
  isStudent: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation('courses');
  const [enroll, { loading }] = useEnrollMutation();
  const totalLessons = course.sections.reduce((n, s) => n + publishedOf(s).length, 0);

  return (
    <div className={styles.detailGrid}>
      <div>
        <div className={styles.dSubj}>
          {course.subject} · {t(`level.${course.level}`)} ·{' '}
          {t('detail.dSubjLessons', { count: totalLessons })} ·{' '}
          {t('detail.dSubjSections', { count: course.sections.length })}
        </div>
        <h1 className={styles.pageTitle}>{course.title}</h1>
        {course.description && <p className={styles.dDesc}>{course.description}</p>}

        <p className={styles.secOverline}>{t('detail.program')}</p>
        <div>
          {course.sections.map((s, i) => (
            <div className={styles.progRow} key={s.id}>
              <span className={styles.progIdx}>{idx2(i + 1)}</span>
              <div>
                <div className={styles.progTitle}>{s.title}</div>
                <div className={styles.progSub}>
                  {t('detail.sectionLessons', { count: publishedOf(s).length })}
                </div>
              </div>
              <span className={styles.progLock}>{t('detail.lockAfterEnroll')}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className={styles.aside}>
        <p className={styles.asideNote}>{t('detail.guestNote')}</p>
        {isStudent && (
          <Button
            variant="primary"
            loading={loading}
            onClick={async () => {
              await enroll({ variables: { courseId: course.id } });
              onDone();
            }}
          >
            {t('detail.enroll')}
          </Button>
        )}
        <p className={styles.asideTeach}>
          {t('detail.teachOnCourse', {
            name: `${course.owner.user.firstName} ${course.owner.user.lastName}`,
            count: course.enrollmentCount,
          })}
        </p>
      </aside>
    </div>
  );
}

// --- Enrolled projection -----------------------------------------------------------------
function EnrolledView({ course }: { course: CourseT }) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const viewed = new Set(course.viewerEnrollment?.viewedLessonIds ?? []);

  const rows = course.sections.map((s) => {
    const pub = publishedOf(s);
    const done = pub.filter((l) => viewed.has(l.id)).length;
    return { s, pub, done };
  });
  const totalPub = rows.reduce((n, r) => n + r.pub.length, 0);
  const donePub = rows.reduce((n, r) => n + r.done, 0);
  const pct = totalPub > 0 ? Math.round((donePub / totalPub) * 100) : 0;
  // Sections open sequentially (owner decision #2): the first section with unfinished published
  // lessons is "in-progress"; earlier ones are done, later ones locked.
  const activeIdx = rows.findIndex((r) => r.pub.length > 0 && r.done < r.pub.length);
  const firstLessonId = rows.find((r) => r.pub.length > 0)?.pub[0]?.id;

  return (
    <div className={styles.detailGrid}>
      <div>
        <div className={styles.dSubj}>
          {course.subject} · {t(`level.${course.level}`)} · {t('detail.enrolledTag')}
        </div>
        <h1 className={styles.pageTitle}>{course.title}</h1>

        <p className={styles.secOverline}>
          {t('detail.progressHeading', { done: donePub, total: totalPub })}
        </p>
        <div>
          {rows.map((r, i) => {
            const active = i === activeIdx;
            const locked = activeIdx !== -1 && i > activeIdx;
            // "Done" means it actually had published lessons and all of them are viewed — a
            // section with nothing published yet is neither done nor startable.
            const complete = r.pub.length > 0 && r.done === r.pub.length;
            const next = r.pub.find((l) => !viewed.has(l.id));
            return (
              <div className={styles.progRow} key={r.s.id}>
                <span className={styles.progIdx}>{idx2(i + 1)}</span>
                <div>
                  <div className={styles.progTitle}>{r.s.title}</div>
                  <div className={styles.progSub}>
                    {active
                      ? t('detail.sectionInProgress', {
                          cur: r.done + 1,
                          total: r.pub.length,
                          next: next?.title ?? '',
                        })
                      : // a locked section opens after its OWN predecessor, not after the active one
                        locked
                        ? t('detail.sectionLocked', { n: idx2(i) })
                        : t('detail.sectionLessons', { count: r.pub.length })}
                  </div>
                </div>
                {active ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => next && navigate(`/lessons/${next.id}/homework`)}
                  >
                    {t('detail.continue')}
                  </Button>
                ) : locked ? (
                  <span className={styles.progLock}>{t('detail.ahead')}</span>
                ) : complete ? (
                  <span className={styles.progDone}>
                    <Check /> {t('detail.sectionDone')}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <aside className={styles.aside}>
        <p className={styles.asideNote}>{t('detail.progressTitle')}</p>
        <div className={styles.progressLine}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.asideTeach}>{t('detail.progressStat', { done: donePub, total: totalPub })}</p>
        <Button
          variant="secondary"
          disabled={!firstLessonId}
          onClick={() => firstLessonId && navigate(`/lessons/${firstLessonId}/homework`)}
        >
          {t('detail.materials')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/schedule')}>
          {t('detail.schedule')}
        </Button>
      </aside>
    </div>
  );
}

// --- Owner constructor -------------------------------------------------------------------
function OwnerConstructor({ course, onDone }: { course: CourseT; onDone: () => void }) {
  const { t } = useTranslation(['courses', 'common', 'homework']);
  const navigate = useNavigate();
  const [publishCourse, { loading: publishing }] = usePublishCourseMutation();
  const [unpublishCourse, { loading: unpublishing }] = useUnpublishCourseMutation();
  const [publishLesson] = usePublishLessonMutation();
  const [deleteSection] = useDeleteSectionMutation();
  const [deleteLesson] = useDeleteLessonMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();
  const [reorderSections] = useReorderSectionsMutation();
  const [reorderLessons] = useReorderLessonsMutation();
  const [editingCourse, setEditingCourse] = useState(false);

  const isDraft = course.status === 'DRAFT';
  const sectionIds = course.sections.map((s) => s.id);

  return (
    <>
      <div className={styles.cHead}>
        <div>
          <div className={styles.dSubj}>
            <span className={`${styles.pill} ${isDraft ? styles.pillDraft : ''}`}>
              {isDraft ? t('manage.pillDraft') : t('manage.pillPublished')}
            </span>{' '}
            · {t('catalog.cardStudents', { count: course.enrollmentCount })} ·{' '}
            {updatedLabel(course.updatedAt, t)}
          </div>
          <h1 className={styles.pageTitle}>{course.title}</h1>
        </div>
        <div className={styles.cHeadActions}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil size={ICON_SM} />}
            onClick={() => setEditingCourse((v) => !v)}
          >
            {t('manage.editDescription')}
          </Button>
          {isDraft ? (
            <Button
              variant="primary"
              size="sm"
              loading={publishing}
              onClick={async () => {
                await publishCourse({ variables: { id: course.id } });
                onDone();
              }}
            >
              {t('manage.publish')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={unpublishing}
              onClick={async () => {
                await unpublishCourse({ variables: { id: course.id } });
                onDone();
              }}
            >
              {t('manage.unpublish')}
            </Button>
          )}
        </div>
      </div>

      {editingCourse && (
        <EditCourseForm
          course={course}
          onDone={() => {
            setEditingCourse(false);
            onDone();
          }}
        />
      )}

      {course.sections.length === 0 && <p className={styles.empty}>{t('detail.noSections')}</p>}

      {course.sections.map((section, si) => {
        const lessonIds = section.lessons.map((l) => l.id);
        const allDraft =
          section.lessons.length > 0 && section.lessons.every((l) => l.status === 'DRAFT');
        return (
          <div key={section.id}>
            <div className={styles.cSecTitle}>
              <span>{t('manage.sectionHeading', { n: idx2(si + 1), title: section.title })}</span>
              {allDraft && <span className={`${styles.pill} ${styles.pillDraft}`}>{t('manage.pillDraft')}</span>}
              <span className={styles.cControls}>
                <button
                  type="button"
                  className={styles.mini}
                  aria-label={t('manage.moveUp')}
                  disabled={si === 0}
                  onClick={async () => {
                    await reorderSections({ variables: { courseId: course.id, orderedIds: move(sectionIds, si, -1) } });
                    onDone();
                  }}
                >
                  <ChevronUp />
                </button>
                <button
                  type="button"
                  className={styles.mini}
                  aria-label={t('manage.moveDown')}
                  disabled={si === sectionIds.length - 1}
                  onClick={async () => {
                    await reorderSections({ variables: { courseId: course.id, orderedIds: move(sectionIds, si, 1) } });
                    onDone();
                  }}
                >
                  <ChevronDown />
                </button>
                <SectionEditForm section={section} onDone={onDone} />
                <button
                  type="button"
                  className={styles.mini}
                  aria-label={t('manage.deleteSection')}
                  onClick={async () => {
                    await deleteSection({ variables: { id: section.id } });
                    onDone();
                  }}
                >
                  <Trash2 />
                </button>
              </span>
            </div>

            {section.lessons.map((lesson, li) => (
              <div className={styles.cRow} key={lesson.id}>
                <span className={styles.progIdx}>
                  {si + 1}.{li + 1}
                </span>
                <div>
                  <div className={styles.progTitle}>
                    {lesson.title}
                    {lesson.status === 'DRAFT' && (
                      <span className={`${styles.pill} ${styles.pillDraft}`} style={{ marginLeft: 'var(--space-2)' }}>
                        {t('manage.pillDraft')}
                      </span>
                    )}
                  </div>
                  <div className={styles.progSub}>
                    {lesson.materials.length > 0
                      ? t('manage.materialsCount', { count: lesson.materials.length })
                      : t('manage.noMaterials')}
                    {lesson.options.homework ? ` · ${t('manage.homeworkTag')}` : ''}
                  </div>
                  {lesson.materials.length > 0 && (
                    <div className={styles.matChips}>
                      {lesson.materials.map((m) => (
                        <span className={styles.matChip} key={m.id}>
                          {m.type === 'LINK' ? <Link2 /> : <FileText />}
                          {m.title}
                          <button
                            type="button"
                            className={styles.matChipDelete}
                            aria-label={t('manage.deleteMaterial')}
                            onClick={async () => {
                              await deleteMaterial({ variables: { id: m.id } });
                              onDone();
                            }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.addRow}>
                    <MaterialForm lessonId={lesson.id} onDone={onDone} />
                    {lesson.status === 'DRAFT' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          await publishLesson({ variables: { id: lesson.id } });
                          onDone();
                        }}
                      >
                        {t('manage.publishLesson')}
                      </Button>
                    )}
                    <ScheduleSessionForm lessonId={lesson.id} />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FileText size={ICON_SM} />}
                      onClick={() => navigate(`/lessons/${lesson.id}/homework`)}
                    >
                      {t('homework:lesson.title')}
                    </Button>
                  </div>
                </div>
                <span className={styles.cControls}>
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={t('manage.moveUp')}
                    disabled={li === 0}
                    onClick={async () => {
                      await reorderLessons({ variables: { sectionId: section.id, orderedIds: move(lessonIds, li, -1) } });
                      onDone();
                    }}
                  >
                    <ChevronUp />
                  </button>
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={t('manage.moveDown')}
                    disabled={li === lessonIds.length - 1}
                    onClick={async () => {
                      await reorderLessons({ variables: { sectionId: section.id, orderedIds: move(lessonIds, li, 1) } });
                      onDone();
                    }}
                  >
                    <ChevronDown />
                  </button>
                  <LessonEditForm lesson={lesson} onDone={onDone} />
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={t('manage.deleteLesson')}
                    onClick={async () => {
                      await deleteLesson({ variables: { id: lesson.id } });
                      onDone();
                    }}
                  >
                    <Trash2 />
                  </button>
                </span>
              </div>
            ))}

            <div className={styles.addRow}>
              <AddLessonForm sectionId={section.id} onDone={onDone} />
            </div>
          </div>
        );
      })}

      <div className={styles.addRow}>
        <AddSectionForm courseId={course.id} onDone={onDone} />
      </div>
    </>
  );
}

const DAY_MS = 86_400_000;
function updatedLabel(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));
  if (days === 0) return t('manage.updatedToday');
  if (days === 1) return t('manage.updatedYesterday');
  return t('manage.updatedDaysAgo', { count: days });
}

// --- owner sub-forms ---------------------------------------------------------------------
function AddSectionForm({ courseId, onDone }: { courseId: string; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [createSection, { loading }] = useCreateSectionMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createSection({ variables: { courseId, input: { title } } });
    setTitle('');
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button type="button" className={styles.dashBtn} onClick={() => setOpen(true)}>
        {t('manage.addSectionShort')}
      </button>
    );
  }
  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField label={t('manage.sectionTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button type="submit" variant="secondary" size="sm" icon={<Plus size={ICON_SM} />} loading={loading}>
        {t('manage.add')}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
        {t('manage.cancel')}
      </Button>
    </form>
  );
}

function AddLessonForm({ sectionId, onDone }: { sectionId: string; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [createLesson, { loading }] = useCreateLessonMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createLesson({ variables: { sectionId, input: { title, durationMin: Number(duration) || 0 } } });
    setTitle('');
    setDuration('');
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button type="button" className={styles.dashBtn} onClick={() => setOpen(true)}>
        {t('manage.addLessonShort')}
      </button>
    );
  }
  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField label={t('manage.lessonTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div>
        <Input
          type="number"
          min={0}
          placeholder={t('manage.duration')}
          aria-label={t('manage.duration')}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" icon={<Plus size={ICON_SM} />} loading={loading}>
        {t('manage.add')}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
        {t('manage.cancel')}
      </Button>
    </form>
  );
}

function SectionEditForm({ section, onDone }: { section: SectionT; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [updateSection, { loading }] = useUpdateSectionMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await updateSection({ variables: { id: section.id, input: { title } } });
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button type="button" className={styles.mini} aria-label={t('manage.editSection')} onClick={() => setOpen(true)}>
        <Pencil />
      </button>
    );
  }
  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField label={t('manage.sectionTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button type="submit" variant="secondary" size="sm" loading={loading}>
        {t('manage.save')}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
        {t('manage.cancel')}
      </Button>
    </form>
  );
}

function LessonEditForm({ lesson, onDone }: { lesson: LessonT; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [duration, setDuration] = useState(String(lesson.durationMin || 0));
  const [updateLesson, { loading }] = useUpdateLessonMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await updateLesson({ variables: { id: lesson.id, input: { title, durationMin: Number(duration) || 0 } } });
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button type="button" className={styles.mini} aria-label={t('manage.editLesson')} onClick={() => setOpen(true)}>
        <Pencil />
      </button>
    );
  }
  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField label={t('manage.lessonTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div>
        <Input
          type="number"
          min={0}
          aria-label={t('manage.duration')}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={loading}>
        {t('manage.save')}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
        {t('manage.cancel')}
      </Button>
    </form>
  );
}

function ScheduleSessionForm({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation('schedule');
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState('');
  const [done, setDone] = useState(false);
  const [scheduleSession, { loading }] = useScheduleSessionMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!when) return;
    await scheduleSession({ variables: { input: { lessonId, startAt: new Date(when).toISOString() } } });
    setDone(true);
  }

  if (done) {
    return (
      <span className={styles.lessonMeta}>
        <Check size={14} /> {t('status.SCHEDULED')}
      </span>
    );
  }
  if (!open) {
    return (
      <Button variant="secondary" size="sm" icon={<CalendarPlus size={ICON_SM} />} onClick={() => setOpen(true)}>
        {t('lessonForm.schedule')}
      </Button>
    );
  }
  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <div>
        <Input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          aria-label={t('lessonForm.schedule')}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={loading}>
        {t('lessonForm.submit')}
      </Button>
    </form>
  );
}

function MaterialForm({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const { t } = useTranslation(['courses', 'upload']);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MaterialType>('LINK');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addMaterial, { loading }] = useAddMaterialMutation();
  const { upload } = useUpload();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === 'FILE' && !file) return;
    setError(null);
    setBusy(true);
    try {
      const fileKey = type === 'FILE' && file ? await upload(file, 'MATERIAL') : null;
      await addMaterial({
        variables: {
          input: {
            lessonId,
            type,
            title,
            url: type === 'LINK' ? value : null,
            body: type === 'TEXT' ? value : null,
            fileKey,
          },
        },
      });
      setTitle('');
      setValue('');
      setFile(null);
      setOpen(false);
      onDone();
    } catch {
      setError(t('upload:uploadFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.dashBtn} onClick={() => setOpen(true)}>
        {t('manage.addMaterialShort')}
      </button>
    );
  }
  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <div>
        <Select value={type} onChange={(e) => setType(e.target.value as MaterialType)} aria-label={t('manage.materialType')}>
          <option value="LINK">{t('manage.materialLink')}</option>
          <option value="TEXT">{t('manage.materialText')}</option>
          <option value="FILE">{t('manage.materialFile')}</option>
        </Select>
      </div>
      <div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('manage.materialTitle')}
          aria-label={t('manage.materialTitle')}
        />
      </div>
      <div>
        {type === 'FILE' ? (
          <label className={styles.fileLabel}>
            <Paperclip size={14} /> {file ? file.name : t('upload:uploadFile')}
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
              className={styles.fileInput}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'LINK' ? t('manage.materialUrl') : t('manage.materialBody')}
            aria-label={type === 'LINK' ? t('manage.materialUrl') : t('manage.materialBody')}
          />
        )}
      </div>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" size="sm" loading={loading || busy}>
        {t('manage.add')}
      </Button>
    </form>
  );
}

function EditCourseForm({ course, onDone }: { course: CourseT; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [title, setTitle] = useState(course.title);
  const [subject, setSubject] = useState(course.subject);
  const [level, setLevel] = useState<CourseLevel>(course.level);
  const [description, setDescription] = useState(course.description ?? '');
  const [updateCourse, { loading }] = useUpdateCourseMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;
    await updateCourse({ variables: { id: course.id, input: { title, subject, level, description } } });
    onDone();
  }

  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField label={t('create.name')} value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextField label={t('create.subject')} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <div>
        <Select
          value={level}
          onChange={(e) => setLevel(e.target.value as CourseLevel)}
          aria-label={t('create.level')}
        >
          {COURSE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {t(`level.${lvl}`)}
            </option>
          ))}
        </Select>
      </div>
      <TextField label={t('create.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Button type="submit" variant="secondary" size="sm" loading={loading}>
        {t('manage.save')}
      </Button>
    </form>
  );
}
