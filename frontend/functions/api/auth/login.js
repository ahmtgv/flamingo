import { checkPass, guard, makeCookie, no, noDb, ready, say, secretOf } from '../_people.js'

async function enter({ request, env }) {
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
  const pass = String(body.password ?? '')

  const row = await env.DB.prepare('SELECT id, name, role, pass FROM people WHERE email = ?')
    .bind(email).first()

  // 🔴 Один и тот же отказ на «нет такой почты» и «пароль не тот»: разные ответы
  // превращают вход в способ узнать, кто у нас зарегистрирован.
  const wrong = () => no('Почта или пароль не подошли.', 401)
  if (!row) {
    // Считаем пароль впустую, чтобы ответ занял столько же времени.
    await checkPass(pass, 'pbkdf2$210000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    return wrong()
  }
  if (!(await checkPass(pass, row.pass))) return wrong()

  return say({ id: row.id, name: row.name, role: row.role }, 200,
    await makeCookie(row.id, secret))
}

export const onRequest = guard((ctx) =>
  ctx.request.method === 'POST' ? enter(ctx) : no('Этот путь отвечает только на POST.', 405))
