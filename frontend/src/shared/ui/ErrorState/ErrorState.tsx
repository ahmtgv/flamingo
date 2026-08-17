import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { failureText } from '@/shared/lib/requestFailure';
import { ICON_MD, ICON_SM } from '@/shared/ui/iconSizes';

import { Button } from '../Button/Button';
import styles from './errorState.module.css';

/** Inline error state for a data screen whose query failed. Shows a calm message + a Retry
 *  that re-runs the query (`onRetry` = the Apollo `refetch`). `role="alert"` announces it.
 *  Distinct from the global ErrorBoundary (a render crash) — this is a recoverable load failure.
 *
 * 🔴 ЧЕТЫРЕ ОТКАЗА НЕ ДОЛЖНЫ ВЫГЛЯДЕТЬ ОДИНАКОВО (промпт 27 §1.1 п.4).
 *
 * Аудит по ролям 17.08: из восемнадцати мест, где экран сообщает об отказе, девять писали
 * «Что-то пошло не так» и на «сети нет», и на «сервер отказал». Человеку это две разные
 * новости: в первом случае надо включить вай-фай, во втором — звонить. Одинаковые слова
 * отнимают у него единственную подсказку, которая у него есть.
 *
 * `error` — сама ошибка Apollo; из неё `failureText` уже умеет достать, что случилось.
 * `text` остаётся для тех мест, где экран знает лучше общего правила.
 */
export function ErrorState({
  onRetry,
  text,
  error,
}: {
  onRetry?: () => void;
  text?: string;
  error?: unknown;
}) {
  const { t } = useTranslation('common');
  const wording = text ?? (error !== undefined ? t(failureText(error)) : t('errors.generic'));
  return (
    <div className={styles.wrap} role="alert">
      <AlertCircle className={styles.icon} size={ICON_MD} aria-hidden="true" />
      <p className={styles.text}>{wording}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw size={ICON_SM} />} onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      )}
    </div>
  );
}
