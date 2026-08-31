/** Общее для входа и регистрации: пароли, сессии, ответы.
 *
 *  🔴 Пароль НИКОГДА не хранится и не логируется. В базу уезжает только результат
 *  PBKDF2 с личной солью: по нему пароль не восстановить. Проверка идёт сравнением
 *  постоянного времени — иначе по скорости ответа подбирают хеш побайтно.
 *
 *  Сессия — подписанная кука HttpOnly: её не прочитает ни один скрипт на странице,
 *  поэтому чужой скрипт не сможет унести чужой урок.
 */

const ITER = 210000

const b64url = (bytes) => {
  let s = ''
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const unb64url = (s) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(t + '='.repeat((4 - (t.length % 4)) % 4))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export async function hashPass(pass, saltRaw) {
  const salt = saltRaw ?? crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, key, 256)
  return `pbkdf2$${ITER}$${b64url(salt)}$${b64url(bits)}`
}

/** Сравнение постоянного времени: по скорости ответа хеш не подбирают. */
function same(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function checkPass(pass, stored) {
  const parts = String(stored).split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const again = await hashPass(pass, unb64url(parts[2]))
  return same(again, stored)
}

async function sign(text, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)))
}

const DAYS = 30

export async function makeCookie(id, secret) {
  const exp = Date.now() + DAYS * 24 * 3600 * 1000
  const body = b64url(new TextEncoder().encode(JSON.stringify({ id, exp })))
  const ses = `${body}.${await sign(body, secret)}`
  return `fl_ses=${ses}; Path=/; Max-Age=${DAYS * 24 * 3600}; HttpOnly; Secure; SameSite=Lax`
}

export const dropCookie = () => 'fl_ses=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'

export async function whoFrom(request, secret) {
  const raw = (request.headers.get('Cookie') ?? '')
    .split(';').map((x) => x.trim()).find((x) => x.startsWith('fl_ses='))
  if (!raw) return null
  const [body, sig] = raw.slice(7).split('.')
  if (!body || !sig) return null
  if (!same(sig, await sign(body, secret))) return null
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64url(body)))
    if (!data.id || typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return data.id
  } catch {
    return null
  }
}

export const say = (data, status = 200, cookie) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  })

/** Отказ называет причину словами (ПРАВИЛА 6.4). */
export const no = (error, status = 400) => say({ error }, status)

/** 🔴 Сетка под всеми тремя путями.
 *
 *  Любая неожиданная ошибка внутри функции — и Cloudflare отдаёт СВОЮ HTML-страницу.
 *  Наш разбор ответа на ней спотыкается, и человек видит «Сервер ответил не по-нашему
 *  (500)»: отказ без причины, из которого непонятно ни что делать, ни кому жаловаться.
 *  Ровно это владелец и увидел на боевом 31.08.
 *
 *  guard() ловит всё и отвечает нашим JSON со словами. Причина уходит в журнал
 *  Cloudflare, а не человеку: подробности поломки — это подсказка тому, кто ломает.
 */
export const guard = (fn) => async (ctx) => {
  try {
    return await fn(ctx)
  } catch (e) {
    console.error('учётные записи:', e?.stack ?? String(e))
    return no('Не вышло: сервер споткнулся, и мы это видим. Урок по ссылке работает.', 500)
  }
}

/** Пока база не привязана, вход честно говорит об этом, а не молчит. */
export const noDb = () =>
  no('Учётные записи ещё не подключены: у этой сборки нет хранилища. Урок по ссылке работает.', 503)

/** Ключ подписи сессий.
 *
 *  Если владелец задал SESSION_SECRET в панели — берём его: секрет, лежащий отдельно
 *  от данных, сильнее ключа, лежащего с ними рядом. Если не задал — заводим ключ сами,
 *  один раз, и храним в той же базе. Это снимает с владельца третий шаг настройки:
 *  достаточно создать базу и привязать её как DB.
 *
 *  🔴 Гонка при первом запросе. Два запроса могут прийти одновременно и сгенерировать
 *  два разных ключа. Поэтому вставка идёт через INSERT OR IGNORE, а дальше ключ
 *  ПЕРЕЧИТЫВАЕТСЯ из базы: оба запроса возьмут тот, который лёг первым, и подписи
 *  не разойдутся. Без перечитывания половина кук оказалась бы подписана ключом,
 *  которого в базе нет.
 */
export async function secretOf(env) {
  if (env.SESSION_SECRET) return env.SESSION_SECRET
  if (!env.DB) return null
  const have = await env.DB.prepare("SELECT val FROM keys WHERE name = 'session'").first()
  if (have?.val) return have.val
  const made = b64url(crypto.getRandomValues(new Uint8Array(48)))
  await env.DB.prepare("INSERT OR IGNORE INTO keys (name, val, made_at) VALUES ('session', ?, ?)")
    .bind(made, new Date().toISOString()).run()
  const back = await env.DB.prepare("SELECT val FROM keys WHERE name = 'session'").first()
  return back?.val ?? made
}

/** 🔴 Таблицы заводятся ДО любого чтения, и это не украшение.
 *  Раньше `CREATE TABLE IF NOT EXISTS people` стоял только в регистрации. На свежей
 *  базе первый человек, который нажал «Войти», а не «Завести», получал
 *  `no such table: people` — пятисотку вместо слов «почта или пароль не подошли».
 *  Поймано живым проходом на чистой базе, ровно в том состоянии, в котором боевой
 *  оказался сразу после подключения D1.
 */
export async function ready(env) {
  await env.DB.prepare(CREATE_SQL).run()
  await env.DB.prepare(KEYS_SQL).run()
}

export const KEYS_SQL = `
CREATE TABLE IF NOT EXISTS keys (
  name    TEXT PRIMARY KEY,
  val     TEXT NOT NULL,
  made_at TEXT NOT NULL
);`

export const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS people (
  id      TEXT PRIMARY KEY,
  email   TEXT UNIQUE NOT NULL,
  name    TEXT NOT NULL,
  role    TEXT NOT NULL,
  pass    TEXT NOT NULL,
  made_at TEXT NOT NULL
);`
