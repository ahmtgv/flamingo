import { useCallback, useEffect, useRef, useState } from 'react'

import s from './Board.module.css'
import { PENS, PEN_WIDTHS, type Bus, type Msg, type Point, type Stroke } from './protocol'

type Tool = 'pen' | 'eraser'

/** Расстояние, ближе которого ластик считает штрих задетым. В долях ширины холста. */
const ERASE_RADIUS = 0.012
/** Как часто уезжают накопленные точки. Реже — рвано, чаще — шумно. */
const FLUSH_MS = 50

type Props = {
  bus: Bus
  /** Сколько человек в комнате кроме меня. Нужно ровно для одного: у кого спросить доску. */
  peers: number
}

export function Board({ bus, peers }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Map<string, Stroke>>(new Map())
  const drawing = useRef<{ id: string; unsent: Point[] } | null>(null)
  const flushTimer = useRef<number | null>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [pen, setPen] = useState(0)
  const [thick, setThick] = useState(false)
  const [armed, setArmed] = useState(false)
  const [count, setCount] = useState(0)

  /* ── рисование ──────────────────────────────────────────────────────────── */

  const colorOf = useCallback((token: string) => {
    const host = wrapRef.current
    if (!host) return '#000'
    return getComputedStyle(host).getPropertyValue(token).trim() || '#000'
  }, [])

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, st: Stroke, unit: number) => {
      if (st.pts.length === 0) return
      ctx.strokeStyle = colorOf(st.color)
      ctx.lineWidth = st.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(st.pts[0][0] * unit, st.pts[0][1] * unit)
      for (let i = 1; i < st.pts.length; i += 1) ctx.lineTo(st.pts[i][0] * unit, st.pts[i][1] * unit)
      if (st.pts.length === 1) ctx.lineTo(st.pts[0][0] * unit + 0.1, st.pts[0][1] * unit)
      ctx.stroke()
    },
    [colorOf],
  )

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    const dpr = window.devicePixelRatio || 1
    ctx.scale(dpr, dpr)
    const unit = canvas.width / dpr
    strokes.current.forEach((st) => paint(ctx, st, unit))
    ctx.restore()
    setCount(strokes.current.size)
  }, [paint])

  /* Холст занимает весь свободный кадр и пересобирается под размер окна.
     Без этого штрихи растягивались бы вместе с растяжением картинки. */
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(wrap.clientWidth * dpr))
      canvas.height = Math.max(1, Math.round(wrap.clientHeight * dpr))
      redraw()
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [redraw])

  /* ── что приходит с той стороны ─────────────────────────────────────────── */

  const apply = useCallback(
    (m: Msg, fromMe: boolean) => {
      if (m.t === 'seg') {
        const cur = strokes.current.get(m.id)
        if (cur) cur.pts.push(...m.pts)
        else strokes.current.set(m.id, { id: m.id, color: m.color, width: m.width, pts: [...m.pts] })
      } else if (m.t === 'erase') {
        m.ids.forEach((id) => strokes.current.delete(id))
      } else if (m.t === 'clear') {
        strokes.current.clear()
      } else if (m.t === 'state') {
        if (fromMe) return
        strokes.current.clear()
        m.strokes.forEach((st) => strokes.current.set(st.id, st))
      } else if (m.t === 'ask') {
        if (fromMe) return
        bus.send({ t: 'state', strokes: [...strokes.current.values()] })
        return
      }
      redraw()
    },
    [bus, redraw],
  )

  useEffect(() => bus.subscribe((m) => apply(m, false)), [bus, apply])

  /* Вошедший спрашивает доску у того, кто уже внутри. Спрашивает только тот, кому
     нечего показать: иначе двое переписали бы друг другу свои же штрихи. */
  const asked = useRef(false)
  useEffect(() => {
    if (peers > 0 && !asked.current && strokes.current.size === 0) {
      asked.current = true
      bus.send({ t: 'ask' })
    }
    if (peers === 0) asked.current = false
  }, [peers, bus])

  /* ── руки ───────────────────────────────────────────────────────────────── */

  const at = (e: React.PointerEvent): Point => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width]
  }

  const flush = useCallback(() => {
    flushTimer.current = null
    const d = drawing.current
    if (!d || d.unsent.length === 0) return
    const st = strokes.current.get(d.id)
    if (!st) return
    bus.send({ t: 'seg', id: st.id, color: st.color, width: st.width, pts: d.unsent })
    d.unsent = []
  }, [bus])

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current === null) flushTimer.current = window.setTimeout(flush, FLUSH_MS)
  }, [flush])

  const eraseAt = useCallback(
    (p: Point) => {
      const hit: string[] = []
      strokes.current.forEach((st) => {
        for (const q of st.pts) {
          if (Math.hypot(q[0] - p[0], q[1] - p[1]) < ERASE_RADIUS) {
            hit.push(st.id)
            return
          }
        }
      })
      if (hit.length === 0) return
      hit.forEach((id) => strokes.current.delete(id))
      bus.send({ t: 'erase', ids: hit })
      redraw()
    },
    [bus, redraw],
  )

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = at(e)
    if (tool === 'eraser') {
      eraseAt(p)
      drawing.current = { id: 'eraser', unsent: [] }
      return
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    strokes.current.set(id, {
      id,
      color: PENS[pen].token,
      width: thick ? PEN_WIDTHS.thick : PEN_WIDTHS.thin,
      pts: [p],
    })
    drawing.current = { id, unsent: [p] }
    scheduleFlush()
    redraw()
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const p = at(e)
    if (tool === 'eraser') {
      eraseAt(p)
      return
    }
    const st = strokes.current.get(drawing.current.id)
    if (!st) return
    st.pts.push(p)
    drawing.current.unsent.push(p)
    scheduleFlush()
    redraw()
  }

  const onUp = () => {
    flush()
    drawing.current = null
  }

  /* ── клавиши ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'p' || k === 'з') setTool('pen')
      if (k === 'e' || k === 'у') setTool('eraser')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ── стереть всё ────────────────────────────────────────────────────────── */

  const wipe = () => {
    if (!armed) {
      setArmed(true)
      return
    }
    setArmed(false)
    strokes.current.clear()
    bus.send({ t: 'clear' })
    redraw()
  }

  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])

  return (
    <div className={s.frame}>
      <div className={s.tools} role="toolbar" aria-label="Инструменты доски">
        <button
          type="button"
          className={`${s.tool} ${tool === 'pen' ? s.toolOn : ''}`}
          aria-pressed={tool === 'pen'}
          title="Перо · клавиша P"
          aria-label="Перо"
          onClick={() => setTool('pen')}
        >
          ✎
        </button>
        <button
          type="button"
          className={`${s.tool} ${tool === 'eraser' ? s.toolOn : ''}`}
          aria-pressed={tool === 'eraser'}
          title="Ластик · клавиша E"
          aria-label="Ластик"
          onClick={() => setTool('eraser')}
        >
          ⌫
        </button>

        <span className={s.sep} />

        {PENS.map((p, i) => (
          <button
            key={p.token}
            type="button"
            className={`${s.pen} ${pen === i ? s.penOn : ''}`}
            aria-pressed={pen === i}
            title={p.title}
            aria-label={p.title}
            onClick={() => {
              setPen(i)
              setTool('pen')
            }}
          >
            <span className={s.penDot} style={{ background: `var(${p.token})` }} />
          </button>
        ))}

        <button
          type="button"
          className={`${s.tool} ${thick ? s.toolOn : ''}`}
          aria-pressed={thick}
          title={thick ? 'Толстое перо' : 'Тонкое перо'}
          aria-label="Толщина пера"
          onClick={() => setThick((v) => !v)}
        >
          {thick ? '▮' : '▯'}
        </button>

        <span className={s.sep} />

        <button
          type="button"
          className={`${s.wipe} ${armed ? s.wipeArmed : ''}`}
          onClick={wipe}
          title="Стирает доску у всех, кто в комнате. Вернуть нельзя."
        >
          {armed ? 'Точно стереть?' : 'Стереть всё'}
        </button>
      </div>

      <div className={s.canvasWrap} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={s.canvas}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {count === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyTitle}>Доска пустая — и это нормально</span>
            <span className={s.emptyText}>
              Начните писать: второй увидит штрих сразу. Доска живёт, пока в комнате есть
              хоть один человек, — сохранения в этой версии ещё нет.
            </span>
            <span className={s.emptyKeys}>перо — P · ластик — E</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
