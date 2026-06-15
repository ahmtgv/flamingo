import { ArrowLeft, BarChart3, Radio, ShieldCheck, Square, Video } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  useAttentionUpdatesSubscription,
  useMeQuery,
  useReportAttentionMutation,
  useSessionAttentionLazyQuery,
} from '@/entities/graphql/generated';
import { AttentionChart, PrivacyIndicator, startAttentionPipeline } from '@/seedum';
import { loadUbp } from '@/seedum/ubp';
import { Button, Logo } from '@/shared/ui';

import styles from './liveroom.module.css';

/** Shared chrome for the room (topbar + title + the mandatory privacy indicator). */
function RoomShell({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  const { t } = useTranslation('seedum');
  const navigate = useNavigate();
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/schedule')}
          aria-label="Flamingo"
        >
          <Logo />
        </button>
        <span className={styles.privacyTop}>
          <PrivacyIndicator />
        </span>
      </header>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/schedule')}>
          <ArrowLeft size={15} /> {t('room.back')}
        </button>
        <h1 className={styles.pageTitle}>{t('room.title')}</h1>
        <p className={styles.pageSub}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

type StudentPhase = 'idle' | 'starting' | 'running' | 'unavailable' | 'denied';

/**
 * Student view: the camera feed is read LOCALLY, analysed in the on-device worker,
 * and immediately discarded. Only the ~10s aggregate leaves the device (reportAttention).
 * The live chart is fed by the LOCAL per-frame score, never by the server.
 */
function StudentRoom({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('seedum');
  const [reportAttention] = useReportAttentionMutation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipelineRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<StudentPhase>('idle');
  const [scores, setScores] = useState<number[]>([]);

  const teardown = useCallback(() => {
    pipelineRef.current?.stop();
    pipelineRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Always release the camera + worker when leaving the screen.
  useEffect(() => teardown, [teardown]);

  const stop = useCallback(() => {
    teardown();
    setPhase('idle');
  }, [teardown]);

  async function start() {
    setPhase('starting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      setPhase('denied');
      return;
    }
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    await video.play().catch(() => undefined);

    // Personal calibration baseline (if any) lives on-device in IndexedDB; never on the server.
    const stored = await loadUbp();
    pipelineRef.current = startAttentionPipeline(video, stored?.baseline, {
      onReady: () => setPhase('running'),
      onUnavailable: () => {
        teardown();
        setPhase('unavailable');
      },
      onScore: (v) => setScores((prev) => [...prev.slice(-59), v]),
      onBucket: (bucketStartMs, avgAttention) => {
        // The worker buckets in the performance-clock timebase; map it to wall-clock.
        const bucketStart = new Date(performance.timeOrigin + bucketStartMs).toISOString();
        void reportAttention({
          variables: { input: { sessionId, bucketStart, avgAttention } },
        }).catch(() => undefined);
      },
    });
  }

  const current = scores.length ? scores[scores.length - 1] : 0;

  return (
    <RoomShell subtitle={t('room.studentSub')}>
      <div className={styles.card}>
        <div className={styles.videoWrap} data-active={phase === 'running' || phase === 'starting'}>
          {/* Local-only preview — this MediaStream is never uploaded. */}
          <video ref={videoRef} className={styles.video} muted playsInline />
          {phase === 'running' && (
            <span className={styles.liveBadge}>
              <Radio size={13} /> {t('room.live')}
            </span>
          )}
        </div>

        {phase === 'running' && (
          <div className={styles.metric}>
            <span className={styles.metricLabel}>{t('room.yourAttention')}</span>
            <span className={styles.metricValue}>{current}</span>
            <AttentionChart values={scores} />
          </div>
        )}

        {phase === 'unavailable' && <p className={styles.note}>{t('room.unavailable')}</p>}
        {phase === 'denied' && <p className={styles.note}>{t('room.cameraDenied')}</p>}

        <div className={styles.actions}>
          {phase === 'running' || phase === 'starting' ? (
            <Button variant="secondary" size="sm" icon={<Square size={15} />} onClick={stop}>
              {t('room.stop')}
            </Button>
          ) : (
            <Button variant="primary" size="sm" icon={<Video size={15} />} onClick={() => void start()}>
              {t('room.enableCamera')}
            </Button>
          )}
        </div>

        <p className={styles.privacyFootnote}>
          <ShieldCheck size={13} /> {t('room.studentSub')}
        </p>
      </div>
    </RoomShell>
  );
}

/**
 * Teacher view: watches the class live via the attentionUpdates subscription (aggregates
 * only — never video) and pulls the post-session report via sessionAttention.
 */
function TeacherRoom({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('seedum');
  const latestRef = useRef<Record<string, number>>({});
  const [view, setView] = useState<{ students: Array<[string, number]>; series: number[] }>({
    students: [],
    series: [],
  });

  useAttentionUpdatesSubscription({
    variables: { sessionId },
    onData: ({ data }) => {
      const metric = data.data?.attentionUpdates;
      if (!metric) return;
      latestRef.current = { ...latestRef.current, [metric.studentId]: metric.avgAttention };
      const students = Object.entries(latestRef.current);
      const avg = Math.round(students.reduce((sum, [, v]) => sum + v, 0) / students.length);
      setView((prev) => ({ students, series: [...prev.series.slice(-59), avg] }));
    },
  });

  const [loadReport, { data: report }] = useSessionAttentionLazyQuery({
    variables: { sessionId },
    fetchPolicy: 'network-only',
  });
  const summary = report?.sessionAttention;
  const classAvg = view.series.length ? view.series[view.series.length - 1] : 0;

  return (
    <RoomShell subtitle={t('room.teacherSub')}>
      <div className={styles.card}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{t('room.classAttention')}</span>
          <span className={styles.metricValue}>{classAvg}</span>
          {view.series.length > 0 ? (
            <AttentionChart values={view.series} />
          ) : (
            <p className={styles.note}>{t('room.waiting')}</p>
          )}
        </div>

        {view.students.length > 0 && (
          <ul className={styles.studentList}>
            {view.students.map(([id, value]) => (
              <li key={id} className={styles.studentRow}>
                <span className={styles.studentId}>{id.slice(0, 8)}</span>
                <span className={styles.bar} aria-hidden="true">
                  <span className={styles.barFill} style={{ width: `${value}%` }} />
                </span>
                <span className={styles.studentValue}>{value}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            icon={<BarChart3 size={15} />}
            onClick={() => void loadReport()}
          >
            {t('room.report')}
          </Button>
        </div>

        {summary && (
          <div className={styles.report}>
            <div className={styles.reportStats}>
              <span>{t('room.average', { n: summary.averageAttention })}</span>
              <span>{t('room.peak', { n: summary.peak })}</span>
              <span>{t('room.low', { n: summary.low })}</span>
            </div>
            <AttentionChart values={summary.points.map((p) => p.value)} />
          </div>
        )}
      </div>
    </RoomShell>
  );
}

/** Live CMF room. Role-aware: students stream their on-device aggregate, teachers watch. */
export function LiveRoomScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: meData, loading } = useMeQuery();

  if (!sessionId) return <Navigate to="/schedule" replace />;
  if (loading) return null;

  return meData?.me?.role === 'TEACHER' ? (
    <TeacherRoom sessionId={sessionId} />
  ) : (
    <StudentRoom sessionId={sessionId} />
  );
}
