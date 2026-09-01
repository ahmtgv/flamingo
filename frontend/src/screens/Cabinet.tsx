import { useMemo } from 'react'

import type { Person } from '../lib/auth'
import { Mark } from '../ui/Mark'
import { newRoomCode } from '../lib/code'
import s from './Cabinet.module.css'

/** Личный кабинет — учителя и ученика.
 *
 *  🔴 Разложен по УТВЕРЖДЁННОМУ листу `docs/дизайн/листы/Кабинет учителя.dc.html`:
 *  три колонки через волосяные линии — работа слева, календарь в середине,
 *  действия справа. Лист образец, перерисовке не подлежит.
 *
 *  🔴 Данных о занятиях у продукта ПОКА НЕТ: справочника уроков не существует,
 *  сервер учётных записей их не хранит. Поэтому кабинет показывает не выдуманное
 *  расписание, а честное пустое состояние — оно объясняет словами, что здесь
 *  будет, и даёт одно живое действие (ПРАВИЛА 6.2). Нарисовать «7-Б · 24 ученика»
 *  там, где нет ни класса, ни ученика, значит соврать человеку в его же кабинете.
 */

const МЕСЯЦЫ = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const ДНИ = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** Клетки месяца: пустые места до первого числа плюс сами числа.
 *  Неделя начинается с понедельника — так её читают там, где мы работаем. */
function клеткиМесяца(now: Date): (number | null)[] {
  const год = now.getFullYear()
  const мес = now.getMonth()
  const первое = new Date(год, мес, 1)
  /* getDay(): воскресенье = 0. Нам нужен понедельник = 0. */
  const сдвиг = (первое.getDay() + 6) % 7
  const сколько = new Date(год, мес + 1, 0).getDate()
  const out: (number | null)[] = Array(сдвиг).fill(null)
  for (let d = 1; d <= сколько; d += 1) out.push(d)
  return out
}

/** Дверь, которой ещё нет: видна, названа, не нажимается, и сказано, чего ждёт
 *  (ПРАВИЛА 12.2–12.5). */
function Дверь({ имя, ждёт }: { имя: string; ждёт: string }) {
  return (
    <span className={s.door} aria-disabled="true" tabIndex={-1}>
      <span className={s.doorName}>{имя}</span>
      <span className={s.doorWhy}>{ждёт}</span>
    </span>
  )
}

export function Cabinet({ person, onLesson, onOut, onBack }: {
  person: Person
  /** Начать урок: кабинет открывает комнату и ведёт в неё. */
  onLesson: (code: string) => void
  onOut: () => void
  onBack: () => void
}) {
  const сегодня = useMemo(() => new Date(), [])
  const клетки = useMemo(() => клеткиМесяца(сегодня), [сегодня])
  const учитель = person.role === 'teacher'

  return (
    <main className={s.screen}>
      <header className={s.head}>
        <button type="button" className={s.back} onClick={onBack}>
          ← Занятие по ссылке
        </button>
        <Mark />
        <span className={s.crumb}>{учитель ? 'Кабинет преподавателя' : 'Мой учебный кабинет'}</span>
        <span className={s.who}>
          {person.name} ·{' '}
          <button type="button" className={s.out} onClick={onOut}>Выйти</button>
        </span>
      </header>

      <div className={s.body}>
        {/* ── слева: работа на сегодня ─────────────────────────────────── */}
        <section className={s.col}>
          <h2 className={s.h2}>{учитель ? 'Расписание на сегодня' : 'Мои уроки'}</h2>

          {/* ПРАВИЛА 6.2: пусто объясняет словами и всегда даёт одно действие. */}
          <div className={s.empty}>
            <span className={s.emptyHead}>
              {учитель ? 'Занятий на сегодня нет' : 'Уроков пока нет'}
            </span>
            <span className={s.emptyBody}>
              {учитель
                ? 'Расписание появится вместе с курсами: пока их негде хранить — справочник занятий ещё не поднят. Урок можно начать прямо сейчас, ссылку класс получит от вас.'
                : 'Здесь будут уроки, на которые вас записали, и всё, что на них происходило: доски, показанное, задания. Пока курсов нет, войти на урок можно по ссылке преподавателя.'}
            </span>
            {учитель ? (
              <button type="button" className={s.go} onClick={() => onLesson(newRoomCode())}>
                Начать урок сейчас
              </button>
            ) : (
              <button type="button" className={s.goQuiet} onClick={onBack}>
                Войти по ссылке
              </button>
            )}
          </div>
        </section>

        {/* ── середина: месяц ──────────────────────────────────────────── */}
        <section className={s.col}>
          <h2 className={s.h2}>Расписание на месяц</h2>

          <div className={s.monthTop}>
            <span className={s.monthName}>
              {МЕСЯЦЫ[сегодня.getMonth()]} {сегодня.getFullYear()}
            </span>
            {/* Число занятий не выдумываем: их пока негде взять. */}
            <span className={s.monthN}>занятий нет</span>
          </div>

          <div className={s.week}>
            {ДНИ.map((д) => (
              <span key={д} className={s.weekDay}>{д}</span>
            ))}
          </div>

          <div className={s.days}>
            {клетки.map((д, i) => (
              <span
                key={i}
                className={`${s.day} ${д === сегодня.getDate() ? s.dayNow : ''}`}
              >
                {д ?? ''}
              </span>
            ))}
          </div>

          <span className={s.legend}>точка — занятие · сегодня обведено</span>
        </section>

        {/* ── справа: действия ─────────────────────────────────────────── */}
        <section className={`${s.col} ${s.rail}`}>
          <h2 className={s.h2}>{учитель ? 'Действия' : 'Чаты с преподавателями'}</h2>

          {учитель ? (
            <div className={s.acts}>
              <button type="button" className={s.act} onClick={() => onLesson(newRoomCode())}>
                <span className={s.actName}>Начать урок сейчас</span>
                <span className={s.actWhy}>комната откроется, ссылку отправите классу</span>
              </button>
              <Дверь имя="Создать урок" ждёт="появится вместе с расписанием и курсами" />
              <Дверь имя="Мои методички" ждёт="то, из чего собираются занятия — после хранилища" />
              <Дверь имя="Мои ученики" ждёт="появятся, когда учеников можно будет записать на курс" />
              <Дверь имя="Повышение квалификации" ждёт="курсы и материалы для себя — позже" />
            </div>
          ) : (
            <div className={s.acts}>
              <div className={s.empty}>
                <span className={s.emptyHead}>Переписки пока нет</span>
                <span className={s.emptyBody}>
                  Здесь будут разговоры с преподавателями вне урока: вопросы,
                  ссылки, картинки и документы. Появятся вместе с курсом —
                  писать можно тому, кто вас учит.
                </span>
              </div>
              <Дверь имя="Мои методички" ждёт="то, что преподаватель дал к уроку" />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
