import { useCallback, useEffect, useRef, useState } from 'react'

/** Плавающее окно: его можно таскать за шапку и тянуть за угол.
 *
 *  🔴 РЕШЕНИЕ ВЛАДЕЛЬЦА 04.09: «чат можно перетаскивать по экрану и менять
 *  размер». Одна механика на оба чата — урочный и переписку: одна вещь,
 *  выученная один раз.
 *
 *  🔴 ПОЧЕМУ НЕ `resize: both` В CSS. Браузерный `resize` требует
 *  `overflow: auto` на самом окне — а у нас внутри своя прокрутка ленты, и
 *  вторая, внешняя, немедленно ломает раскладку: строка ввода уезжает под
 *  край. И тянуть в CSS можно только вправо-вниз, тогда как окно стоит у
 *  правого края экрана. Поэтому угол свой.
 *
 *  🔴 ОКНО НЕ УХОДИТ ЗА КРАЙ. Клампится и при перетаскивании, и при смене
 *  размера окна браузера: панель, у которой шапка уехала за экран, больше
 *  не возвращается — её нечем взять.
 */

export type Место = { x: number; y: number; ш: number; в: number }

const зажать = (v: number, от: number, до: number) => Math.min(Math.max(v, от), до)

export function useОкно(нач: {
  ширина: number
  /** Нет высоты — окно во всю высоту вмещающего блока за вычетом отступов. */
  высота?: number
  отступ?: number
  минШирина?: number
  минВысота?: number
}) {
  const { ширина, высота, отступ = 16, минШирина = 280, минВысота = 240 } = нач
  const узел = useRef<HTMLElement | null>(null)
  const [место, setМесто] = useState<Место | null>(null)
  const тянем = useRef<{ вид: 'везём' | 'тянем'; мышьX: number; мышьY: number; было: Место } | null>(null)

  /** Размер вмещающего блока: у `position: absolute` — родитель, у `fixed` — окно. */
  const рамка = useCallback(() => {
    const el = узел.current
    const род = el?.offsetParent as HTMLElement | null
    if (el && род && getComputedStyle(el).position === 'absolute') {
      return { Ш: род.clientWidth, В: род.clientHeight }
    }
    return { Ш: window.innerWidth, В: window.innerHeight }
  }, [])

  const поставить = useCallback((el: HTMLElement | null) => {
    узел.current = el
    if (!el || место) return
    const { Ш, В } = рамка()
    const ш = Math.min(ширина, Math.max(минШирина, Ш - 2 * отступ))
    const в = Math.min(высота ?? В - 2 * отступ, Math.max(минВысота, В - 2 * отступ))
    setМесто({ x: Math.max(отступ, Ш - ш - отступ), y: отступ, ш, в })
  }, [место, рамка, ширина, высота, отступ, минШирина, минВысота])

  /* Окно браузера изменилось — возвращаем панель в поле зрения. */
  useEffect(() => {
    const пере = () => setМесто((м) => {
      if (!м) return м
      const { Ш, В } = рамка()
      const ш = зажать(м.ш, минШирина, Math.max(минШирина, Ш - 2 * отступ))
      const в = зажать(м.в, минВысота, Math.max(минВысота, В - 2 * отступ))
      return { ш, в, x: зажать(м.x, отступ - ш + минШирина, Math.max(отступ, Ш - отступ)), y: зажать(м.y, 0, Math.max(0, В - 48)) }
    })
    window.addEventListener('resize', пере)
    return () => window.removeEventListener('resize', пере)
  }, [рамка, отступ, минШирина, минВысота])

  const вести = useCallback((e: PointerEvent) => {
    const т = тянем.current
    if (!т) return
    const { Ш, В } = рамка()
    const dx = e.clientX - т.мышьX
    const dy = e.clientY - т.мышьY
    setМесто(() => {
      if (т.вид === 'везём') {
        /* За край уводим не целиком: слева и справа обязана остаться полоска
           шапки, сверху — вся шапка. Иначе окно не поймать обратно. */
        return {
          ...т.было,
          x: зажать(т.было.x + dx, отступ - т.было.ш + 96, Ш - 96),
          y: зажать(т.было.y + dy, 0, Math.max(0, В - 48)),
        }
      }
      return {
        ...т.было,
        ш: зажать(т.было.ш + dx, минШирина, Math.max(минШирина, Ш - т.было.x)),
        в: зажать(т.было.в + dy, минВысота, Math.max(минВысота, В - т.было.y)),
      }
    })
  }, [рамка, отступ, минШирина, минВысота])

  const бросить = useCallback(() => {
    тянем.current = null
    window.removeEventListener('pointermove', вести)
    window.removeEventListener('pointerup', бросить)
    document.body.style.userSelect = ''
  }, [вести])

  const взять = useCallback((вид: 'везём' | 'тянем') => (e: React.PointerEvent) => {
    /* По кнопке в шапке (закрыть) окно не возят: нажатие должно доехать до неё. */
    if (вид === 'везём' && (e.target as HTMLElement).closest('button, a, input')) return
    if (!место || e.button !== 0) return
    тянем.current = { вид, мышьX: e.clientX, мышьY: e.clientY, было: место }
    /* Пока тянем, выделение текста мешает и выглядит поломкой. */
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', вести)
    window.addEventListener('pointerup', бросить)
  }, [место, вести, бросить])

  useEffect(() => бросить, [бросить])

  const стиль: React.CSSProperties = место
    ? { left: место.x, top: место.y, width: место.ш, height: место.в, right: 'auto', bottom: 'auto' }
    : {}

  return {
    поставить,
    стиль,
    везтиЗа: { onPointerDown: взять('везём') },
    тянутьЗа: { onPointerDown: взять('тянем') },
  }
}
