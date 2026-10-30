import { useCallback, useId, useRef, useState } from 'react'

import { RIGHTS, SOURCES } from '../hub/sources'
import '../styles/главная.css'
import s from './Титул.module.css'

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
 *  🔴 ДОСКА ЖИВАЯ: поверх эскиза Сатурна можно рисовать четырьмя перьями и
 *  стереть своё; эскиз остаётся. Рисунок никуда не уходит и пропадает с
 *  перезагрузкой — это витрина, а не урок.
 *
 *  Хаб и наука — настоящие: те же `SOURCES` и те же ролики, что на `/hub` и в
 *  комнате; подпись права у источника — из `RIGHTS[...]`, а не из головы
 *  (караул `хаб-check`). Шесть источников и их короткие имена — по спецификации.
 *
 *  Чего в макете нет и что ждёт слова владельца (двери помечены `data-still`,
 *  ПРАВИЛА 14.1): адрес «Перейти к тестам», «Все видео», режимы доски кроме
 *  «рисунок», бургер-меню на узком экране, ручной переключатель темы.
 */

type Ролик = { файл: string; имя: string; картинка: () => React.ReactNode }

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

const РОЛИКИ: Ролик[] = [
  { файл: 'short-1', имя: 'Песок и звук', картинка: () => (
    <>
      <rect x="46" y="14" width="76" height="76" rx="8" fill="#fff" opacity=".95" />
      <g fill="none" stroke="#c98a3e" strokeWidth="2.2" strokeLinecap="round"><path d="M50 18 Q 84 52 118 18" /><path d="M50 86 Q 84 52 118 86" /><path d="M50 18 Q 84 52 50 86" /><path d="M118 18 Q 84 52 118 86" /><circle cx="84" cy="52" r="13" /></g>
      <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M32 40 Q 26 52 32 64" /><path d="M24 34 Q 15 52 24 70" /></g>
    </>
  ) },
  { файл: 'short-2', имя: 'Тело на склоне', картинка: () => (
    <>
      <path d="M22 88 L 138 88 L 138 26 Z" fill="#fff" opacity=".96" />
      <g transform="translate(94 49) rotate(-28.1)"><rect x="-12" y="-17" width="24" height="17" rx="3" fill="#0a6cff" /></g>
      <path d="M94 50 L 94 74" stroke="#0a6cff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M89 68 L 94 75 L 99 68" fill="none" stroke="#0a6cff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 88 A 24 24 0 0 0 43.2 76.7" fill="none" stroke="#0a6cff" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </>
  ) },
  { файл: 'short-3', имя: 'Синус на круге', картинка: () => (
    <>
      <circle cx="46" cy="52" r="26" fill="#fff" fillOpacity=".14" stroke="#fff" strokeWidth="2.6" />
      <path d="M46 52 L 64.4 33.6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M84 52 L 150 52" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" />
      <path d="M84 52 Q 100.5 0 117 52 Q 133.5 104 150 52" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M64.4 33.6 L 92 33.6" stroke="#fff" strokeWidth="1.6" strokeDasharray="3 4" opacity=".8" />
      <circle cx="64.4" cy="33.6" r="4.2" fill="#fff" /><circle cx="92" cy="33.6" r="4.2" fill="#fff" />
    </>
  ) },
  { файл: 'short-4', имя: 'Медный мотор', картинка: () => (
    <>
      <circle cx="80" cy="52" r="32" fill="#fff" fillOpacity=".14" stroke="#fff" strokeOpacity=".7" strokeWidth="2.4" />
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${a} 80 52)`}><rect x="72" y="18" width="16" height="22" rx="4" fill="#fff" /><path d="M72 23 H 88 M72 27 H 88 M72 31 H 88 M72 35 H 88" stroke="#d9702a" strokeWidth="1.6" opacity=".75" /></g>
      ))}
      <circle cx="80" cy="52" r="8" fill="#fff" /><circle cx="80" cy="52" r="3" fill="#c4561a" />
    </>
  ) },
  { файл: 'short-5', имя: 'Волна из шаров', картинка: () => (
    <>
      <path d="M20 16 L 140 16" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <g stroke="#fff" strokeOpacity=".6" strokeWidth="1.3"><path d="M28 16 V 60" /><path d="M41 16 V 76" /><path d="M54 16 V 82" /><path d="M67 16 V 75" /><path d="M80 16 V 59" /><path d="M93 16 V 43" /><path d="M106 16 V 38" /><path d="M119 16 V 46" /><path d="M132 16 V 63" /></g>
      <g fill="#fff"><circle cx="28" cy="60" r="6" /><circle cx="41" cy="76" r="6" /><circle cx="54" cy="82" r="6" /><circle cx="67" cy="75" r="6" /><circle cx="80" cy="59" r="6" /><circle cx="93" cy="43" r="6" /><circle cx="106" cy="38" r="6" /><circle cx="119" cy="46" r="6" /><circle cx="132" cy="63" r="6" /></g>
    </>
  ) },
  { файл: 'short-6', имя: 'Путь планет', картинка: () => (
    <>
      <g fill="#fff"><circle cx="18" cy="16" r="1.2" opacity=".8" /><circle cx="142" cy="20" r="1.4" opacity=".8" /><circle cx="26" cy="90" r="1" opacity=".6" /><circle cx="148" cy="86" r="1.2" opacity=".7" /></g>
      <g fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth="1.6"><ellipse cx="80" cy="52" rx="26" ry="11" /><ellipse cx="80" cy="52" rx="44" ry="19" /><ellipse cx="80" cy="52" rx="64" ry="28" /></g>
      <circle cx="80" cy="52" r="18" fill="#ffd60a" opacity=".22" /><circle cx="80" cy="52" r="9" fill="#ffd60a" />
      <circle cx="104" cy="56.5" r="3.6" fill="#fff" /><circle cx="44" cy="40.6" r="4.6" fill="#64d2ff" /><circle cx="132" cy="68" r="5.4" fill="#ff9f0a" />
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
  const [играет, setИграет] = useState<string | null>(null)

  /* ── доска: рисование поверх эскиза ─────────────────────────────────── */
  const [перо, setПеро] = useState(0)
  const [штрихи, setШтрихи] = useState<string[]>(['', '', '', ''])
  const рисуем = useRef(false)
  const точка = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return `${((e.clientX - r.left) / r.width * 1000).toFixed(1)} ${((e.clientY - r.top) / r.height * 1000).toFixed(1)}`
  }
  const вниз = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* без захвата тоже рисуется */ }
    рисуем.current = true
    const p = точка(e)
    setШтрихи((d) => d.map((x, i) => (i === перо ? `${x} M${p} L${p}` : x)))
  }, [перо])
  const ведём = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!рисуем.current) return
    const p = точка(e)
    setШтрихи((d) => d.map((x, i) => (i === перо ? `${x} L${p}` : x)))
  }, [перо])
  const вверх = useCallback(() => { рисуем.current = false }, [])

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
              <span className={s.тестыШапка}><span className={s.тестыЗаголовок}>Примите участие в тестировании</span><span className={s.бета}>БЕТА</span></span>
              <span className={s.тестыОписание}>Новые функции на машинном обучении — попробуйте первыми и расскажите, что думаете.</span>
              <button type="button" className={s.ссылка} data-still="адрес тестов назовёт владелец" aria-disabled="true">Перейти к тестам ›</button>
            </div>
          </section>

          <section id="видео" className={s.видео} aria-label="Видео 2020 года">
            <div className={s.видеоШапка}><span className={s.видеоИмя} title="Каким мы задумали Flamingo в 2020-м">Каким мы задумали Flamingo в 2020-м</span></div>
            {играет === 'promo' ? (
              <video className={s.кино} src="/video/promo.mp4" poster="/video/promo.jpg" controls autoPlay playsInline onEnded={() => setИграет(null)} />
            ) : (
              <button type="button" className={s.кадр} onClick={() => setИграет('promo')} aria-label="Посмотреть видео о Flamingo, 2 минуты, со звуком">
                <img src="/video/promo.jpg" alt="" />
                <span className={s.пуск} aria-hidden="true">{ЗНАК_ПУСКА}</span>
                <span className={s.ход} aria-hidden="true"><span>0:00</span><span className={s.полоса} /><span>2 минуты</span></span>
              </button>
            )}
            <div className={s.видеоПодпись}>Кринж присутствует</div>
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
                    <button key={р} type="button" className={`${s.режим} ${i === 0 ? s.режимОн : ''}`}
                      aria-pressed={i === 0} aria-disabled={i === 0 ? undefined : true}
                      data-still={i === 0 ? 'режим уже выбран' : 'эскиз для этого режима назовёт владелец'}>
                      {р}
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.поле}>
                <svg viewBox="20 40 780 360" preserveAspectRatio="xMidYMid meet" className={s.эскиз} role="img" aria-label="Эскиз на доске: снимок Сатурна, подписи и формула тяготения">
                  <text x="40" y="70" fontSize="12" fill="#86868b">фото · телескоп</text>
                  <rect x="40" y="82" width="320" height="198" rx="18" className={s.эскизФото} />
                  <g fill="#fff"><circle cx="94" cy="122" r="1.6" /><circle cx="172" cy="106" r="1.4" /><circle cx="280" cy="114" r="1.5" /><circle cx="320" cy="152" r="1.2" /><circle cx="126" cy="236" r="1.4" /><circle cx="222" cy="258" r="1.6" /><circle cx="304" cy="224" r="1.3" /><circle cx="74" cy="196" r="1.2" /></g>
                  <ellipse cx="200" cy="181" rx="90" ry="23" fill="none" className={s.эскизКольцо} strokeWidth="2" transform="rotate(-14 200 181)" />
                  <circle cx="200" cy="181" r="46" fill="none" className={s.акцентОбвод} strokeWidth="3" />
                  <path d="M 376 144 C 420 132, 448 122, 482 116" fill="none" className={s.акцентОбвод} strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M 472 108 L 484 116 L 473 125" fill="none" className={s.акцентОбвод} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="496" y="122" fontSize="19" fontWeight="500" className={s.эскизТекст}>кольцо — лёд и камень</text>
                  <path d="M 376 216 C 420 228, 448 238, 482 246" fill="none" className={s.акцентОбвод} strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M 472 237 L 484 246 L 472 254" fill="none" className={s.акцентОбвод} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="496" y="252" fontSize="19" fontWeight="500" className={s.эскизТекст}>период обращения</text>
                  <text x="496" y="338" fontSize="27" fontStyle="italic" fontWeight="500" className={s.эскизТекст}>F = G · m₁m₂ / r²</text>
                  <path d="M 492 354 L 770 350" fill="none" className={s.эскизЛиния} strokeWidth="2.4" strokeLinecap="round" />
                </svg>

                <svg role="img" aria-label="Поле для рисования" viewBox="0 0 1000 1000" preserveAspectRatio="none" className={s.рисунок}
                  onPointerDown={вниз} onPointerMove={ведём} onPointerUp={вверх} onPointerLeave={вверх}>
                  {штрихи.map((d, i) => (
                    <path key={i} d={d} fill="none" className={`${s.штрих} ${ПЕРЬЯ[i].класс}`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>

                <div className={s.палитра}>
                  <span className={s.палитраПодпись}>мышью или пером</span>
                  <span className={s.перья} role="group" aria-label="Цвет пера">
                    {ПЕРЬЯ.map((п, i) => (
                      <button key={п.имя} type="button" aria-label={п.имя} aria-pressed={перо === i} className={s.пероКнопка} onClick={() => setПеро(i)}>
                        <span className={`${s.пероКруг} ${п.класс}`} />
                        {перо === i ? <span className={`${s.пероКольцо} ${п.класс}`} /> : null}
                      </button>
                    ))}
                  </span>
                  <span aria-hidden="true" className={s.палитраЧерта} />
                  <button type="button" className={s.стереть} onClick={() => setШтрихи(['', '', '', ''])}>Стереть</button>
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
                return играет === р.файл ? (
                  <div key={р.файл} className={s.ролик}>
                    <video className={s.роликКино} src={`/video/${р.файл}.mp4`} poster={`/video/${р.файл}.jpg`} controls autoPlay playsInline onEnded={() => setИграет(null)} />
                    <span className={s.роликИмя} title={р.имя}>{р.имя}</span>
                  </div>
                ) : (
                  <button key={р.файл} type="button" className={s.ролик} onClick={() => setИграет(р.файл)} aria-label={`Посмотреть: ${р.имя}. Со звуком`}>
                    <span className={s.роликПревью}>
                      <svg viewBox="0 0 160 104" width="100%" aria-hidden="true">
                        <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={от} /><stop offset="1" stopColor={до} /></linearGradient></defs>
                        <rect width="160" height="104" fill={`url(#${gid})`} />
                        {р.картинка()}
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
    </div>
  )
}
