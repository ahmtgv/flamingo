import { dropCookie, no, noDb, say, whoFrom } from '../_people.js'

export const onRequest = async ({ request, env }) => {
  if (request.method === 'DELETE') return say({ ok: true }, 200, dropCookie())
  if (request.method !== 'GET') return no('Этот путь отвечает на GET и DELETE.', 405)
  if (!env.DB) return noDb()
  if (!env.SESSION_SECRET) return no('Сервер не настроен: нет ключа подписи сессий.', 503)

  const id = await whoFrom(request, env.SESSION_SECRET)
  if (!id) return say({ person: null })
  const row = await env.DB.prepare('SELECT id, name, role FROM people WHERE id = ?').bind(id).first()
  return say({ person: row ?? null })
}
