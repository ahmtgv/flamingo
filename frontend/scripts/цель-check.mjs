/** Караул целей нажатия. Проверяет ТЕКСТОМ то, что прибор мерил браузером.
 *
 *  🔴 ЗАЧЕМ. Прибор 12.09 обошёл 14 экранов и нашёл больше полусотни органов
 *  ростом 34, 40 и 42 при `--tap-min: 44`. Починены они одним правилом в
 *  `src/styles/base.css`; караул стоит, чтобы правило не исчезло тихо и чтобы
 *  система снова не начала себе противоречить.
 *
 *  Что проверяем:
 *   1. --control-height-md не ниже --tap-min (иначе КАЖДАЯ кнопка мала);
 *   2. в base.css есть общее правило рамки: `min-height: var(--tap-min)` и
 *      `min-width: var(--tap-min)` внутри `::before` для органов управления;
 *   3. ни один модуль не задаёт органу `overflow: hidden` вместе с ростом
 *      ниже --tap-min: такая кнопка срезает собственную рамку, и общее
 *      правило до неё не достаёт — там растёт сама кнопка.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

export function число(текст, имя) {
  const м = текст.match(new RegExp(`${имя}:\\s*(\\d+(?:\\.\\d+)?)px`))
  return м ? parseFloat(м[1]) : null
}

/** Есть ли в общем листе правило, добирающее цель до --tap-min. */
export function общаяРамка(base) {
  const блоки = base.match(/::before\s*\{[^}]*\}/g) ?? []
  return блоки.some((б) =>
    /min-height:\s*var\(--tap-min\)/.test(б) && /min-width:\s*var\(--tap-min\)/.test(б))
}

/** Правила, где орган и режет себя, и ниже нормы: общая рамка их не спасёт. */
export function срезающие(css) {
  const из = []
  const re = /([^{}]+)\{([^}]*)\}/g
  let м
  while ((м = re.exec(css))) {
    const сел = м[1].trim(), тело = м[2]
    if (сел.startsWith('@') || сел.includes('::')) continue
    if (!/cursor:\s*pointer/.test(тело)) continue
    if (!/overflow:\s*hidden/.test(тело)) continue
    const в = тело.match(/min-height:\s*var\(--([\w-]+)\)/)
    if (в && в[1] !== 'tap-min') из.push(сел.split(',')[0].trim() + ' (' + в[1] + ')')
  }
  return из
}

function файлы(дир) {
  const из = []
  for (const и of readdirSync(дир)) {
    const п = join(дир, и)
    if (statSync(п).isDirectory()) из.push(...файлы(п))
    else if (и.endsWith('.css')) из.push(п)
  }
  return из
}

if (process.argv.includes('--selftest')) {
  const п = []
  const добрый = 'a::before { min-height: var(--tap-min); min-width: var(--tap-min); }'
  if (!общаяРамка(добрый)) п.push('не увидел общую рамку')
  if (общаяРамка('a::before { min-height: var(--tap-min); }')) п.push('счёл рамкой половину правила')
  if (общаяРамка('a { min-height: var(--tap-min); min-width: var(--tap-min); }')) п.push('принял обычное правило за рамку')
  const режет = '.к { cursor: pointer; overflow: hidden; min-height: var(--control-height-sm); }'
  if (срезающие(режет).length !== 1) п.push('не нашёл кнопку, срезающую свою рамку')
  if (срезающие(режет.replace('--control-height-sm', '--tap-min')).length) п.push('ругается на кнопку, которая уже 44')
  if (срезающие('.к { overflow: hidden; min-height: var(--control-height-sm); }').length) п.push('счёл органом то, что не нажимается')
  if (число('--tap-min: 44px;', '--tap-min') !== 44) п.push('не прочитал токен')
  if (п.length) { console.error('❌ самопроверка цель-check:'); for (const с of п) console.error('   ' + с); process.exit(1) }
  console.log('✅ самопроверка цель-check')
  process.exit(0)
}

const беды = []
const токены = readFileSync(join(КОРЕНЬ, 'styles', 'tokens.css'), 'utf8')
const мин = число(токены, '--tap-min')
const сред = число(токены, '--control-height-md')
if (мин === null || сред === null) беды.push('в tokens.css не нашлись --tap-min и --control-height-md')
else if (сред < мин) беды.push(`--control-height-md ${сред} ниже --tap-min ${мин}: каждая кнопка продукта не дотягивает`)

const base = readFileSync(join(КОРЕНЬ, 'styles', 'base.css'), 'utf8')
if (!общаяРамка(base)) беды.push('в base.css пропало общее правило цели: рамка ::before с min-width и min-height по --tap-min')

let срезов = 0
for (const ф of файлы(КОРЕНЬ)) {
  for (const с of срезающие(readFileSync(ф, 'utf8'))) {
    срезов++
    беды.push(`${ф.replace(КОРЕНЬ, 'src')}: ${с} — кнопка режет себя overflow: hidden и ниже 44; общая рамка сюда не достаёт, растить надо саму кнопку`)
  }
}

if (беды.length) { console.error('❌ цели нажатия:'); for (const б of беды) console.error('   ' + б); process.exit(1) }
console.log(`✅ цели: --control-height-md ${сред} ≥ --tap-min ${мин}; общее правило рамки на месте; кнопок, режущих свою рамку, — ${срезов}`)
