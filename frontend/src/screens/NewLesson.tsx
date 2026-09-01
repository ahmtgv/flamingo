import { useState } from 'react'

import type { Person } from '../lib/auth'
import { Field } from '../ui/Field'
import { Mark } from '../ui/Mark'
import { завести, сегодняСтрокой, type Урок } from '../lib/lessons'
import {
  датаВМашинную, датаИзМашинной, маскаВремени, маскаДаты, времяЦелое,
} from '../lib/datetime'
import s from './NewLesson.module.css'

/** Экран «Создать урок».
 *
 *  🔴 Разложен по заданию 01.09 (`docs/дизайн/ЗАДАНИЕ-СОЗДАТЬ-УРОК.md`), список
 *  содержимого исчерпывающий: верхняя строка кабинета · заголовок · четыре поля
 *  одно под другим · зелёная кнопка · тихая дорога назад. Больше нет ничего,
 *  и низ страницы пуст намеренно.
 *
 *  🔴 Оформление не изобретается: поля — общий `ui/Field`, кнопка — тот же
 *  `--color-go-solid`, что у «Начать урок сейчас» в кабинете. Экран обязан
 *  выглядеть так, будто его рисовали с кабинетом в один день.
 *
 *  Единственное, чего нет в списке задания, — строка сообщения под полями.
 *  Она обязательна: форма, которая отказывает молча, сломана (ПРАВИЛА 6.6),
 *  и место под неё занято всегда, чтобы кнопка не прыгала.
 *
 *  🔴 Дата и время — свои поля с маской, а не родные `type="date"`/`type="time"`:
 *  те приносят чужой значок и формат из языка системы (`09/01/2026`, `10:00 AM`).
 *  Разбор и проверка — в `lib/datetime.ts`, там же сказано почему.
 */

/** Ближайший круглый час — чтобы поле времени не было пустым без нужды. */
function ближайшийЧас(now: Date = new Date()): string {
  const ч = now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours()
  return `${String(ч % 24).padStart(2, '0')}:00`
}

export function NewLesson({ person, onDone, onBack, onOut, onHome }: {
  person: Person
  /** Урок заведён. Дальше решает вызывающий — сегодня это возврат в кабинет. */
  onDone: (у: Урок) => void
  onBack: () => void
  onOut: () => void
  onHome: () => void
}) {
  const [название, setНазвание] = useState('')
  const [дата, setДата] = useState(() => датаИзМашинной(сегодняСтрокой()))
  const [время, setВремя] = useState(() => ближайшийЧас())
  const [минут, setМинут] = useState('45')
  const [сказать, setСказать] = useState<[string, string] | null>(null)

  const создать = () => {
    const имя = название.trim().replace(/\s+/g, ' ').slice(0, 120)
    if (!имя) {
      setСказать(['Сначала название', 'По нему урок видно в расписании.'])
      return
    }
    const машинная = датаВМашинную(дата)
    if (!машинная) {
      setСказать(['Дата — днём, месяцем и годом', 'Например, 03.09.2026.'])
      return
    }
    if (!времяЦелое(время)) {
      setСказать(['Время — часами и минутами', 'Например, 14:00.'])
      return
    }
    const м = Number(минут)
    if (!Number.isFinite(м) || м < 5 || м > 480) {
      setСказать(['Длительность — от 5 до 480 минут', 'Обычный урок — 45.'])
      return
    }
    onDone(завести({ название: имя, дата: машинная, время, минут: Math.round(м) }))
  }

  return (
    <main className={s.screen}>
      <header className={s.head}>
        <Mark onGo={onHome} title="Главная — кабинет" />
        <span className={s.crumb}>Кабинет преподавателя · Создать урок</span>
        <span className={s.who}>
          {person.name} ·{' '}
          <button type="button" className={s.out} onClick={onOut}>Выйти</button>
        </span>
      </header>

      <div className={s.body}>
        <form
          className={s.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            создать()
          }}
        >
          <h1 className={s.title}>Создать урок</h1>

          <Field
            label="Название"
            placeholder="Например, Алгебра"
            value={название}
            maxLength={120}
            autoFocus
            onChange={(e) => { setНазвание(e.target.value); setСказать(null) }}
          />

          <Field
            label="Дата"
            inputMode="numeric"
            placeholder="дд.мм.гггг"
            value={дата}
            onChange={(e) => { setДата(маскаДаты(e.target.value)); setСказать(null) }}
          />

          <Field
            label="Время"
            inputMode="numeric"
            placeholder="чч:мм"
            value={время}
            onChange={(e) => { setВремя(маскаВремени(e.target.value)); setСказать(null) }}
          />

          <Field
            label="Длительность"
            inputMode="numeric"
            placeholder="45"
            hint="в минутах"
            value={минут}
            onChange={(e) => { setМинут(e.target.value.replace(/\D/g, '').slice(0, 3)); setСказать(null) }}
          />

          <div className={s.say} role="status">
            {сказать ? (
              <>
                <span className={s.sayHead}>{сказать[0]}</span>
                <span className={s.sayBody}>{сказать[1]}</span>
              </>
            ) : null}
          </div>

          <button type="submit" className={s.go}>Создать урок</button>

          <button type="button" className={s.back} onClick={onBack}>← В кабинет</button>
        </form>
      </div>
    </main>
  )
}
