/** Язык, на котором доски двух браузеров договариваются между собой.
 *
 *  Сервер этих сообщений не видит: они идут по данным-каналу LiveKit прямо между
 *  участниками (docs/ГРАНИЦА.md §4). Поэтому язык маленький и без версий — договориться
 *  не с кем, кроме такого же фронта.
 *
 *  Координаты — доли ШИРИНЫ холста, и `y` тоже. Не «доли своей стороны»: у двух окон
 *  разные пропорции, и круг у одного стал бы яйцом у другого. Ценой этого видимая
 *  область снизу у окон разная — это честнее искажения.
 */

export type Point = [number, number]

export type Stroke = {
  id: string
  /** Имя токена цвета, а не значение: цвет считается на месте, из темы (ПРАВИЛА 2.8). */
  color: string
  width: number
  pts: Point[]
}

export type Msg =
  /** Кусок штриха: первый приходит вместе с цветом и толщиной, следующие — только точками. */
  | { t: 'seg'; id: string; color: string; width: number; pts: Point[] }
  | { t: 'erase'; ids: string[] }
  | { t: 'clear' }
  /** «Я только вошёл, покажите доску». */
  | { t: 'ask' }
  | { t: 'state'; strokes: Stroke[] }

export type Bus = {
  send: (m: Msg) => void
  subscribe: (fn: (m: Msg) => void) => () => void
}

export const PENS = [
  { token: '--color-text', title: 'Чёрный' },
  { token: '--fl-coral-500', title: 'Коралловый' },
  { token: '--color-go', title: 'Зелёный' },
  { token: '--color-info', title: 'Синий' },
] as const

export const PEN_WIDTHS = { thin: 2, thick: 5 } as const
