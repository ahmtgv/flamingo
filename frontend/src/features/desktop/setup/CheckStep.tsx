import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useReportUplinkMutation } from '@/entities/graphql/generated';
import type { UplinkVerdict } from '@/entities/graphql/generated';

import { measureUplink, PROBE_SECONDS, REQUIRED_MBPS } from '../uplinkProbe';

import { canLeaveCheckStep, channelVerdict } from './firstRun';
import styles from './setup.module.css';

/**
 * Шаг 4 — камера, микрофон и канал (atlas D2, OWNER_SCOPE §19.3).
 *
 * Two decisions shape this screen and both are the owner's.
 *
 * **The verdict is a group size, not a speed.** «Мы не показываем "интернет хороший", мы
 * показываем размер группы: вдвоём, четверо, восемь. Это то, чем преподаватель распоряжается —
 * расписание он менять умеет, а битрейт нет.» The megabits live in the settings screen.
 *
 * 🔴 **Предупреждаем, не запрещаем (§19.3).** Nothing here blocks anything — not this step,
 * not creating a lesson, not the lesson. A weak channel produces a smaller suggested group and
 * a suggestion to use a cable; the teacher decides, because they know what the lesson is and
 * who the children are.
 */
export function CheckStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation('desktop');
  const [report] = useReportUplinkMutation();

  const [camera, setCamera] = useState<'checking' | 'found' | 'missing'>('checking');
  const [mic, setMic] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [left, setLeft] = useState(PROBE_SECONDS);
  const [result, setResult] = useState<{ verdict: UplinkVerdict; groupSize: number } | null>(null);

  // Камера и микрофон: перечисляем устройства, а не открываем поток — проверка «есть ли
  // камера» не повод включать её и зажечь индикатор до первого урока.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!alive) return;
        setCamera(devices.some((d) => d.kind === 'videoinput') ? 'found' : 'missing');
        setMic(devices.find((d) => d.kind === 'audioinput')?.label || null);
      } catch {
        if (alive) setCamera('missing');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const probe = async () => {
    setProbing(true);
    setLeft(PROBE_SECONDS);
    const tick = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const measured = await measureUplink();
    window.clearInterval(tick);
    setProbing(false);
    const { data } = await report({
      variables: { mbps: measured.mbps, connectionType: measured.connectionType },
    });
    const uplink = data?.reportUplink?.uplink;
    if (uplink) setResult({ verdict: uplink.verdict, groupSize: uplink.groupSize });
  };

  const verdict = result ? channelVerdict(result.verdict, result.groupSize) : null;

  return (
    <div className={styles.step}>
      <h2 className={styles.h}>{t('setup.check.title')}</h2>
      <p className={styles.p}>{t('setup.check.body')}</p>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.check.devicesTitle')}</span>
        {/* Нет камеры — не отказ. Урок вести можно, и экран говорит именно это. */}
        {camera === 'missing' && <p className={styles.warn}>{t('setup.check.cameraMissing')}</p>}
        <p className={styles.note}>
          {t('setup.check.micLabel')}: {mic ?? '—'}
        </p>
      </div>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('setup.check.channelTitle')}</span>

        <output className={styles.verdict} data-tone={verdict?.tone ?? 'none'} aria-live="polite">
          {probing
            ? t('setup.check.measuring', { left })
            : verdict === null
              ? t('setup.check.unmeasured')
              : verdict.tone === 'good'
                ? t('setup.check.good')
                : verdict.tone === 'weak'
                  ? t('setup.check.weak', { count: verdict.groupSize })
                  : t('setup.check.unusable')}
        </output>

        <p className={styles.note}>{t('setup.check.explain')}</p>

        <ul className={styles.needs}>
          <li>
            <b>{t('setup.check.need2')}</b>
            <small>{t('setup.check.needValue', { mbps: REQUIRED_MBPS[2] })}</small>
          </li>
          <li>
            <b>{t('setup.check.need4')}</b>
            <small>{t('setup.check.needValue', { mbps: REQUIRED_MBPS[4] })}</small>
          </li>
          <li>
            <b>{t('setup.check.need8')}</b>
            <small>{t('setup.check.needValue', { mbps: REQUIRED_MBPS[8] })}</small>
          </li>
        </ul>

        <div className={styles.row}>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={probing}
            onClick={() => void probe()}
          >
            {result ? t('setup.check.again') : t('setup.check.measure')}
          </button>
        </div>
        <p className={styles.note}>{t('setup.check.numbersLater')}</p>
      </div>

      <details className={styles.why}>
        <summary>{t('setup.check.whyTitle')}</summary>
        <p className={styles.note}>{t('setup.check.why')}</p>
      </details>

      {/* 🔴 §19.3 — кнопка не заблокирована ни при каком вердикте, включая «не годится». */}
      <button
        type="button"
        className={styles.btn}
        disabled={!canLeaveCheckStep()}
        onClick={onNext}
      >
        {t('setup.next')}
      </button>
    </div>
  );
}
