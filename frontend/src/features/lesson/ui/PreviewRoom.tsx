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
import frame from './roomframe.module.css';
import styles from './liveroom.module.css';
import { ProjectorCast } from './ProjectorCast';
import { type Pane, RoomFrame, type Scene } from './RoomFrame';
import vr from './videoroom.module.css';

/** The preview wears the SAME sheet-02 frame as the real room — otherwise the showcase
 *  would keep showing a composition the product no longer has. */
function Shell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  const { t } = useTranslation(['room', 'seedum']);
  const [scene, setScene] = useState<Scene>('board');
  const [pane, setPane] = useState<Pane>('people');
  const isTeacher = demoRole() === 'teacher';

  return (
    <RoomFrame
      title="English A2 · Unit 4 — Travel"
      meta={subtitle}
      isLive
      scene={scene}
      onScene={setScene}
      pane={pane}
      onPane={setPane}
      sessionId="ses-algebra-live"
      actions={
        <>
          {isTeacher && <SourceSwitcher />}
          {isTeacher && <ProjectorCast sessionId="ses-algebra-live" />}
          <PrivacyIndicator />
        </>
      }
      strip={children}
      panel={<PreviewPane pane={pane} />}
    >
      <p className={frame.sceneSoon}>{t(`room:scene.${scene}Soon`)}</p>
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
  if (pane === 'dict') return <p className={frame.paneEmpty}>{t('dictSoon')}</p>;
  if (pane === 'chat') return <p className={frame.paneEmpty}>{t('chatSoon')}</p>;
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
            {user.firstName} {user.lastName}
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

/** Student: sees the teacher + classmates as tiles, and — by design (v3) — NOT their own metrics. */
function StudentPreview() {
  const { t } = useTranslation(['seedum', 'lesson']);
  // Teacher tile + classmates (everyone in the cohort except Саша, the student persona).
  const classmates = cohort.filter((c) => c.user.id !== users.sasha.id);
  return (
    <Shell subtitle={t('room.studentSub')}>
      <div className={styles.card} style={{ position: 'relative' }}>
        <p className={styles.liveBadge} role="status">
          <Radio size={13} aria-hidden="true" /> {t('lesson:liveBadge')}
        </p>
        <div className={vr.tiles} data-count={classmates.length + 1}>
          <Tile initials={initialsOf('Мария', 'Петровна')} name="Мария Петровна" />
          {classmates.map((c) => (
            <Tile
              key={c.user.id}
              initials={initialsOf(c.user.firstName, c.user.lastName)}
              name={c.user.firstName}
            />
          ))}
        </div>
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
