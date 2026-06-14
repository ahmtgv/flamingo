import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';

import { Input } from './Input';
import styles from './fields.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Show the required asterisk and set aria-required. */
  requiredMark?: boolean;
}

/** Label + input + help/error, with id/aria-describedby wired for a11y. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, requiredMark, ...inputProps },
  ref,
) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {requiredMark ? (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      <Input
        id={id}
        ref={ref}
        invalid={!!error}
        aria-required={requiredMark || undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {error ? (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
