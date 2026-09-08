/** Караул: межстрочное и межбуквенное — токенами, а не числами.
 *
 *  ПРАВИЛА 2.8 и 5 CLAUDE.md: голых значений в стилях нет, экран берёт токен.
 *  `guard-check` рядом держит это для `px` и цветов, а `line-height` и
 *  `letter-spacing` — безразмерные, и мимо него проходили молча.
 *
 *  🔴 ЧТО НАШЛОСЬ, КОГДА ПОСМОТРЕЛИ. Одно значение — `0.08em` — стояло голым
 *  в СЕМНАДЦАТИ местах: во всех прописных микро-подписях продукта. Шкала о нём
 *  не знала: у неё четыре ступени, а продукт пользовался пятой. Теперь у него
 *  есть имя (`--tracking-caps`), и спор с оговоркой «never on Cyrillic
 *  micro-labels» стал виден, а не растворён в семнадцати числах.
 *
 *  Исключение — файловое и СО СЧЁТОМ:
 *
 *      типографика-исключение (11): <почему этот файл живёт своей шкалой>
 *
 *  Счёт обязателен нарочно: файл с оговоркой без числа тихо копит новые голые
 *  значения, и оговорка становится бессрочным разрешением. С числом добавление
 *  двенадцатого краснеет.
 *
 *      node scripts/типографика-check.mjs [--selftest]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ИСХОД = fileURLToPath(new URL('../src', import.meta.url))
const ТОКЕНЫ = 'styles/tokens.css'

function всеCSS(дир) {
  const из = []
  for (const имя of readdirSync(дир)) {
    const п = `${дир}/${имя}`
    if (statSync(п).isDirectory()) из.push(...всеCSS(п))
    else if (имя.endsWith('.css')) из.push(п)
  }
  return из
}

/** Голые значения `line-height` / `letter-spacing`. `0` считаем словом, а не
 *  числом: это приём сброса у знаков, а не ступень шкалы. */
export function голые(текст) {
  const без = текст.replace(/\/\*[\s\S]*?\*\//g, '')
  const из = []
  for (const m of без.matchAll(/(line-height|letter-spacing)\s*:\s*([^;{}]+)/g)) {
    const знач = m[2].trim()
    if (знач.includes('var(') || знач === '0' || знач === 'inherit' || знач === 'normal') continue
    из.push(`${m[1]}: ${знач}`)
  }
  return из
}

/** Файловая оговорка со счётом: `типографика-исключение (11): почему`. */
export function оговорка(текст) {
  const m = текст.match(/типографика-исключение\s*\((\d+)\)\s*:\s*(.+)/)
  return m ? { сколько: +m[1], почему: m[2].trim() } : null
}

if (process.argv.includes('--selftest')) {
  const т = '.a { line-height: 1.5; letter-spacing: var(--tracking-caps); }\n.b { line-height: 0; }\n/* было line-height: 1.9 */'
  const г = голые(т)
  if (г.length !== 1 || г[0] !== 'line-height: 1.5') {
    console.log(`❌ самопроверка: голые разобраны как ${JSON.stringify(г)}`); process.exit(1)
  }
  const о = оговорка('/* типографика-исключение (11): титул живёт своей шкалой */')
  if (!о || о.сколько !== 11) { console.log('❌ самопроверка: оговорка со счётом не прочитана'); process.exit(1) }
  if (оговорка('/* типографика-исключение: без счёта */')) {
    console.log('❌ самопроверка: оговорка без счёта зачтена'); process.exit(1)
  }
  console.log('✅ самопроверка: токен, ноль и комментарий не в счёт; оговорка без числа не в счёт')
  process.exit(0)
}

const беды = []
let всего = 0
for (const путь of всеCSS(ИСХОД)) {
  const имя = путь.slice(ИСХОД.length + 1)
  if (имя === ТОКЕНЫ) continue
  const текст = readFileSync(путь, 'utf8')
  const г = голые(текст)
  всего += г.length
  if (!г.length) continue
  const о = оговорка(текст)
  if (!о) { беды.push(`${имя} — голых значений ${г.length}: ${г.slice(0, 3).join(', ')}`); continue }
  if (о.сколько !== г.length) {
    беды.push(`${имя} — оговорка обещает ${о.сколько}, а голых ${г.length}: ${г.slice(0, 3).join(', ')}`)
  }
}

console.log(`\nТипографика: голых значений межстрочного и межбуквенного — ${всего}`)
if (беды.length) {
  console.log('\n❌ значение задано числом, а не токеном:\n')
  for (const б of беды) console.log(`   ${б}`)
  console.log('\n   Экран берёт ступень шкалы; шкала живёт в styles/tokens.css.')
  console.log('   Если файл честно живёт своей шкалой — оговорка СО СЧЁТОМ:')
  console.log('       /* типографика-исключение (N): <почему> */\n')
  process.exit(1)
}
console.log('✅ каждое значение — либо токен, либо названная словами оговорка\n')
