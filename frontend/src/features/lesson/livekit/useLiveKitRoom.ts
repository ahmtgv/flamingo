// Headless LiveKit room hook. Connects with the per-viewer room token, publishes the
// tracks we already own (from the shared getUserMedia stream), and exposes remote
// participants, mic/camera/screen-share toggles, active speakers, and a ≤5 soft guard.
//
// We publish OUR OWN camera/mic MediaStreamTracks (not LiveKit's setCameraEnabled device
// flow) so the same stream also feeds the on-device CMF pipeline; mic/camera toggles flip
// those tracks' `enabled`. Screen share is SEPARATE: setScreenShareEnabled adds a
// getDisplayMedia track IN ADDITION to the camera (camera + CMF keep running); the screen
// track never feeds CMF.

import {
  DisconnectReason,
  type Participant,
  type RemoteParticipant,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** MVP soft cap (total participants incl. self) — owner decision: class size up to 8.
 *  Hard cap is server-side (deferred backlog: livekit-api max_participants=8). */
export const MAX_PARTICIPANTS = 8;

/** How long the "reconnected" success notice lingers before settling to 'connected'. */
const RECONNECTED_NOTICE_MS = 2500;

/**
 * One explicit room-connection state the UI renders directly — driven off LiveKit's
 * connection-lifecycle events (Reconnecting / Reconnected / Disconnected) plus our own
 * connect success/failure, never inferred from booleans scattered across the UI.
 */
export type RoomConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'reconnected'
  | 'disconnected'
  | 'failed';

/**
 * Map a LiveKit disconnect to a terminal UI state. A clean, expected close (we left, the
 * host ended/closed the room, or another tab took our identity) reads as 'disconnected';
 * anything fault-like (server/signal/media/timeout, or unknown) reads as 'failed'. Both
 * states offer Rejoin — the split only changes the copy shown.
 */
/** Сколько ждём поднятия эфира, прежде чем сказать человеку, что не вышло. */
export const CONNECT_DEADLINE_MS = 20_000;

/**
 * Почему эфир не поднялся — словами, а не кодом ошибки (наряд 35 §1.4).
 *
 * ⚠️ Разбор по тексту исключения — не красиво, но честно: livekit-client не отдаёт код, а
 * человеку разница видна невооружённым глазом. «Сервер не отвечает» лечится одним действием,
 * «комната закрыта» — другим, а общее «не удалось» не лечится ничем.
 */
export type FailureReason = 'unreachable' | 'rejected' | 'unknown';

export function classifyFailure(error: string | null): FailureReason {
  if (!error) return 'unknown';
  if (/signal connection|timed out|websocket|network|ConnectionError/i.test(error)) {
    return 'unreachable';
  }
  if (/permission|unauthorized|token|denied/i.test(error)) return 'rejected';
  return 'unknown';
}

export function classifyDisconnect(reason?: DisconnectReason): 'disconnected' | 'failed' {
  switch (reason) {
    case DisconnectReason.CLIENT_INITIATED:
    case DisconnectReason.ROOM_DELETED:
    case DisconnectReason.ROOM_CLOSED:
    case DisconnectReason.PARTICIPANT_REMOVED:
    case DisconnectReason.DUPLICATE_IDENTITY:
      return 'disconnected';
    default:
      return 'failed';
  }
}

export interface UseLiveKitRoomArgs {
  url: string;
  token: string | null;
  stream: MediaStream | null;
  /** Connect only once the user has joined (camera acquired + token present). */
  active: boolean;
}

export interface ScreenShare {
  sid: string;
  identity: string;
  isLocal: boolean;
  track: Track;
}

export interface LiveKitRoomState {
  connected: boolean;
  connecting: boolean;
  /** One explicit lifecycle state for the UI (reconnecting banner / rejoin overlay). */
  connectionState: RoomConnectionState;
  error: string | null;
  roomFull: boolean;
  participants: RemoteParticipant[];
  /** Bumps on track add/remove so tiles re-attach their media. */
  version: number;
  activeSpeakers: Set<string>;
  screenShare: ScreenShare | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  /** Re-run ONLY the LiveKit connect (keeps the shared camera + CMF pipeline alive). */
  rejoin: () => void;
  leave: () => void;
}

export function useLiveKitRoom({ url, token, stream, active }: UseLiveKitRoomArgs): LiveKitRoomState {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<RoomConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [roomFull, setRoomFull] = useState(false);
  // Bumped by rejoin() to re-run ONLY this effect (reconnect the LiveKit room) without
  // touching the shared camera stream — so the local <video> and CMF pipeline stay alive.
  const [attempt, setAttempt] = useState(0);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [version, setVersion] = useState(0);
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());
  const [screenShare, setScreenShare] = useState<ScreenShare | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  useEffect(() => {
    // 🔴 `stream` СЮДА НЕ ВХОДИТ (найдено аудитом 17.08 — «тёмный экран на планшете»).
    //
    // Здесь стояло `!stream` в одном ряду с `!token` и `!url`, и это было верно ровно до
    // появления первого экрана, который СМОТРИТ, но не публикует. Проектор (`/projector`)
    // передаёт `stream: null` намеренно — «watch-only, ремни и подтяжки», — и потому
    // `room.connect()` не вызывался никогда: ни участников, ни ошибки, ни состояния.
    // Оставался пустой прямоугольник цвета `--color-surface-video`. Ровно то, что владелец
    // видел на планшете.
    //
    // Отсутствие потока — причина не подключаться, а не публиковать. Проверка переехала
    // к публикации, десятью строками ниже.
    if (!active || !token || !url) return undefined;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    // A screen publication only counts if its underlying track is LIVE — a track that
    // ended (e.g. via the browser's "Stop sharing" bar) may linger as a publication, and
    // we must NOT keep the grey stage open for it.
    const liveScreen = (pub: { track?: Track | null } | undefined): Track | null => {
      const tr = pub?.track;
      return tr && tr.mediaStreamTrack?.readyState === 'live' ? tr : null;
    };

    const sync = () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
      setScreenSharing(room.localParticipant.isScreenShareEnabled);
      // Feature one screen share: a remote presenter first, else our own.
      let share: ScreenShare | null = null;
      for (const p of room.remoteParticipants.values()) {
        const track = liveScreen(p.getTrackPublication(Track.Source.ScreenShare));
        if (track) {
          share = { sid: p.sid, identity: p.identity, isLocal: false, track };
          break;
        }
      }
      if (!share) {
        const local = liveScreen(room.localParticipant.getTrackPublication(Track.Source.ScreenShare));
        if (local) share = { sid: 'local', identity: 'you', isLocal: true, track: local };
      }
      setScreenShare(share);
      setVersion((v) => v + 1);
    };

    room
      .on(RoomEvent.ParticipantConnected, sync)
      .on(RoomEvent.ParticipantDisconnected, sync)
      .on(RoomEvent.TrackSubscribed, sync)
      .on(RoomEvent.TrackUnsubscribed, sync)
      .on(RoomEvent.TrackPublished, sync)
      .on(RoomEvent.TrackUnpublished, sync)
      // Remote mic/camera mute toggles → re-sync so tiles re-read mute/camera-off state live.
      .on(RoomEvent.TrackMuted, sync)
      .on(RoomEvent.TrackUnmuted, sync)
      .on(RoomEvent.LocalTrackPublished, sync)
      .on(RoomEvent.LocalTrackUnpublished, sync)
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) =>
        setActiveSpeakers(new Set(speakers.map((s) => s.sid))),
      )
      // Transient blip: livekit-client handles the reconnect internally — we only surface
      // it. The shared camera track and the CMF pipeline do NOT depend on this state, so
      // they keep running straight through the reconnect (no <video> remount, no worker
      // teardown). See LiveRoomScreen: the pipeline is keyed on [joined, stream, sessionId].
      .on(RoomEvent.Reconnecting, () => {
        if (!cancelled) setConnectionState('reconnecting');
      })
      .on(RoomEvent.Reconnected, () => {
        if (!cancelled) setConnectionState('reconnected');
      })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (cancelled) return;
        setConnected(false);
        setConnectionState(classifyDisconnect(reason));
      });

    setConnecting(true);
    setConnectionState('connecting');
    setError(null);

    /**
     * 🔴 БЕЗ ЭТОГО СРОКА ЧЕЛОВЕКУ НЕ ГОВОРЯТ НИЧЕГО (наряд 35 §1.4, замер 18.08).
     *
     * Порвал сокет до медиасервера и посмотрел, что видит преподаватель. Экран оказался
     * НЕОТЛИЧИМ от исправного: «Ваша камера в эфире», никакого сообщения, хотя в консоли
     * `could not establish signal connection`. Он ведёт урок, уверенный, что его видят.
     *
     * Причина: `room.connect()` перебирает попытки сам и отклоняется поздно, а к тому моменту
     * эффект успевает пересобраться (`cancelled`), и отказ проглатывается. Состояние навсегда
     * остаётся `connecting` — то есть «ещё чуть-чуть», без конца.
     *
     * Срок кладёт этому предел со стороны ПРОДУКТА, а не библиотеки: не поднялись за
     * `CONNECT_DEADLINE_MS` — говорим словами. Двадцать секунд — это дольше, чем собственные
     * попытки livekit, и короче, чем терпение человека перед классом.
     */
    const deadline = setTimeout(() => {
      if (cancelled) return;
      setConnectionState((state) => (state === 'connecting' ? 'failed' : state));
      setConnecting((was) => (was ? false : was));
      setError((prev) => prev ?? 'signal connection timed out');
    }, CONNECT_DEADLINE_MS);
    const connecting = (async () => {
      try {
        await room.connect(url, token);
        if (cancelled) return;
        // ≤8 soft guard: if MAX others are already here, this would be the (MAX+1)th.
        if (room.remoteParticipants.size >= MAX_PARTICIPANTS) {
          setRoomFull(true);
          await room.disconnect();
          return;
        }
        // Смотрящий без потока — полноправный участник комнаты: он видит и слышит, просто
        // не публикует ничего. Именно так устроен второй экран.
        const video = stream?.getVideoTracks()[0];
        const audio = stream?.getAudioTracks()[0];
        if (video) await room.localParticipant.publishTrack(video, { source: Track.Source.Camera });
        if (audio)
          await room.localParticipant.publishTrack(audio, { source: Track.Source.Microphone });
        if (cancelled) return;
        setMicEnabled(audio?.enabled ?? false);
        setCameraEnabled(video?.enabled ?? false);
        clearTimeout(deadline);
        setConnected(true);
        setConnecting(false);
        setConnectionState('connected');
        sync();
      } catch (e) {
        clearTimeout(deadline);
        if (!cancelled) {
          setError(String(e));
          setConnecting(false);
          setConnectionState('failed');
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(deadline);
      // Disconnect only AFTER the in-flight connect settles — otherwise a React
      // StrictMode unmount (dev) aborts mid-connect → connect→leave→reconnect churn.
      // Prod (no double-invoke) connects once, so this just makes dev clean.
      void connecting.finally(() => room.disconnect());
      roomRef.current = null;
      setConnected(false);
      setParticipants([]);
    };
  }, [active, token, stream, url, attempt]);

  // A recovered reconnect shows a brief "reconnected" notice, then settles to 'connected'.
  useEffect(() => {
    if (connectionState !== 'reconnected') return undefined;
    const id = setTimeout(() => setConnectionState('connected'), RECONNECTED_NOTICE_MS);
    return () => clearTimeout(id);
  }, [connectionState]);

  const toggleMic = useCallback(() => {
    const track = stream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  }, [stream]);

  const toggleCamera = useCallback(() => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    // Flips the shared track: stops publishing real video AND pauses the CMF feed.
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }, [stream]);

  const toggleScreenShare = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const turningOn = !room.localParticipant.isScreenShareEnabled;
    // Additive: leaves the camera (and CMF) running. May reject if the user cancels the
    // OS picker — swallow that. LocalTrackPublished/Unpublished events drive the UI.
    void room.localParticipant
      .setScreenShareEnabled(turningOn)
      .then((pub) => {
        // LiveKit does NOT reliably auto-unpublish when the screen track ends via the
        // browser's "Stop sharing" bar — route that through setScreenShareEnabled(false)
        // so the stage collapses (else it lingers as a grey rectangle).
        if (turningOn && pub) {
          pub.track?.mediaStreamTrack?.addEventListener(
            'ended',
            () => void room.localParticipant.setScreenShareEnabled(false).catch(() => undefined),
            { once: true },
          );
        }
      })
      .catch(() => undefined);
  }, []);

  // Re-run ONLY the connect effect (via the attempt counter). It never calls release()
  // or re-acquires getUserMedia, so the shared MediaStream object is retained — the local
  // <video> keeps its srcObject and the CMF pipeline (keyed on the stream) stays alive.
  const rejoin = useCallback(() => {
    setError(null);
    setRoomFull(false);
    setConnectionState('connecting');
    setAttempt((n) => n + 1);
  }, []);

  const leave = useCallback(() => {
    void roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
  }, []);

  return {
    connected,
    connecting,
    connectionState,
    error,
    roomFull,
    participants,
    version,
    activeSpeakers,
    screenShare,
    micEnabled,
    cameraEnabled,
    screenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    rejoin,
    leave,
  };
}
