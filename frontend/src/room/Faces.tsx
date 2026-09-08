import { useEffect, useRef } from 'react'
import type { Track } from 'livekit-client'

import { Note } from './Note'
import s from './Faces.module.css'
import type { Face } from './useRoom'

/** Сколько учеников полоса показывает лицами. Дальше — счётчик словами:
 *  тридцать плиток по 60 пикселей это не лица, а мозаика (утверждённый лист). */
const CAP = 11

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function Media({ track, muted }: { track?: Track; muted: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !track) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])
  if (!track) return null
  return <video ref={ref} className={s.video} autoPlay playsInline muted={muted} />
}

function Sound({ track }: { track?: Track }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !track) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])
  if (!track) return null
  return <audio ref={ref} autoPlay />
}

function Tile({ face, lead }: { face: Face; lead: boolean }) {
  return (
    <div className={`${s.tile} ${lead ? s.lead : ''} ${face.speaking ? s.speaking : ''}`}>
      <Media track={face.video} muted />
      <Sound track={face.audio} />
      {!face.camOn || !face.video ? <span className={s.ini}>{initials(face.name)}</span> : null}
      {lead ? <span className={s.leadMark}>ведёт занятие</span> : null}
      <span className={s.name}>
        {face.name}
        {face.isLocal ? ' · вы' : ''}
      </span>
      {!face.micOn ? <span className={s.muted}>без звука</span> : null}
    </div>
  )
}

export function Faces({ faces, alone, link, onCopy, phase, error }: {
  faces: Face[]
  alone: boolean
  link: string
  onCopy: () => void
  phase: 'connecting' | 'live' | 'failed'
  error: string
}) {
  // Ведущий стоит первым и во всю ширину полосы: на него смотрит класс, и в решётке
  // равных плиток среди тридцати он терялся (решение владельца 30.08).
  /* 🔴 «Первый в списке» — ЯКОРЬ РАСКЛАДКИ, А НЕ РОЛЬ. Крупная плитка кому-то
     нужна всегда, иначе полоса разъезжается. Но подпись «ведёт занятие» на ней
     появляется, ТОЛЬКО если ведущий назван (Room.tsx, `ведущий`). Раньше здесь
     стояло `?? faces[0]` и подпись доставалась первому вошедшему — тот же самый
     промах, что и в useRoom, только с другой стороны. */
  const якорь = faces.find((f) => f.lead) ?? faces[0]
  const ведёт = Boolean(якорь?.lead)
  const pupils = faces.filter((f) => f !== якорь)
  const shown = pupils.slice(0, CAP)
  const rest = pupils.length - shown.length

  // Эфир упал — об этом говорит ПОЛОСА ЛИЦ, а не карточка поверх урока:
  // доска в это время работает, и написанное на ней цело (ПРАВИЛА 6.5).
  if (phase !== 'live') {
    return (
      <aside className={s.rail} aria-label="Участники">
        <div className={s.whole}>
          {phase === 'connecting' ? (
            <Note title="Поднимаем эфир" text="Первым появится ваш кадр, потом остальные — по мере входа." />
          ) : (
            <Note
              title="Эфир не поднялся"
              warn
              text={`${error} Доска работает, всё написанное на месте.`}
              action="Поднять эфир заново"
              onAction={() => window.location.reload()}
            />
          )}
        </div>
      </aside>
    )
  }

  return (
    <aside className={s.rail} aria-label="Участники">
      <div className={s.tiles}>
        {якорь ? <Tile key={якорь.identity} face={якорь} lead={ведёт} /> : null}
        {shown.length > 0 ? (
          <div className={s.pupils}>
            {shown.map((f) => (
              <Tile key={f.identity} face={f} lead={false} />
            ))}
          </div>
        ) : null}
      </div>

      {/* ПРАВИЛА 6.4: спрятанное называется числом, а не многоточием. */}
      {rest > 0 ? (
        <p className={s.more}>
          ещё {rest} · всего {faces.length}
        </p>
      ) : null}

      {/* ПРАВИЛА 6.2: пусто объясняет словами и всегда даёт одно действие. */}
      {alone ? (
        <div className={s.alone}>
          <span className={s.aloneTitle}>Вы пока один</span>
          <span className={s.aloneText}>Отправьте ссылку тому, кого ждёте, — он войдёт по ней.</span>
          <code className={s.link}>{link}</code>
          <button type="button" className={s.copy} onClick={onCopy}>
            Скопировать ссылку
          </button>
        </div>
      ) : null}
    </aside>
  )
}
