import { type ReactNode } from 'react';

import styles from './cabinet.module.css';

/** Honest empty-state for sections whose data arrives with later modules. */
export function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyText}>{text}</p>
    </div>
  );
}
