import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';

import styles from './fields.module.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...rest },
  ref,
) {
  return (
    <div className={styles.selectWrap}>
      <select
        ref={ref}
        className={[styles.select, invalid ? styles.invalid : '', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className={styles.selectIcon} aria-hidden="true" />
    </div>
  );
});
