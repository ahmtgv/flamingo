import { useEffect, useRef, useState } from 'react'
import type { Track } from 'livekit-client'

import { Note } from './Note'
import s from './Stage.module.css'
import type { Face } from './useRoom'

/** Начало урока: ведущий занимает половину экрана, класс — вторую.
 *
 *  Правило владельца 30.08: «в уроке главное — видеть и слышать учителя, поэтому
 *  в начале урока учитель на половину экрана, а оставшуюся половину — превью
 *  учеников; чем больше учеников, тем меньше превью». Сетка подбирается сама.
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

function Tile({ face, lead, big }: { face: Face; lead?: boolean; big?: boolean }) {
  return (
    <div className={`${s.tile} ${big ? s.big : ''} ${face.speaking ? s.speaking : ''}`}>
      <Media track={face.video} />
      <Sound track={face.audio} />
      {!face.camOn || !face.video ? (
        <span className={`${s.ini} ${big ? s.iniBig : ''}`}>{initials(face.name)}</span>
      ) : null}
      {lead ? <span className={s.mark}>ведёт урок</span> : null}
      <span className={s.name}>
        {face.name}
        {face.isLocal ? ' · вы' : ''}
      </span>
      {!face.micOn ? <span className={s.muted}>без звука</span> : null}
    </div>
  )
}

/** Сколько колонок даст самую крупную плитку 4:3 в отведённой половине. */
function grid(n: number, w: number, h: number): number {
  let best = { side: 0, cols: 1 }
  for (let cols = 1; cols <= n; cols += 1) {
    const rows = Math.ceil(n / cols)
    const side = Math.min((w - 8 * (cols - 1)) / cols, ((h - 8 * (rows - 1)) / rows) * (4 / 3))
    if (side > best.side) best = { side, cols }
  }
  return best.cols
}

export function Stage({ faces, alone, link, onCopy, phase, error }: {
  faces: Face[]
  alone: boolean
  link: string
  onCopy: () => void
  phase: 'connecting' | 'live' | 'failed'
  error: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(2)
  const lead = faces.find((f) => f.lead) ?? faces[0]
  const pupils = faces.filter((f) => f !== lead)

  useEffect(() => {
    const el = boxRef.current
    if (!el || pupils.length === 0) return
    const ro = new ResizeObserver(() => setCols(grid(pupils.length, el.clientWidth, el.clientHeight)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [pupils.length])

  // ПРАВИЛА 6.5: эфир — своя область, и говорит она за себя, а не за всю комнату.
  if (phase !== 'live') {
    return (
      <div className={s.stage}>
        <div className={s.whole}>
          {phase === 'connecting' ? (
            <Note
              title="Поднимаем эфир"
              text="Первым появится ваш собственный кадр — браузер спросит разрешение на камеру
                и микрофон. Остальные появятся, когда откроют ссылку. Доска в это время уже работает."
            />
          ) : (
            <Note
              title="Эфир не поднялся"
              warn
              text={`${error} Доска работает, и всё написанное на ней цело.`}
              action="Поднять эфир заново"
              onAction={() => window.location.reload()}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={s.stage}>
      <div className={s.half}>{lead ? <Tile face={lead} lead big /> : null}</div>

      {pupils.length > 0 ? (
        <div className={s.half} ref={boxRef}>
          <div className={s.grid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {pupils.map((f) => (
              <Tile key={f.identity} face={f} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ПРАВИЛА 6.2: пусто объясняет словами и всегда даёт одно действие. */}
      {alone ? (
        <div className={s.half}>
          <Note
            title="Класс ещё не собрался"
            text="Отправьте ссылку тем, кого ждёте. Пока никто не вошёл, урок начинать не обязательно."
            code={link}
            action="Скопировать ссылку"
            onAction={onCopy}
          />
        </div>
      ) : null}
    </div>
  )
}
