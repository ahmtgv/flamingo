import { useEffect, useRef, useState } from 'react'

import s from './Chat.module.css'

export type Line = { id: string; who: string; text: string; at: number; mine: boolean }

/** Чат занятия.
 *
 *  🔴 Разложен по листу `docs/дизайн/от-дизайна-31.08/Чат занятия.dc.html`.
 *  Что вылечено против прежнего кода:
 *   — панель отъедала треть холста и не сжималась: теперь 380 px, и она ПАРИТ
 *     над доской, ничего не сжимая (правило владельца 01.09: поле доски идёт
 *     влево, вправо и вниз без края);
 *   — «Отправить» была приглушена всегда: теперь живая, как только в поле есть текст;
 *   — строка сообщения стоит всегда, поэтому лента и поле не прыгают между состояниями;
 *   — у каждой реплики имя и время отдельной строкой, свои — справа.
 *
 *  ⚠️ Без учётных записей переписка нигде не хранится: все вышли — чат исчез.
 *  Это сказано словами в самом чате, а не спрятано (утверждённый лист «Комната урока»).
 */

/** Время реплики — в поясе смотрящего (ПРАВИЛА 8.5). */
const часы = (at: number) =>
  new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export function Chat({ lines, alive, onClose, onSend }: {
  lines: Line[]
  /** Связь с комнатой. Нет связи — сообщение не уйдёт, и об этом надо сказать. */
  alive: boolean
  onClose: () => void
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const [failed, setFailed] = useState(false)
  const tail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tail.current?.scrollIntoView({ block: 'end' })
  }, [lines.length])

  const send = () => {
    const clean = text.trim()
    if (!clean) return
    /* 🔴 Состояния «отправляем» здесь нет намеренно: сообщение уходит в тот же
       кадр, и секундная надпись «Отправляем» была бы театром, а не состоянием.
       Настоящих веток две: ушло — или не ушло, потому что связи нет. */
    if (!alive) {
      setFailed(true)
      return
    }
    setFailed(false)
    onSend(clean)
    setText('')
  }

  return (
    <aside className={s.chat} aria-label="Чат занятия" data-geo="панель-чата">
      <header className={s.head}>
        <span className={s.title}>Чат занятия</span>
        {/* Значок рисованный, а не глиф шрифта: глиф на части машин
            не отрисовывается и оставляет пустой квадрат. */}
        <button type="button" className={s.close} onClick={onClose}
                aria-label="Закрыть чат" title="Закрыть чат">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
               strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12 M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className={s.body} data-geo="лента">
        {lines.length === 0 ? (
          /* ПРАВИЛА 6.2: пусто объясняет словами, что здесь будет. */
          <p className={s.empty}>
            Здесь появятся вопросы класса. Пока учётных записей нет, переписка живёт только
            во время урока: все вышли — чат исчез.
          </p>
        ) : (
          lines.map((l) => (
            <div key={l.id} className={`${s.line} ${l.mine ? s.mine : ''}`}>
              <span className={s.who}>
                {l.mine ? 'вы' : l.who}
                <span className={s.at}>{часы(l.at)}</span>
              </span>
              <span className={s.text}>{l.text}</span>
            </div>
          ))
        )}
        <div ref={tail} />
      </div>

      {/* Место под сообщение занято всегда: лента и поле не двигаются, когда
          отказ появляется и исчезает (ПРАВИЛА 6.6). */}
      <div className={s.say} data-geo="строка-сообщения" role="status">
        {failed ? (
          <span className={s.sayBox}>
            <span className={s.sayHead}>Сообщение не ушло</span>
            <span className={s.sayBody}>
              Связь с комнатой прервалась. Текст сохранён в поле — нажмите «Отправить»
              ещё раз. Доска и голос работают.
            </span>
          </span>
        ) : null}
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
          onChange={(e) => {
            setText(e.target.value)
            setFailed(false)
          }}
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
