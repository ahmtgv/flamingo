import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'go';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, loading, icon, disabled, children, className, type, ...rest },
  ref,
) {
  const cls = [styles.btn, styles[variant], styles[size], block ? styles.block : '', loading ? styles.loading : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cls}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {!loading && icon}
      {children}
    </button>
  );
});
