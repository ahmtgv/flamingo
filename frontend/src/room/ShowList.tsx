import { useState } from 'react'

import type { ShowDoc } from './shows'
import s from './ShowList.module.css'

/** Панель показов: их несколько, и они сохраняются (решение владельца 31.08).
 *
 *  Раньше показ жил в одной переменной — второй было некуда положить, а про
 *  судьбу первого экран молчал. Теперь показы лежат в списке, и у списка есть
 *  честная строка о том, ГДЕ они лежат: на этом устройстве, не в облаке.
 */

function when(at: number): string {
  return new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function ShowList({ shows, activeId, kept, onOpen, onAdd, onDrop, onClose }: {
  shows: ShowDoc[]
  activeId: string | null
  /** false — браузер отказал в хранении: показы доживут до перезагрузки. */
  kept: boolean
  onOpen: (id: string) => void
  onAdd: () => void
  onDrop: (id: string) => void
  onClose: () => void
}) {
  /* Удаление — в два нажатия на месте: отдельное окно «вы уверены?» для одного
     показа — из пушки по воробью, а одно нажатие — потеря без спроса. */
  const [arming, setArming] = useState<string | null>(null)

  return (
    <aside className={s.panel} aria-label="Показы">
      <header className={s.head}>
        <span className={s.title}>Показы</span>
        <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </header>

      {shows.length === 0 ? (
        /* ПРАВИЛА 6.2: пусто объясняет словами и даёт одно действие. */
        <div className={s.empty}>
          <p className={s.emptyWords}>
            Здесь будут ваши показы: картинки и PDF, разобранные по страницам.
            Показ сохраняется — «Закончить показ» его не стирает, и к нему можно
            вернуться на следующем занятии.
          </p>
        </div>
      ) : (
        <ul className={s.list}>
          {shows.map((d) => (
            <li key={d.id} className={s.rowBox}>
              <button
                type="button"
                className={`${s.row} ${d.id === activeId ? s.rowOn : ''}`}
                aria-pressed={d.id === activeId}
                onClick={() => onOpen(d.id)}
              >
                {/* Первая страница — лицо показа: по имени файла его не вспомнить. */}
                <img className={s.thumb} src={d.pages[0]} alt="" />
                <span className={s.rowWords}>
                  <span className={s.rowName}>{d.title}</span>
                  <span className={s.rowMeta}>
                    {d.pages.length} стр. · {when(d.at)}
                    {d.id === activeId ? ' · показывается' : ''}
                  </span>
                </span>
              </button>
              {arming === d.id ? (
                <span className={s.confirm}>
                  <button type="button" className={s.drop} onClick={() => { setArming(null); onDrop(d.id) }}>
                    Точно удалить
                  </button>
                  <button type="button" className={s.keep} onClick={() => setArming(null)}>
                    Оставить
                  </button>
                </span>
              ) : (
                <button type="button" className={s.dropAsk} onClick={() => setArming(d.id)}>
                  Удалить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className={s.foot}>
        <button type="button" className={s.add} onClick={onAdd}>
          Добавить показ
        </button>
        {/* Молчание про место хранения — враньё по устройству (shows.ts). */}
        <p className={s.where}>
          {kept
            ? 'Показы хранятся на этом устройстве. С другого компьютера их не видно.'
            : 'Браузер не дал места: показы доживут только до перезагрузки страницы.'}
        </p>
      </footer>
    </aside>
  )
}
