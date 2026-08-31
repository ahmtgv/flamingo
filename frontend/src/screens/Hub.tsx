import { useMemo, useState } from 'react'

import { Vitrina } from '../hub/Vitrina'

import { IF_SILENT, KINDS, RIGHTS, SOURCES, type Kind, type Source } from '../hub/sources'
import { Mark } from '../ui/Mark'
import s from './Hub.module.css'

/** Flamingo HUB — каталог чужих открытых источников.
 *
 *  🔴 Экран собирается из ДВУХ независимых источников: каталог наш, а состояние
 *  каждого источника — чужой опрос. Поэтому частичный отказ здесь обязателен
 *  и показан (ПРАВИЛА 6.5): каталог показывает всё, а девять источников честно
 *  помечены «молчит» с временем последней удачной проверки.
 */

const STATE_TEXT = {
  ok: 'отвечает · проверено сегодня',
  live: 'идёт трансляция · звука нет',
  down: 'молчит с 09:40 · показываем последнюю проверку',
} as const

export function Hub({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<Kind | null>(null)
  const [pick, setPick] = useState<Source | null>(null)
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

      <div className={s.top}>
        <h1 className={s.title}>Источники мира</h1>
        <p className={s.lead}>
          Каждый источник проверен руками: что он даёт, что с ним можно сделать и что будет,
          если он замолчит. Право написано словами — его читает ученик, а не только юрист.
        </p>

        {/* Частичный отказ живёт в своей строке и стоит всегда (ПРАВИЛА 6.5а, 6.6). */}
        <p className={s.partial}>
          <span className={s.partialTitle}>
            Ответили {SOURCES.length - silent} источников из {SOURCES.length}
          </span>
          <span className={s.partialText}>
            работает: поиск, право, показ классу · не работает: опрос {silent} источников —
            они помечены «молчит» · что с данными: у молчащих показана последняя удачная проверка
          </span>
        </p>

        <div className={s.filters} role="tablist" aria-label="Вид источника">
          <button
            type="button"
            role="tab"
            aria-selected={kind === null}
            className={`${s.filter} ${kind === null ? s.filterOn : ''}`}
            onClick={() => setKind(null)}
          >
            Все {SOURCES.length}
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
              {k} {SOURCES.filter((x) => x.kind === k).length}
            </button>
          ))}
        </div>
      </div>

      <div className={s.body}>
        <ul className={s.list}>
          {list.map((x) => (
            <li key={x.id} className={s.item}>
              <button
                type="button"
                className={`${s.card} ${pick?.id === x.id ? s.cardOn : ''} ${s[`st_${x.state}`]}`}
                onClick={() => setPick(x)}
                aria-pressed={pick?.id === x.id}
              >
                <span className={s.kind}>{x.kind}</span>
                <span className={s.name}>{x.name}</span>
                <span className={s.gives}>{x.gives}</span>
                <span className={s.state}>{STATE_TEXT[x.state]}</span>
              </button>
              <button type="button" className={s.cardGo}
                      onClick={(e) => { e.stopPropagation(); setPick(x); setOpen(x) }}>
                открыть
              </button>
            </li>
          ))}
        </ul>

        <aside className={s.detail} aria-label="Про источник">
          {pick ? (
            <>
              <span className={s.detailKind}>{pick.kind}</span>
              <h2 className={s.detailName}>{pick.name}</h2>
              <p className={s.detailText}>{pick.gives}</p>

              <p className={s.rightShort}>{RIGHTS[pick.right].short}</p>
              <p className={s.detailText}>{RIGHTS[pick.right].can}</p>
              <p className={s.detailText}>{RIGHTS[pick.right].cant}</p>

              <span className={s.label}>если замолчит</span>
              <p className={s.detailText}>{IF_SILENT[pick.kind]}</p>

              {/* 🔴 Главное действие каталога — попасть В источник. Без него каталог
                  остаётся витриной имён: человек выбрал строку и упёрся в тупик. */}
              <button type="button" className={s.open} onClick={() => setOpen(pick)}>
                Открыть источник
              </button>
              <span className={s.openWhy}>{new URL(pick.home).host}</span>

              {/* ПРАВИЛА 12: дверь видна, названа, не нажимается, сказано когда откроется. */}
              <span className={s.door} aria-disabled="true" tabIndex={-1}>
                Показать классу
              </span>
              <span className={s.doorWhy}>
                появится вместе с уроком: показ идёт из комнаты, а не отсюда
              </span>
            </>
          ) : (
            /* ПРАВИЛА 6.2: пусто объясняет словами и даёт одно действие. */
            <>
              <span className={s.label}>ничего не выбрано</span>
              <p className={s.detailText}>
                Выберите источник слева — здесь появится, что он даёт, что с ним можно
                и чего нельзя, и что будет, если он замолчит.
              </p>
            </>
          )}
        </aside>
      </div>

      {/* Источник открыт ЗДЕСЬ ЖЕ. Выход один и он назван — «Закрыть»: из чужой
          страницы внутри рамки клавиша «назад» не работает так, как ждёт человек. */}
      {open ? (
        <div className={s.shown} role="dialog" aria-label={`Источник: ${open.name}`}>
          <header className={s.shownHead}>
            <span className={s.shownName}>{open.name}</span>
            <button type="button" className={s.shownClose} onClick={() => setOpen(null)}>
              Закрыть
            </button>
          </header>
          <Vitrina url={open.home} name={open.name} />
        </div>
      ) : null}
    </main>
  )
}
