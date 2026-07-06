import { type RemoteParticipant } from 'livekit-client';
import { Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CMF } from '@/seedum/cmfConfig';
import { Meter } from '@/seedum/ui/Meter';
import { Button } from '@/shared/ui';

import { type RoomConnectionState, type ScreenShare } from '../livekit/useLiveKitRoom';
import { RoomControls } from './RoomControls';
import { TrackVideo, VideoTile } from './VideoTile';
import styles from './videoroom.module.css';

/**
 * Video grid (≤8) + controls. The camera tiles live in ONE stable `.tiles` container
 * whose layout switches (grid ↔ filmstrip ↔ focus) via data attributes in CSS only —
 * tiles are NEVER moved to a different parent, so no <video> unmounts on a screen-share
 * or focus toggle (that bug blacked the local tile). The screen stage is an ADDITIONAL
 * element rendered above the stable tiles. The local self-view shows the SAME stream
 * LiveKit publishes; for students that stream is also analysed on-device by the CMF
 * pipeline (a separate hidden <video>). The screen track is a separate surface — it
 * never feeds CMF.
 *
 * F1 (final design v2, no-overlap): with `selfInRail` the local self-view lives in a
 * permanent side rail next to the stage (never overlaying it) together with optional
 * extra rail content (`rail`, e.g. the student-view preview). With `focusable` a click
 * on a remote tile makes it the stage (others shrink to a strip but stay live); second
 * click / Esc collapses. Focus is pure presentation state — data attributes only.
 */
export function VideoRoom({
  localStream,
  liveBadgeLabel,
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
  localOverlay,
  focusable = false,
  attentionFor,
  selfInRail = false,
  rail,
}: {
  localStream: MediaStream | null;
  /** Role-specific self-view badge copy (student: "…преподаватель вас видит"; teacher: own). */
  liveBadgeLabel: string;
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
  /** Optional content pinned over the LOCAL self-view tile (student: the attention strip). */
  localOverlay?: ReactNode;
  /** F1: click-to-focus on remote tiles (teacher). */
  focusable?: boolean;
  /** F1: latest live attention (0–100) for a participant identity — feeds the focus bar. */
  attentionFor?: (identity: string) => number | null;
  /** F1: render the local self-view in the side rail (teacher) instead of inside the grid. */
  selfInRail?: boolean;
  /** F1: extra rail content under the self tile (e.g. «что видит ученик» preview). */
  rail?: ReactNode;
}) {
  const { t } = useTranslation('lesson');
  // Terminal states render an overlay OVER the still-mounted tiles (never an early return).
  const terminal = connectionState === 'disconnected' || connectionState === 'failed';

  // F1 focus: presentation state only — flips data attributes on the stable containers.
  const [focusedSid, setFocusedSid] = useState<string | null>(null);
  const toggleFocus = useCallback(
    (sid: string) => setFocusedSid((cur) => (cur === sid ? null : sid)),
    [],
  );
  // Esc collapses the focus (listener only while focused).
  useEffect(() => {
    if (!focusedSid) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusedSid(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedSid]);
  // Drop the focus if the focused participant left the room.
  useEffect(() => {
    if (focusedSid && !participants.some((p) => p.sid === focusedSid)) setFocusedSid(null);
  }, [participants, focusedSid]);

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

  // F1 focus bar: name · live attention (mono Meter — sanctioned frosted strip over video)
  // · «нужно внимание» text (threshold from cmfConfig ONLY) · Esc hint. Display-only.
  const focusBarFor = (p: RemoteParticipant): ReactNode => {
    const value = attentionFor ? attentionFor(p.identity) : null;
    const name = nameFor ? nameFor(p.identity) : p.identity.slice(0, 8);
    return (
      <span className={styles.focusBar}>
        <span className={styles.focusLabel}>{t('focus.attention')}</span>
        <Meter value={value} ariaLabel={`${t('focus.attention')} ${name}: ${value ?? '—'}`} tone="mono" />
        <span className={styles.focusValue}>{value ?? '—'}</span>
        {value != null && value < CMF.liveAttentionAlertBelow && (
          <span className={styles.focusAlert}>{t('focus.needsAttention')}</span>
        )}
        <span className={styles.focusEsc}>{t('focus.escHint')}</span>
      </span>
    );
  };

  // Local self-view: the SAME element markup whether it lives in the grid (student) or in
  // the rail (teacher, no-overlap layout) — decided once per role at mount, never flipped.
  const localTileInner = (
    <>
      {/* Local self-view (mirrored). Muted to avoid local echo. */}
      <video ref={attachLocal} className={styles.videoMirror} autoPlay playsInline muted />
      {!cameraEnabled && <span className={styles.camOff}>{t('camera.off')}</span>}
      {/* Optional overlay (student attention strip) — a sibling of the <video>, never wraps
          it, so the self-view track is untouched. */}
      {localOverlay}
      <span className={styles.name}>{t('you')}</span>
    </>
  );

  // Screen stage: an ADDITIONAL element above the stable tiles (never moves tiles).
  const screenStage = screenShare && (
    <div className={styles.stage}>
      <TrackVideo track={screenShare.track} className={styles.stageVideo} />
      <span className={styles.name}>
        {t('presenting', {
          who: screenShare.isLocal ? t('you') : screenShare.identity.slice(0, 8),
        })}
      </span>
    </div>
  );

  // ONE stable container; grid vs filmstrip vs focus is CSS-only via data attributes.
  const tiles = (
    <div
      className={styles.tiles}
      data-screen={!!screenShare}
      data-count={participants.length + 1}
      data-focus={!!focusedSid}
    >
      {!selfInRail && (
        <div key="local" className={styles.tile}>
          {localTileInner}
        </div>
      )}
      {participants.map((p) => (
        <VideoTile
          key={p.sid}
          participant={p}
          version={version}
          active={activeSpeakers.has(p.sid)}
          displayName={nameFor ? nameFor(p.identity) : p.identity.slice(0, 8)}
          onClick={focusable ? () => toggleFocus(p.sid) : undefined}
          focused={focusable && p.sid === focusedSid}
          focusBar={focusable && p.sid === focusedSid ? focusBarFor(p) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className={styles.room}>
      {/* The room's single polite live region (the project's first). Announces transient
          connection changes; empty (silent) otherwise. */}
      <p className={styles.srOnly} role="status">
        {liveAnnouncement}
      </p>

      {cameraEnabled && (
        <p className={styles.liveBadge} role="status">
          <Radio size={13} aria-hidden="true" /> {liveBadgeLabel}
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

      {selfInRail ? (
        /* Final design v2: stage column + permanent side rail — nothing overlays the stage. */
        <div className={styles.roomGrid}>
          <div className={styles.stageArea}>
            {screenStage}
            {tiles}
          </div>
          <div className={styles.rail}>
            <div className={styles.railTile}>{localTileInner}</div>
            <p className={styles.railCap}>{t('rail.selfCaption')}</p>
            {rail}
          </div>
        </div>
      ) : (
        <>
          {screenStage}
          {tiles}
        </>
      )}

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

/** F1: «что видит ученик» — a rail preview card the teacher can toggle. It renders from
 *  LOCAL state (the same published stream + a placeholder strip for the classmates row);
 *  it is NOT a second video stream and adds zero network traffic. */
export function StudentViewPreview({
  stream,
  peers,
}: {
  stream: MediaStream | null;
  peers: number;
}) {
  const { t } = useTranslation('lesson');
  const [open, setOpen] = useState(false);
  const attach = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && stream) el.srcObject = stream;
    },
    [stream],
  );
  return (
    <>
      <button
        type="button"
        className={styles.svToggle}
        aria-pressed={open}
        onClick={() => setOpen((o) => !o)}
      >
        {t('studentView.toggle')}
      </button>
      {open && (
        <div className={styles.svCard} role="img" aria-label={t('studentView.caption')}>
          <div className={styles.svStage}>
            <video ref={attach} className={styles.videoMirror} autoPlay playsInline muted />
            <span className={styles.svName}>{t('studentView.teacherLabel')}</span>
          </div>
          <div className={styles.svRow} aria-hidden="true">
            {Array.from({ length: Math.min(Math.max(peers, 1), 8) }).map((_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
