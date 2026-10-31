import s from './Mark.module.css'

/** Знак и словесный знак. Один на экран, всегда одинаковый (ПРАВИЛА 4.9).
 *
 *  🔴 СЛОВЕСНЫЙ ЗНАК — `flamingo` строчными и коралловая точка. Так он задан
 *  в связке `docs/дизайн/знаки/flamingo-lockup.svg` и в кривых
 *  `flamingo-logo.svg` — это исходное написание (владелец, 01.09). В продукте
 *  он был набран «Flamingo» с прописной и без точки: своевольная замена,
 *  которой в знаках нет. Точка берёт `--color-accent` — токен так и подписан
 *  в наборе: «logo dot».
 *
 *  🔴 Птица на 15 % крупнее слова (владелец, 01.09): 23 px против прежних 20.
 *
 *  🔴 Знак — ДВЕРЬ НА ГЛАВНУЮ ИЗ ЛЮБОГО МЕСТА (владелец, 31.10: «нажимая на
 *  логотип из любого сценария — пользователя переносит на главную, это всегда
 *  flamingo.plus»). С `onGo` ведёт туда, куда скажет экран (в приложении —
 *  всегда `/`); без `onGo` — обычная ссылка на `/`, чтобы и вход, и ожидание,
 *  и битая ссылка вели домой. Ни один знак больше не молчит (ПРАВИЛА 14.1).
 */
export function Mark({ quiet = false, onGo, title }: {
  quiet?: boolean
  onGo?: () => void
  title?: string
}) {
  const внутри = (
    <>
      <img className={s.bird} src="/flamingo-bird.svg" alt="" width={23} height={23} aria-hidden />
      <span className={s.word}>
        flamingo<span className={s.dot}>.</span>
      </span>
    </>
  )

  if (!onGo) {
    return (
      <a href="/" className={`${s.mark} ${s.link} ${quiet ? s.quiet : ''}`} title="Главная" aria-label="Главная">
        {внутри}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={`${s.mark} ${s.link} ${quiet ? s.quiet : ''}`}
      onClick={onGo}
      title={title ?? 'На главную'}
      aria-label={title ?? 'На главную'}
    >
      {внутри}
    </button>
  )
}
