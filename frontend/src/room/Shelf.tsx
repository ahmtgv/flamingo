import s from './Shelf.module.css'

/** Полка источников. Что учитель выбрал — то и видит класс. */
export type Source = 'faces' | 'board'

/** 🔴 Четыре приглушённые двери подряд — это уже витрина несуществующего, и
 *  ПРАВИЛА 12.7 велят свернуть такой список в ОДНУ строку. Поэтому картинка,
 *  видео, презентация и учебник названы вместе, одной фразой, и в ней же сказано,
 *  чего они ждут (12.3: объяснение берёт полный контраст, приглушено название). */
const NOT_YET = 'картинка, видео, презентация, учебник'

export function Shelf({ source, onPick }: { source: Source; onPick: (s: Source) => void }) {
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
      </div>

      {/* ПРАВИЛА 12.4: говорим о сроке, а не о запрете. */}
      <p className={s.notYet}>
        <span className={s.notYetName}>Пока нет: {NOT_YET}</span>
        <span className={s.notYetWhy}>появятся вместе с курсом и хранилищем файлов</span>
      </p>
    </div>
  )
}
