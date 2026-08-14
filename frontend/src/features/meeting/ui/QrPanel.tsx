import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './invite.module.css';

/**
 * «Показать QR» — код той же двери, для телефона в руках у родителя (лист D3).
 *
 * Рисуется **на устройстве**: генератор загружается динамическим импортом и только по нажатию.
 * Два следствия, оба нужные: ссылка группы не уезжает ни на какой сторонний сервис ради
 * картинки, и 30 КБ кодировщика не едут в бандл к каждому ученику ради кнопки, которую
 * нажимают раз в четверть.
 */
export function QrPanel({ url }: { url: string }) {
  const { t } = useTranslation('meeting');
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { toDataURL } = await import('qrcode');
        const data = await toDataURL(url, { margin: 1, width: 320 });
        if (alive) setSrc(data);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  if (failed) return <p className={styles.note}>{t('invite.qrFailed')}</p>;
  if (!src) return <p className={styles.note}>…</p>;
  return (
    <figure className={styles.qr}>
      <img src={src} alt={t('invite.qrAlt')} width={320} height={320} />
      <figcaption className={styles.note}>{t('invite.qrHint')}</figcaption>
    </figure>
  );
}
