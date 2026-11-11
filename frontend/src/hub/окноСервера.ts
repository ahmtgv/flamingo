/** Разговор со своим браузером на сервере (`backend/common/браузерная.py`).
 *
 *  Сайт, который запрещает показывать себя в рамке, открывает наш сервер —
 *  настоящим браузером, — а сюда идут кадры его окна. Отсюда на сервер уезжают
 *  нажатия, прокрутка и клавиши. Чужой код на этой странице не исполняется.
 */

const БАЗА = String(import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '')

export class НеВышло extends Error {
  readonly код: number
  constructor(слова: string, код: number) { super(слова); this.код = код }
}

async function слова(о: Response): Promise<never> {
  let текст = ''
  try { текст = String((await о.json() as { error?: unknown }).error ?? '') } catch { /* тела нет */ }
  throw new НеВышло(текст || 'Браузер на сервере не ответил.', о.status)
}

async function отправить(путь: string, тело: unknown): Promise<Record<string, unknown>> {
  let о: Response
  try {
    о = await fetch(`${БАЗА}/api/hub/browser/${путь}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(тело),
      signal: AbortSignal.timeout(28_000),
    })
  } catch {
    throw new НеВышло('Сервер не отвечает.', 0)
  }
  if (!о.ok) return слова(о)
  return await о.json() as Record<string, unknown>
}

/** Открыть источник. Возвращает имя окна на сервере. */
export async function открыть(id: string, ш: number, в: number): Promise<string> {
  const о = await отправить('open', { id, ш, в })
  return String(о.окно ?? '')
}

export type Действие =
  | { что: 'click'; x: number; y: number }
  | { что: 'drag'; x: number; y: number; x1: number; y1: number }
  | { что: 'wheel'; x: number; y: number; dx: number; dy: number }
  | { что: 'key'; клавиша: string }
  | { что: 'text'; текст: string }
  | { что: 'back' | 'reload' | 'close' }
  | { что: 'size'; ш: number; в: number }

export async function действие(окно: string, д: Действие): Promise<void> {
  await отправить('act', { w: окно, ...д })
}

/** Кадр окна. `картинка: null` — с прошлого раза ничего не изменилось. */
export async function кадр(окно: string, знаю: string): Promise<{ картинка: Blob | null; хэш: string; адрес: string }> {
  let о: Response
  try {
    о = await fetch(`${БАЗА}/api/hub/browser/frame?w=${encodeURIComponent(окно)}&h=${encodeURIComponent(знаю)}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new НеВышло('Сервер не отвечает.', 0)
  }
  if (о.status !== 200 && о.status !== 204) return слова(о)
  let адрес = о.headers.get('X-Hub-Url') ?? ''
  try { адрес = decodeURIComponent(адрес) } catch { /* оставляем как пришло */ }
  return { картинка: о.status === 200 ? await о.blob() : null, хэш: о.headers.get('X-Hub-Hash') ?? знаю, адрес }
}

/** Какие источники запрещают показ в рамке — знает сервер (`manage.py хаб_рамки`).
 *  Спрашиваем один раз; сервер молчит — список пуст, и всё открывается рамкой. */
let спрошено: Promise<string[]> | null = null
export function безРамки(): Promise<string[]> {
  if (!БАЗА) return Promise.resolve([])
  спрошено ??= fetch(`${БАЗА}/api/hub/previews`, { signal: AbortSignal.timeout(8_000) })
    .then((о) => (о.ok ? о.json() : {}))
    .then((т: { без_рамки?: unknown }) => (Array.isArray(т.без_рамки) ? т.без_рамки.filter((x): x is string => typeof x === 'string') : []))
    .catch(() => [])
  return спрошено
}
