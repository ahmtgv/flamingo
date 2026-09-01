import { useEffect, useRef, useState } from 'react'

import { ИМЕНА } from './Shelf'
import s from './Show.module.css'
import { InkLayer, type Tool } from './Ink'
import { FIRST_TOOL, InkTools } from './InkTools'
import type { Ink } from './shows'
import { Note } from './Note'

/** Что учитель показывает классу: картинка или страница презентации.
 *
 *  Листает только ведущий — класс смотрит туда же, куда он. Рисует поверх тоже
 *  только ведущий, тем же правом: «смотрите сюда» должно значить одно для всех.
 */

export function Show({
  title, page, i, n, lead, marks, onMark, onUndo, onWipe, canUndo, onShows, onPrev, onNext, onClose,
}: {
  title: string
  page: string | null
  i: number
  n: number
  lead: boolean
  /** Пометки этой страницы. У класса — приехавшие, у ведущего — из показа. */
  marks: Ink[]
  onMark: (m: Ink, final: boolean) => void
  onUndo: () => void
  onWipe: () => void
  canUndo: boolean
  /** Открыть панель показов — их несколько, и они сохраняются. */
  onShows: () => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const [tool, setTool] = useState<Tool | null>(null)
  const showRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [spot, setSpot] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  /* 🔴 Слой пометок обязан лежать РОВНО по картинке, а не по сцене: доля 0.5 —
     это середина страницы, а не середина тёмного поля вокруг неё. Картинка сама
     держит свои пропорции, поэтому рамку меряем с неё и на каждый чих. */
  useEffect(() => {
    const box = showRef.current
    const img = imgRef.current
    if (!box || !img || !page) {
      setSpot(null)
      return
    }
    const place = () => {
      const a = box.getBoundingClientRect()
      const b = img.getBoundingClientRect()
      setSpot({ left: b.left - a.left, top: b.top - a.top, width: b.width, height: b.height })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(box)
    ro.observe(img)
    return () => ro.disconnect()
  }, [page])

  /* Отмена с клавиатуры — как на доске: рука тянется к Ctrl+Z сама. */
  useEffect(() => {
    if (!lead) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        onUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lead, onUndo])

  return (
    <div className={s.show} ref={showRef}>
      {page ? (
        <img ref={imgRef} className={s.page} src={page} alt={`${title}, страница ${i + 1} из ${n}`} />
      ) : (
        /* ПРАВИЛА 6.3: загрузка говорит, что придёт первым, и не мигает пустотой. */
        <Note
          title="Страница едет"
          text={`${title} · страница ${i + 1} из ${n}. Каждая страница уезжает классу отдельно —
            так канал остаётся свободным для голоса.`}
        />
      )}

      {page && spot ? (
        <div className={s.spot} style={spot}>
          <InkLayer marks={marks} tool={lead ? tool : null} onMark={onMark} />
        </div>
      ) : null}

      {/* Инструменты пометок просыпаются над пультом, когда маркер включён. */}
      {lead && tool ? (
        <InkTools
          tool={tool}
          onTool={setTool}
          onUndo={onUndo}
          onWipe={onWipe}
          canUndo={canUndo}
          canWipe={marks.length > 0}
        />
      ) : null}

      {n > 0 ? (
        <div className={s.pult} data-pult="показ">
          <span className={s.title}>{title}</span>
          <span className={s.count}>
            {i + 1} из {n}
          </span>
          {lead ? (
            <>
              <button type="button" className={s.btn} onClick={onPrev} disabled={i === 0}>
                ←
              </button>
              <button type="button" className={s.btn} onClick={onNext} disabled={i >= n - 1}>
                →
              </button>
              <span className={s.sep} />
              <button
                type="button"
                className={`${s.toolBtn} ${tool ? s.toolOn : ''}`}
                aria-pressed={Boolean(tool)}
                onClick={() => setTool(tool ? null : FIRST_TOOL)}
              >
                Маркер
              </button>
              <button type="button" className={s.toolBtn} onClick={onShows}>
                {ИМЕНА.show}
              </button>
              {/* Уход из показа живёт у правого края полосы и ничем не залит:
                  уход — не аларм (ПРАВИЛА 11а), и заливка на экране одна. */}
              <span className={s.pultEnd}>
                <button type="button" className={s.stop} onClick={onClose}>
                  Закончить показ
                </button>
              </span>
            </>
          ) : (
            <span className={s.follow}>листает преподаватель</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
