import { useCallback, useEffect, useRef, useState } from 'react'

import s from './Board.module.css'
import { Objects } from './Objects'
import { Sheets } from './Sheets'
import { Tools, type Tool } from './Tools'
import { useSheets } from './useSheets'
import { fitView, K_MAX, K_MIN, toWorld, zoomAt, contentBox, type View } from './view'
import { imageObj, openFile, pickFile, saveFile } from './files'
import { newId, PENS, PEN_WIDTHS, type Bus, type Obj, type Point } from './protocol'

/** Насколько близко ластик считает штрих задетым. В мировых единицах. */
const ERASE_R = 12
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
  const st = useSheets(bus, peers)

  const [tool, setTool] = useState<Tool>('pen')
  const [pen, setPen] = useState(0)
  const [thick, setThick] = useState(false)
  const [armed, setArmed] = useState(false)
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const [sel, setSel] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [space, setSpace] = useState(false)

  const viewRef = useRef(view)
  viewRef.current = view
  const toolRef = useRef(tool)
  toolRef.current = tool

  const drawing = useRef<{ id: string; unsent: Point[] } | null>(null)
  const panning = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null)
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const arrowing = useRef<Obj | null>(null)
  const flushTimer = useRef<number | null>(null)
  const clip = useRef<Obj | null>(null)

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
    st.sheet.strokes.forEach((stroke) => {
      if (stroke.pts.length === 0) return
      ctx.strokeStyle = colorOf(stroke.color)
      ctx.lineWidth = stroke.width
      ctx.beginPath()
      ctx.moveTo(stroke.pts[0][0], stroke.pts[0][1])
      for (let i = 1; i < stroke.pts.length; i += 1) ctx.lineTo(stroke.pts[i][0], stroke.pts[i][1])
      if (stroke.pts.length === 1) ctx.lineTo(stroke.pts[0][0] + 0.1, stroke.pts[0][1])
      ctx.stroke()
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
  }, [colorOf, st.sheet, st.version])

  useEffect(redraw, [redraw, view, st.version, st.active])

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

  /* ── руки ───────────────────────────────────────────────────────────────── */

  const at = (e: { clientX: number; clientY: number }): Point => {
    const r = wrapRef.current!.getBoundingClientRect()
    return toWorld(viewRef.current, e.clientX - r.left, e.clientY - r.top)
  }

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
        for (const q of stroke.pts) {
          if (Math.hypot(q[0] - p[0], q[1] - p[1]) < ERASE_R) {
            hit.push(stroke.id)
            return
          }
        }
      })
      st.sheet.objs.forEach((o) => {
        const inBox =
          o.kind === 'arrow'
            ? Math.hypot((o.x + o.x2) / 2 - p[0], (o.y + o.y2) / 2 - p[1]) < ERASE_R * 2
            : p[0] > o.x - ERASE_R && p[0] < o.x + o.w + ERASE_R &&
              p[1] > o.y - ERASE_R && p[1] < o.y + ('h' in o ? o.h : o.size * 2) + ERASE_R
        if (inBox) hit.push(o.id)
      })
      if (hit.length === 0) return
      st.eraseIds(hit)
    },
    [st],
  )

  const startPan = (e: React.PointerEvent) => {
    panning.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 🔴 Пульт лежит ВНУТРИ рамы, и его нажатие всплывает сюда. Если рама заберёт
    // указатель себе, браузер не выдаст кнопке click — пульт станет мёртвым.
    // Проверено на пробе 30.08: «Показать всё» и «100 %» не срабатывали вовсе.
    if ((e.target as HTMLElement).closest('[data-pult]')) return
    const t = toolRef.current
    // Указатель забираем только там, где ведут линию: перо, ластик, стрелка, сдвиг.
    // Текст и заметка сразу уходят в правку, а захват увёл бы у них фокус — набор
    // улетал в никуда (проверено на пробе 30.08).
    if (t !== 'text' && t !== 'note' && t !== 'pick') {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    if (space || t === 'hand' || e.button === 1) {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      startPan(e)
      return
    }
    if (e.button !== 0) return
    const p = at(e)
    if (t === 'pick') {
      setSel(null)
      setEditing(null)
      return
    }
    if (t === 'eraser') {
      eraseAt(p)
      drawing.current = { id: 'eraser', unsent: [] }
      return
    }
    if (t === 'arrow') {
      arrowing.current = {
        id: newId(), kind: 'arrow', x: p[0], y: p[1], x2: p[0], y2: p[1],
        color: PENS[pen].token, width: thick ? PEN_WIDTHS.thick : PEN_WIDTHS.thin,
      }
      return
    }
    if (t === 'text' || t === 'note') {
      const o: Obj =
        t === 'text'
          ? { id: newId(), kind: 'text', x: p[0], y: p[1], w: 320, text: '', color: PENS[pen].token, size: 24 }
          : { id: newId(), kind: 'note', x: p[0], y: p[1], w: 220, h: 160, text: '' }
      st.putObj(o)
      setTool('pick')
      setSel(o.id)
      setEditing(o.id)
      return
    }
    const id = newId()
    st.addStroke({
      id,
      color: PENS[pen].token,
      width: thick ? PEN_WIDTHS.thick : PEN_WIDTHS.thin,
      pts: [p],
    })
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
    if (dragging.current) {
      const d = dragging.current
      const o = st.sheet.objs.find((x) => x.id === d.id)
      if (!o) return
      const moved = { ...o, x: p[0] - d.dx, y: p[1] - d.dy } as Obj
      if (moved.kind === 'arrow') {
        moved.x2 = moved.x + (o.kind === 'arrow' ? o.x2 - o.x : 0)
        moved.y2 = moved.y + (o.kind === 'arrow' ? o.y2 - o.y : 0)
      }
      st.putObj(moved, true)
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
    if (dragging.current) {
      const o = st.sheet.objs.find((x) => x.id === dragging.current!.id)
      dragging.current = null
      if (o) st.putObj(o)
      return
    }
    if (arrowing.current) {
      const a = arrowing.current
      arrowing.current = null
      if (a.kind === 'arrow' && Math.hypot(a.x2 - a.x, a.y2 - a.y) > 6) st.putObj(a)
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

  /* ── объекты: выбрать, потащить, править ────────────────────────────────── */

  const onPick = (id: string, e: React.PointerEvent) => {
    if (toolRef.current !== 'pick' || space) return
    e.stopPropagation()
    const o = st.sheet.objs.find((x) => x.id === id)
    if (!o) return
    setSel(id)
    if (e.detail >= 2 && (o.kind === 'text' || o.kind === 'note')) {
      setEditing(id)
      return
    }
    const p = at(e)
    dragging.current = { id, dx: p[0] - o.x, dy: p[1] - o.y }
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    wrapRef.current?.setPointerCapture(e.pointerId)
  }

  const onText = (id: string, text: string) => {
    const o = st.sheet.objs.find((x) => x.id === id)
    if (!o || (o.kind !== 'text' && o.kind !== 'note')) return
    // Пустой текст, из которого вышли, — промах мимо холста, а не объект.
    if (text.trim() === '') {
      st.dropObj([id])
      if (sel === id) setSel(null)
      return
    }
    if (o.text === text) return
    st.putObj({ ...o, text })
  }

  /* ── буфер обмена ───────────────────────────────────────────────────────── */

  // Каждая следующая вставка ложится со сдвигом: иначе две подряд накрывают друг друга
  // ровно в центре и выглядят как одна пропавшая (видно на пробе 30.08).
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
    (text: string, at2?: Point) => {
      const p = at2 ?? centerWorld()
      st.putObj({
        id: newId(), kind: 'text', x: p[0], y: p[1], w: 420,
        text, color: PENS[0].token, size: 22,
      })
    },
    [centerWorld, st],
  )

  const pasteImage = useCallback(
    async (file: File | Blob, at2?: Point) => {
      const p = at2 ?? centerWorld()
      const o = await imageObj(file, p)
      if (o) st.putObj(o)
    },
    [centerWorld, st],
  )

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || editing) return
      const dt = e.clipboardData
      if (!dt) return
      // Картинка приезжает то файлом, то элементом буфера — смотрим оба места:
      // в пробе 30.08 список items оказался пуст, а files — нет.
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
  }, [centerWorld, editing, pasteImage, pasteText, st])

  useEffect(() => {
    const onCopy = (e: ClipboardEvent, cut: boolean) => {
      if (editing || !sel) return
      const o = st.sheet.objs.find((x) => x.id === sel)
      if (!o) return
      e.preventDefault()
      clip.current = o
      e.clipboardData?.setData('application/x-flamingo', JSON.stringify(o))
      e.clipboardData?.setData(
        'text/plain',
        o.kind === 'text' || o.kind === 'note' ? o.text : o.kind === 'video' ? o.url : 'картинка с доски Flamingo',
      )
      if (cut) {
        st.dropObj([o.id])
        setSel(null)
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
  }, [editing, sel, st])

  /* ── клавиши ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        st.dropObj([sel])
        setSel(null)
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
  }, [sel, st])

  /* ── стереть всё ────────────────────────────────────────────────────────── */

  const wipe = () => {
    if (!armed) {
      setArmed(true)
      return
    }
    setArmed(false)
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
    st.putObj({ id: newId(), kind: 'video', x: p[0], y: p[1], w: 420, h: 150, url: url.trim() })
  }

  const empty = st.sheet.strokes.length === 0 && st.sheet.objs.length === 0

  return (
    <div className={s.frame}>
      <Tools
        tool={tool} setTool={setTool}
        pen={pen} setPen={setPen}
        thick={thick} setThick={setThick}
        armed={armed} wipe={wipe}
        addImage={addImage} addVideo={addVideo}
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
