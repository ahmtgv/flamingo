import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BackupKind } from '@/entities/graphql/generated';
import { useConfigureCabinetBackupMutation } from '@/entities/graphql/generated';

import { cabinetFolder, chooseCabinetFolder } from '../cabinetFolder';

import { canLeaveCabinetStep } from './firstRun';
import { stepFailureKey } from './stepFailure';
import styles from './setup.module.css';

/**
 * Шаг 2 — где будут лежать данные, и копия (atlas D2, OWNER_SCOPE §19.1).
 *
 * The sheet calls this «самый честный разговор продукта», and the honesty is structural: the
 * work and the grades of living children sit on one laptop, which follows from the
 * architecture the owner chose — cheap, data with the people, nobody else's cloud. That
 * architecture has exactly one weak point, and it is the single copy.
 *
 * 🔴 So the copy is **not offered, it is configured**: the tick is on, and the step cannot be
 * left without it. This is the one place in the whole product that forces anything. The server
 * refuses `completeDeviceSetup` without it too — a wizard is a sequence of components, and a
 * component can be skipped by a URL.
 *
 * 🔒 The folder itself never leaves the machine. What the server records is the KIND of copy;
 * «/Users/люция/…» is the teacher's own disk and their OS account name.
 */
export function CabinetStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation('desktop');
  const [configure, { loading }] = useConfigureCabinetBackupMutation();
  const [folder, setFolder] = useState<string>(() => cabinetFolder());
  const [kind, setKind] = useState<BackupKind>('EXTERNAL_DISK');
  const [cloudCopy, setCloudCopy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const pick = async () => {
    const chosen = await chooseCabinetFolder();
    if (chosen) setFolder(chosen);
  };

  /**
   * 🔴 Находка владельца 15.08: здесь стояло `await configure(...)` без перехвата, и кнопка
   * «Дальше» нажималась, ничего не делала и ничего не говорила. Мутация требует
   * `Authorization: Device`, которого приложению было нечем предъявить, — и человек оставался
   * перед экраном, который выглядит рабочим.
   */
  const next = async () => {
    setFailed(null);
    try {
      await configure({ variables: { kind, cloudCopy } });
      onNext();
    } catch (error) {
      setFailed(stepFailureKey(error));
    }
  };

  return (
    <div className={styles.step}>
      <h2 className={styles.h}>{t('setup.cabinet.title')}</h2>
      <p className={styles.p}>{t('setup.cabinet.body')}</p>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.cabinet.folder')}</span>
        <div className={styles.row}>
          <code className={styles.path}>{folder}</code>
          <button type="button" className={styles.btnGhost} onClick={() => void pick()}>
            {t('setup.cabinet.change')}
          </button>
        </div>
        <p className={styles.note}>{t('setup.cabinet.inside')}</p>
        <p className={styles.note}>{t('setup.cabinet.size')}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{t('setup.cabinet.copyTitle')}</span>
          <span className={styles.tagStrong}>{t('setup.cabinet.copyTag')}</span>
        </div>
        <p className={styles.p}>{t('setup.cabinet.copyWhy')}</p>
        <p className={styles.note}>{t('setup.cabinet.copySchedule')}</p>

        {/* 🔴 §19.1: не галочка «если хотите». Выбор — куда, а не «делать ли». */}
        <fieldset className={styles.choice}>
          <legend className={styles.srOnly}>{t('setup.cabinet.copyTitle')}</legend>
          <label className={styles.radio}>
            <input
              type="radio"
              name="backupKind"
              checked={kind === 'EXTERNAL_DISK'}
              onChange={() => setKind('EXTERNAL_DISK')}
            />
            <span>
              <b>{t('setup.cabinet.externalDisk')}</b>
              <small>{t('setup.cabinet.externalDiskHint')}</small>
            </span>
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="backupKind"
              checked={kind === 'CLOUD_FOLDER'}
              onChange={() => setKind('CLOUD_FOLDER')}
            />
            <span>
              <b>{t('setup.cabinet.cloudFolder')}</b>
              <small>{t('setup.cabinet.cloudFolderHint')}</small>
            </span>
          </label>
        </fieldset>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{t('setup.cabinet.cloudTitle')}</span>
          <span className={styles.tag}>{t('setup.cabinet.cloudTag')}</span>
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={cloudCopy}
            onChange={(e) => setCloudCopy(e.target.checked)}
          />
          <span>{t('setup.cabinet.cloudHint')}</span>
        </label>
        {/* Сказано прямо, а не мелким шрифтом: ключ у преподавателя, и потеря ключа
            невосстановима. Это честная цена за то, что данные детей не читает посторонний. */}
        {cloudCopy && <p className={styles.warn}>{t('setup.cabinet.keyWarning')}</p>}
      </div>

      {/* Причина словами — на каждом шаге, а не только на первом. */}
      {failed && (
        <p className={styles.warn} role="alert">
          {t(failed)}
        </p>
      )}

      <button
        type="button"
        className={styles.btn}
        disabled={!canLeaveCabinetStep(kind) || loading}
        onClick={() => void next()}
      >
        {t('setup.next')}
      </button>
    </div>
  );
}
