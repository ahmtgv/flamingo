/* Караул СОБРАННОГО, а не исходников.
 *
 * 🔴 ПОЧЕМУ ОН ПОЯВИЛСЯ. `@fontsource-variable/inter` установился наполовину:
 *    сеть оборвалась, npm вернул ошибку, я посмотрел в папку `files`, увидел
 *    там кириллический woff2 и решил, что всё на месте. Файлов было 2 из 42.
 *    Дальше молчали все: пакет есть, css есть, `@font-face` в сборке есть —
 *    а `url(./files/inter-…woff2)` остался НЕПЕРЕПИСАННЫМ, потому что файла,
 *    на который он указывает, не существует. Сборка зелёная, тесты зелёные,
 *    в браузере — системный шрифт вместо голоса языка, и никакой ошибки.
 *
 * 🔴 ЧТО МЕРЯЕТСЯ. В собранном CSS не должно остаться ни одного адреса,
 *    который сборщик не переписал: все свои файлы уезжают в `/assets/…` с
 *    отпечатком. Уцелевший `url(./…)` или `url(../…)` — это ровно тот случай:
 *    ссылка в никуда, которая на бою даёт 404 и молчаливую подмену шрифта.
 *    Заодно проверяется, что каждый адрес `/assets/…` существует файлом.
 *
 * Запуск: node scripts/сборка-check.mjs [--selftest]   (после vite build)
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')

/** Разбор одного собранного css. `есть` отвечает, лежит ли файл в dist. */
export function осмотр(имя, css, есть) {
  const беды = []
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const адрес = m[1].trim()
    if (/^(data:|https?:|\/\/|#)/.test(адрес)) continue
    if (адрес.startsWith('./') || адрес.startsWith('../')) {
      беды.push(`${имя} — сборщик не переписал адрес ${адрес}: файла, на который он указывает, нет. На бою это 404 и молчаливая подмена шрифта`)
      continue
    }
    if (адрес.startsWith('/') && !есть(адрес)) {
      беды.push(`${имя} — адрес ${адрес} никуда не ведёт: такого файла в сборке нет`)
    }
  }
  return беды
}

/** 🔴 АДРЕС РАЗРАБОТЧИКА В БОЕВОЙ СБОРКЕ.
 *
 *  Случилось 30.08: забытый локальный `.env` унёс в боевую сборку
 *  `http://localhost:8080`, и продукт молча ходил в никуда. Заметить это можно
 *  было только по неработающей комнате — ни ошибки, ни красного, ни строчки в
 *  журнале. Тогда лечили запретом: боевой код не читал окружение вовсе.
 *
 *  09.09 запрет снят — адрес сервера один на весь продукт и берётся из
 *  окружения. Значит мина вернулась бы, если бы не эта проверка: она смотрит в
 *  СОБРАННЫЙ файл, то есть туда, где ложь уже материализовалась, и ей всё равно,
 *  из какого `.env` адрес приехал.
 *
 *  Сборку на Cloudflare это не спасает и не должно: там локального `.env` нет
 *  физически. Спасает того, кто однажды соберёт боевое руками на своей машине. */
export function адресаРазработчика(js) {
  const беды = []
  for (const m of js.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/g)) {
    беды.push(m[0])
  }
  return [...new Set(беды)]
}

function run() {
  if (!existsSync(DIST)) {
    console.error('ДЕФЕКТ · нет папки dist — караул смотрит собранное, запускать после vite build')
    process.exit(1)
  }
  const assets = join(DIST, 'assets')
  const css = existsSync(assets) ? readdirSync(assets).filter((н) => н.endsWith('.css')) : []
  if (!css.length) {
    console.error('ДЕФЕКТ · в сборке нет ни одного css — так не бывает')
    process.exit(1)
  }
  const есть = (адрес) => existsSync(join(DIST, адрес.replace(/^\//, '').split('?')[0]))
  const беды = []
  for (const н of css) беды.push(...осмотр('dist/assets/' + н, readFileSync(join(assets, н), 'utf8'), есть))

  const js = existsSync(assets) ? readdirSync(assets).filter((н) => н.endsWith('.js')) : []
  if (!js.length) {
    console.error('ДЕФЕКТ · в сборке нет ни одного js — так не бывает')
    process.exit(1)
  }
  for (const н of js) {
    for (const а of адресаРазработчика(readFileSync(join(assets, н), 'utf8'))) {
      беды.push(`dist/assets/${н} — в боевой сборке адрес разработчика ${а}. `
        + 'Проверьте frontend/.env: он не попадает в git, но попадает в сборку, собранную руками')
    }
  }

  if (беды.length) {
    console.error(`ДЕФЕКТ · ${беды.length}\n`)
    беды.forEach((б) => console.error('  ' + б))
    process.exit(1)
  }
  console.log(`ok · css ${css.length}: все адреса ведут в существующие файлы`)
  console.log(`ok · js ${js.length}: ни одного адреса разработчика`)
}

function selftest() {
  const есть = (а) => а === '/assets/есть.woff2'
  const случаи = [
    ['переписанный адрес', 'src: url(/assets/есть.woff2)', 0],
    ['адрес в никуда', 'src: url(/assets/нету.woff2)', 1],
    ['НЕпереписанный адрес — та самая беда', "src: url(./files/inter-cyrillic-wght-normal.woff2)", 1],
    ['непереписанный на уровень выше', 'src: url(../files/x.woff2)', 1],
    ['data-адрес не трогаем', 'src: url(data:font/woff2;base64,AAA)', 0],
    ['чужой сайт не трогаем', 'src: url(https://cdn.example/x.woff2)', 0],
    ['адрес в кавычках', "src: url('./files/x.woff2')", 1],
  ]
  const адреса = [
    ['чистая сборка', 'fetch("https://api.flamingo.plus/api/room/token")', 0],
    ['та самая мина 30.08', 'const B="http://localhost:8080";', 1],
    ['она же через 127.0.0.1', 'fetch("http://127.0.0.1:8080/api")', 1],
    ['без порта тоже ловим', 'x="http://localhost/api"', 1],
    ['два разных — два раза', 'a="http://localhost:8080";b="http://127.0.0.1:5180"', 2],
    ['один и тот же дважды — одна беда', 'a="http://localhost:8080";b="http://localhost:8080"', 1],
    ['слово localhost в тексте — не адрес', 'const т="откройте localhost в браузере"', 0],
  ]
  let плохо = 0
  for (const [имя, текст, ждали] of случаи) {
    const было = осмотр('образец', текст, есть).length
    const ок = было === ждали
    if (!ок) плохо += 1
    console.log(`${ок ? 'ok  ' : 'ПЛОХО'} ${имя}: ждали ${ждали}, получили ${было}`)
  }
  for (const [имя, текст, ждали] of адреса) {
    const было = адресаРазработчика(текст).length
    const ок = было === ждали
    if (!ок) плохо += 1
    console.log(`${ок ? 'ok  ' : 'ПЛОХО'} ${имя}: ждали ${ждали}, получили ${было}`)
  }
  if (плохо) {
    console.error(`\nСАМОПРОВЕРКА ПРОВАЛЕНА · ${плохо}`)
    process.exit(1)
  }
  console.log(`\nсамопроверка: ${случаи.length + адреса.length} из ${случаи.length + адреса.length}`)
}

if (process.argv.includes('--selftest')) selftest()
else run()
