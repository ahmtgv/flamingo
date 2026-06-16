import { type RemoteParticipant, type Track } from 'livekit-client';
import { Track as TrackNs } from 'livekit-client';
import { MicOff, VideoOff } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('lesson');
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
    // `version` bumps when this participant's tracks change/mute (sub/unsub + mute/unmute).
  }, [participant, version]);

  // Camera is "off" if there's no camera track OR it's muted; mic likewise. These are read
  // fresh on every render; the parent bumps `version` on TrackMuted/TrackUnmuted so a remote
  // toggle updates the tile live.
  const camPub = participant.getTrackPublication(TrackNs.Source.Camera);
  const cameraOff = !camPub?.track || camPub.isMuted;
  const micMuted = participant.getTrackPublication(TrackNs.Source.Microphone)?.isMuted ?? true;
  const name = participant.identity.slice(0, 8);

  // One accessible name for the whole tile (role="img" makes the media subtree atomic to AT).
  const label = [name, cameraOff ? t('tile.cameraOff') : '', micMuted ? t('tile.micOff') : '']
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.tile} data-active={!!active} role="img" aria-label={label}>
      <video ref={videoRef} className={styles.video} autoPlay playsInline />
      <audio ref={audioRef} autoPlay />
      {cameraOff && (
        <span className={styles.camOff} aria-hidden="true">
          <VideoOff size={20} />
        </span>
      )}
      <span className={styles.name}>
        {micMuted && <MicOff size={12} aria-hidden="true" />}
        {name}
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
