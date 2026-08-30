import { useState } from 'react'

import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Mark } from '../ui/Mark'
import { newRoomCode } from '../lib/code'
import s from './Enter.module.css'

type Props = {
  /** Код из адреса. Есть — человека позвали; нет — он начинает сам. */
  invited: string | null
  initialName: string
  onGo: (code: string, name: string) => void
}

export function Enter({ invited, initialName, onGo }: Props) {
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
      <div className={s.card}>
        <Mark />

        <h1 className={s.title}>{invited ? 'Вас ждут в комнате' : 'Занятие по ссылке'}</h1>
        <p className={s.lead}>
          {invited
            ? 'Назовитесь — и входите. Ни регистрации, ни установки.'
            : 'Комната для урока: доска, лица и голос. Учётных записей пока нет — вы открываете комнату и зовёте класс ссылкой.'}
        </p>

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

          {/* ПРАВИЛА 6.6: строка сообщения стоит всегда — макет не прыгает от её появления. */}
          <span className={s.say} role="status">
            {said ? 'Не сказано, как вас зовут.' : ''}
          </span>

          <Button kind="go" type="submit">
            {invited ? 'Войти в комнату' : 'Создать комнату'}
          </Button>
        </form>

        {/* Сказано один раз и словами: и про камеру, и про то, что урок нигде не остаётся. */}
        <p className={s.foot}>
          В комнате включаются камера и микрофон — браузер спросит разрешение. Урок не
          записывается, а доска живёт, пока в комнате есть хоть один человек: чтобы она
          осталась после урока, её сохраняют в файл.
        </p>
      </div>
    </main>
  )
}
