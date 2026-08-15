import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCompleteDeviceSetupMutation } from '@/entities/graphql/generated';

import { stepFailureKey } from './stepFailure';
import styles from './setup.module.css';

/**
 * Шаг 5 — готово (atlas D2).
 *
 * A summary rather than a congratulation: four lines saying what is now true about this
 * machine, and three things a teacher might actually want to do next. The last line matters
 * more than it looks — «приложение можно закрывать: пока урока нет, оно ничего не делает» —
 * because a program that has just claimed to be hosting lessons sounds like one you have to
 * babysit, and this one does not.
 */
export function DoneStep({
  teacherName,
  attentionOn,
  groupSize,
  onOpenCabinet,
}: {
  teacherName: string;
  attentionOn: boolean;
  groupSize: number | null;
  onOpenCabinet: () => void;
}) {
  const { t } = useTranslation('desktop');
  const [complete] = useCompleteDeviceSetupMutation();
  const [failed, setFailed] = useState<string | null>(null);

  const finish = async () => {
    // The server checks the mandatory copy here too (§19.1) — a wizard is a sequence of
    // components and a component can be skipped by a URL.
    setFailed(null);
    try {
      await complete();
      onOpenCabinet();
    } catch (error) {
      // Последняя кнопка мастера. Молчащая, она оставляет человека в настройке навсегда.
      setFailed(stepFailureKey(error));
    }
  };

  return (
    <div className={styles.step}>
      <h2 className={styles.h}>{t('setup.done.title')}</h2>
      <p className={styles.p}>{t('setup.done.body')}</p>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.done.whatTitle')}</span>
        <ul className={styles.facts}>
          <li>{t('setup.done.signedIn', { name: teacherName })}</li>
          <li>{t('setup.done.cabinetAt')}</li>
          <li>{attentionOn ? t('setup.done.consentsDoneOn') : t('setup.done.consentsDone')}</li>
          <li>
            {groupSize === null
              ? t('setup.done.checkedUnknown')
              : t('setup.done.checked', { count: groupSize })}
          </li>
        </ul>
      </div>

      <div className={styles.row}>
        {/* Причина словами — на каждом шаге, а не только на первом. */}
        {failed && (
          <p className={styles.warn} role="alert">
            {t(failed)}
          </p>
        )}

        <button type="button" className={styles.btn} onClick={() => void finish()}>
          {t('setup.done.openCabinet')}
        </button>
      </div>
      <p className={styles.note}>{t('setup.done.canClose')}</p>
    </div>
  );
}
