import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './seedum.module.css';

/** Mandatory on every camera-using screen: makes the on-device guarantee visible. */
export function PrivacyIndicator() {
  const { t } = useTranslation('seedum');
  return (
    <span className={styles.privacy} role="status">
      <ShieldCheck size={14} /> {t('privacy')}
    </span>
  );
}
