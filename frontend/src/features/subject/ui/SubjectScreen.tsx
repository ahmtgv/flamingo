import { LogOut, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { ChatDock } from '@/features/chat';
import { toggleTheme } from '@/app/uiSlice';
import { useLogout } from '@/app/useLogout';
import {
  type SubjectCabinetQuery,
  useRemoveSavedItemMutation,
  useSaveItemMutation,
  useSubjectCabinetQuery,
} from '@/entities/graphql/generated';
import { Button, ErrorState, Logo } from '@/shared/ui';
import { ICON_MD } from '@/shared/ui/iconSizes';

import styles from './subject.module.css';
import { ProgrammeEditor } from './ProgrammeEditor';
import { ProgressPanel } from './ProgressPanel';
import { QuietCorner } from './QuietCorner';
import { TasksPanel } from './TasksPanel';
import { whenParts } from './subjectFormat';

type Cabinet = SubjectCabinetQuery['subjectCabinet'];
type Lesson = Cabinet['sections'][number]['lessons'][number];
type Material = Cabinet['materials'][number];
type Source = Cabinet['sources'][number];

/** The four tabs of sheet 01, the same for every role — only their filling differs. */
const TABS = ['lessons', 'materials', 'tasks', 'progress'] as const;
type Tab = (typeof TABS)[number];

/**
 * Subject cabinet — atlas sheet 01, where «Мои предметы» leads.
 *
 * One frame for all three roles: subject header → tabs → work on the left, rail on the right.
 * A pupil sees a school subject, a cadet the same course at their own pace, a teacher the
 * same subject from the teaching side — the structure never moves, only what fills it.
 *
 * Everything arrives as data (progress marks, counts, kinds, timestamps) and is worded here
 * through i18n, so the screen stays translatable.
 */
export function SubjectScreen() {
  const { t } = useTranslation(['subject', 'common']);
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const logout = useLogout();
  const goingDark = theme === 'light';

  const [tab, setTab] = useState<Tab>('lessons');
  const [device, setDevice] = useState<Lesson | null>(null);
  const [editing, setEditing] = useState(false);

  const { data, loading, error, refetch } = useSubjectCabinetQuery({
    variables: { courseId },
    skip: !courseId,
  });
  const [saveItem] = useSaveItemMutation();
  const [removeSavedItem] = useRemoveSavedItemMutation();

  const cab = data?.subjectCabinet;
  // A course the viewer has no relation to comes back as a GraphQL error (the server does not
  // confirm it exists). A transport failure is a different thing and keeps its retry.
  const denied = !cab && (error?.graphQLErrors.length ?? 0) > 0;
  const kind = cab?.profileKind ?? 'PUPIL';
  const isTeacher = kind === 'TEACHER';
  const isCadet = kind === 'CADET';
  const now = new Date();

  async function keep(item: Material, note: string, watchLater: boolean) {
    await saveItem({
      variables: {
        input: {
          courseId,
          lessonId: item.lessonId ?? null,
          materialId: item.id,
          note,
          kind: watchLater ? 'WATCH_LATER' : 'SAVED',
        },
      },
    });
    await refetch();
  }

  async function keepSource(src: Source, note: string, watchLater: boolean) {
    await saveItem({
      variables: {
        input: {
          courseId,
          title: src.name,
          url: src.url,
          sourceName: src.sourceName,
          note,
          kind: watchLater ? 'WATCH_LATER' : 'SAVED',
        },
      },
    });
    await refetch();
  }

  async function drop(savedId: string) {
    await removeSavedItem({ variables: { id: savedId } });
    await refetch();
  }

  /** The programme line under the subject name — who teaches it and in what context. */
  function meta(c: Cabinet): string {
    if (isTeacher) {
      return t('head.teacherMeta', {
        institution: c.institutionName ?? '',
        count: c.studentCount ?? 0,
      });
    }
    if (isCadet) return t('head.cadetMeta', { teacher: c.teacherName ?? '' });
    const common = { institution: c.institutionName ?? '', teacher: c.teacherName ?? '' };
    return c.groupName
      ? t('head.pupilMeta', { ...common, group: c.groupName })
      : t('head.pupilMetaNoGroup', common);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/start')}
          aria-label="Flamingo"
        >
          <Logo />
        </button>
        <div className={styles.navSpace}>
          {/* Та же смесь, второй экран: подпись «Источники», адрес — каталог курсов. */}
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => navigate('/источники')}
          >
            {t('rail.sources')}
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch(toggleTheme())}
            aria-label={goingDark ? t('common:theme.toDark') : t('common:theme.toLight')}
          >
            {goingDark ? <Moon size={ICON_MD} /> : <Sun size={ICON_MD} />}
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => void logout()}
            aria-label={t('common:actions.signOut')}
          >
            <LogOut size={ICON_MD} />
          </button>
        </div>
      </header>

      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={() => navigate('/start')}>
          {t(isTeacher ? 'back.teacher' : isCadet ? 'back.cadet' : 'back.pupil')}
        </button>

        {loading && !cab ? (
          <Skeleton />
        ) : denied ? (
          // The server answered and refused: this course is not ours to open. Retrying would
          // just ask again, so the screen says so instead of offering a pointless retry.
          <NotFound onBack={() => navigate('/start')} />
        ) : error && !cab ? (
          <ErrorState text={t('error')} onRetry={() => void refetch()} />
        ) : !cab ? (
          <NotFound onBack={() => navigate('/start')} />
        ) : (
          <>
            <div className={styles.head}>
              <div>
                <h1 className={styles.headName}>{cab.title}</h1>
                <p className={styles.headMeta}>
                  {meta(cab)}
                  {cab.lessonCount > 0 && ` · ${t('head.lessons', { count: cab.lessonCount })}`}
                </p>
              </div>
              <div className={styles.headPct}>
                <span className={styles.pctNum}>{cab.progressPct}%</span>
                <span className={styles.pctCap}>
                  {t(isTeacher ? 'head.doneCapTeacher' : 'head.doneCap')}
                </span>
              </div>
            </div>
            <div
              className={styles.headBar}
              role="progressbar"
              aria-valuenow={cab.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('head.progressLabel')}
            >
              <i style={{ width: `${cab.progressPct}%` }} />
            </div>

            <div className={styles.tabs} role="tablist" aria-label={cab.title}>
              {TABS.map((id) => {
                const label =
                  id === 'tasks' && isTeacher
                    ? t('tabs.tasksTeacher')
                    : id === 'progress' && isTeacher
                      ? t('tabs.progressTeacher')
                      : t(`tabs.${id}`);
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`subject-tab-${id}`}
                    aria-controls={`subject-panel-${id}`}
                    aria-selected={tab === id}
                    className={styles.tab}
                    onClick={() => setTab(id)}
                  >
                    {label}
                    {id === 'materials' && cab.materials.length + cab.savedMaterials.length > 0 && (
                      <span className={styles.cnt}>
                        {cab.materials.length + cab.savedMaterials.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={styles.cols}>
              <main
                role="tabpanel"
                id={`subject-panel-${tab}`}
                aria-labelledby={`subject-tab-${tab}`}
              >
                {tab === 'lessons' ? (
                  <Lessons
                    cab={cab}
                    isTeacher={isTeacher}
                    isCadet={isCadet}
                    now={now}
                    editing={editing}
                    onToggleEdit={() => setEditing((v) => !v)}
                    onChanged={() => refetch()}
                    onOpen={(lesson) => {
                      if (lesson.kind === 'EXTERNAL_DEVICE') setDevice(lesson);
                      else if (lesson.sessionId) navigate(`/sessions/${lesson.sessionId}/room`);
                      else navigate(`/lessons/${lesson.id}/homework`);
                    }}
                  />
                ) : tab === 'materials' ? (
                  <Materials
                    cab={cab}
                    onKeep={(m, note, later) => void keep(m, note, later)}
                    onDrop={(id) => void drop(id)}
                  />
                ) : tab === 'tasks' ? (
                  <TasksPanel
                    courseId={courseId}
                    isTeacher={isTeacher}
                    teacherName={cab.teacherName ?? null}
                    scale={cab.gradingScale}
                  />
                ) : (
                  <ProgressPanel courseId={courseId} isTeacher={isTeacher} />
                )}
              </main>

              <aside className={styles.rail}>
                <NextAction
                  cab={cab}
                  isTeacher={isTeacher}
                  isCadet={isCadet}
                  now={now}
                  onOpen={(lesson) => {
                    if (lesson.kind === 'EXTERNAL_DEVICE') setDevice(lesson);
                    else if (lesson.sessionId) navigate(`/sessions/${lesson.sessionId}/room`);
                    else navigate(`/lessons/${lesson.id}/homework`);
                  }}
                />
                <Who cab={cab} isTeacher={isTeacher} // Лист 01 обещает журнал — теперь он и открывается (наряд 36 §5).
                  onJournal={() => navigate(`/journal/${courseId}`)} />
                <Sources
                  sources={cab.sources}
                  onKeep={(s, note, later) => void keepSource(s, note, later)}
                  onDrop={(id) => void drop(id)}
                  onAll={() => navigate('/источники')}
                />
              </aside>
            </div>
          </>
        )}
      </div>

      {device && <DeviceStub lesson={device} onClose={() => setDevice(null)} />}

      {/* The chat stays a window, never a tab (sheet 01) — and on a subject it opens on
          that subject's conversation. */}
      <ChatDock courseId={courseId} />
    </div>
  );
}

/** When a lesson sits — the bucket comes from a pure helper, the wording from i18n. */
function When({ iso, now, className }: { iso: string; now: Date; className: string }) {
  const { t } = useTranslation('subject');
  const parts = whenParts(iso, now);
  return (
    <span className={className}>
      {t(`when.${parts.bucket}`, { time: parts.time, date: parts.date })}
    </span>
  );
}

/* --- lessons ------------------------------------------------------------------- */

function Lessons({
  cab,
  isTeacher,
  isCadet,
  now,
  editing,
  onToggleEdit,
  onChanged,
  onOpen,
}: {
  cab: Cabinet;
  isTeacher: boolean;
  isCadet: boolean;
  now: Date;
  editing: boolean;
  onToggleEdit: () => void;
  onChanged: () => Promise<unknown>;
  onOpen: (lesson: Lesson) => void;
}) {
  const { t } = useTranslation('subject');
  // A mark reads in the course's own scale (owner decision 2026-08-13); the number stored
  // is the same either way.
  const scale = cab.gradingScale;
  if (cab.sections.length === 0) return <p className={styles.empty}>{t('lessons.empty')}</p>;

  return (
    <>
      {/* Owner answer 3: the teacher reshapes the programme here, not on another screen. */}
      {isTeacher && (
        <div className={styles.editBar}>
          <Button size="sm" variant={editing ? 'primary' : 'secondary'} onClick={onToggleEdit}>
            {t(editing ? 'edit.done' : 'edit.start')}
          </Button>
          {editing && <span className={styles.editHint}>{t('edit.order')}</span>}
        </div>
      )}
      {cab.sections.map((section) => (
        <section key={section.id} className={styles.sect}>
          <div className={styles.sectHead}>
            <h2 className={styles.sectName}>{section.title}</h2>
            <span className={styles.sectOf}>
              {t('lessons.ofDone', { done: section.doneLessons, total: section.totalLessons })}
            </span>
          </div>
          {editing && isTeacher ? (
            <ProgrammeEditor section={section} onChanged={onChanged} />
          ) : (
            section.lessons.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                className={`${styles.les} ${lesson.progress === 'DONE' ? styles.lesDone : ''}`}
                onClick={() => onOpen(lesson)}
              >
                <span
                  className={`${styles.st} ${
                    lesson.progress === 'DONE'
                      ? styles.stDone
                      : lesson.progress === 'CURRENT'
                        ? styles.stNow
                        : ''
                  }`}
                  aria-hidden="true"
                >
                  {lesson.progress === 'DONE' ? '✓' : lesson.progress === 'CURRENT' ? '›' : ''}
                </span>
                <span>
                  <span className={styles.lesName}>
                    {t('lessons.ordinal', { n: lesson.orderLabel })} · {lesson.title}
                  </span>
                  {lesson.subtitle && <span className={styles.lesSub}>{lesson.subtitle}</span>}
                  <span className={styles.lesTags}>
                    {lesson.kind === 'EXTERNAL_DEVICE' && (
                      <span className={styles.chip}>{t('lessons.chip.device')}</span>
                    )}
                    {lesson.isLive && (
                      <span className={`${styles.chip} ${styles.chipLive}`}>
                        {t('lessons.chip.live')}
                      </span>
                    )}
                    {lesson.materialCount > 0 && (
                      <span className={styles.chip}>
                        {t('lessons.chip.materials', { count: lesson.materialCount })}
                      </span>
                    )}
                    {lesson.hasHomework && (
                      <span className={styles.chip}>{t('lessons.chip.homework')}</span>
                    )}
                    {/* Screen readers get the state in words; sighted users get the ✓ / › mark. */}
                    <span className={styles.srOnly}>
                      {lesson.progress === 'DONE'
                        ? t('lessons.done')
                        : lesson.progress === 'AHEAD'
                          ? t('lessons.ahead')
                          : t('lessons.resume')}
                    </span>
                  </span>
                </span>
                <span className={styles.lesRight}>
                  {lesson.sessionAt && (
                    <When className={styles.lesWhen} iso={lesson.sessionAt} now={now} />
                  )}
                  {isTeacher && lesson.groupSize != null && lesson.completedBy != null ? (
                    <span className={styles.lesWhen}>
                      {t('lessons.groupDone', {
                        done: lesson.completedBy,
                        total: lesson.groupSize,
                      })}
                    </span>
                  ) : (
                    lesson.grade != null && (
                      <span className={styles.lesGrade}>
                        {t(scale === 'PERCENT' ? 'lessons.gradePercent' : 'lessons.gradeFive', {
                          value: lesson.grade,
                        })}
                      </span>
                    )
                  )}
                  {isCadet && lesson.progress === 'CURRENT' && (
                    <span className={styles.lesWhen}>{t('lessons.resume')}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </section>
      ))}
    </>
  );
}

/* --- materials ------------------------------------------------------------------ */

function MaterialRow({
  item,
  personal,
  onKeep,
  onDrop,
}: {
  item: Material;
  /** Personal block: my note and my «посмотреть позднее» mark belong here, never in the
   *  teacher's block — that is the split the sheet insists on. */
  personal?: boolean;
  onKeep: (m: Material, note: string, watchLater: boolean) => void;
  onDrop: (savedId: string) => void;
}) {
  const { t } = useTranslation('subject');
  const kindLabel = item.type ? t(`materials.type.${item.type}`, { defaultValue: '' }) : '';
  return (
    <div className={styles.mat}>
      <span className={styles.matKind}>{kindLabel}</span>
      <span>
        {item.url ? (
          <a className={styles.matName} href={item.url} target="_blank" rel="noreferrer noopener">
            <span>{item.title}</span>
            {/* The licence keeps these on their own site — say so to screen readers too. */}
            <span className={styles.srOnly}> {t('materials.newTab')}</span>
          </a>
        ) : (
          <span className={styles.matName}>{item.title}</span>
        )}
        {item.subtitle && <span className={styles.matSub}>{item.subtitle}</span>}
        {item.fromLabel && <span className={styles.matFrom}>{item.fromLabel}</span>}
        {personal && item.note && <p className={styles.matNote}>{item.note}</p>}
      </span>
      <span className={styles.matRight}>
        {personal && item.savedKind === 'WATCH_LATER' && (
          <span className={styles.matFrom}>{t('materials.watchLater')}</span>
        )}
        <QuietCorner
          savedId={item.savedId}
          shareUrl={item.url}
          onSave={(note, later) => onKeep(item, note, later)}
          onRemove={() => item.savedId && onDrop(item.savedId)}
        />
      </span>
    </div>
  );
}

function Materials({
  cab,
  onKeep,
  onDrop,
}: {
  cab: Cabinet;
  onKeep: (m: Material, note: string, watchLater: boolean) => void;
  onDrop: (savedId: string) => void;
}) {
  const { t } = useTranslation('subject');
  return (
    <>
      {/* The split is deliberate (sheet 01): the teacher's authority never mixes with
          personal finds, so these are two blocks, never one merged list. */}
      <section className={styles.block} aria-labelledby="mat-teacher">
        <div className={styles.blockHead}>
          <h2 className={styles.blockTitle} id="mat-teacher">
            {t('materials.fromTeacher')}
          </h2>
        </div>
        {cab.materials.length === 0 ? (
          <p className={styles.empty}>{t('materials.emptyTeacher')}</p>
        ) : (
          cab.materials.map((m) => (
            <MaterialRow key={m.id} item={m} onKeep={onKeep} onDrop={onDrop} />
          ))
        )}
      </section>

      <section className={styles.block} aria-labelledby="mat-mine">
        <div className={styles.blockHead}>
          <h2 className={styles.blockTitle} id="mat-mine">
            {t('materials.mine')}
          </h2>
        </div>
        {cab.savedMaterials.length === 0 ? (
          <p className={styles.empty}>{t('materials.emptyMine')}</p>
        ) : (
          cab.savedMaterials.map((m) => (
            <MaterialRow key={m.id} item={m} personal onKeep={onKeep} onDrop={onDrop} />
          ))
        )}
      </section>
    </>
  );
}

/* --- rail --------------------------------------------------------------------- */

function NextAction({
  cab,
  isTeacher,
  isCadet,
  now,
  onOpen,
}: {
  cab: Cabinet;
  isTeacher: boolean;
  isCadet: boolean;
  now: Date;
  onOpen: (lesson: Lesson) => void;
}) {
  const { t } = useTranslation('subject');
  const next = cab.nextLesson;
  return (
    <section className={styles.card} aria-labelledby="rail-next">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="rail-next">
          {t('rail.next')}
        </h2>
      </div>
      {!next ? (
        <p className={styles.empty}>{t('rail.nothingNext')}</p>
      ) : (
        <>
          <p className={styles.nextName}>
            {t('lessons.ordinal', { n: next.orderLabel })} · {next.title}
          </p>
          {next.sessionAt && <When className={styles.nextWhen} iso={next.sessionAt} now={now} />}
          <div className={styles.nextAct}>
            <Button size="sm" onClick={() => onOpen(next)}>
              {next.kind === 'EXTERNAL_DEVICE'
                ? t('lessons.openDevice')
                : isTeacher
                  ? t('lessons.start')
                  : isCadet && next.progress === 'CURRENT'
                    ? t('lessons.resume')
                    : t('lessons.enter')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function Who({
  cab,
  isTeacher,
  onJournal,
}: {
  cab: Cabinet;
  isTeacher: boolean;
  onJournal: () => void;
}) {
  const { t } = useTranslation('subject');
  return (
    <section className={styles.card} aria-labelledby="rail-who">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="rail-who">
          {t(isTeacher ? 'rail.whoTeacher' : 'rail.who')}
        </h2>
      </div>
      {isTeacher ? (
        <div className={styles.who}>
          <span className={styles.whoName}>{cab.groupName ?? cab.institutionName ?? ''}</span>
          <span className={styles.whoRole}>
            {t('rail.students', { count: cab.studentCount ?? 0 })}
          </span>
          <div className={styles.nextAct}>
            <Button size="sm" variant="secondary" onClick={onJournal}>
              {t('rail.openJournal')}
            </Button>
          </div>
        </div>
      ) : cab.teacherName ? (
        <div className={styles.who}>
          <span className={styles.whoName}>{cab.teacherName}</span>
          {/* A school subject names the institution; a self-paced course names the role. */}
          <span className={styles.whoRole}>{cab.institutionName ?? t('rail.courseTeacher')}</span>
        </div>
      ) : (
        <p className={styles.empty}>—</p>
      )}
    </section>
  );
}

function Sources({
  sources,
  onKeep,
  onDrop,
  onAll,
}: {
  sources: readonly Source[];
  onKeep: (s: Source, note: string, watchLater: boolean) => void;
  onDrop: (savedId: string) => void;
  onAll: () => void;
}) {
  const { t } = useTranslation('subject');
  const inLesson = sources.filter((s) => s.inLesson);
  const recommended = sources.filter((s) => !s.inLesson);

  const row = (s: Source) => (
    <div key={s.id} className={styles.src}>
      <div className={styles.srcTop}>
        <span className={styles.srcInst}>{s.sourceName}</span>
        <span>
          {s.url ? (
            <a className={styles.srcName} href={s.url} target="_blank" rel="noreferrer noopener">
              <span>{s.name}</span>
              <span className={styles.srOnly}> {t('materials.newTab')}</span>
            </a>
          ) : (
            <span className={styles.srcName}>{s.name}</span>
          )}
          {s.note && <span className={styles.srcNote}>{s.note}</span>}
        </span>
      </div>
      <QuietCorner
        className={styles.srcCorner}
        savedId={s.savedId}
        shareUrl={s.url}
        onSave={(note, later) => onKeep(s, note, later)}
        onRemove={() => s.savedId && onDrop(s.savedId)}
      />
    </div>
  );

  return (
    <section className={styles.card} aria-labelledby="rail-src">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="rail-src">
          {t('rail.sources')}
        </h2>
        <button type="button" className={styles.linkish} onClick={onAll}>
          {t('rail.allSources')}
        </button>
      </div>
      <div className={styles.zone}>
        <p className={styles.zoneWho}>{t('rail.inLesson')}</p>
        {inLesson.length === 0 ? (
          <p className={styles.empty}>{t('materials.emptyTeacher')}</p>
        ) : (
          inLesson.map(row)
        )}
      </div>
      <div className={styles.zone}>
        <p className={styles.zoneWho}>{t('rail.recommended')}</p>
        {recommended.length === 0 ? (
          <p className={styles.empty}>{t('rail.recommendedEmpty')}</p>
        ) : (
          recommended.map(row)
        )}
      </div>
    </section>
  );
}

/* --- states and stubs ------------------------------------------------------------ */

/** Owner answer 1 on sheet 01: a telescope lesson stays a lesson in the programme, but doing
 *  it opens the device's own page. That page is the shared ExternalDevice screen and lands in
 *  its own phase — until then the transition says so plainly instead of dead-ending. */
function DeviceStub({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { t } = useTranslation('subject');
  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-labelledby="dev-title">
      <div className={styles.dialog}>
        <h2 className={styles.dialogTitle} id="dev-title">
          {t('device.title')}
        </h2>
        <p className={styles.dialogBody}>{t('device.body')}</p>
        {lesson.deviceKey && (
          <p className={styles.dialogKey}>{t('device.key', { key: lesson.deviceKey })}</p>
        )}
        <div className={styles.dialogFoot}>
          <Button size="sm" onClick={onClose} autoFocus>
            {t('device.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('subject');
  return (
    <div className={styles.empty}>
      <h1 className={styles.headName}>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <div className={styles.nextAct}>
        <Button size="sm" onClick={onBack}>
          {t('notFound.cta')}
        </Button>
      </div>
    </div>
  );
}

function Skeleton() {
  const { t } = useTranslation('common');
  return (
    <div aria-busy="true" aria-label={t('actions.loading')}>
      <div className={`${styles.sk} ${styles.skHead}`} />
      <div className={styles.cols}>
        <div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`${styles.sk} ${styles.skLine}`} />
          ))}
        </div>
        <div>
          {[0, 1].map((i) => (
            <div key={i} className={`${styles.sk} ${styles.skLine}`} style={{ height: 92 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
