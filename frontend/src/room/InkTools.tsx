import type { Tool } from './Ink'
import type { StickerName } from './shows'
import s from './InkTools.module.css'

/** Полка инструментов пометок. Одна на показ и на трансляцию: три цвета маркера,
 *  стрелка, три стикера, отмена (решение владельца 31.08).
 *
 *  Активный инструмент отмечается нейтральной заливкой, не акцентной
 *  (ПРАВИЛА 5.7): акцент на экране урока принадлежит поднятой руке. */

const MARKER = [
  { token: '--fl-coral-500', title: 'Коралловый' },
  { token: '--color-go', title: 'Зелёный' },
  { token: '--color-info', title: 'Синий' },
] as const

const STICKERS: { name: StickerName; glyph: string; title: string }[] = [
  { name: 'верно', glyph: '✓', title: 'Верно' },
  { name: 'вопрос', glyph: '?', title: 'Вопрос' },
  { name: 'сюда', glyph: '!', title: 'Смотрите сюда' },
]

export const FIRST_TOOL: Tool = { kind: 'pen', color: MARKER[0].token }

export function InkTools({ tool, onTool, onUndo, onWipe, canUndo, canWipe }: {
  tool: Tool
  onTool: (t: Tool) => void
  onUndo: () => void
  onWipe: () => void
  canUndo: boolean
  canWipe: boolean
}) {
  const pen = tool.kind === 'pen' || tool.kind === 'arrow' ? tool : null
  return (
    <div className={s.tools} data-pult="маркер">
      {MARKER.map((c) => (
        <button
          key={c.token}
          type="button"
          className={`${s.dotBtn} ${pen?.kind === 'pen' && pen.color === c.token ? s.on : ''}`}
          aria-label={`Маркер, ${c.title.toLowerCase()}`}
          aria-pressed={pen?.kind === 'pen' && pen.color === c.token}
          onClick={() => onTool({ kind: 'pen', color: c.token })}
        >
          <span className={s.dot} style={{ background: `var(${c.token})` }} />
        </button>
      ))}
      <span className={s.sep} />
      <button
        type="button"
        className={`${s.btn} ${tool.kind === 'arrow' ? s.on : ''}`}
        aria-pressed={tool.kind === 'arrow'}
        onClick={() => onTool({ kind: 'arrow', color: pen ? pen.color : MARKER[0].token })}
      >
        Стрелка
      </button>
      {STICKERS.map((st) => (
        <button
          key={st.name}
          type="button"
          className={`${s.btn} ${tool.kind === 'sticker' && tool.name === st.name ? s.on : ''}`}
          aria-pressed={tool.kind === 'sticker' && tool.name === st.name}
          title={st.title}
          onClick={() => onTool({ kind: 'sticker', name: st.name })}
        >
          {st.glyph}
        </button>
      ))}
      <span className={s.sep} />
      <button type="button" className={s.btn} onClick={onUndo} disabled={!canUndo}>
        Отменить
      </button>
      <button type="button" className={s.btn} onClick={onWipe} disabled={!canWipe}>
        Стереть всё
      </button>

      {/* Правило пометок сказано словами прямо на полке (лист «Показ»): иначе
          человек не знает, увидит ли он свой рисунок, вернувшись на страницу. */}
      <span className={s.hint}>пометки привязаны к своей странице · ⌘Z отменяет</span>
    </div>
  )
}
