import { ICON_SM } from '@/shared/ui/iconSizes';
import { BarChart3, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';

import {
  useAttentionUpdatesSubscription,
  useMeQuery,
  useReportAttentionMutation,
  useSessionAttendeesQuery,
  useSessionRoomQuery,
} from '@/entities/graphql/generated';
import { AttentionChart, PrivacyIndicator, startAttentionPipeline } from '@/seedum';
import { CMF } from '@/seedum/cmf/cmfConfig';
import { CmfDebugHud, type CmfHudFeed } from '@/seedum/ui/CmfDebugHud';
import { loadUbp } from '@/seedum/ubp';
import { LIVEKIT_URL } from '@/shared/lib/env';
import { Button } from '@/shared/ui';

import { classAverage, freshValue, heldValue, summaryStats } from '../attentionView';
import { type CameraErrorKind, classifyMediaError } from '../mediaError';

import { type FieldStudent } from '../types';

import { useLiveKitRoom } from '../livekit/useLiveKitRoom';
import frame from './roomframe.module.css';
import styles from './liveroom.module.css';
import { BoardCanvas } from '@/features/board';

import { ProjectorCast } from './ProjectorCast';
import { type Pane, RoomFrame, type Scene } from './RoomFrame';
import { PreviewRoom } from './PreviewRoom';
import { VideoRoom } from './VideoRoom';

/**
 * Shared chrome — atlas sheet 02's frame around whatever the room is doing.
 *
 * The media internals (join, LiveKit, tiles, the CMF pipeline) are deliberately NOT touched
 * by this: R3.1 rebuilt the composition, not the video path, so the no-remount rule and the
 * attention pipeline keep the code that already proved them.
 */
function RoomShell({
  subtitle,
  sessionId,
  lessonId,
  title,
  isLive,
  isTeacher,
  actions,
  panel,
  children,
}: {
  subtitle: string;
  sessionId: string;
  lessonId?: string | null;
  title?: string | null;
  isLive: boolean;
  isTeacher?: boolean;
  actions?: ReactNode;
  panel?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation(['room', 'seedum']);
  const [scene, setScene] = useState<Scene>('board');
  const [pane, setPane] = useState<Pane>('people');

  return (
    <RoomFrame
      title={title || t('seedum:room.title')}
      meta={subtitle}
      isLive={isLive}
      scene={scene}
      onScene={setScene}
      pane={pane}
      onPane={setPane}
      sessionId={sessionId}
      actions={
        <>
          {actions}
          {isTeacher && <ProjectorCast sessionId={sessionId} />}
          <PrivacyIndicator />
        </>
      }
      strip={children}
      panel={panel ?? <RoomPane pane={pane} />}
    >
      <SceneBody scene={scene} lessonId={lessonId} />
    </RoomFrame>
  );
}

/** The scene the whole room is looking at. The board is real (R3.2); the other windows land
 *  with the phase that owns them. */
function SceneBody({ scene, lessonId }: { scene: Scene; lessonId?: string | null }) {
  const { t } = useTranslation('room');
  if (scene === 'board' && lessonId) return <BoardCanvas lessonId={lessonId} />;
  return <p className={frame.sceneSoon}>{t(`scene.${scene}Soon`)}</p>;
}

/** The personal panel. Participants and materials are real; the dictionary and the lesson
 *  chat belong to later phases and say so rather than showing an empty box. */
function RoomPane({ pane }: { pane: Pane }) {
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
      <p className={frame.paneEmpty}>{t('people.empty')}</p>
    </>
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
          icon={<RefreshCw size={ICON_SM} />}
          disabled={disabled}
          onClick={onRetry}
        >
          {t('lesson:camera.retry')}
        </Button>
      </div>
    </>
  );
}

type RoomProps = {
  sessionId: string;
  /** The board belongs to the LESSON, not the session — a lesson's board outlives its
   *  occurrences, which is what «доска прошлого урока» is made of. */
  lessonId: string | null;
  roomToken: string | null;
  isLive: boolean;
  teacherName: string | null;
};

/**
 * Student: ONE camera, two consumers. The shared stream is published to LiveKit
 * (the call — the teacher sees it) AND analysed on-device by the CMF pipeline, which
 * emits ONLY ~10s aggregates (reportAttention). CMF frames never leave the device.
 */
function StudentRoom({ sessionId, lessonId, roomToken, isLive, teacherName }: RoomProps) {
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
  // D0 diagnostics (dev-only, ?cmfDebug=1): the HUD renders on-device values only and adds
  // ZERO egress — reportAttention below is byte-identical with or without it.
  const hudEnabled =
    import.meta.env.DEV && new URLSearchParams(window.location.search).has('cmfDebug');
  const hudRef = useRef<CmfHudFeed | null>(null);

  const lk = useLiveKitRoom({ url: LIVEKIT_URL, token: roomToken, stream, active: joined });

  // Label the teacher's tile with the real name (server-provided course-owner name, not a
  // roster). The student has no per-participant roster, and teacherName targets exactly ONE
  // person, so we only apply it when there is a single remote (the teacher — the demo / 1:1 /
  // lesson-start case). With classmates present (post-S1 layout) a flat name can't be matched
  // to the teacher's participant id → those tiles keep the id-slice until S1 wires per-student
  // naming (the SDL exposes only teacherName, by design — no owner id).
  const studentNameFor = useCallback(
    (identity: string) =>
      teacherName && lk.participants.length === 1 ? teacherName : identity.slice(0, 8),
    [teacherName, lk.participants.length],
  );

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
        // Dev HUD taps the per-frame score that ALREADY stays on-device (local chart data).
        onScore: (value) => hudRef.current?.pushScore(value),
        onBucket: (bucketStartMs, bucket) => {
          hudRef.current?.pushBucket(bucket); // dev HUD (on-device; not egress)
          // worker buckets in performance-clock ms → map to wall-clock for the server.
          // Per-bucket AGGREGATE scalars only (sub-metrics live-only server-side); no raw data.
          const bucketStart = new Date(performance.timeOrigin + bucketStartMs).toISOString();
          void reportRef
            .current({
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
            })
            .catch(() => undefined);
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
  }, [lk, release]);

  return (
    <RoomShell
      subtitle={t('room.studentSub')}
      sessionId={sessionId}
      lessonId={lessonId}
      title={teacherName ? `${t('room.title')} · ${teacherName}` : null}
      isLive={isLive}
    >
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
                  icon={<Video size={ICON_SM} />}
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
              nameFor={studentNameFor}
            />
            {/* Hidden CMF source — same stream, analysed on-device, frames discarded. */}
            <video
              ref={cmfVideoRef}
              className={styles.cmfHidden}
              muted
              playsInline
              aria-hidden="true"
            />
            {hudEnabled && <CmfDebugHud ref={hudRef} status={cmfStatus} />}
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
function TeacherRoom({ sessionId, lessonId, roomToken, isLive }: RoomProps) {
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

  // Per-student state keyed by studentId: engagement + the live-only sub-metrics (display only,
  // never persisted/egressed — revealed on orb click). Insertion order is preserved (UUID keys),
  // which the ambient field relies on to keep orbs in STABLE positions (never reordered).
  // `at` = wall-clock of the last received bucket (B-9 staleness: no buckets → «нет данных»).
  const studentsRef = useRef<Record<string, FieldStudent & { at: number }>>({});
  // Real (non-zero) class aggregates received this session — the post-session report summary
  // is computed from THESE only, never from between-bucket gaps / zero (no-reading) buckets.
  const receivedRef = useRef<number[]>([]);
  const [view, setView] = useState<{ students: FieldStudent[]; classAvg: number }>({
    students: [],
    classAvg: 0,
  });
  const [showReport, setShowReport] = useState(false);

  useAttentionUpdatesSubscription({
    variables: { sessionId },
    onData: ({ data }) => {
      const metric = data.data?.attentionUpdates;
      if (!metric) return;
      const id = metric.studentId;
      studentsRef.current = {
        ...studentsRef.current,
        [id]: {
          id,
          value: metric.avgAttention,
          gaze: metric.gazeOnScreen ?? null,
          eyes: metric.eyeOpenness ?? null,
          headYaw: metric.headYaw ?? null,
          headPitch: metric.headPitch ?? null,
          alert: metric.alertness ?? null,
          at: Date.now(),
        },
      };
      const students = Object.values(studentsRef.current);
      // C-display-1: only students with a FRESH reading count. A genuine 0 (present but
      // disengaged) IS counted; a silent/no-face student goes stale and is excluded (null),
      // never read as 0. The report stats include those genuine 0s.
      const nowMs = Date.now();
      const freshValues = students
        .filter((s) => nowMs - s.at <= CMF.liveAttentionStaleMs)
        .map((s) => s.value);
      const avg = classAverage(freshValues);
      if (avg != null) receivedRef.current.push(avg);
      setView((prev) => ({ students, classAvg: heldValue(prev.classAvg, avg) }));
    },
  });

  // Client-side summary from the real received buckets (no backend call → no stored zeros).
  const summary = showReport ? summaryStats(receivedRef.current) : null;
  const report = summary ? { ...summary, points: receivedRef.current } : null;
  const classAvg = view.classAvg;

  // F1: latest live attention for every tile chip + the focused tile's info bar. Reads the
  // mutable ref (kept current by the subscription above); identity == studentId == user id.
  // B-9: a record is only served while FRESH — no-face buckets are never reported, so a
  // silent student honestly degrades to null («нет данных»), never a frozen «· 0».
  const attentionFor = useCallback(
    (identity: string) =>
      freshValue(studentsRef.current[identity], Date.now(), CMF.liveAttentionStaleMs)?.value ??
      null,
    [],
  );
  // F1.1 (owner v3): full sub-metrics for the focused tile (live-only, display-only).
  const metricsFor = useCallback(
    (identity: string) =>
      freshValue(studentsRef.current[identity], Date.now(), CMF.liveAttentionStaleMs),
    [],
  );
  // Staleness must surface even when no new subscription data arrives (silence IS the
  // signal) — a light tick re-renders the tiles while the teacher is in the room.
  const [, setStaleTick] = useState(0);
  useEffect(() => {
    if (!joined) return undefined;
    const iv = setInterval(() => setStaleTick((n) => n + 1), 2_000);
    return () => clearInterval(iv);
  }, [joined]);

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
    <RoomShell
      subtitle={t('room.teacherSub')}
      sessionId={sessionId}
      lessonId={lessonId}
      isLive={isLive}
      isTeacher
    >
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
                  icon={<Video size={ICON_SM} />}
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
            focusable
            attentionFor={attentionFor}
            metricsFor={metricsFor}
            selfInRail
          />
        )}
      </div>

      <div className={styles.card}>
        {/* Owner v3: the per-student parameters live ON the video tiles now; the ambient
            orb field is retired from the live view (report stays on demand). */}
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
function LiveRoomRealScreen() {
  const { t } = useTranslation('common');
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: meData, loading: meLoading } = useMeQuery();
  const { data: sessionData, loading: sessionLoading } = useSessionRoomQuery({
    variables: { id: sessionId ?? '' },
    skip: !sessionId,
  });

  if (!sessionId) return <Navigate to="/schedule" replace />;

  const session = sessionData?.session ?? null;
  // Loader ONLY on the initial load (B-states-3: a plain loader, not a blank screen). An
  // in-flight refetch keeps cached data, so we must NOT unmount the joined room (that would run
  // useSharedCamera cleanup → stop the shared camera track → black tile + CMF→0). Once we have
  // session data, never render this loader.
  if ((meLoading || sessionLoading) && !session) {
    return (
      <div className={styles.shell} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p className={styles.note}>{t('actions.loading')}</p>
      </div>
    );
  }
  const props: RoomProps = {
    sessionId,
    lessonId: session?.lesson?.id ?? null,
    roomToken: session?.roomToken ?? null,
    isLive: session?.status === 'LIVE',
    teacherName: session?.teacherName ?? null,
  };
  return meData?.me?.role === 'TEACHER' ? <TeacherRoom {...props} /> : <StudentRoom {...props} />;
}

/** TEMPORARY: preview (VITE_PREVIEW=1) swaps the real LiveKit/CMF room for a camera-free,
 *  network-free display shell. Remove with the demo layer before real launch. */
export function LiveRoomScreen() {
  if (import.meta.env.VITE_PREVIEW === '1') return <PreviewRoom />;
  return <LiveRoomRealScreen />;
}
