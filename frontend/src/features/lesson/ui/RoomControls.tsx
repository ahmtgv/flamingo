import { ICON_MD } from '@/shared/ui/iconSizes';
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './videoroom.module.css';

/** Call controls: mute mic, toggle camera, screen share, leave. Headless — wired by the parent. */
export function RoomControls({
  micEnabled,
  cameraEnabled,
  screenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}: {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation('lesson');
  return (
    <div className={styles.controls} role="group" aria-label={t('controls')}>
      <button
        type="button"
        className={styles.controlBtn}
        data-off={!micEnabled}
        onClick={onToggleMic}
        aria-pressed={!micEnabled}
        aria-label={micEnabled ? t('mic.on') : t('mic.off')}
        title={micEnabled ? t('mic.on') : t('mic.off')}
      >
        {micEnabled ? <Mic size={ICON_MD} /> : <MicOff size={ICON_MD} />}
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
        {cameraEnabled ? <Video size={ICON_MD} /> : <VideoOff size={ICON_MD} />}
      </button>
      <button
        type="button"
        className={styles.controlBtn}
        data-on={screenSharing}
        onClick={onToggleScreenShare}
        aria-pressed={screenSharing}
        aria-label={screenSharing ? t('screenShare.off') : t('screenShare.on')}
        title={screenSharing ? t('screenShare.off') : t('screenShare.on')}
      >
        <MonitorUp size={ICON_MD} />
      </button>
      <button
        type="button"
        className={`${styles.controlBtn} ${styles.leaveBtn}`}
        onClick={onLeave}
        aria-label={t('leave')}
        title={t('leave')}
      >
        <PhoneOff size={ICON_MD} />
      </button>
    </div>
  );
}
