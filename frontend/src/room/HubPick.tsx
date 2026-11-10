import { useMemo, useState } from 'react'

import { KINDS, RIGHTS, SOURCES, type Kind } from '../hub/sources'
import { useПоверх } from '../lib/окно'
import s from './HubPick.module.css'
import { Button } from '../ui/Button'

/** Выбор источника для показа классу — прямо из комнаты, не уходя с урока.
 *
 *  Ссылку на конкретную страницу или поток даёт преподаватель: каталог знает, ЧТО
 *  за источник и что с ним можно, но не знает, какую именно страницу вы хотите
 *  показать сегодня. Выдумывать адреса за источник мы не будем.
 */
export function HubPick({ onGo, onClose }: {
  onGo: (sourceId: string, url: string) => void
  onClose: () => void
}) {
  const [kind, setKind] = useState<Kind | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [url, setUrl] = useState('')

  const list = useMemo(() => (kind ? SOURCES.filter((x) => x.kind === kind) : SOURCES), [kind])
  const chosen = SOURCES.find((x) => x.id === pick)

  const поверх = useПоверх<HTMLElement>(onClose)

  return (
    <aside ref={поверх} tabIndex={-1} role="dialog" aria-modal="true" className={s.panel} aria-label="Показать классу из Flamingo HUB">
      <header className={s.head}>
        <span className={s.title}>Показать из Flamingo HUB</span>
        <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </header>

      <div className={s.filters} role="tablist" aria-label="Вид источника">
        <button type="button" role="tab" aria-selected={kind === null}
                className={`${s.filter} ${kind === null ? s.filterOn : ''}`}
                onClick={() => setKind(null)}>
          все
        </button>
        {KINDS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k}
                  className={`${s.filter} ${kind === k ? s.filterOn : ''}`}
                  onClick={() => setKind(k)}>
            {k}
          </button>
        ))}
      </div>

      <ul className={s.list}>
        {list.map((x) => (
          <li key={x.id}>
            <button type="button" className={`${s.row} ${pick === x.id ? s.rowOn : ''}`}
                    aria-pressed={pick === x.id}
                    onClick={() => {
                      setPick(x.id)
                      // Адрес источника подставляем сразу: чаще всего показывают
                      // именно его, а правку никто не запрещает.
                      if (!url.trim()) setUrl(x.home)
                    }}>
              <span className={s.rowName}>{x.name}</span>
              <span className={s.rowGives}>{x.gives}</span>
              {/* 🔴 НИ СЛОВА О ДОСТУПНОСТИ. Стояло «в прошлый раз молчал» — и это
                    тоже обещание проверки: «в прошлый раз» значит, что был какой-то
                    раз. Его не было: буква `state` набиралась руками в каталоге, и
                    08.09 её оттуда убрали совсем (осмотр, находка 19). Строка про
                    молчание вернётся вместе с настоящим опросом, не раньше. */}
            </button>
          </li>
        ))}
      </ul>

      <form
        className={s.foot}
        onSubmit={(e) => {
          e.preventDefault()
          if (pick && url.trim()) onGo(pick, url.trim())
        }}
      >
        {chosen ? <p className={s.right}>{RIGHTS[chosen.right].can}</p> : null}
        {chosen ? <p className={s.cant}>{RIGHTS[chosen.right].cant}</p> : null}
        <input
          className={s.input}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Ссылка на страницу или поток"
          aria-label="Ссылка на страницу или поток"
        />
        <span className={s.hint}>
          Каталог знает, что за источник и что с ним можно. Какую именно страницу показать
          сегодня — решаете вы.
        </span>
        <Button kind="go" type="submit" disabled={!pick || !url.trim()}>
          Показать классу
        </Button>
      </form>
    </aside>
  )
}
