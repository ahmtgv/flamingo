import { useEffect, useId, useRef, useState } from 'react'

import { RIGHTS, SOURCES } from '../hub/sources'
import '../styles/главная.css'
import s from './Титул.module.css'
import { доска, палитра } from './титул-доска'

/** Титул — главная flamingo.plus. Редизайн утверждён владельцем 31.10.2026.
 *
 *  Источник правды — холст «Flamingo — редизайн главной» (артборды Main и
 *  MainDark) и спецификация к нему: один экран 1440×900 без прокрутки, стиль
 *  рабочего стола, две темы с одной раскладкой. Цвета, размеры и SVG взяты из
 *  макетов как есть; живут в `Титул.module.css` своими переменными, потому что
 *  это отдельная шкала, не продуктовая (оговорка «типографика-исключение» там же).
 *
 *  🔴 ГЛАВНАЯ — ВСЕГДА ГЛАВНАЯ (решение владельца 31.10): вошедший тоже видит
 *  её, а не кабинет; у него вместо двух дверей одна — «Войти в кабинет».
 *
 *  🔴 ДОСКА ЖИВАЯ — КАК В ПРОШЛОЙ ИТЕРАЦИИ (решение владельца 31.10): движок
 *  `титул-доска.ts` рисует четыре сцены сам, от руки; режимы в шапке окна —
 *  его сцены, перья внизу — его перья. Взяли перо — сцены молчат, отпустили —
 *  штрих тает и доска снова показывает сама. Это витрина, а не урок.
 *
 *  🔴 РОЛИК 2020-ГО — РОВНО В РАЗМЕР ВИДЕО (владелец, 31.10): окно 16:9 без
 *  чёрных полей сверху и снизу; освободившуюся высоту берёт блок тестирования.
 *  Полоса «Познавательной науки» выше на половину, доска и хаб — ниже на столько же.
 *
 *  Хаб и наука — настоящие: те же `SOURCES` и те же ролики, что на `/hub` и в
 *  комнате; подпись права у источника — из `RIGHTS[...]`, а не из головы
 *  (караул `хаб-check`). Шесть источников и их короткие имена — по спецификации.
 *
 *  Чего в макете нет и что ждёт слова владельца (двери помечены `data-still`,
 *  ПРАВИЛА 14.1): адрес «Перейти к тестам», «Все видео», бургер-меню на узком
 *  экране, ручной переключатель темы.
 */

type Ролик = { файл: string; имя: string; картинка?: () => React.ReactNode }

const ПРОМО: Ролик = { файл: 'promo', имя: 'Каким мы задумали Flamingo в 2020-м' }

/** Шесть источников витрины — порядок и подписи по спецификации 30.10. */
const В_ХАБЕ: { id: string; имя: string; картинка: () => React.ReactNode }[] = [
  { id: 'hubble', имя: 'Телескоп «Хаббл»', картинка: () => (
    <>
      <g fill="#fff"><circle cx="22" cy="20" r="1.4" opacity=".8" /><circle cx="146" cy="24" r="1.6" opacity=".9" /><circle cx="30" cy="92" r="1.2" opacity=".7" /><circle cx="140" cy="94" r="1.3" opacity=".7" /><circle cx="58" cy="14" r="1" opacity=".6" /><circle cx="118" cy="104" r="1" opacity=".6" /></g>
      <circle cx="84" cy="58" r="22" fill="#fff" opacity=".18" />
      <ellipse cx="84" cy="58" rx="50" ry="15" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2" transform="rotate(-18 84 58)" />
      <path d="M84 58 C 104 44, 130 50, 134 66" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity=".92" />
      <path d="M84 58 C 64 72, 38 66, 34 50" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity=".92" />
      <circle cx="84" cy="58" r="8" fill="#fff" />
    </>
  ) },
  { id: 'loc', имя: 'Библиотека Конгресса', картинка: () => (
    <>
      <path d="M84 36 C 70 28, 50 28, 34 32 L 34 86 C 50 82, 70 82, 84 90 Z" fill="#fff" />
      <path d="M84 36 C 98 28, 118 28, 134 32 L 134 86 C 118 82, 98 82, 84 90 Z" fill="#fff" opacity=".86" />
      <g stroke="#ff8a42" strokeWidth="2.2" strokeLinecap="round" opacity=".55"><path d="M44 44 C 54 42, 66 42, 74 46" /><path d="M44 54 C 54 52, 66 52, 74 56" /><path d="M44 64 C 54 62, 66 62, 74 66" /><path d="M94 46 C 102 42, 114 42, 124 44" /><path d="M94 56 C 102 52, 114 52, 124 54" /><path d="M94 66 C 102 62, 114 62, 124 64" /></g>
      <path d="M84 36 L 84 90" stroke="#e86a32" strokeWidth="1.5" opacity=".5" />
    </>
  ) },
  { id: 'lapalma', имя: 'Обсерватория Ла-Пальма', картинка: () => (
    <>
      <g fill="#fff"><circle cx="24" cy="22" r="1.4" opacity=".8" /><circle cx="62" cy="14" r="1.1" opacity=".7" /><circle cx="96" cy="26" r="1.3" opacity=".7" /><circle cx="40" cy="44" r="1" opacity=".6" /></g>
      <path d="M0 96 C 40 78, 110 76, 168 90 L 168 116 L 0 116 Z" fill="#1a1238" opacity=".45" />
      <rect x="58" y="80" width="52" height="12" rx="2" fill="#fff" opacity=".88" />
      <path d="M62 80 A 22 22 0 0 1 106 80 Z" fill="#fff" />
      <path d="M86 60 L 92 60 L 89 80 L 83 80 Z" fill="#e2677d" opacity=".55" />
      <rect x="112" y="14" width="42" height="17" rx="8.5" fill="#fff" opacity=".95" />
      <circle cx="122" cy="22.5" r="3.5" fill="#ff3b30" />
      <text x="129" y="26" fontSize="9.5" fontWeight="700" fill="#241b57" fontFamily="Inter, system-ui, sans-serif">LIVE</text>
    </>
  ) },
  { id: 'rijks', имя: 'Рейксмузеум', картинка: () => (
    <>
      <rect x="44" y="20" width="80" height="76" rx="6" fill="#fff" />
      <rect x="53" y="29" width="62" height="58" rx="3" fill="#fde4d6" />
      <circle cx="98" cy="46" r="7" fill="#f59e6b" />
      <path d="M53 87 L 53 70 C 66 60, 78 62, 88 70 C 96 64, 106 62, 115 68 L 115 87 Z" fill="#c2335d" opacity=".75" />
    </>
  ) },
  { id: 'rumsey', имя: 'Карты Дэвида Румзи', картинка: () => (
    <>
      <path d="M34 30 L 64 22 L 104 30 L 134 22 L 134 88 L 104 96 L 64 88 L 34 96 Z" fill="#fff" />
      <path d="M64 22 L 64 88 M104 30 L 104 96" stroke="#2a6fdb" strokeWidth="1.5" opacity=".22" />
      <path d="M44 80 C 58 66, 70 74, 82 60 S 104 44, 112 48" fill="none" stroke="#2a8fd0" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="4 5" />
      <path d="M112 30 C 104 30, 100 36, 100 41 C 100 49, 112 58, 112 58 C 112 58, 124 49, 124 41 C 124 36, 120 30, 112 30 Z" fill="#ff5a3c" />
      <circle cx="112" cy="41" r="4" fill="#fff" />
    </>
  ) },
  { id: 'usgs', имя: 'USGS · землетрясения', картинка: () => (
    <>
      <circle cx="84" cy="58" r="36" fill="#fff" fillOpacity=".14" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
      <ellipse cx="84" cy="58" rx="16" ry="36" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" />
      <path d="M48 46 L 120 46 M48 70 L 120 70" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" />
      <path d="M12 58 L 48 58 L 56 42 L 64 76 L 72 26 L 80 92 L 88 40 L 96 70 L 104 52 L 110 62 L 116 58 L 156 58" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ) },
]

/** Градиенты превью хаба — по спецификации; Ла-Пальма — сверху вниз. */
const ГРАДИЕНТ_ХАБА: Record<string, [string, string, boolean?]> = {
  hubble: ['#1e2a78', '#6a3fc1'],
  loc: ['#ffb547', '#ff6a3d'],
  lapalma: ['#241b57', '#e2677d', true],
  rijks: ['#c2335d', '#f59e6b'],
  rumsey: ['#22b8a5', '#2a6fdb'],
  usgs: ['#2fbf71', '#0e7c86'],
}

const ЦВЕТ_ПРАВА: Record<string, string> = { own: s.правоМожно, live: s.правоУрок, attr: s.правоАвтор, show: s.правоАвтор }

/* Превью «Науки» нарисованы под свой кадр — портрет 160×200, как они стоят на
   странице (владелец, 31.10: «перерисовать согласно размеров самого превью»). */
const РОЛИКИ: Ролик[] = [
  { файл: 'short-1', имя: 'Песок и звук', картинка: () => (
    <>
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9"><path d="M62 30 Q 80 18 98 30" /><path d="M54 42 Q 80 24 106 42" /></g>
      <rect x="30" y="62" width="100" height="100" rx="12" fill="#fff" opacity=".95" />
      <g fill="none" stroke="#c98a3e" strokeWidth="2.6" strokeLinecap="round"><path d="M36 68 Q 80 112 124 68" /><path d="M36 156 Q 80 112 124 156" /><path d="M36 68 Q 80 112 36 156" /><path d="M124 68 Q 80 112 124 156" /><circle cx="80" cy="112" r="17" /></g>
      <circle cx="80" cy="112" r="4" fill="#c98a3e" />
    </>
  ) },
  { файл: 'short-2', имя: 'Тело на склоне', картинка: () => (
    <>
      <path d="M16 172 L 144 172 L 144 58 Z" fill="#fff" opacity=".96" />
      <g transform="translate(96 115) rotate(-41.7)"><rect x="-17" y="-24" width="34" height="24" rx="4" fill="#0a6cff" /></g>
      <path d="M96 116 L 96 150" stroke="#0a6cff" strokeWidth="3" strokeLinecap="round" />
      <path d="M89 142 L 96 151 L 103 142" fill="none" stroke="#0a6cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 172 A 32 32 0 0 0 40.1 150.7" fill="none" stroke="#0a6cff" strokeWidth="2.2" strokeLinecap="round" opacity=".6" />
      <text x="54" y="168" fontSize="11" fontWeight="600" fill="#0a6cff" opacity=".8">α</text>
    </>
  ) },
  { файл: 'short-3', имя: 'Синус на круге', картинка: () => (
    <>
      <circle cx="80" cy="60" r="34" fill="#fff" fillOpacity=".14" stroke="#fff" strokeWidth="3" />
      <path d="M80 60 L 104 36" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="104" cy="36" r="5" fill="#fff" />
      <path d="M104 36 L 104 112" stroke="#fff" strokeWidth="1.8" strokeDasharray="3 5" opacity=".8" />
      <path d="M16 140 L 144 140" stroke="#fff" strokeOpacity=".45" strokeWidth="1.8" />
      <path d="M16 140 Q 38 80 60 140 Q 82 200 104 140 Q 126 80 148 140" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="104" cy="140" r="5" fill="#fff" />
    </>
  ) },
  { файл: 'short-4', имя: 'Медный мотор', картинка: () => (
    <>
      <circle cx="80" cy="100" r="54" fill="#fff" fillOpacity=".14" stroke="#fff" strokeOpacity=".7" strokeWidth="3" />
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${a} 80 100)`}><rect x="68" y="46" width="24" height="34" rx="6" fill="#fff" /><path d="M68 54 H 92 M68 60 H 92 M68 66 H 92 M68 72 H 92" stroke="#d9702a" strokeWidth="2" opacity=".75" /></g>
      ))}
      <circle cx="80" cy="100" r="12" fill="#fff" /><circle cx="80" cy="100" r="4.5" fill="#c4561a" />
    </>
  ) },
  { файл: 'short-5', имя: 'Волна из шаров', картинка: () => (
    <>
      <path d="M14 26 L 146 26" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <g stroke="#fff" strokeOpacity=".6" strokeWidth="1.5">{[24, 38, 52, 66, 80, 94, 108, 122, 136].map((x, i) => <path key={x} d={`M${x} 26 V ${[96, 124, 150, 160, 148, 118, 90, 72, 70][i]}`} />)}</g>
      <g fill="#fff">{[24, 38, 52, 66, 80, 94, 108, 122, 136].map((x, i) => <circle key={x} cx={x} cy={[96, 124, 150, 160, 148, 118, 90, 72, 70][i]} r="7" />)}</g>
    </>
  ) },
  { файл: 'short-6', имя: 'Путь планет', картинка: () => (
    <>
      <g fill="#fff"><circle cx="20" cy="22" r="1.4" opacity=".8" /><circle cx="140" cy="30" r="1.6" opacity=".8" /><circle cx="28" cy="176" r="1.2" opacity=".6" /><circle cx="146" cy="168" r="1.4" opacity=".7" /><circle cx="110" cy="14" r="1" opacity=".6" /><circle cx="60" cy="188" r="1.1" opacity=".6" /></g>
      <g fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth="1.8"><ellipse cx="80" cy="100" rx="30" ry="16" /><ellipse cx="80" cy="100" rx="50" ry="30" /><ellipse cx="80" cy="100" rx="70" ry="46" /></g>
      <circle cx="80" cy="100" r="22" fill="#ffd60a" opacity=".22" /><circle cx="80" cy="100" r="11" fill="#ffd60a" />
      <circle cx="107" cy="106" r="4.2" fill="#fff" /><circle cx="42" cy="84" r="5.4" fill="#64d2ff" /><circle cx="136" cy="124" r="6.4" fill="#ff9f0a" />
    </>
  ) },
]

const ГРАДИЕНТ_НАУКИ: [string, string][] = [
  ['#f4cd80', '#d7954a'], ['#64d2ff', '#0a6cff'], ['#bf5af2', '#5e5ce6'],
  ['#ffb340', '#c4561a'], ['#34d364', '#0c8f7a'], ['#121a3d', '#4a3596'],
]

/** Перья доски — по спецификации; первое и второе берут цвет темы и акцент. */
const ПЕРЬЯ = [
  { имя: 'Чёрное перо', класс: s.перо1 },
  { имя: 'Коралловое перо', класс: s.перо2 },
  { имя: 'Зелёное перо', класс: s.перо3 },
  { имя: 'Синее перо', класс: s.перо4 },
]

const РЕЖИМЫ = ['рисунок', 'график', 'английский', 'астрономия']

const ммсс = (с: number) => { const n = Math.max(0, Math.floor(с || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` }

const ЗНАК_ПУСКА = (
  <svg width="20" height="22" viewBox="0 0 12 14" aria-hidden="true"><path d="M1.5 1v12l10-6z" fill="#fff" /></svg>
)

export function Титул({ onSign, onNew, onHub, onCabinet, вошёл = false, молчит = false, onAgain }: {
  onSign: () => void
  /** Отдельная дверь: «завести» и «войти» — разные намерения (ПРАВИЛА 12.4). */
  onNew: () => void
  onHub: () => void
  /** Вошедший видит главную тоже (решение 31.10); его единственная дверь — в кабинет. */
  onCabinet?: () => void
  вошёл?: boolean
  /** Сервер учётных записей не ответил. Титул от этого не ломается: страдают
   *  только двери, и об этом сказано словами, а не молчанием. */
  молчит?: boolean
  onAgain?: () => void
}) {
  const uid = useId().replace(/:/g, '')
  /* Один ролик за раз — промо или клип науки. Открывается в окне посреди
     экрана поверх размытой страницы (владелец, 31.10: «раскрывается на
     середине экрана… фон заблюривается, как ликвид гласс»). */
  const [играет, setИграет] = useState<Ролик | null>(null)
  const кино = useRef<HTMLVideoElement>(null)
  const [идёт, setИдёт] = useState(false)
  const [сек, setСек] = useState(0)
  const [длина, setДлина] = useState(0)
  const [тихоВидео, setТихоВидео] = useState(false)
  const пускПауза = () => { const в = кино.current; if (!в) return; if (в.paused) void в.play().catch(() => undefined); else в.pause() }
  useEffect(() => {
    setСек(0); setДлина(0); setИдёт(false)
    if (!играет) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setИграет(null) }
    window.addEventListener('keydown', esc)
    кино.current?.focus()
    return () => window.removeEventListener('keydown', esc)
  }, [играет])

  /* ── доска: четыре сцены рисуются сами, взяли перо — молчат ─────────────
     Движок — `титул-доска.ts`, тот же, что в прошлой итерации (решение
     владельца 31.10: «интерактивность доски — как была»). Режимы в шапке
     окна — это его сцены; палитра внизу — его перья. */
  const холст = useRef<HTMLCanvasElement>(null)
  const следРеф = useRef<HTMLCanvasElement>(null)
  const движок = useRef<ReturnType<typeof доска> | null>(null)
  const [сцена, setСцена] = useState(0)
  const [перо, setПеро] = useState(0)
  const пероРеф = useRef(0)
  const [тихо, setТихо] = useState(false)

  useEffect(() => {
    const м = window.matchMedia('(prefers-reduced-motion: reduce)')
    const снять = () => setТихо(м.matches)
    снять()
    м.addEventListener('change', снять)
    return () => м.removeEventListener('change', снять)
  }, [])

  useEffect(() => {
    const c = холст.current
    if (!c) return
    const д = доска(c, палитра(c))
    движок.current = д
    д.размер()
    д.играть(0, setСцена)
    д.сторож(setСцена)
    const П = палитра(c)
    const цвета = [П.перо, П.акцент, П.зелёный, П.синий]
    const где = (e: PointerEvent): [number, number] => {
      const r = c.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    }
    const вниз = (e: PointerEvent) => {
      try { c.setPointerCapture(e.pointerId) } catch { /* без захвата тоже рисуется */ }
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

  /* След указателя: короткий хвост последних 320 мс на своём слое;
     при «меньше движения» его нет. */
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
      if (e.buttons & 1) { хвост = []; return }
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

  const дверьВхода = молчит
    ? { onClick: undefined, 'aria-disabled': true as const, title: 'Сервер учётных записей молчит — войти сейчас нельзя' }
    : {}

  return (
    <div className={s.корень}>
      <nav className={s.меню} aria-label="Главное меню">
        <div className={s.менюЛево}>
          <a href="#верх" className={s.лого} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }) }}>
            <img src="/flamingo-mark.svg" alt="" aria-hidden="true" />
            <span>flamingo.</span>
          </a>
          <div className={s.пункты}>
            <a href="#доска">Доска занятия</a>
            <a href="#наука">Познавательная наука</a>
            <a href="#хаб">Источники мира</a>
            <a href="#тесты">Тестирование</a>
          </div>
        </div>
        <div className={s.менюПраво}>
          {вошёл ? (
            <button type="button" className={s.пилюля} onClick={onCabinet}>Войти в кабинет</button>
          ) : (
            <>
              <button type="button" className={s.менюВойти} onClick={молчит ? undefined : onSign} aria-disabled={молчит || undefined}>Войти</button>
              <button type="button" className={s.пилюля} onClick={молчит ? undefined : onNew} aria-disabled={молчит || undefined}>Завести учётную запись</button>
            </>
          )}
        </div>
      </nav>

      <main className={s.стол}>
        {/* ── левая колонка ───────────────────────────────────────────── */}
        <div className={s.левая}>
          <section id="верх" className={s.карточка}>
            <span className={s.кикер}>Живой урок · образование без скуки</span>
            <h1 className={s.заголовок}>Одна ссылка —<br />и урок уже начался.</h1>
            <p className={s.подзаголовок}>Один кабинет — от первого урока до научной степени.</p>
            <div className={s.двери}>
              {вошёл ? (
                <button type="button" className={s.cta} onClick={onCabinet}>Войти в кабинет</button>
              ) : (
                <>
                  <button type="button" className={s.cta} onClick={молчит ? undefined : onNew} {...дверьВхода}>Завести учётную запись</button>
                  <button type="button" className={s.вторая} onClick={молчит ? undefined : onSign} {...дверьВхода}>Войти</button>
                </>
              )}
            </div>
            {молчит ? (
              <p className={s.облачко} role="status">
                Сервер учётных записей молчит — войти сейчас нельзя. Доска и источники работают.
                {onAgain ? <button type="button" className={s.снова} onClick={onAgain}>Спросить ещё раз</button> : null}
              </p>
            ) : null}
          </section>

          <section id="тесты" className={s.тесты} aria-label="Тестирование">
            <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className={s.нейро}>
              <defs><linearGradient id={`${uid}-gml`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7d5cff" /><stop offset="1" stopColor="#ff5e8a" /></linearGradient></defs>
              <rect width="52" height="52" rx="13" fill={`url(#${uid}-gml)`} />
              <g stroke="#fff" strokeOpacity="0.55" strokeWidth="1.4"><path d="M14 16 L26 26 M14 26 L26 26 M14 36 L26 26 M26 26 L38 18 M26 26 L38 34 M14 16 L26 14 M14 36 L26 38 M26 14 L38 18 M26 38 L38 34" /></g>
              <g fill="#fff"><circle cx="14" cy="16" r="3.2" /><circle cx="14" cy="26" r="3.2" /><circle cx="14" cy="36" r="3.2" /><circle cx="26" cy="14" r="3.2" /><circle cx="26" cy="26" r="4.2" /><circle cx="26" cy="38" r="3.2" /><circle cx="38" cy="18" r="3.2" /><circle cx="38" cy="34" r="3.2" /></g>
            </svg>
            <div className={s.тестыТекст}>
              <span className={s.тестыШапка}><span className={s.тестыЗаголовок}>Примите участие в тестировании</span><span className={s.бета}>Важно для науки</span></span>
              <span className={s.тестыОписание}>Примите, пожалуйста, участие в машинном обучении — помогите проекту обучить наши нейросети</span>
              <button type="button" className={s.ссылка} data-still="адрес тестов назовёт владелец" aria-disabled="true">Перейти к тестам ›</button>
            </div>
          </section>

          <section id="видео" className={s.видео} aria-label="Видео 2020 года">
            <button type="button" className={s.кадр} onClick={() => setИграет(ПРОМО)} aria-label="Посмотреть видео о Flamingo, 2 минуты, со звуком">
              <img src="/video/promo.jpg" alt="" />
              <span className={s.видеоШапка}><span className={s.видеоИмя} title={ПРОМО.имя}>{ПРОМО.имя}</span><span className={s.видеоПодпись}>Кринж присутствует</span></span>
              <span className={s.пуск} aria-hidden="true">{ЗНАК_ПУСКА}</span>
              <span className={s.ход} aria-hidden="true"><span>0:00</span><span className={s.полоса} /><span>2 минуты</span></span>
            </button>
          </section>
        </div>

        {/* ── правая колонка ──────────────────────────────────────────── */}
        <div className={s.правая}>
          <div className={s.верхнийРяд}>
            <section id="доска" className={s.доска} aria-label="Доска занятия">
              <div className={s.окноШапка}>
                <span className={s.окноИмя}>
                  <span className={s.окноЗаголовок}>Доска занятия</span>
                  <span className={s.окноПодпись}>
                    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10l1-3 5.5-5.5a1.4 1.4 0 012 2L5 9z" fill="none" className={s.акцентОбвод} strokeWidth="1.4" strokeLinejoin="round" /></svg>
                    Попробуйте нарисовать сами
                  </span>
                </span>
                <span className={s.распор} />
                <div role="group" aria-label="Режим доски" className={s.режимы}>
                  {РЕЖИМЫ.map((р, i) => (
                    <button key={р} type="button" className={`${s.режим} ${i === сцена ? s.режимОн : ''}`}
                      aria-pressed={i === сцена} onClick={() => движок.current?.играть(i, setСцена)}>
                      {р}
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.поле}>
                <canvas className={s.холст} ref={холст} aria-label="Доска занятия: рисует сама, можно рисовать пером" role="img" />
                <canvas className={s.след} ref={следРеф} aria-hidden="true" />
                <span className={s.шёпот}>{тихо ? 'нажмите режим — доска нарисует' : 'поводите мышью — или возьмите перо'}</span>

                <div className={s.палитра}>
                  <span className={s.палитраПодпись}>мышью или пером</span>
                  <span className={s.перья} role="group" aria-label="Цвет пера">
                    {ПЕРЬЯ.map((п, i) => (
                      <button key={п.имя} type="button" aria-label={п.имя} aria-pressed={перо === i} className={s.пероКнопка} onClick={() => { setПеро(i); пероРеф.current = i }}>
                        <span className={`${s.пероКруг} ${п.класс}`} />
                        {перо === i ? <span className={`${s.пероКольцо} ${п.класс}`} /> : null}
                      </button>
                    ))}
                  </span>
                  <span aria-hidden="true" className={s.палитраЧерта} />
                  <button type="button" className={s.стереть} onClick={() => { const д = движок.current; if (д) { д.отпустить(); д.играть(д.текущая(), setСцена) } }}>Стереть</button>
                </div>
              </div>
            </section>

            <section id="хаб" className={s.хаб} aria-label="Flamingo HUB">
              <div className={s.окноШапка}>
                <span className={s.окноИмя}>
                  <span className={s.окноЗаголовок}>Flamingo HUB</span>
                  <span className={s.окноПодпись}>Источники мира · открыты для урока</span>
                </span>
              </div>
              <div className={s.источники}>
                {В_ХАБЕ.map((в) => {
                  const и = SOURCES.find((x) => x.id === в.id)
                  if (!и) return null
                  const [от, до, вниз] = ГРАДИЕНТ_ХАБА[в.id]
                  const gid = `${uid}-h-${в.id}`
                  return (
                    <button key={в.id} type="button" className={s.источник} onClick={onHub}>
                      <svg viewBox="0 0 168 116" width="92" height="64" aria-hidden="true" className={s.превьюХаба}>
                        <defs><linearGradient id={gid} x1="0" y1="0" x2={вниз ? '0' : '1'} y2="1"><stop offset="0" stopColor={от} /><stop offset="1" stopColor={до} /></linearGradient></defs>
                        <rect width="168" height="116" fill={`url(#${gid})`} />
                        {в.картинка()}
                      </svg>
                      <span className={s.источникСлова}>
                        <span className={s.источникТип}>{и.kind}</span>
                        <span className={s.источникИмя} title={в.имя}>{в.имя}</span>
                        <span className={`${s.право} ${ЦВЕТ_ПРАВА[и.right]}`}>● {RIGHTS[и.right].tag}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <button type="button" className={s.всеИсточники} onClick={onHub}>Все {SOURCES.length} источников <span aria-hidden="true">›</span></button>
            </section>
          </div>

          <section id="наука" className={s.наука} aria-label="Познавательная наука">
            <div className={s.наукаШапка}>
              <span className={s.наукаИмя}><span className={s.наукаЗаголовок}>Познавательная наука</span><span className={s.наукаПодпись}>Короткие опыты, которые можно включить прямо на уроке</span></span>
              <button type="button" className={s.ссылка} data-still="страницу всех видео назовёт владелец" aria-disabled="true">Все видео ›</button>
            </div>
            <div className={s.ролики}>
              {РОЛИКИ.map((р, i) => {
                const gid = `${uid}-s${i}`
                const [от, до] = ГРАДИЕНТ_НАУКИ[i]
                return (
                  <button key={р.файл} type="button" className={s.ролик} onClick={() => setИграет(р)} aria-label={`Посмотреть: ${р.имя}. Со звуком`}>
                    <span className={s.роликПревью}>
                      <svg viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                        <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={от} /><stop offset="1" stopColor={до} /></linearGradient></defs>
                        <rect width="160" height="200" fill={`url(#${gid})`} />
                        {р.картинка?.()}
                      </svg>
                      <span className={s.роликПуск} aria-hidden="true"><svg width="8" height="10" viewBox="0 0 12 14"><path d="M1.5 1v12l10-6z" fill="#1d1d1f" /></svg></span>
                    </span>
                    <span className={s.роликИмя} title={р.имя}>{р.имя}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {играет ? (
        <div className={s.стекло} onClick={() => setИграет(null)} role="presentation">
          <div className={s.окноВидео} role="dialog" aria-modal="true" aria-label={играет.имя} onClick={(e) => e.stopPropagation()}>
            {/* Без встроенного управления: его полоса легла бы НА кадр, а владелец
                просил таймлайн под роликом; и чёрных полей нет — окно берёт
                пропорции самого видео. */}
            <video ref={кино} className={s.кино} src={`/video/${играет.файл}.mp4`} poster={`/video/${играет.файл}.jpg`} autoPlay playsInline
              onClick={пускПауза} onPlay={() => setИдёт(true)} onPause={() => setИдёт(false)} onEnded={() => setИграет(null)}
              onTimeUpdate={(e) => setСек(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setДлина(e.currentTarget.duration)} onVolumeChange={(e) => setТихоВидео(e.currentTarget.muted)} />
            <div className={s.управление}>
              <button type="button" className={s.кнопкаВидео} onClick={пускПауза} aria-label={идёт ? 'Пауза' : 'Пуск'}>
                {идёт ? <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1.5 1h3v12h-3zM7.5 1h3v12h-3z" fill="currentColor" /></svg> : <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1.5 1v12l10-6z" fill="currentColor" /></svg>}
              </button>
              <span className={s.времяВидео}>{ммсс(сек)}</span>
              <input type="range" className={s.таймлайн} min={0} max={длина || 0} step={0.1} value={Math.min(сек, длина || 0)} aria-label="Место в ролике" aria-valuetext={`${ммсс(сек)} из ${ммсс(длина)}`}
                onChange={(e) => { const в = кино.current; if (в) { в.currentTime = Number(e.target.value); setСек(в.currentTime) } }} />
              <span className={s.времяВидео}>{ммсс(длина)}</span>
              <button type="button" className={s.кнопкаВидео} onClick={() => { const в = кино.current; if (в) в.muted = !в.muted }} aria-label={тихоВидео ? 'Включить звук' : 'Выключить звук'} aria-pressed={тихоВидео}>
                {тихоВидео ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 5h3l4-3v10l-4-3H1z" fill="currentColor" /><path d="M10 5l3 4M13 5l-3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 5h3l4-3v10l-4-3H1z" fill="currentColor" /><path d="M10 4.5a3.5 3.5 0 010 5M11.5 2.5a6 6 0 010 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>}
              </button>
            </div>
            <div className={s.окноНиз}>
              <span className={s.окноИмяВидео} title={играет.имя}>{играет.имя}</span>
              <button type="button" className={s.закрыть} onClick={() => setИграет(null)} aria-label="Закрыть видео">Закрыть</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
