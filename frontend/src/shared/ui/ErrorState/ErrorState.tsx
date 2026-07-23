import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ICON_MD, ICON_SM } from '@/shared/ui/iconSizes';

import { Button } from '../Button/Button';
import styles from './errorState.module.css';

/** Inline error state for a data screen whose query failed. Shows a calm message + a Retry
 *  that re-runs the query (`onRetry` = the Apollo `refetch`). `role="alert"` announces it.
 *  Distinct from the global ErrorBoundary (a render crash) — this is a recoverable load failure. */
export function ErrorState({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const { t } = useTranslation('common');
  return (
    <div className={styles.wrap} role="alert">
      <AlertCircle className={styles.icon} size={ICON_MD} aria-hidden="true" />
      <p className={styles.text}>{text ?? t('errors.generic')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw size={ICON_SM} />} onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      )}
    </div>
  );
}
