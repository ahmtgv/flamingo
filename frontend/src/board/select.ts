/** Геометрия выделения: во что попали, что внутри рамки, как всё это двигать
 *  и растягивать. Работает одинаково с объектами и со штрихами карандаша —
 *  для владельца это одинаковые «элементы на доске», и разницы он видеть не должен. */

import type { Obj, Point, Stroke } from './protocol'

export type Box = { x1: number; y1: number; x2: number; y2: number }

export function objBox(o: Obj): Box {
  if (o.kind === 'arrow') {
    return {
      x1: Math.min(o.x, o.x2), y1: Math.min(o.y, o.y2),
      x2: Math.max(o.x, o.x2), y2: Math.max(o.y, o.y2),
    }
  }
  /* Высота текста — измеренная, если она уже приехала; иначе оценка в одну
     строку (см. `protocol.ts`, поле `h` у текста). */
  if (o.kind === 'text') return { x1: o.x, y1: o.y, x2: o.x + o.w, y2: o.y + (o.h ?? o.size * 1.6) }
  return { x1: o.x, y1: o.y, x2: o.x + o.w, y2: o.y + o.h }
}

export function strokeBox(st: Stroke): Box {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  st.pts.forEach(([x, y]) => {
    if (x < x1) x1 = x
    if (y < y1) y1 = y
    if (x > x2) x2 = x
    if (y > y2) y2 = y
  })
  return { x1, y1, x2, y2 }
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null
  return boxes.reduce((a, b) => ({
    x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1),
    x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2),
  }))
}

const inside = (b: Box, p: Point) => p[0] >= b.x1 && p[0] <= b.x2 && p[1] >= b.y1 && p[1] <= b.y2
export const boxOverlap = (a: Box, b: Box) =>
  a.x1 <= b.x2 && a.x2 >= b.x1 && a.y1 <= b.y2 && a.y2 >= b.y1

function nearSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Попали ли в штрих: по самой линии, а не по её прямоугольнику. Иначе широкая
 *  диагональная закорючка «ловила» бы всё в своём углу. */
export function hitStroke(st: Stroke, p: Point, tol: number): boolean {
  if (st.pts.length === 1) return Math.hypot(st.pts[0][0] - p[0], st.pts[0][1] - p[1]) < tol
  for (let i = 1; i < st.pts.length; i += 1) {
    if (nearSegment(p, st.pts[i - 1], st.pts[i]) < tol + st.width / 2) return true
  }
  return false
}

/** Углы фигуры в мировых координатах. Овал сюда не идёт: у него нет углов. */
function углы(o: Extract<Obj, { kind: 'shape' }>): Point[] {
  const { x, y, w, h } = o
  if (o.form === 'rect') return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
  return [[x + w / 2, y], [x + w, y + h], [x, y + h]]
}

function поКонтуру(p: Point, pts: Point[]): number {
  let d = Infinity
  for (let i = 1; i < pts.length; i += 1) d = Math.min(d, nearSegment(p, pts[i - 1], pts[i]))
  return Math.min(d, nearSegment(p, pts[pts.length - 1], pts[0]))
}

export function hitObj(o: Obj, p: Point, tol: number): boolean {
  if (o.kind === 'arrow') return nearSegment(p, [o.x, o.y], [o.x2, o.y2]) < tol + o.width / 2
  /* 🔴 Фигура ловится ПО ЛИНИИ, а не по своему прямоугольнику. Иначе большой
     круг, которым обвели схему, забирал бы себе каждое нажатие внутри — и всё,
     что он обводит, стало бы недоступно. То же правило, что у штриха. */
  if (o.kind === 'shape') {
    const r = tol + o.width / 2
    if (o.form === 'ellipse') {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2
      const rx = o.w / 2 || 1, ry = o.h / 2 || 1
      const nx = (p[0] - cx) / rx, ny = (p[1] - cy) / ry
      const t = Math.hypot(nx, ny)
      if (t === 0) return false
      /* Ближайшая точка овала в ту же сторону от середины: точного расстояния
         до эллипса в замкнутом виде нет, а это приближение врёт меньше, чем
         толщина линии, — то есть незаметно. */
      return Math.hypot(p[0] - (cx + (nx / t) * rx), p[1] - (cy + (ny / t) * ry)) < r
    }
    return поКонтуру(p, углы(o)) < r
  }
  return inside(objBox(o), p)
}

/** Сдвиг и растяжение — одна и та же операция: точка мира едет по формуле
 *  x' = ox + (x - ox) · sx. При сдвиге sx = sy = 1. */
export type Xform = { ox: number; oy: number; sx: number; sy: number; dx: number; dy: number }

export const IDENT: Xform = { ox: 0, oy: 0, sx: 1, sy: 1, dx: 0, dy: 0 }

const ap = (t: Xform, x: number, y: number): Point => [
  t.ox + (x - t.ox) * t.sx + t.dx,
  t.oy + (y - t.oy) * t.sy + t.dy,
]

export function moveStroke(st: Stroke, t: Xform): Stroke {
  const k = (Math.abs(t.sx) + Math.abs(t.sy)) / 2
  return { ...st, width: Math.max(1, st.width * k), pts: st.pts.map(([x, y]) => ap(t, x, y)) }
}

export function moveObj(o: Obj, t: Xform): Obj {
  const [x, y] = ap(t, o.x, o.y)
  if (o.kind === 'arrow') {
    const [x2, y2] = ap(t, o.x2, o.y2)
    return { ...o, x, y, x2, y2 }
  }
  if (o.kind === 'text') {
    return { ...o, x, y, w: Math.max(40, o.w * t.sx), size: Math.max(8, o.size * ((t.sx + t.sy) / 2)) }
  }
  return { ...o, x, y, w: Math.max(24, o.w * t.sx), h: Math.max(24, o.h * t.sy) }
}

/** Ручка тянет один угол, противоположный остаётся на месте. */
export type Handle = 'nw' | 'ne' | 'sw' | 'se'

export function resizeXform(box: Box, h: Handle, p: Point, keepRatio: boolean): Xform {
  const ox = h === 'nw' || h === 'sw' ? box.x2 : box.x1
  const oy = h === 'nw' || h === 'ne' ? box.y2 : box.y1
  const w = box.x2 - box.x1 || 1
  const hh = box.y2 - box.y1 || 1
  let sx = Math.abs(p[0] - ox) / w
  let sy = Math.abs(p[1] - oy) / hh
  sx = Math.max(0.05, sx)
  sy = Math.max(0.05, sy)
  if (keepRatio) {
    const k = Math.max(sx, sy)
    sx = k
    sy = k
  }
  return { ox, oy, sx, sy, dx: 0, dy: 0 }
}
