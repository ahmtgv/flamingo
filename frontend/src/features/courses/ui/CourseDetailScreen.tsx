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
  type CourseFormat,
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
  useMyCoursesQuery,
  usePublishCourseMutation,
  usePublishLessonMutation,
  useReorderLessonsMutation,
  useReorderSectionsMutation,
  useUnpublishCourseMutation,
  useUpdateCourseMutation,
  useUpdateLessonMutation,
  useUpdateSectionMutation,
  useUploadPolicyQuery,
} from '@/entities/graphql/generated';
import { failureText } from '@/shared/lib/requestFailure';
import { useUpload } from '@/shared/lib/useUpload';
import { acceptAttribute, formatBytes, kindKeys, refuse } from '@/shared/lib/uploadLimits';
import { Button, ErrorState, Input, Select, TextField } from '@/shared/ui';

import { LESSON_FILTERS, type LessonFilter, focusSectionId, matches } from '../constructorNav';

import { AudienceFields } from './AudienceFields';
import { CoursesLayout } from './CoursesLayout';
import styles from './courses.module.css';
import { move } from './reorder';

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
          <ErrorState error={error} onRetry={() => void refetch()} />
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
  // Записаться может не выйти: курс сняли с публикации, сервера нет. Молчащая кнопка здесь
  // означает ученика, который считает себя записанным.
  const [failed, setFailed] = useState<string | null>(null);
  const totalLessons = course.sections.reduce((n, s) => n + publishedOf(s).length, 0);

  return (
    <div className={styles.detailGrid}>
      <div>
        <div className={styles.dSubj}>
          {audienceLine(course, t)} · {t('detail.dSubjLessons', { count: totalLessons })} ·{' '}
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
              setFailed(null);
              try {
                await enroll({ variables: { courseId: course.id } });
                onDone();
              } catch (error) {
                setFailed(t(failureText(error)));
              }
            }}
          >
            {t('detail.enroll')}
          </Button>
        )}
        {failed && (
          <p className={styles.formError} role="alert">
            {failed}
          </p>
        )}
        <p className={styles.asideTeach}>
          {t('detail.teachOnCourse', {
            name: course.owner.user.formalName,
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
          {audienceLine(course, t)} · {t('detail.enrolledTag')}
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
  // 🔴 Аудит 16.08: шестнадцать действий конструктора вызывали мутацию без перехвата.
  // Преподаватель нажимал «Опубликовать урок» или «Удалить раздел», сервер отказывал — и не
  // происходило ничего. Один исполнитель на все: причина говорится одинаково и всегда.
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(run: () => Promise<unknown>) {
    setActionError(null);
    try {
      await run();
      onDone();
    } catch (error) {
      setActionError(t(failureText(error)));
    }
  }
  // Фильтр уроков и свёрнутые разделы — оба про одно (находка владельца 15.08, п.2):
  // конструктор был одной плоской простынёй, и в двадцати уроках терялись.
  const [filter, setFilter] = useState<LessonFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(course.sections.map((s) => s.id).filter((id) => id !== focusSectionId(course))),
  );

  const isDraft = course.status === 'DRAFT';
  const sectionIds = course.sections.map((s) => s.id);
  const matchesAnything = course.sections.some((s) => s.lessons.some((l) => matches(l, filter)));

  return (
    <>
      <div className={styles.cHead}>
        <div>
          <div className={styles.dSubj}>
            <span className={`${styles.pill} ${isDraft ? styles.pillDraft : ''}`}>
              {isDraft ? t('manage.pillDraft') : t('manage.pillPublished')}
            </span>{' '}
            · {t('manage.students', { count: course.enrollmentCount })} ·{' '}
            {updatedLabel(course.updatedAt, t)}
          </div>
          <h1 className={styles.pageTitle}>{course.title}</h1>
          {/* Переключение между своими курсами прямо отсюда: возвращаться в каталог, чтобы
              попасть в соседний курс, — лишний экран на каждом переходе. */}
          <CourseSwitcher currentId={course.id} />
        </div>
        <div className={styles.cHeadActions}>
          {/* 🔴 Дверь к приглашению. Без неё код существует, а позвать им некого:
              экран собран, и попасть на него неоткуда. */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/courses/${course.id}/invite`)}
          >
            {t('invite.callPupil')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil size={ICON_SM} />}
            onClick={() => setEditingCourse((v) => !v)}
          >
            {t('manage.editDescription')}
          </Button>
          {/* §57: публикация — то самое действие, после которого изменение видят другие. */}
          {isDraft ? (
            <Button
              variant="primary"
              size="sm"
              loading={publishing}
              onClick={() => void act(() => publishCourse({ variables: { id: course.id } }))}
            >
              {t('manage.publish')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={unpublishing}
              onClick={() => void act(() => unpublishCourse({ variables: { id: course.id } }))}
            >
              {t('manage.unpublish')}
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <p className={styles.formError} role="alert">
          {actionError}
        </p>
      )}

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

      {course.sections.length > 0 && (
        <div className={styles.lessonFilter} role="group" aria-label={t('manage.filterLabel')}>
          {LESSON_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.chip} ${filter === key ? styles.chipOn : ''}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {t(`manage.filter${key[0].toUpperCase()}${key.slice(1)}`)}
            </button>
          ))}
          <button
            type="button"
            className={styles.mini}
            onClick={() =>
              setCollapsed((prev) =>
                prev.size === course.sections.length
                  ? new Set()
                  : new Set(course.sections.map((s) => s.id)),
              )
            }
          >
            {collapsed.size === course.sections.length
              ? t('manage.expandAll')
              : t('manage.collapseAll')}
          </button>
        </div>
      )}

      {course.sections.length > 0 && !matchesAnything && (
        <p className={styles.empty}>{t('manage.nothingMatches')}</p>
      )}

      {course.sections.map((section, si) => {
        const lessonIds = section.lessons.map((l) => l.id);
        const shown = section.lessons.filter((l) => matches(l, filter));
        const allDraft =
          section.lessons.length > 0 && section.lessons.every((l) => l.status === 'DRAFT');
        // Свёрнут — если так решил человек; но фильтр раскрывает раздел, в котором есть
        // совпадения: иначе нажатие на «черновики» выглядело бы как «ничего не нашлось».
        const isOpen = !collapsed.has(section.id) || (filter !== 'all' && shown.length > 0);
        return (
          <div key={section.id}>
            <div className={styles.cSecTitle}>
              <button
                type="button"
                className={styles.mini}
                aria-expanded={isOpen}
                aria-label={isOpen ? t('manage.collapseSection') : t('manage.expandSection')}
                onClick={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(section.id)) next.delete(section.id);
                    else next.add(section.id);
                    return next;
                  })
                }
              >
                {isOpen ? <ChevronUp /> : <ChevronDown />}
              </button>
              <span>{t('manage.sectionHeading', { n: idx2(si + 1), title: section.title })}</span>
              <span className={styles.secCount}>
                {section.lessons.length === 0
                  ? t('manage.sectionEmpty')
                  : t('manage.sectionCounts', { count: section.lessons.length })}
              </span>
              {allDraft && <span className={`${styles.pill} ${styles.pillDraft}`}>{t('manage.pillDraft')}</span>}
              <span className={styles.cControls}>
                <button
                  type="button"
                  className={styles.mini}
                  aria-label={t('manage.moveUp')}
                  disabled={si === 0}
                  onClick={() => void act(() => reorderSections({ variables: { courseId: course.id, orderedIds: move(sectionIds, si, -1) } }))}
                >
                  <ChevronUp />
                </button>
                <button
                  type="button"
                  className={styles.mini}
                  aria-label={t('manage.moveDown')}
                  disabled={si === sectionIds.length - 1}
                  onClick={() => void act(() => reorderSections({ variables: { courseId: course.id, orderedIds: move(sectionIds, si, 1) } }))}
                >
                  <ChevronDown />
                </button>
                <SectionEditForm section={section} onDone={onDone} />
                <button
                  type="button"
                  className={styles.mini}
                  aria-label={t('manage.deleteSection')}
                  onClick={() => void act(() => deleteSection({ variables: { id: section.id } }))}
                >
                  <Trash2 />
                </button>
              </span>
            </div>

            {isOpen && shown.length === 0 && section.lessons.length > 0 && (
              <p className={styles.empty}>{t('manage.filterEmpty')}</p>
            )}

            {isOpen && shown.map((lesson) => {
              const li = section.lessons.indexOf(lesson);
              return (
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
                    {' · '}
                    {/* 🔴 «Назначить занятие» ставило галочку в состоянии кнопки и теряло её
                        при перезагрузке. По списку из двадцати уроков нельзя было понять, какие
                        уже назначены — теперь урок носит эту дату сам. */}
                    <span className={lesson.nextSessionAt ? styles.sessionOn : undefined}>
                      {lesson.nextSessionAt
                        ? t('manage.sessionAt', { when: sessionStamp(lesson.nextSessionAt) })
                        : t('manage.noSession')}
                    </span>
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
                            onClick={() => void act(() => deleteMaterial({ variables: { id: m.id } }))}
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
                        onClick={() => void act(() => publishLesson({ variables: { id: lesson.id } }))}
                      >
                        {t('manage.publishLesson')}
                      </Button>
                    )}
                    {/*
                      🔴 Постановка занятия уехала на СВОЙ экран (лист «Создание курса и
                      занятия»). Форма здесь была одним полем `datetime-local`: она ставила
                      занятие, не показывая, кого оно касается, — а именно это и решает,
                      удачное ли выбрано время. Название передаём состоянием маршрута: за ним
                      незачем ходить вторым запросом, второй источник однажды разойдётся.
                    */}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<CalendarPlus size={ICON_SM} />}
                      onClick={() =>
                        navigate(`/courses/${course.id}/lessons/${lesson.id}/schedule`, {
                          state: { title: lesson.title },
                        })
                      }
                    >
                      {t('schedule.submit')}
                    </Button>
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
                    onClick={() => void act(() => reorderLessons({ variables: { sectionId: section.id, orderedIds: move(lessonIds, li, -1) } }))}
                  >
                    <ChevronUp />
                  </button>
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={t('manage.moveDown')}
                    disabled={li === lessonIds.length - 1}
                    onClick={() => void act(() => reorderLessons({ variables: { sectionId: section.id, orderedIds: move(lessonIds, li, 1) } }))}
                  >
                    <ChevronDown />
                  </button>
                  <LessonEditForm lesson={lesson} onDone={onDone} />
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={t('manage.deleteLesson')}
                    onClick={() => void act(() => deleteLesson({ variables: { id: lesson.id } }))}
                  >
                    <Trash2 />
                  </button>
                </span>
              </div>
              );
            })}

            {isOpen && (
              <div className={styles.addRow}>
                <AddLessonForm sectionId={section.id} onDone={onDone} />
              </div>
            )}
          </div>
        );
      })}

      <div className={styles.addRow}>
        <AddSectionForm courseId={course.id} onDone={onDone} />
      </div>
    </>
  );
}

const SESSION_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function sessionStamp(iso: string): string {
  return SESSION_FORMAT.format(new Date(iso));
}

/**
 * Переключатель между своими курсами.
 *
 * Список берётся из `myCourses` — того же запроса, что кормит стартовую. Один курс — молчим:
 * выпадающий список из одного пункта это мебель.
 */
function CourseSwitcher({ currentId }: { currentId: string }) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const { data } = useMyCoursesQuery();
  const mine = data?.myCourses ?? [];
  if (mine.length < 2) return null;

  return (
    <div className={styles.switcher}>
      <label className={styles.switcherLabel} htmlFor="course-switcher">
        {t('manage.switchCourse')}
      </label>
      <Select
        id="course-switcher"
        value={currentId}
        title={t('manage.switchHint')}
        onChange={(e) => navigate(`/courses/${e.target.value}`)}
      >
        {mine.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
            {c.status === 'DRAFT' ? ` · ${t('manage.pillDraft')}` : ''}
          </option>
        ))}
      </Select>
    </div>
  );
}

/**
 * Строка аудитории — предмет, ступень и, если он что-то добавляет, вид программы.
 * «Программа» не пишется: школьный предмет и так выглядит предметом, а лишнее слово в шапке
 * читается как признак, которого у соседнего курса нет.
 */
function audienceLine(course: CourseT, t: (k: string) => string): string {
  return [course.subject, t(`level.${course.level}`), course.format !== 'PROGRAM' ? t(`format.${course.format}`) : null]
    .filter(Boolean)
    .join(' · ');
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
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(false)}>
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
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(false)}>
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
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(false)}>
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
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(false)}>
        {t('manage.cancel')}
      </Button>
    </form>
  );
}

/**
 * Материал урока — ссылка, файл или текст (находка владельца 15.08, п.3).
 *
 * Два требования владельца, и оба про честность до нажатия:
 *
 * 1. **«Ссылка» и «файл» — явно.** Раньше вид материала выбирался безымянным выпадающим
 *    списком внутри тесной строки; человек его не находил и не знал, что файл вообще можно.
 * 2. **Ограничения сказаны заранее.** Потолок и типы стоят на экране ДО выбора файла и
 *    приходят числом сервера, а не константой клиента. Отказ называет имя файла, его размер
 *    и потолок — «Файл слишком большой» не говорит ничего тому, у кого ролик на 600 МБ.
 */
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
  // Политика тянется только когда форма открыта: на курсе из двадцати уроков это двадцать
  // форм, и двадцать запросов за одним и тем же ответом были бы платой ни за что.
  const { data: policyData } = useUploadPolicyQuery({
    variables: { purpose: 'MATERIAL' },
    skip: !open,
  });
  const policy = policyData?.uploadPolicy ?? null;
  const kinds = policy ? kindKeys(policy.contentTypes).map((k) => t(`upload:kinds.${k}`)).join(', ') : '';

  /** Проверка ДО загрузки. Отказ на этом шаге стоит ноль секунд человеку. */
  function pick(chosen: File | null) {
    setError(null);
    if (!chosen) {
      setFile(null);
      return;
    }
    const refusal = refuse(chosen, policy);
    if (refusal?.reason === 'too-large') {
      setFile(null);
      setError(
        t('upload:tooLargeNamed', {
          name: chosen.name,
          size: formatBytes(refusal.size),
          max: formatBytes(refusal.max),
        }),
      );
      return;
    }
    if (refusal?.reason === 'bad-type') {
      setFile(null);
      setError(t('upload:typeNotAllowedNamed', { name: chosen.name, type: refusal.type, kinds }));
      return;
    }
    setFile(chosen);
  }

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
      {/* Вид материала — кнопками, а не выпадающим списком. Владелец требует, чтобы «ссылка»
          и «файл» были видны сразу: спрятанные в select, они не находились. */}
      <div className={styles.matTypes} role="group" aria-label={t('manage.materialType')}>
        {MATERIAL_TYPES.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`${styles.chip} ${type === kind ? styles.chipOn : ''}`}
            aria-pressed={type === kind}
            onClick={() => {
              setType(kind);
              setError(null);
            }}
          >
            {t(`manage.material${kind[0]}${kind.slice(1).toLowerCase()}`)}
          </button>
        ))}
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
              // Тот же список, что проверяет сервер: диалог и текст под ним не расходятся.
              accept={policy ? acceptAttribute(policy.contentTypes) : undefined}
              className={styles.fileInput}
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
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
      {/* 🔴 Потолок и типы — ДО выбора файла. Раньше человек узнавал их отказом после
          загрузки; для получасового ролика это пять минут ожидания ради «нельзя». */}
      {type === 'FILE' && policy && (
        <p className={styles.matLimits}>
          {t('upload:limits', { size: formatBytes(policy.maxBytes), kinds })}
        </p>
      )}
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

/** Порядок листа: ссылка и файл первыми — это то, чем пользуются; текст третьим. */
const MATERIAL_TYPES: MaterialType[] = ['LINK', 'FILE', 'TEXT'];

function EditCourseForm({ course, onDone }: { course: CourseT; onDone: () => void }) {
  const { t } = useTranslation('courses');
  const [title, setTitle] = useState(course.title);
  const [subject, setSubject] = useState(course.subject);
  const [level, setLevel] = useState<CourseLevel>(course.level);
  const [format, setFormat] = useState<CourseFormat>(course.format);
  const [description, setDescription] = useState(course.description ?? '');
  const [updateCourse, { loading }] = useUpdateCourseMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;
    await updateCourse({
      variables: { id: course.id, input: { title, subject, level, format, description } },
    });
    onDone();
  }

  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <TextField label={t('create.name')} value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextField label={t('create.subject')} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <AudienceFields level={level} format={format} onLevel={setLevel} onFormat={setFormat} />
      <TextField label={t('create.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Button type="submit" variant="secondary" size="sm" loading={loading}>
        {t('manage.save')}
      </Button>
    </form>
  );
}
