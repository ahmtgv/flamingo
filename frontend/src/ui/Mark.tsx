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
 *  🔴 Знак — ДВЕРЬ ДОМОЙ: и птица, и слово нажимаются и ведут в кабинет.
 *  Знак без `onGo` остаётся просто знаком — на экране входа вести некуда,
 *  и притворяться дверью он не должен (ПРАВИЛА 14.1).
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
    return <span className={`${s.mark} ${quiet ? s.quiet : ''}`}>{внутри}</span>
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
