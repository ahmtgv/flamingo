import { useEffect, useMemo, useRef, useState, type PointerEvent as Нажатие } from 'react'

import type { Person } from '../lib/auth'
import {
  Беда, лента, написать, позвать, прочитано, разговоры, читатьУроки,
  type Разговор, type Реплика, type Урок,
} from '../lib/study'
import { когдаУрок } from '../lib/пояс'
import '../styles/хаб.css'
import х from './Hub.module.css'
import s from './Чаты.module.css'

/** «Сообщения» — переписка своей страницей.
 *
 *  🔴 ТОТ ЖЕ ЭКРАН, ЧТО «ИСТОЧНИКИ МИРА» И АДМИНКА (владелец, 10.11: «чаты
 *  сделать в том же стиле … третьим столбиком открывается чат, и также можно
 *  несколько чатов открывать, как источники»). Поэтому колонки, вкладки и окна
 *  здесь не свои, а из листа «Источников» (`Hub.module.css`): одна вещь не
 *  собрана двумя способами. Своё — только сам разговор: лента и поле ввода.
 *
 *  Слева — люди. В середине — выбранный человек и действия. Справа — разговор;
 *  разговоров открыто сколько нужно вкладками, любой выносится в окно (до
 *  шести), окно двигают за заголовок и тянут за уголок.
 *
 *  Сервер тот же, что у окна разговора в кабинете (`Переписка.tsx`): те же
 *  вызовы, та же лента. На телефоне колонок нет — список и разговор шагами.
 */

const ОКОН_НЕ_БОЛЬШЕ = 6
const ВКЛАДОК_НЕ_БОЛЬШЕ = 6

type Окно = { id: string; x: number; y: number; ш: number; в: number; слой: number }
type Шаг = 'список' | 'источник' | 'браузер'

const миг = (когда: string) => {
  const д = new Date(когда)
  const сегодня = д.toDateString() === new Date().toDateString()
  return д.toLocaleString('ru-RU', сегодня
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const деньУрока = (у: { дата: string; время: string; пояс?: string }) => {
  const к = когдаУрок(у.дата, у.время, у.пояс ?? '')
  return `${к.дата.slice(8, 10)}.${к.дата.slice(5, 7)} · ${к.время}${к.сноска ? ` · ${к.сноска}` : ''}`
}

const последнее = (б: Разговор) => (
  б.последнее
    ? (б.последнее.вид === 'invite' ? 'приглашение на занятие' : б.последнее.текст)
    : 'разговора ещё не было'
)

/** Сам разговор: лента и поле ввода. Живёт и во вкладке, и в окне. */
function Лента({ кто, имя, веду, подложка, onПрочитано }: {
  кто: string
  имя: string
  веду: boolean
  /** Только для стенда: готовая лента вместо запроса к серверу. */
  подложка?: Реплика[]
  onПрочитано: () => void
}) {
  const [письма, setПисьма] = useState<Реплика[] | null>(подложка ?? null)
  const [отказ, setОтказ] = useState('')
  const [текст, setТекст] = useState('')
  const [беда, setБеда] = useState('')
  const [шлём, setШлём] = useState(false)
  const хвост = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (подложка) return
    let живо = true
    лента(кто).then(async (л) => {
      if (!живо) return
      if (!л) { setОтказ('Сервер не отвечает, поэтому переписки не видно. Написанное раньше никуда не делось — оно на сервере.'); return }
      setПисьма(л.письма)
      /* «Прочитано» — только когда письма действительно показаны. */
      if (л.письма.some((п) => !п.мой && !п.прочитано)) {
        await прочитано(кто)
        if (живо) onПрочитано()
      }
    }).catch((e) => { if (живо) setОтказ(e instanceof Беда ? e.message : 'Разговор не открылся.') })
    return () => { живо = false }
  // onПрочитано намеренно вне зависимостей: он меняется на каждом кадре родителя.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [кто, подложка])

  useEffect(() => { хвост.current?.scrollIntoView({ block: 'end' }) }, [письма?.length])

  const отправить = async () => {
    const чисто = текст.trim()
    if (!чисто || шлём) return
    setБеда('')
    setШлём(true)
    try {
      const п = await написать(кто, чисто)
      setПисьма((с) => [...(с ?? []), п])
      setТекст('')
    } catch (e) {
      setБеда(e instanceof Беда ? e.message : 'Сервер не отвечает — сообщение не ушло.')
    } finally {
      setШлём(false)
    }
  }

  return (
    <>
      <div className={s.thread}>
        {отказ ? <p className={s.quietLine}>{отказ}</p>
          : письма === null ? <p className={s.quietLine}>Открываем разговор…</p>
            : письма.length === 0 ? (
              <p className={s.quietLine}>
                {веду
                  ? 'Разговора ещё не было. Напишите первым — например, что повторить к следующему занятию.'
                  : 'Разговора ещё не было. Спросите, если что-то осталось непонятным с урока.'}
              </p>
            ) : письма.map((п) => (
              <div key={п.id} className={`${s.msg} ${п.мой ? s.msgMine : ''}`}>
                <span className={s.msgWhen}>{п.мой ? 'вы' : имя} · {миг(п.когда)}</span>
                {п.вид !== 'invite' ? <span className={s.msgText}>{п.текст}</span>
                  : п.урок ? (
                    <span className={`${s.msgText} ${s.call}`}>
                      <span className={s.callHead}>{п.мой ? 'вы зовёте на занятие' : 'зовёт вас на занятие'}</span>
                      <span className={s.callName}>{п.урок.название}</span>
                      <span className={s.callWhen}>{деньУрока(п.урок)}</span>
                      <a className={s.callDoor} href={`/r/${п.урок.код}`}>Войти в комнату</a>
                    </span>
                  ) : (
                    <span className={`${s.msgText} ${s.call}`}>
                      <span className={s.callHead}>занятие снято</span>
                      <span className={s.callWhen}>Приглашение осталось в разговоре, но занятия больше нет в расписании.</span>
                    </span>
                  )}
              </div>
            ))}
        <div ref={хвост} />
      </div>
      <p className={s.trouble} role="status">{беда}</p>
      <form className={s.write} onSubmit={(e) => { e.preventDefault(); void отправить() }}>
        <input
          className={s.writeField}
          value={текст}
          onChange={(e) => setТекст(e.target.value)}
          placeholder="Написать сообщение…"
          aria-label={`Сообщение: ${имя}`}
        />
        <button type="submit" className={s.send} disabled={!текст.trim() || шлём}>{шлём ? 'Уходит…' : 'Отправить'}</button>
      </form>
    </>
  )
}

export function Чаты({ person, подложка, подложкаЛенты }: {
  person: Person
  /** Только для стенда: готовый список вместо запроса к серверу. */
  подложка?: Разговор[]
  /** Только для стенда: готовая лента для любого разговора. */
  подложкаЛенты?: Реплика[]
}) {
  const учитель = person.role === 'teacher'
  const [беседы, setБеседы] = useState<Разговор[] | null>(подложка ?? null)
  const [беда, setБеда] = useState('')
  const [уроки, setУроки] = useState<Урок[]>([])

  const [ищу, setИщу] = useState('')
  const [выбран, setВыбран] = useState<string | null>(null)
  const [раскрыты, setРаскрыты] = useState<string[]>(['новые', 'люди'])
  const [шаг, setШаг] = useState<Шаг>('список')
  const [вкладки, setВкладки] = useState<string[]>([])
  const [наВиду, setНаВиду] = useState<string | null>(null)
  const [свежесть, setСвежесть] = useState<Record<string, number>>({})
  const [окна, setОкна] = useState<Окно[]>([])
  const [отказ, setОтказ] = useState('')
  const [зову, setЗову] = useState(false)
  const [тащат, setТащат] = useState(false)
  const экран = useRef<HTMLElement>(null)
  const поиск = useRef<HTMLInputElement>(null)
  const слой = useRef(1)

  const обновить = () => {
    if (подложка) return
    разговоры()
      .then((р) => {
        if (р) { setБеседы(р); setБеда('') }
        else setБеда('Переписка живёт на сервере, а он не отвечает. Написанное раньше никуда не делось.')
      })
      .catch((e) => setБеда(e instanceof Беда ? e.message : 'Переписка не открылась. Попробуйте ещё раз через минуту.'))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { обновить() }, [])

  /* Преподавателю — будущие занятия: на них зовут из середины. */
  useEffect(() => {
    if (!учитель || подложка) return
    let жив = true
    const сегодня = new Date().toLocaleDateString('sv')
    читатьУроки()
      .then((все) => { if (жив) setУроки(все.filter((у) => у.дата >= сегодня).sort((a, b) => (a.дата + a.время).localeCompare(b.дата + b.время))) })
      .catch(() => undefined)
    return () => { жив = false }
  }, [учитель, подложка])

  const все = useMemo(() => беседы ?? [], [беседы])
  const поId = (id: string | null) => все.find((б) => б.кто === id)

  const слово = ищу.trim().toLowerCase()
  const видно = (б: Разговор) => !слово || б.имя.toLowerCase().includes(слово)

  /* «Непрочитанные» — первой группой и по общим правилам, как «Избранное» в
     источниках: люди в ней — дубли, из общего списка они не уходят. */
  const группы = [
    { id: 'новые', имя: 'Непрочитанные', люди: все.filter((б) => б.непрочитано > 0) },
    { id: 'люди', имя: учитель ? 'Ученики' : 'Преподаватели', люди: все },
  ]

  const раскрыть = (id: string) => setРаскрыты((было) => (было.includes(id) ? было.filter((р) => р !== id) : [...было, id]))
  const вОкне = (id: string) => окна.some((о) => о.id === id)
  const воВкладке = (id: string) => вкладки.includes(id)

  const воВкладку = (id: string) => {
    setВкладки((было) => (было.includes(id) ? было : [...было, id].slice(-ВКЛАДОК_НЕ_БОЛЬШЕ)))
    setНаВиду(id)
  }

  /* Выбрал человека — разговор уже открыт, как источник в «Источниках». На
     телефоне сразу показываем сам разговор: ради него сюда и пришли. */
  const выбрать = (id: string) => {
    setВыбран(id)
    setОтказ('')
    setЗову(false)
    if (!вОкне(id)) воВкладку(id)
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

  const вОкно = (id: string): boolean => {
    if (вОкне(id)) { наверх(id); return true }
    if (окна.length >= ОКОН_НЕ_БОЛЬШЕ) {
      setОтказ('Открыто шесть окон — закройте одно, чтобы открыть ещё.')
      return false
    }
    setОтказ('')
    const поле = экран.current?.getBoundingClientRect()
    const ширь = поле?.width ?? 1200
    const высь = поле?.height ?? 800
    const ш = Math.min(400, Math.round(ширь * 0.34))
    const в = Math.min(480, Math.round(высь * 0.62))
    const сдвиг = окна.length * 34
    слой.current += 1
    setОкна((было) => [...было, {
      id,
      x: Math.max(8, Math.min(ширь - ш - 8, Math.round(ширь * 0.6) + сдвиг)),
      y: Math.max(8, Math.min(высь - в - 8, Math.round(высь * 0.1) + сдвиг)),
      ш, в, слой: слой.current,
    }])
    return true
  }

  const закрытьОкно = (id: string) => { setОкна((было) => было.filter((о) => о.id !== id)); setОтказ('') }

  /* Таскание и размер — та же механика, что у окон источников. */
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
          ш: Math.max(280, Math.min(поле.width - было.x, было.ш + dx)),
          в: Math.max(240, Math.min(поле.height - было.y, было.в + dy)),
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

  /* Позвать на занятие: приглашение ложится в разговор, лента перечитывается. */
  const звать = (кто: string, урок: Урок) => {
    setОтказ('')
    позвать(кто, урок.id)
      .then(() => {
        setЗову(false)
        setСвежесть((б) => ({ ...б, [кто]: (б[кто] ?? 0) + 1 }))
        обновить()
      })
      .catch((e) => setОтказ(e instanceof Беда ? e.message : 'Сервер не отвечает — позвать не вышло.'))
  }

  const человек = поId(выбран)
  const текущий = поId(наВиду)
  const роль = (б: Разговор) => (б.роль === 'teacher' ? 'преподаватель' : 'ученик')

  return (
    <main className={`${х.screen} ${тащат ? х.тащат : ''}`} ref={экран} data-шаг={шаг}>
      <div className={х.cols}>
        {/* ── слева: люди ────────────────────────────────────────────────── */}
        <nav className={х.left} aria-label="С кем вы в переписке">
          <h1 className={х.hidden}>Сообщения</h1>
          <input
            ref={поиск}
            className={х.find}
            type="search"
            value={ищу}
            onChange={(e) => setИщу(e.target.value)}
            placeholder="Найти человека…"
            aria-label="Найти человека по имени"
          />
          <div className={х.names}>
            {беда ? (
              <p className={х.none}>
                {беда}{' '}
                <button type="button" className={s.again} onClick={обновить}>Попробовать ещё раз</button>
              </p>
            ) : беседы === null ? <p className={х.none}>Смотрим, с кем вы в переписке…</p>
              : все.length === 0 ? (
                <p className={х.none}>
                  {учитель
                    ? 'Переписки пока нет. Ученик появится здесь, как только вы позовёте его к себе — приглашением из журнала.'
                    : 'Переписки пока нет. Преподаватель появится здесь, как только вы примете его приглашение.'}
                </p>
              ) : группы.map((г) => {
                const свои = г.люди.filter(видно)
                if (слово && свои.length === 0) return null
                const открыта = Boolean(слово) || раскрыты.includes(г.id)
                return (
                  <section key={г.id} aria-label={г.имя} className={г.id === 'новые' ? х.mine : undefined}>
                    <button type="button" className={х.group} aria-expanded={открыта} onClick={() => раскрыть(г.id)}>
                      <span>{г.имя}</span>
                      <span>{свои.length}</span>
                    </button>
                    {открыта ? свои.map((б) => {
                      const метка = б.непрочитано > 0 ? `новых: ${б.непрочитано}`
                        : вОкне(б.кто) ? 'в окне' : воВкладке(б.кто) ? 'открыт' : ''
                      return (
                        <button
                          key={б.кто}
                          type="button"
                          className={`${х.item} ${б.кто === выбран ? х.itemOn : ''} ${метка ? х.itemOpen : ''} ${б.непрочитано > 0 ? s.fresh : ''}`}
                          aria-current={б.кто === выбран ? 'true' : undefined}
                          onClick={() => выбрать(б.кто)}
                        >
                          <span className={х.itemName} title={б.имя}>{б.имя}</span>
                          <span className={х.itemGives} title={последнее(б)}>{последнее(б)}</span>
                          {метка ? <span className={х.itemMark}>{метка}</span> : null}
                        </button>
                      )
                    }) : null}
                    {открыта && г.id === 'новые' && свои.length === 0
                      ? <p className={х.none}>Всё прочитано.</p> : null}
                  </section>
                )
              })}
            {слово && все.length > 0 && !все.some(видно) ? <p className={х.none}>Никого не нашлось. Попробуйте другое имя.</p> : null}
          </div>
        </nav>

        {/* ── в середине: человек и действия ─────────────────────────────── */}
        <section className={х.mid} aria-label={человек ? `Собеседник: ${человек.имя}` : 'Собеседник'}>
          <button type="button" className={х.step} onClick={() => setШаг('браузер')}>← К разговору</button>
          {человек ? (
            <>
              <h2 className={х.name}>{человек.имя}</h2>
              <p className={х.box}>{последнее(человек)}</p>
              <p className={х.row}>
                <span className={х.label}>Кто</span>{роль(человек)}
                {человек.с ? <><span className={х.label}>На связи с</span>{человек.с.slice(0, 10).split('-').reverse().join('.')}</> : null}
              </p>
              <p className={х.row}>
                <span className={х.label}>Непрочитано</span>{человек.непрочитано > 0 ? человек.непрочитано : 'нет'}
              </p>

              <button
                type="button"
                className={`${х.act} ${х.onlyWide} ${вОкне(человек.кто) ? х.actOn : ''}`}
                onClick={() => { if (вОкно(человек.кто)) закрытьВкладку(человек.кто) }}
              >
                <span>{вОкне(человек.кто) ? 'Открыт в отдельном окне' : 'Открыть в отдельном окне'}</span>
                <span className={х.actNote}>открыто {окна.length} из {ОКОН_НЕ_БОЛЬШЕ}</span>
              </button>
              {учитель ? (
                <button type="button" className={`${х.act} ${зову ? х.actOn : ''}`} aria-expanded={зову} onClick={() => setЗову((было) => !было)}>
                  <span>Позвать на занятие</span>
                  <span className={х.actNote}>{зову ? 'свернуть' : 'выбрать урок'}</span>
                </button>
              ) : null}
              {зову ? (
                уроки.length ? уроки.map((у) => (
                  <button key={у.id} type="button" className={`${х.act} ${s.lesson}`} onClick={() => звать(человек.кто, у)}>
                    <span>{у.название}</span>
                    <span className={х.actNote}>{деньУрока(у)}</span>
                  </button>
                )) : (
                  <p className={х.silent}>
                    Будущих занятий нет. <a className={х.link} href="/создать-урок">Создать урок</a> — и вернитесь сюда.
                  </p>
                )
              ) : null}
              <p className={х.refuse} role="status">{отказ}</p>

              <p className={х.silent}>
                <span className={х.silentLabel}>Где хранится:</span> переписка лежит на сервере, а не в этом
                браузере — она откроется с любого устройства.
              </p>
            </>
          ) : (
            <p className={х.silent}>Выберите человека слева — здесь будут сведения о нём и действия.</p>
          )}
        </section>

        {/* ── справа: разговор ───────────────────────────────────────────── */}
        <section className={х.right} aria-label="Разговор">
          <div className={х.tabs} role="tablist" aria-label="Открытые разговоры">
            <button type="button" className={х.step} onClick={() => setШаг('список')}>← К списку</button>
            {вкладки.map((id) => {
              const б = поId(id)
              if (!б) return null
              return (
                <span key={id} className={`${х.tab} ${id === наВиду ? х.tabOn : ''}`}>
                  <button type="button" role="tab" aria-selected={id === наВиду} className={х.tabName} onClick={() => { setНаВиду(id); setВыбран(id) }}>
                    {б.имя}
                  </button>
                  <button type="button" className={х.tabClose} onClick={() => закрытьВкладку(id)} aria-label={`Закрыть разговор: ${б.имя}`}>×</button>
                </span>
              )
            })}
            {вкладки.length === 0 ? <span className={`${х.tab} ${х.tabOn} ${х.tabNone}`}>Нет открытых разговоров</span> : null}
            <button type="button" className={х.tabPlus} onClick={() => { setШаг('список'); поиск.current?.focus() }} aria-label="Открыть ещё разговор">+</button>
          </div>
          {текущий ? (
            <>
              <div className={х.addr}>
                <button
                  type="button"
                  className={`${х.addrAct} ${х.reload}`}
                  aria-label="Обновить разговор"
                  title="Обновить разговор"
                  onClick={() => { setСвежесть((б) => ({ ...б, [текущий.кто]: (б[текущий.кто] ?? 0) + 1 })); обновить() }}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.75M13.4 2.6v2.9h-2.9" /></svg>
                </button>
                <span className={х.addrUrl} title={текущий.имя}>{текущий.имя} · {роль(текущий)}</span>
                <button type="button" className={`${х.addrAct} ${s.narrowAct}`} onClick={() => { setВыбран(текущий.кто); setШаг('источник') }}>
                  Действия
                </button>
                <button type="button" className={`${х.addrAct} ${х.onlyWide}`} onClick={() => { if (вОкно(текущий.кто)) закрытьВкладку(текущий.кто) }}>
                  ⧉ в окно
                </button>
              </div>
              {вкладки.map((id) => {
                const б = поId(id)
                if (!б) return null
                return (
                  <div key={id} className={х.view} hidden={id !== наВиду}>
                    <Лента key={свежесть[id] ?? 0} кто={б.кто} имя={б.имя} веду={учитель} подложка={подложкаЛенты} onПрочитано={обновить} />
                  </div>
                )
              })}
            </>
          ) : (
            <p className={х.empty}>Выберите человека слева — разговор откроется здесь.</p>
          )}
        </section>
      </div>

      {окна.length > 0 ? <p className={х.count}>Открыто окон: {окна.length} из {ОКОН_НЕ_БОЛЬШЕ}</p> : null}

      {/* ── окна: до шести, двигаются и меняют размер ───────────────────── */}
      {окна.map((о) => {
        const б = поId(о.id)
        if (!б) return null
        return (
          <div
            key={о.id}
            className={х.window}
            role="dialog"
            aria-label={`Окно разговора: ${б.имя}`}
            style={{ left: о.x, top: о.y, width: о.ш, height: о.в, zIndex: о.слой }}
            onPointerDown={() => наверх(о.id)}
          >
            <div className={х.windowBar} onPointerDown={тащить(о.id, 'место')}>
              <span className={х.dots} aria-hidden="true"><i /><i /><i /></span>
              <span className={х.windowName} title={б.имя}>{б.имя}</span>
              <button
                type="button"
                className={х.windowClose}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => закрытьОкно(о.id)}
                aria-label={`Закрыть окно: ${б.имя}`}
              >×</button>
            </div>
            <div className={х.windowBody}>
              <Лента key={свежесть[о.id] ?? 0} кто={б.кто} имя={б.имя} веду={учитель} подложка={подложкаЛенты} onПрочитано={обновить} />
            </div>
            <span className={х.windowGrip} onPointerDown={тащить(о.id, 'размер')} aria-hidden="true" />
          </div>
        )
      })}
    </main>
  )
}
