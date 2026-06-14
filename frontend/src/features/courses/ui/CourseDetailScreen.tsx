import {
  ArrowLeft,
  BookOpen,
  CalendarPlus,
  Check,
  FileText,
  GraduationCap,
  Link2,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
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
  useScheduleSessionMutation,
  useUnenrollMutation,
} from '@/entities/graphql/generated';
import { Badge, Button, Input, Select, TextField } from '@/shared/ui';

import { CoursesLayout } from './CoursesLayout';
import styles from './courses.module.css';

export function CourseDetailScreen() {
  const { id = '' } = useParams();
  const { t } = useTranslation(['courses', 'common']);
  const navigate = useNavigate();
  const { data, loading, refetch } = useCourseDetailQuery({ variables: { id }, skip: !id });
  const { data: meData } = useMeQuery();

  const [enroll, { loading: enrolling }] = useEnrollMutation();
  const [unenroll, { loading: unenrolling }] = useUnenrollMutation();
  const [publishCourse, { loading: publishingCourse }] = usePublishCourseMutation();
  const [publishLesson] = usePublishLessonMutation();
  const [deleteSection] = useDeleteSectionMutation();
  const [deleteLesson] = useDeleteLessonMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();

  if (!id) return <Navigate to="/courses" replace />;

  const me = meData?.me;
  const course = data?.course;
  const isOwner = !!me && !!course && course.owner.user.id === me.id;
  const isStudent = me?.role === 'STUDENT';
  const enrollment = course?.viewerEnrollment;

  const reload = () => refetch();

  return (
    <CoursesLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/courses')}>
          <ArrowLeft size={15} /> {t('catalog.title')}
        </button>

        {!course ? (
          <p className={styles.empty}>{loading ? t('common:actions.loading') : t('catalog.empty')}</p>
        ) : (
          <>
            <div className={styles.detailHead}>
              <h1 className={styles.pageTitle}>{course.title}</h1>
              <Badge tone="accent">{t(`level.${course.level}`)}</Badge>
              {isOwner && (
                <Badge tone={course.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                  {t(`status.${course.status}`)}
                </Badge>
              )}
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <GraduationCap /> {course.subject}
              </span>
              <span className={styles.metaItem}>
                {t('detail.teacher')}: {course.owner.user.firstName} {course.owner.user.lastName}
              </span>
              <span className={styles.metaItem}>
                <Users /> {t('catalog.students', { n: course.enrollmentCount })}
              </span>
            </div>
            {course.description && <p className={styles.pageSub}>{course.description}</p>}

            {isOwner && course.status === 'DRAFT' && (
              <div className={styles.panel} style={{ marginTop: 'var(--space-5)' }}>
                <div className={styles.panelTitle}>{t('manage.title')}</div>
                <p className={styles.muted} style={{ marginBottom: 'var(--space-3)' }}>
                  {t('detail.draftNote')}
                </p>
                <div className={styles.actionsRow}>
                  <Button
                    variant="primary"
                    loading={publishingCourse}
                    onClick={async () => {
                      await publishCourse({ variables: { id } });
                      await reload();
                    }}
                  >
                    {t('manage.publishCourse')}
                  </Button>
                </div>
                <AddSectionForm courseId={id} onDone={reload} />
              </div>
            )}

            <h2 className={styles.sectionTitle} style={{ marginTop: 'var(--space-6)' }}>
              {t('detail.sections')}
            </h2>
            {course.sections.length === 0 ? (
              <p className={styles.empty}>{t('detail.noSections')}</p>
            ) : (
              course.sections.map((section) => {
                const lessons = isOwner
                  ? section.lessons
                  : section.lessons.filter((l) => l.status === 'PUBLISHED');
                return (
                  <div className={styles.section} key={section.id}>
                    <div className={styles.sectionHead}>
                      <div className={styles.sectionTitle}>{section.title}</div>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={15} />}
                          onClick={async () => {
                            await deleteSection({ variables: { id: section.id } });
                            await reload();
                          }}
                        >
                          {t('manage.deleteSection')}
                        </Button>
                      )}
                    </div>
                    {lessons.map((lesson) => (
                      <div key={lesson.id}>
                        <div className={styles.lessonRow}>
                          <BookOpen size={16} />
                          <span className={styles.lessonName}>{lesson.title}</span>
                          {lesson.durationMin > 0 && (
                            <span className={styles.lessonMeta}>
                              {t('detail.min', { n: lesson.durationMin })}
                            </span>
                          )}
                          {isOwner && lesson.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await publishLesson({ variables: { id: lesson.id } });
                                await reload();
                              }}
                            >
                              {t('manage.publishLesson')}
                            </Button>
                          )}
                          {isOwner && <ScheduleSessionForm lessonId={lesson.id} />}
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={15} />}
                              onClick={async () => {
                                await deleteLesson({ variables: { id: lesson.id } });
                                await reload();
                              }}
                            >
                              {t('manage.deleteLesson')}
                            </Button>
                          )}
                          {(isOwner || enrollment) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<FileText size={15} />}
                              onClick={() => navigate(`/lessons/${lesson.id}/homework`)}
                            >
                              {t('homework:lesson.title')}
                            </Button>
                          )}
                        </div>
                        {lesson.materials.length > 0 && (
                          <ul className={styles.materials}>
                            {lesson.materials.map((m) => (
                              <li className={styles.material} key={m.id}>
                                {m.type === 'LINK' ? <Link2 size={14} /> : <FileText size={14} />}
                                {m.type === 'LINK' && m.url ? (
                                  <a
                                    className={styles.materialLink}
                                    href={m.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {m.title}
                                  </a>
                                ) : (
                                  <span>{m.title}</span>
                                )}
                                {m.type === 'TEXT' && m.body ? (
                                  <span className={styles.materialBody}>— {m.body}</span>
                                ) : null}
                                {isOwner && (
                                  <button
                                    type="button"
                                    className={styles.materialDelete}
                                    aria-label={t('manage.deleteMaterial')}
                                    onClick={async () => {
                                      await deleteMaterial({ variables: { id: m.id } });
                                      await reload();
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {isOwner && <MaterialForm lessonId={lesson.id} onDone={reload} />}
                      </div>
                    ))}
                    {isOwner && <AddLessonForm sectionId={section.id} onDone={reload} />}
                  </div>
                );
              })
            )}

            {isStudent && !isOwner && (
              <div className={styles.enrollBar}>
                {enrollment ? (
                  <>
                    <span className={styles.enrollStatus}>
                      <Check size={16} /> {t('detail.enrolled')} ·{' '}
                      {t('detail.progress', { pct: enrollment.progressPct })}
                    </span>
                    <Button
                      variant="secondary"
                      loading={unenrolling}
                      onClick={async () => {
                        await unenroll({ variables: { courseId: id } });
                        await reload();
                      }}
                    >
                      {t('detail.unenroll')}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={styles.enrollStatus}>
                      <ShieldCheck size={16} /> {course.title}
                    </span>
                    <Button
                      variant="primary"
                      loading={enrolling}
                      onClick={async () => {
                        await enroll({ variables: { courseId: id } });
                        await reload();
                      }}
                    >
                      {t('detail.enroll')}
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </CoursesLayout>
  );
}

function AddSectionForm({ courseId, onDone }: { courseId: string; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [title, setTitle] = useState('');
  const [createSection, { loading }] = useCreateSectionMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createSection({ variables: { courseId, input: { title } } });
    setTitle('');
    onDone();
  }

  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField
        label={t('manage.sectionTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Button type="submit" variant="secondary" icon={<Plus size={16} />} loading={loading}>
        {t('manage.addSection')}
      </Button>
    </form>
  );
}

function AddLessonForm({ sectionId, onDone }: { sectionId: string; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [createLesson, { loading }] = useCreateLessonMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createLesson({
      variables: { sectionId, input: { title, durationMin: Number(duration) || 0 } },
    });
    setTitle('');
    setDuration('');
    onDone();
  }

  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField
        label={t('manage.lessonTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
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
      <Button type="submit" variant="ghost" icon={<Plus size={16} />} loading={loading}>
        {t('manage.addLesson')}
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
    await scheduleSession({
      variables: { input: { lessonId, startAt: new Date(when).toISOString() } },
    });
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
      <Button
        variant="ghost"
        size="sm"
        icon={<CalendarPlus size={15} />}
        onClick={() => setOpen(true)}
      >
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
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MaterialType>('LINK');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [addMaterial, { loading }] = useAddMaterialMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addMaterial({
      variables: {
        input: {
          lessonId,
          type,
          title,
          url: type === 'LINK' ? value : null,
          body: type === 'TEXT' ? value : null,
        },
      },
    });
    setTitle('');
    setValue('');
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
        {t('manage.addMaterial')}
      </Button>
    );
  }
  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <div>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as MaterialType)}
          aria-label={t('manage.materialType')}
        >
          <option value="LINK">{t('manage.materialLink')}</option>
          <option value="TEXT">{t('manage.materialText')}</option>
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
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === 'LINK' ? t('manage.materialUrl') : t('manage.materialBody')}
          aria-label={type === 'LINK' ? t('manage.materialUrl') : t('manage.materialBody')}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={loading}>
        {t('manage.add')}
      </Button>
    </form>
  );
}
