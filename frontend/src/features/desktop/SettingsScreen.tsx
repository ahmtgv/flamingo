import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useMyDevicesQuery,
  useRecordCabinetBackupMutation,
  useRevokeDeviceMutation,
} from '@/entities/graphql/generated';

import { cabinetFolder, revealCabinetFolder } from './cabinetFolder';
import styles from './settings.module.css';

const TABS = ['link', 'data', 'devices'] as const;
type Tab = (typeof TABS)[number];

/**
 * Настройки — куда уехали числа связи (atlas D2, решение владельца 14.08).
 *
 * During a lesson the teacher sees a word: «связь хорошая». The numbers did not disappear,
 * they live here — and the sheet is specific about how they are labelled: «каждое число
 * подписано тем, на что оно влияет, а не тем, как называется в протоколе». So the row is not
 * «uplink», it is «канал вверх — определяет, сколько учеников можно вести без потери
 * качества».
 *
 * Three tabs are real (связь · данные и копия · устройства). The sheet draws four more —
 * учётка, урок, обновления, о программе — and those belong to phases that own their content;
 * drawing empty tabs now would be furniture.
 */
export function SettingsScreen() {
  const { t } = useTranslation('desktop');
  const [tab, setTab] = useState<Tab>('link');
  const { data, refetch } = useMyDevicesQuery();
  const [recordBackup, { loading: backingUp }] = useRecordCabinetBackupMutation();
  const [revoke] = useRevokeDeviceMutation();

  const devices = data?.myDevices ?? [];
  const machine = devices[0];
  const uplink = machine?.uplink ?? null;
  const setup = machine?.setup ?? null;

  return (
    <div className={styles.screen}>
      <h1 className={styles.h}>{t('settings.title')}</h1>
      <p className={styles.intro}>{t('settings.intro')}</p>

      <div className={styles.tabs} role="tablist" aria-label={t('settings.title')}>
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={styles.tab}
            onClick={() => setTab(id)}
          >
            {t(`settings.tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'link' && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {machine?.uplink
              ? t('settings.link.title', {
                  when: new Date(machine.lastSeenAt ?? Date.now()).toLocaleString('ru'),
                })
              : t('settings.link.never')}
          </h2>

          {/* Подпись — то, на что число влияет, а не как оно называется в протоколе. */}
          <Row
            label={t('settings.link.up')}
            hint={t('settings.link.upHint')}
            value={uplink ? `${uplink.mbps} Мбит/с` : '—'}
          />
          <Row
            label={t('settings.link.verdict')}
            hint={t('settings.link.verdictHint')}
            value={
              uplink
                ? uplink.groupSize > 0
                  ? t('settings.link.groupOf', { count: uplink.groupSize })
                  : t('settings.link.groupNone')
                : '—'
            }
          />
          <Row
            label={t('settings.link.conn')}
            hint={t('settings.link.connHint')}
            value={
              uplink
                ? uplink.connectionType === 'DIRECT'
                  ? t('settings.link.direct')
                  : uplink.connectionType === 'RELAY'
                    ? t('settings.link.relay')
                    : t('settings.link.unknown')
                : '—'
            }
          />
          {uplink?.stale && <p className={styles.warn}>{t('settings.link.stale')}</p>}
        </section>
      )}

      {tab === 'data' && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('settings.data.title')}</h2>
          <Row
            label={t('settings.data.folder')}
            hint={
              setup?.backupKind === 'CLOUD_FOLDER'
                ? t('settings.data.kindCloud')
                : t('settings.data.kindExternal')
            }
            value={cabinetFolder()}
            action={
              <button
                type="button"
                className={styles.mini}
                onClick={() => void revealCabinetFolder()}
              >
                {t('settings.data.reveal')}
              </button>
            }
          />
          <Row
            label={t('settings.data.lastBackup')}
            hint={t('settings.data.exportHint')}
            value={
              setup?.lastBackupAt
                ? new Date(setup.lastBackupAt).toLocaleString('ru')
                : t('settings.data.lastBackupNever')
            }
            action={
              <button
                type="button"
                className={styles.mini}
                disabled={backingUp}
                onClick={() => void recordBackup().then(() => refetch())}
              >
                {t('settings.data.backupNow')}
              </button>
            }
          />
        </section>
      )}

      {tab === 'devices' && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('settings.devices.title')}</h2>
          {devices.length === 0 && <p className={styles.hint}>{t('settings.devices.empty')}</p>}
          {devices.map((d) => (
            <Row
              key={d.id}
              label={d.name}
              hint={t('settings.devices.pairedAt', {
                when: new Date(d.pairedAt).toLocaleDateString('ru'),
              })}
              value={d.online ? t('settings.devices.online') : t('settings.devices.offline')}
              action={
                /* «Украденный ноутбук» (§19.4 п.3): отзыв убивает и ключи этой машины. */
                <button
                  type="button"
                  className={styles.mini}
                  title={t('settings.devices.revokeHint')}
                  onClick={() =>
                    void revoke({ variables: { deviceId: d.id } }).then(() => refetch())
                  }
                >
                  {t('settings.devices.revoke')}
                </button>
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  hint,
  value,
  action,
}: {
  label: string;
  hint: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>
        <b>{label}</b>
        <small>{hint}</small>
      </span>
      <span className={styles.rowValue}>{value}</span>
      {action}
    </div>
  );
}
