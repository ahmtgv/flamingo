import { type ReactNode } from 'react';

import styles from './fields.module.css';

/** Two-column layout for side-by-side fields (collapses to one column on mobile). */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
