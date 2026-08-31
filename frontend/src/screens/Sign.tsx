import { useState } from 'react'

import { AuthError, forgot, login, register, type Person } from '../lib/auth'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Mark } from '../ui/Mark'
import s from './Sign.module.css'

/** Вход и регистрация — один экран с двумя дорогами.
 *
 *  Пароль не хранится у нас в открытом виде и не уезжает никуда, кроме этой формы.
 *  Учётная запись нужна для того, чтобы урок оставался после урока: без неё комната
 *  живёт ровно столько, сколько в ней есть люди.
 */
/** 🔴 Восстановление пароля живёт только на НАШЕМ сервере: письма шлёт он.
 *  Пока учётные записи идут через функции Cloudflare, пути /forgot нет вовсе —
 *  и кнопка «Забыли пароль» вела бы в пустоту (проверено на боевом: 405).
 *  Дверь, которая не открывается, хуже отсутствующей: человек жмёт и решает,
 *  что сломались мы. Поэтому её просто нет, пока нет сервера. */
const ЕСТЬ_ВОССТАНОВЛЕНИЕ = Boolean(import.meta.env.VITE_AUTH_URL)

export function Sign({ onDone, onBack }: { onDone: (p: Person) => void; onBack: () => void }) {
  const [mode, setMode] = useState<'in' | 'new' | 'forgot'>('in')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Person['role']>('teacher')
  const [pass, setPass] = useState('')
  const [said, setSaid] = useState('')
  /* Спокойный ответ отдельно от отказа: коралловый только когда аларм. */
  const [calm, setCalm] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setSaid('')
    setCalm('')
    setBusy(true)
    try {
      if (mode === 'forgot') {
        const r = await forgot(email.trim())
        setCalm(r.said)
        return
      }
      const person = mode === 'in'
        ? await login(email.trim(), pass)
        : await register(email.trim(), name, role, pass)
      onDone(person)
    } catch (e) {
      setSaid(e instanceof AuthError ? e.message : 'Не вышло войти.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={s.screen}>
      <div className={s.card}>
        <button type="button" className={s.back} onClick={onBack}>
          ← Назад
        </button>
        <Mark />

        <h1 className={s.title}>
          {mode === 'in' ? 'Вход' : mode === 'new' ? 'Новая учётная запись' : 'Забыли пароль'}
        </h1>
        <p className={s.lead}>
          {mode === 'in'
            ? 'Войдите, чтобы уроки, доски и записи оставались за вами.'
            : mode === 'new'
              ? 'Учётная запись нужна, чтобы урок оставался после урока: доски, конспект и оценки перестают исчезать вместе с комнатой.'
              : 'Пришлём на почту ссылку, по которой можно задать новый пароль. Ссылка живёт час и срабатывает один раз.'}
        </p>

        {/* 🔴 noValidate. С родной проверкой браузера отказ приходил ПО-АНГЛИЙСКИ
            («A part followed by '@' should not contain the symbol 'н'») и на нашу
            же подсказку «имя@почта.рф». Отказ должен говорить нашими словами
            и по-русски (ПРАВИЛА 6.4), поэтому пузырь браузера выключен, а проверку
            делает сервер. type="email" оставлен: от него клавиатура на телефоне. */}
        <form
          className={s.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
        >
          <Field
            label="Почта"
            hint={mode === 'forgot'
              ? 'Та, на которую заводили учётную запись — письмо уйдёт на неё'
              : 'Нужна, чтобы вас узнали при следующем входе'}
            placeholder="имя@почта.рф"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode === 'new' ? (
            <>
              <Field
                label="Как вас зовут"
                hint="Это имя увидит класс"
                placeholder="Например, Наталья Ким"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />

              <div className={s.roles} role="radiogroup" aria-label="Кто вы">
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === 'teacher'}
                  className={`${s.role} ${role === 'teacher' ? s.roleOn : ''}`}
                  onClick={() => setRole('teacher')}
                >
                  Веду уроки
                  <span className={s.roleWhy}>открываю комнату и зову класс</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === 'student'}
                  className={`${s.role} ${role === 'student' ? s.roleOn : ''}`}
                  onClick={() => setRole('student')}
                >
                  Учусь
                  <span className={s.roleWhy}>вхожу по ссылке преподавателя</span>
                </button>
              </div>
            </>
          ) : null}

          {mode === 'forgot' ? null : (
          <Field
            label="Пароль"
            hint={mode === 'new'
              ? 'От восьми знаков. Длина надёжнее сложности: четыре обычных слова лучше, чем «Xy7!»'
              : 'Тот, что вы задали при регистрации'}
            type="password"
            autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          )}

          {/* ПРАВИЛА 6.6: строка сообщения стоит всегда — макет не прыгает. */}
          <span className={s.say} role="status">{said}</span>
          {calm ? <span className={s.calm} role="status">{calm}</span> : null}

          <Button kind="go" type="submit" disabled={busy}>
            {busy
              ? 'Ждём…'
              : mode === 'in' ? 'Войти'
              : mode === 'new' ? 'Завести учётную запись'
              : 'Прислать ссылку'}
          </Button>
        </form>

        <div className={s.swaps}>
          <button
            type="button"
            className={s.swap}
            onClick={() => {
              setMode(mode === 'in' ? 'new' : 'in')
              setSaid('')
              setCalm('')
            }}
          >
            {mode === 'in'
              ? 'Учётной записи ещё нет — завести'
              : mode === 'forgot'
                ? 'Вспомнил пароль — войти'
                : 'Учётная запись уже есть — войти'}
          </button>
          {/* Дверь «забыли пароль» стоит только на входе: в регистрации забывать нечего. */}
          {mode === 'in' && ЕСТЬ_ВОССТАНОВЛЕНИЕ ? (
            <button
              type="button"
              className={s.swap}
              onClick={() => {
                setMode('forgot')
                setSaid('')
                setCalm('')
              }}
            >
              Забыли пароль
            </button>
          ) : null}
        </div>

        <p className={s.foot}>
          Пароль хранится не как пароль: у нас лежит только его отпечаток, по которому
          пароль не восстановить. Урок по ссылке работает и без учётной записи — она нужна,
          чтобы он оставался после урока.
        </p>
      </div>
    </main>
  )
}
