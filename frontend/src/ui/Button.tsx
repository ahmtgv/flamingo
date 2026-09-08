import type { ButtonHTMLAttributes, ReactNode } from 'react'

import s from './Button.module.css'

/** Вид кнопки — это её СМЫСЛ, а не оформление (ПРАВИЛА 11).
 *
 *  `go`    — главное действие экрана. Зелёная заливка. На экране такая одна.
 *  `quiet` — всё остальное: обводка, нейтральный цвет.
 *  `leave` — уход и отмена: коралловая ОБВОДКА, не заливка (ПРАВИЛА 11.3).
 */
export type ButtonKind = 'go' | 'quiet' | 'leave' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: ButtonKind
  /** Кнопка включена, но нажатие ничего не меняет — объявляем словами (ПРАВИЛА 14.1). */
  still?: string
  children: ReactNode
}

export function Button({ kind = 'quiet', still, className, children, ...rest }: Props) {
  /* 🔴 СВОЙ КЛАСС ДОБАВЛЯЕТСЯ, А НЕ ЗАМЕЩАЕТ. Экрану иногда нужен ОДИН крючок
     раскладки — «не тянись на всю колонку», «встань во всю ширину». Если бы
     `className` приходил через `...rest`, он затирал бы `.b` целиком, и кнопка
     теряла бы весь свой вид молча. Заведено 08.09, когда шесть экранов взяли
     общую кнопку (решение владельца): без этого им пришлось бы держать свою
     копию ради одной строки раскладки — а это ровно то, от чего уходили. */
  return (
    <button
      type="button"
      className={`${s.b} ${s[kind]}${className ? ` ${className}` : ''}`}
      data-still={still}
      {...rest}
    >
      {children}
    </button>
  )
}
