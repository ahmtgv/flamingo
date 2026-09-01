import { useState } from 'react'

import type { Пособие } from '../lib/study'
import type { ShowDoc } from './shows'
import s from './ShowList.module.css'

/** Панель показов: их несколько, и они сохраняются (решение владельца 31.08).
 *
 *  Раньше показ жил в одной переменной — второй было некуда положить, а про
 *  судьбу первого экран молчал. Теперь показы лежат в списке, и у списка есть
 *  честная строка о том, ГДЕ они лежат: на этом устройстве, не в облаке.
 *
 *  🔴 ДВА ИСТОЧНИКА, ОДИН СПИСОК, И ПОСОБИЯ УРОКА — СВЕРХУ. Их приложили
 *  заранее, к этому занятию, обдуманно; показы с диска — то, что понадобилось
 *  прямо сейчас. Порядок в списке — это ответ на вопрос «что я собирался
 *  показать», и отвечать на него должен урок, а не история одного компьютера.
 *
 *  Группы названы по-разному нарочно: пособия лежат на сервере и видны с
 *  любого устройства, показы — только с этого. Свалить их в один список без
 *  подписи значит соврать про половину. */

function when(at: number): string {
  return new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

const ВЕС = (b: number) =>
  b >= 1024 * 1024 ? `${Math.round(b / (1024 * 1024))} МБ`
    : b >= 1024 ? `${Math.round(b / 1024)} КБ` : `${b} Б`

const ВИД: Record<Пособие['вид'], string> = {
  doc: 'документ',
  image: 'картинка',
  link: 'ссылка — откроется в занятии',
}

/** Ложится ли пособие на доску.
 *
 *  🔴 НА ДОСКУ ЛОЖАТСЯ PDF И КАРТИНКИ, И БОЛЬШЕ НИЧЕГО. Сервер принимает и
 *  .docx, и .pptx, и .txt — их можно хранить и раздавать, но развернуть в
 *  страницы у нас нечем: для этого нужен конвертер, которого нет.
 *
 *  Такое пособие всё равно стоит в списке — преподаватель приложил его и
 *  должен видеть, что оно на месте. Но стоит НЕНАЖИМАЕМЫМ и со словами о том,
 *  чего ждёт (ПРАВИЛА 12.2–12.5): дверь, которая открывается в никуда, хуже
 *  двери, которой нет. Ссылка ложится всегда — её показывает Витрина. */
/** Чем подписать строку.
 *
 *  🔴 У ССЫЛКИ ИМЯ — ЭТО САМА ССЫЛКА: экран урока кладёт её именем, потому что
 *  другого имени человек не давал. В списке такая строка — триста знаков
 *  адреса с хвостом из служебных параметров, и различить две ссылки по ней
 *  нельзя. Показываем узел: «market.yandex.ru» человек узнаёт, а
 *  `?generalContext=t%3DshopInShop…` не узнаёт никто, включая того, кто
 *  ссылку положил.
 *
 *  Если имя ссылке дали своё — оно и остаётся: значит, о нём подумали. */
function подпись(п: Пособие): string {
  if (п.вид !== 'link' || п.имя !== п.адрес) return п.имя
  try {
    return new URL(п.адрес).host.replace(/^www\./, '')
  } catch {
    return п.имя
  }
}

export function наДоску(п: Пособие): boolean {
  if (п.вид === 'link' || п.вид === 'image') return true
  return п.имя.toLowerCase().endsWith('.pdf')
}

export function ShowList({
  shows, пособия, onПособие, activeId, kept, onOpen, onAdd, onDrop, onClose,
}: {
  shows: ShowDoc[]
  /** Приложенные к занятию заранее. Лежат на сервере, видны с любого устройства. */
  пособия: Пособие[]
  onПособие: (п: Пособие) => void
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
    <aside className={s.panel} aria-label="Учебные Документы">
      <header className={s.head}>
        <span className={s.title}>{пособия.length ? 'Учебные Документы' : 'Показы'}</span>
        <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </header>

      {пособия.length ? (
        <>
          <p className={s.group}>Приложены к уроку</p>
          <ul className={s.list}>
            {пособия.map((п) => {
              /* У пособия нет первой страницы, пока его не открыли: лица у
                 строки не будет, и пустая рамка честнее чужой картинки. */
              const внутри = (
                <>
                  <span className={s.noFace} aria-hidden />
                  <span className={s.rowWords}>
                    <span className={s.rowName}>{подпись(п)}</span>
                    <span className={s.rowMeta}>
                      {наДоску(п)
                        ? `${ВИД[п.вид]}${п.вид === 'link' ? '' : ` · ${ВЕС(п.размер)}`}`
                        : 'на доску ложатся pdf и картинки — этот файл пока только хранится'}
                    </span>
                  </span>
                </>
              )
              return (
                <li key={п.id} className={s.rowBox}>
                  {наДоску(п) ? (
                    <button type="button" className={s.row} onClick={() => onПособие(п)}>
                      {внутри}
                    </button>
                  ) : (
                    <span className={`${s.row} ${s.rowWait}`} aria-disabled="true" tabIndex={-1}>
                      {внутри}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      ) : null}

      {shows.length === 0 ? (
        /* ПРАВИЛА 6.2: пусто объясняет словами и даёт одно действие. */
        <div className={s.empty}>
          <p className={s.emptyWords}>
            {пособия.length
              ? 'Показов с этого компьютера пока нет. Пособия урока — выше: они лежат на сервере и открываются с любого устройства.'
              : 'Здесь будут ваши показы: картинки и PDF, разобранные по страницам. Показ сохраняется — «Закончить показ» его не стирает, и к нему можно вернуться на следующем занятии.'}
          </p>
        </div>
      ) : (
        <>
        <p className={s.group}>С этого компьютера</p>
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
        </>
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
