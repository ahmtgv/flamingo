import { useTranslation } from 'react-i18next';

import styles from './pilotcontrols.module.css';

/**
 * Кнопки нижнего пульта комнаты — лист «Комната урока».
 *
 * 🔴 СЛОВАМИ, А НЕ ЗНАЧКАМИ. Прежние кнопки были иконками с подсказкой по наведению:
 * перечёркнутый микрофон одинаково читается как «выключен» и как «выключить». Слово
 * «Микрофон» плюс состояние снимают вопрос, и подсказка не нужна.
 *
 * ⚠️ Кнопки «поднять руку» и «доска ученикам» здесь НЕТ намеренно. Поднятой руки в продукте
 * не существует (плитка её показывает, послать её нечем), а доступ к доске живёт внутри самой
 * доски и там работает. Нарисовать их в пульте значило бы поставить две кнопки, которые
 * ничего не делают, — а лист как раз про то, чтобы кнопка означала действие.
 */
export function PilotControls({
  micEnabled,
  cameraEnabled,
  screenSharing,
  canShareScreen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
}: {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  canShareScreen?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
}) {
  const { t } = useTranslation('lesson');
  return (
    <>
      <button
        type="button"
        className={styles.pill}
        data-off={!micEnabled || undefined}
        aria-pressed={!micEnabled}
        onClick={onToggleMic}
      >
        {micEnabled ? t('pilot.mic') : t('pilot.micOff')}
      </button>
      <button
        type="button"
        className={styles.pill}
        data-off={!cameraEnabled || undefined}
        aria-pressed={!cameraEnabled}
        onClick={onToggleCamera}
      >
        {cameraEnabled ? t('pilot.camera') : t('pilot.cameraOff')}
      </button>
      {canShareScreen && (
        <button
          type="button"
          className={styles.pill}
          data-on={screenSharing || undefined}
          aria-pressed={screenSharing}
          onClick={onToggleScreenShare}
        >
          {screenSharing ? t('pilot.screenOff') : t('pilot.screen')}
        </button>
      )}
    </>
  );
}
