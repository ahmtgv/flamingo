/** Прибор для входа и регистрации.
 *
 *  Функции Pages не запустить без Cloudflare, но всё, что в них есть своего —
 *  хеш пароля, подпись куки, ответы на чужие методы, — проверяется здесь на
 *  настоящем SQLite. Поддельная только оболочка D1: prepare / bind / first / run.
 *
 *  Запуск: node scripts/auth-check.mjs
 *
 *  🔴 ЧЕГО ЭТОТ ПРИБОР НЕ ВИДИТ. Он гоняет код в Node, а Node — не Cloudflare.
 *  Лимиты площадки (10 мс процессорного времени на бесплатном тарифе, потолок
 *  повторов PBKDF2) здесь не действуют, и 31.08 из-за этого на боевом падала
 *  каждая регистрация, пока прибор показывал зелёное. Локальный `wrangler pages dev`
 *  эти лимиты тоже не применяет — их видно ТОЛЬКО на боевом. Всё, что упирается
 *  во время или в память, проверяется выкатом, а не отсюда.
 */
import { DatabaseSync } from 'node:sqlite'

// ── поддельный D1 поверх настоящего SQLite ───────────────────────────────
function fakeD1() {
  const db = new DatabaseSync(':memory:')
  return {
    prepare(sql) {
      let args = []
      const self = {
        bind(...a) { args = a; return self },
        async first() { return db.prepare(sql).get(...args) ?? null },
        async run() { db.prepare(sql).run(...args); return { success: true } },
      }
      return self
    },
  }
}

const call = async (mod, method, { body, cookie, env }) => {
  const headers = new Headers()
  if (cookie) headers.set('Cookie', cookie)
  const request = new Request('https://flamingo.plus/api/auth/x', {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return mod.onRequest({ request, env })
}

const read = async (res) => ({
  status: res.status,
  cookie: res.headers.get('Set-Cookie'),
  data: await res.json(),
})

let bad = 0
const ok = (name, cond, why = '') => {
  if (cond) { console.log('  ✅', name) } else { bad += 1; console.log('  ❌', name, why) }
}

const register = await import('../functions/api/auth/register.js')
const login = await import('../functions/api/auth/login.js')
const me = await import('../functions/api/auth/me.js')

// ── 1. Без базы отказ говорит словами ────────────────────────────────────
console.log('\nБез базы:')
{
  const r = await read(await call(me, 'GET', { env: {} }))
  ok('GET /me отвечает 503, а не падает', r.status === 503, r.status)
  ok('в отказе сказано, что урок по ссылке работает',
    String(r.data.error).includes('Урок по ссылке'), r.data.error)
}

// ── 1б. Первое действие на пустой базе — ВХОД, а не регистрация ──────────
// Так и было на боевом: база создана, в ней ни одной таблицы. Раньше здесь
// падало `no such table: people`.
console.log('\nПервый человек на пустой базе жмёт «Войти»:')
{
  const fresh = { DB: fakeD1() }
  const r = await read(await call(login, 'POST', {
    env: fresh, body: { email: 'кто@нибудь.рф', password: 'какой-то пароль' } }))
  ok('отвечает 401 словами, а не падает', r.status === 401 && !!r.data.error, JSON.stringify(r.data))
  const m = await read(await call(me, 'GET', { env: fresh, cookie: 'fl_ses=YWJj.ZGVm' }))
  ok('/me с чужой кукой на пустой базе тоже не падает', m.status === 200, JSON.stringify(m.data))
}

// ── 2. Полный проход: завести → я → выйти → войти ────────────────────────
console.log('\nС базой, без SESSION_SECRET (ключ заводится сам):')
const env = { DB: fakeD1() }
let cookie = null
{
  const r = await read(await call(register, 'POST', {
    env, body: { email: 'Nina@Shkola.RU', name: '  Нина   Кузьмина ', role: 'teacher', password: 'четыре обычных слова' },
  }))
  ok('регистрация прошла', r.status === 200, JSON.stringify(r.data))
  ok('имя приведено в порядок', r.data.name === 'Нина Кузьмина', r.data.name)
  ok('роль сохранена', r.data.role === 'teacher', r.data.role)
  ok('кука HttpOnly', /HttpOnly/.test(r.cookie ?? ''), r.cookie)
  ok('кука Secure', /Secure/.test(r.cookie ?? ''), r.cookie)
  ok('кука SameSite=Lax', /SameSite=Lax/.test(r.cookie ?? ''), r.cookie)
  cookie = (r.cookie ?? '').split(';')[0]
}
{
  const r = await read(await call(me, 'GET', { env, cookie }))
  ok('/me узнаёт вошедшего', r.data.person?.name === 'Нина Кузьмина', JSON.stringify(r.data))
  ok('/me не отдаёт пароль', !('pass' in (r.data.person ?? {})), JSON.stringify(r.data.person))
}
{
  const r = await read(await call(me, 'GET', { env }))
  ok('без куки /me отвечает person:null', r.status === 200 && r.data.person === null, JSON.stringify(r.data))
}
{
  const r = await read(await call(me, 'GET', { env, cookie: 'fl_ses=cG9kZGVsa2E.cG9kcGlz' }))
  ok('подделанная кука не проходит', r.data.person === null, JSON.stringify(r.data))
}
{
  const [body] = cookie.slice(7).split('.')
  const r = await read(await call(me, 'GET', { env, cookie: `fl_ses=${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` }))
  ok('верное тело с чужой подписью не проходит', r.data.person === null, JSON.stringify(r.data))
}

// ── 3. Ключ пережил перезапуск ───────────────────────────────────────────
{
  const r = await read(await call(me, 'GET', { env: { DB: env.DB }, cookie }))
  ok('ключ взят из базы, а не сгенерирован заново', r.data.person?.name === 'Нина Кузьмина',
    JSON.stringify(r.data))
}

// ── 4. Вход ──────────────────────────────────────────────────────────────
console.log('\nВход:')
{
  const r = await read(await call(login, 'POST', {
    env, body: { email: 'nina@shkola.ru', password: 'четыре обычных слова' } }))
  ok('почта нечувствительна к регистру', r.status === 200, JSON.stringify(r.data))
}
{
  const r = await read(await call(login, 'POST', {
    env, body: { email: 'nina@shkola.ru', password: 'не тот пароль' } }))
  ok('неверный пароль — отказ 401', r.status === 401, r.status)
  var wrongPass = r.data.error
}
{
  const r = await read(await call(login, 'POST', {
    env, body: { email: 'нет-такого@shkola.ru', password: 'что угодно' } }))
  ok('незнакомая почта — тот же самый отказ', r.data.error === wrongPass,
    `${r.data.error} ≠ ${wrongPass}`)
}

// ── 5. Отказы регистрации ────────────────────────────────────────────────
console.log('\nОтказы регистрации:')
for (const [why, body, part] of [
  ['почта без домена', { email: 'нина', name: 'Нина', password: 'четыре обычных слова' }, 'Почта'],
  ['пустое имя', { email: 'a@b.ru', name: '', password: 'четыре обычных слова' }, 'зовут'],
  ['короткий пароль', { email: 'a@b.ru', name: 'Нина', password: 'семь__' }, 'восьми'],
]) {
  const r = await read(await call(register, 'POST', { env, body }))
  ok(`${why}: отказ словами`, r.status === 400 && String(r.data.error).includes(part), JSON.stringify(r.data))
}
{
  const r = await read(await call(register, 'POST', {
    env, body: { email: 'nina@shkola.ru', name: 'Нина', password: 'четыре обычных слова' } }))
  ok('занятая почта: 409 и предложение войти', r.status === 409 && r.data.error.includes('войдите'),
    JSON.stringify(r.data))
}

// ── 6. Чужие методы ──────────────────────────────────────────────────────
console.log('\nЧужие методы:')
for (const [name, mod, method] of [['register', register, 'GET'], ['login', login, 'GET'], ['me', me, 'POST']]) {
  const r = await read(await call(mod, method, { env }))
  ok(`${name} на ${method} — 405 со словами`, r.status === 405 && !!r.data.error, r.status)
}
{
  const r = await read(await call(me, 'DELETE', { env, cookie }))
  ok('выход гасит куку', /Max-Age=0/.test(r.cookie ?? ''), r.cookie)
}

// ── 7. Заданный SESSION_SECRET сильнее ключа из базы ─────────────────────
console.log('\nSESSION_SECRET из панели:')
{
  const r = await read(await call(me, 'GET', { env: { DB: env.DB, SESSION_SECRET: 'свой ключ' }, cookie }))
  ok('кука, подписанная ключом из базы, при заданном секрете не проходит',
    r.data.person === null, JSON.stringify(r.data))
}

// ── 8. Поломка внутри функции — всё равно НАШ ответ словами ──────────────
// Раньше любая неожиданная ошибка отдавалась HTML-страницей Cloudflare, и человек
// видел «Сервер ответил не по-нашему (500)». Владелец это и увидел на боевом 31.08.
console.log('\nЕсли внутри что-то сломалось:')
{
  const brokenDb = { prepare() { throw new Error('база вдруг отвалилась') } }
  // guard() пишет причину в журнал — здесь она ожидаема, глушим, чтобы не пугала.
  const wasErr = console.error
  console.error = () => {}
  for (const [name, mod, method, body] of [
    ['register', register, 'POST', { email: 'a@b.ru', name: 'Аня', password: 'четыре обычных слова' }],
    ['login', login, 'POST', { email: 'a@b.ru', password: 'четыре обычных слова' }],
    ['me', me, 'GET', undefined],
  ]) {
    const r = await read(await call(mod, method, { env: { DB: brokenDb }, body }))
    ok(`${name}: 500 нашим JSON, а не страницей Cloudflare`,
      r.status === 500 && String(r.data.error).includes('споткнулся'), JSON.stringify(r.data))
  }
  console.error = wasErr
}

console.log(bad ? `\n❌ провалов: ${bad}\n` : '\n✅ всё сходится\n')
process.exit(bad ? 1 : 0)
