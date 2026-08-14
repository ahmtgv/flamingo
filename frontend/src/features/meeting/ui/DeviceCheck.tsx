import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './arrival.module.css';

/**
 * Три чипа проверки — atlas D3, экран ожидания.
 *
 * «За двенадцать минут до урока ученик уже на странице. Это лучшее время, чтобы проверить
 * камеру и звук — не в первую минуту занятия, когда все ждут.»
 *
 * «Наушников нет» подсвечено заранее и намеренно: эхо от восьми динамиков рушит урок надёжнее
 * слабого канала, и сказать об этом надо до, а не после.
 *
 * ⚠️ Перечисляем устройства, а не открываем поток: зажигать индикатор камеры на странице
 * ожидания — это включать камеру ребёнку до занятия, чего никто не просил.
 */
export function DeviceCheck() {
  const { t } = useTranslation('meeting');
  const [camera, setCamera] = useState<boolean | null>(null);
  const [mic, setMic] = useState<boolean | null>(null);
  const [headphones, setHeadphones] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!alive) return;
        setCamera(devices.some((d) => d.kind === 'videoinput'));
        setMic(devices.some((d) => d.kind === 'audioinput'));
        // Наушники не отличить наверняка без разрешения на метки; спрашиваем по названию и,
        // когда не знаем, молчим — а не утверждаем, что их нет.
        const labelled = devices.filter((d) => d.kind === 'audiooutput' && d.label);
        setHeadphones(
          labelled.length === 0 ? null : labelled.some((d) => /наушник|headphone|airpods/i.test(d.label)),
        );
      } catch {
        if (alive) {
          setCamera(false);
          setMic(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={styles.chips}>
      <span className={styles.chip} data-ok={camera === true}>
        {camera === false ? t('check.cameraMissing') : t('check.camera')}
      </span>
      <span className={styles.chip} data-ok={mic === true}>
        {mic === false ? t('check.micMissing') : t('check.mic')}
      </span>
      {headphones === false && (
        <span className={styles.chip} data-warn="true" title={t('check.why')}>
          {t('check.headphones')}
        </span>
      )}
    </div>
  );
}
