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
  /* 🔴 «КАМЕРА ВЫКЛЮЧЕНА» И «КАДР ЕЩЁ НЕ ПРИШЁЛ» — РАЗНЫЕ СОСТОЯНИЯ (ПРАВИЛА
     6.1, 6.3). Раньше обе ветки сливались в одни инициалы, и класс не знал,
     Аня выключила камеру или у неё грузится: учитель зря просил включить
     камеру, которая уже включена. Выключенный микрофон при этом назывался
     словами, а камера — ничем. Осмотр комнаты 08.09, находка 27. */
  const безКамеры = !face.camOn
  const кадрИдёт = face.camOn && !face.video
  return (
    <div className={`${s.tile} ${big ? s.big : ''} ${face.speaking ? s.speaking : ''}`}>
      <Media track={face.video} />
      <Sound track={face.audio} />
      {безКамеры || кадрИдёт ? (
        <span className={`${s.ini} ${big ? s.iniBig : ''}`}>{initials(face.name)}</span>
      ) : null}
      {/* 🔴 ПЛАШКИ СТОЯТ РЯДОМ, А НЕ ДРУГ НА ДРУГЕ. Пока их было две, хватало
          «одна слева, другая справа»; с состоянием камеры их стало три, и на
          узкой плитке «камера выключена» легла на «без звука», а на плитке
          ведущего — на «ведёт занятие». Строка с переносом решает это раз и
          навсегда: сколько бы плашек ни завелось, они встают в ряд. */}
      <span className={s.chips}>
        {lead ? <span className={s.mark}>ведёт занятие</span> : null}
        {безКамеры ? <span className={s.state}>камера выключена</span> : null}
        {кадрИдёт ? <span className={s.state}>кадр идёт</span> : null}
        {!face.micOn ? <span className={s.state}>без звука</span> : null}
      </span>
      <span className={s.name} title={face.name}>
        {face.name}
        {face.isLocal ? ' · вы' : ''}
      </span>
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

/* Что правда при мёртвой связи. Строка одна на всю комнату: разъехавшиеся
   тексты про доску и были находкой 2 осмотра 08.09. */
export const ЦЕЛО =
  'Написанное на доске цело. Пока связи нет, класс новых записей не видит: доска, чат и голос идут по одной связи.'

export function Stage({ faces, alone, веду, link, onCopy, phase, error }: {
  faces: Face[]
  alone: boolean
  /** Веду ли занятие я. Ответ сервера, а не догадка (Room.tsx). */
  веду: boolean
  link: string
  onCopy: () => void
  phase: 'connecting' | 'live' | 'failed'
  error: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(2)
  /* 🔴 «Первый в списке» — ЯКОРЬ РАСКЛАДКИ, А НЕ РОЛЬ. Крупная плитка кому-то
     нужна всегда, иначе полоса разъезжается. Но подпись «ведёт занятие» на ней
     появляется, ТОЛЬКО если ведущий назван (Room.tsx, `ведущий`). Раньше здесь
     стояло `?? faces[0]` и подпись доставалась первому вошедшему — тот же самый
     промах, что и в useRoom, только с другой стороны. */
  const якорь = faces.find((f) => f.lead) ?? faces[0]
  const ведёт = Boolean(якорь?.lead)
  const pupils = faces.filter((f) => f !== якорь)

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
                и микрофон. Остальные появятся, когда откроют ссылку. Доска уже открыта: класс
                увидит написанное, когда войдёт."
            />
          ) : (
            <Note
              title="Эфир не поднялся"
              warn
              /* 🔴 «ДОСКА РАБОТАЕТ» БЫЛО НЕПРАВДОЙ. Доска ходит по той же
                 шине, что и голос: `useRoom.ts` — `bus.send` при не-Connected
                 молча выходит. В ту секунду, когда эти слова показаны, доска у
                 ведущего — местный блокнот, а класс её не видит. Осмотр 08.09,
                 находка 2: самая дорогая ложь в комнате. */
              text={error}
              цело={ЦЕЛО}
              action="Поднять эфир заново"
              onAction={() => window.location.reload()}
            />
          )}
        </div>
      </div>
    )
  }

  /* 🔴 ОДИН В КОМНАТЕ — ОТДЕЛЬНАЯ РАСКЛАДКА (решение владельца 02.09).
     Половинки делят между собой ЛИЦА; когда лицо одно, делить нечего, и оно
     занимало левую половину во всю высоту, а справа стояло чёрное поле.
     Теперь одно лицо стоит по центру и по кадру. */
  if (alone) {
    return (
      <div className={s.stage}>
        <div className={s.solo}>
          <div className={s.soloTile}>
            {якорь ? <Tile face={якорь} lead={ведёт} big /> : null}
          </div>
          {/* 🔴 ССЫЛКУ НА УРОК ВИДИТ ТОЛЬКО ВЕДУЩИЙ. Звать класс — его работа;
              ученику эта карточка предлагала делать не своё дело, да ещё и
              раздавать комнату. Кто ведёт — говорит сервер, тот же ответ, что
              даёт права на показ и доску.
              Взамен ученику — слова (ПРАВИЛА 6.2): пустой экран без слов
              человек читает как поломку и уходит перезагружаться. */}
          {!веду ? (
            <p className={s.ждём}>
              Урок ещё не начался. Преподаватель войдёт — и занятие начнётся;
              выходить и заходить заново не нужно.
            </p>
          ) : null}
        </div>

        {веду ? (
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

  /* 🔴 ПОКА ВЕДУЩИЙ НЕ НАЗВАН, КРУПНОЙ ПЛИТКИ НЕТ ВОВСЕ. `faces[0]` — всегда
     я сам (`useRoom` кладёт локального первым), поэтому ученик первые секунды
     урока смотрел на СЕБЯ во всю половину экрана вместо учителя, а в комнате
     без занятия — весь урок. Ровная решётка честнее: она не выдаёт случайного
     человека за ведущего. Осмотр комнаты 08.09, находка 29. */
  if (!ведёт) {
    return (
      <div className={s.stage} ref={boxRef}>
        <div className={s.half} data-ровно="да">
          <div className={s.grid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {faces.map((f) => (
              <Tile key={f.identity} face={f} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.stage}>
      <div className={s.half}>{якорь ? <Tile face={якорь} lead={ведёт} big /> : null}</div>

      {pupils.length > 0 ? (
        <div className={s.half} ref={boxRef}>
          <div className={s.grid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {pupils.map((f) => (
              <Tile key={f.identity} face={f} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
