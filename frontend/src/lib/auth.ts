/** Учётные записи. Разговор с сервером один и тот же на входе и в регистрации. */

const BASE = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL ?? '') : '').replace(/\/$/, '')

export type Person = { id: string; name: string; role: 'teacher' | 'student' }

export class AuthError extends Error {}

async function talk<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/auth/${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new AuthError('Сервер Flamingo не отвечает. Урок по ссылке при этом работает.')
  }
  let body: { error?: string } & Record<string, unknown> = {}
  try {
    body = await res.json()
  } catch {
    throw new AuthError(`Сервер ответил не по-нашему (${res.status}).`)
  }
  if (!res.ok) throw new AuthError(String(body.error ?? `Сервер отказал (${res.status}).`))
  return body as T
}

export const register = (email: string, name: string, role: Person['role'], password: string) =>
  talk<Person>('register', { method: 'POST', body: JSON.stringify({ email, name, role, password }) })

export const login = (email: string, password: string) =>
  talk<Person>('login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const whoAmI = () => talk<{ person: Person | null }>('me')

export const logout = () => talk<{ ok: boolean }>('me', { method: 'DELETE' })
