import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Person } from '../lib/auth'
import { Mark } from '../ui/Mark'
import { Беда, сделатьПриглашение, читатьЖурнал, type Журнал as Данные } from '../lib/study'
import { Переписка } from './Переписка'
import { разговоры } from '../lib/study'
import { useПоверх } from '../lib/окно'
import { useСегодня } from '../lib/сутки'
import s from './Journal.module.css'
import { Button } from '../ui/Button'
import { когдаУрок } from '../lib/пояс'
import { подписьСтолбца } from '../lib/datetime'

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

export function Journal({ person, onBack, onHome, onOut, onNew, onLesson, подложка, вРаме = false }: {
  person: Person
  onBack: () => void
  onHome: () => void
  onOut: () => void
  onNew: () => void
  onLesson: (код: string) => void
  /** 🔴 ЭКРАН ВНУТРИ ПОСТОЯННОЙ НАВИГАЦИИ (`ui/Рама.tsx`, решение владельца
   *  09–10.09). Тогда знак и «имя · Выйти» рисует рама, и повторять их в
   *  шапке экрана нельзя: два знака на одном экране — это не украшение,
   *  а вопрос «какой из них настоящий» (ПРАВИЛА 4.9: знак один на экран).
   *  Стенд и гость рисуют экран без рамы — там шапка прежняя. */
  вРаме?: boolean
  /** 🔴 ТОЛЬКО ДЛЯ СТЕНДА (`screens/Стенд.tsx`, живёт под `import.meta.env.DEV`).
   *  Готовый журнал вместо запроса: журнал живёт на сервере, и без него на
   *  стенде виден только отказ. А ломается он не на трёх занятиях, а на
   *  тридцати — тот же случай, что «кабинет-полный-день». */
  подложка?: Данные
}) {
  /* 🔴 В СОСТОЯНИИ ЛЕЖИТ СДВИГ ОТ ТЕКУЩЕГО МЕСЯЦА, А НЕ САМ МЕСЯЦ. Раньше здесь
     стоял `useState(() => new Date())` — месяц замерзал при открытии, и журнал,
     оставленный с вечера, в ночь на первое показывал прошлый месяц как текущий
     (тот же корень, что находка 17 аудита в кабинете).
     Сдвигом это чинится само и правильно: «ноль» значит «этот месяц» и после
     полуночи означает уже новый, а если преподаватель ушёл на два месяца
     вперёд, он и останется на два месяца вперёд — а не уедет назад. */
  const сегодня = useСегодня()
  const [сдвигМесяцев, setСдвигМесяцев] = useState(0)
  const когда = useMemo(() => {
    const d = new Date(сегодня)
    d.setDate(1)
    d.setMonth(d.getMonth() + сдвигМесяцев)
    return d
  }, [сегодня, сдвигМесяцев])
  const [данные, setДанные] = useState<Данные | null>(null)
  const [беда, setБеда] = useState('')
  const [зовём, setЗовём] = useState(false)

  const месяц = ключМесяца(когда)

  const обновить = useCallback(() => {
    let живо = true
    setБеда('')
    if (подложка) { setДанные(подложка); return () => { живо = false } }
    читатьЖурнал(месяц)
      .then((д) => { if (живо) setДанные(д) })
      .catch((e) => { if (живо) setБеда(e instanceof Беда ? e.message : 'Журнал не открылся.') })
    return () => { живо = false }
  }, [месяц, подложка])

  useEffect(() => обновить(), [обновить])

  const сдвиг = (на: number) => {
    setСдвигМесяцев((с) => с + на)
    setДанные(null)
  }

  const уроки = данные?.уроки ?? []

  /* 🔴 ВТОРАЯ СТРОКА СТОЛБЦА НЕСЁТ РАЗЛИЧИЕ, А НЕ ВРЕМЯ. Правило считается
     один раз здесь и живёт в `подписьСтолбца` (lib/datetime.ts), где оно
     проверено по случаям: один в дне — день недели, несколько — время, время
     совпало — название, совпало и оно — номер. Правило «несколько в дне, пишем
     время» стояло с 02.09 и разваливалось на двух занятиях в одно и то же
     время: 08.09 на боевом у владельца стояли «Алгеьра» и «Проверка связи»,
     оба 02.09 в 00:00, и столбцы вышли одинаковые.

     🔴 Часы читателя прогоняются ОДИН раз на весь экран, и группировка идёт по
     полученной дате. Столбец подписан датой читателя — значит и соседями по
     дню считаются те, кто у читателя в этом же дне. */
  const показ = уроки.map((у) => {
    const когда = когдаУрок(у.дата, у.время, у.пояс ?? '')
    return { у, когда, строка: { время: когда.время, название: у.название } }
  })
  const вДне = new Map<string, { время: string; название: string }[]>()
  for (const п of показ) {
    const с = вДне.get(п.когда.дата) ?? []
    с.push(п.строка)
    вДне.set(п.когда.дата, с)
  }
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
    /* Отказ здесь глотается НАРОЧНО и это единственное такое место: счётчик
       непрочитанного — украшение строки, а не смысл журнала. Экран журнала уже
       говорит словами, когда не открылся сам; вторая жалоба о том же сервере
       рядом ничего не добавит. */
    }).catch(() => {})
  }, [])
  useEffect(пересчитать, [пересчитать, месяц])
  const будущие = уроки.filter((у) => !у.прошёл)
  const прошедших = уроки.filter((у) => у.прошёл).length

  return (
    <main className={s.screen}>
      {вРаме ? null : (
        <header className={s.head}>
          <Mark onGo={onHome} title="Главная — кабинет" />
          <span className={s.crumb} title="Кабинет преподавателя · Журнал">
            Кабинет преподавателя · Журнал
          </span>
          <span className={s.who}>
            {person.name} ·{' '}
            <button type="button" className={s.out} onClick={onOut}>Выйти</button>
          </span>
        </header>
      )}

      <div className={s.body}>
        <div className={s.top}>
          <h1 className={s.title}>Журнал</h1>
          <p className={s.lead}>
            Все ученики и все занятия в одном месте. Строка — ученик, столбец — урок.
            Нажмите на дату, чтобы войти в комнату урока.
          </p>
        </div>

        <div className={s.pult}>
          <Button kind="go" onClick={() => setЗовём(true)}>
            Добавить ученика
          </Button>
          <Button kind="quiet" onClick={onNew}>Создать урок</Button>
          <Button kind="quiet" onClick={onBack}>← В кабинет</Button>
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
            <Button kind="go" onClick={() => setЗовём(true)}>
              Добавить ученика
            </Button>
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
                  {показ.map(({ у, когда, строка }) => {
                    /* 🔴 СТОЛБЕЦ СТОИТ НА ДАТЕ ЧИТАТЕЛЯ, А НЕ НА ДАТЕ СЕРВЕРА.
                       Урок в 05:00 по Владивостоку у калининградского ученика
                       приходится на ПРЕДЫДУЩИЙ день — и если бы столбец остался
                       на серверной дате, точка «был» стояла бы под чужим числом.
                       Часы преподавателя уходят в `title`: в столбце шириной в
                       пять знаков приписке места нет, а прочитать её надо. */
                    const д = new Date(`${когда.дата}T00:00:00`)
                    const свои = вДне.get(когда.дата) ?? []
                    return (
                      <button
                        key={у.id}
                        type="button"
                        className={`${s.hCell} ${у.прошёл ? '' : s.ahead}`}
                        /* 🔴 ДАТА В ИМЯ ЦЕЛИ. Без неё четыре столбца с одинаковым
                           названием и временем зовутся одинаково — а в журнале
                           столбец только датой и отличается. Глазами дата видна
                           в самой кнопке, голосом её съедал `title`: он имя цели
                           не дополняет, а ЗАМЕНЯЕТ. */
                        title={`${когда.дата.slice(8, 10)}.${когда.дата.slice(5, 7)} · ${у.название}`
                          + ` · ${когда.время}${когда.сноска ? ` · ${когда.сноска}` : ''}`}
                        onClick={() => onLesson(у.код)}
                      >
                        <span className={s.date}>
                          {когда.дата.slice(8, 10)}.{когда.дата.slice(5, 7)}
                        </span>
                        <span className={s.week}>
                          {подписьСтолбца(свои, свои.indexOf(строка), ДНИ[д.getDay()])}
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
  const поверх = useПоверх<HTMLDivElement>(onClose)
  const [ссылка, setСсылка] = useState('')
  const [до, setДо] = useState('')
  const [почта, setПочта] = useState('')
  const [сказано, setСказано] = useState('')
  const [беда, setБеда] = useState('')
  const [скопировано, setСкопировано] = useState(false)

  /* Ссылку делаем сразу: человек пришёл сюда за ней, а не за формой. */
  /* 🔴 «ДЕЛАЕМ ССЫЛКУ…» И «ССЫЛКА НЕ СДЕЛАЛАСЬ» СТОЯЛИ НА ЭКРАНЕ ВМЕСТЕ. Когда
     запрос падал, `ссылка` оставалась пустой, и коробка навсегда застревала на
     «делаем ссылку…», пока рядом висел отказ. Человек читал два взаимно
     исключающих ответа и ждал того, что уже не придёт. Аудит 07.09, находка 21. */
  const [ещё, setЕщё] = useState(0)
  useEffect(() => {
    let живо = true
    setБеда('')
    сделатьПриглашение()
      .then((r) => { if (живо) { setСсылка(r.ссылка); setДо(r.до) } })
      .catch((e) => { if (живо) setБеда(e instanceof Беда ? e.message : 'Сервер не ответил.') })
    return () => { живо = false }
  }, [ещё])

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
    <div className={s.veil}>
      <div ref={поверх} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Добавить ученика" className={s.panel}>
        <h2 className={s.panelTitle}>Добавить ученика</h2>
        <p className={s.panelLead}>
          Ученик приходит сам — по ссылке. Перешёл, назвался — и вы связаны:
          он видит вас в своих преподавателях, вы его в журнале.
        </p>

        <div className={s.wayBlock}>
          <span className={s.wayLabel}>Ссылка в журнал</span>
          <div className={s.linkBox} title={ссылка || undefined}>
            <code>{ссылка || (беда ? 'ссылки нет: ' + беда : 'делаем ссылку…')}</code>
            {ссылка ? (
              <button type="button" className={s.copy} onClick={копировать}>
                {скопировано ? 'Скопировано' : 'Скопировать'}
              </button>
            ) : беда ? (
              <button type="button" className={s.copy} onClick={() => { setСсылка(''); setЕщё((н) => н + 1) }}>
                Ещё раз
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
          {/* обрезание-исключение: коробка одинакова у ссылки и у поля почты,
              а внутри поля стоит то, что человек набрал сам, — читать ему
              нечего, и подсказывать нечем. */}
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
          <Button kind="go" onClick={письмом}>Отправить приглашение</Button>
          <button type="button" className={s.cancel} onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function почтаПохожа(a: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a)
}
