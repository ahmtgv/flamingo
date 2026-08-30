import { useEffect, useRef, useState } from 'react'
import type { Track } from 'livekit-client'

import s from './Tiles.module.css'
import type { Face } from './useRoom'

/** Превью лиц ПОВЕРХ доски (решение владельца 30.08).
 *
 *  Колонка стоит справа над холстом, ведущий первым и крупнее. Полосу можно
 *  свернуть в одну кнопку: доска бесконечная, и человек вправе занять ею весь экран.
 */

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function Media({ track }: { track?: Track }) {
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
  return <video ref={ref} className={s.video} autoPlay playsInline muted />
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

function Tile({ face, lead }: { face: Face; lead?: boolean }) {
  return (
    <div className={`${s.tile} ${lead ? s.lead : ''} ${face.speaking ? s.speaking : ''}`}>
      <Media track={face.video} />
      <Sound track={face.audio} />
      {!face.camOn || !face.video ? <span className={s.ini}>{initials(face.name)}</span> : null}
      {lead ? <span className={s.mark}>ведёт урок</span> : null}
      <span className={s.name}>
        {face.name}
        {face.isLocal ? ' · вы' : ''}
      </span>
      {!face.micOn ? <span className={s.muted}>без звука</span> : null}
    </div>
  )
}

const CAP = 8

export function Tiles({ faces }: { faces: Face[] }) {
  const [open, setOpen] = useState(true)
  const lead = faces.find((f) => f.lead) ?? faces[0]
  const pupils = faces.filter((f) => f !== lead)
  const shown = pupils.slice(0, CAP)
  const rest = pupils.length - shown.length

  if (!open) {
    return (
      <button type="button" className={s.show} onClick={() => setOpen(true)}>
        Показать лица · {faces.length}
      </button>
    )
  }

  return (
    <div className={s.rail} aria-label="Участники">
      <button type="button" className={s.hide} onClick={() => setOpen(false)}>
        Свернуть лица
      </button>
      {lead ? <Tile face={lead} lead /> : null}
      <div className={s.pupils}>
        {shown.map((f) => (
          <Tile key={f.identity} face={f} />
        ))}
      </div>
      {rest > 0 ? (
        <p className={s.more}>
          ещё {rest} · всего {faces.length} в комнате
        </p>
      ) : null}
    </div>
  )
}
