import { type RemoteParticipant } from 'livekit-client';
import { Radio } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { type ScreenShare } from '../livekit/useLiveKitRoom';
import { RoomControls } from './RoomControls';
import { TrackVideo, VideoTile } from './VideoTile';
import styles from './videoroom.module.css';

/**
 * Video grid (≤5) + controls. The local self-view shows the SAME stream LiveKit
 * publishes; for students that stream is also analysed on-device by the CMF pipeline
 * (a separate hidden <video>, see the room). When anyone screen-shares, the screen
 * becomes the main stage and cameras drop to a filmstrip. The screen track is a
 * separate getDisplayMedia surface — it never feeds CMF, and the camera keeps running.
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
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  if (roomFull) {
    return (
      <div className={styles.room}>
        <p className={styles.note}>{t('roomFull')}</p>
        <RoomControls
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          screenSharing={screenSharing}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onLeave={onLeave}
        />
      </div>
    );
  }

  const localTile = (
    <div className={styles.tile}>
      {/* Local self-view (mirrored). Muted to avoid local echo. */}
      <video ref={localRef} className={styles.videoMirror} autoPlay playsInline muted />
      {!cameraEnabled && <span className={styles.camOff}>{t('camera.off')}</span>}
      <span className={styles.name}>{t('you')}</span>
    </div>
  );
  const cameraTiles = participants.map((p) => (
    <VideoTile key={p.sid} participant={p} version={version} active={activeSpeakers.has(p.sid)} />
  ));

  return (
    <div className={styles.room}>
      {cameraEnabled && (
        <p className={styles.liveBadge} role="status">
          <Radio size={13} /> {t('liveBadge')}
        </p>
      )}

      {screenShare ? (
        <>
          <div className={styles.stage}>
            <TrackVideo track={screenShare.track} className={styles.stageVideo} />
            <span className={styles.name}>
              {t('presenting', {
                who: screenShare.isLocal ? t('you') : screenShare.identity.slice(0, 8),
              })}
            </span>
          </div>
          <div className={styles.filmstrip}>
            {localTile}
            {cameraTiles}
          </div>
        </>
      ) : (
        <div className={styles.grid} data-count={participants.length + 1}>
          {localTile}
          {cameraTiles}
        </div>
      )}

      {connecting && <p className={styles.connecting}>{t('connecting')}</p>}
      <RoomControls
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        screenSharing={screenSharing}
        onToggleMic={onToggleMic}
        onToggleCamera={onToggleCamera}
        onToggleScreenShare={onToggleScreenShare}
        onLeave={onLeave}
      />
    </div>
  );
}
