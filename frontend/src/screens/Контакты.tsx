import { useEffect, useState } from 'react'

import { useОкно } from '../ui/окно'
import { УГОЛ } from '../ui/знаки'
import { Беда, разговоры, type Разговор } from '../lib/study'
import s from './Переписка.module.css'

/** С кем я в контакте — чтобы написать прямо с урока.
 *
 *  🔴 Решение владельца 31.10: «можно написать любому ученику, кто есть в
 *  контакте, даже с урока — и пригласить на урок, который уже идёт».
 *  До этого переписка открывалась только из журнала и кабинета, а в комнате
 *  был лишь чат класса: написать тому, кого на уроке нет, было неоткуда.
 *
 *  Панель — тот же язык, что у «Переписки» (окно возят за шапку): список людей,
 *  с которыми есть разговор; выбрал — открывается разговор. Кто с кем в
 *  контакте, решает сервер (`talks`), экран только показывает.
 *
 *  Пять состояний (ПРАВИЛА 6.1): загружается · пусто · список · сервер молчит
 *  · отказ со словами. */
export function Контакты({ onВыбрать, onClose, подложка }: {
  onВыбрать: (кто: string, имя: string) => void
  onClose: () => void
  /** Только для стенда (`import.meta.env.DEV`): готовый список вместо запроса. */
  подложка?: Разговор[]
}) {
  const [люди, setЛюди] = useState<Разговор[] | null>(null)
  const [молчит, setМолчит] = useState(false)
  const [отказ, setОтказ] = useState('')
  const окно = useОкно({ ширина: 320, минШирина: 260, минВысота: 220 })

  useEffect(() => {
    let живо = true
    if (подложка) { setЛюди(подложка); return }
    разговоры().then((р) => {
      if (!живо) return
      if (!р) { setМолчит(true); return }
      setЛюди(р)
    }).catch((e) => {
      if (!живо) return
      setОтказ(e instanceof Беда ? e.message : 'Список не открылся.')
    })
    return () => { живо = false }
  }, [подложка])

  return (
    <aside ref={окно.поставить} style={окно.стиль} className={s.панель} aria-label="Кому написать">
      <header className={s.верх} {...окно.везтиЗа}>
        <span className={s.кто}>Кому написать</span>
        <button type="button" className={s.закрыть} onClick={onClose}
                aria-label="Закрыть список" title="Закрыть список">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12 M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className={s.лента}>
        {отказ ? (
          <p className={s.слова}>{отказ}</p>
        ) : молчит ? (
          <p className={s.слова}>Сервер не отвечает, поэтому списка не видно. Контакты никуда не делись — они на сервере.</p>
        ) : люди === null ? (
          <p className={s.слова}>Открываем список…</p>
        ) : люди.length === 0 ? (
          <p className={s.слова}>Контактов пока нет. Человек появится здесь после первого приглашения из журнала.</p>
        ) : (
          люди.map((ч) => (
            <button key={ч.кто} type="button" className={s.урок} onClick={() => onВыбрать(ч.кто, ч.имя)}>
              <span className={s.урокИмя}>{ч.имя}</span>
              <span className={s.урокКогда}>
                {ч.роль === 'teacher' ? 'преподаватель' : 'ученик'}
                {ч.непрочитано > 0 ? ` · непрочитанных: ${ч.непрочитано}` : ''}
              </span>
            </button>
          ))
        )}
      </div>

      <div className={s.низ} />
      <span className={s.угол} {...окно.тянутьЗа} aria-hidden="true">{УГОЛ}</span>
    </aside>
  )
}
