import { useTranslation } from 'react-i18next';

import styles from './desktop.module.css';

/**
 * «Нет сети» — atlas sheet D1.
 *
 * 🔴 The order of the four lines on this card is the design, not a layout.
 *
 * The teacher's laptop is the **only copy** of the pupils' work and grades (OWNER_SCOPE §18),
 * and at the moment the network drops the person in front of it has one question before any
 * other. So the first thing this screen does is answer it: **данные в целости**. The sheet is
 * explicit — «Главное сообщение — не "ошибка", а "ваши данные в целости"».
 *
 * Second by importance: work can go on. Checking homework and preparing materials never needed
 * the network, and a screen that says only «no connection» hides a working machine behind an
 * error message.
 */
export function OfflineScreen({
  onRetry,
  onWorkOffline,
}: {
  onRetry?: () => void;
  onWorkOffline?: () => void;
}) {
  const { t } = useTranslation('desktop');

  return (
    <div className={styles.offWrap}>
      <div className={styles.offCard} role="status">
        <span className={styles.offT}>{t('offline.title')}</span>
        <span className={styles.offS}>{t('offline.body')}</span>

        {/* Первое, что человек имеет право узнать. */}
        <span className={styles.offSafe}>
          <i aria-hidden="true" />
          {t('offline.safe')}
        </span>

        <span className={styles.offNote}>{t('offline.stillWorks')}</span>

        <span className={styles.offRow}>
          <button type="button" className={styles.btn} onClick={onRetry}>
            {t('offline.check')}
          </button>
          <button type="button" className={styles.btnGhost} onClick={onWorkOffline}>
            {t('offline.offlineWork')}
          </button>
        </span>
      </div>
    </div>
  );
}
