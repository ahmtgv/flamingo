import { useEffect, useRef } from 'react'
import type { Track } from 'livekit-client'

import { Note } from './Note'
import s from './Screen.module.css'

/** Экран преподавателя, показанный классу.
 *
 *  🔴 Зачем это есть. Рамка внутри страницы работает не везде: большинство сайтов
 *  запрещают показ у себя внутри рамки, и обойти запрет нельзя — он их, а не наша
 *  слабость. Экран показывает ровно то, что видит преподаватель: любой сайт, любую
 *  программу, свой телескоп или дрон. Это и есть «браузер внутри занятия», только
 *  честный (решение владельца 01.09).
 *
 *  Чего экран НЕ умеет и об этом сказано словами: класс не может нажимать у себя.
 *  Показ — это показ, а не пульт: указателем управляет только тот, кто делится.
 */
export function Screen({ track, mine, who, onStop }: {
  track?: Track
  /** Делюсь я — или смотрю чужой экран. Тексты и пульт от этого разные. */
  mine: boolean
  who: string
  onStop: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !track) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])

  return (
    <div className={s.screen}>
      {track ? (
        <video ref={ref} className={s.video} autoPlay playsInline muted />
      ) : (
        /* ПРАВИЛА 6.3: пока картинки нет — сказано, что придёт и когда. */
        <Note
          light
          title={mine ? 'Выбираете, чем поделиться' : 'Экран сейчас появится'}
          text={mine
            ? 'Браузер спрашивает, показать окно, вкладку или весь экран. Класс пока видит эту же надпись.'
            : `${who} выбирает, чем поделиться. Доска и голос работают.`}
        />
      )}

      {/* Полоса внизу — как у показа документов: один пульт, а не пилюля поверх. */}
      <div className={s.pult} data-pult="экран">
        <span className={s.who}>
          {mine ? 'Вы показываете свой экран' : `Экран: ${who}`}
        </span>
        <span className={s.hint}>
          класс смотрит, но нажимать у себя не может — показом управляете вы
        </span>
        {mine ? (
          <span className={s.end}>
            <button type="button" className={s.stop} onClick={onStop}>
              Остановить показ экрана
            </button>
          </span>
        ) : null}
      </div>
    </div>
  )
}
