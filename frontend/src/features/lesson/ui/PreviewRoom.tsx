/**
 * TEMPORARY preview-only live room (VITE_PREVIEW=1).
 *
 * LiveKit + a real backend can't run in a $0 browser demo, so the preview room is a pure
 * display shell: NO getUserMedia (no camera), NO LiveKit connection, NO subscription — just
 * placeholder participant tiles (avatar initials) with synthetic, on-device-only attention
 * for the teacher (per v3: the student never sees their own metrics). The on-device privacy
 * indicator stays in place. Remove with the demo layer before real launch.
 */
import { ICON_SM } from '@/shared/ui/iconSizes';
import { BarChart3, Radio, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AttentionChart, PrivacyIndicator } from '@/seedum';
import { CMF } from '@/seedum/cmf/cmfConfig';
import { attentionPoints } from '@/shared/demo/resolveDemoOperation';
import { cohort, users } from '@/shared/demo/demoData';
import { demoRole } from '@/shared/demo/demoRole';
import { Avatar, Button } from '@/shared/ui';

import { initialsOf } from '../../cabinet/ui/initials';
import { BoardCanvas } from '@/features/board';
import { TestScene } from '@/features/exercises';
import { DictionaryPane } from '@/features/dictionary';
import { LessonChatPane, SummaryScene } from '@/features/summary';

import frame from './roomwindow.module.css';
import styles from './liveroom.module.css';
import { ProjectorCast } from './ProjectorCast';
import { type Participant } from '../classLayout';
import { ClassPane } from './ClassPane';
import { type Pane, RoomFrame, type Scene } from './RoomFrame';
import vr from './videoroom.module.css';

/** Демо-состав окна «Класс» — те же люди, что и в остальной демо-проекции комнаты. */
const DEMO_TEACHER: Participant = {
  id: 'teacher',
  name: 'Преподаватель',
  initials: 'ИС',
  speaking: true,
};
const DEMO_SELF: Participant = { id: 'self', name: 'Ученик 1', initials: 'СИ', isSelf: true };
const DEMO_PUPILS: Participant[] = [
  { id: 'p1', name: 'Ученик 1', initials: 'СИ', handRaised: true },
  { id: 'p2', name: 'Ученик 2', initials: 'ВС' },
  { id: 'p3', name: 'Ученик 3', initials: 'ТИ', speaking: true },
  { id: 'p4', name: 'Ученик 4', initials: 'КО' },
  { id: 'p5', name: 'Ученик 5', initials: 'ЛК' },
  { id: 'p6', name: 'Ученик 6', initials: 'МВ' },
];

/** The preview wears the SAME sheet-02 frame as the real room — otherwise the showcase
 *  would keep showing a composition the product no longer has. */
function Shell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  const { t } = useTranslation(['room', 'seedum']);
  const [scene, setScene] = useState<Scene>('board');
  const [pane, setPane] = useState<Pane | null>(null);
  const isTeacher = demoRole() === 'teacher';
  // Демо-проекция окна «Класс» (лист D1): роль решает, кого показывают. Преподаватель видит
  // группу; ученик по решению Р5.1 видит преподавателя и своё превью — и больше никого.
  const pupils = isTeacher ? DEMO_PUPILS : [DEMO_SELF];

  return (
    <RoomFrame
      title="English A2 · Unit 4 — Travel"
      meta={subtitle}
      isLive
      stateTag={t('room:live.now')}
      scene={scene}
      onScene={setScene}
      pane={pane}
      onPane={setPane}
      sessionId="ses-algebra-live"
      leaveLabel={isTeacher ? t('room:leaveTeacher') : t('room:leave')}
      controls={
        <>
          {isTeacher && <SourceSwitcher />}
          {isTeacher && <ProjectorCast sessionId="ses-algebra-live" />}
          <PrivacyIndicator />
        </>
      }
      classPane={() => (
        <ClassPane
          teacher={DEMO_TEACHER}
          pupils={pupils}
          isTeacher={isTeacher}
          ratio={22}
          attention={null}
          spark={[]}
        />
      )}
      panel={<PreviewPane pane={pane ?? 'people'} />}
      sceneBody={
        scene === 'board' ? (
        <BoardCanvas lessonId="les-1-12" />
      ) : scene === 'test' ? (
        <TestScene lessonId="les-1-12" isTeacher={isTeacher} />
      ) : scene === 'summary' ? (
        <SummaryScene sessionId="ses-algebra-live" isTeacher={isTeacher} />
        ) : (
          <p className={frame.sceneSoon}>{t(`room:scene.${scene}Soon`)}</p>
        )
      }
    >
      {children}
    </RoomFrame>
  );
}

/** Sheet 02 puts all three sources in the teacher's header. In the preview they only show
 *  the control — the preview has no camera and never touches getUserMedia. */
function SourceSwitcher() {
  const { t } = useTranslation('room');
  const [source, setSource] = useState<'camera' | 'screen' | 'roomCamera'>('camera');
  return (
    <span className={frame.sources} role="group" aria-label={t('source.label')}>
      {(['camera', 'screen', 'roomCamera'] as const).map((id) => (
        <button
          key={id}
          type="button"
          className={frame.sourceBtn}
          aria-pressed={source === id}
          onClick={() => setSource(id)}
        >
          {t(`source.${id}`)}
        </button>
      ))}
    </span>
  );
}

function PreviewPane({ pane }: { pane: Pane }) {
  const { t } = useTranslation('room');
  if (pane === 'dict') {
    return (
      <DictionaryPane
        lessonId="les-1-12"
        sessionId="ses-algebra-live"
        isTeacher={demoRole() === 'teacher'}
      />
    );
  }
  if (pane === 'chat') return <LessonChatPane sessionId="ses-algebra-live" />;
  if (pane === 'mats') {
    return (
      <>
        <p className={frame.paneTitle}>{t('mats.title')}</p>
        <p className={frame.paneEmpty}>{t('mats.empty')}</p>
      </>
    );
  }
  return (
    <>
      <p className={frame.paneTitle}>{t('people.title')}</p>
      {cohort.slice(0, 6).map(({ user }) => (
        <div className={frame.paneRow} key={user.id}>
          <span className={frame.paneName}>
            {user.formalName}
          </span>
          <span className={frame.paneMeta}>
            {user.id === users.maria.id ? t('people.teacher') : ''}
          </span>
        </div>
      ))}
    </>
  );
}

function Tile({
  initials,
  name,
  attention,
  alert,
}: {
  initials: string;
  name: string;
  attention?: number;
  alert?: boolean;
}) {
  const { t } = useTranslation('lesson');
  return (
    <div className={vr.tile} data-alert={!!alert} role="img" aria-label={name}>
      <span className={vr.camOff} aria-hidden="true">
        <Avatar initials={initials} size="lg" />
      </span>
      <span className={vr.name}>
        {name}
        {attention != null && <span className={vr.nameValue}>· {attention}</span>}
      </span>
      {alert && (
        <span className={vr.tileWarn} aria-hidden="true">
          {t('focus.needsAttention')}
        </span>
      )}
    </div>
  );
}

/** Teacher: publishes (mock) + watches synthetic class attention on the tiles. */
function TeacherPreview() {
  const { t } = useTranslation(['seedum', 'lesson']);
  const [showReport, setShowReport] = useState(false);
  // Gentle, deterministic drift so the values feel live — purely local, no network.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 2_500);
    return () => clearInterval(iv);
  }, []);

  const students = cohort.map((c, i) => {
    const drift = ((tick + i) % 5) - 2; // -2..+2, deterministic
    const value = Math.max(0, Math.min(100, c.attention + drift));
    return {
      id: c.user.id,
      initials: initialsOf(c.user.firstName, c.user.lastName),
      name: c.user.firstName,
      value,
    };
  });
  const classAvg = Math.round(students.reduce((a, s) => a + s.value, 0) / students.length);
  const points = useMemo(() => attentionPoints().map((p) => p.value), []);
  const report = { average: classAvg, peak: Math.max(...points), low: Math.min(...points), points };

  return (
    <Shell subtitle={t('room.teacherSub')}>
      <div className={`${styles.card} ${frame.stripGrow}`} style={{ position: 'relative' }}>
        <p className={styles.liveBadge} role="status">
          <Radio size={13} aria-hidden="true" /> {t('lesson:liveBadgeTeacher')}
        </p>
        <div className={vr.tiles} data-count={students.length}>
          {students.map((s) => (
            <Tile
              key={s.id}
              initials={s.initials}
              name={s.name}
              attention={s.value}
              alert={s.value < CMF.liveAttentionAlertBelow}
            />
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.reportHead}>
          <span className={styles.classAvgLabel}>{t('room.classAvg', { n: classAvg })}</span>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            icon={<BarChart3 size={ICON_SM} />}
            onClick={() => setShowReport(true)}
          >
            {t('room.report')}
          </Button>
        </div>
        {showReport && (
          <div className={styles.report}>
            <div className={styles.reportStats}>
              <span>{t('room.average', { n: report.average })}</span>
              <span>{t('room.peak', { n: report.peak })}</span>
              <span>{t('room.low', { n: report.low })}</span>
            </div>
            <AttentionChart values={report.points} />
          </div>
        )}
      </div>
    </Shell>
  );
}

/**
 * Student — Р5.1 (owner decision 2026-08-13): **the teacher and their own preview, and that
 * is all.** No classmates, and the reason is said out loud rather than left as a mystery.
 *
 * The lesson is hosted from the teacher's machine, and «everyone sees everyone» costs them
 * 30 Mbit/s outbound at eight pupils — a home connection lies down. This costs 4.3
 * (`R5_DESKTOP_HOST_BUDGET.md` §3). Also, by design since v3: a pupil does not see their own
 * attention numbers.
 */
function StudentPreview() {
  const { t } = useTranslation(['seedum', 'lesson']);
  const me = cohort.find((c) => c.user.id === users.sasha.id);
  return (
    <Shell subtitle={t('room.studentSub')}>
      <div className={styles.card} style={{ position: 'relative' }}>
        <p className={styles.liveBadge} role="status">
          <Radio size={13} aria-hidden="true" /> {t('lesson:liveBadge')}
        </p>
        <div className={vr.tiles} data-count={2}>
          <Tile initials={initialsOf('Преподаватель', 'Преподаватель')} name="Преподаватель" />
          <Tile
            initials={initialsOf(me?.user.firstName ?? 'Ученик', me?.user.lastName ?? '1')}
            name={t('lesson:you')}
          />
        </div>
        <p className={styles.privacyFootnote}>{t('lesson:strip.classmatesHidden')}</p>
        <p className={styles.privacyFootnote}>
          <ShieldCheck size={13} /> {t('room.studentSub')}
        </p>
      </div>
    </Shell>
  );
}

/** Preview live room, role-aware. Display-only; no camera, no LiveKit, no egress. */
export function PreviewRoom() {
  return demoRole() === 'teacher' ? <TeacherPreview /> : <StudentPreview />;
}
