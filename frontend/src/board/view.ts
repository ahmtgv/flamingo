/** Вид на бесконечный холст: сдвиг и масштаб. Экран = мир · k + сдвиг. */

import type { Obj, Stroke } from './protocol'

export type View = { x: number; y: number; k: number }

export const VIEW_HOME: View = { x: 0, y: 0, k: 1 }
/** Дальше этих границ масштаб не уходит: за ними штрих либо волосок, либо стена. */
export const K_MIN = 0.1
export const K_MAX = 8

export const clampK = (k: number) => Math.min(K_MAX, Math.max(K_MIN, k))

export const toWorld = (v: View, sx: number, sy: number): [number, number] => [
  (sx - v.x) / v.k,
  (sy - v.y) / v.k,
]

/** Масштаб меняется ВОКРУГ точки под курсором: иначе холст уезжает из-под руки. */
export function zoomAt(v: View, sx: number, sy: number, k2: number): View {
  const k = clampK(k2)
  return { k, x: sx - (sx - v.x) * (k / v.k), y: sy - (sy - v.y) * (k / v.k) }
}

export type Box = { x1: number; y1: number; x2: number; y2: number }

export function contentBox(strokes: Stroke[], objs: Obj[]): Box | null {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  const put = (x: number, y: number) => {
    if (x < x1) x1 = x
    if (y < y1) y1 = y
    if (x > x2) x2 = x
    if (y > y2) y2 = y
  }
  strokes.forEach((st) => st.pts.forEach((p) => put(p[0], p[1])))
  objs.forEach((o) => {
    if (o.kind === 'arrow') {
      put(o.x, o.y)
      put(o.x2, o.y2)
    } else if (o.kind === 'text') {
      put(o.x, o.y)
      put(o.x + o.w, o.y + o.size * 2)
    } else {
      put(o.x, o.y)
      put(o.x + o.w, o.y + o.h)
    }
  })
  return Number.isFinite(x1) ? { x1, y1, x2, y2 } : null
}

/** «Показать всё»: меняет и масштаб, и положение, поэтому находит написанное,
 *  даже если холст уехал далеко. */
export function fitView(box: Box | null, vw: number, vh: number, pad = 48): View {
  if (!box) return { ...VIEW_HOME }
  const w = Math.max(1, box.x2 - box.x1)
  const h = Math.max(1, box.y2 - box.y1)
  const k = clampK(Math.min((vw - pad * 2) / w, (vh - pad * 2) / h, 1.5))
  return { k, x: vw / 2 - ((box.x1 + box.x2) / 2) * k, y: vh / 2 - ((box.y1 + box.y2) / 2) * k }
}
