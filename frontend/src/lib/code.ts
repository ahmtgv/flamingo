/** Код комнаты: три группы по четыре знака.
 *
 *  Алфавит без `i`, `l`, `o`, `0`, `1` — код диктуют голосом и переписывают руками,
 *  а эти пять знаков в любом шрифте спорят друг с другом. Тот же алфавит проверяет
 *  бэкенд (`backend/room/views.py`), и это не совпадение: правило одно, записано дважды,
 *  потому что живёт по обе стороны провода.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const GROUPS = 3
const GROUP_LEN = 4

export const ROOM_CODE = /^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/

export function newRoomCode(): string {
  const bytes = new Uint32Array(GROUPS * GROUP_LEN)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length])
  const groups: string[] = []
  for (let i = 0; i < GROUPS; i += 1) {
    groups.push(chars.slice(i * GROUP_LEN, (i + 1) * GROUP_LEN).join(''))
  }
  return groups.join('-')
}

/** Код из адреса: `/r/xxxx-xxxx-xxxx`. Ничего не найдено — значит человек пришёл с начала. */
export function codeFromPath(pathname: string = window.location.pathname): string | null {
  const m = pathname.match(/^\/r\/([^/]+)\/?$/)
  if (!m) return null
  const code = decodeURIComponent(m[1]).toLowerCase()
  return ROOM_CODE.test(code) ? code : null
}

export function roomUrl(code: string): string {
  return `${window.location.origin}/r/${code}`
}
