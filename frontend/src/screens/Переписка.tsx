import { useEffect, useRef, useState } from 'react'

import { Button } from '../ui/Button'
import {
  Беда, лента, написать, позвать, прочитано, type Реплика,
} from '../lib/study'
import s from './Переписка.module.css'

/** Разговор преподавателя и ученика ВНЕ занятия.
 *
 *  🔴 Решение владельца 02.09: «ученик с учителем, которые запарились друг с
 *  другом, остаются в контакте и могут писать сообщения друг другу, и учитель
 *  может приглашать ученика на урок».
 *
 *  Панель, а не отдельный экран: разговор почти всегда про конкретное занятие,
 *  и терять из виду журнал (у преподавателя) или расписание (у ученика) незачем.
 *
 *  Пять состояний экрана (ПРАВИЛА 6.1) здесь настоящие, а не для галочки:
 *  загружается · пусто · переписка · сервер молчит · отказ на отправку.
 */

const час = (когда: string) =>
  new Date(когда).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })

export type УрокДляЗова = { id: string; название: string; дата: string; время: string }

export function Переписка({ кто, имя, веду, уроки = [], onClose, onПрочитано }: {
  кто: string
  имя: string
  /** Веду ли я занятия у этого человека. Только у ведущего есть «Позвать на урок».
   *  🔴 Это подсказка экрана, а не право: право проверяет сервер, и ученику он
   *  откажет, даже если запрос собрать руками. */
  веду: boolean
  /** Свои будущие занятия — из них выбирают, на какое звать. */
  уроки?: УрокДляЗова[]
  onClose: () => void
  /** Разговор открыли и отметили прочитанным — снаружи можно обновить счётчики. */
  onПрочитано?: () => void
}) {
  const [письма, setПисьма] = useState<Реплика[] | null>(null)
  const [молчит, setМолчит] = useState(false)
  const [текст, setТекст] = useState('')
  const [беда, setБеда] = useState('')
  const [шлём, setШлём] = useState(false)
  const [выбор, setВыбор] = useState(false)
  const хвост = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let живо = true
    setПисьма(null)
    setМолчит(false)
    лента(кто).then(async (л) => {
      if (!живо) return
      if (!л) { setМолчит(true); return }
      setПисьма(л.письма)
      /* Отмечаем прочитанным ОТДЕЛЬНЫМ вызовом и только после того, как
         письма действительно показаны: иначе счётчик гаснет у того, кто
         ничего не увидел. */
      if (л.письма.some((п) => !п.мой && !п.прочитано)) {
        await прочитано(кто)
        if (живо) onПрочитано?.()
      }
    })
    return () => { живо = false }
  // onПрочитано намеренно вне зависимостей: он меняется на каждом кадре родителя.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [кто])

  useEffect(() => {
    хвост.current?.scrollIntoView({ block: 'end' })
  }, [письма?.length])

  const отправить = async () => {
    const чисто = текст.trim()
    if (!чисто || шлём) return
    setБеда('')
    setШлём(true)
    try {
      const п = await написать(кто, чисто)
      setПисьма((с) => [...(с ?? []), п])
      setТекст('')
    } catch (e) {
      /* Отказ сервера несёт слова — их и показываем, а не «не отправилось». */
      setБеда(e instanceof Беда ? e.message : 'Сервер не отвечает — сообщение не ушло.')
    } finally {
      setШлём(false)
    }
  }

  const звать = async (урок: УрокДляЗова) => {
    setБеда('')
    setВыбор(false)
    try {
      const п = await позвать(кто, урок.id)
      setПисьма((с) => [...(с ?? []), п])
    } catch (e) {
      setБеда(e instanceof Беда ? e.message : 'Сервер не отвечает — позвать не вышло.')
    }
  }

  return (
    <aside className={s.панель} aria-label={`Разговор с ${имя}`}>
      <header className={s.верх}>
        <span className={s.кто}>{имя}</span>
        <button type="button" className={s.закрыть} onClick={onClose}
                aria-label="Закрыть разговор" title="Закрыть разговор">
          {/* Знак рисованный: глиф шрифта на части машин оставляет пустой квадрат. */}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12 M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className={s.лента}>
        {молчит ? (
          <p className={s.слова}>
            Сервер не отвечает, поэтому переписки не видно. Написанное раньше
            никуда не делось — оно на сервере, а не в этом браузере.
          </p>
        ) : письма === null ? (
          <p className={s.слова}>Открываем разговор…</p>
        ) : письма.length === 0 ? (
          <p className={s.слова}>
            {веду
              ? 'Разговора ещё не было. Напишите первым — например, что повторить к следующему занятию.'
              : 'Разговора ещё не было. Спросите, если что-то осталось непонятным с урока.'}
          </p>
        ) : (
          письма.map((п) => (
            <div key={п.id} className={`${s.реплика} ${п.мой ? s.моя : ''}`}>
              <span className={s.когда}>{п.мой ? 'вы' : имя} · {час(п.когда)}</span>
              {п.вид === 'invite' ? (
                п.урок ? (
                  <span className={s.зов}>
                    <span className={s.зовШапка}>{п.мой ? 'вы зовёте на занятие' : 'зовёт вас на занятие'}</span>
                    <span className={s.зовИмя}>{п.урок.название}</span>
                    <span className={s.зовКогда}>
                      {п.урок.дата.slice(8, 10)}.{п.урок.дата.slice(5, 7)} · {п.урок.время}
                    </span>
                    {/* Ссылка, а не кнопка: комната — это адрес, и его хочется
                        открыть в новой вкладке или отправить дальше. */}
                    <a className={s.зовВход} href={`/r/${п.урок.код}`}>Войти в комнату</a>
                  </span>
                ) : (
                  <span className={`${s.зов} ${s.зовСнят}`}>
                    <span className={s.зовШапка}>занятие снято</span>
                    <span className={s.зовКогда}>
                      Приглашение осталось в разговоре, но занятия больше нет в расписании.
                    </span>
                  </span>
                )
              ) : (
                <span className={s.пузырь}>{п.текст}</span>
              )}
            </div>
          ))
        )}
        <div ref={хвост} />
      </div>

      {выбор ? (
        <div className={s.выбор}>
          <span className={s.выборЗаголовок}>На какое занятие зовём</span>
          {уроки.length ? уроки.map((у) => (
            <button key={у.id} type="button" className={s.урок} onClick={() => звать(у)}>
              <span className={s.урокКогда}>{у.дата.slice(8, 10)}.{у.дата.slice(5, 7)} · {у.время}</span>
              <span className={s.урокИмя}>{у.название}</span>
            </button>
          )) : (
            <span className={s.слова}>
              Будущих занятий нет — сначала заведите урок, потом позовёте.
            </span>
          )}
          <Button kind="quiet" onClick={() => setВыбор(false)}>Отмена</Button>
        </div>
      ) : null}

      {беда ? <p className={s.отказ}>{беда}</p> : null}

      <div className={s.низ}>
        <input
          className={s.поле}
          value={текст}
          placeholder={`Написать ${имя.split(' ')[0]}…`}
          onChange={(e) => setТекст(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); отправить() } }}
          aria-label="Сообщение"
        />
        {веду ? (
          <Button kind="quiet" onClick={() => setВыбор((v) => !v)}>Позвать на урок</Button>
        ) : null}
        <Button kind="go" onClick={отправить} disabled={!текст.trim() || шлём}>
          {шлём ? 'Уходит…' : 'Отправить'}
        </Button>
      </div>
    </aside>
  )
}
