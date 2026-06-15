import { type RemoteParticipant, Track } from 'livekit-client';
import { MicOff } from 'lucide-react';
import { useEffect, useRef } from 'react';

import styles from './videoroom.module.css';

/** One remote participant: attaches their published video + audio tracks. */
export function VideoTile({
  participant,
  version,
}: {
  participant: RemoteParticipant;
  version: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const pubs = Array.from(participant.trackPublications.values());
    const videoTrack = pubs.find((p) => p.kind === Track.Kind.Video)?.track;
    const audioTrack = pubs.find((p) => p.kind === Track.Kind.Audio)?.track;
    if (videoTrack && videoRef.current) videoTrack.attach(videoRef.current);
    if (audioTrack && audioRef.current) audioTrack.attach(audioRef.current);
    return () => {
      videoTrack?.detach();
      audioTrack?.detach();
    };
    // `version` bumps when this participant's tracks change (subscribe/unsubscribe).
  }, [participant, version]);

  const muted = !Array.from(participant.trackPublications.values()).some(
    (p) => p.kind === Track.Kind.Audio && !p.isMuted,
  );

  return (
    <div className={styles.tile}>
      <video ref={videoRef} className={styles.video} autoPlay playsInline />
      <audio ref={audioRef} autoPlay />
      <span className={styles.name}>
        {muted && <MicOff size={12} aria-hidden="true" />}
        {participant.identity.slice(0, 8)}
      </span>
    </div>
  );
}
