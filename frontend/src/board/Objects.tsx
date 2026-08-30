import { useEffect, useRef } from 'react'

import s from './Board.module.css'
import type { Obj } from './protocol'

/** Слой объектов лежит НАД холстом штрихов и живёт в тех же мировых координатах:
 *  один общий transform на слой, каждый объект стоит на своём месте мира.
 *  Так текст остаётся текстом (его можно выделить и прочитать голосом), а не
 *  картинкой из пикселей. */

type Props = {
  objs: Obj[]
  k: number
  selected: string | null
  editing: string | null
  onPick: (id: string, e: React.PointerEvent) => void
  onText: (id: string, text: string) => void
  onDoneEdit: () => void
}

function Arrow({ o }: { o: Extract<Obj, { kind: 'arrow' }> }) {
  const x1 = Math.min(o.x, o.x2), y1 = Math.min(o.y, o.y2)
  const w = Math.abs(o.x2 - o.x) + o.width * 8
  const h = Math.abs(o.y2 - o.y) + o.width * 8
  const pad = o.width * 4
  return (
    <svg
      className={s.objArrow}
      style={{ left: x1 - pad, top: y1 - pad, width: w, height: h }}
      viewBox={`0 0 ${w} ${h}`}
    >
      <defs>
        <marker id={`h${o.id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill={`var(${o.color})`} />
        </marker>
      </defs>
      <line
        x1={o.x - x1 + pad}
        y1={o.y - y1 + pad}
        x2={o.x2 - x1 + pad}
        y2={o.y2 - y1 + pad}
        stroke={`var(${o.color})`}
        strokeWidth={o.width}
        strokeLinecap="round"
        markerEnd={`url(#h${o.id})`}
      />
    </svg>
  )
}

function Editable({
  value,
  editing,
  onText,
  onDone,
  className,
  style,
  hint,
}: {
  value: string
  editing: boolean
  onText: (t: string) => void
  onDone: () => void
  className: string
  style?: React.CSSProperties
  hint: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!editing) return
    // Через кадр: сразу после pointerdown браузер ещё раздаёт фокус сам,
    // и наш focus() затирается — текст уезжает мимо (проба 30.08).
    const id = window.requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
    })
    return () => window.cancelAnimationFrame(id)
  }, [editing])
  return (
    <div
      ref={ref}
      className={className}
      style={style}
      data-hint={hint}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => {
        onText(e.currentTarget.innerText)
        onDone()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur()
      }}
    >
      {value}
    </div>
  )
}

export function Objects({ objs, k, selected, editing, onPick, onText, onDoneEdit }: Props) {
  return (
    <>
      {objs.map((o) => {
        const sel = selected === o.id
        const ed = editing === o.id
        const common = {
          onPointerDown: (e: React.PointerEvent) => onPick(o.id, e),
          className: `${s.obj} ${sel ? s.objOn : ''}`,
        }
        if (o.kind === 'arrow') {
          return (
            <div key={o.id} {...common} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <span className={sel ? s.objPickArrow : s.objPickArrowQuiet}
                    style={{ left: Math.min(o.x, o.x2), top: Math.min(o.y, o.y2),
                             width: Math.abs(o.x2 - o.x) || 2, height: Math.abs(o.y2 - o.y) || 2 }} />
              <Arrow o={o} />
            </div>
          )
        }
        if (o.kind === 'text') {
          return (
            <div key={o.id} {...common} style={{ left: o.x, top: o.y, width: o.w }}>
              <Editable
                className={s.objText}
                style={{ fontSize: o.size, color: `var(${o.color})` }}
                value={o.text}
                editing={ed}
                hint="Текст"
                onText={(t) => onText(o.id, t)}
                onDone={onDoneEdit}
              />
            </div>
          )
        }
        if (o.kind === 'note') {
          return (
            <div key={o.id} {...common} style={{ left: o.x, top: o.y, width: o.w, height: o.h }}>
              <Editable
                className={s.objNote}
                value={o.text}
                editing={ed}
                hint="Заметка" 
                onText={(t) => onText(o.id, t)}
                onDone={onDoneEdit}
              />
            </div>
          )
        }
        if (o.kind === 'image') {
          return (
            <div key={o.id} {...common} style={{ left: o.x, top: o.y, width: o.w, height: o.h }}>
              <img className={s.objImg} src={o.src} alt={o.name ?? 'Картинка на доске'} draggable={false} />
            </div>
          )
        }
        return (
          <div key={o.id} {...common} style={{ left: o.x, top: o.y, width: o.w, height: o.h }}>
            {/* Видео на доске — ссылка, а не файл: хранилища у комнаты пока нет,
                и класс смотрит его там же, где оно лежит. */}
            <div className={s.objVideo}>
              <span className={s.objVideoTitle}>{o.name ?? 'Видео'}</span>
              <a className={s.objVideoLink} href={o.url} target="_blank" rel="noreferrer"
                 onPointerDown={(e) => e.stopPropagation()}>
                {o.url}
              </a>
              <span className={s.objVideoHint}>откроется в новой вкладке · масштаб {Math.round(k * 100)} %</span>
            </div>
          </div>
        )
      })}
    </>
  )
}
