import { ICON_SM } from '@/shared/ui/iconSizes';
import { type RemoteParticipant, Track } from 'livekit-client';
import { BarChart3, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';

import {
  useAttentionUpdatesSubscription,
  useMeQuery,
  useReportAttentionMutation,
  useJoinSessionMutation,
  useSessionAttendeesQuery,
  useSetProjectorFocusMutation,
  useSessionStatusChangedSubscription,
  useEndSessionMutation,
  useSessionRoomQuery,
} from '@/entities/graphql/generated';
import { AttentionChart, PrivacyIndicator, startAttentionPipeline } from '@/seedum';
import { CMF } from '@/seedum/cmf/cmfConfig';
import { CmfDebugHud, type CmfHudFeed } from '@/seedum/ui/CmfDebugHud';
import { loadUbp } from '@/seedum/ubp';
import { LIVEKIT_URL } from '@/shared/lib/env';
import { Button } from '@/shared/ui';
import { ConnectionLine } from '@/shared/ui/ConnectionLine/ConnectionLine';

import { classAverage, freshValue, heldValue, summaryStats } from '../attentionView';
import { type CameraErrorKind, classifyMediaError } from '../mediaError';

import { type FieldStudent } from '../types';

import { useLiveKitRoom } from '../livekit/useLiveKitRoom';
import frame from './roomframe.module.css';
import styles from './liveroom.module.css';
import { BoardCanvas } from '@/features/board';
import { TestScene } from '@/features/exercises';
import { DictionaryPane } from '@/features/dictionary';
import { LessonChatPane, SummaryScene } from '@/features/summary';

import { ProjectorCast } from './ProjectorCast';
import { type ClassLayout, type Participant, suggestedLayout } from '../classLayout';
import { ClassLayoutSwitch } from './ClassLayoutSwitch';
import { ClassWindow } from './ClassWindow';
import { type Pane, RoomFrame, type Scene } from './RoomFrame';
import { PreviewRoom } from './PreviewRoom';
import { VideoRoom } from './VideoRoom';
import { preferredConstraints } from '@/features/desktop/setup/mediaPreference';
import { usePublishHostLesson } from '@/features/desktop/hostBeacon';

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
  classTeacher,
  classPupils,
  classVersion,
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
  /** Кто ведёт — плитка, которую окно «Класс» не умеет потерять. */
  classTeacher?: Participant;
  classPupils?: Participant[];
  /** Счётчик изменений комнаты — прокидывается до плиток, см. `ClassVideo`. */
  classVersion?: number;
  children: ReactNode;
}) {
  const { t } = useTranslation(['room', 'seedum']);
  const [scene, setScene] = useState<Scene>('board');
  const [pane, setPane] = useState<Pane>('people');
  const pupils = classPupils ?? [];
  // Раскладка — предложение по составу, и её можно сменить в любой момент (§2.2-бис).
  const [layout, setLayout] = useState<ClassLayout | null>(null);
  const [pinnedId, setPinnedId] = useState<string | undefined>();
  const activeLayout = layout ?? suggestedLayout(pupils.length);

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
      strip={
        <>
          {/*
            🔴 ГРОМКО — И ТОЛЬКО ЗДЕСЬ (наряд 34 §2.2, решение владельца §32.3).
            Механизм связи один на весь продукт; урок — единственное место, где молчать
            нельзя: преподаватель ведёт занятие и должен узнать, что класс перестал его
            видеть, а не догадаться об этом через двадцать минут.
          */}
          <ConnectionLine tone="loud" />
          {children}
        </>
      }
      layoutSwitch={
        scene === 'class' ? (
          <ClassLayoutSwitch layout={activeLayout} onLayout={setLayout} />
        ) : undefined
      }
      panel={
        panel ?? (
          <RoomPane
            pane={pane}
            sessionId={sessionId}
            lessonId={lessonId}
            isTeacher={isTeacher}
            classTeacher={classTeacher}
            classPupils={pupils}
          />
        )
      }
    >
      {scene === 'class' && classTeacher ? (
        <ClassWindow
          teacher={classTeacher}
          pupils={pupils}
          version={classVersion}
          layout={activeLayout}
          pinnedId={pinnedId}
          onPin={(id) => {
            setPinnedId(id);
            setLayout('pinned');
          }}
        />
      ) : (
        <SceneBody scene={scene} lessonId={lessonId} sessionId={sessionId} isTeacher={isTeacher} />
      )}
    </RoomFrame>
  );
}


/**
 * LiveKit participants → the tiles the «Класс» window draws.
 *
 * Initials come from the display name and nothing else — no avatar fetch, no extra query. The
 * sheet draws initials, and a tile that waits on a network round-trip to show who is speaking
 * is a tile that is blank exactly when it matters.
 */
function toClassTiles(
  identities: readonly RemoteParticipant[],
  nameFor: (id: string) => string,
  selfId?: string,
): Participant[] {
  return identities.map((p) => {
    const name = nameFor(p.identity);
    return {
      id: p.identity,
      name,
      initials: initialsOf(name),
      speaking: p.isSpeaking,
      isSelf: p.identity === selfId,
      // 🔴 Дорожки здесь не было, и окно «Класс» показывало одни инициалы (наряд 37 §1.3).
      track: p.getTrackPublication(Track.Source.Camera)?.track ?? undefined,
    };
  });
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** The scene the whole room is looking at. The board (R3.2), the test and the summary (R4)
 *  are real; the guide lands with the phase that owns it. */
function SceneBody({
  scene,
  lessonId,
  sessionId,
  isTeacher,
}: {
  scene: Scene;
  lessonId?: string | null;
  sessionId: string;
  isTeacher?: boolean;
}) {
  const { t } = useTranslation('room');
  if (scene === 'board' && lessonId) return <BoardCanvas lessonId={lessonId} />;
  if (scene === 'test' && lessonId) {
    return <TestScene lessonId={lessonId} isTeacher={Boolean(isTeacher)} />;
  }
  if (scene === 'summary') {
    return <SummaryScene sessionId={sessionId} isTeacher={Boolean(isTeacher)} />;
  }
  return <p className={frame.sceneSoon}>{t(`scene.${scene}Soon`)}</p>;
}

/** The personal panel. The lesson chat is real (R4.2) — and it writes into the summary, not
 *  into a feed of its own; the dictionary is real (R4.3) and carries its licences. */
function RoomPane({
  pane,
  sessionId,
  lessonId,
  isTeacher,
  classTeacher,
  classPupils,
}: {
  pane: Pane;
  sessionId: string;
  lessonId?: string | null;
  isTeacher?: boolean;
  classTeacher?: Participant;
  classPupils?: Participant[];
}) {
  const { t } = useTranslation('room');
  if (pane === 'dict') {
    return <DictionaryPane lessonId={lessonId} sessionId={sessionId} isTeacher={isTeacher} />;
  }
  if (pane === 'chat') return <LessonChatPane sessionId={sessionId} />;
  if (pane === 'mats') {
    return (
      <>
        <p className={frame.paneTitle}>{t('mats.title')}</p>
        <p className={frame.paneEmpty}>{t('mats.empty')}</p>
      </>
    );
  }
  /**
   * 🔴 «ПОКА НИКОГО» ПРИ ЖИВОМ ЗАНЯТИИ (живой урок 18.08, наряд 37 §1.1).
   *
   * Преподаватель в комнате, рисует на доске, пишет в чат — и у ОБОИХ во вкладке «Участники»
   * написано «Пока никого». Список врал каждому: преподаватель по нему понимает, кто пришёл,
   * ученик — что он не один.
   *
   * ⚠️ ГИПОТЕЗА РЕВЬЮЕРА НЕ ПОДТВЕРДИЛАСЬ. Он предполагал ту же природу, что у починенного
   * присутствия: «отметка ставится не везде». Дело оказалось проще и хуже: **списка не
   * существовало**. Здесь стояли две строки статического текста — заглушка, которую нечем
   * было наполнить, потому что её никто ничем и не наполнял.
   *
   * Список берётся оттуда же, откуда плитки окна «Класс», — из живой комнаты. Один источник
   * на два места: два разных ответа на «кто здесь» разошлись бы ровно посреди урока.
   */
  const people = [...(classTeacher ? [classTeacher] : []), ...(classPupils ?? [])];
  return (
    <>
      <p className={frame.paneTitle}>{t('people.title')}</p>
      {people.length === 0 ? (
        <p className={frame.paneEmpty}>{t('people.empty')}</p>
      ) : (
        <ul className={frame.paneList}>
          {people.map((person) => (
            <li key={person.id} className={frame.paneRow}>
              <span className={frame.paneWho}>
                {person.isSelf ? t('people.you', { name: person.name }) : person.name}
              </span>
              <span className={frame.paneState}>
                {person.track || person.selfStream
                  ? t('people.onAir')
                  : t('people.noCamera')}
              </span>
            </li>
          ))}
        </ul>
      )}
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
      // Камера и микрофон, выбранные на шаге 4 мастера (промпт 21 §3.2 п.5). Без этого
      // выбор на проверке был бы вежливым вопросом без последствий.
      const s = await navigator.mediaDevices.getUserMedia(preferredConstraints());
      // 🔴 ПРЕДЫДУЩИЙ ПОТОК ГАСИМ (найдено аудитом 17.08). Кнопка «Войти» на время
      // `getUserMedia` не блокировалась, и два нажатия давали два потока: первый становился
      // недостижим ни для `release()`, ни для cleanup — оба гасят только `streamRef.current`.
      // Камера горела до закрытия вкладки. Ровно так же терялся поток, если человек уходил
      // с экрана, пока открыто окно разрешения.
      //
      // Соседний `useMediaCheck` делает это правильно с самого начала — здесь строки не было.
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
  /** Which participant IS the teacher — Р5.1 needs to tell one remote from another. */
  teacherId: string | null;
  /** Имя того, кто сидит за этим экраном — для его плитки в окне «Класс». */
  selfName: string;
  /** Название урока и его начало — рама приложения печатает их в заголовке (лист D1). */
  lessonTitle: string | null;
  startAt: string | null;
};

/**
 * Student: ONE camera, two consumers. The shared stream is published to LiveKit
 * (the call — the teacher sees it) AND analysed on-device by the CMF pipeline, which
 * emits ONLY ~10s aggregates (reportAttention). CMF frames never leave the device.
 */
function StudentRoom({
  sessionId,
  lessonId,
  roomToken,
  isLive,
  teacherName,
  teacherId,
  selfName,
}: RoomProps) {
  const { t } = useTranslation(['seedum', 'lesson']);
  const [reportAttention] = useReportAttentionMutation();
  // Согласие на анализ внимания — состояние ЧЕЛОВЕКА, а не комнаты; спрашиваем его здесь,
  // потому что здесь оно единственный раз что-то решает.
  const { data: meData } = useMeQuery();
  const attentionOn = meData?.me?.consentAttention ?? null;
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

  /**
   * 🔴 КЛАСС НЕ УЗНАВАЛ, ЧТО УРОК КОНЧИЛСЯ (наряд 35 §4).
   *
   * Преподаватель нажимает «Завершить занятие» — у него меняется всё, а ученик сидит в
   * комнате, которая уже не идёт: камера горит, доска на месте, ничего не сказано.
   * `sessionStatusChanged` была объявлена в SDL с самого начала и три месяца не имела ни
   * резолвера, ни публикации.
   *
   * Показываем словами и не выкидываем человека с экрана: он может дописывать конспект.
   */
  const [ended, setEnded] = useState(false);
  useSessionStatusChangedSubscription({
    variables: { sessionId },
    onData: ({ data: payload }) => {
      if (payload.data?.sessionStatusChanged?.endAt) setEnded(true);
    },
  });


  /**
   * Р5.1 (owner decision 2026-08-13): **a student sees the teacher and their own preview.**
   *
   * The reason is not taste, it is the teacher's uplink. The lesson is hosted from the
   * teacher's machine, and «everyone sees everyone» costs them 30 Mbit/s outbound at eight
   * pupils — a home connection lies down and the lesson starts breaking up. One teacher
   * stream plus each pupil's own preview costs 4.3 (`R5_DESKTOP_HOST_BUDGET.md` §3).
   *
   * Filtering here is display-only; the real saving arrives with the desktop host, which
   * decides what to forward at all. But the screen must already tell the truth about what a
   * lesson looks like — and the pupil is told WHY, rather than left wondering where the class
   * went.
   */
  const teacherOnly = useMemo(
    () => (teacherId ? lk.participants.filter((p) => p.identity === teacherId) : lk.participants),
    [lk.participants, teacherId],
  );
  const classmatesHidden = lk.participants.length - teacherOnly.length;

  // With the strip filtered to one person, the teacher's tile can finally be named for
  // certain — the old «only when there is exactly one remote» guess is retired.
  const studentNameFor = useCallback(
    (identity: string) =>
      teacherName && identity === teacherId ? teacherName : identity.slice(0, 8),
    [teacherName, teacherId],
  );

  // CMF runs locally off the SAME stream (a dedicated, hidden <video> source).
  useEffect(() => {
    const video = cmfVideoRef.current;
    // 🔴 БЕЗ СОГЛАСИЯ КОНВЕЙЕР НЕ ЗАПУСКАЕТСЯ (§3-бис, 17.08).
    //
    // Здесь его пускали всегда, и решение владельца «анализ внимания по умолчанию выключен»
    // (D2 шаг 3, OWNER_SCOPE §19) держал один сервер: он отвечал `false` и молча выбрасывал
    // каждое ведро. То есть у ученика без согласия MediaPipe всё равно смотрел в лицо, грел
    // процессор и раз в 2.5 секунды слал агрегат, который никому не был нужен.
    //
    // Наружу при этом ничего лишнего не уходило — инвариант §2.1 цел, — но переключатель,
    // который человек видит на листе D8, обязан управлять именно тем, что написано на нём.
    // `null` (ответа ещё нет) — не «нет»: ждём, а не решаем за человека.
    if (!joined || !stream || !video || attentionOn !== true) return undefined;
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
  }, [joined, stream, sessionId, attentionOn]);

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
      classTeacher={
        teacherName
          ? {
              id: teacherId ?? 'teacher',
              name: teacherName,
              initials: initialsOf(teacherName),
              // Дорожка преподавателя — из эфира, по его идентификатору.
              track: lk.participants
                .find((p) => p.identity === teacherId)
                ?.getTrackPublication(Track.Source.Camera)?.track,
            }
          : undefined
      }
      /*
        🔴 ЗДЕСЬ СТОЯЛ СПИСОК ИЗ ОДНОГО СЕБЯ, И ЭТО ВТОРАЯ ПОЛОВИНА ПОЛОМКИ §1.3.
        Комментарий утверждал «больше в комнате никого нет» — но в комнате есть преподаватель,
        и его дорожка приходит ученику (замер 18.08: «Ирина П», video, 640×480, играет).
        Окно «Класс» об этом просто не спрашивали: ему передавали выдуманный список.
      */
      /*
        ⚠️ Преподаватель ИСКЛЮЧЁН из этого списка: он уже стоит отдельной плиткой и в списке
        участников. Первый замер показал его дважды — «Ирина П без камеры» и «Ирина П камера
        в эфире» в одном списке, то есть один человек двумя строками с разными состояниями.
      */
      classPupils={[
        {
          id: 'self',
          name: selfName,
          initials: initialsOf(selfName),
          isSelf: true,
          selfStream: stream,
        },
        ...toClassTiles(
          lk.participants.filter((p) => p.identity !== teacherId),
          (id) => id,
        ),
      ]}
      classVersion={lk.version}
    >
      <div className={styles.card}>
        {/* Урок закончился — сказано словами, и человека не выкидывает с экрана:
            он может дописывать конспект (наряд 35 §4). */}
        {ended && (
          <p className={styles.note} role="status">
            {t('lesson:sessionEnded')}
          </p>
        )}
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
              error={lk.error}
              roomFull={lk.roomFull}
              micEnabled={lk.micEnabled}
              cameraEnabled={lk.cameraEnabled}
              screenSharing={lk.screenSharing}
              participants={teacherOnly}
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
            {classmatesHidden > 0 && (
              <p className={styles.privacyFootnote}>{t('lesson:strip.classmatesHidden')}</p>
            )}
            {/* Hidden CMF source — same stream, analysed on-device, frames discarded. */}
            <video
              ref={cmfVideoRef}
              className={styles.cmfHidden}
              muted
              playsInline
              aria-hidden="true"
            />
            {hudEnabled && <CmfDebugHud ref={hudRef} status={cmfStatus} />}
            {/* Выключенный анализ — это состояние, а не поломка, и молчать о нём нельзя:
                ученик, которому обещали график внимания, иначе решит, что он сломан. */}
            {attentionOn === false && (
              <p className={styles.privacyFootnote}>
                {t('seedum:room.attentionOff')}{' '}
                <Link to="/кабинет">{t('seedum:room.attentionOffWhere')}</Link>
              </p>
            )}
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
function TeacherRoom({
  sessionId,
  lessonId,
  roomToken,
  isLive,
  selfName,
  lessonTitle,
  startAt,
}: RoomProps) {
  const { t } = useTranslation(['seedum', 'lesson']);
  const { stream, cameraError, acquire, release } = useSharedCamera();
  const [joined, setJoined] = useState(false);
  const lk = useLiveKitRoom({ url: LIVEKIT_URL, token: roomToken, stream, active: joined });

  // Teacher-only roster → studentId (= user.id, same id attentionUpdates emits and the
  // LiveKit participant identity) → display name. The `attendance` read is owner-scoped
  // server-side (returns [] to non-owners), so this carries names only for the owning teacher.
  /**
   * 🔴 МУТАЦИЯ БЫЛА ОПИСАНА И НЕ ВЫЗЫВАЛАСЬ (наряд 36 §4). Второй экран слушал
   * `projectorFocusChanged`, а послать фокус было некому: `setProjectorFocus` числилась
   * среди сирот. Планшет как доска (§21) без этого не работает.
   */
  const [setProjectorFocus] = useSetProjectorFocusMutation();
  const { data: attendeesData, refetch: refetchAttendees } = useSessionAttendeesQuery({
    variables: { id: sessionId },
  });

  /**
   * 🔴 СПИСОК СПРАШИВАЛСЯ ОДИН РАЗ — ДО ТОГО, КАК КТО-ЛИБО ПРИШЁЛ (наряд 35 §1).
   *
   * Замер видео 18.08: двое видят и слышат друг друга, но у преподавателя ученик подписан
   * `8cbb7f0d · нет данных` — шестнадцатеричным огрызком вместо «Аня К». Имена берутся из
   * списка присутствующих, а список читался при открытии комнаты: преподаватель заходит
   * первым, и в этот момент в списке пусто. Ученик приходит — список не перечитывается.
   *
   * Триггер точный: изменился состав комнаты — значит кто-то пришёл или ушёл, и список имён
   * устарел. Не таймер: опрос раз в N секунд означал бы, что до N секунд урока преподаватель
   * смотрит на цифры вместо детей.
   */
  const roomSize = lk.participants.length;
  useEffect(() => {
    void refetchAttendees().catch(() => undefined);
  }, [roomSize, refetchAttendees]);

  const nameFor = useMemo(() => {
    const byId = new Map<string, string>();
    for (const a of attendeesData?.session?.attendance ?? []) {
      const u = a.student.user;
      // §24: полоса видео узкая — «Имя Ф.». Форму собирает сервер, а не этот экран.
      if (u.id) byId.set(u.id, u.shortName || u.id.slice(0, 8));
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

  /**
   * 🔴 РАМА УЗНАЁТ ОБ УРОКЕ ОТСЮДА (лист D1, найдено аудитом 17.08).
   *
   * До этой правки `DesktopShell` держал `lessonLive={false}` константой, и весь лист D1 был
   * выключен: ни названия урока в заголовке, ни «Подключено 6 из 8», ни «Идёт 24:16», ни
   * кнопки «Завершить». Факты знает комната — она их и объявляет.
   *
   * Объявляем ТОЛЬКО когда преподаватель вошёл в эфир: «идёт урок» — это про раздачу с этой
   * машины, а открытая вкладка комнаты за десять минут до звонка уроком не является.
   *
   * 🔴 «ПОДКЛЮЧЕНО 0 ИЗ 0» — РЕШЕНИЕ ВЛАДЕЛЬЦА §28.1.
   *
   * Знаменателем стоял список ПОСЕЩАЕМОСТИ, а он наполняется отметками, а не приходом в
   * комнату: на живом уроке он пуст, и полоса честно показывала «0 из 0» при полном классе.
   * Владелец решил: подключившийся — тот, кто **в комнате**. Посещаемость остаётся
   * отдельным учётом и отдельной цифрой; смешивать их нельзя.
   *
   * Знаменатель — сколько человек ожидается: список группы, если он есть, иначе столько же,
   * сколько уже пришло (тогда строка читается «6 из 6» — то есть «все, кого мы знаем, тут»,
   * и это правда, а не выдумка про восьмерых).
   *
   * ⚠️ `joined` считает УЧАСТНИКОВ LiveKit, то есть учеников: сам преподаватель в этот
   * список не входит — иначе пустая комната показывала бы «1».
   */
  const [endSession] = useEndSessionMutation();
  const inRoom = lk.participants.length;
  const expected = attendeesData?.session?.attendance?.length || inRoom;
  const endAction = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        void endSession({ variables: { sessionId } }).catch(() => undefined);
        leave();
      }}
    >
      {t('lesson:endLesson')}
    </Button>
  );
  usePublishHostLesson(
    joined && isLive && startAt
      ? {
          lessonName: lessonTitle ?? t('seedum:room.title'),
          participantCount: expected,
          joined: inRoom,
          startedAt: new Date(startAt).getTime(),
          actions: endAction,
        }
      : null,
  );

  return (
    <RoomShell
      subtitle={t('room.teacherSub')}
      sessionId={sessionId}
      lessonId={lessonId}
      isLive={isLive}
      isTeacher
      classTeacher={{
        id: 'self',
        name: selfName,
        initials: initialsOf(selfName),
        // Свой поток LiveKit не отдаёт — себя видно локально, из общей камеры.
        selfStream: stream,
      }}
      classPupils={toClassTiles(lk.participants, nameFor)}
      classVersion={lk.version}
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
            error={lk.error}
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
            onFocusChange={(identity) => {
              // Отказ не должен ронять урок: не дошло до второго экрана — преподаватель
              // продолжает вести, а не смотрит на ошибку посреди занятия.
              void setProjectorFocus({
                variables: { sessionId, studentId: identity },
              }).catch(() => undefined);
            }}
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
    teacherId: session?.teacherId ?? null,
    selfName: `${meData?.me?.firstName ?? ''} ${meData?.me?.lastName ?? ''}`.trim(),
    lessonTitle: session?.lesson?.title ?? null,
    startAt: session?.startAt ?? null,
  };
  return meData?.me?.role === 'TEACHER' ? (
    <TeacherRoom {...props} />
  ) : (
    <>
      <MarkPresent sessionId={sessionId} isLive={props.isLive} />
      <StudentRoom {...props} />
    </>
  );
}

/**
 * 🔴 КОМНАТА — ПОСЛЕДНЯЯ ДВЕРЬ, И ОТМЕТКИ НА НЕЙ НЕ БЫЛО (наряд 35 §1, замер видео 18.08).
 *
 * Промпт 27 научил отмечаться расписание и точку встречи. Но ученик попадает в комнату и
 * ПРЯМОЙ ссылкой: прислали адрес, перезагрузил вкладку, открыл вторую, вернулся после обрыва.
 * Тогда `joinSession` не звался никем, и человек оказывался на уроке, не будучи отмеченным.
 *
 * Замер видео это и показал: двое видят друг друга, но у преподавателя ученик подписан
 * **шестнадцатеричным огрызком** `72019060 · нет данных` вместо «Аня К» — имена преподаватель
 * берёт из списка присутствующих, а ученика в нём не было. В дневник при этом уехало бы
 * «отсутствовал» про урок, на котором ребёнок был.
 *
 * Отметка идемпотентна на сервере (`update_or_create`), поэтому звать её на входе в комнату
 * безопасно и правильно: кто дошёл до комнаты — тот на уроке, каким бы путём ни дошёл.
 */
function MarkPresent({ sessionId, isLive }: { sessionId: string; isLive: boolean }) {
  const [joinSession] = useJoinSessionMutation();
  const marked = useRef(false);
  useEffect(() => {
    if (!isLive || marked.current) return;
    marked.current = true;
    // Отказ не должен мешать уроку: не пустили отметиться — идём в комнату всё равно,
    // ровно как на экране прибытия (промпт 27).
    void joinSession({ variables: { sessionId } }).catch(() => undefined);
  }, [isLive, joinSession, sessionId]);
  return null;
}

/** TEMPORARY: preview (VITE_PREVIEW=1) swaps the real LiveKit/CMF room for a camera-free,
 *  network-free display shell. Remove with the demo layer before real launch. */
export function LiveRoomScreen() {
  if (import.meta.env.VITE_PREVIEW === '1') return <PreviewRoom />;
  return <LiveRoomRealScreen />;
}
