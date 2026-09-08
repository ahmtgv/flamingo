import { useCallback, useEffect, useState } from 'react'

import type { Person } from '../lib/auth'
import { Mark } from '../ui/Mark'
import { Беда, ктоЗовёт, принятьПриглашение } from '../lib/study'
import s from './Invite.module.css'

/** Ссылка в журнал: `/у/<ключ>`.
 *
 *  🔴 Экран сначала ГОВОРИТ, КТО ЗОВЁТ, и только потом просит согласия. Молча
 *  связать двух людей по факту перехода по ссылке нельзя: человек мог получить
 *  её пересланной, случайно, не от того. Согласие — отдельное нажатие.
 *
 *  🔴 Без учётной записи связать некого: связь — это две записи, а не имя,
 *  написанное в поле. Поэтому здесь есть дверь ко входу, и сказано, зачем.
 */
export function Invite({ ключ, person, onSign, onDone, onHome }: {
  ключ: string
  person: Person | null
  onSign: () => void
  onDone: () => void
  onHome: () => void
}) {
  const [зовёт, setЗовёт] = useState<string | null>(null)
  const [беда, setБеда] = useState('')
  const [готово, setГотово] = useState('')
  const [ждём, setЖдём] = useState(false)

  /* 🔴 «ССЫЛКА НЕ РАБОТАЕТ» И «СЕРВЕР МОЛЧИТ» — РАЗНЫЕ ОТВЕТЫ. Раньше заголовок
     говорил «Ссылка не работает», а строка под ним — «сервер занятий не
     отвечает»: два разных диагноза друг над другом, и человек шёл просить новую
     ссылку вместо того, чтобы подождать минуту. `Беда` — это ответ сервера, то
     есть ссылка действительно не годится; всё остальное — молчание, и ссылка
     скорее всего цела. Аудит 07.09, находка 20. */
  const [молчит, setМолчит] = useState(false)

  const спросить = useCallback(() => {
    setБеда('')
    setМолчит(false)
    setЗовёт(null)
    ктоЗовёт(ключ)
      .then((имя) => setЗовёт(имя))
      .catch((e) => {
        if (e instanceof Беда) { setБеда(e.message); return }
        setМолчит(true)
        setБеда('Сервер занятий не ответил. Ссылка, скорее всего, цела — подождите минуту и спросите ещё раз.')
      })
  }, [ключ])

  useEffect(() => {
    let живо = true
    ктоЗовёт(ключ)
      .then((имя) => { if (живо) setЗовёт(имя) })
      .catch((e) => {
        if (!живо) return
        if (e instanceof Беда) { setБеда(e.message); return }
        setМолчит(true)
        setБеда('Сервер занятий не ответил. Ссылка, скорее всего, цела — подождите минуту и спросите ещё раз.')
      })
    return () => { живо = false }
  }, [ключ])

  const принять = async () => {
    setЖдём(true)
    setБеда('')
    try {
      const имя = await принятьПриглашение(ключ)
      setГотово(имя)
    } catch (e) {
      setБеда(e instanceof Беда ? e.message : 'Не вышло принять приглашение.')
    } finally {
      setЖдём(false)
    }
  }

  return (
    <main className={s.screen}>
      <div className={s.card}>
        <Mark onGo={onHome} title="На главную" />

        {готово ? (
          <>
            <h1 className={s.title}>Готово</h1>
            <p className={s.lead}>
              Вы записаны к преподавателю: {готово}. Занятия появятся в вашем
              кабинете, а ссылку на урок больше искать не придётся.
            </p>
            <button type="button" className={s.go} onClick={onDone}>В мой кабинет</button>
          </>
        ) : беда ? (
          <>
            <h1 className={s.title}>{молчит ? 'Сервер занятий не ответил' : 'Ссылка не работает'}</h1>
            <p className={s.lead}>{беда}</p>
            {молчит ? null : (
              <p className={s.foot}>
                Ссылка в журнал живёт семь дней и срабатывает один раз. Попросите
                преподавателя прислать новую — это одно нажатие.
              </p>
            )}
            <div className={s.row}>
              {молчит ? (
                <button type="button" className={s.go} onClick={спросить}>Спросить ещё раз</button>
              ) : null}
              <button type="button" className={s.quiet} onClick={onHome}>На главную</button>
            </div>
          </>
        ) : зовёт === null ? (
          <p className={s.lead}>Смотрим, кто зовёт…</p>
        ) : (
          <>
            <h1 className={s.title}>{зовёт} зовёт вас на занятия</h1>
            <p className={s.lead}>
              Согласитесь — и вы увидите друг друга: {зовёт} вас в журнале,
              вы {зовёт} в своих преподавателях. Занятия начнут появляться
              в вашем кабинете сами.
            </p>

            {person ? (
              <div className={s.row}>
                <button type="button" className={s.go} onClick={принять} disabled={ждём}>
                  {ждём ? 'Записываем…' : 'Согласиться'}
                </button>
                <button type="button" className={s.quiet} onClick={onHome}>Не сейчас</button>
              </div>
            ) : (
              <>
                <div className={s.row}>
                  <button type="button" className={s.go} onClick={onSign}>
                    Войти или завести учётную запись
                  </button>
                  <button type="button" className={s.quiet} onClick={onHome}>Не сейчас</button>
                </div>
                <p className={s.foot}>
                  🔴 Учётная запись нужна именно здесь: связь преподавателя
                  и ученика — это две записи, а не имя, написанное в поле.
                  На сам урок по ссылке она по-прежнему не нужна.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
