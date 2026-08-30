import { useCallback, useEffect, useRef, useState } from 'react'

import { Board } from '../board/Board'
import { newId } from '../board/protocol'
import { Chat, type Line } from '../room/Chat'
import { Note } from '../room/Note'
import { Shelf, type Source } from '../room/Shelf'
import { Sleepy } from '../room/Sleepy'
import { Stage } from '../room/Stage'
import { Tiles } from '../room/Tiles'
import { useEdge } from '../room/useEdge'
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
  const [lines, setLines] = useState<Line[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const link = roomUrl(code)
  const stageRef = useRef<HTMLDivElement>(null)
  const edge = useEdge(stageRef)

  /* Ведущий в куске 1 — тот, кто открыл комнату: аккаунтов и ролей нет, роль
     считается по времени входа. Экран ученика от этого легче. */
  const iLead = faces.find((f) => f.isLocal)?.lead ?? true

  useEffect(() => bus.subscribe((m) => {
    if (m.t === 'stage') setSource(m.source)
    if (m.t === 'chat') {
      setLines((cur) => [...cur, { id: m.id, who: m.who, text: m.text, at: m.at, mine: false }])
      setUnread((n) => n + 1)
    }
  }), [bus])

  useEffect(() => {
    if (chatOpen) setUnread(0)
  }, [chatOpen, lines.length])

  const pick = useCallback(
    (next: Source) => {
      setSource(next)
      bus.send({ t: 'stage', source: next })
    },
    [bus],
  )

  const say = useCallback(
    (text: string) => {
      const line = { id: newId(), who: name, text, at: Date.now() }
      setLines((cur) => [...cur, { ...line, mine: true }])
      bus.send({ t: 'chat', ...line })
    },
    [bus, name],
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
  const onBoard = source === 'board'

  return (
    <div className={s.room}>
      {/* Верхняя строка стоит всегда: где я, что за комната, идёт ли урок.
          Всё остальное управление просыпается под рукой. */}
      <header className={s.head}>
        <Mark />
        <span className={s.sep} />
        <span className={s.code}>{code}</span>
        <span className={s.live}>
          {/* ПРАВИЛА 11а: «идёт» зелёное, «связи нет» — аларм и потому коралловое. */}
          <span className={`${s.dot} ${phase === 'failed' ? s.dotAlarm : ''} ${phase === 'connecting' ? s.dotWait : ''}`} />
          {phase === 'live' ? 'идёт' : phase === 'connecting' ? 'подключаемся' : 'связи нет'}
        </span>

        {iLead ? <Shelf source={source} onPick={pick} /> : null}

        <button
          type="button"
          className={`${s.chatBtn} ${chatOpen ? s.chatOn : ''}`}
          onClick={() => setChatOpen((v) => !v)}
        >
          Чат
          {/* ПРАВИЛА 11.8: непрочитанное в чате ИДУЩЕГО занятия портится от ожидания —
              вопрос живёт до конца урока. Поэтому коралловая надпись, но не заливка. */}
          {unread > 0 && !chatOpen ? <span className={s.unread}>{unread}</span> : null}
        </button>
      </header>

      <div className={`${s.stage} ${chatOpen ? s.withChat : ''}`} ref={stageRef}>
        {onBoard ? <Board bus={bus} peers={peers} /> : (
          <Stage faces={faces} alone={alone} link={link} onCopy={copy} phase={phase} error={error} />
        )}

        {/* Лица лежат ПОВЕРХ доски: холст под ними бесконечный и ничем не обрезан. */}
        {onBoard && phase === 'live' ? <Tiles faces={faces} /> : null}

        {/* Эфир — своя область (ПРАВИЛА 6.5): пока он не поднялся, об этом говорит
            карточка лиц, а доска продолжает работать. */}
        {onBoard && phase !== 'live' ? (
          <div className={s.overNote}>
            {phase === 'connecting' ? (
              <Note light title="Поднимаем эфир" text="Первым появится ваш кадр, потом остальные — по мере входа. Доска уже работает." />
            ) : (
              <Note
                light
                title="Эфир не поднялся"
                warn
                text={`${error} Доска работает, всё написанное на месте.`}
                action="Поднять эфир заново"
                onAction={() => window.location.reload()}
              />
            )}
          </div>
        ) : null}

        {chatOpen ? (
          <Chat lines={lines} onClose={() => setChatOpen(false)} onSend={say} />
        ) : null}

        {/* Пульт занятия просыпается снизу. */}
        <Sleepy side="bottom" label="микрофон · камера · выход" open={edge === 'bottom'}>
          <div className={s.pult}>
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
          </div>
        </Sleepy>
      </div>
    </div>
  )
}
