import s from './Board.module.css'
import type { Box, Handle } from './select'
import type { View } from './view'

/** Рамка выделения и ручки. Живут в ЭКРАННЫХ координатах, а не в мировых:
 *  ручка должна быть одного размера при любом масштабе, иначе на 30 % в неё
 *  не попасть пальцем, а на 400 % она закрывает половину рисунка. */
export function Selection({
  box, view, onGrab, count,
}: {
  box: Box
  view: View
  onGrab: (h: Handle, e: React.PointerEvent) => void
  count: number
}) {
  const x = box.x1 * view.k + view.x
  const y = box.y1 * view.k + view.y
  const w = (box.x2 - box.x1) * view.k
  const h = (box.y2 - box.y1) * view.k
  const handles: Handle[] = ['nw', 'ne', 'sw', 'se']
  return (
    <div className={s.selBox} style={{ left: x, top: y, width: w, height: h }} data-pult="выделение">
      {count > 1 ? <span className={s.selCount}>{count} элемента</span> : null}
      {handles.map((hd) => (
        <span
          key={hd}
          className={`${s.selHandle} ${s[`h_${hd}`]}`}
          onPointerDown={(e) => onGrab(hd, e)}
          role="presentation"
        />
      ))}
    </div>
  )
}
