import { type RemoteParticipant, type Track } from 'livekit-client';
import { Track as TrackNs } from 'livekit-client';
import { MicOff } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import styles from './videoroom.module.css';

/** One remote participant's CAMERA tile (attaches camera video + audio). */
export function VideoTile({
  participant,
  version,
  active,
}: {
  participant: RemoteParticipant;
  version: number;
  active?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const cam = participant.getTrackPublication(TrackNs.Source.Camera)?.track;
    const mic = participant.getTrackPublication(TrackNs.Source.Microphone)?.track;
    if (cam && videoRef.current) cam.attach(videoRef.current);
    if (mic && audioRef.current) mic.attach(audioRef.current);
    return () => {
      cam?.detach();
      mic?.detach();
    };
    // `version` bumps when this participant's tracks change (subscribe/unsubscribe).
  }, [participant, version]);

  const micMuted = participant.getTrackPublication(TrackNs.Source.Microphone)?.isMuted ?? true;

  return (
    <div className={styles.tile} data-active={!!active}>
      <video ref={videoRef} className={styles.video} autoPlay playsInline />
      <audio ref={audioRef} autoPlay />
      <span className={styles.name}>
        {micMuted && <MicOff size={12} aria-hidden="true" />}
        {participant.identity.slice(0, 8)}
      </span>
    </div>
  );
}

/** Attaches a single (camera or screen) track to a <video> — used for the screen main stage.
 *  Callback ref re-attaches on ANY (re)mount; detaches when the element/track goes away. */
export function TrackVideo({ track, className }: { track: Track; className?: string }) {
  const attach = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el) track.attach(el);
      else track.detach();
    },
    [track],
  );
  return <video ref={attach} className={className ?? styles.video} autoPlay playsInline muted />;
}
