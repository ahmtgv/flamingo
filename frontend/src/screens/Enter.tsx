import { useState } from 'react'

import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Mark } from '../ui/Mark'
import { newRoomCode } from '../lib/code'
import type { Person } from '../lib/auth'
import s from './Enter.module.css'

type Props = {
  /** Код из адреса. Есть — человека позвали; нет — он начинает сам. */
  invited: string | null
  initialName: string
  onGo: (code: string, name: string) => void
  onHub: () => void
  onSign: () => void
  onCabinet: () => void
  onOut: () => void
  /** Кто вошёл. Урок по ссылке работает и без учётной записи. */
  person: Person | null
}

/** Первая страница.
 *
 *  🔴 Разложена по листу `docs/дизайн/от-дизайна-31.08/Первая страница.dc.html`
 *  и записке к нему. Карточка в центре пустого поля разбита на две колонки:
 *  слева обещание, справа одно действие. Порядок чтения тот же, что был, —
 *  900 px высоты работают целиком, а не на треть.
 *
 *  🔴 Кнопка Flamingo HUB с тела экрана убрана (решение владельца 31.08) и
 *  переехала НАВЕРХ, в служебную строку. Настоящее верхнее меню появится
 *  вместе с кабинетом преподавателя — до тех пор наверху живёт одна дверь.
 */
export function Enter({ invited, initialName, onGo, onHub, onSign, onCabinet, onOut, person }: Props) {
  const [name, setName] = useState(initialName)
  const [said, setSaid] = useState(false)

  const go = () => {
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!clean) {
      setSaid(true)
      return
    }
    onGo(invited ?? newRoomCode(), clean)
  }

  return (
    <main className={s.screen}>
      {/* Верх: знак и двери, которые не про этот урок. */}
      <header className={s.top}>
        <Mark />
        <span className={s.topGap} />
        <button type="button" className={s.topLink} onClick={onHub}>
          Flamingo HUB
        </button>
        {person ? (
          <>
            <button type="button" className={s.topLink} onClick={onCabinet}>
              {person.role === 'teacher' ? 'Кабинет' : 'Мой учебный кабинет'}
            </button>
            <span className={s.who}>
              {person.name} ·{' '}
              <button type="button" className={s.out} onClick={onOut}>Выйти</button>
            </span>
          </>
        ) : null}
      </header>

      <div className={s.body} data-geo="кадр-первой-страницы">
        {/* Левая колонка — обещание. Вес несёт типографика, а не цвет (ПРАВИЛА 5.6). */}
        <section className={s.promise}>
          <h1 className={s.title}>{invited ? 'Вас ждут в комнате' : 'Занятие по ссылке'}</h1>
          <p className={s.lead}>
            {invited
              ? 'Назовитесь — и входите. Ни регистрации, ни установки.'
              : 'Комната для урока: доска, лица и голос. Вы открываете комнату и зовёте класс ссылкой — ученику ни регистрации, ни установки.'}
          </p>

          <span className={s.rule} />
          {/* Слова владельца, 31.08. */}
          <span className={s.three}>
            лицо<span className={s.dot}>·</span>голос<span className={s.dot}>·</span>аналитика
          </span>

          {/* Сказано один раз и словами: и про камеру, и про то, что урок нигде
              не остаётся. Это сноска — она не спорит по весу с абзацем выше. */}
          <p className={s.foot}>
            В комнате включаются камера и микрофон — браузер спросит разрешение. Урок не
            записывается, а доска живёт, пока в комнате есть хоть один человек: чтобы она
            осталась после урока, её сохраняют в файл.
          </p>
        </section>

        {/* Правая колонка — одно действие. */}
        <section className={s.card}>
          {invited ? <code className={s.code}>{invited}</code> : null}

          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault()
              go()
            }}
          >
            <Field
              label="Как вас зовут"
              hint="Под этим именем вас увидит класс. Без него войти нельзя."
              placeholder="Например, Аня"
              value={name}
              maxLength={40}
              autoFocus
              onChange={(e) => {
                setName(e.target.value)
                setSaid(false)
              }}
            />

            {/* 🔴 Место под сообщение занято ВСЕГДА и ровно в три строки
                (ПРАВИЛА 6.6, `data-geo` листа «строка-сообщения»): иначе появление
                отказа сдвигает кнопку, и человек нажимает не туда, куда целился. */}
            <div className={s.say} data-geo="строка-сообщения" role="status">
              {said ? (
                <>
                  <span className={s.sayHead}>Сначала имя</span>
                  <span className={s.sayBody}>
                    Без имени класс не поймёт, кто открыл комнату. Одного слова достаточно.
                  </span>
                </>
              ) : null}
            </div>

            <Button kind="go" type="submit" data-geo="главное-действие">
              {invited ? 'Войти в комнату' : 'Создать комнату'}
            </Button>
          </form>

          {/* Дверь входа — не третья кнопка в столбик, а строка под вопросом:
              заливка на экране одна и принадлежит входу в комнату (ПРАВИЛА 11.4). */}
          {person ? null : (
            <p className={s.ask}>
              Уже есть учётная запись?{' '}
              <button type="button" className={s.signLink} onClick={onSign}>
                Войти или завести учётную запись
              </button>
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
