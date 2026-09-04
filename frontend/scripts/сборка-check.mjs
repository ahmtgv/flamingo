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

  if (беды.length) {
    console.error(`ДЕФЕКТ · ${беды.length}\n`)
    беды.forEach((б) => console.error('  ' + б))
    process.exit(1)
  }
  console.log(`ok · собранных css ${css.length}, все адреса ведут в существующие файлы`)
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
  let плохо = 0
  for (const [имя, текст, ждали] of случаи) {
    const было = осмотр('образец', текст, есть).length
    const ок = было === ждали
    if (!ок) плохо += 1
    console.log(`${ок ? 'ok  ' : 'ПЛОХО'} ${имя}: ждали ${ждали}, получили ${было}`)
  }
  if (плохо) {
    console.error(`\nСАМОПРОВЕРКА ПРОВАЛЕНА · ${плохо}`)
    process.exit(1)
  }
  console.log(`\nсамопроверка: ${случаи.length} из ${случаи.length}`)
}

if (process.argv.includes('--selftest')) selftest()
else run()
