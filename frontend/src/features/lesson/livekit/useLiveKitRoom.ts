// Headless LiveKit room hook. Connects with the per-viewer room token, publishes the
// tracks we already own (from the shared getUserMedia stream), and exposes remote
// participants, mic/camera/screen-share toggles, active speakers, and a ≤5 soft guard.
//
// We publish OUR OWN camera/mic MediaStreamTracks (not LiveKit's setCameraEnabled device
// flow) so the same stream also feeds the on-device CMF pipeline; mic/camera toggles flip
// those tracks' `enabled`. Screen share is SEPARATE: setScreenShareEnabled adds a
// getDisplayMedia track IN ADDITION to the camera (camera + CMF keep running); the screen
// track never feeds CMF.

import { type Participant, type RemoteParticipant, Room, RoomEvent, Track } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** MVP soft cap (total participants incl. self). Hard cap is server-side (deferred). */
export const MAX_PARTICIPANTS = 5;

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
  leave: () => void;
}

export function useLiveKitRoom({ url, token, stream, active }: UseLiveKitRoomArgs): LiveKitRoomState {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomFull, setRoomFull] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [version, setVersion] = useState(0);
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());
  const [screenShare, setScreenShare] = useState<ScreenShare | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  useEffect(() => {
    if (!active || !token || !stream || !url) return undefined;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const sync = () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
      setScreenSharing(room.localParticipant.isScreenShareEnabled);
      // Feature one screen share: a remote presenter first, else our own.
      let share: ScreenShare | null = null;
      for (const p of room.remoteParticipants.values()) {
        const track = p.getTrackPublication(Track.Source.ScreenShare)?.track;
        if (track) {
          share = { sid: p.sid, identity: p.identity, isLocal: false, track };
          break;
        }
      }
      if (!share) {
        const local = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track;
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
      .on(RoomEvent.LocalTrackPublished, sync)
      .on(RoomEvent.LocalTrackUnpublished, sync)
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) =>
        setActiveSpeakers(new Set(speakers.map((s) => s.sid))),
      )
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) setConnected(false);
      });

    setConnecting(true);
    setError(null);
    const connecting = (async () => {
      try {
        await room.connect(url, token);
        if (cancelled) return;
        // ≤5 soft guard: if MAX others are already here, this would be the (MAX+1)th.
        if (room.remoteParticipants.size >= MAX_PARTICIPANTS) {
          setRoomFull(true);
          await room.disconnect();
          return;
        }
        const video = stream.getVideoTracks()[0];
        const audio = stream.getAudioTracks()[0];
        if (video) await room.localParticipant.publishTrack(video, { source: Track.Source.Camera });
        if (audio)
          await room.localParticipant.publishTrack(audio, { source: Track.Source.Microphone });
        if (cancelled) return;
        setMicEnabled(audio?.enabled ?? false);
        setCameraEnabled(video?.enabled ?? false);
        setConnected(true);
        setConnecting(false);
        sync();
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setConnecting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Disconnect only AFTER the in-flight connect settles — otherwise a React
      // StrictMode unmount (dev) aborts mid-connect → connect→leave→reconnect churn.
      // Prod (no double-invoke) connects once, so this just makes dev clean.
      void connecting.finally(() => room.disconnect());
      roomRef.current = null;
      setConnected(false);
      setParticipants([]);
    };
  }, [active, token, stream, url]);

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
    // Additive: leaves the camera (and CMF) running. May reject if the user cancels the
    // OS picker — swallow that. LocalTrackPublished/Unpublished events drive the UI.
    void room.localParticipant
      .setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled)
      .catch(() => undefined);
  }, []);

  const leave = useCallback(() => {
    void roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
  }, []);

  return {
    connected,
    connecting,
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
    leave,
  };
}
