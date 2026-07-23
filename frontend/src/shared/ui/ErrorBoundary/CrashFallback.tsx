import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ICON_LG } from '@/shared/ui/iconSizes';

import { Button } from '../Button/Button';
import styles from './errorBoundary.module.css';

/** Full-screen crash fallback (atlas sheet 11). Uses window.location so it needs no router
 *  context — the boundary can therefore wrap the router itself. `role="alert"` announces it. */
export function CrashFallback() {
  const { t } = useTranslation('common');
  return (
    <div className={styles.wrap}>
      <div className={styles.panel} role="alert">
        <AlertTriangle className={styles.icon} size={ICON_LG} aria-hidden="true" />
        <h1 className={styles.title}>{t('crash.title')}</h1>
        <p className={styles.body}>{t('crash.body')}</p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t('crash.reload')}
          </Button>
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            {t('crash.home')}
          </Button>
        </div>
      </div>
    </div>
  );
}
