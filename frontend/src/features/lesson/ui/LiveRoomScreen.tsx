import { ArrowLeft, BarChart3, ShieldCheck, Video } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  useAttentionUpdatesSubscription,
  useMeQuery,
  useReportAttentionMutation,
  useSessionAttentionLazyQuery,
  useSessionRoomQuery,
} from '@/entities/graphql/generated';
import { AttentionChart, PrivacyIndicator, startAttentionPipeline } from '@/seedum';
import { loadUbp } from '@/seedum/ubp';
import { LIVEKIT_URL } from '@/shared/lib/env';
import { Button, Logo } from '@/shared/ui';

import { useLiveKitRoom } from '../livekit/useLiveKitRoom';
import styles from './liveroom.module.css';
import { VideoRoom } from './VideoRoom';

/** Shared chrome. The CMF on-device privacy indicator stays (it is still true — see
 * the wording in ru/seedum.json); the CALL camera honesty lives in VideoRoom. */
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

/** One getUserMedia({video,audio}) shared by LiveKit publish + (student) the CMF pipeline. */
function useSharedCamera() {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [denied, setDenied] = useState(false);

  const acquire = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      setStream(s);
      return s;
    } catch {
      setDenied(true);
      return null;
    }
  }, []);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  return { stream, denied, acquire, release };
}

type RoomProps = { sessionId: string; roomToken: string | null; isLive: boolean };

/**
 * Student: ONE camera, two consumers. The shared stream is published to LiveKit
 * (the call — the teacher sees it) AND analysed on-device by the CMF pipeline, which
 * emits ONLY ~10s aggregates (reportAttention). CMF frames never leave the device.
 */
function StudentRoom({ sessionId, roomToken, isLive }: RoomProps) {
  const { t } = useTranslation(['seedum', 'lesson']);
  const [reportAttention] = useReportAttentionMutation();
  // Keep the latest mutate fn in a ref so it is NOT a dependency of the pipeline
  // effect (else LiveKit re-renders would tear down + recreate the MediaPipe worker).
  const reportRef = useRef(reportAttention);
  reportRef.current = reportAttention;
  const { stream, denied, acquire, release } = useSharedCamera();
  const [joined, setJoined] = useState(false);
  const cmfVideoRef = useRef<HTMLVideoElement>(null);
  const pipelineRef = useRef<{ stop: () => void } | null>(null);
  const [cmfStatus, setCmfStatus] = useState<'starting' | 'running' | 'unavailable'>('starting');
  const [scores, setScores] = useState<number[]>([]);

  const lk = useLiveKitRoom({ url: LIVEKIT_URL, token: roomToken, stream, active: joined });

  // CMF runs locally off the SAME stream (a dedicated, hidden <video> source).
  useEffect(() => {
    const video = cmfVideoRef.current;
    if (!joined || !stream || !video) return undefined;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    let cancelled = false;
    void loadUbp().then((stored) => {
      if (cancelled) return;
      pipelineRef.current = startAttentionPipeline(video, stored?.baseline, {
        onReady: () => setCmfStatus('running'),
        onUnavailable: () => setCmfStatus('unavailable'),
        onScore: (v) => setScores((prev) => [...prev.slice(-59), v]),
        onBucket: (bucketStartMs, avgAttention) => {
          // worker buckets in performance-clock ms → map to wall-clock for the server
          const bucketStart = new Date(performance.timeOrigin + bucketStartMs).toISOString();
          void reportRef.current({
            variables: { input: { sessionId, bucketStart, avgAttention } },
          }).catch(() => undefined);
        },
      });
    });
    return () => {
      cancelled = true;
      pipelineRef.current?.stop();
      pipelineRef.current = null;
    };
  }, [joined, stream, sessionId]);

  const join = useCallback(async () => {
    const s = await acquire();
    if (s) setJoined(true);
  }, [acquire]);

  const leave = useCallback(() => {
    pipelineRef.current?.stop();
    pipelineRef.current = null;
    lk.leave();
    release();
    setJoined(false);
    setCmfStatus('starting');
    setScores([]);
  }, [lk, release]);

  const current = scores.length ? scores[scores.length - 1] : 0;

  return (
    <RoomShell subtitle={t('room.studentSub')}>
      <div className={styles.card}>
        {!joined ? (
          <>
            {!isLive && <p className={styles.note}>{t('lesson:notLive')}</p>}
            {denied && <p className={styles.note}>{t('room.cameraDenied')}</p>}
            <div className={styles.actions}>
              <Button
                variant="primary"
                size="sm"
                icon={<Video size={15} />}
                disabled={!isLive}
                onClick={() => void join()}
              >
                {t('lesson:join')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <VideoRoom
              localStream={stream}
              connecting={lk.connecting}
              micEnabled={lk.micEnabled}
              cameraEnabled={lk.cameraEnabled}
              participants={lk.participants}
              version={lk.version}
              onToggleMic={lk.toggleMic}
              onToggleCamera={lk.toggleCamera}
              onLeave={leave}
            />
            {/* Hidden CMF source — same stream, analysed on-device, frames discarded. */}
            <video ref={cmfVideoRef} className={styles.cmfHidden} muted playsInline aria-hidden="true" />
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{t('room.yourAttention')}</span>
              <span className={styles.metricValue}>{cmfStatus === 'running' ? current : '—'}</span>
              {cmfStatus === 'running' && <AttentionChart values={scores} />}
              {cmfStatus === 'unavailable' && <p className={styles.note}>{t('room.unavailable')}</p>}
            </div>
            <p className={styles.privacyFootnote}>
              <ShieldCheck size={13} /> {t('room.studentSub')}
            </p>
          </>
        )}
      </div>
    </RoomShell>
  );
}

/**
 * Teacher: publishes own camera to the call AND watches the class attention live
 * (attentionUpdates — aggregates only, never video) + the post-session report.
 */
function TeacherRoom({ sessionId, roomToken, isLive }: RoomProps) {
  const { t } = useTranslation(['seedum', 'lesson']);
  const { stream, denied, acquire, release } = useSharedCamera();
  const [joined, setJoined] = useState(false);
  const lk = useLiveKitRoom({ url: LIVEKIT_URL, token: roomToken, stream, active: joined });

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
    fetchPolicy: 'network-only',
  });
  const summary = report?.sessionAttention;
  const classAvg = view.series.length ? view.series[view.series.length - 1] : 0;

  const join = useCallback(async () => {
    const s = await acquire();
    if (s) setJoined(true);
  }, [acquire]);

  const leave = useCallback(() => {
    lk.leave();
    release();
    setJoined(false);
  }, [lk, release]);

  return (
    <RoomShell subtitle={t('room.teacherSub')}>
      <div className={styles.card}>
        {!joined ? (
          <>
            {!isLive && <p className={styles.note}>{t('lesson:notLive')}</p>}
            {denied && <p className={styles.note}>{t('room.cameraDenied')}</p>}
            <div className={styles.actions}>
              <Button
                variant="primary"
                size="sm"
                icon={<Video size={15} />}
                disabled={!isLive}
                onClick={() => void join()}
              >
                {t('lesson:join')}
              </Button>
            </div>
          </>
        ) : (
          <VideoRoom
            localStream={stream}
            connecting={lk.connecting}
            micEnabled={lk.micEnabled}
            cameraEnabled={lk.cameraEnabled}
            participants={lk.participants}
            version={lk.version}
            onToggleMic={lk.toggleMic}
            onToggleCamera={lk.toggleCamera}
            onLeave={leave}
          />
        )}
      </div>

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
            onClick={() => void loadReport({ variables: { sessionId } })}
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

/** Live room. Role-aware: students publish + run on-device CMF; teachers watch. */
export function LiveRoomScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: meData, loading: meLoading } = useMeQuery();
  const { data: sessionData, loading: sessionLoading } = useSessionRoomQuery({
    variables: { id: sessionId ?? '' },
    skip: !sessionId,
  });

  if (!sessionId) return <Navigate to="/schedule" replace />;
  if (meLoading || sessionLoading) return null;

  const session = sessionData?.session ?? null;
  const props: RoomProps = {
    sessionId,
    roomToken: session?.roomToken ?? null,
    isLive: session?.status === 'LIVE',
  };
  return meData?.me?.role === 'TEACHER' ? <TeacherRoom {...props} /> : <StudentRoom {...props} />;
}
