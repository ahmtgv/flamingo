import { useEffect, useRef, type MouseEvent } from 'react'

/** Единая верхняя строка сайта (решение владельца 10.11.2026: «одна верхняя
 *  строка меню — с логотипом и одинаковым меню — на всех страницах»).
 *
 *  🔴 ОФОРМЛЕНИЕ ЖИВЁТ НЕ ЗДЕСЬ. Строку рисуют и статичные страницы `/sedum/`,
 *  которые React не видят. Поэтому стиль один — `public/site/site.css`,
 *  его подключает `index.html`; классы здесь те же, что в разметке статичных
 *  страниц. Меняешь пункт — меняй в трёх местах: здесь, в
 *  `public/sedum/index.html` и в `public/sedum/research-cabinet.html`.
 *
 *  Строка стоит везде, кроме урока: комната и вход в неё её не берут
 *  (владелец, 12.11.2026 — «везде кроме уроков»).
 */

export type Где = 'главная' | 'источники' | 'кабинет' | 'админка'
type Раздел = Где

const ПУНКТЫ: { имя: string; куда: string; раздел?: Раздел; внутри: boolean }[] = [
  { имя: 'Главная', куда: '/', раздел: 'главная', внутри: true },
  { имя: 'Источники мира', куда: '/hub', раздел: 'источники', внутри: true },
  /* Эти две страницы статичные: переход настоящий, не внутри приложения. */
  { имя: 'о SEduM', куда: '/sedum/', внутри: false },
  { имя: 'SEduM: AI & RND', куда: '/sedum/research-cabinet.html', внутри: false },
]

export function Шапка({ где, вошёл, админ = false, молчит = false, go }: {
  /** Какой пункт подсветить. Нет — страница не из меню (например, «Сообщения»). */
  где?: Раздел
  вошёл: boolean
  /** Владельцу — дверь в админку. Только в приложении: статичные страницы её не знают. */
  админ?: boolean
  /** Сервер учётных записей молчит: двери входа видны, но не нажимаются. */
  молчит?: boolean
  go: (to: string) => void
}) {
  const ещё = useRef<HTMLDetailsElement>(null)

  /* Меню телефона закрывается нажатием мимо и по Escape. */
  useEffect(() => {
    const закрыть = () => { if (ещё.current) ещё.current.open = false }
    const мимо = (e: Event) => {
      if (ещё.current?.open && e.target instanceof Node && !ещё.current.contains(e.target)) закрыть()
    }
    const клавиша = (e: KeyboardEvent) => { if (e.key === 'Escape') закрыть() }
    document.addEventListener('pointerdown', мимо)
    document.addEventListener('keydown', клавиша)
    return () => {
      document.removeEventListener('pointerdown', мимо)
      document.removeEventListener('keydown', клавиша)
    }
  }, [])

  /* Ссылка остаётся ссылкой (открыть в новой вкладке, скопировать адрес), а
     обычное нажатие ведёт внутри приложения, без перезагрузки страницы. */
  const внутрь = (куда: string, заперто = false) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (ещё.current) ещё.current.open = false
    if (!заперто) go(куда)
  }

  const разделы = админ ? [...ПУНКТЫ, { имя: 'Админка', куда: '/админ', раздел: 'админка' as Раздел, внутри: true }] : ПУНКТЫ
  const пункты = разделы.map((п) => (
    <a
      key={п.куда}
      href={п.куда}
      aria-current={'раздел' in п && п.раздел === где ? 'page' : undefined}
      onClick={п.внутри ? внутрь(п.куда) : undefined}
    >
      {п.имя}
    </a>
  ))

  const дверь = молчит
    ? { 'aria-disabled': true as const, title: 'Сервер учётных записей молчит — войти сейчас нельзя' }
    : {}

  return (
    <header className="flnav">
      <a className="flnav__logo" href="/" aria-label="Flamingo — на главную" onClick={внутрь('/')}>
        <img src="/flamingo-bird.svg" alt="" width={22} height={20} />
        <span>flamingo<b>.</b></span>
      </a>
      <nav className="flnav__items" aria-label="Разделы сайта">{пункты}</nav>
      <div className="flnav__side">
        {вошёл ? (
          <a className="flnav__pill" href="/кабинет" onClick={внутрь('/кабинет')}
             aria-current={где === 'кабинет' ? 'page' : undefined}>{где === 'кабинет' ? 'Кабинет' : 'Войти в кабинет'}</a>
        ) : (
          <>
            <a className="flnav__in" href="/вход" onClick={внутрь('/вход', молчит)} {...дверь}>Войти</a>
            <a className="flnav__pill" href="/регистрация" data-out="" onClick={внутрь('/регистрация', молчит)} {...дверь}>Завести учётную запись</a>
          </>
        )}
        <details className="flnav__more" ref={ещё}>
          <summary aria-label="Меню">
            <svg className="flnav__bars" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" /></svg>
            <svg className="flnav__x" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </summary>
          <nav className="flnav__panel" aria-label="Разделы сайта">
            {пункты}
            {вошёл ? null : (
              <a className="flnav__pill" href="/регистрация" onClick={внутрь('/регистрация', молчит)} {...дверь}>Завести учётную запись</a>
            )}
          </nav>
        </details>
      </div>
    </header>
  )
}
