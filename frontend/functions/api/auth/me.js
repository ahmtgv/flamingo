import { dropCookie, guard, no, noDb, ready, say, secretOf, whoFrom } from '../_people.js'

export const onRequest = guard(async ({ request, env }) => {
  if (request.method === 'DELETE') return say({ ok: true }, 200, dropCookie())
  if (request.method !== 'GET') return no('Этот путь отвечает на GET и DELETE.', 405)
  if (!env.DB) return noDb()
  await ready(env)

  const id = await whoFrom(request, await secretOf(env))
  if (!id) return say({ person: null })
  const row = await env.DB.prepare('SELECT id, name, role FROM people WHERE id = ?').bind(id).first()
  return say({ person: row ?? null })
})
