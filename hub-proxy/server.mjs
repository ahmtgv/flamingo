/* Посредник «Источников мира» (решение владельца 11.11.2026).
 *
 * 🔴 ЗАЧЕМ. Три четверти источников запрещают показывать себя внутри чужой
 * страницы: рамка у человека пустая. Здесь источник открывается через нас —
 * настоящим сайтом в браузере самого человека, а не картинкой: страницу
 * переписывает на лету открытый движок Scramjet, а сюда, на сервер, приходит
 * только зашифрованный поток (`/wisp/`), который мы пересылаем сайту.
 *
 * 🔴 ЭТО ОТДЕЛЬНЫЙ АДРЕС — hub.flamingo.plus, И ОТДЕЛЬНАЯ СЛУЖБА. Чужой сайт,
 * открытый здесь, исполняется на этом адресе. На адресе самого Flamingo ему
 * делать нечего; а сервер учётных записей не принимает отсюда никаких
 * изменений (`backend/config/откуда.py`).
 *
 * 🔴 ТОННЕЛЬ НЕ ДЛЯ ВСЕХ И НЕ КУДА УГОДНО. `/wisp/` — это, по сути, выход в
 * сеть с нашего сервера. Поэтому: только вошедшему во Flamingo (спрашиваем
 * сервер учётных записей по куке), только со страницы самого посредника,
 * только на порты 80 и 443, без внутренних адресов и без нашего же домена.
 *
 * Движок и транспорты — чужие, под лицензией AGPL-3.0; мы их не меняем, а
 * исходники названы на странице `/о-движке.txt`.
 */
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { server as wisp, logging } from '@mercuryworkshop/wisp-js/server'

const ЗДЕСЬ = dirname(fileURLToPath(import.meta.url))
const ПОРТ = Number(process.env.HUB_PROXY_PORT ?? 8031)
const ХОЗЯИН = process.env.HUB_PROXY_BIND ?? '127.0.0.1'
/** Наш собственный адрес: тоннель открывается только страницам отсюда. */
const СВОЙ_АДРЕС = (process.env.HUB_PROXY_ORIGIN ?? 'https://hub.flamingo.plus').replace(/\/$/, '')
/** Кому можно вставлять нас в рамку. */
const РОДИТЕЛИ = process.env.HUB_PROXY_PARENTS ?? 'https://flamingo.plus https://www.flamingo.plus'
/** Сервер учётных записей — рядом, на этой же машине. */
const УЧЁТКИ = (process.env.HUB_PROXY_AUTH ?? 'http://127.0.0.1:8000').replace(/\/$/, '')
/** Только для прибора: пустить без входа и к своему пробному сайту. */
const ПРОБА = process.env.HUB_PROXY_TEST === '1'
const КАТАЛОГ = resolve(ЗДЕСЬ, process.env.HUB_PROXY_SOURCES ?? '../backend/common/хаб-источники.json')

const М = join(ЗДЕСЬ, 'node_modules', '@mercuryworkshop')
/** Что раздаём: адрес → папка. Больше с диска не уходит ничего. */
const ПАПКИ = {
  '/scram/': join(М, 'scramjet', 'dist'),
  '/baremux/': join(М, 'bare-mux', 'dist'),
  '/epoxy/': join(М, 'epoxy-transport', 'dist'),
  '/libcurl/': join(М, 'libcurl-transport', 'dist'),
  '/': join(ЗДЕСЬ, 'public'),
}
const ТИПЫ = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json', '.svg': 'image/svg+xml',
}

// ── тоннель: куда можно ──────────────────────────────────────────────────────
logging.set_level(logging.WARN)
Object.assign(wisp.options, {
  allow_udp_streams: false,
  allow_direct_ip: ПРОБА,
  allow_private_ips: false,
  allow_loopback_ips: ПРОБА,
  port_whitelist: ПРОБА ? null : [80, 443],
  /* Сами себя через себя не открываем: это был бы запрос к нашему серверу
     уже «изнутри», мимо Cloudflare. */
  hostname_blacklist: [/(^|\.)flamingo\.plus$/i, /^localhost$/i].slice(0, ПРОБА ? 1 : 2),
  stream_limit_per_host: 24,
  stream_limit_total: 96,
  parse_real_ip: true,
})

// ── кто пришёл: спрашиваем сервер учётных записей ────────────────────────────
const знакомые = new Map() // кука → { до, вошёл }
async function вошёл(кука) {
  if (ПРОБА) return true
  const знак = /(?:^|;\s*)fl_ses=([^;]+)/.exec(кука ?? '')?.[1]
  if (!знак) return false
  const было = знакомые.get(знак)
  if (было && было.до > Date.now()) return было.вошёл
  let да = false
  try {
    const о = await fetch(`${УЧЁТКИ}/api/auth/me`, { headers: { Cookie: `fl_ses=${знак}` }, signal: AbortSignal.timeout(5000) })
    да = о.ok && Boolean((await о.json()).person)
  } catch { да = false }
  if (знакомые.size > 5000) знакомые.clear()
  знакомые.set(знак, { до: Date.now() + 60_000, вошёл: да })
  return да
}

// ── каталог: посредник открывает только то, с чего начинают в «Источниках» ──
function каталог() {
  try {
    return Object.fromEntries(JSON.parse(readFileSync(КАТАЛОГ, 'utf8')).map((и) => [и.id, { home: и.home, name: и.name }]))
  } catch { return {} }
}

function шапки(тип, путь) {
  const ш = {
    'Content-Type': тип,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    /* Движок и служебный работник не должны застревать в кэше: обновили
       посредник — у людей он обновился. Сами файлы движка отдаём с проверкой. */
    'Cache-Control': 'no-cache',
  }
  if (тип.startsWith('text/html')) ш['Content-Security-Policy'] = `frame-ancestors ${РОДИТЕЛИ}`
  if (путь === '/sw.js') ш['Service-Worker-Allowed'] = '/'
  return ш
}

const сервер = http.createServer(async (запрос, ответ) => {
  let путь
  try { путь = decodeURIComponent(new URL(запрос.url, 'http://x').pathname) } catch { путь = '/' }
  if (запрос.method !== 'GET' && запрос.method !== 'HEAD') { ответ.writeHead(405).end(); return }

  if (путь === '/sources.json') {
    ответ.writeHead(200, шапки(ТИПЫ['.json'], путь)).end(JSON.stringify(каталог()))
    return
  }
  if (путь === '/я') {
    ответ.writeHead(200, шапки(ТИПЫ['.json'], путь)).end(JSON.stringify({ вошёл: await вошёл(запрос.headers.cookie) }))
    return
  }
  if (путь === '/') путь = '/index.html'

  const начало = Object.keys(ПАПКИ).find((н) => путь.startsWith(н))
  const папка = ПАПКИ[начало]
  const файл = normalize(join(папка, путь.slice(начало.length)))
  if (!файл.startsWith(папка) || !existsSync(файл) || !ТИПЫ[extname(файл)]) {
    ответ.writeHead(404, шапки(ТИПЫ['.txt'], путь)).end('нет такого')
    return
  }
  try {
    const тело = await readFile(файл)
    ответ.writeHead(200, шапки(ТИПЫ[extname(файл)], путь)).end(запрос.method === 'HEAD' ? undefined : тело)
  } catch {
    ответ.writeHead(404).end()
  }
})

сервер.on('upgrade', async (запрос, сокет, голова) => {
  const отказ = (код, слова) => { сокет.end(`HTTP/1.1 ${код} ${слова}\r\nConnection: close\r\n\r\n`) }
  if (!запрос.url.startsWith('/wisp/')) return отказ(404, 'Not Found')
  /* Тоннель — только нашей странице. Чужой сайт, открывший его из браузера
     вошедшего человека, получил бы выход в сеть за его счёт. */
  if (!ПРОБА && запрос.headers.origin !== СВОЙ_АДРЕС) return отказ(403, 'Forbidden')
  if (!(await вошёл(запрос.headers.cookie))) return отказ(401, 'Unauthorized')
  wisp.routeRequest(запрос, сокет, голова)
})

сервер.listen(ПОРТ, ХОЗЯИН, () => {
  console.log(`посредник источников слушает ${ХОЗЯИН}:${ПОРТ}${ПРОБА ? ' · ПРОБНЫЙ РЕЖИМ' : ''}`)
})
