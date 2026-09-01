import s from './Mark.module.css'

/** Знак и слово. Один на экран, всегда одинаковый (ПРАВИЛА 4.9).
 *
 *  🔴 Знак — ДВЕРЬ ДОМОЙ (решение владельца 01.09): и птица, и слово нажимаются
 *  и ведут в кабинет. Так устроен всякий продукт, и человек это пробует первым
 *  делом, не читая подсказок. Знак без `onGo` остаётся просто знаком — на экране
 *  входа вести некуда, и притворяться дверью он не должен (ПРАВИЛА 14.1).
 */
export function Mark({ quiet = false, onGo, title }: {
  quiet?: boolean
  onGo?: () => void
  title?: string
}) {
  const внутри = (
    <>
      <img src="/flamingo-bird.svg" alt="" width={20} height={20} aria-hidden />
      Flamingo
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
