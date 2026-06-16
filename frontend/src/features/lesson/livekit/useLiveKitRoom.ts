// Headless LiveKit room hook. Connects to the LiveKit server with the per-viewer
// room token, publishes tracks we already own (from the shared getUserMedia stream),
// and exposes remote participants + simple mic/camera toggles + leave.
//
// We publish OUR OWN MediaStreamTracks (not LiveKit's setCameraEnabled device flow)
// so the same stream can also feed the on-device CMF pipeline. Toggling flips the
// underlying track's `enabled`, which pauses both the published media AND the CMF
// feed (no camera ⇒ no attention to measure) — the camera is never re-acquired.

import { type RemoteParticipant, Room, RoomEvent, Track } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseLiveKitRoomArgs {
  url: string;
  token: string | null;
  stream: MediaStream | null;
  /** Connect only once the user has joined (camera acquired + token present). */
  active: boolean;
}

export interface LiveKitRoomState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  participants: RemoteParticipant[];
  /** Bumps on track add/remove so tiles re-attach their media. */
  version: number;
  micEnabled: boolean;
  cameraEnabled: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  leave: () => void;
}

export function useLiveKitRoom({ url, token, stream, active }: UseLiveKitRoomArgs): LiveKitRoomState {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [version, setVersion] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    if (!active || !token || !stream || !url) return undefined;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const sync = () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
      setVersion((v) => v + 1);
    };
    room
      .on(RoomEvent.ParticipantConnected, sync)
      .on(RoomEvent.ParticipantDisconnected, sync)
      .on(RoomEvent.TrackSubscribed, sync)
      .on(RoomEvent.TrackUnsubscribed, sync)
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) setConnected(false);
      });

    setConnecting(true);
    setError(null);
    const connecting = (async () => {
      try {
        await room.connect(url, token);
        if (cancelled) return;
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

  const leave = useCallback(() => {
    void roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
  }, []);

  return {
    connected,
    connecting,
    error,
    participants,
    version,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    leave,
  };
}
