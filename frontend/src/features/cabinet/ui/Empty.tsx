import { type ReactNode } from 'react';

import styles from './cabinet.module.css';

/** Empty-state with an optional single call-to-action (atlas: one clear CTA per empty). */
export function Empty({ icon, text, cta }: { icon: ReactNode; text: string; cta?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyText}>{text}</p>
      {cta}
    </div>
  );
}
