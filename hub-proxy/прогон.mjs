/* Прибор посредника. Поднимает пробный сайт, который запрещает рамку, и сам
   посредник в пробном режиме; настоящим браузером проходит путь человека.

     node прогон.mjs

   Нужен Playwright с хромом (на сервере он не обязателен: прибор гоняют там,
   где ведётся разработка). */
import http from 'node:http'
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

let chromium
try { ({ chromium } = createRequire(import.meta.url)('playwright')) } catch {
  console.log('⚠️ нет playwright — прибор не запущен'); process.exit(3)
}

let бед = 0, проверок = 0
const есть = (условие, что) => { проверок += 1; if (!условие) бед += 1; console.log(`  ${условие ? '✅' : '❌'} ${что}`) }

const ПЕРВАЯ = `<!doctype html><meta charset=utf-8><title>Пробный музей</title>
<style>a.b{display:inline-block;padding:14px 22px;background:#2f6b3f;color:#fff}a.b:hover{background:#b3261e}</style>
<body style="margin:24px;font:20px sans-serif"><h1 id=h>Пробный музей</h1>
<p><a class=b id=a href="/зал">В зал</a></p><p id=t>Текст, который можно выделить</p>
<p id=где></p><script>
document.getElementById('где').textContent = location.hostname + ' / ' + (window.top === window ? 'верх' : 'в рамке')
fetch('/данные').then(r => r.text()).then(т => { document.title = 'данные: ' + т })
</script></body>`
const ЗАЛ = `<!doctype html><meta charset=utf-8><title>Зал</title><body><h1 id=h>Зал живописи</h1></body>`
const сайт = http.createServer((з, о) => {
  const путь = decodeURIComponent(з.url)
  const тело = путь.startsWith('/данные') ? 'пришли' : путь.startsWith('/зал') ? ЗАЛ : ПЕРВАЯ
  о.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'" })
  о.end(тело)
}).listen(8041, '127.0.0.1')

writeFileSync('/tmp/прогон-посредник-каталог.json', JSON.stringify([{ id: 'проба', home: 'http://127.0.0.1:8041/', name: 'Проба' }]))
const запуск = (ещё) => spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, HUB_PROXY_SOURCES: '/tmp/прогон-посредник-каталог.json', ...ещё }, stdio: 'inherit',
})
const посредник = запуск({ HUB_PROXY_PORT: '8042', HUB_PROXY_TEST: '1' })
/* Пробный сервер учётных записей: знает одну куку и отвечает только на своё имя. */
const учётки = http.createServer((з, о) => {
  const свой = з.headers.host === 'api.flamingo.plus' && з.url === '/api/auth/me'
  о.writeHead(свой ? 200 : 400, { 'Content-Type': 'application/json' })
  о.end(JSON.stringify({ person: свой && /fl_ses=nastoyaschaya/.test(з.headers.cookie ?? '') ? { name: 'Аня' } : null }))
}).listen(8044, '127.0.0.1')
const строгий = запуск({ HUB_PROXY_PORT: '8043', HUB_PROXY_ORIGIN: 'http://localhost:8043', HUB_PROXY_AUTH: 'http://127.0.0.1:8044' })
await new Promise((г) => setTimeout(г, 900))

const б = await chromium.launch()
try {
  console.log('\nЧто отдаёт посредник')
  let о = await fetch('http://127.0.0.1:8042/')
  есть(о.status === 200 && (о.headers.get('content-security-policy') ?? '').includes('frame-ancestors https://flamingo.plus'),
    'страница разрешает рамку только Flamingo')
  есть((await fetch('http://127.0.0.1:8042/sw.js')).headers.get('service-worker-allowed') === '/', 'служебный работник отдаётся')
  есть((await fetch('http://127.0.0.1:8042/scram/scramjet.wasm.wasm')).headers.get('content-type') === 'application/wasm', 'движок отдаётся')
  есть((await fetch('http://127.0.0.1:8042/../server.mjs')).status === 404 && (await fetch('http://127.0.0.1:8042/%2e%2e/package.json')).status === 404,
    'выше своей папки посредник не отдаёт')
  есть((await fetch('http://127.0.0.1:8042/', { method: 'POST' })).status === 405, 'принимает только чтение')

  console.log('\nПуть человека')
  const с = await б.newPage({ viewport: { width: 1100, height: 700 } })
  const ошибки = []
  с.on('pageerror', (e) => ошибки.push(e.message))
  await с.goto('http://localhost:8042/#проба')
  const рамка = с.frameLocator('#рамка')
  await рамка.locator('#h').waitFor({ timeout: 30000 })
  есть((await рамка.locator('#h').innerText()) === 'Пробный музей', 'сайт, запретивший рамку, открылся настоящей страницей')
  есть((await рамка.locator('#где').innerText()).startsWith('127.0.0.1 / верх'), 'сайт считает, что открыт сам по себе и по своему адресу')
  await с.waitForTimeout(800)
  есть((await с.frame({ url: /scramjet/ })?.title()) === 'данные: пришли', 'запросы самого сайта идут через посредник')
  await рамка.locator('#a').hover()
  есть((await рамка.locator('#a').evaluate((э) => getComputedStyle(э).backgroundColor)) === 'rgb(179, 38, 30)', 'наведение мыши работает')
  await рамка.locator('#t').selectText()
  есть((await с.frame({ url: /scramjet/ }).evaluate(() => String(getSelection()))).includes('можно выделить'), 'текст выделяется')
  await рамка.locator('#a').click()
  await рамка.locator('text=Зал живописи').waitFor({ timeout: 15000 })
  есть(true, 'ссылка ведёт дальше внутри той же рамки')
  await с.evaluate(() => window.postMessage({ flamingoHub: true, что: 'назад' }, '*'))
  await рамка.locator('text=Пробный музей').waitFor({ timeout: 15000 })
  есть(true, '«назад» от «Источников» возвращает')
  есть(ошибки.length === 0, `страница посредника без ошибок${ошибки.length ? ': ' + ошибки[0] : ''}`)

  const чужое = await б.newPage()
  await чужое.goto('http://localhost:8042/#https://evil.example/')
  await чужое.waitForTimeout(700)
  есть((await чужое.locator('#слова').innerText()).includes('в каталоге нет'), 'адрес вместо имени источника не открывается')

  console.log('\nКто может пользоваться тоннелем')
  const гость = await б.newPage()
  await гость.goto('http://localhost:8043/#проба')
  await гость.waitForTimeout(900)
  есть((await гость.locator('#слова').innerText()).includes('Войдите во Flamingo'), 'гостю — «войдите», источник не открывается')
  const код = (шапки) => new Promise((готово) => {
    const з = http.request({ host: '127.0.0.1', port: 8043, path: '/wisp/', headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': 'x3JJHMbDL1EzLkh9GBhXDw==', 'Sec-WebSocket-Version': '13', ...шапки } })
    з.on('response', (о) => готово(о.statusCode)); з.on('upgrade', () => готово(101)); з.on('error', () => готово(0)); з.end()
  })
  есть((await код({ Origin: 'https://evil.example' })) === 403, 'тоннель с чужой страницы закрыт')
  есть((await код({ Origin: 'http://localhost:8043' })) === 401, 'тоннель без входа закрыт')
  есть((await код({ Origin: 'http://localhost:8043', Cookie: 'fl_ses=poddelka' })) === 401, 'поддельная кука не проходит')
  есть((await код({ Origin: 'http://localhost:8043', Cookie: 'a=1; fl_ses=nastoyaschaya' })) === 101, 'вошедшему со страницы посредника тоннель открыт')
  есть((await код({ Origin: 'https://evil.example', Cookie: 'fl_ses=nastoyaschaya' })) === 403, 'вошедшему с чужой страницы — закрыт')
} finally {
  await б.close(); посредник.kill(); строгий.kill(); сайт.close(); учётки.close()
}
console.log(`\n${бед ? '❌' : '✅'} бед ${бед} · проверок ${проверок}`)
process.exit(бед ? 1 : 0)
