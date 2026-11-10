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

/** Как стоят лица. `рейка` — обычная колонка справа. `кружок` — телефон лёжа:
 *  один человек круглым окошком, его двигают пальцем и убирают нажатием.
 *  `полоса` — телефон стоймя: лица строкой под показанным (владелец, 10.11). */
export type ВидЛиц = 'рейка' | 'кружок' | 'полоса'

export function Tiles({ faces, внимание, вид = 'рейка', зван = true }: {
  faces: Face[]
  внимание?: ВниманиеНаСцене
  вид?: ВидЛиц
  /** Управление вызвано. В «кружке» кнопка «Участники» видна только тогда:
   *  чистый экран остаётся чистым. */
  зван?: boolean
}) {
  const [open, setOpen] = useState(true)
  /* Куда кружок унесли пальцем — сдвиг от его места в углу. */
  const [сдвиг, setСдвиг] = useState({ x: 0, y: 0 })
  const несут = useRef<{ x0: number; y0: number; было: { x: number; y: number }; ушёл: boolean
                         поле: DOMRect; сам: DOMRect } | null>(null)
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

  if (вид === 'полоса') {
    /* Стоймя лица стоят строкой и не сворачиваются: под ними чат, и дыра на
       месте строки была бы просто дырой. */
    return (
      <div className={s.strip} aria-label="Участники">
        {якорь ? <Tile face={якорь} lead={ведёт} внимание={внимание} /> : null}
        {pupils.map((f) => <Tile key={f.identity} face={f} внимание={внимание} />)}
      </div>
    )
  }

  if (!open) {
    if (вид === 'кружок' && !зван) return null
    return (
      <button type="button" className={`${s.show} ${вид === 'кружок' ? s.showLow : ''}`} onClick={() => setOpen(true)}>
        Участники · {faces.length}
      </button>
    )
  }

  if (вид === 'кружок') {
    /* Себя в кружке учителю видеть незачем: ему показываем того, кто говорит. */
    const вКружке = якорь?.isLocal ? (pupils.find((f) => f.speaking) ?? pupils[0] ?? якорь) : якорь
    if (!вКружке) return null
    return (
      <div
        className={s.bubble}
        role="button"
        tabIndex={0}
        aria-label={`${вКружке.name}. Двигайте пальцем; нажмите, чтобы убрать`}
        style={{ transform: `translate(${сдвиг.x}px, ${сдвиг.y}px)` }}
        onPointerDown={(e) => {
          const поле = e.currentTarget.parentElement?.getBoundingClientRect()
          if (!поле) return
          e.currentTarget.setPointerCapture(e.pointerId)
          несут.current = { x0: e.clientX, y0: e.clientY, было: сдвиг, ушёл: false, поле, сам: e.currentTarget.getBoundingClientRect() }
        }}
        onPointerMove={(e) => {
          const н = несут.current
          if (!н) return
          const dx = e.clientX - н.x0
          const dy = e.clientY - н.y0
          if (!н.ушёл && Math.hypot(dx, dy) < 6) return
          н.ушёл = true
          /* Кружок не уходит за край показанного. */
          const x = Math.max(н.поле.left - н.сам.left, Math.min(н.поле.right - н.сам.right, dx))
          const y = Math.max(н.поле.top - н.сам.top, Math.min(н.поле.bottom - н.сам.bottom, dy))
          setСдвиг({ x: н.было.x + x, y: н.было.y + y })
        }}
        onPointerUp={() => {
          const н = несут.current
          несут.current = null
          if (н && !н.ушёл) setOpen(false)
        }}
        onPointerCancel={() => { несут.current = null }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false) } }}
      >
        <Tile face={вКружке} />
      </div>
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
