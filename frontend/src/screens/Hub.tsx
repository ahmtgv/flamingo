import { useMemo, useState } from 'react'

import { Cover } from '../hub/Cover'
import { Vitrina } from '../hub/Vitrina'
import { IF_SILENT, KINDS, RIGHTS, SOURCES, type Kind, type Source } from '../hub/sources'
import { Mark } from '../ui/Mark'
import s from './Hub.module.css'

/** Flamingo HUB — каталог чужих открытых источников.
 *
 *  🔴 Разложен по листу `docs/дизайн/от-дизайна-31.08/Flamingo HUB.dc.html`:
 *  фильтры стоят в строке заголовка, «Ответили 29 из 36» сжато в одну строку
 *  справа, правого рельса нет, у карточки есть обложка, а цветных полос слева
 *  нет вовсе — состояние говорит точка и надпись (решение владельца 31.08).
 *
 *  🔴 Право и «что будет, если замолчит» переехали в ВИТРИНУ, а не пропали
 *  вместе с рельсом: ПРАВИЛА 8.10 требуют, чтобы у источника были названы
 *  четыре человеческие формулировки права и строка про молчание. Читать их
 *  уместнее там, где источник открыт, а не в углу каталога.
 */

const STATE_TEXT = {
  ok: 'отвечает · проверено сегодня',
  live: 'идёт трансляция · звука нет',
  down: 'молчит с 09:40 · показываем последнюю проверку',
} as const

export function Hub({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<Kind | null>(null)
  /* Открытый источник показывается ЗДЕСЬ ЖЕ, поверх каталога. Новая вкладка
     уносит человека из Flamingo, и обратно он уже не всегда возвращается. */
  const [open, setOpen] = useState<Source | null>(null)

  const list = useMemo(() => (kind ? SOURCES.filter((x) => x.kind === kind) : SOURCES), [kind])
  const silent = SOURCES.filter((x) => x.state === 'down').length

  return (
    <main className={s.screen}>
      <header className={s.head}>
        {/* ПРАВИЛА 1.4: дорога назад — левый верхний угол, во всех состояниях. */}
        <button type="button" className={s.back} onClick={onBack}>
          ← Назад
        </button>
        <Mark />
        <span className={s.crumb}>Flamingo HUB</span>
      </header>

      {/* Заголовок, фильтры и строка опроса — одной строкой: раньше они занимали
          четыре этажа и отодвигали каталог за нижний край. */}
      <div className={s.top}>
        <h1 className={s.title}>Источники мира</h1>

        <div className={s.filters} role="tablist" aria-label="Вид источника">
          <button
            type="button"
            role="tab"
            aria-selected={kind === null}
            className={`${s.filter} ${kind === null ? s.filterOn : ''}`}
            onClick={() => setKind(null)}
          >
            Все <span className={s.filterN}>{SOURCES.length}</span>
          </button>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={`${s.filter} ${kind === k ? s.filterOn : ''}`}
              onClick={() => setKind(k)}
            >
              {k} <span className={s.filterN}>{SOURCES.filter((x) => x.kind === k).length}</span>
            </button>
          ))}
        </div>

        {/* Частичный отказ сжат до одной строки (решение владельца 31.08):
            сколько источников ответило. Подробности — у каждой карточки своей
            строкой состояния, а не общей простынёй наверху. */}
        <span className={s.answered}>
          <span className={s.answeredDot} />
          Ответили {SOURCES.length - silent} из {SOURCES.length}
        </span>
      </div>

      <div className={s.body}>
        <ul className={s.list} aria-label="Список источников">
          {list.map((x) => (
            <li key={x.id} className={s.card}>
              <span className={s.shot}>
                <Cover id={x.id} kind={x.kind} />
              </span>

              <span className={s.words}>
                <span className={s.kind}>{x.kind}</span>
                <span className={s.name}>{x.name}</span>
                <span className={s.gives}>{x.gives}</span>
                <span className={`${s.state} ${s[`st_${x.state}`]}`}>
                  <span className={s.stateDot} />
                  {STATE_TEXT[x.state]}
                </span>
                <span className={s.foot}>
                  <button type="button" className={s.go} onClick={() => setOpen(x)}>
                    открыть
                  </button>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Источник открыт ЗДЕСЬ ЖЕ. Выход один и он назван — «Закрыть»: из чужой
          страницы внутри рамки клавиша «назад» не работает так, как ждёт человек. */}
      {open ? (
        <div className={s.shown} role="dialog" aria-label={`Источник: ${open.name}`}>
          <header className={s.shownHead}>
            <span className={s.shownKind}>{open.kind}</span>
            <span className={s.shownName}>{open.name}</span>
            <span className={s.shownHost}>{new URL(open.home).host}</span>
            <button type="button" className={s.shownClose} onClick={() => setOpen(null)}>
              Закрыть
            </button>
          </header>

          <Vitrina url={open.home} name={open.name} />

          {/* ПРАВИЛА 8.10: право — четыре человеческие формулировки, к каждой
              строка «можно» и строка «нельзя», и отдельно — что будет, если
              источник замолчит. Это читает ученик, а не юрист. */}
          <footer className={s.rights}>
            <span className={s.rightShort}>{RIGHTS[open.right].short}</span>
            <span className={s.rightLine}>{RIGHTS[open.right].can}</span>
            <span className={s.rightLine}>{RIGHTS[open.right].cant}</span>
            <span className={s.rightLabel}>если замолчит</span>
            <span className={s.rightLine}>{IF_SILENT[open.kind]}</span>
          </footer>
        </div>
      ) : null}
    </main>
  )
}
