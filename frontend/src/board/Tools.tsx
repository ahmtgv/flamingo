import s from './Board.module.css'
import { PENS } from './protocol'

export type Tool = 'pick' | 'pen' | 'eraser' | 'hand' | 'arrow' | 'text' | 'note'

type Props = {
  tool: Tool
  setTool: (t: Tool) => void
  pen: number
  setPen: (i: number) => void
  thick: boolean
  setThick: (f: (v: boolean) => boolean) => void
  armed: boolean
  wipe: () => void
  addImage: () => void
  addVideo: () => void
}

/** Значки рисованные, а не глифы шрифта: глиф «▯» на части машин не отрисовывается
 *  вовсе и оставляет пустой квадрат (замечено на боевом 30.08). */
const I = {
  pick: <path d="M5 3l14 8-6 1.6L10.6 19z" />,
  pen: <path d="M4 20l4-1 10-10-3-3L5 16z M14 6l3 3" />,
  eraser: <path d="M8 18h11 M4.5 14.5l5-5 6 6-3.5 3.5H8z" />,
  hand: <path d="M9 11V5.5a1.5 1.5 0 013 0V11 M12 11V4.5a1.5 1.5 0 013 0V11 M15 11V6.5a1.5 1.5 0 013 0V13 M9 11V9.5a1.5 1.5 0 00-3 0V14c0 3.3 2.7 6 6 6h1.5c2.5 0 4.5-2 4.5-4.5V13" />,
  arrow: <path d="M5 19L19 5 M19 5h-6 M19 5v6" />,
  text: <path d="M5 6V4h14v2 M12 4v16 M9 20h6" />,
  note: <path d="M5 4h14v10l-5 6H5z M19 14h-5v6" />,
  image: <path d="M4 5h16v14H4z M4 15l4.5-4.5L13 15l3-3 4 4 M9 9.5a1 1 0 11-2 0 1 1 0 012 0" />,
  video: <path d="M3 6h12v12H3z M15 10l6-3v10l-6-3z" />,
}

function Ico({ d }: { d: keyof typeof I }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {I[d]}
    </svg>
  )
}

export function Tools({ tool, setTool, pen, setPen, thick, setThick, armed, wipe, addImage, addVideo }: Props) {
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

  return (
    <div className={s.tools} role="toolbar" aria-label="Инструменты доски">
      {btn('pick', 'pick', 'Выбрать · клавиша V')}
      {btn('pen', 'pen', 'Перо · клавиша P')}
      {btn('eraser', 'eraser', 'Ластик · клавиша E')}
      {btn('hand', 'hand', 'Двигать холст · клавиша H или пробел')}

      <span className={s.sep} />

      {btn('arrow', 'arrow', 'Стрелка · клавиша A')}
      {btn('text', 'text', 'Текст · клавиша T')}
      {btn('note', 'note', 'Заметка · клавиша N')}
      <button type="button" className={s.tool} title="Добавить картинку" aria-label="Добавить картинку"
              onClick={addImage}>
        <Ico d="image" />
      </button>
      <button type="button" className={s.tool} title="Добавить видео по ссылке" aria-label="Добавить видео"
              onClick={addVideo}>
        <Ico d="video" />
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
            setTool('pen')
          }}
        >
          <span className={s.penDot} style={{ background: `var(${p.token})` }} />
        </button>
      ))}

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

      <button
        type="button"
        className={`${s.wipe} ${armed ? s.wipeArmed : ''}`}
        onClick={wipe}
        title="Стирает доску у всех, кто в комнате. Вернуть нельзя."
      >
        {armed ? 'Точно стереть?' : 'Стереть всё'}
      </button>
    </div>
  )
}
