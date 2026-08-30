import s from './Board.module.css'

type Props = {
  sheets: { id: string; name: string }[]
  active: string
  onOpen: (id: string) => void
  onAdd: () => void
  onSave: () => void
  onLoad: () => void
}

/** Полоса досок. Открыта у всех одна и та же: доску ведёт тот, кто переключил,
 *  иначе класс смотрел бы в разные листы и не знал об этом. */
export function Sheets({ sheets, active, onOpen, onAdd, onSave, onLoad }: Props) {
  return (
    <div className={s.sheets} role="tablist" aria-label="Доски урока">
      {sheets.map((sh) => (
        <button
          key={sh.id}
          type="button"
          role="tab"
          aria-selected={sh.id === active}
          className={`${s.sheet} ${sh.id === active ? s.sheetOn : ''}`}
          onClick={() => onOpen(sh.id)}
        >
          {sh.name}
        </button>
      ))}
      <button type="button" className={s.sheetAdd} onClick={onAdd} title="Новая доска">
        + доска
      </button>

      <span className={s.sheetsGap} />

      {/* Хранилища у комнаты пока нет, поэтому «сохранить» — это файл на диск.
          Названо ровно тем, что делает (ПРАВИЛА 14.1). */}
      <button type="button" className={s.sheetAct} onClick={onSave} title="Сохранить все доски урока в файл">
        Сохранить в файл
      </button>
      <button type="button" className={s.sheetAct} onClick={onLoad} title="Открыть сохранённый файл — он заменит доски у всех">
        Открыть
      </button>
    </div>
  )
}
