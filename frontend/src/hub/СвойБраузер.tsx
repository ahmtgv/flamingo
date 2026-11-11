import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import s from '../screens/Hub.module.css'
import type { Source } from './sources'
import { действие, кадр, открыть, НеВышло, type Действие } from './окноСервера'

/** Источник, открытый браузером на нашем сервере (владелец, 11.11.2026).
 *
 *  🔴 ЗДЕСЬ НЕ САЙТ, А КАРТИНКА ЕГО ОКНА. Сайт, запретивший рамку, открыт на
 *  сервере настоящим браузером; сюда приходят кадры, отсюда уходят нажатия,
 *  прокрутка и клавиши. Отсюда и честные следствия: наведение мыши не
 *  передаётся, выделить и скопировать текст нельзя, отклик — доли секунды, а
 *  не мгновенно. Зато открывается то, что в рамке не открывается вовсе.
 *
 *  Кадры спрашиваются часто, пока человек что-то делает, и редко, пока он
 *  смотрит; скрытая вкладка не спрашивает совсем. Окно на сервере, оставленное
 *  без дела, закрывается само — тогда источник открывается заново.
 */

const КЛАВИШИ = new Set(['Enter', 'Backspace', 'Delete', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight',
  'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', ' '])

const ждать = (мс: number) => new Promise<void>((готово) => { window.setTimeout(готово, мс) })

function хост(адрес: string): string {
  try { return new URL(адрес).host.replace(/^www\./, '') } catch { return '' }
}

export function СвойБраузер({ x, раз, активна }: {
  x: Source
  /** Растёт, когда человек нажал «обновить». */
  раз: number
  /** Вкладка на виду. Скрытая кадров не спрашивает. */
  активна: boolean
}) {
  const [окно, setОкно] = useState('')
  const [картинка, setКартинка] = useState('')
  const [адрес, setАдрес] = useState(x.home)
  const [беда, setБеда] = useState('')
  const [заново, setЗаново] = useState(0)
  const поле = useRef<HTMLDivElement>(null)
  const снимок = useRef<HTMLImageElement>(null)
  const быстроДо = useRef(0)
  const сразу = useRef(false)
  const очередь = useRef<Promise<void>>(Promise.resolve())
  const видна = useRef(активна)
  видна.current = активна

  /* Действия уходят по одному и в том порядке, в каком сделаны: буквы слова не
     должны обгонять друг друга. Неудача не рвёт очередь — следующий кадр
     покажет, что вышло на самом деле. */
  const послать = (д: Действие) => {
    if (!окно) return
    быстроДо.current = Date.now() + 4000
    очередь.current = очередь.current
      .then(() => действие(окно, д))
      .catch(() => undefined)
      .then(() => { сразу.current = true })
  }

  /* Открыть источник на сервере — размером с это место на экране. */
  useEffect(() => {
    let живо = true
    setОкно('')
    setБеда('')
    const место = поле.current?.getBoundingClientRect()
    открыть(x.id, Math.round(место?.width ?? 1100), Math.round(место?.height ?? 700))
      .then((w) => {
        if (!живо) { void действие(w, { что: 'close' }).catch(() => undefined); return }
        быстроДо.current = Date.now() + 8000
        setОкно(w)
      })
      .catch((e) => { if (живо) setБеда(e instanceof НеВышло ? e.message : 'Источник не открылся.') })
    return () => { живо = false }
  }, [x.id, заново])

  /* Уходя, окно на сервере закрываем: чужих окон там немного. */
  useEffect(() => {
    if (!окно) return
    return () => { void действие(окно, { что: 'close' }).catch(() => undefined) }
  }, [окно])

  /* Кадры. */
  useEffect(() => {
    if (!окно) return
    let живо = true
    let хэш = ''
    let прошлая = ''
    void (async () => {
      while (живо) {
        if (!видна.current || document.hidden) { await ждать(400); continue }
        try {
          const к = await кадр(окно, хэш)
          if (!живо) break
          хэш = к.хэш
          if (к.адрес) setАдрес(к.адрес)
          if (к.картинка) {
            const новая = URL.createObjectURL(к.картинка)
            setКартинка(новая)
            if (прошлая) URL.revokeObjectURL(прошлая)
            прошлая = новая
          }
        } catch (e) {
          if (!живо) break
          /* Окно на сервере закрылось от простоя — открываем источник заново. */
          if (e instanceof НеВышло && e.код === 404) { setЗаново((n) => n + 1); break }
          await ждать(2000)
        }
        const пауза = Date.now() < быстроДо.current ? 350 : 2500
        const конец = Date.now() + пауза
        сразу.current = false
        while (живо && Date.now() < конец && !сразу.current) await ждать(120)
      }
    })()
    return () => { живо = false; if (прошлая) URL.revokeObjectURL(прошлая) }
  }, [окно])

  /* «Обновить» в строке адреса. */
  const первый = useRef(true)
  useEffect(() => {
    if (первый.current) { первый.current = false; return }
    послать({ что: 'reload' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [раз])

  /* Размер окна на сервере идёт за размером места на экране. */
  useEffect(() => {
    const el = поле.current
    if (!el || !окно) return
    let срок = 0
    const смотрю = new ResizeObserver(() => {
      window.clearTimeout(срок)
      срок = window.setTimeout(() => {
        const м = el.getBoundingClientRect()
        if (м.width > 0 && м.height > 0) послать({ что: 'size', ш: Math.round(м.width), в: Math.round(м.height) })
      }, 500)
    })
    смотрю.observe(el)
    return () => { смотрю.disconnect(); window.clearTimeout(срок) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [окно])

  /* Точка на экране → точка в окне на сервере. Картинка вписана и прижата к
     левому верхнему углу, так что хватает одного масштаба. */
  const точка = (cx: number, cy: number) => {
    const рис = снимок.current
    if (!рис || !рис.naturalWidth) return null
    const м = рис.getBoundingClientRect()
    const масштаб = Math.min(м.width / рис.naturalWidth, м.height / рис.naturalHeight) || 1
    return { x: Math.round((cx - м.left) / масштаб), y: Math.round((cy - м.top) / масштаб) }
  }

  /* Прокрутка колесом: копим и шлём пачкой. Слушатель ставится руками —
     иначе страницу под рамкой не удержать от собственной прокрутки. */
  useEffect(() => {
    const el = поле.current
    if (!el || !окно) return
    let dx = 0
    let dy = 0
    let где = { x: 0, y: 0 }
    let срок = 0
    const колесо = (e: WheelEvent) => {
      e.preventDefault()
      const т = точка(e.clientX, e.clientY)
      if (т) где = т
      dx += e.deltaX
      dy += e.deltaY
      if (срок) return
      срок = window.setTimeout(() => {
        срок = 0
        послать({ что: 'wheel', ...где, dx: Math.round(dx), dy: Math.round(dy) })
        dx = 0
        dy = 0
      }, 90)
    }
    el.addEventListener('wheel', колесо, { passive: false })
    return () => { el.removeEventListener('wheel', колесо); window.clearTimeout(срок) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [окно])

  /* Нажатие, перетаскивание и прокрутка пальцем. */
  const начало = useRef<{ x: number; y: number; cx: number; cy: number; палец: boolean; вёл: boolean } | null>(null)
  const нажал = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const т = точка(e.clientX, e.clientY)
    if (!т) return
    e.currentTarget.focus()
    e.currentTarget.setPointerCapture(e.pointerId)
    начало.current = { ...т, cx: e.clientX, cy: e.clientY, палец: e.pointerType === 'touch', вёл: false }
  }
  const ведёт = (e: PointerEvent<HTMLDivElement>) => {
    const н = начало.current
    if (!н || !н.палец) return
    const dy = н.cy - e.clientY
    const dx = н.cx - e.clientX
    if (!н.вёл && Math.hypot(dx, dy) < 8) return
    /* Пальцем по экрану — это прокрутка, а не перетаскивание. */
    н.вёл = true
    н.cx = e.clientX
    н.cy = e.clientY
    послать({ что: 'wheel', x: н.x, y: н.y, dx: Math.round(dx), dy: Math.round(dy) })
  }
  const отпустил = (e: PointerEvent<HTMLDivElement>) => {
    const н = начало.current
    начало.current = null
    if (!н || н.вёл) return
    const т = точка(e.clientX, e.clientY)
    if (!т) return
    if (Math.hypot(e.clientX - н.cx, e.clientY - н.cy) > 6) послать({ что: 'drag', x: н.x, y: н.y, x1: т.x, y1: т.y })
    else послать({ что: 'click', x: н.x, y: н.y })
  }

  const клавиша = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (КЛАВИШИ.has(e.key)) {
      /* Tab остаётся нашим: иначе с клавиатуры из картинки не выйти. */
      if (e.key === 'Tab') return
      e.preventDefault()
      послать({ что: 'key', клавиша: e.key })
    } else if (e.key.length === 1) {
      e.preventDefault()
      послать({ что: 'text', текст: e.key })
    }
  }

  return (
    <>
      <div
        ref={поле}
        className={s.own}
        tabIndex={0}
        role="application"
        aria-label={`${x.name} — окно браузера Flamingo. Нажатия и клавиши уходят на страницу источника`}
        onPointerDown={нажал}
        onPointerMove={ведёт}
        onPointerUp={отпустил}
        onPointerCancel={() => { начало.current = null }}
        onKeyDown={клавиша}
      >
        {картинка ? <img ref={снимок} className={s.shot} src={картинка} alt="" draggable={false} /> : null}
        {беда ? (
          <p className={s.ownNote}>
            {беда}{' '}
            <button type="button" className={s.ownAgain} onClick={() => setЗаново((n) => n + 1)}>Попробовать ещё раз</button>
          </p>
        ) : !картинка ? <p className={s.ownNote}>Открываем источник в браузере Flamingo…</p> : null}
      </div>
      <p className={s.blank}>
        Открыто браузером Flamingo{хост(адрес) ? ` · ${хост(адрес)}` : ''}.{' '}
        <button type="button" className={s.ownAgain} onClick={() => послать({ что: 'back' })} disabled={!окно}>← Назад</button>{' '}
        <a href={адрес || x.home} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке ↗</a>
      </p>
    </>
  )
}
