import { ArrowLeft, BookOpen, Check, GraduationCap, Plus, ShieldCheck, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  useCourseDetailQuery,
  useCreateLessonMutation,
  useCreateSectionMutation,
  useEnrollMutation,
  useMeQuery,
  usePublishCourseMutation,
  usePublishLessonMutation,
  useUnenrollMutation,
} from '@/entities/graphql/generated';
import { Badge, Button, Input, TextField } from '@/shared/ui';

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
                    <div className={styles.sectionTitle}>{section.title}</div>
                    {lessons.map((lesson) => (
                      <div className={styles.lessonRow} key={lesson.id}>
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
