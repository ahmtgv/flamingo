import { useEffect, useRef, useState } from 'react'

import { newId } from '../board/protocol'
import type { Point } from '../board/protocol'
import type { Ink, StickerName } from './shows'
import s from './Ink.module.css'

/** Прозрачный слой пометок поверх страницы показа.
 *
 *  🔴 Координаты — доли рамки (0…1): окно у каждого своё, и только доля значит
 *  одно и то же место у всех. Пересчёт в пиксели живёт здесь и больше нигде:
 *  слой сам меряет свою рамку и сам переводит доли туда и обратно.
 *
 *  Слой не решает, что делать с готовой меткой, — он отдаёт её наверх. Кто ведёт
 *  урок, тот шлёт её классу и кладёт в сохранённый показ; у класса слой стоит
 *  без инструмента и просто рисует то, что приехало.
 */

export type Tool =
  | { kind: 'pen'; color: string }
  | { kind: 'arrow'; color: string }
  | { kind: 'sticker'; name: StickerName }

/** Толщина маркера и размер стикера — доли ширины рамки: «в палец» у всех. */
const PEN_W = 0.006
const STICKER_R = 0.032

const STICKER_FACE: Record<StickerName, { glyph: string; token: string }> = {
  верно: { glyph: '✓', token: '--color-go' },
  вопрос: { glyph: '?', token: '--color-text' },
  сюда: { glyph: '!', token: '--fl-coral-500' },
}

function Mark({ m, w, h }: { m: Ink; w: number; h: number }) {
  if (m.kind === 'pen') {
    const d = m.pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`).join(' ')
    return (
      <path
        d={d}
        fill="none"
        stroke={`var(${m.color})`}
        strokeWidth={Math.max(2, m.w * w)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (m.kind === 'arrow') {
    const [ax, ay] = [m.a[0] * w, m.a[1] * h]
    const [bx, by] = [m.b[0] * w, m.b[1] * h]
    const wid = Math.max(2, m.w * w)
    const ang = Math.atan2(by - ay, bx - ax)
    const head = Math.max(10, wid * 3.2)
    const wing = (k: number) => `${bx - head * Math.cos(ang - k)} ${by - head * Math.sin(ang - k)}`
    return (
      <g stroke={`var(${m.color})`} strokeWidth={wid} strokeLinecap="round" fill="none">
        <path d={`M${ax} ${ay} L${bx} ${by}`} />
        <path d={`M${wing(0.45)} L${bx} ${by} L${wing(-0.45)}`} />
      </g>
    )
  }
  const f = STICKER_FACE[m.name]
  const r = Math.max(14, STICKER_R * w)
  return (
    <g transform={`translate(${m.x * w} ${m.y * h})`}>
      <circle r={r} fill="var(--color-surface)" stroke={`var(${f.token})`} strokeWidth={Math.max(2, r * 0.09)} />
      <text
        y={r * 0.02}
        textAnchor="middle"
        dominantBaseline="central"
        fill={`var(${f.token})`}
        fontSize={r * 1.15}
        fontWeight={700}
        style={{ userSelect: 'none' }}
      >
        {f.glyph}
      </text>
    </g>
  )
}

export function InkLayer({ marks, tool, onMark }: {
  marks: Ink[]
  /** null — слой только смотрит (класс; ведущий с выключенным маркером). */
  tool: Tool | null
  /** Метка выросла или закончилась. final=true — пора сохранять. */
  onMark?: (m: Ink, final: boolean) => void
}) {
  const box = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState<[number, number]>([0, 0])
  const drawing = useRef<Ink | null>(null)
  /* Метка в работе живёт в своём состоянии: перерисовывать родителя на каждое
     движение пера незачем, а видеть штрих в момент рисования — обязательно. */
  const [wip, setWip] = useState<Ink | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [w, h] = size

  const at = (e: { clientX: number; clientY: number }): Point => {
    const r = box.current?.getBoundingClientRect()
    if (!r || r.width === 0 || r.height === 0) return [0, 0]
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ]
  }

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!tool || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = at(e)
    let m: Ink
    if (tool.kind === 'pen') m = { id: newId(), kind: 'pen', color: tool.color, w: PEN_W, pts: [p] }
    else if (tool.kind === 'arrow') m = { id: newId(), kind: 'arrow', color: tool.color, w: PEN_W, a: p, b: p }
    else {
      /* Стикер ставится одним нажатием и готов сразу. */
      const st: Ink = { id: newId(), kind: 'sticker', name: tool.name, x: p[0], y: p[1] }
      onMark?.(st, true)
      return
    }
    drawing.current = m
    setWip(m)
    onMark?.(m, false)
  }

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const cur = drawing.current
    if (!cur) return
    const p = at(e)
    let next: Ink
    if (cur.kind === 'pen') {
      const last = cur.pts[cur.pts.length - 1]
      /* Точки реже полупроцента рамки не нужны ни глазу, ни каналу. */
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 0.005) return
      next = { ...cur, pts: [...cur.pts, p] }
    } else if (cur.kind === 'arrow') {
      next = { ...cur, b: p }
    } else return
    drawing.current = next
    setWip(next)
    onMark?.(next, false)
  }

  const up = () => {
    const cur = drawing.current
    if (!cur) return
    drawing.current = null
    setWip(null)
    /* Точка без движения — не штрих и не стрелка: не сохраняем и не шлём. */
    const empty =
      (cur.kind === 'pen' && cur.pts.length < 2) ||
      (cur.kind === 'arrow' && Math.abs(cur.b[0] - cur.a[0]) + Math.abs(cur.b[1] - cur.a[1]) < 0.01)
    if (!empty) onMark?.(cur, true)
  }

  return (
    <svg
      ref={box}
      className={`${s.layer} ${tool ? s.armed : ''}`}
      viewBox={`0 0 ${Math.max(1, w)} ${Math.max(1, h)}`}
      preserveAspectRatio="none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      aria-hidden={tool ? undefined : true}
      aria-label={tool ? 'Пометки поверх страницы' : undefined}
    >
      {w > 0
        ? marks.filter((m) => m.id !== wip?.id).map((m) => <Mark key={m.id} m={m} w={w} h={h} />)
        : null}
      {w > 0 && wip ? <Mark m={wip} w={w} h={h} /> : null}
    </svg>
  )
}
