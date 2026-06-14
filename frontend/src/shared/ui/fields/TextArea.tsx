import { forwardRef, type TextareaHTMLAttributes } from 'react';

import styles from './fields.module.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={[styles.textarea, invalid ? styles.invalid : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
