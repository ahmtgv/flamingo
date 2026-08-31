import { useEffect, useRef, useState } from 'react'

import s from './Board.module.css'
import { PENS } from './protocol'

export type Tool = 'pick' | 'pen' | 'eraser' | 'hand' | 'arrow' | 'dash' | 'text' | 'note'

type Props = {
  tool: Tool
  setTool: (t: Tool) => void
  pen: number
  setPen: (i: number) => void
  thick: boolean
  setThick: (f: (v: boolean) => boolean) => void
  armed: boolean
  wipe: () => void
  addDoc: () => void
  addImage: () => void
  addVideo: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** Меняется на каждое действие: без этого React не узнаёт, что стопка отмены ожила. */
  histTick: number
}

/** Значки рисованные, а не глифы шрифта: глиф «▯» на части машин не отрисовывается
 *  вовсе и оставляет пустой квадрат (замечено на боевом 30.08).
 *
 *  🔴 Контуры сверены с листом дизайна `docs/дизайн/от-дизайна-31.08/Доска.dc.html`,
 *  а он, в свою очередь, сверялся с этим файлом. Менять контур здесь — значит
 *  разойтись с листом; сначала лист.
 */
const I = {
  pick: <path d="M5 3l14 8-6 1.6L10.6 19z" />,
  pen: <path d="M4 20l4-1 10-10-3-3L5 16z M14 6l3 3" />,
  eraser: <path d="M8 18h11 M4.5 14.5l5-5 6 6-3.5 3.5H8z" />,
  text: <path d="M5 6V4h14v2 M12 4v16 M9 20h6" />,
  clip: <path d="M17 8l-7.6 7.6a2.4 2.4 0 003.4 3.4L21 11a4.2 4.2 0 00-6-6L6.6 13.4a6 6 0 008.4 8.6" />,
  doc: <path d="M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6" />,
  image: <path d="M4 5h16v14H4z M4 15l4.5-4.5L13 15l3-3 4 4 M9 9.5a1 1 0 11-2 0 1 1 0 012 0" />,
  video: <path d="M3 6h12v12H3z M15 10l6-3v10l-6-3z" />,
  note: <path d="M5 4h14v10l-5 6H5z M19 14h-5v6" />,
  undo: <path d="M9 7L4 12l5 5 M4 12h9a6 6 0 010 12h-1" />,
  redo: <path d="M15 7l5 5-5 5 M20 12h-9a6 6 0 000 12h1" />,
  arrow: <path d="M5 19L19 5 M19 5h-6 M19 5v6" />,
  dash: <path d="M4 12h3 M10 12h4 M17 12h3" />,
  wipe: <path d="M4 20h16 M6 16l9-9 4 4-9 9z M13 6l4 4" />,
}

function Ico({ d }: { d: keyof typeof I }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {I[d]}
    </svg>
  )
}

export function Tools({
  tool, setTool, pen, setPen, thick, setThick, armed, wipe, addDoc, addImage, addVideo,
  undo, redo, canUndo, canRedo,
}: Props) {
  /* «Вложить» — одна кнопка на три способа положить что-то на холст (решение
     владельца 01.09, лист «Доска»). Три отдельные кнопки занимали в столбце
     столько же места, сколько вся работа с пером. */
  const [attach, setAttach] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!attach) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setAttach(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAttach(false)
    }
    // Выпадашка, которую нечем закрыть, — ловушка: холст под ней перестаёт слушаться.
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [attach])

  const btn = (t: Tool, d: keyof typeof I, title: string) => (
    <button
      type="button"
      className={`${s.tool} ${tool === t ? s.toolOn : ''}`}
      aria-pressed={tool === t}
      title={title}
      aria-label={title.split(' · ')[0]}
      onClick={() => setTool(t)}
    >
      <Ico d={d} />
    </button>
  )

  const вложение = (d: keyof typeof I, имя: string, что: () => void) => (
    <button type="button" className={s.attachItem} onClick={() => { setAttach(false); что() }}>
      <Ico d={d} />
      {имя}
    </button>
  )

  return (
    <div className={s.tools} role="toolbar" aria-label="Инструменты доски">
      {/* Работа: чем ведут по холсту. «Рука» убрана с листа — холст двигают
          пробелом, и отдельная кнопка под это место в столбце не окупала. */}
      {btn('pick', 'pick', 'Выбрать · клавиша V')}
      {btn('pen', 'pen', 'Перо · клавиша P')}
      {btn('eraser', 'eraser', 'Ластик · клавиша E')}

      <span className={s.sep} />

      {btn('text', 'text', 'Текст · клавиша T')}

      <div className={s.attachBox} ref={box}>
        <button
          type="button"
          className={`${s.tool} ${attach ? s.toolOn : ''}`}
          aria-expanded={attach}
          aria-label="Вложить"
          title="Вложить: документ, картинка, видео, заметка"
          onClick={() => setAttach((v) => !v)}
        >
          <Ico d="clip" />
        </button>
        {attach ? (
          <div className={s.attachMenu} role="menu" aria-label="Что вложить">
            {вложение('doc', 'Документ', addDoc)}
            {вложение('image', 'Картинка', addImage)}
            {вложение('video', 'Видео по ссылке', addVideo)}
            {вложение('note', 'Заметка', () => setTool('note'))}
          </div>
        ) : null}
      </div>

      <span className={s.sep} />

      {/* Отмена и возврат. ПРАВИЛА 14.1: пока отменять нечего, кнопка не притворяется
          живой — она выключена, и это видно. */}
      <button type="button" className={s.tool} onClick={undo} disabled={!canUndo}
              title="Отменить · Ctrl+Z" aria-label="Отменить">
        <Ico d="undo" />
      </button>
      <button type="button" className={s.tool} onClick={redo} disabled={!canRedo}
              title="Вернуть · Ctrl+Shift+Z" aria-label="Вернуть">
        <Ico d="redo" />
      </button>

      <span className={s.sep} />

      {PENS.map((p, i) => (
        <button
          key={p.token}
          type="button"
          className={`${s.pen} ${pen === i ? s.penOn : ''}`}
          aria-pressed={pen === i}
          title={p.title}
          aria-label={p.title}
          onClick={() => {
            setPen(i)
            if (tool !== 'dash' && tool !== 'arrow') setTool('pen')
          }}
        >
          <span className={s.penDot} style={{ background: `var(${p.token})` }} />
        </button>
      ))}

      <span className={s.sep} />

      {/* Форма линии — своя группа в конце, над толщиной (лист «Доска», 01.09).
          Стрелка, пунктир и толщина отвечают на один вопрос: как выглядит линия. */}
      {btn('arrow', 'arrow', 'Стрелка · клавиша A')}
      {btn('dash', 'dash', 'Пунктирная линия · клавиша D')}

      <button
        type="button"
        className={`${s.tool} ${thick ? s.toolOn : ''}`}
        aria-pressed={thick}
        title={thick ? 'Толстое перо' : 'Тонкое перо'}
        aria-label="Толщина пера"
        onClick={() => setThick((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
             strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" strokeWidth={thick ? 6 : 2} />
        </svg>
      </button>

      <span className={s.sep} />

      {/* Пока не спросили второй раз — это значок. Спросили — подпись словами:
          необратимое действие обязано назвать себя (ПРАВИЛА 14.2).
          🔴 На листе дизайна этой кнопки нет. Оставлена намеренно: убрать её —
          значит убрать из продукта работающее действие, а замены лист не даёт. */}
      <button
        type="button"
        className={`${s.tool} ${armed ? s.wipeArmed : ''}`}
        onClick={wipe}
        title="Стереть всё · стирает доску у всех, кто в комнате. Вернуть нельзя."
        aria-label="Стереть всё"
      >
        {armed ? <span className={s.wipeAsk}>стереть?</span> : <Ico d="wipe" />}
      </button>
    </div>
  )
}
