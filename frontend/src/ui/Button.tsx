import type { ButtonHTMLAttributes, ReactNode } from 'react'

import s from './Button.module.css'

/** Вид кнопки — это её СМЫСЛ, а не оформление (ПРАВИЛА 11).
 *
 *  `go`    — главное действие экрана. Зелёная заливка. На экране такая одна.
 *  `quiet` — всё остальное: обводка, нейтральный цвет.
 *  `leave` — уход и отмена: коралловая ОБВОДКА, не заливка (ПРАВИЛА 11.3).
 */
export type ButtonKind = 'go' | 'quiet' | 'leave'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: ButtonKind
  /** Кнопка включена, но нажатие ничего не меняет — объявляем словами (ПРАВИЛА 14.1). */
  still?: string
  children: ReactNode
}

export function Button({ kind = 'quiet', still, children, ...rest }: Props) {
  return (
    <button type="button" className={`${s.b} ${s[kind]}`} data-still={still} {...rest}>
      {children}
    </button>
  )
}
