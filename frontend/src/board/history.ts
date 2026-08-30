import type { Sheet } from './protocol'

/** Отмена и возврат по снимкам листа.
 *
 *  🔴 Снимок, а не пересказ действий. Доску правят двое одновременно, и «отменить
 *  последний штрих» у двоих означает разное; снимок же однозначен — к нему просто
 *  возвращаются и рассылают целиком. Цена — память, поэтому глубина ограничена.
 */
const DEPTH = 50

const copy = (s: Sheet): Sheet => ({
  ...s,
  strokes: s.strokes.map((st) => ({ ...st, pts: st.pts.map((p) => [p[0], p[1]] as [number, number]) })),
  objs: s.objs.map((o) => ({ ...o })),
})

export function makeHistory() {
  const past: Sheet[] = []
  const future: Sheet[] = []

  return {
    /** Запомнить состояние ДО правки. Зовётся перед каждым действием, меняющим лист. */
    mark(s: Sheet) {
      past.push(copy(s))
      if (past.length > DEPTH) past.shift()
      future.length = 0
    },
    undo(now: Sheet): Sheet | null {
      const prev = past.pop()
      if (!prev) return null
      future.push(copy(now))
      return prev
    },
    redo(now: Sheet): Sheet | null {
      const next = future.pop()
      if (!next) return null
      past.push(copy(now))
      return next
    },
    /** Переключились на другую доску — прошлое той доски к этой не относится. */
    reset() {
      past.length = 0
      future.length = 0
    },
    get canUndo() {
      return past.length > 0
    },
    get canRedo() {
      return future.length > 0
    },
  }
}
