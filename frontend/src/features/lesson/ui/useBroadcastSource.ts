import { useCallback, useRef, useState } from 'react';

/** Sheet 02 puts all three in the teacher's header. */
export type BroadcastSource = 'camera' | 'screen' | 'roomCamera';

export interface SourceState {
  source: BroadcastSource;
  /** The track currently being published — the SAME MediaStream object across switches. */
  stream: MediaStream | null;
  cameraOn: boolean;
  error: 'denied' | 'unavailable' | null;
}

/**
 * Switching what the room is watching — camera · screen · room camera.
 *
 * **The §2.7 rule lives here.** Two things that already cost us a bug:
 *
 * 1. **Never remount `<video>`.** The published `MediaStream` object identity is kept stable
 *    across a source switch: tracks are swapped INSIDE it (`removeTrack`/`addTrack`), so the
 *    element that renders it never has to be torn down and rebuilt. A remount is what makes a
 *    tile go black for a second, and it is what kills the CMF pipeline reading the same
 *    stream.
 * 2. **Turning the camera off is `track.enabled = false`, never `stop()`.** A stopped track
 *    cannot be restarted — the only way back is a new getUserMedia, which is a new object,
 *    which is the remount from (1). Disabled is instant and reversible.
 *
 * The room camera is a second physical camera in the classroom, chosen by deviceId; when
 * there is no second camera the switch fails honestly rather than silently showing the first.
 */
export function useBroadcastSource(base: MediaStream | null): SourceState & {
  switchTo: (source: BroadcastSource) => Promise<void>;
  setCameraOn: (on: boolean) => void;
  hasRoomCamera: () => Promise<boolean>;
} {
  const [source, setSource] = useState<BroadcastSource>('camera');
  const [cameraOn, setCameraOnState] = useState(true);
  const [error, setError] = useState<'denied' | 'unavailable' | null>(null);
  /** Tracks we acquired ourselves (screen / room camera) — stopped when we replace them. */
  const extraRef = useRef<MediaStreamTrack | null>(null);
  /** The person's own camera track. Held separately because a source switch takes it OUT of
   *  the published stream, and it has to be the same object that goes back in — re-acquiring
   *  would be a new object, and a new object is the remount §2.7 forbids. */
  const cameraRef = useRef<MediaStreamTrack | null>(null);

  /** Put `track` in the published stream in place of whatever video is there now. */
  const swapVideo = useCallback(
    (track: MediaStreamTrack | null) => {
      if (!base) return;
      for (const existing of base.getVideoTracks()) {
        base.removeTrack(existing);
        if (existing === extraRef.current) continue;
        // The camera's own track is only ever DISABLED (rule 2) and remembered, never
        // stopped: it has to be the same object when we switch back.
        cameraRef.current = existing;
        existing.enabled = false;
      }
      if (track) base.addTrack(track);
    },
    [base],
  );

  const stopExtra = useCallback(() => {
    extraRef.current?.stop();
    extraRef.current = null;
  }, []);

  const hasRoomCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return false;
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  }, []);

  const switchTo = useCallback(
    async (next: BroadcastSource) => {
      setError(null);
      if (!base) return;

      if (next === 'camera') {
        stopExtra();
        const camera = cameraRef.current ?? base.getVideoTracks()[0] ?? null;
        if (camera) {
          // Put the SAME track back and re-enable it — we never stopped it, so there is
          // nothing to re-acquire and nothing to remount.
          if (!base.getVideoTracks().includes(camera)) base.addTrack(camera);
          camera.enabled = cameraOn;
        }
        setSource('camera');
        return;
      }

      try {
        const media =
          next === 'screen'
            ? await navigator.mediaDevices.getDisplayMedia({ video: true })
            : await navigator.mediaDevices.getUserMedia({
                video: { deviceId: await secondCameraId() },
              });
        const track = media.getVideoTracks()[0];
        if (!track) throw new Error('no track');
        stopExtra();
        extraRef.current = track;
        swapVideo(track);
        // Stopping the share from the browser's own bar must put us back on camera.
        track.addEventListener('ended', () => void switchTo('camera'));
        setSource(next);
      } catch (e) {
        setError((e as DOMException)?.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      }
    },
    [base, cameraOn, stopExtra, swapVideo],
  );

  /** Rule 2, exposed: the mute button never stops a track. */
  const setCameraOn = useCallback(
    (on: boolean) => {
      setCameraOnState(on);
      if (source === 'camera') {
        for (const track of base?.getVideoTracks() ?? []) track.enabled = on;
        if (cameraRef.current) cameraRef.current.enabled = on;
      }
    },
    [base, source],
  );

  return { source, stream: base, cameraOn, error, switchTo, setCameraOn, hasRoomCamera };
}

/** The second video input, if the classroom has one. */
async function secondCameraId(): Promise<string | undefined> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((d) => d.kind === 'videoinput');
  return cameras[1]?.deviceId ?? cameras[0]?.deviceId;
}
