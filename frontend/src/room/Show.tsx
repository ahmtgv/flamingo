import { useEffect, useRef, useState } from 'react'

import { ИМЕНА } from './Shelf'
import s from './Show.module.css'
import { InkLayer, type Tool } from './Ink'
import { FIRST_TOOL, InkTools } from './InkTools'
import type { Ink } from './shows'
import { Note } from './Note'
import { рамкаПометок } from './рамка'

/** Что учитель показывает классу: картинка или страница презентации.
 *
 *  Листает только ведущий — класс смотрит туда же, куда он. Рисует поверх тоже
 *  только ведущий, тем же правом: «смотрите сюда» должно значить одно для всех.
 */

/** Ступени увеличения. Не «плюс десять процентов»: на уроке нужно не подобрать
 *  масштаб, а быстро приблизить и вернуться. Шесть ступеней проходятся тремя
 *  нажатиями в каждую сторону. */
export const СТУПЕНИ = [1, 1.25, 1.5, 2, 2.5, 3]

export function Show({
  title, page, i, n, lead, масштаб, onZoom,
  marks, onMark, onUndo, onWipe, canUndo, onShows, onPrev, onNext, onClose,
}: {
  title: string
  page: string | null
  i: number
  n: number
  lead: boolean
  /** Во сколько раз увеличена страница. 1 — по кадру. */
  масштаб: number
  onZoom: (v: number) => void
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
    /* 🔴 ПОПРАВКА НА ПРОКРУТКУ. Рамка пометок лежит absolute внутри показа, и
       её начало отсчёта — НЕпрокрученный угол. Прямоугольники же меряются от
       окна и уже сдвинуты прокруткой. Без `scrollLeft/scrollTop` увеличенная
       страница уезжает под пальцем, а пометки остаются на месте — и «смотрите
       сюда» показывает не туда. */
    const place = () => {
      const a = box.getBoundingClientRect()
      const b = img.getBoundingClientRect()
      setSpot(рамкаПометок(
        { left: a.left, top: a.top, scrollLeft: box.scrollLeft, scrollTop: box.scrollTop },
        { left: b.left, top: b.top, width: b.width, height: b.height },
      ))
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(box)
    ro.observe(img)
    box.addEventListener('scroll', place, { passive: true })
    return () => {
      ro.disconnect()
      box.removeEventListener('scroll', place)
    }
  }, [page, масштаб])

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
    <div className={`${s.show} ${масштаб > 1 ? s.showZoom : ''}`} ref={showRef}>
      {page ? (
        /* Увеличение — через предел размера, а не `transform`: так картинка
           по-настоящему занимает больше места, показ прокручивается, а рамка
           пометок меряется с неё и остаётся на своих долях страницы. */
        <img
          ref={imgRef}
          className={s.page}
          style={масштаб > 1
            ? { maxWidth: `${масштаб * 100}%`, maxHeight: `${масштаб * 100}%` }
            : undefined}
          src={page}
          alt={`${title}, страница ${i + 1} из ${n}`}
        />
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
          {/* 🔴 УВЕЛИЧЕНИЕ — У ВСЕХ, НЕ ТОЛЬКО У ВЕДУЩЕГО (решение владельца
              02.09: кнопки стоят перед названием документа). Мелкий шрифт на
              чужом экране плохо видно каждому по-своему, и просить об этом
              преподавателя посреди урока — не работа ученика.
              При этом движение ведущего уезжает классу: «посмотрите вот здесь»
              без общего масштаба не значит ничего. Свой масштаб живёт до
              следующего движения ведущего. */}
          <span className={s.zoom}>
            <button
              type="button" className={s.btn}
              onClick={() => onZoom(СТУПЕНИ[Math.max(0, СТУПЕНИ.indexOf(масштаб) - 1)] ?? 1)}
              disabled={масштаб <= СТУПЕНИ[0]}
              aria-label={`Уменьшить. Сейчас ${Math.round(масштаб * 100)}%`}
              title="Уменьшить"
            >
              −
            </button>
            <button
              type="button" className={s.btn}
              onClick={() => onZoom(СТУПЕНИ[Math.min(СТУПЕНИ.length - 1, СТУПЕНИ.indexOf(масштаб) + 1)] ?? 1)}
              disabled={масштаб >= СТУПЕНИ[СТУПЕНИ.length - 1]}
              aria-label={`Увеличить. Сейчас ${Math.round(масштаб * 100)}%`}
              title="Увеличить"
            >
              +
            </button>
          </span>
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
