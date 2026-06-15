import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './videoroom.module.css';

/** Call controls: mute mic, toggle camera, leave. Headless — wired by the parent. */
export function RoomControls({
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onLeave,
}: {
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation('lesson');
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.controlBtn}
        data-off={!micEnabled}
        onClick={onToggleMic}
        aria-pressed={!micEnabled}
        aria-label={micEnabled ? t('mic.on') : t('mic.off')}
        title={micEnabled ? t('mic.on') : t('mic.off')}
      >
        {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
      </button>
      <button
        type="button"
        className={styles.controlBtn}
        data-off={!cameraEnabled}
        onClick={onToggleCamera}
        aria-pressed={!cameraEnabled}
        aria-label={cameraEnabled ? t('camera.on') : t('camera.off')}
        title={cameraEnabled ? t('camera.on') : t('camera.off')}
      >
        {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
      </button>
      <button
        type="button"
        className={`${styles.controlBtn} ${styles.leaveBtn}`}
        onClick={onLeave}
        aria-label={t('leave')}
        title={t('leave')}
      >
        <PhoneOff size={18} />
      </button>
    </div>
  );
}
