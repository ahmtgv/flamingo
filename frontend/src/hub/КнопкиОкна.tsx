import type { CSSProperties } from 'react'

import s from '../screens/Hub.module.css'

/** Три кнопки в заголовке окна: закрыть, свернуть, развернуть.
 *
 *  🔴 РАНЬШЕ ЭТО БЫЛИ ТРИ НАРИСОВАННЫЕ ТОЧКИ, А ЗАКРЫВАЛ ОКНО КРЕСТИК СПРАВА.
 *  Владелец, 11.11: точки должны работать, крестик убрать. Теперь точки —
 *  настоящие кнопки, одни и те же у окон источников и у окон разговоров.
 *
 *  Под мышью знак на кнопке проступает при наведении; на сенсорном экране
 *  навести нечем, поэтому там знаки видны всегда, а сами кнопки крупнее.
 *  `onPointerDown` гасится: заголовок окна — ручка для таскания, и нажатие на
 *  кнопку не должно начинать перенос.
 */

export type ВидОкна = 'свёрнуто' | 'развёрнуто'

/** Где и какого размера стоит окно — с учётом того, свёрнуто оно или развёрнуто. */
export function местоОкна(о: { x: number; y: number; ш: number; в: number; вид?: ВидОкна }): CSSProperties {
  if (о.вид === 'развёрнуто') return { left: 8, top: 8, right: 8, bottom: 8 }
  if (о.вид === 'свёрнуто') return { left: о.x, top: о.y, width: Math.min(о.ш, 300) }
  return { left: о.x, top: о.y, width: о.ш, height: о.в }
}

export function КнопкиОкна({ имя, вид, закрыть, сменить }: {
  имя: string
  вид?: ВидОкна
  закрыть: () => void
  сменить: (вид: ВидОкна | undefined) => void
}) {
  const стой = (e: { stopPropagation: () => void }) => e.stopPropagation()
  const свёрнуто = вид === 'свёрнуто'
  const развёрнуто = вид === 'развёрнуто'
  return (
    <span className={s.dots}>
      <button type="button" className={s.dot} onPointerDown={стой} onClick={закрыть}
              aria-label={`Закрыть окно: ${имя}`} title="Закрыть">
        <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 3l4 4M7 3L3 7" /></svg>
      </button>
      <button type="button" className={s.dot} onPointerDown={стой} onClick={() => сменить(свёрнуто ? undefined : 'свёрнуто')}
              aria-pressed={свёрнуто} aria-label={`${свёрнуто ? 'Раскрыть' : 'Свернуть'} окно: ${имя}`} title={свёрнуто ? 'Раскрыть' : 'Свернуть'}>
        <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 5h5" /></svg>
      </button>
      <button type="button" className={s.dot} onPointerDown={стой} onClick={() => сменить(развёрнуто ? undefined : 'развёрнуто')}
              aria-pressed={развёрнуто} aria-label={`${развёрнуто ? 'Вернуть размер окна' : 'Развернуть окно'}: ${имя}`} title={развёрнуто ? 'Вернуть размер' : 'Развернуть'}>
        <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 2.5v5M2.5 5h5" /></svg>
      </button>
    </span>
  )
}
