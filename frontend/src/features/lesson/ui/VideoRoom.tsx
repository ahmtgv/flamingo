import { type RemoteParticipant } from 'livekit-client';
import { Radio } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { RoomControls } from './RoomControls';
import { VideoTile } from './VideoTile';
import styles from './videoroom.module.css';

/**
 * Video grid (slice 1: local self-view + remote tiles) + controls. The local
 * self-view shows the SAME stream that LiveKit publishes; for students that stream
 * is also analysed on-device by the CMF pipeline (a separate <video>, see the room).
 *
 * The CALL camera is published to the teacher — this surface is honest about that
 * (the "в эфире" badge). The on-device CMF privacy claim lives on the CMF panel.
 */
export function VideoRoom({
  localStream,
  connecting,
  micEnabled,
  cameraEnabled,
  participants,
  version,
  onToggleMic,
  onToggleCamera,
  onLeave,
}: {
  localStream: MediaStream | null;
  connecting: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  participants: RemoteParticipant[];
  version: number;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation('lesson');
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  return (
    <div className={styles.room}>
      {cameraEnabled && (
        <p className={styles.liveBadge} role="status">
          <Radio size={13} /> {t('liveBadge')}
        </p>
      )}
      <div className={styles.grid} data-count={participants.length + 1}>
        <div className={styles.tile}>
          {/* Local self-view (mirrored). Muted to avoid local echo. */}
          <video ref={localRef} className={styles.videoMirror} autoPlay playsInline muted />
          {!cameraEnabled && <span className={styles.camOff}>{t('camera.off')}</span>}
          <span className={styles.name}>{t('you')}</span>
        </div>
        {participants.map((p) => (
          <VideoTile key={p.sid} participant={p} version={version} />
        ))}
      </div>
      {connecting && <p className={styles.connecting}>{t('connecting')}</p>}
      <RoomControls
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onToggleMic={onToggleMic}
        onToggleCamera={onToggleCamera}
        onLeave={onLeave}
      />
    </div>
  );
}
