import { useEffect, useState } from 'react'

import type { Person } from '../lib/auth'
import { Беда, разговоры, читатьУроки, type Разговор, type Урок } from '../lib/study'
import { Button } from '../ui/Button'
import к from './Cabinet.module.css'
import s from './Чаты.module.css'
import { Переписка } from './Переписка'

/** «Сообщения» — своя страница переписки (решение владельца 10.11.2026: пункт
 *  меню больше не «скоро»).
 *
 *  Переписка та же, что в кабинете: тот же сервер, тот же список, то же окно
 *  разговора (`Переписка.tsx`). Здесь она просто стоит отдельной страницей со
 *  своим адресом `/чаты` — ради неё не нужно искать блок в кабинете. Вид строк
 *  взят из листа кабинета, чтобы одна вещь не была собрана двумя способами.
 */
export function Чаты({ person, подложка }: {
  person: Person
  /** Только для стенда: готовый список вместо запроса к серверу. */
  подложка?: Разговор[]
}) {
  const учитель = person.role === 'teacher'
  const [беседы, setБеседы] = useState<Разговор[] | null>(подложка ?? null)
  const [беда, setБеда] = useState('')
  const [молчит, setМолчит] = useState(false)
  const [говорим, setГоворим] = useState<{ кто: string; имя: string } | null>(null)
  const [уроки, setУроки] = useState<Урок[]>([])

  const обновить = () => {
    if (подложка) return
    setБеда('')
    setМолчит(false)
    разговоры()
      .then((р) => { if (р) setБеседы(р); else setМолчит(true) })
      .catch((e) => setБеда(e instanceof Беда ? e.message : 'Переписка не открылась. Попробуйте ещё раз через минуту.'))
  }
  useEffect(() => { обновить() }, [])

  /* Преподавателю — будущие занятия: на них зовут из окна разговора. */
  useEffect(() => {
    if (!учитель || подложка) return
    let жив = true
    const сегодня = new Date().toLocaleDateString('sv')
    читатьУроки().then((все) => { if (жив) setУроки(все.filter((у) => у.дата >= сегодня)) }).catch(() => undefined)
    return () => { жив = false }
  }, [учитель])

  return (
    <main className={s.page}>
      <h1 className={s.title}>Сообщения</h1>
      <p className={s.lead}>
        {учитель ? 'Переписка с учениками, которых вы позвали к себе.' : 'Переписка с преподавателями, у которых вы учитесь.'}
      </p>
      <div className={`${к.acts} ${s.list}`}>
        {беда || молчит ? (
          <div className={к.empty}>
            <span className={к.emptyHead}>Переписка не открылась</span>
            <span className={к.emptyBody}>
              {беда || 'Переписка живёт на сервере, а он не отвечает. Написанное раньше никуда не делось — оно там, а не в этом браузере.'}
            </span>
            <Button kind="quiet" onClick={обновить}>Попробовать ещё раз</Button>
          </div>
        ) : беседы === null ? (
          <div className={к.empty}><span className={к.emptyHead}>Смотрим, с кем вы в переписке…</span></div>
        ) : беседы.length === 0 ? (
          <div className={к.empty}>
            <span className={к.emptyHead}>Переписки пока нет</span>
            <span className={к.emptyBody}>
              {учитель
                ? 'Ученик появится здесь, как только вы позовёте его к себе — приглашением из журнала.'
                : 'Преподаватель появится здесь, как только вы примете его приглашение.'}
            </span>
          </div>
        ) : беседы.map((б) => (
          <button key={б.кто} type="button" className={к.act} onClick={() => setГоворим({ кто: б.кто, имя: б.имя })}>
            <span className={к.actName}>
              {б.имя}
              {б.непрочитано > 0 ? <span className={к.новые}>{б.непрочитано}</span> : null}
            </span>
            <span className={к.actWhy}>
              {б.последнее
                ? (б.последнее.вид === 'invite' ? 'зовёт на занятие' : б.последнее.текст)
                : 'разговора ещё не было'}
            </span>
          </button>
        ))}
      </div>
      {говорим ? (
        <Переписка
          кто={говорим.кто}
          имя={говорим.имя}
          веду={учитель}
          уроки={уроки}
          onClose={() => { setГоворим(null); обновить() }}
          onПрочитано={обновить}
        />
      ) : null}
    </main>
  )
}
