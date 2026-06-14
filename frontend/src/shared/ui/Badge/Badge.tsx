import { type ReactNode } from 'react';

import styles from './Badge.module.css';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot, children }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(' ')}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
