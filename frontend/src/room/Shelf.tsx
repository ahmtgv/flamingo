import { useEffect, useRef, useState } from 'react'

import s from './Shelf.module.css'

/** Полка источников. Что учитель выбрал — то и видит класс. */
export type Source = 'faces' | 'board' | 'show' | 'live' | 'screen'

/** 🔴 Имена с решения владельца 01.09. Полка называет вещи так, как их называют
 *  в школе, а не так, как они устроены внутри: «Класс», а не «лица»;
 *  «Учебные Документы», а не «показ».
 *
 *  Имя экрана одно и то же во всех местах продукта (ПРАВИЛА 4.9): полка, заголовки
 *  пультов и подписи в чате берут его отсюда, а не пишут своими словами. */
export const ИМЕНА: Record<Source, string> = {
  faces: 'Класс',
  board: 'Классная Доска',
  show: 'Учебные Документы',
  live: 'Методички',
  screen: 'Экран преподавателя',
}

/** Что лежит внутри «Методичек». Живой пока один пункт; остальные — приглушённые
 *  двери: видны, названы, не нажимаются, и рядом сказано, чего они ждут
 *  (ПРАВИЛА 12.2–12.5). Мёртвая кнопка, которая выглядит живой, хуже отсутствующей. */
const МЕТОДИЧКИ: { имя: string; ждёт?: string; экран?: true }[] = [
  { имя: 'Из HUB' },
  { имя: 'Показать свой экран', экран: true },
  { имя: 'Материалы для урока', ждёт: 'появятся вместе с курсом — их загружает преподаватель' },
  { имя: 'Избранные материалы', ждёт: 'появятся вместе с учётной записью преподавателя' },
  { имя: 'Подключить…', ждёт: 'свои телескопы, дроны, серверы и библиотеки — после кабинета' },
]

/** Дверь, которой ещё нет. Плашка с именем, а не строка текста. */
const NOT_YET = 'Учебник'

export function Shelf({ source, onPick, onShow, onHub, onShare }: {
  source: Source
  onPick: (s: Source) => void
  /** Показ начинается с выбора файла, поэтому у него своя дорога, а не просто вкладка. */
  onShow: () => void
  /** Трансляция начинается с выбора источника — тоже своя дорога. */
  onHub: () => void
  /** Показ экрана: браузер сам спросит, чем делиться. */
  onShare: () => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  const вкладка = (кто: Source, нажать: () => void) => (
    <button
      type="button"
      role="tab"
      aria-selected={source === кто}
      className={`${s.item} ${source === кто ? s.on : ''}`}
      onClick={нажать}
    >
      {ИМЕНА[кто]}
    </button>
  )

  return (
    <div className={s.shelf}>
      <div className={s.tabs} role="tablist" aria-label="Что показывают классу">
        {вкладка('faces', () => onPick('faces'))}
        {вкладка('board', () => onPick('board'))}
        {вкладка('show', onShow)}

        {/* «Методички» — не одна дверь, а полка внутри полки. */}
        <div className={s.pack} ref={box}>
          <button
            type="button"
            role="tab"
            aria-selected={source === 'live'}
            aria-expanded={open}
            className={`${s.item} ${source === 'live' ? s.on : ''}`}
            onClick={() => setOpen((v) => !v)}
          >
            {ИМЕНА.live}
          </button>
          {open ? (
            <div className={s.packMenu} role="menu" aria-label="Методички">
              {МЕТОДИЧКИ.map((м) =>
                м.ждёт ? (
                  <span key={м.имя} className={s.packDoor} aria-disabled="true" tabIndex={-1}>
                    {м.имя}
                    <span className={s.packWhy}>{м.ждёт}</span>
                  </span>
                ) : (
                  <button
                    key={м.имя}
                    type="button"
                    className={s.packItem}
                    onClick={() => {
                      setOpen(false)
                      if (м.экран) onShare()
                      else onHub()
                    }}
                  >
                    {м.имя}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ПРАВИЛА 12.4: говорим о сроке, а не о запрете. 12.5: дверь не нажимается
          по-настоящему, и читалка экрана об этом знает. */}
      <p className={s.notYet}>
        <span className={s.notYetName} aria-disabled="true" tabIndex={-1}>{NOT_YET}</span>
        <span className={s.notYetWhy}>появится вместе с курсом</span>
      </p>
    </div>
  )
}
