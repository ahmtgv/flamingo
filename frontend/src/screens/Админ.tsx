import { useCallback, useEffect, useState } from 'react'

import * as сервер from '../lib/админ'
import type { Действие, Группа, Запись, Сводка, УрокВсех, Человек } from '../lib/админ'
import type { Person } from '../lib/auth'
import '../styles/хаб.css'
import s from './Админ.module.css'

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
  { группа: 'Люди', пункты: [
    { id: 'wait', имя: 'Ждут проверки', счёт: 'ждут' },
    { id: 'teachers', имя: 'Учителя', счёт: 'учителей' },
    { id: 'students', имя: 'Ученики', счёт: 'учеников' },
    { id: 'blocked', имя: 'Заблокированы', счёт: 'заблокировано' },
  ] },
  { группа: 'Учёба', пункты: [
    { id: 'subjects', имя: 'Предметы', скоро: true },
    { id: 'lessons', имя: 'Уроки', счёт: 'уроков' },
  ] },
  { группа: 'SEduM', пункты: [{ id: 'science', имя: 'Кабинет исследования', счёт: 'добровольцев' }] },
  { группа: 'Служебное', пункты: [{ id: 'log', имя: 'Журнал действий' }] },
]

const ДОКУМЕНТЫ = ['Паспорт', 'Резюме', 'Диплом об образовании', 'Степени и регалии', 'Рекомендации', 'Примеры уроков']

const ЧТО: Record<string, string> = {
  verify: 'подтвердил преподавателя', reject: 'отклонил преподавателя', block: 'заблокировал',
  unblock: 'разблокировал', email_ok: 'подтвердил почту', email_no: 'снял подтверждение почты',
  note: 'записал заметку', reset_link: 'выдал ссылку на смену пароля',
}

const людской = (р: Раздел): р is Группа => р === 'wait' || р === 'teachers' || р === 'students' || р === 'blocked'
const день = (исо: string) => исо.slice(0, 10).split('-').reverse().join('.')
const миг = (исо: string) => `${день(исо).slice(0, 5)} ${new Date(исо).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`

function статус(ч: Человек): { слово: string; вид: string } {
  if (ч.заблокирован) return { слово: 'заблокирован', вид: s.stBad }
  if (ч.роль === 'teacher') {
    if (ч.проверка === 'new') return { слово: 'ждёт проверки', вид: s.stWait }
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

  const ошибка = (e: unknown) => setБеда(e instanceof Error ? e.message : 'Что-то пошло не так.')

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
        <button type="button" className={s.logo} onClick={onHome} aria-label="Flamingo — на главную">
          <img src="/flamingo-bird.svg" alt="" width={22} height={20} />
          <span>flamingo<b>.</b></span>
        </button>
        <span className={s.barOn}>Админка</span>
        <span className={s.barSpace} />
        <span className={s.barWho} title={person.name}>{person.name}</span>
        <button type="button" className={s.barOut} onClick={onOut}>Выйти</button>
      </header>

      <div className={s.cols}>
        {/* ── слева: разделы ─────────────────────────────────────────────── */}
        <nav className={s.left} aria-label="Разделы админки">
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
                    {п.скоро ? <span className={s.secN}>скоро</span>
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
                   placeholder="Найти по имени или почте…" aria-label="Найти по имени или почте" />
          ) : null}
          <div className={s.list}>
            {людской(раздел) ? (
              список === null ? <p className={s.hint}>Читаю…</p>
                : список.length === 0 ? <p className={s.hint}>{ищу ? 'Никого не нашлось.' : 'Здесь пока никого.'}</p>
                  : список.map((л) => {
                    const ст = статус(л)
                    return (
                      <button key={л.id} type="button" className={`${s.item} ${л.id === кто ? s.itemOn : ''} ${ст.вид}`}
                              aria-current={л.id === кто ? 'true' : undefined} onClick={() => setКто(л.id)}>
                        <span className={s.itemName} title={л.имя}>{л.имя}</span>
                        <span className={s.itemSub} title={л.почта}>{л.роль === 'teacher' ? 'учитель' : 'ученик'} · {л.почта}</span>
                        <span className={s.itemWhen}>{день(л.снами).slice(0, 5)}</span>
                      </button>
                    )
                  })
            ) : null}
            {раздел === 'lessons' ? (
              уроки === null ? <p className={s.hint}>Читаю…</p>
                : уроки.length === 0 ? <p className={s.hint}>Уроков пока нет.</p>
                  : уроки.map((у) => (
                    <button key={у.id} type="button" className={`${s.item} ${s.stPlain} ${урок?.id === у.id ? s.itemOn : ''}`} onClick={() => setУрок(у)}>
                      <span className={s.itemName} title={у.название}>{у.название}</span>
                      <span className={s.itemSub} title={у.учитель}>{у.учитель}</span>
                      <span className={s.itemWhen}>{день(у.дата).slice(0, 5)}</span>
                    </button>
                  ))
            ) : null}
            {раздел === 'log' ? (
              записи === null ? <p className={s.hint}>Читаю…</p>
                : записи.length === 0 ? <p className={s.hint}>Действий пока не было.</p>
                  : записи.map((з, i) => (
                    <button key={`${з.когда}-${i}`} type="button" className={`${s.item} ${s.stPlain} ${запись === з ? s.itemOn : ''}`} onClick={() => setЗапись(з)}>
                      <span className={s.itemName} title={з.над}>{ЧТО[з.что] ?? з.что}</span>
                      <span className={s.itemSub} title={з.над}>{з.над}</span>
                      <span className={s.itemWhen}>{миг(з.когда)}</span>
                    </button>
                  ))
            ) : null}
            {раздел === 'science' ? <p className={s.hint}>Записи добровольцев исследования внимания — в отдельном кабинете. Он открывается справа.</p> : null}
            {раздел === 'subjects' ? <p className={s.hint}>Предметов как отдельного списка пока нет — раздел появится позже.</p> : null}
          </div>
        </section>

        {/* ── справа: выбранное в середине ───────────────────────────────── */}
        <section className={s.right} aria-label="Подробно">
          <p className={s.trouble} role="status">{беда}</p>
          {людской(раздел) && ч ? (
            <>
              <h2 className={s.name}>{ч.имя}</h2>
              <p className={s.row}>
                {ч.роль === 'teacher' ? 'Учитель' : 'Ученик'} · <span className={`${s.st} ${статус(ч).вид}`}>{статус(ч).слово}</span>
                {ч.роль === 'teacher' && ч.проверка !== 'ok' && !ч.заблокирован ? ' — уроки создавать не может' : ''}
                {ч.заблокирован ? ` — ${ч.причина}` : ''}
              </p>
              <p className={s.row}>
                <span className={s.label}>Почта</span>{ч.почта} — {ч.почтаПодтверждена ? 'подтверждена' : 'не подтверждена'}
                <span className={s.label}>Телефон</span>{ч.телефон || 'не указан'}
                <span className={s.label}>С нами с</span>{день(ч.снами)}
                {ч.уроков !== null && ч.роль === 'teacher' ? <><span className={s.label}>Уроков</span>{ч.уроков}</> : null}
              </p>
              {ч.роль === 'teacher' ? (
                <div className={s.docs}>
                  {ДОКУМЕНТЫ.map((д) => <p key={д} className={s.doc}><span>{д}</span><span className={s.docNote}>не приложен</span></p>)}
                </div>
              ) : null}
              <div className={s.btns}>
                {ч.роль === 'teacher' && ч.проверка !== 'ok' ? <button type="button" className={`${s.btn} ${s.btnGo}`} disabled={занят} onClick={() => делаю('verify')}>Подтвердить учителя</button> : null}
                {ч.роль === 'teacher' && ч.проверка !== 'no' ? <button type="button" className={s.btn} disabled={занят} onClick={() => делаю('reject')}>Отклонить</button> : null}
                <button type="button" className={s.btn} disabled={занят} onClick={() => делаю('reset_link')}>Ссылка на смену пароля</button>
                <button type="button" className={s.btn} disabled={занят} onClick={() => делаю(ч.почтаПодтверждена ? 'email_no' : 'email_ok')}>
                  {ч.почтаПодтверждена ? 'Снять подтверждение почты' : 'Подтвердить почту'}
                </button>
                {ч.заблокирован
                  ? <button type="button" className={s.btn} disabled={занят} onClick={() => делаю('unblock')}>Разблокировать</button>
                  : <button type="button" className={`${s.btn} ${s.btnBad}`} disabled={занят} onClick={() => setПричина(причина === null ? '' : null)}>Заблокировать</button>}
              </div>
              {причина !== null ? (
                <form className={s.ask} onSubmit={(e) => { e.preventDefault(); делаю('block', причина) }}>
                  <input className={s.askInput} value={причина} onChange={(e) => setПричина(e.target.value)} autoFocus
                         placeholder="За что блокируем — причина останется в журнале" aria-label="Причина блокировки" />
                  <button type="submit" className={`${s.btn} ${s.btnBad}`} disabled={занят || !причина.trim()}>Заблокировать</button>
                </form>
              ) : null}
              {ссылка ? (
                <div className={s.ask}>
                  <p className={s.askNote}>Одноразовая ссылка, живёт час. Передайте её человеку сами — пароль при этом не видит никто.</p>
                  <input className={s.askInput} readOnly value={ссылка} onFocus={(e) => e.target.select()} aria-label="Ссылка на смену пароля" />
                  <button type="button" className={s.btn} onClick={скопировать}>{скопировано ? 'Скопировано' : 'Скопировать'}</button>
                </div>
              ) : null}
              <form className={s.ask} onSubmit={(e) => { e.preventDefault(); делаю('note', заметка) }}>
                <textarea className={s.askArea} value={заметка} onChange={(e) => setЗаметка(e.target.value)} rows={3}
                          placeholder="Заметка о проверке — видна только тебе…" aria-label="Заметка о проверке" />
                <button type="submit" className={s.btn} disabled={занят || заметка === (ч.заметка ?? '')}>Сохранить заметку</button>
              </form>
              <div className={s.log}>
                {карта.журнал.length === 0 ? <p>Действий над этим человеком пока не было.</p>
                  : карта.журнал.map((з, i) => <p key={`${з.когда}-${i}`}><span className={s.label}>{миг(з.когда)}</span>{ЧТО[з.что] ?? з.что}{з.подробно ? ` — ${з.подробно}` : ''}</p>)}
              </div>
            </>
          ) : null}
          {людской(раздел) && !ч ? <p className={s.hint}>Выберите человека в середине — здесь будут его данные и действия.</p> : null}
          {раздел === 'lessons' ? (урок ? (
            <>
              <h2 className={s.name}>{урок.название}</h2>
              <p className={s.row}><span className={s.label}>Когда</span>{день(урок.дата)} · {урок.время} · {урок.минут} мин</p>
              <p className={s.row}><span className={s.label}>Учитель</span>{урок.учитель} · {урок.почта}</p>
            </>
          ) : <p className={s.hint}>Выберите урок в середине.</p>) : null}
          {раздел === 'log' ? (запись ? (
            <>
              <h2 className={s.name}>{ЧТО[запись.что] ?? запись.что}</h2>
              <p className={s.row}><span className={s.label}>Когда</span>{миг(запись.когда)}</p>
              <p className={s.row}><span className={s.label}>Кто</span>{запись.кто}</p>
              <p className={s.row}><span className={s.label}>Над кем</span>{запись.над}</p>
              {запись.подробно ? <p className={s.row}><span className={s.label}>Подробно</span>{запись.подробно}</p> : null}
            </>
          ) : <p className={s.hint}>Выберите запись в середине.</p>) : null}
          {раздел === 'science' ? (
            <>
              <h2 className={s.name}>Кабинет исследования</h2>
              <p className={s.row}>Записи добровольцев исследования внимания SEduM: видео, кадры, события и разбор каждой проверки.</p>
              <div className={s.btns}><button type="button" className={`${s.btn} ${s.btnGo}`} onClick={onНаука}>Открыть кабинет исследования</button></div>
            </>
          ) : null}
          {раздел === 'subjects' ? <p className={s.hint}>Скоро.</p> : null}
        </section>
      </div>
    </main>
  )
}
