import { useCallback, useEffect, useState } from 'react'

import { Board } from '../board/Board'
import { Faces } from '../room/Faces'
import { Shelf, type Source } from '../room/Shelf'
import { Stage } from '../room/Stage'
import { useRoom } from '../room/useRoom'
import { roomUrl } from '../lib/code'
import { Button } from '../ui/Button'
import { Mark } from '../ui/Mark'
import s from './Room.module.css'

type Props = { code: string; name: string; onLeave: () => void }

export function Room({ code, name, onLeave }: Props) {
  const { phase, error, faces, peers, bus, mic, cam, toggleMic, toggleCam, leave } = useRoom(code, name)
  const [copied, setCopied] = useState(false)
  const [source, setSource] = useState<Source>('faces')
  const link = roomUrl(code)

  /* Ведущий в куске 1 — тот, кто открыл комнату: аккаунтов и ролей нет, роль
     считается по времени входа (см. useRoom). Экран ученика от этого легче:
     ему не показывают того, чем он всё равно не распоряжается. */
  const iLead = faces.find((f) => f.isLocal)?.lead ?? true

  /* Что показывают классу — ведёт учитель, остальные смотрят. */
  useEffect(() => bus.subscribe((m) => {
    if (m.t === 'stage') setSource(m.source)
  }), [bus])

  const pick = useCallback(
    (next: Source) => {
      setSource(next)
      bus.send({ t: 'stage', source: next })
    },
    [bus],
  )

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

  const alone = peers === 0 && phase === 'live'

  /* Три ряда — и ровно три ребёнка, всегда. Условные строки живут ВНУТРИ своей
     области, а не новым рядом: объявленная сетка с переменным числом детей — та
     самая причина, по которой на прошлом проекте трижды уезжала раскладка. */
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

        {iLead ? <Shelf source={source} onPick={pick} /> : <span className={s.noShelf} />}

        <div className={s.stage}>
          {source === 'board' ? (
            <Board bus={bus} peers={peers} />
          ) : (
            <Stage faces={faces} alone={alone} link={link} onCopy={copy} />
          )}

          {phase !== 'live' ? (
            <div className={s.veil}>
              <div className={s.card}>
                {phase === 'connecting' ? (
                  <>
                    <span className={s.cardTitle}>Поднимаем эфир</span>
                    <span className={s.cardText}>
                      Первым появится ваш собственный кадр — браузер спросит разрешение на
                      камеру и микрофон. Остальные появятся, когда откроют ссылку.
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
          {iLead ? (
            <>
              <span className={s.divider} />
              <Button kind="quiet" onClick={copy}>
                {copied ? 'Ссылка скопирована' : 'Ссылка на комнату'}
              </Button>
            </>
          ) : null}
          <Button kind="leave" onClick={quit}>
            {iLead ? 'Завершить урок' : 'Выйти'}
          </Button>
        </footer>
      </div>

      {/* Полоса лиц стоит справа, только когда что-то показывают: пока показывают
          лица, класс и так на весь экран (правило владельца 30.08). */}
      {source === 'board' ? (
        <Faces faces={faces} alone={alone} link={link} onCopy={copy} />
      ) : null}
    </div>
  )
}
