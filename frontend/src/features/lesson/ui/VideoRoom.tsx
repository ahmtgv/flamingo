import { type RemoteParticipant } from 'livekit-client';
import { Radio } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type ScreenShare } from '../livekit/useLiveKitRoom';
import { RoomControls } from './RoomControls';
import { TrackVideo, VideoTile } from './VideoTile';
import styles from './videoroom.module.css';

/**
 * Video grid (≤5) + controls. The camera tiles live in ONE stable `.tiles` container
 * whose layout switches (grid ↔ filmstrip) via the `data-screen` attribute in CSS only —
 * tiles are NEVER moved to a different parent, so no <video> unmounts on a screen-share
 * toggle (that bug blacked the local tile). The screen stage is an ADDITIONAL element
 * rendered above the stable tiles. The local self-view shows the SAME stream LiveKit
 * publishes; for students that stream is also analysed on-device by the CMF pipeline (a
 * separate hidden <video>). The screen track is a separate surface — it never feeds CMF.
 */
export function VideoRoom({
  localStream,
  connecting,
  roomFull,
  micEnabled,
  cameraEnabled,
  screenSharing,
  participants,
  version,
  activeSpeakers,
  screenShare,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}: {
  localStream: MediaStream | null;
  connecting: boolean;
  roomFull: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  participants: RemoteParticipant[];
  version: number;
  activeSpeakers: Set<string>;
  screenShare: ScreenShare | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation('lesson');

  // Callback ref → (re)attaches the shared stream on ANY mount, not relying on a deps array.
  const attachLocal = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && localStream) el.srcObject = localStream;
    },
    [localStream],
  );

  const controls = (
    <RoomControls
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      screenSharing={screenSharing}
      onToggleMic={onToggleMic}
      onToggleCamera={onToggleCamera}
      onToggleScreenShare={onToggleScreenShare}
      onLeave={onLeave}
    />
  );

  if (roomFull) {
    return (
      <div className={styles.room}>
        <p className={styles.note}>{t('roomFull')}</p>
        {controls}
      </div>
    );
  }

  return (
    <div className={styles.room}>
      {cameraEnabled && (
        <p className={styles.liveBadge} role="status">
          <Radio size={13} /> {t('liveBadge')}
        </p>
      )}

      {/* Screen stage: an ADDITIONAL element above the stable tiles (never moves tiles). */}
      {screenShare && (
        <div className={styles.stage}>
          <TrackVideo track={screenShare.track} className={styles.stageVideo} />
          <span className={styles.name}>
            {t('presenting', {
              who: screenShare.isLocal ? t('you') : screenShare.identity.slice(0, 8),
            })}
          </span>
        </div>
      )}

      {/* ONE stable container; grid vs filmstrip is CSS-only via data-screen. */}
      <div className={styles.tiles} data-screen={!!screenShare} data-count={participants.length + 1}>
        <div key="local" className={styles.tile}>
          {/* Local self-view (mirrored). Muted to avoid local echo. */}
          <video ref={attachLocal} className={styles.videoMirror} autoPlay playsInline muted />
          {!cameraEnabled && <span className={styles.camOff}>{t('camera.off')}</span>}
          <span className={styles.name}>{t('you')}</span>
        </div>
        {participants.map((p) => (
          <VideoTile key={p.sid} participant={p} version={version} active={activeSpeakers.has(p.sid)} />
        ))}
      </div>

      {connecting && <p className={styles.connecting}>{t('connecting')}</p>}
      {controls}
    </div>
  );
}
