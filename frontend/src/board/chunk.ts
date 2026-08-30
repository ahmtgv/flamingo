/** Резка длинных сообщений.
 *
 *  🔴 В данные-канал LiveKit нельзя положить сколько угодно: большой пакет либо
 *  не доедет, либо задержит все следующие. Штрихи и заметки маленькие, а картинка
 *  из буфера — сотни килобайт, поэтому длинное сообщение уезжает частями и
 *  собирается на той стороне. Части одного сообщения помечены общим `cid`.
 */

export const CHUNK_BYTES = 9000

type Part = { __c: string; i: number; n: number; s: string }

const isPart = (v: unknown): v is Part =>
  typeof v === 'object' && v !== null && typeof (v as Part).__c === 'string'

/** Разложить сообщение на куски. Короткое отдаётся одним куском, как есть. */
export function split(text: string): string[] {
  if (text.length <= CHUNK_BYTES) return [text]
  const cid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const n = Math.ceil(text.length / CHUNK_BYTES)
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    const part: Part = { __c: cid, i, n, s: text.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES) }
    out.push(JSON.stringify(part))
  }
  return out
}

/** Сборщик. Возвращает целое сообщение, когда все куски на месте, иначе null. */
export function joiner() {
  const box = new Map<string, { n: number; got: string[]; at: number }>()
  return (raw: unknown): unknown | null => {
    if (!isPart(raw)) return raw
    const cur = box.get(raw.__c) ?? { n: raw.n, got: [], at: Date.now() }
    cur.got[raw.i] = raw.s
    box.set(raw.__c, cur)
    // Недособранное старше двух минут — это чей-то оборвавшийся кусок, не наша память.
    const now = Date.now()
    box.forEach((v, k) => {
      if (now - v.at > 120_000) box.delete(k)
    })
    let full = 0
    for (let i = 0; i < cur.n; i += 1) if (typeof cur.got[i] === 'string') full += 1
    if (full < cur.n) return null
    box.delete(raw.__c)
    try {
      return JSON.parse(cur.got.join(''))
    } catch {
      return null
    }
  }
}
