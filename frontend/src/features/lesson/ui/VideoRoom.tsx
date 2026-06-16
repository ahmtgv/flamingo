import { type RemoteParticipant } from 'livekit-client';
import { Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui';

import { type RoomConnectionState, type ScreenShare } from '../livekit/useLiveKitRoom';
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
  connectionState,
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
  onRejoin,
  onLeave,
  nameFor,
}: {
  localStream: MediaStream | null;
  connecting: boolean;
  connectionState: RoomConnectionState;
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
  onRejoin: () => void;
  onLeave: () => void;
  /** Resolve a participant identity (== user id) to a display name; teacher-only (roster). */
  nameFor?: (identity: string) => string;
}) {
  const { t } = useTranslation('lesson');
  // Terminal states render an overlay OVER the still-mounted tiles (never an early return).
  const terminal = connectionState === 'disconnected' || connectionState === 'failed';

  const rejoinRef = useRef<HTMLButtonElement>(null);
  // a11y: move focus to the primary recovery action when the terminal overlay appears, so a
  // keyboard / screen-reader user lands on Rejoin (the overlay's role="alert" announces it).
  useEffect(() => {
    if (terminal) rejoinRef.current?.focus();
  }, [terminal]);

  // Single persistent polite live region for the TRANSIENT states (reconnecting/reconnected).
  // Terminal states are announced assertively by the overlay's role="alert", so they are
  // intentionally NOT duplicated here (no double announcement); the visible banners below are
  // aria-hidden decoration.
  const liveAnnouncement =
    connectionState === 'reconnecting'
      ? t('reconnecting')
      : connectionState === 'reconnected'
        ? t('reconnected')
        : '';

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
      {/* The room's single polite live region (the project's first). Announces transient
          connection changes; empty (silent) otherwise. */}
      <p className={styles.srOnly} role="status">
        {liveAnnouncement}
      </p>

      {cameraEnabled && (
        <p className={styles.liveBadge} role="status">
          <Radio size={13} aria-hidden="true" /> {t('liveBadge')}
        </p>
      )}

      {/* Non-blocking lifecycle banner — a SIBLING of the tiles, so the local <video>
          underneath never unmounts (and keeps its srcObject) during a reconnect.
          aria-hidden: it's visual only; the live region above does the announcing. */}
      {connectionState === 'reconnecting' && (
        <p className={styles.stateBanner} data-kind="reconnecting" aria-hidden="true">
          <RefreshCw size={14} /> {t('reconnecting')}
        </p>
      )}
      {connectionState === 'reconnected' && (
        <p className={styles.stateBanner} data-kind="reconnected" aria-hidden="true">
          <Wifi size={14} /> {t('reconnected')}
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
          <VideoTile
            key={p.sid}
            participant={p}
            version={version}
            active={activeSpeakers.has(p.sid)}
            displayName={nameFor ? nameFor(p.identity) : p.identity.slice(0, 8)}
          />
        ))}
      </div>

      {connecting && <p className={styles.connecting}>{t('connecting')}</p>}
      {controls}

      {/* Terminal state: an overlay layered OVER the still-mounted tiles (never an early
          return that unmounts them — that was the 7686a9c camera-loss hazard). The camera
          <video> survives underneath, so Rejoin — which re-runs only the LiveKit connect —
          brings the call back with the self-view (and CMF) already live. */}
      {terminal && (
        <div className={styles.disconnectedOverlay}>
          <div className={styles.disconnectedCard} role="alert">
            <WifiOff size={22} aria-hidden="true" />
            <p className={styles.disconnectedText}>
              {connectionState === 'failed' ? t('connectionFailed') : t('connectionLost')}
            </p>
            <Button
              ref={rejoinRef}
              variant="primary"
              size="sm"
              icon={<RefreshCw size={15} />}
              onClick={onRejoin}
            >
              {t('rejoin')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
