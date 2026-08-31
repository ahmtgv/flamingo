import s from './Shelf.module.css'

/** Полка источников. Что учитель выбрал — то и видит класс. */
export type Source = 'faces' | 'board' | 'show' | 'live'

/** Дверь, которой ещё нет. На листе она — ПЛАШКА с именем, а не строка текста:
 *  приглушённая дверь обязана быть видна и названа, а цель нажатия у неё
 *  полная (ПРАВИЛА 12.2, 12.6). Раньше здесь стояла надпись «Пока нет: учебник»,
 *  и на глаз она читалась как продолжение полки, а не как отдельная вещь. */
const NOT_YET = 'Учебник'

export function Shelf({ source, onPick, onShow, onHub }: {
  source: Source
  onPick: (s: Source) => void
  /** Показ начинается с выбора файла, поэтому у него своя дорога, а не просто вкладка. */
  onShow: () => void
  /** Трансляция начинается с выбора источника — тоже своя дорога. */
  onHub: () => void
}) {
  return (
    <div className={s.shelf}>
      <div className={s.tabs} role="tablist" aria-label="Что показывают классу">
        <button
          type="button"
          role="tab"
          aria-selected={source === 'faces'}
          className={`${s.item} ${source === 'faces' ? s.on : ''}`}
          onClick={() => onPick('faces')}
        >
          Лица
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'board'}
          className={`${s.item} ${source === 'board' ? s.on : ''}`}
          onClick={() => onPick('board')}
        >
          Доска
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'show'}
          className={`${s.item} ${source === 'show' ? s.on : ''}`}
          onClick={onShow}
        >
          Показ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'live'}
          className={`${s.item} ${source === 'live' ? s.on : ''}`}
          onClick={onHub}
        >
          Из HUB
        </button>
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
