import { useCallback, useEffect, useRef, useState } from 'react'

import { Cover } from '../hub/Cover'
import { SOURCES } from '../hub/sources'
import { Mark } from '../ui/Mark'
import { доска, палитра } from './титул-доска'
import s from './Титул.module.css'

/** ТИТУЛЬНЫЙ ЭКРАН.
 *
 *  🔴 ПОСАДОЧНАЯ СТРАНИЦА ВЕРНУЛАСЬ (решение владельца 06.09). 01.09 её убрали
 *  — «вошёл в кабинет, не вошёл ко входу», — и это записано в App.tsx. Теперь
 *  незашедший видит титул, а вошедший по-прежнему попадает прямо в кабинет:
 *  для того, у кого есть учётная запись, витрина — лишняя дверь.
 *
 *  🔴 ДОСКА НЕ КАРТИНКА, А ДОСКА. Она показывает четыре сценария работы и даёт
 *  рисовать прямо здесь. Продукт — поверхность, на которой пишут вместе, и
 *  титул работает ею же, а не рассказывает о ней словами.
 *
 *  🔴 РОЛИКИ «ПОЗНАВАТЕЛЬНОЙ НАУКИ» ПОМЕЧЕНЫ «СКОРО». Раздела ещё нет, и
 *  карточка, которая ничего не открывает, — обещание, которого экран сдержать
 *  не может (ПРАВИЛА 6.5г). Пока их пять и они молчат вслух.
 *
 *  🔴 ХАБ ВЗЯТ НАСТОЯЩИЙ — те же `SOURCES`, что и на экране `/hub`, и та же
 *  обложка `Cover`. Цветных полос по видам здесь нет: вид назван словом,
 *  состояние — точкой и надписью (решение владельца 31.08).
 */

const РОЛИКИ = [
  { предмет: 'химия', имя: 'Огонь без спичек — и почему это безопасно' },
  { предмет: 'математика', имя: 'Откуда взялся синус и зачем он морю' },
  { предмет: 'астрономия', имя: 'Как звучит чёрная дыра' },
  { предмет: 'музыка', имя: 'Восемь тактов, от которых мурашки' },
  { предмет: 'биология', имя: 'Клетка под настоящим микроскопом' },
] as const

/** Мотив обложки ролика. Цвет берётся токеном, как и везде. */
function мотивРолика(предмет: string) {
  if (предмет === 'химия') {
    return (
      <g fill="none" stroke="var(--color-accent)" strokeWidth={3}>
        <path d="M74 96v40L44 214h92l-30-78V96" />
        <path d="M68 96h44" />
      </g>
    )
  }
  if (предмет === 'математика') {
    return (
      <>
        <path d="M-10 190 Q25 90 60 190 T130 190 T200 190" fill="none" stroke="var(--color-go)" strokeWidth={4} />
        <path d="M0 190h180" stroke="var(--color-border-strong)" strokeWidth={1.5} />
      </>
    )
  }
  if (предмет === 'астрономия') {
    return (
      <>
        <circle cx={90} cy={160} r={42} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
        <ellipse cx={90} cy={160} rx={66} ry={16} fill="none" stroke="var(--color-border-strong)" strokeWidth={1.4} />
      </>
    )
  }
  if (предмет === 'музыка') {
    return (
      <g fill="var(--color-info)">
        {[26, 62, 110, 48, 140, 74, 34, 96, 150, 70, 40, 100].map((h, i) => (
          <rect key={i} x={16 + i * 13} y={160 - h / 2} width={7} height={h} rx={3.5} />
        ))}
      </g>
    )
  }
  return (
    <>
      <circle cx={90} cy={160} r={62} fill="none" stroke="var(--color-go)" strokeWidth={3} />
      <circle cx={90} cy={160} r={22} fill="var(--color-go)" opacity={0.35} />
    </>
  )
}

/** Постер проморолика: миниатюра самой комнаты, а не серая заглушка. */
function постер() {
  return (
    <svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width={480} height={270} fill="var(--color-bg)" />
      <rect x={18} y={16} width={444} height={176} rx={10} fill="var(--color-surface)" stroke="var(--color-border)" />
      <g fill="var(--color-border)">
        {Array.from({ length: 6 }, (_, r) =>
          Array.from({ length: 17 }, (_, k) => (
            <circle key={`${r}-${k}`} cx={32 + k * 26} cy={30 + r * 26} r={1.1} />
          )))}
      </g>
      <path d="M60 150 Q108 60 156 150 T252 150" fill="none" stroke="var(--color-go)" strokeWidth={4} />
      <g fill="none" stroke="var(--color-info)" strokeWidth={2.6}>
        <ellipse cx={372} cy={104} rx={52} ry={20} />
        <ellipse cx={372} cy={104} rx={52} ry={20} transform="rotate(60 372 104)" />
        <ellipse cx={372} cy={104} rx={52} ry={20} transform="rotate(120 372 104)" />
      </g>
      <circle cx={372} cy={104} r={7} fill="var(--color-accent)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={18 + i * 89} y={206} width={78} height={48} rx={7}
          fill={i ? 'var(--color-surface)' : 'var(--color-surface-subtle)'} stroke="var(--color-border)" />
      ))}
    </svg>
  )
}

const ПЕРЬЯ = ['--color-text', '--color-accent', '--color-go', '--color-info'] as const
const В_ХАБЕ = ['hubble', 'loc', 'lapalma', 'rijks', 'rumsey', 'usgs']
const СОСТОЯНИЕ = { ok: 'отвечает', live: 'идёт трансляция', down: 'молчит' } as const

export function Титул({ onSign, onHub }: { onSign: () => void; onHub: () => void }) {
  const холст = useRef<HTMLCanvasElement>(null)
  const следРеф = useRef<HTMLCanvasElement>(null)
  const левая = useRef<HTMLDivElement>(null)
  const слова = useRef<HTMLDivElement>(null)
  const блок = useRef<HTMLDivElement>(null)
  const промо = useRef<HTMLButtonElement>(null)
  const подпись = useRef<HTMLSpanElement>(null)
  const [сцена, setСцена] = useState(0)
  const [перо, setПеро] = useState(0)
  const [стопкой, setСтопкой] = useState(true)
  const движок = useRef<ReturnType<typeof доска> | null>(null)

  const источники = В_ХАБЕ.map((id) => SOURCES.find((x) => x.id === id)).filter(Boolean)
  const молчит = SOURCES.filter((x) => x.state === 'down').length

  /* Доска: сцены идут по кругу, взяли перо — молчат. */
  useEffect(() => {
    const c = холст.current
    if (!c) return
    const д = доска(c, палитра(c))
    движок.current = д
    д.размер()
    д.играть(0, setСцена)
    const наРазмер = () => { д.размер(); д.играть(д.текущая(), setСцена) }
    window.addEventListener('resize', наРазмер)
    return () => { window.removeEventListener('resize', наРазмер); д.стоп() }
  }, [])

  /* 🔴 РАСКЛАДКУ НИЗА РЕШАЕТ ЗАМЕР, А НЕ МЕДИАЗАПРОС. Колонка бывает высокой и
     узкой: ролик 16:9 во всю ширину тогда не помещается рядом со словами и
     выходил крошечным, а справа зияла дыра. Считаем остаток высоты и, если
     «стопкой» не добирает 86 % ширины, кладём подпись сбоку. */
  const подогнать = useCallback(() => {
    const л = левая.current, сл = слова.current, б = блок.current, пр = промо.current, п = подпись.current
    if (!л || !сл || !б || !пр || !п) return
    пр.style.width = ''
    const колW = л.clientWidth
    const остаток = л.clientHeight - сл.getBoundingClientRect().height - 16
    if (остаток < 86) { б.style.display = 'none'; return }
    б.style.display = 'grid'
    пр.style.width = `${колW}px`
    const надо = колW * 9 / 16 + 8 + п.getBoundingClientRect().height
    if (надо <= остаток) { setСтопкой(true); пр.style.width = `${Math.floor(Math.min(колW, (остаток - 8 - п.getBoundingClientRect().height) * 16 / 9))}px`; return }
    setСтопкой(false)
    пр.style.width = `${Math.max(150, Math.min(остаток * 16 / 9, колW - 170 - 16))}px`
  }, [])

  useEffect(() => {
    подогнать()
    const t = window.setTimeout(подогнать, 60)
    window.addEventListener('resize', подогнать)
    return () => { window.clearTimeout(t); window.removeEventListener('resize', подогнать) }
  }, [подогнать, стопкой])

  /* След указателя: короткий хвост последних 320 мс на своём слое. */
  useEffect(() => {
    const c = следРеф.current
    const осн = холст.current
    if (!c || !осн) return
    const g = c.getContext('2d')
    if (!g) return
    const цвет = палитра(осн).акцент
    let хвост: Array<[number, number, number]> = []
    let жив = true
    const размер = () => {
      const r = c.getBoundingClientRect(); const k = window.devicePixelRatio || 1
      c.width = r.width * k; c.height = r.height * k
      g.setTransform(k, 0, 0, k, 0, 0); g.lineCap = 'round'
    }
    const где = (e: PointerEvent): [number, number] => {
      const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]
    }
    const движение = (e: PointerEvent) => { const p = где(e); хвост.push([p[0], p[1], Date.now()]) }
    const уход = () => { хвост = [] }
    const кадр = () => {
      if (!жив) return
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.restore()
      const t = Date.now()
      хвост = хвост.filter((п) => t - п[2] < 320)
      for (let i = 1; i < хвост.length; i += 1) {
        const a = хвост[i - 1], b = хвост[i]
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 90) continue
        const возраст = (t - b[2]) / 320
        g.globalAlpha = (1 - возраст) * 0.5
        g.strokeStyle = цвет
        g.lineWidth = 3.2 * (1 - возраст * 0.6)
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke()
      }
      g.globalAlpha = 1
      requestAnimationFrame(кадр)
    }
    размер(); кадр()
    осн.addEventListener('pointermove', движение)
    осн.addEventListener('pointerleave', уход)
    window.addEventListener('resize', размер)
    return () => {
      жив = false
      осн.removeEventListener('pointermove', движение)
      осн.removeEventListener('pointerleave', уход)
      window.removeEventListener('resize', размер)
    }
  }, [])

  return (
    <main className={s.экран}>
      <header className={s.шапка}>
        <Mark />
        <nav className={s.меню}>
          <button type="button" className={s.пункт} onClick={onHub}>Источники мира</button>
          <button type="button" className={s.пункт} onClick={onSign}>Преподавателям</button>
        </nav>
        <span className={s.разрыв} />
        <button type="button" className={s.вход} onClick={onSign}>Войти</button>
        <button type="button" className={s.дверь} onClick={onSign}>Завести учётную запись</button>
      </header>

      <div className={s.разворот}>
        <div className={s.левая} ref={левая}>
          <div className={s.слова} ref={слова}>
            <span className={s.бровь}>живой урок · увлекательное образование</span>
            <h1 className={s.заголовок}>Наука, от которой не оторваться</h1>
            <p className={s.лид}>
              Одна ссылка — и класс в сборе: общая доска и документы во весь экран,
              библиотеки и методички со всего мира.
            </p>
            <span className={s.кому}>один кабинет — с первого урока до научной степени</span>
          </div>

          <div className={`${s.проБлок} ${стопкой ? s.стопкой : s.сбоку}`} ref={блок}>
            {/* Ролика ещё нет — кнопка объявлена немой словами (ПРАВИЛА 14.1). */}
            <button type="button" className={s.промо} ref={промо} data-still="проморолик снимается">
              {постер()}
              <span className={s.пуск}>
                <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2l10 6-10 6z" fill="var(--color-text)" /></svg>
              </span>
            </button>
            <span className={s.проТекст}>
              <span className={s.проПодпись} ref={подпись}>
                Посмотрите, как мы делаем фламинго<s>скоро</s>
              </span>
            </span>
          </div>
        </div>

        <div className={s.доска}>
          <div className={s.дШапка}>
            <span>доска занятия</span>
            <span className={s.живо}><span className={s.огонёк} /> рисует сама, пока вы смотрите</span>
          </div>
          <div className={s.поле}>
            <canvas className={s.холст} ref={холст} />
            <canvas className={s.след} ref={следРеф} />
            <span className={s.шёпот}>поводите мышью — или возьмите перо</span>
          </div>
          <div className={s.дНиз}>
            {ПЕРЬЯ.map((имя, i) => (
              <button
                key={имя}
                type="button"
                aria-label={`перо ${i + 1}`}
                className={`${s.перо} ${i === перо ? s.пероВ : ''}`}
                style={{ background: `var(${имя})` }}
                onClick={() => setПеро(i)}
              />
            ))}
            <span className={s.сцены}>
              {(движок.current?.имена ?? ['рисунок', 'график', 'английский', 'астрономия']).map((имя, i) => (
                <button
                  key={имя}
                  type="button"
                  className={`${s.сцена} ${i === сцена ? s.сценаВ : ''}`}
                  onClick={() => движок.current?.играть(i, setСцена)}
                >
                  {имя}
                </button>
              ))}
            </span>
          </div>
        </div>
      </div>

      <div className={s.низ}>
        <div className={s.часть}>
          <div className={s.нШапка}>
            <h2 className={s.нЗаголовок}>Познавательная наука</h2>
            <span className={s.нПодпись}>готовим</span>
          </div>
          <div className={s.лента}>
            {РОЛИКИ.map((р) => (
              <div className={s.ролик} key={р.предмет}>
                <span className={s.обложка}>
                  <svg viewBox="0 0 180 320" preserveAspectRatio="xMidYMid slice" aria-hidden>{мотивРолика(р.предмет)}</svg>
                  <span className={s.предмет}>{р.предмет}</span>
                  <span className={s.скоро}>скоро</span>
                </span>
                <span className={s.имя}>{р.имя}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={s.часть}>
          <div className={s.нШапка}>
            <h2 className={s.нЗаголовок}>Flamingo HUB</h2>
            <span className={s.нПодпись}>источники мира · молчат {молчит} из {SOURCES.length}</span>
            <button type="button" className={s.всё} onClick={onHub}>все {SOURCES.length} →</button>
          </div>
          <div className={s.хаб}>
            {источники.map((и) => и && (
              <button type="button" className={s.источник} key={и.id} onClick={onHub}>
                <span className={s.превью}><Cover id={и.id} kind={и.kind} /></span>
                <span className={s.иТекст}>
                  <span className={s.иВид}>{и.kind}</span>
                  <span className={s.иИмя}>{и.name}</span>
                  <span className={s.иДаёт}>{и.gives}</span>
                  <span className={`${s.иСост} ${и.state === 'live' ? s.иЭфир : ''} ${и.state === 'down' ? s.иМолчит : ''}`}>
                    <span className={s.иТочка} />{СОСТОЯНИЕ[и.state]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
