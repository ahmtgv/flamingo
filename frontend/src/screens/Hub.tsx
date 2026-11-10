import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as Нажатие } from 'react'

import { IF_SILENT, RIGHTS, РАЗДЕЛЫ, источникиРаздела, разделИсточника, type Source } from '../hub/sources'
import { записать, прочесть } from '../hub/избранное'
import '../styles/хаб.css'
import s from './Hub.module.css'

/** Flamingo HUB — «Источники мира».
 *
 *  🔴 ЭКРАН ПОСТРОЕН ПО ЭСКИЗАМ, УТВЕРЖДЁННЫМ ВЛАДЕЛЬЦЕМ 10.11.2026, «ОДИН В
 *  ОДИН». Первая постройка взяла детали кабинета вместо эскиза и вышла другим
 *  экраном — владелец вернул её. Эскиз здесь — задание: цвета, кегли и
 *  плотность лежат в `styles/хаб.css` и взяты с него как есть.
 *
 *  Слева — названия источников по разделам-предметам. В середине — выбранный
 *  источник: что даёт, что с ним можно, и действия. Справа — браузер источника
 *  со вкладками. Источник можно вынести в отдельное окно: двигать за заголовок,
 *  менять размер за уголок, закрыть; окон не больше шести.
 *
 *  🔴 ВМЕСТО СТРЕЛОК «НАЗАД / ВПЕРЁД» — МЕНЮ ДЕЙСТВИЙ (владелец, 10.11). Чужим
 *  сайтом внутри рамки управлять нельзя, и стрелки были бы нарисованы зря.
 *
 *  🔴 ЧУЖОЙ САЙТ ПОКАЗЫВАЕТСЯ В РАМКЕ, И ОН ВПРАВЕ ОТКАЗАТЬ. Снаружи этого не
 *  видно: браузер не говорит, что рамка пуста. Поэтому под рамкой заранее
 *  сказано, что делать, если пусто, — и дана ссылка «в новой вкладке».
 *
 *  На телефоне колонки не помещаются — там три шага: список, источник, браузер;
 *  окон на телефоне нет.
 */

const ОКОН_НЕ_БОЛЬШЕ = 6

type Окно = { id: string; x: number; y: number; ш: number; в: number; слой: number }
type Шаг = 'список' | 'источник' | 'браузер'

function хозяин(адрес: string): string {
  try { return new URL(адрес).host.replace(/^www\./, '') } catch { return адрес }
}

/** Чужая страница в рамке. Права рамки — те же, что у витрины урока. */
function Рамка({ x, раз }: { x: Source; раз: number }) {
  return (
    <>
      <iframe
        key={раз}
        className={s.frame}
        src={x.home}
        title={x.name}
        allow="autoplay; fullscreen; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
      />
      <p className={s.blank}>
        Пусто? Значит сайт запрещает показ внутри рамки — это его право.{' '}
        <a href={x.home} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке ↗</a>
      </p>
    </>
  )
}

export function Hub({ учитель = false }: {
  /** Прежние двери экрана. Свою полосу «← Назад» экран больше не рисует — на
   *  эскизе её нет: дорогу назад даёт верхняя строка сайта или рама кабинета. */
  onBack?: () => void
  onHome?: () => void
  вРаме?: boolean
  /** Учителю доступно «Показать на уроке» (владелец, 10.11). */
  учитель?: boolean
}) {
  const [любимые, setЛюбимые] = useState<string[]>(() => прочесть('избранное'))
  const [кУроку, setКУроку] = useState<string[]>(() => прочесть('к-уроку'))

  const разделы = useMemo(() => РАЗДЕЛЫ.map((р) => ({ id: р.id as string, имя: р.имя, источники: источникиРаздела(р.id) })), [])
  const все = useMemo(() => разделы.flatMap((г) => г.источники), [разделы])
  const поId = useCallback((id: string) => все.find((x) => x.id === id), [все])

  const [ищу, setИщу] = useState('')
  const [выбран, setВыбран] = useState<Source>(все[0])
  const [раскрыты, setРаскрыты] = useState<string[]>(() => [разделИсточника(все[0].id)])
  const [шаг, setШаг] = useState<Шаг>('список')
  const [вкладки, setВкладки] = useState<string[]>([])
  const [наВиду, setНаВиду] = useState<string | null>(null)
  const [свежесть, setСвежесть] = useState<Record<string, number>>({})
  const [окна, setОкна] = useState<Окно[]>([])
  const [отказ, setОтказ] = useState('')
  /* Пока окно тащат, рамки чужих сайтов не должны перехватывать мышь. */
  const [тащат, setТащат] = useState(false)
  const экран = useRef<HTMLElement>(null)
  const поиск = useRef<HTMLInputElement>(null)
  const слой = useRef(1)

  useEffect(() => { записать('избранное', любимые) }, [любимые])
  useEffect(() => { записать('к-уроку', кУроку) }, [кУроку])

  const слово = ищу.trim().toLowerCase()
  const видно = (x: Source) => !слово || x.name.toLowerCase().includes(слово) || x.gives.toLowerCase().includes(слово)

  /* Избранное — первой группой, когда в нём что-то есть. */
  const группы = useMemo(() => {
    const свои = любимые.map(поId).filter((x): x is Source => Boolean(x))
    return свои.length ? [{ id: 'избранное', имя: 'Избранное', источники: свои }, ...разделы] : разделы
  }, [любимые, поId, разделы])

  const выбрать = (x: Source) => { setВыбран(x); setОтказ(''); setШаг('источник') }
  const раскрыть = (id: string) => setРаскрыты((было) => (было.includes(id) ? было.filter((р) => р !== id) : [...было, id]))
  const вкл = (список: string[], id: string) => (список.includes(id) ? список.filter((x) => x !== id) : [...список, id])

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

  const вОкно = (x: Source): boolean => {
    if (окна.some((о) => о.id === x.id)) { наверх(x.id); return true }
    if (окна.length >= ОКОН_НЕ_БОЛЬШЕ) {
      setОтказ('Открыто шесть окон — закройте одно, чтобы открыть ещё.')
      return false
    }
    setОтказ('')
    const поле = экран.current?.getBoundingClientRect()
    const ширь = поле?.width ?? 1200
    const высь = поле?.height ?? 800
    const ш = Math.min(560, Math.round(ширь * 0.42))
    const в = Math.min(430, Math.round(высь * 0.55))
    const сдвиг = окна.length * 34
    слой.current += 1
    setОкна((было) => [...было, {
      id: x.id,
      /* Окно встаёт над браузером справа, а не над списком и действиями:
         иначе первое же окно закрывает кнопку, которой открывают второе. */
      x: Math.max(8, Math.min(ширь - ш - 8, Math.round(ширь * 0.53) + сдвиг)),
      y: Math.max(8, Math.min(высь - в - 8, Math.round(высь * 0.1) + сдвиг)),
      ш, в, слой: слой.current,
    }])
    return true
  }

  const закрытьОкно = (id: string) => { setОкна((было) => было.filter((о) => о.id !== id)); setОтказ('') }

  /* Таскание и размер: одна и та же механика, разница — что меняется. */
  const тащить = (id: string, что: 'место' | 'размер') => (e: Нажатие<HTMLElement>) => {
    if (e.button !== 0) return
    const было = окна.find((о) => о.id === id)
    const поле = экран.current?.getBoundingClientRect()
    if (!было || !поле) return
    e.preventDefault()
    наверх(id)
    setТащат(true)
    const x0 = e.clientX
    const y0 = e.clientY
    const движение = (д: PointerEvent) => {
      const dx = д.clientX - x0
      const dy = д.clientY - y0
      setОкна((список) => список.map((о) => {
        if (о.id !== id) return о
        if (что === 'место') {
          return {
            ...о,
            x: Math.max(0, Math.min(поле.width - 120, было.x + dx)),
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
  const воВкладке = (id: string) => вкладки.includes(id)
  const право = RIGHTS[выбран.right]
  const раздел = РАЗДЕЛЫ.find((р) => р.id === разделИсточника(выбран.id))?.имя ?? ''
  const текущая = наВиду ? поId(наВиду) : undefined
  const любим = любимые.includes(выбран.id)
  const отложен = кУроку.includes(выбран.id)

  return (
    <main className={`${s.screen} ${тащат ? s.тащат : ''}`} ref={экран} data-шаг={шаг}>
      <div className={s.cols}>
        {/* ── слева: названия источников по разделам ─────────────────────── */}
        <nav className={s.left} aria-label="Источники по разделам">
          <h1 className={s.hidden}>Источники мира</h1>
          <input
            ref={поиск}
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
              const открыта = Boolean(слово) || раскрыты.includes(г.id) || г.id === 'избранное'
              return (
                <section key={г.id} aria-label={г.имя}>
                  <button type="button" className={s.group} aria-expanded={открыта} onClick={() => раскрыть(г.id)}>
                    <span>{г.имя}</span>
                    <span>{свои.length}</span>
                  </button>
                  {открыта ? свои.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={`${s.item} ${x.id === выбран.id ? s.itemOn : ''} ${воВкладке(x.id) || вОкне(x.id) ? s.itemOpen : ''}`}
                      aria-current={x.id === выбран.id ? 'true' : undefined}
                      onClick={() => выбрать(x)}
                    >
                      <span className={s.itemName} title={x.name}>{x.name}</span>
                      <span className={s.itemGives} title={x.gives}>{x.gives}</span>
                      {вОкне(x.id) ? <span className={s.itemMark}>в окне</span>
                        : воВкладке(x.id) ? <span className={s.itemMark}>открыт</span> : null}
                    </button>
                  )) : null}
                </section>
              )
            })}
            {все.some(видно) ? null : <p className={s.none}>Ничего не нашлось. Попробуйте другое слово.</p>}
          </div>
        </nav>

        {/* ── в середине: сам источник ───────────────────────────────────── */}
        <section className={s.mid} aria-label={`Источник: ${выбран.name}`}>
          <button type="button" className={s.step} onClick={() => setШаг('список')}>← К списку</button>
          <h2 className={s.name}>{выбран.name}</h2>
          <p className={s.box}>{выбран.gives}</p>
          <p className={s.row}><span className={s.label}>Раздел</span>{раздел} · {выбран.kind}</p>
          {/* 🔴 НЕ «ОТВЕЧАЕТ · ПРОВЕРЕНО СЕГОДНЯ», А «ЧТО С ЭТИМ МОЖНО». Про
              доступность мы не знаем ничего (см. `hub/sources.ts`), а про право
              знаем всё: оно записано словами (ПРАВИЛА 8.10). */}
          <p className={s.row}>
            <span className={s.label}>Право</span>
            <span className={`${s.can} ${s[`can_${выбран.right}`]}`}>{право.tag}</span>
          </p>
          <p className={s.say}>{право.can}. {право.cant.charAt(0).toUpperCase() + право.cant.slice(1)}.</p>

          <button type="button" className={`${s.act} ${воВкладке(выбран.id) ? s.actOn : ''}`} onClick={() => вБраузер(выбран)}>
            <span>{воВкладке(выбран.id) ? 'Открыт в браузере' : 'Открыть в браузере'}<span className={s.onlyWide}> справа</span></span>
            <span className={s.actNote}>{воВкладке(выбран.id) ? `вкладка ${вкладки.indexOf(выбран.id) + 1}` : хозяин(выбран.home)}</span>
          </button>
          <button type="button" className={`${s.act} ${s.onlyWide} ${вОкне(выбран.id) ? s.actOn : ''}`} onClick={() => вОкно(выбран)}>
            <span>{вОкне(выбран.id) ? 'Открыт в отдельном окне' : 'Открыть в отдельном окне'}</span>
            <span className={s.actNote}>открыто {окна.length} из {ОКОН_НЕ_БОЛЬШЕ}</span>
          </button>
          {учитель ? (
            <button type="button" className={`${s.act} ${отложен ? s.actOn : ''}`} aria-pressed={отложен} onClick={() => setКУроку((было) => вкл(было, выбран.id))}>
              <span>{отложен ? 'Отложен к уроку' : 'Показать на уроке'}</span>
              <span className={s.actNote}>{отложен ? 'первым в списке комнаты' : 'отложить к уроку'}</span>
            </button>
          ) : null}
          <button type="button" className={`${s.act} ${любим ? s.actOn : ''}`} aria-pressed={любим} onClick={() => setЛюбимые((было) => вкл(было, выбран.id))}>
            <span>{любим ? 'В избранном' : 'Добавить в избранное'}</span>
            <span className={s.actNote}>{любим ? 'убрать' : 'в этом браузере'}</span>
          </button>
          <p className={s.refuse} role="status">{отказ}</p>

          <p className={s.silent}><span className={s.silentLabel}>Если источник замолчит:</span> {IF_SILENT[выбран.kind]}</p>

          <div className={s.ask}>
            <button type="button" className={s.askField} onClick={() => { setШаг('список'); поиск.current?.focus() }}>
              Найти в источниках…
            </button>
            <div className={s.askRow}>
              <span className={s.chip}>{раздел}</span>
              <button type="button" className={s.askAll} onClick={() => { setИщу(''); setРаскрыты(разделы.map((р) => р.id)); setШаг('список') }}>
                все разделы ⌄
              </button>
            </div>
          </div>
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
            {вкладки.length === 0 ? <span className={`${s.tab} ${s.tabOn} ${s.tabNone}`}>Нет открытых вкладок</span> : null}
            <button type="button" className={s.tabPlus} onClick={() => { setШаг('список'); поиск.current?.focus() }} aria-label="Открыть ещё источник">+</button>
          </div>
          {текущая ? (
            <>
              <div className={s.addr}>
                {/* Меню вместо стрелок «назад / вперёд» (владелец, 10.11). */}
                <button type="button" className={s.addrAct} onClick={() => setСвежесть((б) => ({ ...б, [текущая.id]: (б[текущая.id] ?? 0) + 1 }))}>Обновить</button>
                <button type="button" className={s.addrAct} aria-pressed={любимые.includes(текущая.id)} onClick={() => setЛюбимые((было) => вкл(было, текущая.id))}>
                  {любимые.includes(текущая.id) ? 'В избранном' : 'В избранное'}
                </button>
                {учитель ? (
                  <button type="button" className={s.addrAct} aria-pressed={кУроку.includes(текущая.id)} onClick={() => setКУроку((было) => вкл(было, текущая.id))}>
                    {кУроку.includes(текущая.id) ? 'Отложен к уроку' : 'На урок'}
                  </button>
                ) : null}
                <span className={s.addrUrl} title={текущая.home}>{текущая.home}</span>
                <button type="button" className={`${s.addrAct} ${s.onlyWide}`} onClick={() => { if (вОкно(текущая)) закрытьВкладку(текущая.id) }}>
                  ⧉ в окно
                </button>
              </div>
              {вкладки.map((id) => {
                const x = поId(id)
                if (!x) return null
                return (
                  <div key={id} className={s.view} hidden={id !== наВиду}>
                    <Рамка x={x} раз={свежесть[id] ?? 0} />
                  </div>
                )
              })}
            </>
          ) : (
            <p className={s.empty}>Выберите источник и нажмите «Открыть в браузере» — он откроется здесь.</p>
          )}
        </section>
      </div>

      {окна.length > 0 ? <p className={s.count}>Открыто окон: {окна.length} из {ОКОН_НЕ_БОЛЬШЕ}</p> : null}

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
              <span className={s.dots} aria-hidden="true"><i /><i /><i /></span>
              <span className={s.windowName} title={x.name}>{x.name}</span>
              <button
                type="button"
                className={s.windowClose}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => закрытьОкно(о.id)}
                aria-label={`Закрыть окно: ${x.name}`}
              >×</button>
            </div>
            <div className={s.windowBody}><Рамка x={x} раз={0} /></div>
            <span className={s.windowGrip} onPointerDown={тащить(о.id, 'размер')} aria-hidden="true" />
          </div>
        )
      })}
    </main>
  )
}
