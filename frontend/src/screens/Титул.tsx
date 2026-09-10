import { useCallback, useEffect, useRef, useState } from 'react'

import { Cover } from '../hub/Cover'
import { RIGHTS, SOURCES } from '../hub/sources'
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

/* 🔴 ИМЯ РОЛИКА ЖИВЁТ В КОЛОНКЕ 87 px. Померено на 1280: кегль 13, две
   строки — это 26 знаков, а имена были по 31–44 и обрезались все шесть.
   Обрезанное имя не говорит, о чём ролик, и раздел перестаёт быть выбором.
   Держим 16–19 знаков: влезает целиком на всех трёх кадрах. */
const РОЛИКИ = [
  { предмет: 'физика',      файл: 'short-1', имя: 'Песок рисует звук' },
  { предмет: 'физика',      файл: 'short-2', имя: 'Наклонная плоскость' },
  { предмет: 'математика',  файл: 'short-3', имя: 'Синус на окружности' },
  { предмет: 'физика',      файл: 'short-4', имя: 'Мотор из катушек' },
  { предмет: 'физика',      файл: 'short-5', имя: 'Волновой маятник' },
  { предмет: 'астрономия',  файл: 'short-6', имя: 'Планеты по спирали' },
] as const

/* 🔴 ЦВЕТ — НЕ ИМЯ. Перья различались только заливкой, а читалке объявлялись
   «перо 1…4»: при дейтеранопии коралл и зелень дают контраст 1,02:1 — два
   одинаковых кружка. Рядом, на плитках хаба, тот же продукт делает верно:
   право названо словом. Здесь — то же самое. */
const ПЕРЬЯ = [
  { токен: '--color-text',   имя: 'чёрное перо' },
  { токен: '--color-accent', имя: 'коралловое перо' },
  { токен: '--color-go',     имя: 'зелёное перо' },
  { токен: '--color-info',   имя: 'синее перо' },
] as const
const В_ХАБЕ = ['hubble', 'loc', 'lapalma', 'rijks', 'rumsey', 'usgs']
/** 🔴 ЗВУК ВКЛЮЧАЛСЯ СРАЗУ И НА ПОЛНУЮ, БЕЗ ЕДИНОГО ПРЕДУПРЕЖДЕНИЯ. Все семь
 *  видео: `muted false`, `volume 1`, `autoplay`. На кнопке пуска стоял только
 *  треугольник. Случайное нажатие — мгновенный звук на полную громкость.
 *  Предупреждать надо ДО нажатия, поэтому значок живёт на постере, а не в
 *  плеере; то же слово ушло в `aria-label`, чтобы предупреждение было и на слух. */
function ЗначокЗвука() {
  return (
    <span className={s.звук} aria-hidden>
      <svg viewBox="0 0 16 16">
        <path d="M3 6h2.5L9 3v10L5.5 10H3z" />
        <path d="M11 5.5a3.6 3.6 0 010 5" fill="none" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className={s.звукСлово}>со звуком</span>
    </span>
  )
}

export function Титул({ onSign, onNew, onHub, молчит = false, onAgain }: {
  onSign: () => void
  /** Отдельная дверь: «завести» и «войти» — разные намерения, и вести им надо
   *  в разные состояния экрана (ПРАВИЛА 12.4, аудит 07.09 находка 14). */
  onNew: () => void
  onHub: () => void
  /** Сервер учётных записей не ответил. Титул от этого не ломается: страдают
   *  только двери, и об этом сказано словами, а не молчанием. */
  молчит?: boolean
  onAgain?: () => void
}) {
  const холст = useRef<HTMLCanvasElement>(null)
  const следРеф = useRef<HTMLCanvasElement>(null)
  const левая = useRef<HTMLDivElement>(null)
  const слова = useRef<HTMLDivElement>(null)
  const блок = useRef<HTMLDivElement>(null)
  const промо = useRef<HTMLDivElement>(null)
  const подпись = useRef<HTMLSpanElement>(null)
  const [сцена, setСцена] = useState(0)
  const [перо, setПеро] = useState(0)
  const пероРеф = useRef(0)
  const [стопкой, setСтопкой] = useState(true)
  /* 🔴 ОДНО СОСТОЯНИЕ НА ВСЮ СТРАНИЦУ: `null`, `'promo'` или имя файла ролика.
     Было два независимых флага, и код нарушал собственный комментарий —
     промо и ролик ленты звучали одновременно, обе дорожки на полной
     громкости. Одно состояние делает «один за раз» не обещанием, а фактом. */
  const [играет, setИграет] = useState<string | null>(null)
  const движок = useRef<ReturnType<typeof доска> | null>(null)
  /* 🔴 «МЕНЬШЕ ДВИЖЕНИЯ» СОБЛЮДАЛОСЬ НАПОЛОВИНУ. Доску запрос останавливал, а
     хвост за курсором крутился безусловно — человек с мигренью получал комету
     на всю правую половину, ровно там, куда его звала подпись. И читал
     обещание «рисует сама», которого экран в этом режиме не выполнял.
     Теперь запрос виден коду: и след, и слова меняются по факту. */
  const [тихо, setТихо] = useState(false)

  useEffect(() => {
    const м = window.matchMedia('(prefers-reduced-motion: reduce)')
    const снять = () => setТихо(м.matches)
    снять()
    м.addEventListener('change', снять)
    return () => м.removeEventListener('change', снять)
  }, [])

  const источники = В_ХАБЕ.map((id) => SOURCES.find((x) => x.id === id)).filter(Boolean)

  /* Доска: сцены идут по кругу, взяли перо — молчат. */
  useEffect(() => {
    const c = холст.current
    if (!c) return
    const д = доска(c, палитра(c))
    движок.current = д
    д.размер()
    д.играть(0, setСцена)
    д.сторож(setСцена)

    /* 🔴 ПЕРО. Без этого доска только показывала: «возьмите перо» было
       обещанием, которого экран не выполнял. Нажали — сцены молчат, ведём —
       остаётся штрих тем же почерком, отпустили и восемь секунд тишины —
       доска снова показывает сама. */
    const П = палитра(c)
    const цвета = [П.перо, П.акцент, П.зелёный, П.синий]
    const где = (e: PointerEvent): [number, number] => {
      const r = c.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    }
    const вниз = (e: PointerEvent) => {
      c.setPointerCapture(e.pointerId)
      д.взятьПеро()
      const p = где(e)
      д.вести(p[0], p[1], цвета[пероРеф.current])
    }
    const ведём = (e: PointerEvent) => {
      if (!(e.buttons & 1)) return
      const p = где(e)
      д.вести(p[0], p[1], цвета[пероРеф.current])
    }
    const вверх = () => д.отпустить()
    c.addEventListener('pointerdown', вниз)
    c.addEventListener('pointermove', ведём)
    c.addEventListener('pointerup', вверх)
    c.addEventListener('pointerleave', вверх)
    const наРазмер = () => { д.размер(); д.играть(д.текущая(), setСцена) }
    window.addEventListener('resize', наРазмер)
    return () => {
      window.removeEventListener('resize', наРазмер)
      c.removeEventListener('pointerdown', вниз)
      c.removeEventListener('pointermove', ведём)
      c.removeEventListener('pointerup', вверх)
      c.removeEventListener('pointerleave', вверх)
      д.стоп()
    }
  }, [])

  /* 🔴 РАСКЛАДКУ НИЗА РЕШАЕТ ЗАМЕР, А НЕ МЕДИАЗАПРОС. Колонка бывает высокой и
     узкой: ролик 16:9 во всю ширину тогда не помещается рядом со словами и
     выходил крошечным, а справа зияла дыра. Считаем остаток высоты и, если
     «стопкой» не добирает 86 % ширины, кладём подпись сбоку. */
  const подогнать = useCallback(() => {
    const л = левая.current, сл = слова.current, б = блок.current, пр = промо.current, п = подпись.current
    if (!л || !сл || !б || !пр || !п) return
    /* 🔴 НИЖЕ ТЕЛЕФОННОГО БРЕЙКПОИНТА СЧИТАТЬ НЕЧЕГО, И СЧЁТ ЗАМЫКАЛСЯ В КРУГ.
       В колонке `.левая` переходит в `auto`, остаток высоты выходит меньше 86,
       блок прячется — и остаётся спрятанным навсегда: спрятанный он в остаток
       уже не просится. Единственное личное видео владельца не видел ни один
       посетитель с телефона (померено на 600, 430, 390 и 360). В колонке
       раскладку держит CSS, и мерить нечего. */
    if (window.matchMedia('(max-width: 720px)').matches) {
      б.style.display = ''
      пр.style.width = ''
      return
    }
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
    if (!c || !осн || тихо) return
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
    const движение = (e: PointerEvent) => {
      if (e.buttons & 1) { хвост = []; return }   // пока ведут перо, следа нет
      const p = где(e); хвост.push([p[0], p[1], Date.now()])
    }
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
  }, [тихо])

  return (
    <main className={s.экран}>
      <header className={s.шапка}>
        <Mark />
        <nav className={s.меню}>
          <button type="button" className={s.пункт} onClick={onHub}>Источники мира</button>
          <button type="button" className={s.пункт} onClick={onSign}>Преподавателям</button>
        </nav>
        <span className={s.разрыв} />
        {/* 🔴 ЕСЛИ НАПИСАНО «НЕЛЬЗЯ» — ДВЕРЬ И ДОЛЖНА НЕ ОТКРЫВАТЬСЯ. Полоса
            отказа ниже говорила «войти и завести запись сейчас нельзя», а обе
            двери оставались живыми: человек нажимал, попадал на форму, вводил
            почту и пароль и только там узнавал, что сервер молчит. Мёртвая
            кнопка, которая выглядит живой, хуже отсутствующей (ПРАВИЛА 12.5);
            приглушается цвет и вес, не прозрачность (12.1), а цель остаётся
            полной (12.6). Аудит 07.09, находка 13. */}
        <button
          type="button"
          className={s.вход}
          onClick={молчит ? undefined : onSign}
          aria-disabled={молчит || undefined}
          tabIndex={молчит ? -1 : undefined}
          data-ждёт={молчит ? 'да' : undefined}
        >
          Войти
        </button>
        <button
          type="button"
          className={s.дверь}
          onClick={молчит ? undefined : onNew}
          aria-disabled={молчит || undefined}
          tabIndex={молчит ? -1 : undefined}
          data-ждёт={молчит ? 'да' : undefined}
        >
          Завести учётную запись
        </button>
      </header>

      {молчит && (
        <p className={s.отказ}>
          Сервер учётных записей не отвечает — войти и завести запись сейчас нельзя.
          Доска, источники мира и урок по ссылке работают.
          {onAgain && <button type="button" className={s.снова} onClick={onAgain}>Спросить ещё раз</button>}
        </p>
      )}

      <div className={s.разворот}>
        <div className={s.левая} ref={левая}>
          <div className={s.слова} ref={слова}>
            <span className={s.бровь}>живой урок · образование без скуки</span>
            <h1 className={s.заголовок}>Наука, от которой не хочется отвлекаться</h1>
            <p className={s.лид}>
              Одна ссылка — и урок уже начался: видео, доска, документы и материалы
              в одном месте. Библиотеки, лабы и методички — отовсюду, где есть
              что-то полезное.
            </p>
            <span className={s.кому}>один кабинет — от первого урока до научной степени</span>
          </div>

          <div className={`${s.проБлок} ${стопкой ? s.стопкой : s.сбоку}`} ref={блок}>
            {/* 🔴 РОЛИК СНЯТ И ЛЕЖИТ РЯДОМ (10.09). До этого кнопка была немой и
                объявляла молчание через `data-still` — теперь ей есть что открыть,
                и оговорка снята вместе с надписью «скоро».
                🔴 У КНОПКИ ИЗ ОДНОЙ КАРТИНКИ ИМЕНИ НЕТ ВОВСЕ. Померено 08.09:
                читалка объявляет её просто «кнопка», поэтому `aria-label`. */}
            <div className={s.промо} ref={промо}>
              {играет === 'promo' ? (
                <video className={s.кино} src="/video/promo.mp4" poster="/video/promo.jpg"
                       controls autoPlay playsInline onEnded={() => setИграет(null)} />
              ) : (
                <button type="button" className={s.пускКнопка}
                        aria-label="Посмотреть, как мы делаем фламинго. Со звуком"
                        onClick={() => setИграет('promo')}>
                  <img className={s.кадр} src="/video/promo.jpg" alt="" />
                  <span className={s.пуск}>
                    <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2l10 6-10 6z" /></svg>
                  </span>
                  <ЗначокЗвука />
                </button>
              )}
            </div>
            <span className={s.проТекст}>
              <span className={s.проПодпись} ref={подпись}>
                Посмотрите, каким мы задумали Flamingo в далёком 2020-м
                (простите за кринж)<s>2 минуты</s>
              </span>
            </span>
          </div>
        </div>

        <div className={s.доска}>
          <div className={s.дШапка}>
            <span>доска занятия</span>
            <span className={s.живо}>
              <span className={s.огонёк} />
              {тихо ? 'сцены переключаются кнопками' : 'рисует сама, пока вы смотрите'}
            </span>
          </div>
          <div className={s.поле}>
            <canvas className={s.холст} ref={холст} />
            <canvas className={s.след} ref={следРеф} />
            <span className={s.шёпот}>
              {тихо ? 'нажмите сцену — доска нарисует' : 'поводите мышью — или возьмите перо'}
            </span>
          </div>
          <div className={s.дНиз}>
            {ПЕРЬЯ.map((п, i) => (
              <button
                key={п.токен}
                type="button"
                aria-label={п.имя}
                aria-pressed={i === перо}
                className={`${s.перо} ${i === перо ? s.пероВ : ''}`}
                style={{ background: `var(${п.токен})` }}
                onClick={() => { setПеро(i); пероРеф.current = i }}
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
          <div className={s.нВерх}>
            <div className={s.нШапка}>
              <h2 className={s.нЗаголовок}>Познавательная наука</h2>
            </div>
          {/* 🔴 ЦЕЛОЕ ПРЕДЛОЖЕНИЕ НЕ ВСТАЁТ В МЕТКУ РАЗДЕЛА. `нПодпись` — моно,
              капитель, разрядка: она держит два-три слова («готовим»,
              «источники мира · открыты для урока»). Фраза владельца в 54 знака
              переносилась второй строкой и ломала заголовок рядом. Поэтому она
              строкой ниже и обычным набором — это подзаголовок, а не метка. */}
            <p className={s.нЛид}>Подборка материалов, которые действительно хочется открыть</p>
          </div>
          <div className={s.лента}>
            {РОЛИКИ.map((р) => (
              <div className={s.ролик} key={р.файл}>
                <div className={s.обложка}>
                  {играет === р.файл ? (
                    <video className={s.кино} src={`/video/${р.файл}.mp4`}
                           poster={`/video/${р.файл}.jpg`} controls autoPlay playsInline
                           onEnded={() => setИграет(null)} />
                  ) : (
                    <button type="button" className={s.пускКнопка}
                            aria-label={`Посмотреть: ${р.имя}. Со звуком`}
                            onClick={() => setИграет(р.файл)}>
                      <img className={s.кадр} src={`/video/${р.файл}.jpg`} alt="" loading="lazy" />
                      <span className={s.пуск}>
                        <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2l10 6-10 6z" /></svg>
                      </span>
                      <ЗначокЗвука />
                    </button>
                  )}
                </div>
                {/* 🔴 МЕТКА ПРЕДМЕТА УШЛА С КАДРА НА СВОЮ ПОВЕРХНОСТЬ. Поверх
                    фотографии она промахивалась мимо контраста всегда: тема
                    переворачивает букву, кадр не переворачивается (днём мимо
                    порога 4,5 шли все шесть, худший пиксель — 1,00:1). Подложка
                    спасала контраст, но в колонку 87 px не влезала: «математика»
                    обрезалась до «математик» — ошибка в русском на главной
                    странице продукта про образование. Под кадром слово стоит
                    целиком, на спокойной поверхности и не спорит с картинкой. */}
                <span className={s.подпись}>
                  <span className={s.предмет} title={р.предмет}>{р.предмет}</span>
                  <span className={s.имя}>{р.имя}</span>
                </span>
              </div>
            ))}
          </div>
          {/* 🔴 РОЛИКИ ПОКА ЧУЖИЕ, И ЭТО СКАЗАНО ВСЛУХ. Владелец 10.09 назвал их
              временными; авторы подписаны прямо в кадре, мы их не срезали.
              Строка снимается вместе с заменой на свои съёмки. */}
          <p className={s.сноска}>Ролики пока чужие — авторы подписаны в кадре.</p>
        </div>

        <div className={s.часть}>
          {/* 🔴 ЗАГОЛОВОК И ПОДЗАГОЛОВОК — ОДИН РЕБЁНОК СЕТКИ, как и слева:
              `.часть` расписана как `auto minmax(0, 1fr)`, и третий ребёнок
              сдвигает плитки в неявную строку `auto`. */}
          <div className={s.нВерх}>
            <div className={s.нШапка}>
              <h2 className={s.нЗаголовок}>Flamingo HUB</h2>
              <button type="button" className={s.всё} onClick={onHub}>все {SOURCES.length} →</button>
            </div>
            {/* 🔴 БЫЛО «МОЛЧАТ 1 ИЗ 36» — ЧИСЛО ИЗ НИОТКУДА. Считалось по буквам
                `state`, набранным руками в каталоге; опроса источников нет вовсе
                (осмотр 08.09, находка 19). Титул — первое, что видит человек, и
                первое, что он видит, не имеет права быть выдумкой.
                🔴 ПОДЗАГОЛОВОК УЕХАЛ СО СТРОКИ ЗАГОЛОВКА ВНИЗ, как у соседа слева.
                Пока он стоял меткой в одну строку, а слева шапка была из двух,
                половины низа стояли ступенькой в 35,6 px (порог ПРАВИЛА 3.3 — 2)
                и полоса читалась как два несвязанных куска. */}
            <p className={s.нЛид}>источники мира — открыты для урока</p>
          </div>
          <div className={s.хаб}>
            {источники.map((и) => и && (
              <button type="button" className={s.источник} key={и.id} onClick={onHub}>
                <span className={s.превью}><Cover id={и.id} kind={и.kind} /></span>
                <span className={s.иТекст}>
                  <span className={s.иВид}>{и.kind}</span>
                  <span className={s.иИмя} title={и.name}>{и.name}</span>
                  <span className={s.иДаёт} title={и.gives}>{и.gives}</span>
                  {/* Та же строка, что в каталоге: не «жив ли сайт» (мы не знаем),
                      а «что с ним можно» (знаем словами). Hub.tsx, ПРАВИЛА 8.10. */}
                  <span className={`${s.иПраво} ${и.right === 'own' ? s.иСвободно : ''} ${и.right === 'live' ? s.иУзко : ''}`}>
                    <span className={s.иТочка} />{RIGHTS[и.right].tag}
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
