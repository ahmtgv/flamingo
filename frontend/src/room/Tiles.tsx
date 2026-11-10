import { useEffect, useRef, useState } from 'react'
import type { Track } from 'livekit-client'

import s from './Tiles.module.css'
import type { Face } from './useRoom'
import { знакПлитки, пишутПлитка, положениеПлитки, type ВниманиеНаСцене } from './внимание'
import { ВниманиеНаПлитке } from './ВниманиеНаПлитке'

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

function Tile({ face, lead, внимание }: { face: Face; lead?: boolean; внимание?: ВниманиеНаСцене }) {
  const знак = знакПлитки(face, внимание)
  const положение = положениеПлитки(face, внимание)
  return (
    <div className={`${s.tile} ${lead ? s.lead : ''} ${face.speaking ? s.speaking : ''}`}>
      <Media track={face.video} />
      {!face.camOn || !face.video ? <span className={s.ini}>{initials(face.name)}</span> : null}
      {lead || пишутПлитка(face, внимание) ? (
        <span className={s.marks}>
          {lead ? <span className={s.mark}>ведёт занятие</span> : null}
          {пишутПлитка(face, внимание) ? <span className={s.mark}>пишут в тетради</span> : null}
        </span>
      ) : null}
      <span className={s.name} title={face.name}>
        {face.name}
        {face.isLocal ? ' · вы' : ''}
      </span>
      {!face.micOn ? <span className={s.muted}>без звука</span> : null}
      {знак || положение ? <ВниманиеНаПлитке знак={знак} положение={положение} сЦифрой={внимание?.вид === 'учитель'} /> : null}
    </div>
  )
}

const CAP = 8

export function Tiles({ faces, внимание }: { faces: Face[]; внимание?: ВниманиеНаСцене }) {
  const [open, setOpen] = useState(true)
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

  if (!open) {
    return (
      <button type="button" className={s.show} onClick={() => setOpen(true)}>
        Участники · {faces.length}
      </button>
    )
  }

  return (
    /* 🔴 ЛИЦА СВОРАЧИВАЮТСЯ НАЖАТИЕМ ПО НИМ САМИМ (владелец, 10.11.2026). Стояла
       кнопка «Свернуть превью»: на телефоне она закрывала показанное классу и
       сама не срабатывала. Теперь надписи нет — нажал на лица, и они ушли;
       вернуть их можно кнопкой «Участники». */
    <div
      className={s.rail}
      role="button"
      tabIndex={0}
      aria-label="Участники. Нажмите, чтобы свернуть"
      title="Нажмите, чтобы свернуть"
      onClick={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false) } }}
    >
      {якорь ? <Tile face={якорь} lead={ведёт} внимание={внимание} /> : null}
      <div className={s.pupils}>
        {shown.map((f) => (
          <Tile key={f.identity} face={f} внимание={внимание} />
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
