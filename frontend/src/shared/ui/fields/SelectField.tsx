import { forwardRef, type ReactNode, type SelectHTMLAttributes, useId } from 'react';

import { Select } from './Select';
import styles from './fields.module.css';

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string;
  /** Пояснение под полем — то же, что у TextField, и та же проводка в aria-describedby. */
  hint?: ReactNode;
  requiredMark?: boolean;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, requiredMark, children, ...rest },
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
      <Select
        id={id}
        ref={ref}
        invalid={!!error}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Select>
      {error ? (
        /* role="alert" — как у TextField (R-16): ошибка поля обязана быть услышана. */
        <p className={styles.error} id={`${id}-error`} role="alert">
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
