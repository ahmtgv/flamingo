import { useEffect, useRef, useState } from 'react'

import { useОкно } from '../ui/окно'
import { СТРЕЛКА, УГОЛ } from '../ui/знаки'
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
 *   — у каждой реплики имя и время отдельной строкой.
 *
 *  🔴 ПРАВКИ ВЛАДЕЛЬЦА 04.09. Чат стал спокойнее и подвижнее:
 *   — окно возят за шапку и тянут за угол (общая механика — `ui/окно.ts`);
 *   — пузырей нет: реплика — строка текста, а не облачко. Зелёного тем более:
 *     цвет в переписке не значит ничего, а шумит на весь экран;
 *   — В ГРУППОВОМ ЧАТЕ ВСЕ РЕПЛИКИ СЛЕВА. Правая сторона в общем разговоре
 *     врала: она говорит «это другая сторона беседы», а сторон здесь не две,
 *     а весь класс. Кто написал — сказано именем, мелким и светлым;
 *   — «Отправить» словом заменена стрелкой в самом поле.
 *
 *  ⚠️ Без учётных записей переписка нигде не хранится: все вышли — чат исчез.
 *  Это сказано словами в самом чате, а не спрятано (утверждённый лист «Комната урока»).
 */

/** 🔴 Ссылка в реплике — живая, и открывается ОНА В ЗАНЯТИИ, а не новой вкладкой:
 *  новая вкладка уносит человека из урока, и обратно он возвращается не всегда
 *  (решение владельца 31.08, то же правило, что у ссылок из HUB).
 *
 *  Разбор нарочно грубый: `https://…`, `http://…` и `www.…`. Хитрый разбор адресов
 *  ошибается на краях — например, на точке в конце предложения, — а цена ошибки
 *  здесь высокая: класс уходит не туда, куда звал преподаватель. */
const АДРЕС = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi

/** Хвостовая пунктуация в адрес не входит: «смотрите tass.ru.» — это точка
 *  предложения, а не часть ссылки. */
function почистить(t: string): string {
  return t.replace(/[.,;:!?)\]]+$/, '')
}

function куски(text: string) {
  const out: { сам: string; ссылка?: string }[] = []
  let last = 0
  for (const m of text.matchAll(АДРЕС)) {
    const i = m.index ?? 0
    if (i > last) out.push({ сам: text.slice(last, i) })
    const чистый = почистить(m[0])
    out.push({ сам: чистый, ссылка: чистый.startsWith('www.') ? `https://${чистый}` : чистый })
    if (чистый.length < m[0].length) out.push({ сам: m[0].slice(чистый.length) })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ сам: text.slice(last) })
  return out
}

/** Время реплики — в поясе смотрящего (ПРАВИЛА 8.5). */
const часы = (at: number) =>
  new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

export function Chat({ lines, alive, onClose, onSend, onOpen }: {
  lines: Line[]
  /** Связь с комнатой. Нет связи — сообщение не уйдёт, и об этом надо сказать. */
  alive: boolean
  onClose: () => void
  onSend: (text: string) => void
  /** Открыть адрес из реплики — рамкой в занятии, а не новой вкладкой. */
  onOpen: (url: string) => void
}) {
  const [text, setText] = useState('')
  const [failed, setFailed] = useState(false)
  const tail = useRef<HTMLDivElement>(null)
  const окно = useОкно({ ширина: 380, минШирина: 300, минВысота: 280 })

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
    <aside ref={окно.поставить} style={окно.стиль} className={s.chat}
           aria-label="Чат занятия" data-geo="панель-чата">
      {/* Шапка — ручка окна: за неё возят. Кнопка внутри при этом работает. */}
      <header className={s.head} {...окно.везтиЗа}>
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
            /* Все слева: сторон в общем разговоре не две, а весь класс. */
            <div key={l.id} className={s.line}>
              <span className={s.who}>
                {l.mine ? 'вы' : l.who}
                <span className={s.at}>{часы(l.at)}</span>
              </span>
              <span className={s.text}>
                {куски(l.text).map((к, i) =>
                  к.ссылка ? (
                    <button
                      key={i}
                      type="button"
                      className={s.link}
                      title={`Открыть ${к.ссылка} в занятии`}
                      onClick={() => onOpen(к.ссылка as string)}
                    >
                      {к.сам}
                    </button>
                  ) : (
                    <span key={i}>{к.сам}</span>
                  ),
                )}
              </span>
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
        {/* Стрелка вместо слова: подпись «Отправить» занимала треть строки
            ввода и повторяла то, что и так понятно по месту и по Enter. */}
        <button type="submit" className={s.send} disabled={!text.trim()}
                aria-label="Отправить" title="Отправить">
          {СТРЕЛКА}
        </button>
      </form>

      {/* Угол: за него тянут размер. Держится в самом низу справа. */}
      <span className={s.grip} {...окно.тянутьЗа} aria-hidden="true">{УГОЛ}</span>
    </aside>
  )
}
