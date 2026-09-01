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
 *  🔴 ЯЗЫК НЕ ВЫДУМАН. Это тот же лист, по которому сделаны вход и регистрация
 *  (`docs/дизайн/от-дизайна-31.08/Вход и регистрация.dc.html`): две колонки,
 *  слева обещание и сноска, справа одно действие в белой карточке, зелёная
 *  кнопка во всю ширину карточки. Первая версия была голым столбцом полей на
 *  сером поле — она не совпадала ни с одним экраном продукта, и это был дефект,
 *  а не вкусовщина.
 *
 *  Верхняя строка — кабинетная: экран живёт внутри учётной записи, и человек
 *  должен видеть, где он и как выйти.
 *
 *  🔴 «Когда» — одна мысль из трёх коротких ответов, поэтому дата, время и
 *  длительность стоят одной строкой. Поле под «45» шириной в карточку врёт
 *  о том, сколько туда писать.
 *
 *  🔴 Дата и время — свои поля с маской, а не родные `type="date"`/`type="time"`:
 *  те приносят чужой значок и формат из языка системы (`09/01/2026`, `10:00 AM`).
 *  Разбор и проверка — в `lib/datetime.ts`.
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
      setСказать(['Сначала название', 'По нему урок видно в расписании, а класс поймёт, куда пришёл.'])
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
        {/* Левая колонка — где я, куда вернуться и что сейчас произойдёт. */}
        <section className={s.promise}>
          <button type="button" className={s.back} onClick={onBack}>
            ← В кабинет
          </button>

          <h1 className={s.title}>Создать урок</h1>

          <p className={s.lead}>
            Урок встанет в расписание, и у него сразу будет своя комната:
            войти в неё можно из кабинета в любой момент — и до начала, и после.
          </p>

          <span className={s.rule} />

          <p className={s.foot}>
            Пока уроки хранятся в этом браузере: сервера занятий ещё нет, и на
            другом устройстве этого расписания не будет. Комната и ссылка на неё
            работают везде и всегда — они живут не здесь.
          </p>
        </section>

        {/* Правая колонка — одно действие. */}
        <section className={s.card}>
          <form
            className={s.form}
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              создать()
            }}
          >
            <Field
              label="Название"
              placeholder="Например, Алгебра — квадратные уравнения"
              value={название}
              maxLength={120}
              autoFocus
              onChange={(e) => { setНазвание(e.target.value); setСказать(null) }}
            />

            <div className={s.when}>
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
                label="Длительность, мин"
                inputMode="numeric"
                placeholder="45"
                value={минут}
                onChange={(e) => { setМинут(e.target.value.replace(/\D/g, '').slice(0, 3)); setСказать(null) }}
              />
            </div>

            <div className={s.say} role="status">
              {сказать ? (
                <>
                  <span className={s.sayHead}>{сказать[0]}</span>
                  <span className={s.sayBody}>{сказать[1]}</span>
                </>
              ) : null}
            </div>

            <button type="submit" className={s.go}>Создать урок</button>
          </form>
        </section>
      </div>
    </main>
  )
}
