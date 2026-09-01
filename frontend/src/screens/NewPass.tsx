import { useState } from 'react'

import { AuthError, resetPass, type Person } from '../lib/auth'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Mark } from '../ui/Mark'
import s from './Sign.module.css'

/** Новый пароль по ссылке из письма.
 *
 *  Экран живёт на своём адресе, а не в модальном окне: по ссылке из почты человек
 *  попадает сюда напрямую, и «закрыть окно» ему некуда возвращаться.
 *
 *  🔴 Ключ берётся из адреса и НИКУДА не показывается. Он равносилен паролю
 *  на ближайший час, поэтому не пишется ни в поле, ни в сообщение об ошибке.
 */
export function NewPass({ ключ, onDone, onBack }: {
  ключ: string
  onDone: (p: Person) => void
  onBack: () => void
}) {
  const [pass, setPass] = useState('')
  const [said, setSaid] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setSaid('')
    setBusy(true)
    try {
      onDone(await resetPass(ключ, pass))
    } catch (e) {
      setSaid(e instanceof AuthError ? e.message : 'Не вышло сменить пароль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={s.screen}>
      <div className={s.card}>
        <button type="button" className={s.back} onClick={onBack}>
          ← Ко входу
        </button>
        <Mark />

        <h1 className={s.title}>Новый пароль</h1>
        <p className={s.lead}>
          {ключ
            ? 'Задайте новый пароль — и вы сразу войдёте. Старый перестанет работать.'
            : 'В ссылке нет ключа. Похоже, адрес скопирован не целиком — откройте ссылку из письма ещё раз.'}
        </p>

        <form
          className={s.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
        >
          <Field
            label="Новый пароль"
            hint="От восьми знаков. Длина надёжнее сложности: четыре обычных слова лучше, чем «Xy7!»"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />

          {/* ПРАВИЛА 6.6: строка сообщения стоит всегда — макет не прыгает. */}
          <span className={s.say} role="status">{said}</span>

          <Button kind="go" type="submit" disabled={busy || !ключ}>
            {busy ? 'Меняем…' : 'Задать пароль и войти'}
          </Button>
        </form>

        <p className={s.foot}>
          Ссылка живёт час и срабатывает один раз. Если она уже не работает —
          попросите новую на экране входа: там есть «Забыли пароль».
        </p>
      </div>
    </main>
  )
}
