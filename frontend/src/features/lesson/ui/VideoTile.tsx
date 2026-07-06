import { type RemoteParticipant, type Track } from 'livekit-client';
import { Track as TrackNs } from 'livekit-client';
import { MicOff, VideoOff } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './videoroom.module.css';

/** One remote participant's CAMERA tile (attaches camera video + audio).
 *
 * With `onClick` (teacher, F1 focus mode) the tile roots as a real `<button>`
 * (`aria-pressed` = focused). The root element is chosen ONCE per role at mount and never
 * flips mid-session; entering/leaving focus only toggles data attributes, so the inner
 * `<video>` is never remounted (the 7686a9c rule). */
export function VideoTile({
  participant,
  version,
  active,
  displayName,
  onClick,
  focused,
  focusBar,
  attention,
  alert,
}: {
  participant: RemoteParticipant;
  version: number;
  active?: boolean;
  /** Resolved name (teacher: real name; otherwise an id-slice) — labels the tile. */
  displayName: string;
  /** Teacher focus mode (F1): makes the tile a real button that toggles focus. */
  onClick?: () => void;
  /** Whether this tile is the focused stage (drives aria-pressed + data-focused). */
  focused?: boolean;
  /** Info strip rendered inside the tile while focused (name · attention · esc hint). */
  focusBar?: ReactNode;
  /** Teacher view: live attention (0–100) shown ON the tile at all times (owner v3). */
  attention?: number | null;
  /** Teacher view: below-threshold accent — coral ring + «нужно внимание» text. */
  alert?: boolean;
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
  const name = displayName;

  // One accessible name for the whole tile (role="img" makes the media subtree atomic to AT).
  // B-9: attention === null (prop passed, no fresh data) reads «нет данных» — never a fake 0.
  const label = [
    name,
    attention != null ? t('focus.attentionValue', { n: attention }) : '',
    attention === null ? t('tile.noData') : '',
    alert ? t('focus.needsAttention') : '',
    cameraOff ? t('tile.cameraOff') : '',
    micMuted ? t('tile.micOff') : '',
  ]
    .filter(Boolean)
    .join(', ');

  const inner = (
    <>
      <video ref={videoRef} className={styles.video} autoPlay playsInline />
      <audio ref={audioRef} autoPlay />
      {cameraOff && (
        <span className={styles.camOff} aria-hidden="true">
          <VideoOff size={20} />
        </span>
      )}
      {focused && focusBar}
      {/* Owner v3: the live attention value lives ON the tile at all times (mono chip).
          B-9: null (no fresh buckets — student out of frame) shows «нет данных», not «· 0». */}
      <span className={styles.name}>
        {micMuted && <MicOff size={12} aria-hidden="true" />}
        {name}
        {attention !== undefined && (
          <span className={styles.nameValue}>· {attention ?? t('tile.noData')}</span>
        )}
      </span>
      {alert && !focused && (
        <span className={styles.tileWarn} aria-hidden="true">
          {t('focus.needsAttention')}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.tile} ${styles.tileBtn}`}
        data-active={!!active}
        data-focused={!!focused}
        data-alert={!!alert}
        aria-pressed={!!focused}
        aria-label={focused ? t('focus.collapse', { name: label }) : t('focus.expand', { name: label })}
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={styles.tile} data-active={!!active} data-alert={!!alert} role="img" aria-label={label}>
      {inner}
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
