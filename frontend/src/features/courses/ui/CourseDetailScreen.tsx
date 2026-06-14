import {
  ArrowLeft,
  BookOpen,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
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
  useUnenrollMutation,
  useUpdateCourseMutation,
} from '@/entities/graphql/generated';
import { Badge, Button, Input, Select, SelectField, TextField } from '@/shared/ui';

import { CoursesLayout } from './CoursesLayout';
import styles from './courses.module.css';
import { move } from './reorder';

const COURSE_LEVELS: CourseLevel[] = [
  'GRADE_1',
  'GRADE_2',
  'GRADE_3',
  'GRADE_4',
  'GRADE_5',
  'GRADE_6',
  'GRADE_7',
  'GRADE_8',
  'GRADE_9',
  'GRADE_10',
  'GRADE_11',
  'ADULT',
];

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
  const [reorderSections] = useReorderSectionsMutation();
  const [reorderLessons] = useReorderLessonsMutation();

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

            {isOwner && <EditCourseForm course={course} onDone={reload} />}

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
              course.sections.map((section, sectionIndex) => {
                const lessons = isOwner
                  ? section.lessons
                  : section.lessons.filter((l) => l.status === 'PUBLISHED');
                const sectionIds = course.sections.map((s) => s.id);
                return (
                  <div className={styles.section} key={section.id}>
                    <div className={styles.sectionHead}>
                      <div className={styles.sectionTitle}>{section.title}</div>
                      {isOwner && (
                        <div className={styles.actionsRow}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<ChevronUp size={15} />}
                            aria-label={t('manage.moveUp')}
                            disabled={sectionIndex === 0}
                            onClick={async () => {
                              await reorderSections({
                                variables: {
                                  courseId: id,
                                  orderedIds: move(sectionIds, sectionIndex, -1),
                                },
                              });
                              await reload();
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<ChevronDown size={15} />}
                            aria-label={t('manage.moveDown')}
                            disabled={sectionIndex === sectionIds.length - 1}
                            onClick={async () => {
                              await reorderSections({
                                variables: {
                                  courseId: id,
                                  orderedIds: move(sectionIds, sectionIndex, 1),
                                },
                              });
                              await reload();
                            }}
                          />
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
                        </div>
                      )}
                    </div>
                    {lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id}>
                        <div className={styles.lessonRow}>
                          <BookOpen size={16} />
                          <span className={styles.lessonName}>{lesson.title}</span>
                          {lesson.durationMin > 0 && (
                            <span className={styles.lessonMeta}>
                              {t('detail.min', { n: lesson.durationMin })}
                            </span>
                          )}
                          {isOwner && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ChevronUp size={15} />}
                                aria-label={t('manage.moveUp')}
                                disabled={lessonIndex === 0}
                                onClick={async () => {
                                  await reorderLessons({
                                    variables: {
                                      sectionId: section.id,
                                      orderedIds: move(
                                        section.lessons.map((l) => l.id),
                                        lessonIndex,
                                        -1,
                                      ),
                                    },
                                  });
                                  await reload();
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ChevronDown size={15} />}
                                aria-label={t('manage.moveDown')}
                                disabled={lessonIndex === section.lessons.length - 1}
                                onClick={async () => {
                                  await reorderLessons({
                                    variables: {
                                      sectionId: section.id,
                                      orderedIds: move(
                                        section.lessons.map((l) => l.id),
                                        lessonIndex,
                                        1,
                                      ),
                                    },
                                  });
                                  await reload();
                                }}
                              />
                            </>
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

function EditCourseForm({
  course,
  onDone,
}: {
  course: {
    id: string;
    title: string;
    subject: string;
    level: CourseLevel;
    description?: string | null;
  };
  onDone: () => void;
}) {
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [subject, setSubject] = useState(course.subject);
  const [level, setLevel] = useState<CourseLevel>(course.level);
  const [description, setDescription] = useState(course.description ?? '');
  const [updateCourse, { loading }] = useUpdateCourseMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;
    await updateCourse({
      variables: { id: course.id, input: { title, subject, level, description } },
    });
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        icon={<Pencil size={15} />}
        onClick={() => setOpen(true)}
      >
        {t('manage.editCourse')}
      </Button>
    );
  }

  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField
        label={t('create.name')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label={t('create.subject')}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <SelectField
        label={t('create.level')}
        value={level}
        onChange={(e) => setLevel(e.target.value as CourseLevel)}
      >
        {COURSE_LEVELS.map((lvl) => (
          <option key={lvl} value={lvl}>
            {t(`level.${lvl}`)}
          </option>
        ))}
      </SelectField>
      <TextField
        label={t('create.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button type="submit" variant="primary" size="sm" loading={loading}>
        {t('manage.save')}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t('manage.cancel')}
      </Button>
    </form>
  );
}
