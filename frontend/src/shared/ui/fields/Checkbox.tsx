import { Check } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import styles from './fields.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
  /** Render inside a bordered surface (e.g. the consent block). */
  boxed?: boolean;
  invalid?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { children, boxed, invalid, className, ...rest },
  ref,
) {
  const cls = [
    styles.check,
    boxed ? styles.checkBoxed : '',
    invalid ? styles.checkInvalid : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <label className={cls}>
      <input
        ref={ref}
        type="checkbox"
        className={styles.checkInput}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <span className={styles.box} aria-hidden="true">
        <Check className={styles.tick} strokeWidth={3} />
      </span>
      <span className={styles.checkText}>{children}</span>
    </label>
  );
});
