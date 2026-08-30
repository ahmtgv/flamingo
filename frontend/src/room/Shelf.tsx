import s from './Shelf.module.css'

/** Полка источников. Что учитель выбрал — то и видит класс.
 *
 *  «Презентация» и «Учебник» стоят приглушёнными дверьми (ПРАВИЛА 12): их негде
 *  взять, пока у комнаты нет курса и хранилища файлов. Место под них забронировано,
 *  чтобы макет не прыгнул, когда они оживут.
 */
export type Source = 'faces' | 'board'

const DOORS = [
  { id: 'image', name: 'Картинка', when: 'появится вместе с хранилищем' },
  { id: 'video', name: 'Видео', when: 'появится вместе с хранилищем' },
  { id: 'deck', name: 'Презентация', when: 'появится вместе с курсом' },
  { id: 'book', name: 'Учебник', when: 'появится вместе с курсом' },
] as const

export function Shelf({ source, onPick }: { source: Source; onPick: (s: Source) => void }) {
  return (
    <div className={s.shelf} role="tablist" aria-label="Что показывают классу">
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

      <span className={s.gap} />

      {DOORS.map((d) => (
        <span key={d.id} className={s.door} title={`Пока не работает: ${d.when}`}>
          {d.name}
        </span>
      ))}
      {/* ПРАВИЛА 12: дверь названа, и сказано, когда откроется. Одной строкой на все
          четыре — четыре подписи подряд захламляют полку сильнее, чем объясняют. */}
      <span className={s.when}>пунктиром — то, чего пока негде взять</span>
    </div>
  )
}
