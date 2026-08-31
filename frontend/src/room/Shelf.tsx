import s from './Shelf.module.css'

/** Полка источников. Что учитель выбрал — то и видит класс. */
export type Source = 'faces' | 'board' | 'show' | 'live'

/** Осталось две двери — учебник и живое видео. ПРАВИЛА 12.7 велят сворачивать
 *  в одну строку список от четырёх дверей; двух хватает назвать вместе. */
const NOT_YET = 'учебник'

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

      {/* ПРАВИЛА 12.4: говорим о сроке, а не о запрете. */}
      <p className={s.notYet}>
        <span className={s.notYetName}>Пока нет: {NOT_YET}</span>
        <span className={s.notYetWhy}>появится вместе с курсом</span>
      </p>
    </div>
  )
}
