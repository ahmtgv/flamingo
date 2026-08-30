import { useEffect, useRef, useState } from 'react'

import s from './Chat.module.css'

export type Line = { id: string; who: string; text: string; at: number; mine: boolean }

/** Чат занятия.
 *
 *  ⚠️ Без учётных записей переписка нигде не хранится: все вышли — чат исчез.
 *  Это сказано словами в самом чате, а не спрятано (утверждённый лист «Комната урока»).
 */
export function Chat({ lines, onClose, onSend }: {
  lines: Line[]
  onClose: () => void
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const tail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tail.current?.scrollIntoView({ block: 'end' })
  }, [lines.length])

  const send = () => {
    const clean = text.trim()
    if (!clean) return
    onSend(clean)
    setText('')
  }

  return (
    <aside className={s.chat} aria-label="Чат занятия">
      <header className={s.head}>
        <span className={s.title}>Чат занятия</span>
        <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть чат">
          ✕
        </button>
      </header>

      <div className={s.body}>
        {lines.length === 0 ? (
          /* ПРАВИЛА 6.2: пусто объясняет словами, что здесь будет. */
          <p className={s.empty}>
            Здесь появятся вопросы класса. Пока учётных записей нет, переписка живёт только
            во время урока: все вышли — чат исчез.
          </p>
        ) : (
          lines.map((l) => (
            <p key={l.id} className={`${s.line} ${l.mine ? s.mine : ''}`}>
              <span className={s.who}>{l.mine ? 'вы' : l.who}</span>
              <span className={s.text}>{l.text}</span>
            </p>
          ))
        )}
        <div ref={tail} />
      </div>

      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          className={s.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Спросить или ответить"
          maxLength={500}
          aria-label="Сообщение в чат"
        />
        <button type="submit" className={s.send} disabled={!text.trim()}>
          Отправить
        </button>
      </form>
    </aside>
  )
}
