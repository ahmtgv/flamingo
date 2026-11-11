import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as Нажатие } from 'react'

import { IF_SILENT, RIGHTS, РАЗДЕЛЫ, источникиРаздела, разделИсточника, type Source } from '../hub/sources'
import { записать, наСервер, прочесть, сСервера } from '../hub/избранное'
import { ПОСРЕДНИК, безРамки } from '../hub/посредник'
import { КнопкиОкна, местоОкна, type ВидОкна } from '../hub/КнопкиОкна'
import { useПоверх } from '../lib/окно'
import { Беда, положитьСсылку, читатьУроки, type Урок } from '../lib/study'
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
/** Вкладок браузера тоже не больше шести: каждая — живой чужой сайт. */
const ВКЛАДОК_НЕ_БОЛЬШЕ = 6

type Окно = { id: string; x: number; y: number; ш: number; в: number; слой: number; вид?: ВидОкна }
type Шаг = 'список' | 'источник' | 'браузер'

function хозяин(адрес: string): string {
  try { return new URL(адрес).host.replace(/^www\./, '') } catch { return адрес }
}

function ЧерезПосредник({ x, раз }: { x: Source; раз: number }) {
  const рамка = useRef<HTMLIFrameElement>(null)
  const [адрес, setАдрес] = useState(x.home)

  /* Страница посредника сообщает, что сейчас открыто, — отсюда верная ссылка
     «в новой вкладке» после того, как человек ушёл по сайту вглубь. */
  useEffect(() => {
    const слушать = (с: MessageEvent) => {
      if (с.origin !== ПОСРЕДНИК || с.source !== рамка.current?.contentWindow) return
      const д = с.data as { flamingoHub?: boolean; адрес?: unknown } | null
      if (д?.flamingoHub && typeof д.адрес === 'string' && /^https?:\/\//.test(д.адрес)) setАдрес(д.адрес)
    }
    window.addEventListener('message', слушать)
    return () => window.removeEventListener('message', слушать)
  }, [])

  const сказать = (что: 'назад' | 'обновить') => рамка.current?.contentWindow?.postMessage({ flamingoHub: true, что }, ПОСРЕДНИК)

  /* «Обновить» в строке адреса перечитывает открытую страницу, а не возвращает к началу. */
  const первый = useRef(true)
  useEffect(() => {
    if (первый.current) { первый.current = false; return }
    сказать('обновить')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [раз])

  return (
    <>
      <iframe
        ref={рамка}
        className={s.frame}
        src={`${ПОСРЕДНИК}/#${encodeURIComponent(x.id)}`}
        title={x.name}
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
      />
      <p className={s.blank}>
        Открыто через Flamingo{хозяин(адрес) ? ` · ${хозяин(адрес)}` : ''}.{' '}
        <button type="button" className={s.ownAgain} onClick={() => сказать('назад')}>← Назад</button>{' '}
        <a href={адрес} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке ↗</a>
      </p>
    </>
  )
}

/** Чужая страница в рамке. Права рамки — те же, что у витрины урока.
 *
 *  🔴 ИСТОЧНИК, ЗАПРЕТИВШИЙ РАМКУ, ОТКРЫВАЕТСЯ ЧЕРЕЗ ПОСРЕДНИК (владелец, 11.11):
 *  настоящим сайтом, в этой же колонке (`hub/посредник.ts`, `hub-proxy/`). */
function Рамка({ x, раз, свой = false }: {
  x: Source
  раз: number
  /** Открыть через посредник: сайт запрещает рамку или человек так выбрал. */
  свой?: boolean
}) {
  if (свой) return <ЧерезПосредник x={x} раз={раз} />
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

/** «Показать на уроке»: учитель выбирает готовый урок, и источник ложится в
 *  него ссылкой-пособием (владелец, 10.11). В комнате урока он будет среди
 *  пособий этого урока — как любая приложенная ссылка. */
function НаУрок({ источник, закрыть }: { источник: Source; закрыть: () => void }) {
  const [уроки, setУроки] = useState<Урок[] | null>(null)
  const [беда, setБеда] = useState('')
  const [кладу, setКладу] = useState<string | null>(null)
  const [готово, setГотово] = useState<string[]>([])
  const поверх = useПоверх<HTMLDivElement>(закрыть)

  useEffect(() => {
    let жив = true
    читатьУроки()
      .then((все) => {
        if (!жив) return
        const сегодня = new Date().toLocaleDateString('sv')
        setУроки(все.filter((у) => у.дата >= сегодня).sort((a, b) => (a.дата + a.время).localeCompare(b.дата + b.время)))
      })
      .catch((e) => { if (жив) { setУроки([]); setБеда(e instanceof Беда ? e.message : 'Не удалось прочитать уроки.') } })
    return () => { жив = false }
  }, [])

  const уже = (у: Урок) => готово.includes(у.id) || у.материалы.some((м) => м.вид === 'link' && м.адрес === источник.home)

  const приложить = (у: Урок) => {
    setБеда('')
    setКладу(у.id)
    положитьСсылку(у.id, источник.home, источник.name)
      .then(() => setГотово((было) => [...было, у.id]))
      .catch((e) => setБеда(e instanceof Беда ? e.message : 'Не получилось приложить источник к уроку.'))
      .finally(() => setКладу(null))
  }

  return (
    <div className={s.scrim} onPointerDown={закрыть}>
      <div
        ref={поверх}
        tabIndex={-1}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`Показать на уроке: ${источник.name}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className={s.modalBar}>
          <span className={s.windowName} title={источник.name}>Показать на уроке</span>
          <button type="button" className={s.windowClose} onClick={закрыть} aria-label="Закрыть">×</button>
        </div>
        <div className={s.modalBody}>
          <p className={s.box}>{источник.name}</p>
          <p className={s.row}><span className={s.label}>К какому уроку приложить</span></p>
          {уроки === null ? <p className={s.silent}>Читаю ваши уроки…</p> : null}
          {уроки && уроки.length === 0 && !беда ? (
            <p className={s.silent}>
              Будущих уроков пока нет. <a className={s.link} href="/создать-урок">Создать урок</a> — и вернитесь сюда.
            </p>
          ) : null}
          {уроки?.map((у) => (
            <button
              key={у.id}
              type="button"
              className={`${s.act} ${уже(у) ? s.actOn : ''}`}
              disabled={кладу !== null || уже(у)}
              onClick={() => приложить(у)}
            >
              <span>{у.название}</span>
              <span className={s.actNote}>{уже(у) ? 'приложен' : кладу === у.id ? 'прикладываю…' : `${у.дата.split('-').reverse().join('.')} · ${у.время.slice(0, 5)}`}</span>
            </button>
          ))}
          <p className={s.refuse} role="status">{беда}</p>
        </div>
      </div>
    </div>
  )
}

export function Hub({ учитель = false, вошёл = false }: {
  /** Прежние двери экрана. Свою полосу «← Назад» экран больше не рисует — на
   *  эскизе её нет: дорогу назад даёт верхняя строка сайта или рама кабинета. */
  onBack?: () => void
  onHome?: () => void
  вРаме?: boolean
  /** Учителю доступно «Показать на уроке» (владелец, 10.11). */
  учитель?: boolean
  /** Вошедшему избранное хранит сервер — оно одно на все устройства. */
  вошёл?: boolean
}) {
  const [любимые, setЛюбимые] = useState<string[]>(() => прочесть())
  /* Источник, который учитель прикладывает к уроку: открыта модалка выбора. */
  const [наУрок, setНаУрок] = useState<Source | null>(null)

  const разделы = useMemo(() => РАЗДЕЛЫ.map((р) => ({ id: р.id as string, имя: р.имя, источники: источникиРаздела(р.id) })), [])
  const все = useMemo(() => разделы.flatMap((г) => г.источники), [разделы])
  const поId = useCallback((id: string) => все.find((x) => x.id === id), [все])

  const [ищу, setИщу] = useState('')
  const [выбран, setВыбран] = useState<Source>(все[0])
  const [раскрыты, setРаскрыты] = useState<string[]>(() => ['избранное', разделИсточника(все[0].id)])
  const [шаг, setШаг] = useState<Шаг>('список')
  const [вкладки, setВкладки] = useState<string[]>([])
  const [наВиду, setНаВиду] = useState<string | null>(null)
  const [свежесть, setСвежесть] = useState<Record<string, number>>({})
  const [окна, setОкна] = useState<Окно[]>([])
  const [отказ, setОтказ] = useState('')
  /* Пока окно тащат, рамки чужих сайтов не должны перехватывать мышь. */
  const [тащат, setТащат] = useState(false)
  /* 🔴 ИСТОЧНИК, ЗАПРЕТИВШИЙ РАМКУ, ОТКРЫВАЕТСЯ ЧЕРЕЗ ПОСРЕДНИК (владелец, 11.11)
     — в этой же колонке и настоящим сайтом. Кто запрещает, знает сервер; любой
     источник человек может переключить и сам, кнопкой в строке адреса. Только
     вошедшему: посредник — это выход в сеть с нашего сервера, гостям он закрыт. */
  const [запрет, setЗапрет] = useState<string[]>([])
  const [выбор, setВыбор] = useState<Record<string, boolean>>({})
  useEffect(() => {
    if (!вошёл) return
    let жив = true
    void безРамки().then((список) => { if (жив) setЗапрет(список) })
    return () => { жив = false }
  }, [вошёл])
  const свой = (id: string) => вошёл && Boolean(ПОСРЕДНИК) && (выбор[id] ?? запрет.includes(id))
  const экран = useRef<HTMLElement>(null)
  const поиск = useRef<HTMLInputElement>(null)
  const слой = useRef(1)

  /* 🔴 ИЗБРАННОЕ ВОШЕДШЕГО — НА СЕРВЕРЕ (владелец, 11.11). При входе на экран
     серверный список соединяется с местным: отмеченное гостем до входа не
     пропадает. Дальше каждая правка идёт и в браузер, и на сервер. Пока
     сервер не ответил, на него ничего не шлём — иначе пустой местный список
     затёр бы настоящий. */
  const сверено = useRef(false)
  useEffect(() => {
    if (!вошёл) return
    let жив = true
    сСервера().then((сервер) => {
      if (!жив || сервер === null) return
      сверено.current = true
      setЛюбимые((мои) => {
        const вместе = [...сервер, ...мои.filter((x) => !сервер.includes(x))]
        return вместе.length === мои.length && вместе.every((x, i) => x === мои[i]) ? мои : вместе
      })
    })
    return () => { жив = false }
  }, [вошёл])

  useEffect(() => {
    записать(любимые)
    if (вошёл && сверено.current) void наСервер(любимые)
  }, [любимые, вошёл])

  const слово = ищу.trim().toLowerCase()
  const видно = (x: Source) => !слово || x.name.toLowerCase().includes(слово) || x.gives.toLowerCase().includes(слово)

  /* 🔴 ИЗБРАННОЕ — ВСЕГДА ПЕРВОЙ ГРУППОЙ, ПО ОБЩИМ ПРАВИЛАМ (владелец, 10.11):
     тот же заголовок со счётчиком, так же сворачивается. Источники в нём —
     дубли: из своих разделов они никуда не уходят. Пустая группа тоже стоит
     на месте — иначе неоткуда узнать, что избранное вообще есть. */
  const группы = useMemo(() => {
    const свои = любимые.map(поId).filter((x): x is Source => Boolean(x))
    return [{ id: 'избранное', имя: 'Избранное', источники: свои }, ...разделы]
  }, [любимые, поId, разделы])

  const раскрыть = (id: string) => setРаскрыты((было) => (было.includes(id) ? было.filter((р) => р !== id) : [...было, id]))
  const вкл = (список: string[], id: string) => (список.includes(id) ? список.filter((x) => x !== id) : [...список, id])

  /* Вкладка источника в браузере. Старые сверх шести закрываются сами,
     начиная с самой давней. */
  const вБраузер = (x: Source) => {
    setВкладки((было) => (было.includes(x.id) ? было : [...было, x.id].slice(-ВКЛАДОК_НЕ_БОЛЬШЕ)))
    setНаВиду(x.id)
  }

  /* 🔴 ВЫБРАЛ — И ИСТОЧНИК УЖЕ ОТКРЫТ (владелец, 10.11: «открывать в браузере
     сразу»). Отдельной кнопки «открыть» нет. Источник, вынесенный в окно, во
     вкладку не дублируется: два живых экземпляра одного сайта ни к чему. */
  const выбрать = (x: Source) => {
    setВыбран(x)
    setОтказ('')
    if (!окна.some((о) => о.id === x.id)) вБраузер(x)
    setШаг('источник')
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

  const видОкна = (id: string, вид: ВидОкна | undefined) => { наверх(id); setОкна((было) => было.map((о) => (о.id === id ? { ...о, вид } : о))) }
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
              const моя = г.id === 'избранное'
              if (свои.length === 0 && !(моя && !слово)) return null
              const открыта = Boolean(слово) || раскрыты.includes(г.id)
              return (
                <section key={г.id} aria-label={г.имя} className={моя ? s.mine : undefined}>
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
                  {открыта && моя && свои.length === 0
                    ? <p className={s.none}>Пока пусто. У любого источника нажмите «Добавить в избранное».</p> : null}
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

          <button type="button" className={`${s.act} ${s.onlyNarrow}`} onClick={() => setШаг('браузер')}>
            <span>Открыть</span>
            <span className={s.actNote}>{хозяин(выбран.home)}</span>
          </button>
          <button type="button" className={`${s.act} ${s.onlyWide} ${вОкне(выбран.id) ? s.actOn : ''}`} onClick={() => { if (вОкно(выбран)) закрытьВкладку(выбран.id) }}>
            <span>{вОкне(выбран.id) ? 'Открыт в отдельном окне' : 'Открыть в отдельном окне'}</span>
            <span className={s.actNote}>открыто {окна.length} из {ОКОН_НЕ_БОЛЬШЕ}</span>
          </button>
          {учитель ? (
            <button type="button" className={s.act} onClick={() => setНаУрок(выбран)}>
              <span>Показать на уроке</span>
              <span className={s.actNote}>приложить к уроку</span>
            </button>
          ) : null}
          <button type="button" className={`${s.act} ${любим ? s.actOn : ''}`} aria-pressed={любим} onClick={() => setЛюбимые((было) => вкл(было, выбран.id))}>
            <span>{любим ? 'В избранном' : 'Добавить в избранное'}</span>
            <span className={s.actNote}>{любим ? 'убрать' : вошёл ? 'на всех устройствах' : 'в этом браузере'}</span>
          </button>
          <p className={s.refuse} role="status">{отказ}</p>

          <p className={s.silent}><span className={s.silentLabel}>Если источник замолчит:</span> {IF_SILENT[выбран.kind]}</p>

          {/* Поиска по теме пока нет — и поле этого не скрывает: оно не нажимается
              и подписано «скоро» (владелец, 10.11). */}
          <div className={s.ask}>
            <span className={s.askField}>Поиск по теме с AI Flamingo</span>
            <div className={s.askRow}><span className={s.chip}>скоро</span></div>
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
                <button type="button" className={`${s.addrAct} ${s.reload}`} aria-label="Обновить" title="Обновить" onClick={() => setСвежесть((б) => ({ ...б, [текущая.id]: (б[текущая.id] ?? 0) + 1 }))}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.75M13.4 2.6v2.9h-2.9" /></svg>
                </button>
                <button type="button" className={s.addrAct} aria-pressed={любимые.includes(текущая.id)} onClick={() => setЛюбимые((было) => вкл(было, текущая.id))}>
                  {любимые.includes(текущая.id) ? 'В избранном' : 'В избранное'}
                </button>
                {учитель ? (
                  <button type="button" className={s.addrAct} onClick={() => setНаУрок(текущая)}>На урок</button>
                ) : null}
                {вошёл && ПОСРЕДНИК ? (
                  <button
                    type="button"
                    className={s.addrAct}
                    aria-pressed={свой(текущая.id)}
                    title="Открыть источник через Flamingo — если в рамке пусто"
                    onClick={() => setВыбор((б) => ({ ...б, [текущая.id]: !свой(текущая.id) }))}
                  >
                    Через Flamingo
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
                    <Рамка x={x} раз={свежесть[id] ?? 0} свой={свой(id)} />
                  </div>
                )
              })}
            </>
          ) : (
            <p className={s.empty}>Выберите источник слева — он откроется здесь.</p>
          )}
        </section>
      </div>

      {наУрок ? <НаУрок источник={наУрок} закрыть={() => setНаУрок(null)} /> : null}

      {окна.length > 0 ? <p className={s.count}>Открыто окон: {окна.length} из {ОКОН_НЕ_БОЛЬШЕ}</p> : null}

      {/* ── окна: до шести, двигаются и меняют размер ───────────────────── */}
      {окна.map((о) => {
        const x = поId(о.id)
        if (!x) return null
        return (
          <div
            key={о.id}
            className={`${s.window} ${о.вид === 'свёрнуто' ? s.windowMin : ''}`}
            role="dialog"
            aria-label={`Окно источника: ${x.name}`}
            style={{ ...местоОкна(о), zIndex: о.слой }}
            onPointerDown={() => наверх(о.id)}
          >
            <div className={s.windowBar} onPointerDown={о.вид === 'развёрнуто' ? undefined : тащить(о.id, 'место')}>
              <КнопкиОкна имя={x.name} вид={о.вид} закрыть={() => закрытьОкно(о.id)} сменить={(вид) => видОкна(о.id, вид)} />
              <span className={s.windowName} title={x.name}>{x.name}</span>
            </div>
            <div className={s.windowBody}><Рамка x={x} раз={0} свой={свой(о.id)} /></div>
            {о.вид ? null : <span className={s.windowGrip} onPointerDown={тащить(о.id, 'размер')} aria-hidden="true" />}
          </div>
        )
      })}
    </main>
  )
}
