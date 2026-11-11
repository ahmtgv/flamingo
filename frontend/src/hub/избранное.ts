/** Избранные источники человека.
 *
 *  У гостя живут в этом браузере: учётной записи у него нет, и хранить список
 *  больше негде. У вошедшего — на сервере (ниже), и тогда избранное одно на
 *  все его устройства; местный список при этом остаётся запасом на случай,
 *  когда сервер молчит. Хранилище может быть закрыто (частное окно): тогда
 *  список держится до закрытия страницы, экран от этого не падает.
 */

const КЛЮЧ = 'fl-hub-избранное'

export function прочесть(): string[] {
  try {
    const сырое = window.localStorage.getItem(КЛЮЧ)
    const список: unknown = сырое ? JSON.parse(сырое) : []
    return Array.isArray(список) ? список.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function записать(список: string[]): void {
  try {
    window.localStorage.setItem(КЛЮЧ, JSON.stringify(список))
  } catch { /* хранилище закрыто — список живёт до закрытия страницы */ }
}

/* ── то же избранное на сервере: у вошедшего оно одно на все устройства ──────
   (владелец, 11.11). Гость по-прежнему живёт на хранилище браузера. Сервер
   молчит или отказал — экран работает на местном списке и ничего не теряет. */

const БАЗА = String(import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '')

async function спросить(init?: RequestInit): Promise<string[] | null> {
  if (!БАЗА) return null
  try {
    const о = await fetch(`${БАЗА}/api/hub/stars`, { credentials: 'include', signal: AbortSignal.timeout(8_000), ...init })
    if (!о.ok) return null
    const тело: unknown = await о.json()
    const список = (тело as { избранное?: unknown }).избранное
    return Array.isArray(список) ? список.filter((x): x is string => typeof x === 'string') : null
  } catch {
    return null
  }
}

/** Избранное с сервера. `null` — не вошёл, сервера нет или он молчит. */
export function сСервера(): Promise<string[] | null> {
  return спросить()
}

/** Положить список на сервер целиком. Неудача молчалива: местный список цел. */
export function наСервер(список: string[]): Promise<string[] | null> {
  return спросить({
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ избранное: список }),
  })
}
