import { hashPass, makeCookie, no, noDb, ready, say, secretOf } from '../_people.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function make({ request, env }) {
  if (!env.DB) return noDb()
  await ready(env)
  const secret = await secretOf(env)

  let body = {}
  try {
    body = await request.json()
  } catch {
    return no('Не разобрали запрос.')
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
  const role = body.role === 'teacher' ? 'teacher' : 'student'
  const pass = String(body.password ?? '')

  if (!EMAIL.test(email)) return no('Почта написана не полностью — нужен адрес вида имя@почта.ру.')
  if (name.length < 2) return no('Не сказано, как вас зовут: это имя увидит класс.')
  // Длина честнее сложности: «Xy7!» короче и хуже, чем четыре обычных слова.
  if (pass.length < 8) return no('Пароль короче восьми знаков. Длина надёжнее сложности: возьмите четыре слова.')

  const already = await env.DB.prepare('SELECT id FROM people WHERE email = ?').bind(email).first()
  if (already) return no('Такая почта уже занята. Если это вы — войдите.', 409)

  const id = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO people (id, email, name, role, pass, made_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(id, email, name, role, await hashPass(pass), new Date().toISOString()).run()

  return say({ id, name, role }, 200, await makeCookie(id, secret))
}

export const onRequest = (ctx) =>
  ctx.request.method === 'POST' ? make(ctx) : no('Этот путь отвечает только на POST.', 405)
