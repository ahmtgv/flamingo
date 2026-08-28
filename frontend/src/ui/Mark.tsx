import s from './Mark.module.css'

/** Знак и слово. Один на экран, всегда одинаковый (ПРАВИЛА 4.9). */
export function Mark({ quiet = false }: { quiet?: boolean }) {
  return (
    <span className={`${s.mark} ${quiet ? s.quiet : ''}`}>
      <img src="/flamingo-bird.svg" alt="" width={20} height={20} aria-hidden />
      Flamingo
    </span>
  )
}
