import { useCallback, useMemo, useRef, useState, type PointerEvent as Нажатие } from 'react'

import { Cover } from '../hub/Cover'
import { Vitrina } from '../hub/Vitrina'
import { IF_SILENT, RIGHTS, РАЗДЕЛЫ, источникиРаздела, разделИсточника, type Source } from '../hub/sources'
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

/** 🔴 ТРИ КОЛОНКИ И ОКНА (решение владельца 10.11.2026, по его эскизам).
 *  Слева — названия источников по разделам-предметам. В середине — выбранный
 *  источник: что даёт, что с ним можно, и действия. Справа — браузер источника
 *  со вкладками. Источник можно вынести в отдельное окно: двигать за заголовок,
 *  менять размер за уголок, закрыть; окон не больше шести.
 *
 *  На телефоне колонки не помещаются — там три шага: список, источник, браузер;
 *  окон на телефоне нет.
 *
 *  🔴 ЧУЖОЙ САЙТ ПОКАЗЫВАЕТСЯ В РАМКЕ, И ОН ВПРАВЕ ОТКАЗАТЬ. Тогда рамка пуста,
 *  и под ней сказано почему и дана ссылка «в новой вкладке» (`hub/Vitrina`). */

const ОКОН_НЕ_БОЛЬШЕ = 6

type Окно = { id: string; x: number; y: number; ш: number; в: number; слой: number }
type Шаг = 'список' | 'источник' | 'браузер'

function хозяин(адрес: string): string {
  try { return new URL(адрес).host.replace(/^www\./, '') } catch { return адрес }
}

export function Hub({ onBack, onHome, вРаме = false }: {
  onBack: () => void
  onHome: () => void
  /** 🔴 ЭКРАН ВНУТРИ ПОСТОЯННОЙ НАВИГАЦИИ (`ui/Рама.tsx`, решение владельца
   *  09–10.09). Тогда знак и «имя · Выйти» рисует рама, и повторять их в
   *  шапке экрана нельзя: два знака на одном экране — это не украшение,
   *  а вопрос «какой из них настоящий» (ПРАВИЛА 4.9: знак один на экран).
   *  Стенд и гость рисуют экран без рамы — там шапка прежняя. */
  вРаме?: boolean
}) {
  const группы = useMemo(() => РАЗДЕЛЫ.map((р) => ({ ...р, источники: источникиРаздела(р.id) })), [])
  const все = useMemo(() => группы.flatMap((г) => г.источники), [группы])

  const [ищу, setИщу] = useState('')
  const [выбран, setВыбран] = useState<Source>(все[0])
  const [шаг, setШаг] = useState<Шаг>('список')
  /* Вкладки браузера справа: какие источники открыты и какой на виду. */
  const [вкладки, setВкладки] = useState<string[]>([])
  const [наВиду, setНаВиду] = useState<string | null>(null)
  const [окна, setОкна] = useState<Окно[]>([])
  const [отказ, setОтказ] = useState('')
  /* Пока окно тащат, рамки чужих сайтов не должны перехватывать мышь. */
  const [тащат, setТащат] = useState(false)
  const экран = useRef<HTMLElement>(null)
  const слой = useRef(1)

  const поId = useCallback((id: string) => все.find((x) => x.id === id), [все])

  const слово = ищу.trim().toLowerCase()
  const видно = (x: Source) => !слово || x.name.toLowerCase().includes(слово) || x.gives.toLowerCase().includes(слово)

  const выбрать = (x: Source) => { setВыбран(x); setОтказ(''); setШаг('источник') }

  const вБраузер = (x: Source) => {
    setОтказ('')
    setВкладки((было) => (было.includes(x.id) ? было : [...было, x.id]))
    setНаВиду(x.id)
    setШаг('браузер')
  }

  const закрытьВкладку = (id: string) => {
    const осталось = вкладки.filter((в) => в !== id)
    setВкладки(осталось)
    if (наВиду === id) setНаВиду(осталось[осталось.length - 1] ?? null)
  }

  const наверх = (id: string) => {
    слой.current += 1
    const верх = слой.current
    setОкна((было) => было.map((о) => (о.id === id ? { ...о, слой: верх } : о)))
  }

  const вОкно = (x: Source) => {
    if (окна.some((о) => о.id === x.id)) { наверх(x.id); return }
    if (окна.length >= ОКОН_НЕ_БОЛЬШЕ) {
      setОтказ('Открыто шесть окон — закройте одно, чтобы открыть ещё.')
      return
    }
    setОтказ('')
    const поле = экран.current?.getBoundingClientRect()
    const ширь = поле?.width ?? 1200
    const высь = поле?.height ?? 800
    /* Окно встаёт над браузером справа, а не над списком и действиями:
       иначе первое же окно закрывает кнопку, которой открывают второе. */
    const ш = Math.min(620, Math.round(ширь * 0.42))
    const в = Math.min(460, Math.round(высь * 0.6))
    const сдвиг = окна.length * 28
    слой.current += 1
    setОкна((было) => [...было, {
      id: x.id,
      x: Math.max(8, Math.min(ширь - ш - 8, Math.round(ширь * 0.54) + сдвиг)),
      y: Math.max(8, Math.min(высь - в - 8, Math.round(высь * 0.14) + сдвиг)),
      ш, в, слой: слой.current,
    }])
  }

  const закрытьОкно = (id: string) => { setОкна((было) => было.filter((о) => о.id !== id)); setОтказ('') }

  /* Таскание и размер: одна и та же механика, разница — что меняется. */
  const тащить = (id: string, что: 'место' | 'размер') => (e: Нажатие<HTMLElement>) => {
    if (e.button !== 0) return
    const окно = окна.find((о) => о.id === id)
    const поле = экран.current?.getBoundingClientRect()
    if (!окно || !поле) return
    e.preventDefault()
    наверх(id)
    setТащат(true)
    const x0 = e.clientX
    const y0 = e.clientY
    const было = окно
    const движение = (д: PointerEvent) => {
      const dx = д.clientX - x0
      const dy = д.clientY - y0
      setОкна((список) => список.map((о) => {
        if (о.id !== id) return о
        if (что === 'место') {
          return {
            ...о,
            x: Math.max(0, Math.min(поле.width - 80, было.x + dx)),
            y: Math.max(0, Math.min(поле.height - 40, было.y + dy)),
          }
        }
        return {
          ...о,
          ш: Math.max(320, Math.min(поле.width - было.x, было.ш + dx)),
          в: Math.max(220, Math.min(поле.height - было.y, было.в + dy)),
        }
      }))
    }
    const конец = () => {
      setТащат(false)
      window.removeEventListener('pointermove', движение)
      window.removeEventListener('pointerup', конец)
      window.removeEventListener('pointercancel', конец)
    }
    window.addEventListener('pointermove', движение)
    window.addEventListener('pointerup', конец)
    window.addEventListener('pointercancel', конец)
  }

  const вОкне = (id: string) => окна.some((о) => о.id === id)
  const право = RIGHTS[выбран.right]
  const раздел = РАЗДЕЛЫ.find((р) => р.id === разделИсточника(выбран.id))?.имя ?? ''
  const текущая = наВиду ? поId(наВиду) : undefined

  return (
    <main className={`${s.screen} ${тащат ? s.тащат : ''}`} ref={экран} data-шаг={шаг}>
      <header className={s.head}>
        {/* ПРАВИЛА 1.4: дорога назад — левый верхний угол, во всех состояниях. */}
        <button type="button" className={s.back} onClick={onBack}>
          ← Назад
        </button>
        {вРаме ? null : <Mark onGo={onHome} />}
        <span className={s.crumb}>Flamingo HUB</span>
      </header>

      <div className={s.cols}>
        {/* ── слева: названия источников по разделам ─────────────────────── */}
        <nav className={s.left} aria-label="Источники по разделам">
          <h1 className={s.title}>Источники мира</h1>
          <input
            className={s.find}
            type="search"
            value={ищу}
            onChange={(e) => setИщу(e.target.value)}
            placeholder="Найти источник…"
            aria-label="Найти источник по названию"
          />
          <div className={s.names}>
            {группы.map((г) => {
              const свои = г.источники.filter(видно)
              if (свои.length === 0) return null
              return (
                <section key={г.id} aria-label={г.имя}>
                  <h2 className={s.group}>
                    <span>{г.имя}</span>
                    <span className={s.groupN}>{свои.length}</span>
                  </h2>
                  {свои.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={`${s.item} ${x.id === выбран.id ? s.itemOn : ''}`}
                      aria-current={x.id === выбран.id ? 'true' : undefined}
                      onClick={() => выбрать(x)}
                    >
                      <span className={s.itemName} title={x.name}>{x.name}</span>
                      <span className={s.itemGives} title={x.gives}>{x.gives}</span>
                      {вОкне(x.id) ? <span className={s.itemMark}>в окне</span>
                        : вкладки.includes(x.id) ? <span className={s.itemMark}>во вкладке</span> : null}
                    </button>
                  ))}
                </section>
              )
            })}
            {все.some(видно) ? null : <p className={s.none}>Ничего не нашлось. Попробуйте другое слово.</p>}
          </div>
        </nav>

        {/* ── в середине: сам источник ───────────────────────────────────── */}
        <section className={s.mid} aria-label={`Источник: ${выбран.name}`}>
          <button type="button" className={s.step} onClick={() => setШаг('список')}>← К списку</button>
          <span className={s.shot}><Cover id={выбран.id} kind={выбран.kind} /></span>
          <h2 className={s.name}>{выбран.name}</h2>
          <p className={s.gives}>{выбран.gives}</p>
          <p className={s.line}><span className={s.label}>Раздел</span>{раздел} · {выбран.kind}</p>
          {/* 🔴 НЕ «ОТВЕЧАЕТ · ПРОВЕРЕНО СЕГОДНЯ», А «ЧТО С ЭТИМ МОЖНО». Про
              доступность мы не знаем ничего (см. `hub/sources.ts`), а про право
              знаем всё: оно записано словами (ПРАВИЛА 8.10). */}
          <p className={s.line}>
            <span className={s.label}>Право</span>
            <span className={`${s.can} ${s[`can_${выбран.right}`]}`}><span className={s.canDot} />{право.tag}</span>
          </p>
          <p className={s.rule}>{право.can}</p>
          <p className={s.rule}>{право.cant}</p>

          <div className={s.acts}>
            <button type="button" className={`${s.act} ${наВиду === выбран.id ? s.actOn : ''}`} onClick={() => вБраузер(выбран)}>
              <span>{вкладки.includes(выбран.id) ? 'Показать в браузере' : 'Открыть в браузере'}</span>
              <span className={s.actNote}>{вкладки.includes(выбран.id) ? 'вкладка открыта' : хозяин(выбран.home)}</span>
            </button>
            <button type="button" className={`${s.act} ${s.actWindow} ${вОкне(выбран.id) ? s.actOn : ''}`} onClick={() => вОкно(выбран)}>
              <span>{вОкне(выбран.id) ? 'Показать окно' : 'Открыть в отдельном окне'}</span>
              <span className={s.actNote}>окон {окна.length} из {ОКОН_НЕ_БОЛЬШЕ}</span>
            </button>
            <a className={s.act} href={выбран.home} target="_blank" rel="noopener noreferrer">
              <span>Открыть в новой вкладке ↗</span>
              <span className={s.actNote}>уйти на сайт источника</span>
            </a>
          </div>
          <p className={s.refuse} role="status">{отказ}</p>

          <p className={s.rule}><span className={s.label}>Если замолчит</span>{IF_SILENT[выбран.kind]}</p>
        </section>

        {/* ── справа: браузер источника ──────────────────────────────────── */}
        <section className={s.right} aria-label="Браузер источника">
          <div className={s.tabs} role="tablist" aria-label="Открытые источники">
            <button type="button" className={s.step} onClick={() => setШаг('источник')}>← К источнику</button>
            {вкладки.map((id) => {
              const x = поId(id)
              if (!x) return null
              return (
                <span key={id} className={`${s.tab} ${id === наВиду ? s.tabOn : ''}`}>
                  <button type="button" role="tab" aria-selected={id === наВиду} className={s.tabName} onClick={() => setНаВиду(id)}>
                    {хозяин(x.home)}
                  </button>
                  <button type="button" className={s.tabClose} onClick={() => закрытьВкладку(id)} aria-label={`Закрыть вкладку: ${x.name}`}>×</button>
                </span>
              )
            })}
          </div>
          {текущая ? (
            <>
              <div className={s.addr}>
                <span className={s.addrUrl} title={текущая.home}>{текущая.home}</span>
                <button type="button" className={`${s.addrAct} ${s.actWindow}`} onClick={() => { вОкно(текущая); закрытьВкладку(текущая.id) }}>
                  в окно
                </button>
              </div>
              {вкладки.map((id) => {
                const x = поId(id)
                if (!x) return null
                return (
                  <div key={id} className={s.view} hidden={id !== наВиду}>
                    <Vitrina url={x.home} name={x.name} кратко />
                  </div>
                )
              })}
            </>
          ) : (
            <p className={s.empty}>
              Выберите источник и нажмите «Открыть в браузере» — он откроется здесь.
            </p>
          )}
        </section>
      </div>

      {/* ── окна: до шести, двигаются и меняют размер ───────────────────── */}
      {окна.map((о) => {
        const x = поId(о.id)
        if (!x) return null
        return (
          <div
            key={о.id}
            className={s.window}
            role="dialog"
            aria-label={`Окно источника: ${x.name}`}
            style={{ left: о.x, top: о.y, width: о.ш, height: о.в, zIndex: о.слой }}
            onPointerDown={() => наверх(о.id)}
          >
            <div className={s.windowBar} onPointerDown={тащить(о.id, 'место')}>
              <span className={s.windowName} title={x.name}>{x.name}</span>
              <button
                type="button"
                className={s.windowClose}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => закрытьОкно(о.id)}
                aria-label={`Закрыть окно: ${x.name}`}
              >×</button>
            </div>
            <div className={s.windowBody}><Vitrina url={x.home} name={x.name} кратко /></div>
            <span className={s.windowGrip} onPointerDown={тащить(о.id, 'размер')} aria-hidden="true" />
          </div>
        )
      })}
    </main>
  )
}
