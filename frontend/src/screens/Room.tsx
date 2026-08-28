import { useEffect, useState } from 'react'

import { Board } from '../board/Board'
import { Faces } from '../room/Faces'
import { useRoom } from '../room/useRoom'
import { roomUrl } from '../lib/code'
import { Button } from '../ui/Button'
import { Mark } from '../ui/Mark'
import s from './Room.module.css'

type Props = { code: string; name: string; onLeave: () => void }

export function Room({ code, name, onLeave }: Props) {
  const { phase, error, faces, peers, bus, mic, cam, toggleMic, toggleCam, leave } = useRoom(
    code,
    name,
  )
  const [copied, setCopied] = useState(false)
  const link = roomUrl(code)

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => undefined)
    setCopied(true)
  }

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(t)
  }, [copied])

  const quit = () => {
    leave()
    onLeave()
  }

  /* Три ряда — и ровно три ребёнка, всегда. Условные строки живут ВНУТРИ своей области,
     а не новым рядом: объявленная сетка с переменным числом детей — та самая причина,
     по которой на прошлом проекте трижды уезжала раскладка (КТ2 §4). */
  return (
    <div className={s.room}>
      <div className={s.pane}>
        <header className={s.head}>
          <Mark />
          <span className={s.sep} />
          <span className={s.code}>{code}</span>
          <span className={s.live}>
            <span className={s.dot} />
            {phase === 'live' ? 'идёт' : phase === 'connecting' ? 'подключаемся' : 'связи нет'}
          </span>
        </header>

        <div className={s.stage}>
          <Board bus={bus} peers={peers} />

          {phase !== 'live' ? (
            <div className={s.veil}>
              <div className={s.card}>
                {phase === 'connecting' ? (
                  <>
                    <span className={s.cardTitle}>Поднимаем эфир</span>
                    <span className={s.cardText}>
                      Первым появится ваш собственный кадр — браузер спросит разрешение на
                      камеру и микрофон. Второй участник появится, когда откроет ссылку.
                    </span>
                  </>
                ) : (
                  <>
                    {/* ПРАВИЛА 6.4: отказ называет причину, что уцелело и одно действие. */}
                    <span className={s.cardTitle}>Эфир не поднялся</span>
                    <span className={s.cardText}>{error}</span>
                    <Button kind="go" onClick={() => window.location.reload()}>
                      Попробовать снова
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <footer className={s.pult}>
          <Button kind="quiet" onClick={toggleMic} aria-pressed={mic}>
            {mic ? 'Микрофон' : 'Микрофон выключен'}
          </Button>
          <Button kind="quiet" onClick={toggleCam} aria-pressed={cam}>
            {cam ? 'Камера' : 'Камера выключена'}
          </Button>
          <span className={s.divider} />
          <Button kind="quiet" onClick={copy}>
            {copied ? 'Ссылка скопирована' : 'Ссылка на комнату'}
          </Button>
          <Button kind="leave" onClick={quit}>
            Выйти
          </Button>
        </footer>
      </div>

      <Faces faces={faces} alone={peers === 0 && phase === 'live'} link={link} onCopy={copy} />
    </div>
  )
}
