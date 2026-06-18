import { ArrowLeft, BarChart3, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  useAttentionUpdatesSubscription,
  useMeQuery,
  useReportAttentionMutation,
  useSessionAttendeesQuery,
  useSessionRoomQuery,
} from '@/entities/graphql/generated';
import { AttentionBreakdown, AttentionChart, PrivacyIndicator, startAttentionPipeline } from '@/seedum';
import type { BucketAggregate } from '@/seedum';
import { loadUbp } from '@/seedum/ubp';
import { LIVEKIT_URL } from '@/shared/lib/env';
import { Button, Logo } from '@/shared/ui';

import { classAverage, heldValue, pushSeries, summaryStats } from '../attentionView';
import { type CameraErrorKind, classifyMediaError } from '../mediaError';

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
  const [cameraError, setCameraError] = useState<CameraErrorKind | null>(null);

  const acquire = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      setStream(s);
      setCameraError(null);
      return s;
    } catch (e) {
      setCameraError(classifyMediaError(e));
      return null;
    }
  }, []);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  // Stop the camera only when the room truly unmounts (real navigation / leave).
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  return { stream, cameraError, acquire, release };
}

/** Pre-join camera/mic error with a Retry that re-acquires getUserMedia. `role="alert"` so
 *  the classified, actionable message is announced. Re-acquiring is safe here: pre-join means
 *  nothing is published yet and the CMF pipeline isn't running. */
function CameraErrorNote({
  kind,
  disabled,
  onRetry,
}: {
  kind: CameraErrorKind;
  disabled: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation(['seedum', 'lesson']);
  // Reuse the existing seedum copy for the denied case; the finer device states are new.
  const message =
    kind === 'denied'
      ? t('room.cameraDenied')
      : kind === 'notFound'
        ? t('lesson:camera.error.notFound')
        : kind === 'inUse'
          ? t('lesson:camera.error.inUse')
          : t('lesson:camera.error.generic');
  return (
    <>
      <p className={styles.note} role="alert">
        {message}
      </p>
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          icon={<RefreshCw size={15} />}
          disabled={disabled}
          onClick={onRetry}
        >
          {t('lesson:camera.retry')}
        </Button>
      </div>
    </>
  );
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
  const { stream, cameraError, acquire, release } = useSharedCamera();
  const [joined, setJoined] = useState(false);
  const cmfVideoRef = useRef<HTMLVideoElement>(null);
  const pipelineRef = useRef<{ stop: () => void } | null>(null);
  const [cmfStatus, setCmfStatus] = useState<'starting' | 'running' | 'unavailable'>('starting');
  const [scores, setScores] = useState<number[]>([]);
  // Latest per-bucket aggregate (~2.5s) for the live sub-metric breakdown — same on-device
  // data already sent via reportAttention; kept here for display only.
  const [breakdown, setBreakdown] = useState<BucketAggregate | null>(null);

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
        onBucket: (bucketStartMs, bucket) => {
          setBreakdown(bucket); // drive the live on-device sub-metric breakdown (display only)
          // worker buckets in performance-clock ms → map to wall-clock for the server.
          // Per-bucket AGGREGATE scalars only (sub-metrics live-only server-side); no raw data.
          const bucketStart = new Date(performance.timeOrigin + bucketStartMs).toISOString();
          void reportRef.current({
            variables: {
              input: {
                sessionId,
                bucketStart,
                avgAttention: bucket.avgAttention,
                gazeOnScreen: bucket.gazeOnScreen,
                eyeOpenness: bucket.eyeOpenness,
                headYaw: bucket.headYaw,
                headPitch: bucket.headPitch,
                alertness: bucket.alertness,
              },
            },
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
    setBreakdown(null);
  }, [lk, release]);

  const current = scores.length ? scores[scores.length - 1] : 0;

  return (
    <RoomShell subtitle={t('room.studentSub')}>
      <div className={styles.card}>
        {!joined ? (
          <>
            {!isLive && <p className={styles.note}>{t('lesson:notLive')}</p>}
            {cameraError ? (
              <CameraErrorNote kind={cameraError} disabled={!isLive} onRetry={() => void join()} />
            ) : (
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
            )}
          </>
        ) : (
          <>
            <VideoRoom
              localStream={stream}
              liveBadgeLabel={t('lesson:liveBadge')}
              connecting={lk.connecting}
              connectionState={lk.connectionState}
              roomFull={lk.roomFull}
              micEnabled={lk.micEnabled}
              cameraEnabled={lk.cameraEnabled}
              screenSharing={lk.screenSharing}
              participants={lk.participants}
              version={lk.version}
              activeSpeakers={lk.activeSpeakers}
              screenShare={lk.screenShare}
              onToggleMic={lk.toggleMic}
              onToggleCamera={lk.toggleCamera}
              onToggleScreenShare={lk.toggleScreenShare}
              onRejoin={lk.rejoin}
              onLeave={leave}
            />
            {/* Hidden CMF source — same stream, analysed on-device, frames discarded. */}
            <video ref={cmfVideoRef} className={styles.cmfHidden} muted playsInline aria-hidden="true" />
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{t('room.yourAttention')}</span>
              <span className={styles.metricValue}>{cmfStatus === 'running' ? current : '—'}</span>
              {cmfStatus === 'running' && <AttentionChart values={scores} />}
              {cmfStatus === 'running' && breakdown && <AttentionBreakdown bucket={breakdown} />}
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
  const { stream, cameraError, acquire, release } = useSharedCamera();
  const [joined, setJoined] = useState(false);
  const lk = useLiveKitRoom({ url: LIVEKIT_URL, token: roomToken, stream, active: joined });

  // Teacher-only roster → studentId (= user.id, same id attentionUpdates emits and the
  // LiveKit participant identity) → display name. The `attendance` read is owner-scoped
  // server-side (returns [] to non-owners), so this carries names only for the owning teacher.
  const { data: attendeesData } = useSessionAttendeesQuery({ variables: { id: sessionId } });
  const nameFor = useMemo(() => {
    const byId = new Map<string, string>();
    for (const a of attendeesData?.session?.attendance ?? []) {
      const u = a.student.user;
      const full = `${u.firstName} ${u.lastName}`.trim();
      if (u.id) byId.set(u.id, full || u.id.slice(0, 8));
    }
    return (id: string) => byId.get(id) ?? id.slice(0, 8);
  }, [attendeesData]);

  // Per-student live state: latest value + a capped sparkline series, keyed by studentId.
  const latestRef = useRef<Record<string, number>>({});
  const seriesRef = useRef<Record<string, number[]>>({});
  // Real (non-zero) class aggregates received this session — the post-session report summary
  // is computed from THESE only, never from between-bucket gaps / zero (no-reading) buckets.
  const receivedRef = useRef<number[]>([]);
  const [view, setView] = useState<{
    students: Array<{ id: string; value: number; series: number[] }>;
    classAvg: number;
  }>({ students: [], classAvg: 0 });
  const [showReport, setShowReport] = useState(false);

  useAttentionUpdatesSubscription({
    variables: { sessionId },
    onData: ({ data }) => {
      const metric = data.data?.attentionUpdates;
      if (!metric) return;
      const id = metric.studentId;
      latestRef.current = { ...latestRef.current, [id]: metric.avgAttention };
      seriesRef.current = {
        ...seriesRef.current,
        [id]: pushSeries(seriesRef.current[id] ?? [], metric.avgAttention),
      };
      const students = Object.keys(latestRef.current).map((sid) => ({
        id: sid,
        value: latestRef.current[sid],
        series: seriesRef.current[sid] ?? [],
      }));
      const avg = classAverage(students.map((s) => s.value));
      if (avg > 0) receivedRef.current.push(avg); // stats from real buckets only
      setView((prev) => ({ students, classAvg: heldValue(prev.classAvg, avg) }));
    },
  });

  // Client-side summary from the real received buckets (no backend call → no stored zeros).
  const summary = showReport ? summaryStats(receivedRef.current) : null;
  const report = summary ? { ...summary, points: receivedRef.current } : null;
  const classAvg = view.classAvg;

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
            {cameraError ? (
              <CameraErrorNote kind={cameraError} disabled={!isLive} onRetry={() => void join()} />
            ) : (
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
            )}
          </>
        ) : (
          <VideoRoom
            localStream={stream}
            liveBadgeLabel={t('lesson:liveBadgeTeacher')}
            connecting={lk.connecting}
            connectionState={lk.connectionState}
            roomFull={lk.roomFull}
            micEnabled={lk.micEnabled}
            cameraEnabled={lk.cameraEnabled}
            screenSharing={lk.screenSharing}
            participants={lk.participants}
            version={lk.version}
            activeSpeakers={lk.activeSpeakers}
            screenShare={lk.screenShare}
            onToggleMic={lk.toggleMic}
            onToggleCamera={lk.toggleCamera}
            onToggleScreenShare={lk.toggleScreenShare}
            onRejoin={lk.rejoin}
            onLeave={leave}
            nameFor={nameFor}
          />
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('room.perStudentTitle')}</h2>
        {view.students.length > 0 ? (
          <ul className={styles.studentList}>
            {view.students.map((s) => (
              <li key={s.id} className={styles.studentCard}>
                <div className={styles.studentHead}>
                  <span className={styles.studentName}>{nameFor(s.id)}</span>
                  <span className={styles.studentValue}>{s.value}</span>
                </div>
                <AttentionChart values={s.series} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>{t('room.waiting')}</p>
        )}
        <p className={styles.classAverage}>{t('room.classAverage', { n: classAvg })}</p>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            icon={<BarChart3 size={15} />}
            onClick={() => setShowReport(true)}
          >
            {t('room.report')}
          </Button>
        </div>
        {report && (
          <div className={styles.report}>
            <div className={styles.reportStats}>
              <span>{t('room.average', { n: report.averageAttention })}</span>
              <span>{t('room.peak', { n: report.peak })}</span>
              <span>{t('room.low', { n: report.low })}</span>
            </div>
            <AttentionChart values={report.points} />
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

  const session = sessionData?.session ?? null;
  // Loader ONLY on the initial load. An in-flight refetch keeps cached data, so we must
  // NOT unmount the joined room (that would run useSharedCamera cleanup → stop the shared
  // camera track → black tile + CMF→0). Once we have session data, never return null.
  if ((meLoading || sessionLoading) && !session) return null;
  const props: RoomProps = {
    sessionId,
    roomToken: session?.roomToken ?? null,
    isLive: session?.status === 'LIVE',
  };
  return meData?.me?.role === 'TEACHER' ? <TeacherRoom {...props} /> : <StudentRoom {...props} />;
}
