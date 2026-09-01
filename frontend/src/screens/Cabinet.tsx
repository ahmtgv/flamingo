import { useEffect, useMemo, useState } from 'react'

import type { Person } from '../lib/auth'
import { Mark } from '../ui/Mark'
import { newRoomCode } from '../lib/code'
import { сегодняСтрокой } from '../lib/lessons'
import { гдеЛежат, читатьУроки, type Урок } from '../lib/study'
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

/** Строка занятия в расписании. Время слева, название посередине, вход справа —
 *  тот же порядок чтения, что и во всём кабинете. */
function Строка({ у, onGo, onEdit }: { у: Урок; onGo: () => void; onEdit: () => void }) {
  const пособий = у.материалы.length
  return (
    <div className={s.row}>
      <span className={s.rowWhen}>{у.время}</span>
      <button type="button" className={s.rowBody} onClick={onEdit} title="Поправить урок">
        <span className={s.rowName}>{у.название}</span>
        <span className={s.rowSub}>
          {у.минут} мин · {у.код}{пособий ? ` · ${пособий} матер.` : ''}
        </span>
      </button>
      <button type="button" className={s.rowGo} onClick={onGo}>Войти</button>
    </div>
  )
}

export function Cabinet({ person, onLesson, onNew, onEdit, onJournal, onOut, onHome }: {
  person: Person
  /** Начать урок: кабинет открывает комнату и ведёт в неё. */
  onLesson: (code: string) => void
  /** Создать урок на будущее — отдельный экран. */
  onNew: () => void
  /** Поправить заведённый урок — тот же экран в другом состоянии. */
  onEdit: (id: string) => void
  onJournal: () => void
  onOut: () => void
  /** Домой — то есть в кабинет. На самом кабинете знак обновляет его же. */
  onHome: () => void
}) {
  const сегодня = useMemo(() => new Date(), [])
  const клетки = useMemo(() => клеткиМесяца(сегодня), [сегодня])
  const учитель = person.role === 'teacher'
  const месяц = `${сегодня.getFullYear()}-${String(сегодня.getMonth() + 1).padStart(2, '0')}`

  /* 🔴 Занятия спрашиваем у сервера; если его нет — у браузера. Что именно
     вышло, видно по `гдеЛежат()`, и об этом сказано словами ниже: умалчивать,
     что расписание живёт в одной вкладке, нельзя (ПРАВИЛА 6.3). */
  const [все, setВсе] = useState<Урок[] | null>(null)
  useEffect(() => {
    let живо = true
    читатьУроки(месяц)
      .then((у) => { if (живо) setВсе(у) })
      .catch(() => { if (живо) setВсе([]) })
    return () => { живо = false }
  }, [месяц])

  const дом = гдеЛежат()
  const сегодняСтрока = сегодняСтрокой(сегодня)
  const наСегодня = (все ?? []).filter((у) => у.дата === сегодняСтрока)
  const занятые = new Set((все ?? []).map((у) => Number(у.дата.slice(8, 10))))
  const всего = (все ?? []).length

  return (
    <main className={s.screen}>
      <header className={s.head}>
        {/* 🔴 Дороги назад из кабинета нет, и это верно: кабинет и ЕСТЬ главная
            (решение владельца 01.09). Кнопка «← Занятие по ссылке» вела на
            посадочную страницу, которой больше не существует. */}
        <Mark onGo={onHome} title="Главная — кабинет" />
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

          {/* Занятия есть — показываем их, а не рассказ о том, что их нет. */}
          {учитель && наСегодня.length ? (
            <div className={s.rows}>
              {наСегодня.map((у) => (
                <Строка key={у.id} у={у} onGo={() => onLesson(у.код)} onEdit={() => onEdit(у.id)} />
              ))}
              {дом === 'браузер' ? (
                <span className={s.emptyWay}>
                  Уроки пока хранятся в этом браузере: сервер занятий не отвечает.
                  На другом устройстве этого расписания не будет.
                </span>
              ) : null}
              <button type="button" className={s.go} onClick={() => onLesson(newRoomCode())}>
                Начать урок сейчас
              </button>
            </div>
          ) : (
          /* ПРАВИЛА 6.2: пусто объясняет словами и всегда даёт одно действие. */
          <div className={s.empty}>
            <span className={s.emptyHead}>
              {учитель ? 'Занятий на сегодня нет' : 'Уроков пока нет'}
            </span>
            <span className={s.emptyBody}>
              {учитель
                ? (дом === 'браузер'
                  ? 'Урок на будущее заводится кнопкой «Создать урок» справа. Сервер занятий сейчас не отвечает, поэтому расписание живёт в этом браузере и на другом устройстве его не будет. Начать прямо сейчас можно всегда.'
                  : 'Урок на будущее заводится кнопкой «Создать урок» справа. А начать прямо сейчас можно всегда: ссылку класс получит от вас.')
                : 'Здесь будут уроки, на которые вас записали, и всё, что на них происходило: доски, показанное, задания. Пока курсов нет, войти на урок можно по ссылке преподавателя.'}
            </span>
            {/* 🔴 У ученика тут НЕТ кнопки, и это не забытая кнопка. Войти на урок
                он может только по ссылке преподавателя — своей страницы «введите
                код» у нас нет и не планируется. Нарисовать дверь, за которой
                ничего нет, хуже, чем сказать словами (ПРАВИЛА 12.2). */}
            {учитель ? (
              <button type="button" className={s.go} onClick={() => onLesson(newRoomCode())}>
                Начать урок сейчас
              </button>
            ) : (
              <span className={s.emptyWay}>
                Ссылка приходит от преподавателя — в сообщении или письме.
                Откройте её, и комната пустит вас по имени.
              </span>
            )}
          </div>
          )}
        </section>

        {/* ── середина: месяц ──────────────────────────────────────────── */}
        <section className={s.col}>
          <h2 className={s.h2}>Расписание на месяц</h2>

          <div className={s.monthTop}>
            <span className={s.monthName}>
              {МЕСЯЦЫ[сегодня.getMonth()]} {сегодня.getFullYear()}
            </span>
            {/* Число берётся из тех же занятий, что и расписание. Не выдумывается. */}
            <span className={s.monthN}>
              {всего ? `занятий ${всего}` : 'занятий нет'}
            </span>
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
                {д !== null && занятые.has(д) ? <span className={s.dot} /> : null}
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
              <button type="button" className={s.act} onClick={onNew}>
                <span className={s.actName}>Создать урок</span>
                <span className={s.actWhy}>урок на будущее: название, дата, время</span>
              </button>
              <button type="button" className={s.act} onClick={onJournal}>
                <span className={s.actName}>Журнал</span>
                <span className={s.actWhy}>ученики и занятия: кто был, кого позвать</span>
              </button>
              <Дверь имя="Мои методички" ждёт="то, из чего собираются занятия — после хранилища" />
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
