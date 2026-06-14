import { type ReactNode } from 'react';

import { Logo } from '@/shared/ui';

import styles from './auth.module.css';
import { ThemeToggle } from './ThemeToggle';

export function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Logo />
        <div className={styles.barRight}>
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.main}>
        <div className={[styles.col, wide ? styles.colWide : ''].filter(Boolean).join(' ')}>
          {children}
        </div>
      </main>
    </div>
  );
}
