import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

import s from './Field.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** ПРАВИЛА 13.1: обязательность говорится ОДИН раз и словами — не звёздочкой у метки. */
  hint?: string
}

export function Field({ label, hint, ...rest }: Props) {
  const id = useId()
  return (
    <div className={s.wrap}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={s.input} {...rest} />
      {hint ? <span className={s.hint}>{hint}</span> : null}
    </div>
  )
}
