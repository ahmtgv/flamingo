import { useEffect, useRef } from 'react'
import type { Track } from 'livekit-client'

import s from './Faces.module.css'
import type { Face } from './useRoom'

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

export function Faces({ faces, alone, link, onCopy }: {
  faces: Face[]
  alone: boolean
  link: string
  onCopy: () => void
}) {
  return (
    <aside className={s.rail} aria-label="Участники">
      <div className={s.tiles}>
        {faces.map((f) => (
          <div key={f.identity} className={`${s.tile} ${f.speaking ? s.speaking : ''}`}>
            <Media track={f.video} muted />
            <Sound track={f.audio} />
            {!f.camOn || !f.video ? <span className={s.ini}>{initials(f.name)}</span> : null}
            <span className={s.name}>
              {f.name}
              {f.isLocal ? ' · вы' : ''}
            </span>
            {!f.micOn ? <span className={s.muted}>без звука</span> : null}
          </div>
        ))}
      </div>

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
