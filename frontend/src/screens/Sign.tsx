import { useState } from 'react'

import { AuthError, forgot, login, register, type Person } from '../lib/auth'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Mark } from '../ui/Mark'
import s from './Sign.module.css'

/** Вход и регистрация — один экран, три режима.
 *
 *  🔴 Разложен по листу `docs/дизайн/от-дизайна-31.08/Вход и регистрация.dc.html`
 *  и записке к нему: две колонки, слева обещание и сноска, справа одно действие.
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

type Mode = 'in' | 'new' | 'forgot'

/** Заголовок и подпись кнопки — по режиму. Слова листа. */
const ЗАГОЛОВОК: Record<Mode, string> = {
  in: 'Вход',
  new: 'Новая учётная запись',
  forgot: 'Забыли пароль',
}

const КНОПКА: Record<Mode, string> = {
  in: 'Войти',
  new: 'Завести учётную запись',
  forgot: 'Прислать ссылку',
}

const ЖДЁМ: Record<Mode, string> = {
  in: 'Проверяем…',
  new: 'Заводим запись…',
  forgot: 'Отправляем ссылку…',
}

const ОБЪЯСНЕНИЕ: Record<Mode, string> = {
  in: 'Войдите, чтобы уроки, доски и записи оставались за вами.',
  new: 'Учётная запись нужна, чтобы урок оставался после урока: доски, конспект и оценки перестают исчезать вместе с комнатой.',
  forgot: 'Пришлём на почту ссылку, по которой можно задать новый пароль. Ссылка живёт час и срабатывает один раз.',
}

/** «Пусто» и «загружается» — тексты листа дословно. Отказ приходит от сервера
 *  и своими словами: он знает, что именно не сошлось, а лист не знает. */
const ПУСТО: Record<Mode, [string, string]> = {
  in: ['Заполните почту и пароль', 'Без почты мы не поймём, кто входит; без пароля — что это вы.'],
  new: ['Осталось имя и пароль', 'Имя увидит класс, пароль — от восьми знаков. Роль уже выбрана.'],
  forgot: ['Нужна почта', 'Та, на которую заведена запись.'],
}

const ИДЁТ: Record<Mode, [string, string]> = {
  in: ['Проверяем пароль', 'Это одна-две секунды. Введённое остаётся на месте.'],
  new: ['Заводим запись', 'Сначала проверим, что почта свободна, потом сохраним пароль отпечатком.'],
  forgot: ['Отправляем ссылку', 'Письмо приходит в течение минуты. Страницу можно закрыть.'],
}

/** 🔴 «Назад» приходит НЕ ВСЕГДА. Ученик, свернувший сюда с приглашения,
 *  возвращается к своей комнате; человек, открывший вход прямо или только что
 *  вышедший, возвращаться некуда — и кнопка, ведущая на этот же экран, была бы
 *  дверью в стену. Дороги назад нет — значит её и не рисуем (ПРАВИЛА 14.1). */
export function Sign({ onDone, onBack }: { onDone: (p: Person) => void; onBack?: () => void }) {
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Person['role']>('teacher')
  const [pass, setPass] = useState('')
  /* Отказ и спокойный ответ — разные вещи: коралловый только когда аларм. */
  const [said, setSaid] = useState('')
  const [calm, setCalm] = useState('')
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)

  /** Чего не хватает, чтобы нажать. Считается тем же кодом, что и подпись
      состояния «пусто»: два места врали бы по-разному. */
  const пусто =
    !email.trim() ||
    (mode !== 'forgot' && !pass) ||
    (mode === 'new' && !name.trim())

  const смени = (m: Mode) => {
    setMode(m)
    setSaid('')
    setCalm('')
    setTried(false)
  }

  const go = async () => {
    setSaid('')
    setCalm('')
    if (пусто) {
      setTried(true)
      return
    }
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

  /* Строка сообщения одна на все состояния и стоит всегда (ПРАВИЛА 6.6). */
  const сообщение: { вид: 'спокойно' | 'аларм'; голова: string; тело: string } | null =
    busy ? { вид: 'спокойно', голова: ИДЁТ[mode][0], тело: ИДЁТ[mode][1] }
    : said ? { вид: 'аларм', голова: said, тело: '' }
    : calm ? { вид: 'спокойно', голова: calm, тело: '' }
    : tried && пусто ? { вид: 'спокойно', голова: ПУСТО[mode][0], тело: ПУСТО[mode][1] }
    : null

  return (
    <main className={s.screen}>
      <div className={s.body}>
        {/* Левая колонка — где я, куда вернуться и почему это вообще нужно. */}
        <section className={s.promise}>
          {onBack ? (
            <button type="button" className={s.back} onClick={onBack}>
              ← Назад в комнату
            </button>
          ) : null}
          <Mark />

          <h1 className={s.title} data-geo="заголовок">{ЗАГОЛОВОК[mode]}</h1>

          {/* Место под объяснение держится числом строк: у режимов текст разной
              длины, и заголовок не должен ездить (ПРАВИЛА 6.7а). */}
          <p className={s.lead} data-geo="объяснение">{ОБЪЯСНЕНИЕ[mode]}</p>

          <span className={s.rule} />

          <p className={s.foot}>
            Пароль хранится не как пароль: у нас лежит только его отпечаток, по которому
            пароль не восстановить. Урок по ссылке работает и без учётной записи — она нужна,
            чтобы он оставался после урока.
          </p>
        </section>

        {/* Правая колонка — одно действие. */}
        <section className={s.card}>
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

                {/* Выбор роли — нейтральный: сильная рамка и приглушённая заливка
                    (ПРАВИЛА 5.7). Зелёного здесь нет, роль — не «можно дальше». */}
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

            {/* Место занято всегда и посчитано по самому длинному состоянию:
                кнопка и переключатель режима не двигаются (ПРАВИЛА 6.6). */}
            <div
              className={`${s.say} ${сообщение?.вид === 'аларм' ? s.sayAlarm : ''}`}
              data-geo="строка-сообщения"
              role="status"
            >
              {сообщение ? (
                <>
                  <span className={s.sayHead}>{сообщение.голова}</span>
                  {сообщение.тело ? <span className={s.sayBody}>{сообщение.тело}</span> : null}
                </>
              ) : null}
            </div>

            <Button kind="go" type="submit" disabled={busy} data-geo="главное-действие">
              {busy ? ЖДЁМ[mode] : КНОПКА[mode]}
            </Button>
          </form>

          <div className={s.swaps}>
            <button
              type="button"
              className={s.swap}
              onClick={() => смени(mode === 'in' ? 'new' : 'in')}
            >
              {mode === 'in'
                ? 'Учётной записи ещё нет — завести'
                : mode === 'forgot'
                  ? 'Вспомнил пароль — войти'
                  : 'Учётная запись уже есть — войти'}
            </button>
            {/* Дверь «забыли пароль» стоит только на входе и в правом углу подвала:
                в регистрации забывать нечего. */}
            {mode === 'in' && ЕСТЬ_ВОССТАНОВЛЕНИЕ ? (
              <button type="button" className={s.swapQuiet} onClick={() => смени('forgot')}>
                Забыли пароль
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
