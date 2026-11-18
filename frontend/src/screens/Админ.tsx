import { useCallback, useEffect, useState } from 'react'

import * as сервер from '../lib/админ'
import type { Действие, Группа, Запись, Сводка, УрокВсех, Человек } from '../lib/админ'
import type { Person } from '../lib/auth'
import '../styles/хаб.css'
import s from './Админ.module.css'
import { ЛОКАЛЬ, тр } from '../lib/язык.ts'

/** Админка владельца (решение 10.11.2026, по утверждённому эскизу).
 *
 *  Три колонки: слева — разделы, в середине — то, что выбрано слева, справа —
 *  то, что выбрано в середине. Оформление — та же шкала, что у «Источников
 *  мира» (`styles/хаб.css`): эскизы нарисованы одной рукой.
 *
 *  🔴 ЭКРАН ПРАВ НЕ ДАЁТ. Кто админ, на каждом запросе решает сервер
 *  (`backend/people/админка.py`); чужому он откажет, и экран покажет отказ
 *  словами сервера. Пароли здесь не видит никто: «ссылка на смену пароля» —
 *  одноразовая, владелец сам передаёт её человеку.
 *
 *  🔴 ДОКУМЕНТЫ ПРЕПОДАВАТЕЛЯ ПОКА НЕ ЗАГРУЖАЮТСЯ — это следующий шаг. Строки
 *  документов стоят, как на эскизе, и честно говорят «не приложен».
 */

type Раздел = Группа | 'subjects' | 'lessons' | 'science' | 'log'

const РАЗДЕЛЫ: { группа: string; пункты: { id: Раздел; имя: string; счёт?: keyof Сводка; скоро?: boolean }[] }[] = [
  { группа: тр("Люди"), пункты: [
    { id: 'wait', имя: тр("Ждут проверки"), счёт: 'ждут' },
    { id: 'teachers', имя: тр("Учителя"), счёт: 'учителей' },
    { id: 'students', имя: тр("Ученики"), счёт: 'учеников' },
    { id: 'blocked', имя: тр("Заблокированы"), счёт: 'заблокировано' },
  ] },
  { группа: тр("Учёба"), пункты: [
    { id: 'subjects', имя: тр("Предметы"), скоро: true },
    { id: 'lessons', имя: тр("Уроки"), счёт: 'уроков' },
  ] },
  { группа: 'SEduM', пункты: [{ id: 'science', имя: тр("Кабинет исследования"), счёт: 'добровольцев' }] },
  { группа: тр("Служебное"), пункты: [{ id: 'log', имя: тр("Журнал действий") }] },
]

const ДОКУМЕНТЫ = [тр("Паспорт"), тр("Резюме"), тр("Диплом об образовании"), тр("Степени и регалии"), тр("Рекомендации"), тр("Примеры уроков")]

const ЧТО: Record<string, string> = {
  verify: тр("подтвердил преподавателя"), reject: тр("отклонил преподавателя"), block: 'заблокировал',
  unblock: 'разблокировал', email_ok: тр("подтвердил почту"), email_no: тр("снял подтверждение почты"),
  note: тр("записал заметку"), reset_link: тр("выдал ссылку на смену пароля"),
}

const людской = (р: Раздел): р is Группа => р === 'wait' || р === 'teachers' || р === 'students' || р === 'blocked'
const день = (исо: string) => исо.slice(0, 10).split('-').reverse().join('.')
const миг = (исо: string) => `${день(исо).slice(0, 5)} ${new Date(исо).toLocaleTimeString(ЛОКАЛЬ, { hour: '2-digit', minute: '2-digit' })}`

function статус(ч: Человек): { слово: string; вид: string } {
  if (ч.заблокирован) return { слово: 'заблокирован', вид: s.stBad }
  if (ч.роль === 'teacher') {
    if (ч.проверка === 'new') return { слово: тр("ждёт проверки"), вид: s.stWait }
    if (ч.проверка === 'no') return { слово: 'отклонён', вид: s.stPlain }
    return { слово: 'подтверждён', вид: s.stOk }
  }
  return { слово: 'активен', вид: s.stPlain }
}

export function Админ({ person, onHome, onOut, onНаука }: {
  person: Person
  onHome: () => void
  onOut: () => void
  onНаука: () => void
}) {
  const [раздел, setРаздел] = useState<Раздел>('wait')
  const [числа, setЧисла] = useState<Сводка | null>(null)
  const [ищу, setИщу] = useState('')
  const [список, setСписок] = useState<Человек[] | null>(null)
  const [уроки, setУроки] = useState<УрокВсех[] | null>(null)
  const [записи, setЗаписи] = useState<Запись[] | null>(null)
  const [кто, setКто] = useState<string | null>(null)
  const [карта, setКарта] = useState<{ человек: Человек; журнал: Запись[] } | null>(null)
  const [урок, setУрок] = useState<УрокВсех | null>(null)
  const [запись, setЗапись] = useState<Запись | null>(null)
  const [беда, setБеда] = useState('')
  const [занят, setЗанят] = useState(false)
  const [ссылка, setСсылка] = useState('')
  const [причина, setПричина] = useState<string | null>(null)
  const [заметка, setЗаметка] = useState('')
  const [скопировано, setСкопировано] = useState(false)

  const ошибка = (e: unknown) => setБеда(e instanceof Error ? e.message : тр("Что-то пошло не так."))

  const обновитьЧисла = useCallback(() => { сервер.сводка().then(setЧисла).catch(ошибка) }, [])
  useEffect(() => { обновитьЧисла() }, [обновитьЧисла])

  /* Середина: читается заново при смене раздела и слова поиска. */
  useEffect(() => {
    let жив = true
    setБеда('')
    if (людской(раздел)) {
      setСписок(null)
      const срок = window.setTimeout(() => {
        сервер.люди(раздел, ищу.trim()).then((л) => { if (жив) setСписок(л) }).catch((e) => { if (жив) { setСписок([]); ошибка(e) } })
      }, ищу ? 250 : 0)
      return () => { жив = false; window.clearTimeout(срок) }
    }
    if (раздел === 'lessons') { setУроки(null); сервер.урокиВсех().then((у) => { if (жив) setУроки(у) }).catch((e) => { if (жив) { setУроки([]); ошибка(e) } }) }
    if (раздел === 'log') { setЗаписи(null); сервер.журнал().then((ж) => { if (жив) setЗаписи(ж) }).catch((e) => { if (жив) { setЗаписи([]); ошибка(e) } }) }
    return () => { жив = false }
  }, [раздел, ищу])

  /* Справа: карточка выбранного человека. */
  useEffect(() => {
    if (!кто) { setКарта(null); return }
    let жив = true
    setСсылка(''); setПричина(null); setСкопировано(false)
    сервер.человек(кто).then((к) => { if (жив) { setКарта(к); setЗаметка(к.человек.заметка ?? '') } }).catch((e) => { if (жив) ошибка(e) })
    return () => { жив = false }
  }, [кто])

  const выбратьРаздел = (р: Раздел) => { setРаздел(р); setИщу(''); setКто(null); setУрок(null); setЗапись(null) }

  const делаю = (действие: Действие, слова = '') => {
    if (!карта || занят) return
    setЗанят(true); setБеда('')
    сервер.сделать(карта.человек.id, действие, слова)
      .then((к) => {
        setКарта({ человек: к.человек, журнал: к.журнал })
        if (к.ссылка) { setСсылка(к.ссылка); setСкопировано(false) }
        setПричина(null)
        обновитьЧисла()
        /* Человек мог уйти из этой группы — список в середине читаем заново. */
        if (людской(раздел)) сервер.люди(раздел, ищу.trim()).then(setСписок).catch(() => undefined)
      })
      .catch(ошибка)
      .finally(() => setЗанят(false))
  }

  const скопировать = () => {
    navigator.clipboard?.writeText(ссылка).then(() => setСкопировано(true)).catch(() => setСкопировано(false))
  }

  const ч = карта?.человек
  const имяРаздела = РАЗДЕЛЫ.flatMap((г) => г.пункты).find((п) => п.id === раздел)?.имя ?? ''

  return (
    <main className={s.screen}>
      <header className={s.bar}>
        <button type="button" className={s.logo} onClick={onHome} aria-label={тр("Flamingo — на главную")}>
          <img src="/flamingo-bird.svg" alt="" width={22} height={20} />
          <span>flamingo<b>.</b></span>
        </button>
        <span className={s.barOn}>{тр("Админка")}</span>
        <span className={s.barSpace} />
        <span className={s.barWho} title={person.name}>{person.name}</span>
        <button type="button" className={s.barOut} onClick={onOut}>{тр("Выйти")}</button>
      </header>

      <div className={s.cols}>
        {/* ── слева: разделы ─────────────────────────────────────────────── */}
        <nav className={s.left} aria-label={тр("Разделы админки")}>
          {РАЗДЕЛЫ.map((г) => (
            <section key={г.группа} aria-label={г.группа}>
              <h2 className={s.group}>{г.группа}</h2>
              {г.пункты.map((п) => {
                const n = п.счёт && числа ? числа[п.счёт] : null
                return (
                  <button
                    key={п.id}
                    type="button"
                    className={`${s.sec} ${п.id === раздел ? s.secOn : ''}`}
                    aria-current={п.id === раздел ? 'true' : undefined}
                    onClick={() => выбратьРаздел(п.id)}
                  >
                    <span>{п.имя}</span>
                    {п.скоро ? <span className={s.secN}>{тр("скоро")}</span>
                      : n === null ? null
                        : <span className={п.id === 'wait' && n > 0 ? s.secAmber : s.secN}>{n}</span>}
                  </button>
                )
              })}
            </section>
          ))}
        </nav>

        {/* ── в середине: выбранное слева ────────────────────────────────── */}
        <section className={s.mid} aria-label={имяРаздела}>
          <h1 className={s.midTitle}>{имяРаздела}{людской(раздел) && список ? ` · ${список.length}` : ''}</h1>
          {людской(раздел) ? (
            <input className={s.find} type="search" value={ищу} onChange={(e) => setИщу(e.target.value)}
                   placeholder={тр("Найти по имени или почте…")} aria-label={тр("Найти по имени или почте")} />
          ) : null}
          <div className={s.list}>
            {людской(раздел) ? (
              список === null ? <p className={s.hint}>{тр("Читаю…")}</p>
                : список.length === 0 ? <p className={s.hint}>{ищу ? тр("Никого не нашлось.") : тр("Здесь пока никого.")}</p>
                  : список.map((л) => {
                    const ст = статус(л)
                    return (
                      <button key={л.id} type="button" className={`${s.item} ${л.id === кто ? s.itemOn : ''} ${ст.вид}`}
                              aria-current={л.id === кто ? 'true' : undefined} onClick={() => setКто(л.id)}>
                        <span className={s.itemName} title={л.имя}>{л.имя}</span>
                        <span className={s.itemSub} title={л.почта}>{л.роль === 'teacher' ? тр("учитель") : тр("ученик")} · {л.почта}</span>
                        <span className={s.itemWhen}>{день(л.снами).slice(0, 5)}</span>
                      </button>
                    )
                  })
            ) : null}
            {раздел === 'lessons' ? (
              уроки === null ? <p className={s.hint}>{тр("Читаю…")}</p>
                : уроки.length === 0 ? <p className={s.hint}>{тр("Уроков пока нет.")}</p>
                  : уроки.map((у) => (
                    <button key={у.id} type="button" className={`${s.item} ${s.stPlain} ${урок?.id === у.id ? s.itemOn : ''}`} onClick={() => setУрок(у)}>
                      <span className={s.itemName} title={у.название}>{у.название}</span>
                      <span className={s.itemSub} title={у.учитель}>{у.учитель}</span>
                      <span className={s.itemWhen}>{день(у.дата).slice(0, 5)}</span>
                    </button>
                  ))
            ) : null}
            {раздел === 'log' ? (
              записи === null ? <p className={s.hint}>{тр("Читаю…")}</p>
                : записи.length === 0 ? <p className={s.hint}>{тр("Действий пока не было.")}</p>
                  : записи.map((з, i) => (
                    <button key={`${з.когда}-${i}`} type="button" className={`${s.item} ${s.stPlain} ${запись === з ? s.itemOn : ''}`} onClick={() => setЗапись(з)}>
                      <span className={s.itemName} title={з.над}>{ЧТО[з.что] ?? з.что}</span>
                      <span className={s.itemSub} title={з.над}>{з.над}</span>
                      <span className={s.itemWhen}>{миг(з.когда)}</span>
                    </button>
                  ))
            ) : null}
            {раздел === 'science' ? <p className={s.hint}>{тр("Записи добровольцев исследования внимания — в отдельном кабинете. Он открывается справа.")}</p> : null}
            {раздел === 'subjects' ? <p className={s.hint}>{тр("Предметов как отдельного списка пока нет — раздел появится позже.")}</p> : null}
          </div>
        </section>

        {/* ── справа: выбранное в середине ───────────────────────────────── */}
        <section className={s.right} aria-label={тр("Подробно")}>
          <p className={s.trouble} role="status">{беда}</p>
          {людской(раздел) && ч ? (
            <>
              <h2 className={s.name}>{ч.имя}</h2>
              <p className={s.row}>
                {ч.роль === 'teacher' ? тр("Учитель") : тр("Ученик")} · <span className={`${s.st} ${статус(ч).вид}`}>{статус(ч).слово}</span>
                {ч.роль === 'teacher' && ч.проверка !== 'ok' && !ч.заблокирован ? тр(" — уроки создавать не может") : ''}
                {ч.заблокирован ? ` — ${ч.причина}` : ''}
              </p>
              <p className={s.row}>
                <span className={s.label}>{тр("Почта")}</span>{ч.почта} — {ч.почтаПодтверждена ? 'подтверждена' : тр("не подтверждена")}
                <span className={s.label}>{тр("Телефон")}</span>{ч.телефон || тр("не указан")}
                <span className={s.label}>{тр("С нами с")}</span>{день(ч.снами)}
                {ч.уроков !== null && ч.роль === 'teacher' ? <><span className={s.label}>{тр("Уроков")}</span>{ч.уроков}</> : null}
              </p>
              {ч.роль === 'teacher' ? (
                <div className={s.docs}>
                  {ДОКУМЕНТЫ.map((д) => <p key={д} className={s.doc}><span>{д}</span><span className={s.docNote}>{тр("не приложен")}</span></p>)}
                </div>
              ) : null}
              <div className={s.btns}>
                {ч.роль === 'teacher' && ч.проверка !== 'ok' ? <button type="button" className={`${s.btn} ${s.btnGo}`} disabled={занят} onClick={() => делаю('verify')}>{тр("Подтвердить учителя")}</button> : null}
                {ч.роль === 'teacher' && ч.проверка !== 'no' ? <button type="button" className={s.btn} disabled={занят} onClick={() => делаю('reject')}>{тр("Отклонить")}</button> : null}
                <button type="button" className={s.btn} disabled={занят} onClick={() => делаю('reset_link')}>{тр("Ссылка на смену пароля")}</button>
                <button type="button" className={s.btn} disabled={занят} onClick={() => делаю(ч.почтаПодтверждена ? 'email_no' : 'email_ok')}>
                  {ч.почтаПодтверждена ? тр("Снять подтверждение почты") : тр("Подтвердить почту")}
                </button>
                {ч.заблокирован
                  ? <button type="button" className={s.btn} disabled={занят} onClick={() => делаю('unblock')}>{тр("Разблокировать")}</button>
                  : <button type="button" className={`${s.btn} ${s.btnBad}`} disabled={занят} onClick={() => setПричина(причина === null ? '' : null)}>{тр("Заблокировать")}</button>}
              </div>
              {причина !== null ? (
                <form className={s.ask} onSubmit={(e) => { e.preventDefault(); делаю('block', причина) }}>
                  <input className={s.askInput} value={причина} onChange={(e) => setПричина(e.target.value)} autoFocus
                         placeholder={тр("За что блокируем — причина останется в журнале")} aria-label={тр("Причина блокировки")} />
                  <button type="submit" className={`${s.btn} ${s.btnBad}`} disabled={занят || !причина.trim()}>{тр("Заблокировать")}</button>
                </form>
              ) : null}
              {ссылка ? (
                <div className={s.ask}>
                  <p className={s.askNote}>{тр("Одноразовая ссылка, живёт час. Передайте её человеку сами — пароль при этом не видит никто.")}</p>
                  <input className={s.askInput} readOnly value={ссылка} onFocus={(e) => e.target.select()} aria-label={тр("Ссылка на смену пароля")} />
                  <button type="button" className={s.btn} onClick={скопировать}>{скопировано ? тр("Скопировано") : тр("Скопировать")}</button>
                </div>
              ) : null}
              <form className={s.ask} onSubmit={(e) => { e.preventDefault(); делаю('note', заметка) }}>
                <textarea className={s.askArea} value={заметка} onChange={(e) => setЗаметка(e.target.value)} rows={3}
                          placeholder={тр("Заметка о проверке — видна только тебе…")} aria-label={тр("Заметка о проверке")} />
                <button type="submit" className={s.btn} disabled={занят || заметка === (ч.заметка ?? '')}>{тр("Сохранить заметку")}</button>
              </form>
              <div className={s.log}>
                {карта.журнал.length === 0 ? <p>{тр("Действий над этим человеком пока не было.")}</p>
                  : карта.журнал.map((з, i) => <p key={`${з.когда}-${i}`}><span className={s.label}>{миг(з.когда)}</span>{ЧТО[з.что] ?? з.что}{з.подробно ? ` — ${з.подробно}` : ''}</p>)}
              </div>
            </>
          ) : null}
          {людской(раздел) && !ч ? <p className={s.hint}>{тр("Выберите человека в середине — здесь будут его данные и действия.")}</p> : null}
          {раздел === 'lessons' ? (урок ? (
            <>
              <h2 className={s.name}>{урок.название}</h2>
              <p className={s.row}><span className={s.label}>{тр("Когда")}</span>{день(урок.дата)} · {урок.время} · {урок.минут} {тр("мин")}</p>
              <p className={s.row}><span className={s.label}>{тр("Учитель")}</span>{урок.учитель} · {урок.почта}</p>
            </>
          ) : <p className={s.hint}>{тр("Выберите урок в середине.")}</p>) : null}
          {раздел === 'log' ? (запись ? (
            <>
              <h2 className={s.name}>{ЧТО[запись.что] ?? запись.что}</h2>
              <p className={s.row}><span className={s.label}>{тр("Когда")}</span>{миг(запись.когда)}</p>
              <p className={s.row}><span className={s.label}>{тр("Кто")}</span>{запись.кто}</p>
              <p className={s.row}><span className={s.label}>{тр("Над кем")}</span>{запись.над}</p>
              {запись.подробно ? <p className={s.row}><span className={s.label}>{тр("Подробно")}</span>{запись.подробно}</p> : null}
            </>
          ) : <p className={s.hint}>{тр("Выберите запись в середине.")}</p>) : null}
          {раздел === 'science' ? (
            <>
              <h2 className={s.name}>{тр("Кабинет исследования")}</h2>
              <p className={s.row}>{тр("Записи добровольцев исследования внимания SEduM: видео, кадры, события и разбор каждой проверки.")}</p>
              <div className={s.btns}><button type="button" className={`${s.btn} ${s.btnGo}`} onClick={onНаука}>{тр("Открыть кабинет исследования")}</button></div>
            </>
          ) : null}
          {раздел === 'subjects' ? <p className={s.hint}>{тр("Скоро.")}</p> : null}
        </section>
      </div>
    </main>
  )
}
