import { useCallback, useEffect, useRef, useState } from 'react'

import s from './Board.module.css'
import { makeHistory } from './history'
import { Objects } from './Objects'
import { Selection } from './Selection'
import { Sheets } from './Sheets'
import { Tools, type Tool } from './Tools'
import { useSheets } from './useSheets'
import { imageObj, openFile, pickFile, saveFile } from './files'
import { newId, PENS, PEN_WIDTHS, type Bus, type Obj, type Point, type Sheet, type Stroke } from './protocol'
import {
  boxOverlap, hitObj, hitStroke, moveObj, moveStroke, objBox, resizeXform,
  strokeBox, unionBox, type Box, type Handle, type Xform,
} from './select'
import { contentBox, fitView, K_MAX, K_MIN, toWorld, zoomAt, type View } from './view'

/** Насколько близко ластик считает штрих задетым. В мировых единицах. */
const ERASE_R = 12
/** Как часто уезжают накопленные точки. Реже — рвано, чаще — шумно. */
const FLUSH_MS = 50
/** Промах указателя, который всё ещё считается попаданием в тонкую линию. */
const HIT_TOL = 8

type Props = {
  bus: Bus
  /** Сколько человек в комнате кроме меня. Нужно ровно для одного: у кого спросить доску. */
  peers: number
}

export function Board({ bus, peers }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const st = useSheets(bus, peers)

  const [tool, setTool] = useState<Tool>('pen')
  const [pen, setPen] = useState(0)
  const [thick, setThick] = useState(false)
  const [armed, setArmed] = useState(false)
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const [sel, setSel] = useState<string[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [space, setSpace] = useState(false)
  const [marq, setMarq] = useState<Box | null>(null)
  const [histTick, setHistTick] = useState(0)

  const viewRef = useRef(view)
  viewRef.current = view
  const toolRef = useRef(tool)
  toolRef.current = tool
  const selRef = useRef(sel)
  selRef.current = sel

  const drawing = useRef<{ id: string; unsent: Point[] } | null>(null)
  const panning = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null)
  const arrowing = useRef<Obj | null>(null)
  const marquee = useRef<Point | null>(null)
  const moving = useRef<{ from: Point; base: Sheet } | null>(null)
  const sizing = useRef<{ h: Handle; box: Box; base: Sheet; ratio: boolean } | null>(null)
  const flushTimer = useRef<number | null>(null)
  const hist = useRef(makeHistory())

  /* ── история ────────────────────────────────────────────────────────────── */

  const mark = useCallback(() => {
    hist.current.mark(st.sheet)
    setHistTick((v) => v + 1)
  }, [st.sheet])

  useEffect(() => {
    hist.current.reset()
    setHistTick((v) => v + 1)
    setSel([])
  }, [st.active])

  const undo = useCallback(() => {
    const prev = hist.current.undo(st.sheet)
    if (!prev) return
    st.replaceSheet(prev)
    setSel([])
    setHistTick((v) => v + 1)
  }, [st])

  const redo = useCallback(() => {
    const next = hist.current.redo(st.sheet)
    if (!next) return
    st.replaceSheet(next)
    setSel([])
    setHistTick((v) => v + 1)
  }, [st])

  /* ── перерисовка штрихов ────────────────────────────────────────────────── */

  const colorOf = useCallback((token: string) => {
    const host = wrapRef.current
    if (!host) return '#000'
    return getComputedStyle(host).getPropertyValue(token).trim() || '#000'
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const v = viewRef.current
    ctx.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * v.y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const chosen = new Set(selRef.current)
    st.sheet.strokes.forEach((stroke) => {
      if (stroke.pts.length === 0) return
      ctx.strokeStyle = colorOf(stroke.color)
      ctx.lineWidth = stroke.width
      ctx.beginPath()
      ctx.moveTo(stroke.pts[0][0], stroke.pts[0][1])
      for (let i = 1; i < stroke.pts.length; i += 1) ctx.lineTo(stroke.pts[i][0], stroke.pts[i][1])
      if (stroke.pts.length === 1) ctx.lineTo(stroke.pts[0][0] + 0.1, stroke.pts[0][1])
      ctx.stroke()
      // Выбранный штрих обводится своей же линией пошире и зелёным: рамка вокруг
      // закорючки ничего не говорит о том, ЧТО именно выбрано.
      if (chosen.has(stroke.id)) {
        ctx.save()
        ctx.strokeStyle = colorOf('--color-go')
        ctx.lineWidth = stroke.width + 6 / v.k
        ctx.globalAlpha = 0.25
        ctx.stroke()
        ctx.restore()
      }
    })
    const a = arrowing.current
    if (a && a.kind === 'arrow') {
      ctx.strokeStyle = colorOf(a.color)
      ctx.lineWidth = a.width
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(a.x2, a.y2)
      ctx.stroke()
    }
  }, [colorOf, st.sheet])

  useEffect(redraw, [redraw, view, st.version, st.active, sel])

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

  /* ── что где лежит ──────────────────────────────────────────────────────── */

  const at = (e: { clientX: number; clientY: number }): Point => {
    const r = wrapRef.current!.getBoundingClientRect()
    return toWorld(viewRef.current, e.clientX - r.left, e.clientY - r.top)
  }

  const tol = () => HIT_TOL / viewRef.current.k

  const pickAt = useCallback((p: Point): string | null => {
    const objs = st.sheet.objs
    for (let i = objs.length - 1; i >= 0; i -= 1) if (hitObj(objs[i], p, tol())) return objs[i].id
    const strokes = st.sheet.strokes
    for (let i = strokes.length - 1; i >= 0; i -= 1) if (hitStroke(strokes[i], p, tol())) return strokes[i].id
    return null
  }, [st.sheet])

  const selBox = useCallback((): Box | null => {
    if (sel.length === 0) return null
    const chosen = new Set(sel)
    const boxes: Box[] = []
    st.sheet.objs.forEach((o) => chosen.has(o.id) && boxes.push(objBox(o)))
    st.sheet.strokes.forEach((x) => chosen.has(x.id) && boxes.push(strokeBox(x)))
    return unionBox(boxes)
  }, [sel, st.sheet, st.version])

  /* ── правка выделенного: сдвиг и растяжение ─────────────────────────────── */

  const applyXform = useCallback(
    (t: Xform, base: Sheet) => {
      const chosen = new Set(selRef.current)
      const next: Sheet = {
        ...base,
        strokes: base.strokes.map((x) => (chosen.has(x.id) ? moveStroke(x, t) : x)),
        objs: base.objs.map((o) => (chosen.has(o.id) ? moveObj(o, t) : o)),
      }
      st.replaceSheet(next, true)
    },
    [st],
  )

  const snapshot = (): Sheet => ({
    ...st.sheet,
    strokes: st.sheet.strokes.map((x) => ({ ...x, pts: x.pts.map((p) => [p[0], p[1]] as Point) })),
    objs: st.sheet.objs.map((o) => ({ ...o })),
  })

  const grabHandle = (h: Handle, e: React.PointerEvent) => {
    const box = selBox()
    if (!box) return
    e.stopPropagation()
    mark()
    sizing.current = { h, box, base: snapshot(), ratio: e.shiftKey }
    wrapRef.current?.setPointerCapture(e.pointerId)
  }

  /* ── руки ───────────────────────────────────────────────────────────────── */

  const flush = useCallback(() => {
    flushTimer.current = null
    const d = drawing.current
    if (!d || d.unsent.length === 0) return
    const stroke = st.sheet.strokes.find((x) => x.id === d.id)
    if (!stroke) return
    bus.send({ t: 'seg', sheet: st.sheet.id, id: stroke.id, color: stroke.color, width: stroke.width, pts: d.unsent })
    d.unsent = []
  }, [bus, st.sheet])

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current === null) flushTimer.current = window.setTimeout(flush, FLUSH_MS)
  }, [flush])

  const eraseAt = useCallback(
    (p: Point) => {
      const hit: string[] = []
      st.sheet.strokes.forEach((stroke) => {
        if (hitStroke(stroke, p, ERASE_R)) hit.push(stroke.id)
      })
      st.sheet.objs.forEach((o) => {
        if (hitObj(o, p, ERASE_R)) hit.push(o.id)
      })
      if (hit.length === 0) return
      mark()
      st.eraseIds(hit)
    },
    [mark, st],
  )

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 🔴 Пульты лежат ВНУТРИ рамы, и их нажатие всплывает сюда. Если рама заберёт
    // указатель себе, браузер не выдаст кнопке click — пульт станет мёртвым.
    if ((e.target as HTMLElement).closest('[data-pult]')) return
    const t = toolRef.current
    if (space || t === 'hand' || e.button === 1) {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      panning.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
      return
    }
    if (e.button !== 0) return
    const p = at(e)

    if (t === 'pick') {
      // Внутри уже стоящей рамки тянут ВСЁ выделение, даже если под пальцем пусто:
      // иначе попытка сдвинуть группу за просвет между элементами её сбрасывала.
      const cur = selBox()
      if (cur && sel.length > 0 && p[0] >= cur.x1 && p[0] <= cur.x2 && p[1] >= cur.y1 && p[1] <= cur.y2) {
        mark()
        moving.current = { from: p, base: snapshot() }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        return
      }
      const id = pickAt(p)
      if (id) {
        const add = e.shiftKey || e.metaKey || e.ctrlKey
        const next = add ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : (sel.includes(id) ? sel : [id])
        setSel(next)
        selRef.current = next
        if (next.length > 0) {
          mark()
          moving.current = { from: p, base: snapshot() }
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }
        return
      }
      setSel([])
      setEditing(null)
      marquee.current = p
      setMarq({ x1: p[0], y1: p[1], x2: p[0], y2: p[1] })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    if (t === 'eraser') {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      eraseAt(p)
      drawing.current = { id: 'eraser', unsent: [] }
      return
    }
    if (t === 'arrow') {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      arrowing.current = {
        id: newId(), kind: 'arrow', x: p[0], y: p[1], x2: p[0], y2: p[1],
        color: PENS[pen].token, width: thick ? PEN_WIDTHS.thick : PEN_WIDTHS.thin,
      }
      return
    }
    if (t === 'text' || t === 'note') {
      // Захват указателя увёл бы фокус у поля правки, и набор улетел бы в никуда.
      mark()
      const o: Obj =
        t === 'text'
          ? { id: newId(), kind: 'text', x: p[0], y: p[1], w: 320, text: '', color: PENS[pen].token, size: 24 }
          : { id: newId(), kind: 'note', x: p[0], y: p[1], w: 220, h: 160, text: '' }
      st.putObj(o)
      setTool('pick')
      setSel([o.id])
      setEditing(o.id)
      return
    }

    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    mark()
    const id = newId()
    const stroke: Stroke = {
      id,
      color: PENS[pen].token,
      width: thick ? PEN_WIDTHS.thick : PEN_WIDTHS.thin,
      pts: [p],
    }
    st.addStroke(stroke)
    drawing.current = { id, unsent: [p] }
    scheduleFlush()
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panning.current) {
      const q = panning.current
      setView((v) => ({ ...v, x: q.vx + (e.clientX - q.sx), y: q.vy + (e.clientY - q.sy) }))
      return
    }
    const p = at(e)
    if (sizing.current) {
      const z = sizing.current
      applyXform(resizeXform(z.box, z.h, p, z.ratio || e.shiftKey), z.base)
      return
    }
    if (moving.current) {
      const m = moving.current
      applyXform({ ox: 0, oy: 0, sx: 1, sy: 1, dx: p[0] - m.from[0], dy: p[1] - m.from[1] }, m.base)
      return
    }
    if (marquee.current) {
      const a = marquee.current
      setMarq({
        x1: Math.min(a[0], p[0]), y1: Math.min(a[1], p[1]),
        x2: Math.max(a[0], p[0]), y2: Math.max(a[1], p[1]),
      })
      return
    }
    if (arrowing.current && arrowing.current.kind === 'arrow') {
      arrowing.current = { ...arrowing.current, x2: p[0], y2: p[1] }
      redraw()
      return
    }
    if (!drawing.current) return
    if (toolRef.current === 'eraser') {
      eraseAt(p)
      return
    }
    const stroke = st.sheet.strokes.find((x) => x.id === drawing.current!.id)
    if (!stroke) return
    stroke.pts.push(p)
    drawing.current.unsent.push(p)
    scheduleFlush()
    redraw()
  }

  const onUp = () => {
    if (panning.current) {
      panning.current = null
      return
    }
    if (sizing.current || moving.current) {
      sizing.current = null
      moving.current = null
      // Итог правки уезжает остальным одним листом: пересказывать её по частям
      // дороже и хрупче.
      st.replaceSheet(st.sheet)
      return
    }
    if (marquee.current) {
      marquee.current = null
      const box = marq
      setMarq(null)
      if (box && (box.x2 - box.x1 > 4 || box.y2 - box.y1 > 4)) {
        const inside: string[] = []
        st.sheet.objs.forEach((o) => boxOverlap(objBox(o), box) && inside.push(o.id))
        st.sheet.strokes.forEach((x) => boxOverlap(strokeBox(x), box) && inside.push(x.id))
        setSel(inside)
        selRef.current = inside
      }
      return
    }
    if (arrowing.current) {
      const a = arrowing.current
      arrowing.current = null
      if (a.kind === 'arrow' && Math.hypot(a.x2 - a.x, a.y2 - a.y) > 6) {
        mark()
        st.putObj(a)
      }
      redraw()
      return
    }
    flush()
    drawing.current = null
  }

  /* ── колесо: сдвиг, с Cmd/Ctrl — масштаб ────────────────────────────────── */

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = wrap.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const v = viewRef.current
        setView(zoomAt(v, e.clientX - r.left, e.clientY - r.top, v.k * Math.exp(-e.deltaY / 300)))
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (mul: number) => {
    const wrap = wrapRef.current
    if (!wrap) return
    setView((v) => zoomAt(v, wrap.clientWidth / 2, wrap.clientHeight / 2, v.k * mul))
  }
  const home = () => setView({ x: 0, y: 0, k: 1 })
  const showAll = () => {
    const wrap = wrapRef.current
    if (!wrap) return
    setView(fitView(contentBox(st.sheet.strokes, st.sheet.objs), wrap.clientWidth, wrap.clientHeight))
  }

  /* ── объекты: выбрать, править ──────────────────────────────────────────── */

  const onPick = (id: string, e: React.PointerEvent) => {
    if (toolRef.current !== 'pick' || space) return
    e.stopPropagation()
    const o = st.sheet.objs.find((x) => x.id === id)
    if (!o) return
    if (e.detail >= 2 && (o.kind === 'text' || o.kind === 'note')) {
      setSel([id])
      setEditing(id)
      return
    }
    const add = e.shiftKey || e.metaKey || e.ctrlKey
    const next = add ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : (sel.includes(id) ? sel : [id])
    setSel(next)
    selRef.current = next
    mark()
    moving.current = { from: at(e), base: snapshot() }
    wrapRef.current?.setPointerCapture(e.pointerId)
  }

  const onText = (id: string, text: string) => {
    const o = st.sheet.objs.find((x) => x.id === id)
    if (!o || (o.kind !== 'text' && o.kind !== 'note')) return
    // Пустой текст, из которого вышли, — промах мимо холста, а не объект.
    if (text.trim() === '') {
      st.dropObj([id])
      setSel((cur) => cur.filter((x) => x !== id))
      return
    }
    if (o.text === text) return
    st.putObj({ ...o, text })
  }

  /* ── буфер обмена ───────────────────────────────────────────────────────── */

  const pasteN = useRef(0)
  const centerWorld = useCallback((): Point => {
    const wrap = wrapRef.current
    if (!wrap) return [0, 0]
    const step = (pasteN.current % 6) * 28
    pasteN.current += 1
    const [x, y] = toWorld(viewRef.current, wrap.clientWidth / 2, wrap.clientHeight / 2)
    return [x + step, y + step]
  }, [])

  const pasteText = useCallback(
    (text: string) => {
      const p = centerWorld()
      mark()
      st.putObj({ id: newId(), kind: 'text', x: p[0], y: p[1], w: 420, text, color: PENS[0].token, size: 22 })
    },
    [centerWorld, mark, st],
  )

  const pasteImage = useCallback(
    async (file: File | Blob) => {
      const p = centerWorld()
      const o = await imageObj(file, p)
      if (!o) return
      mark()
      st.putObj(o)
    },
    [centerWorld, mark, st],
  )

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || editing) return
      const dt = e.clipboardData
      if (!dt) return
      // Картинка приезжает то файлом, то элементом буфера — смотрим оба места.
      const file =
        Array.from(dt.files ?? []).find((f) => f.type.startsWith('image/')) ??
        Array.from(dt.items ?? [])
          .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
          .map((it) => it.getAsFile())
          .find(Boolean)
      if (file) {
        e.preventDefault()
        await pasteImage(file)
        return
      }
      const own = dt.getData('application/x-flamingo')
      if (own) {
        e.preventDefault()
        try {
          const o = JSON.parse(own) as Obj
          const p = centerWorld()
          mark()
          st.putObj({ ...o, id: newId(), x: p[0], y: p[1] } as Obj)
          return
        } catch {
          /* чужой формат — пусть попробует текст */
        }
      }
      const text = dt.getData('text/plain')
      if (text && text.trim()) {
        e.preventDefault()
        pasteText(text.trim())
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [centerWorld, editing, mark, pasteImage, pasteText, st])

  useEffect(() => {
    const onCopy = (e: ClipboardEvent, cut: boolean) => {
      if (editing || sel.length === 0) return
      const o = st.sheet.objs.find((x) => x.id === sel[0])
      if (!o) return
      e.preventDefault()
      e.clipboardData?.setData('application/x-flamingo', JSON.stringify(o))
      e.clipboardData?.setData(
        'text/plain',
        o.kind === 'text' || o.kind === 'note' ? o.text : o.kind === 'video' ? o.url : 'картинка с доски Flamingo',
      )
      if (cut) {
        mark()
        st.dropObj([o.id])
        setSel([])
      }
    }
    const c = (e: ClipboardEvent) => onCopy(e, false)
    const x = (e: ClipboardEvent) => onCopy(e, true)
    window.addEventListener('copy', c)
    window.addEventListener('cut', x)
    return () => {
      window.removeEventListener('copy', c)
      window.removeEventListener('cut', x)
    }
  }, [editing, mark, sel, st])

  /* ── клавиши ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const inField = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'я' || e.key === 'Я')) {
        if (inField) return
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'н')) {
        if (inField) return
        e.preventDefault()
        redo()
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'ф') && !inField) {
        e.preventDefault()
        const all = [...st.sheet.objs.map((o) => o.id), ...st.sheet.strokes.map((x) => x.id)]
        setSel(all)
        selRef.current = all
        setTool('pick')
        return
      }
      if (e.code === 'Space' && !inField) {
        setSpace(true)
        e.preventDefault()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || inField) return
      const k = e.key.toLowerCase()
      if (k === 'v' || k === 'м') setTool('pick')
      if (k === 'p' || k === 'з') setTool('pen')
      if (k === 'e' || k === 'у') setTool('eraser')
      if (k === 'h' || k === 'р') setTool('hand')
      if (k === 'a' || k === 'ф') setTool('arrow')
      if (k === 't' || k === 'е') setTool('text')
      if (k === 'n' || k === 'т') setTool('note')
      if (e.key === 'Escape') setSel([])
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length > 0) {
        mark()
        st.eraseIds(sel)
        setSel([])
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [mark, redo, sel, st, undo])

  /* ── стереть всё ────────────────────────────────────────────────────────── */

  const wipe = () => {
    if (!armed) {
      setArmed(true)
      return
    }
    setArmed(false)
    mark()
    st.wipe()
  }
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])

  /* ── файлы ──────────────────────────────────────────────────────────────── */

  const addImage = async () => {
    const f = await pickFile('image/*')
    if (f) await pasteImage(f)
  }
  const addVideo = () => {
    const url = window.prompt('Ссылка на видео — YouTube, Rutube или прямой файл:')
    if (!url) return
    const p = centerWorld()
    mark()
    st.putObj({ id: newId(), kind: 'video', x: p[0], y: p[1], w: 420, h: 150, url: url.trim() })
  }

  const empty = st.sheet.strokes.length === 0 && st.sheet.objs.length === 0
  const box = selBox()

  return (
    <div className={s.frame}>
      <Tools
        tool={tool} setTool={setTool}
        pen={pen} setPen={setPen}
        thick={thick} setThick={setThick}
        armed={armed} wipe={wipe}
        addImage={addImage} addVideo={addVideo}
        undo={undo} redo={redo}
        canUndo={hist.current.canUndo} canRedo={hist.current.canRedo}
        histTick={histTick}
      />

      <div className={s.stack}>
        <Sheets
          sheets={st.sheets}
          active={st.active}
          onOpen={st.openSheet}
          onAdd={st.addSheet}
          onSave={() => saveFile(st.sheets)}
          onLoad={async () => {
            const list = await openFile()
            if (list) st.loadAll(list)
          }}
        />

        <div
          className={`${s.canvasWrap} ${space || tool === 'hand' ? s.grab : ''} ${tool === 'pick' ? s.pointer : ''}`}
          ref={wrapRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDoubleClick={(e) => {
            if (tool === 'pick' && e.target === e.currentTarget) home()
          }}
          style={{ backgroundSize: `${24 * view.k}px ${24 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
        >
          <canvas ref={canvasRef} className={s.canvas} />

          <div
            className={s.layer}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
          >
            <Objects
              objs={st.sheet.objs}
              k={view.k}
              selected={sel}
              editing={editing}
              onPick={onPick}
              onText={onText}
              onDoneEdit={() => setEditing(null)}
            />
          </div>

          {marq ? (
            <div
              className={s.marquee}
              style={{
                left: marq.x1 * view.k + view.x,
                top: marq.y1 * view.k + view.y,
                width: (marq.x2 - marq.x1) * view.k,
                height: (marq.y2 - marq.y1) * view.k,
              }}
            />
          ) : null}

          {box && !editing ? (
            <Selection box={box} view={view} onGrab={grabHandle} count={sel.length} />
          ) : null}

          {empty ? (
            <div className={s.empty}>
              <span className={s.emptyTitle}>Доска пустая — и это нормально</span>
              <span className={s.emptyText}>
                Начните писать: остальные увидят штрих сразу. Можно вставить картинку или текст
                прямо из буфера — Ctrl+V. Доска живёт, пока в комнате есть хоть один человек;
                чтобы она осталась после урока, сохраните её в файл.
              </span>
              <span className={s.emptyKeys}>
                перо — P · ластик — E · рука — H · текст — T · заметка — N · стрелка — A · выбрать — V
              </span>
            </div>
          ) : null}

          {/* Пульт масштаба: одна кнопка «Показать всё» — она меняет и масштаб, и положение.
              К 100 % возвращает щелчок по самой цифре или двойной щелчок по пустому месту. */}
          <div className={s.zoom} data-pult="масштаб">
            <button type="button" className={s.zoomBtn} onClick={() => zoomBy(1 / 1.25)}
                    disabled={view.k <= K_MIN} title="Отдалить">−</button>
            <button type="button" className={s.zoomNum} onClick={home} title="Вернуть 100 %">
              {Math.round(view.k * 100)} %
            </button>
            <button type="button" className={s.zoomBtn} onClick={() => zoomBy(1.25)}
                    disabled={view.k >= K_MAX} title="Приблизить">+</button>
            <span className={s.zoomSep} />
            <button type="button" className={s.zoomFit} onClick={showAll}
                    disabled={empty} title="Уместить всё написанное">Показать всё</button>
          </div>
        </div>
      </div>
    </div>
  )
}
