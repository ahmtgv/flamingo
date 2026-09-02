import { useCallback, useEffect, useState } from 'react'

import type { Person } from '../lib/auth'
import { Mark } from '../ui/Mark'
import { Беда, сделатьПриглашение, читатьЖурнал, type Журнал as Данные } from '../lib/study'
import { Переписка } from './Переписка'
import { разговоры } from '../lib/study'
import s from './Journal.module.css'

/** Журнал: все ученики и все занятия.
 *
 *  🔴 Разложен по листу `docs/дизайн/листы-журнал/Журнал.html`. Форма не
 *  выдумана: строка — ученик, столбец — занятие. Этой сетке четыреста лет,
 *  преподаватель узнаёт её без объяснений, и придумывать вместо неё нечего.
 *
 *  🔴 Ученик добавляется ССЫЛКОЙ, а не поиском по справочнику (решение владельца
 *  01.09). Поиск по почте или телефону — это способ перебором собрать базу почт
 *  наших учеников; ссылка такого не позволяет вовсе. Почта осталась как второй
 *  путь к той же ссылке, и ответ на неё один и тот же, есть у нас такая почта
 *  или нет.
 *
 *  🔴 Отметки о посещении ставит КОМНАТА, а не рука: она знает, кто вошёл.
 *  Поэтому в таблице нет ни одной кнопки «отметить» — и это не забытая кнопка.
 */

const МЕСЯЦЫ = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const ДНИ = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

const ключМесяца = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function Journal({ person, onBack, onHome, onOut, onNew, onLesson }: {
  person: Person
  onBack: () => void
  onHome: () => void
  onOut: () => void
  onNew: () => void
  onLesson: (код: string) => void
}) {
  const [когда, setКогда] = useState(() => new Date())
  const [данные, setДанные] = useState<Данные | null>(null)
  const [беда, setБеда] = useState('')
  const [зовём, setЗовём] = useState(false)

  const месяц = ключМесяца(когда)

  const обновить = useCallback(() => {
    let живо = true
    setБеда('')
    читатьЖурнал(месяц)
      .then((д) => { if (живо) setДанные(д) })
      .catch((e) => { if (живо) setБеда(e instanceof Беда ? e.message : 'Журнал не открылся.') })
    return () => { живо = false }
  }, [месяц])

  useEffect(() => обновить(), [обновить])

  const сдвиг = (на: number) => {
    const d = new Date(когда)
    d.setDate(1)
    d.setMonth(d.getMonth() + на)
    setКогда(d)
    setДанные(null)
  }

  const уроки = данные?.уроки ?? []

  /* 🔴 КОГДА В ДНЕ НЕ ОДНО ЗАНЯТИЕ, ДЕНЬ НЕДЕЛИ ВО ВТОРОЙ СТРОКЕ ЗАМЕНЯЕТСЯ
     ВРЕМЕНЕМ. Три занятия второго сентября давали три одинаковых столбца
     «02.09 / ср»: различить их можно было только наведя мышь — а на планшете
     подсказок нет вовсе. Время короткое, встаёт в ту же строку и делает
     столбцы разными. День недели при этом не теряется: когда занятие в дне
     одно, всё как было. */
  const сколькоВДне = new Map<string, number>()
  for (const у of уроки) сколькоВДне.set(у.дата, (сколькоВДне.get(у.дата) ?? 0) + 1)
  const ученики = данные?.ученики ?? []

  /* 🔴 ПЕРЕПИСКА ОТКРЫВАЕТСЯ ИЗ СТРОКИ УЧЕНИКА (решение владельца 02.09).
     Отдельного списка «сообщения» нет нарочно: ученики уже стоят строками
     журнала, и второй список тех же людей — это второе место, где их искать.
     Непрочитанное считает сервер; здесь оно только показывается.
     Цвет зелёный, а не коралловый: коралловым мы красим то, что портится от
     ожидания (решение владельца 24.08), а сообщение не портится — оно никуда
     не денется. */
  const [говорим, setГоворим] = useState<{ кто: string; имя: string } | null>(null)
  const [непрочитано, setНепрочитано] = useState<Map<string, number>>(new Map())
  const пересчитать = useCallback(() => {
    разговоры().then((р) => {
      if (!р) return
      setНепрочитано(new Map(р.map((х) => [х.кто, х.непрочитано])))
    })
  }, [])
  useEffect(пересчитать, [пересчитать, месяц])
  const будущие = уроки.filter((у) => !у.прошёл)
  const прошедших = уроки.filter((у) => у.прошёл).length

  return (
    <main className={s.screen}>
      <header className={s.head}>
        <Mark onGo={onHome} title="Главная — кабинет" />
        <span className={s.crumb}>Кабинет преподавателя · Журнал</span>
        <span className={s.who}>
          {person.name} ·{' '}
          <button type="button" className={s.out} onClick={onOut}>Выйти</button>
        </span>
      </header>

      <div className={s.body}>
        <div className={s.top}>
          <h1 className={s.title}>Журнал</h1>
          <p className={s.lead}>
            Все ученики и все занятия в одном месте. Строка — ученик, столбец — урок.
            Нажмите на дату, чтобы войти в комнату урока.
          </p>
        </div>

        <div className={s.pult}>
          <button type="button" className={s.go} onClick={() => setЗовём(true)}>
            Добавить ученика
          </button>
          <button type="button" className={s.quiet} onClick={onNew}>Создать урок</button>
          <button type="button" className={s.quiet} onClick={onBack}>← В кабинет</button>
          <span className={s.month}>
            <button type="button" className={s.arrow} onClick={() => сдвиг(-1)} aria-label="Месяц назад">‹</button>
            <span className={s.monthName}>{МЕСЯЦЫ[когда.getMonth()]} {когда.getFullYear()}</span>
            <button type="button" className={s.arrow} onClick={() => сдвиг(1)} aria-label="Месяц вперёд">›</button>
          </span>
        </div>

        {беда ? (
          <div className={s.empty}>
            <span className={s.emptyHead}>Журнал не открылся</span>
            <span className={s.emptyBody}>{беда}</span>
          </div>
        ) : !данные ? (
          <span className={s.lead}>Смотрим журнал…</span>
        ) : !ученики.length ? (
          /* ПРАВИЛА 6.2: пусто объясняет словами и даёт одно действие. */
          <div className={s.empty}>
            <span className={s.emptyHead}>Учеников пока нет</span>
            <span className={s.emptyBody}>
              Журнал наполняется не вводом с клавиатуры, а связью: ученик приходит
              сам, и с этого момента вы видите друг друга — он вас в своих
              преподавателях, вы его здесь.
            </span>
            <div className={s.ways}>
              <div className={s.way}>
                <span className={s.wayName}>Ссылка в журнал</span>
                <span className={s.wayWhat}>
                  Отправьте её как угодно — в мессенджере, письмом, голосом.
                  Перешёл — и вы связаны.
                </span>
              </div>
              <div className={s.way}>
                <span className={s.wayName}>По почте</span>
                <span className={s.wayWhat}>
                  Ту же ссылку отправим мы. Ответ один и тот же, есть у нас такая
                  почта или нет: узнать по журналу, кто зарегистрирован, нельзя.
                </span>
              </div>
            </div>
            <button type="button" className={s.go} onClick={() => setЗовём(true)}>
              Добавить ученика
            </button>
          </div>
        ) : (
          <>
            <div className={s.wrap}>
              <div
                className={s.grid}
                style={{
                  ['--скольких' as string]: String(Math.max(уроки.length, 1)),
                  ['--кто' as string]: '17rem',
                }}
              >
                <div className={`${s.row} ${s.headRow}`}>
                  <span className={s.hCell}>
                    <span className={s.colLabel}>Ученик · {ученики.length}</span>
                  </span>
                  {уроки.map((у) => {
                    const д = new Date(`${у.дата}T00:00:00`)
                    return (
                      <button
                        key={у.id}
                        type="button"
                        className={`${s.hCell} ${у.прошёл ? '' : s.ahead}`}
                        title={`${у.название} · ${у.время}`}
                        onClick={() => onLesson(у.код)}
                      >
                        <span className={s.date}>
                          {у.дата.slice(8, 10)}.{у.дата.slice(5, 7)}
                        </span>
                        <span className={s.week}>
                          {(сколькоВДне.get(у.дата) ?? 0) > 1 ? у.время : ДНИ[д.getDay()]}
                        </span>
                      </button>
                    )
                  })}
                  {!уроки.length ? <span className={s.hCell}><span className={s.week}>уроков нет</span></span> : null}
                  <span className={s.hCell}><span className={s.colLabel}>Был</span></span>
                </div>

                {ученики.map((у) => (
                  <div key={у.id} className={s.row}>
                    <span className={s.name}>
                      {/* 🔴 ОБРЕЗАННОЕ ИМЯ ОБЯЗАНО ИМЕТЬ `title` (ПРАВИЛА 13.2).
                          «Пётр Вячеславович Хмельницки…» — 82 px срезано, и
                          узнать целиком было негде: в журнале имя единственное
                          место, где человек назван. */}
                      <button
                        type="button"
                        className={s.nameWho}
                        title={`Написать: ${у.имя}`}
                        onClick={() => setГоворим({ кто: у.id, имя: у.имя })}
                      >
                        {у.имя}
                        {(непрочитано.get(у.id) ?? 0) > 0 ? (
                          <span className={s.новые}>{непрочитано.get(у.id)}</span>
                        ) : null}
                      </button>
                      <span className={s.nameHow}>по {у.как} · с {у.с.slice(8, 10)}.{у.с.slice(5, 7)}</span>
                    </span>
                    {уроки.map((урок, i) => (
                      <span
                        key={урок.id}
                        className={`${s.cell} ${урок.прошёл ? '' : s.cellAhead}`}
                      >
                        {урок.прошёл
                          ? (у.был[i] ? <i className={s.was} /> : <i className={s.wasnt} />)
                          : null}
                      </span>
                    ))}
                    {!уроки.length ? <span className={s.cell} /> : null}
                    <span className={s.sum}>
                      <b>{у.был.filter((б, i) => б && уроки[i]?.прошёл).length}</b>
                      &nbsp;/&nbsp;{прошедших}
                    </span>
                  </div>
                ))}

                <div className={`${s.row} ${s.footRow}`}>
                  <span className={s.name}>Пришли на урок</span>
                  {уроки.map((урок, i) => (
                    <span key={урок.id} className={`${s.sum} ${урок.прошёл ? '' : s.cellAhead}`}>
                      {урок.прошёл ? ученики.filter((у) => у.был[i]).length : '—'}
                    </span>
                  ))}
                  {!уроки.length ? <span className={s.sum} /> : null}
                  <span className={s.sum} />
                </div>
              </div>
            </div>

            <div className={s.legend}>
              <i><span className={s.was} /> был на уроке</i>
              <i><span className={s.wasnt} /> не был</i>
              <i>пусто — урок ещё не прошёл</i>
            </div>

            {данные.ждут.length ? (
              <span className={s.small}>
                Ждут перехода по ссылке: {данные.ждут.length}. Пока человек не
                перешёл, в журнале его нет — и это честно: связи ещё не случилось.
              </span>
            ) : null}
          </>
        )}
      </div>

      {зовём ? (
        <Зовём
          onClose={() => { setЗовём(false); обновить() }}
        />
      ) : null}
      {говорим ? (
        <Переписка
          кто={говорим.кто}
          имя={говорим.имя}
          веду
          уроки={будущие}
          onClose={() => { setГоворим(null); пересчитать() }}
          onПрочитано={пересчитать}
        />
      ) : null}
    </main>
  )
}

/** Панель «Добавить ученика»: одноразовая ссылка и почта как второй путь к ней. */
function Зовём({ onClose }: { onClose: () => void }) {
  const [ссылка, setСсылка] = useState('')
  const [до, setДо] = useState('')
  const [почта, setПочта] = useState('')
  const [сказано, setСказано] = useState('')
  const [беда, setБеда] = useState('')
  const [скопировано, setСкопировано] = useState(false)

  /* Ссылку делаем сразу: человек пришёл сюда за ней, а не за формой. */
  useEffect(() => {
    let живо = true
    сделатьПриглашение()
      .then((r) => { if (живо) { setСсылка(r.ссылка); setДо(r.до) } })
      .catch((e) => { if (живо) setБеда(e instanceof Беда ? e.message : 'Ссылка не сделалась.') })
    return () => { живо = false }
  }, [])

  const письмом = async () => {
    const адрес = почта.trim().toLowerCase()
    if (!почтаПохожа(адрес)) {
      setБеда('Почта должна быть похожа на почту: имя@почта.рф.')
      return
    }
    setБеда('')
    try {
      const r = await сделатьПриглашение(адрес)
      setСказано(r.сказать)
      setПочта('')
    } catch (e) {
      setБеда(e instanceof Беда ? e.message : 'Письмо не отправилось.')
    }
  }

  const копировать = async () => {
    try {
      await navigator.clipboard.writeText(ссылка)
      setСкопировано(true)
    } catch {
      setБеда('Браузер не дал скопировать. Выделите ссылку и скопируйте руками.')
    }
  }

  return (
    <div className={s.veil} role="dialog" aria-label="Добавить ученика">
      <div className={s.panel}>
        <h2 className={s.panelTitle}>Добавить ученика</h2>
        <p className={s.panelLead}>
          Ученик приходит сам — по ссылке. Перешёл, назвался — и вы связаны:
          он видит вас в своих преподавателях, вы его в журнале.
        </p>

        <div className={s.wayBlock}>
          <span className={s.wayLabel}>Ссылка в журнал</span>
          <div className={s.linkBox}>
            <code>{ссылка || 'делаем ссылку…'}</code>
            {ссылка ? (
              <button type="button" className={s.copy} onClick={копировать}>
                {скопировано ? 'Скопировано' : 'Скопировать'}
              </button>
            ) : null}
          </div>
          <span className={s.small}>
            {до
              ? `Живёт до ${до.slice(8, 10)}.${до.slice(5, 7)} и добавляет одного человека.`
              : 'Живёт семь дней и добавляет одного человека.'}
          </span>
        </div>

        <div className={s.or}>или</div>

        <div className={s.wayBlock}>
          <span className={s.wayLabel}>Отправить по почте</span>
          <div className={s.linkBox}>
            <input
              className={s.mailField}
              placeholder="имя@почта.рф"
              value={почта}
              onChange={(e) => { setПочта(e.target.value); setСказано(''); setБеда('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); письмом() } }}
            />
          </div>
          <span className={s.small}>
            Пришлём ту же ссылку письмом. Ответ будет один и тот же, есть у нас
            такая почта или нет: иначе журнал стал бы способом проверять, кто
            у нас зарегистрирован.
          </span>
        </div>

        <span className={s.small} role="status">{беда || сказано}</span>

        <div className={s.panelFoot}>
          <button type="button" className={s.go} onClick={письмом}>Отправить приглашение</button>
          <button type="button" className={s.cancel} onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function почтаПохожа(a: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a)
}
