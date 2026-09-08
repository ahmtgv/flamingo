/** Караул: у каждого адреса своё имя вкладки.
 *
 *  🔴 ЗАЧЕМ. Наряд 5, пункт 7 аудита 07.09: на всех девяти адресах стояло
 *  «Flamingo — комната» из `index.html`, а `document.title` не выставлял никто.
 *  У преподавателя открыты кабинет, журнал и комната — три вкладки с одним
 *  именем и одним значком; различить их можно только переключившись в каждую.
 *  То же в истории браузера, в закладках и в переключателе окон на телефоне.
 *
 *  Правило: каждый адрес, который `App.tsx` разбирает, назван в перечислении
 *  имён вкладки — и имена между собой РАЗНЫЕ. Второе не мелочь: перечисление,
 *  где два адреса зовут одним словом, ловит первое правило и не ловит второе,
 *  а человеку от одинаковых имён ровно так же нечего различать.
 *
 *  `--selftest` скармливает караулу App без ветки журнала и требует красного.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const APP = fileURLToPath(new URL('../src/App.tsx', import.meta.url))

/** Кусок между `const имя = (() => {` и его закрытием — только перечисление. */
export function кусокИмён(текст) {
  const начало = текст.indexOf('const имя = (() => {')
  if (начало < 0) return ''
  const конец = текст.indexOf('})()', начало)
  return конец < 0 ? '' : текст.slice(начало, конец)
}

export function пути(текст) {
  const из = new Set()
  for (const m of текст.matchAll(/path\s*===\s*'([^']+)'/g)) из.add(m[1])
  for (const m of текст.matchAll(/path\.startsWith\('([^']+)'\)/g)) из.add(m[1])
  return [...из]
}

export function имена(кусок) {
  return [...кусок.matchAll(/return\s+'([^']+)'/g)].map((m) => m[1])
}

export function проверить(текст) {
  const кусок = кусокИмён(текст)
  if (!кусок) return { нет: пути(текст), одинаковые: [], пусто: true }
  const названы = new Set(пути(кусок))
  const нет = пути(текст).filter((п) => !названы.has(п))
  const счёт = new Map()
  for (const и of имена(кусок)) счёт.set(и, (счёт.get(и) ?? 0) + 1)
  /* «Flamingo» без уточнения — это и титул, и запасной ответ в конце: два
     повтора здесь законны, и только они. */
  const одинаковые = [...счёт].filter(([и, n]) => n > 1 && !(и === 'Flamingo' && n === 2))
  return { нет, одинаковые, пусто: false }
}

if (process.argv.includes('--selftest')) {
  const без = `
    if (path === '/кабинет') {}
    if (path === '/журнал') {}
    const имя = (() => {
      if (path === '/кабинет') return 'Кабинет — Flamingo'
      return 'Flamingo'
    })()`
  const r = проверить(без)
  if (!r.нет.includes('/журнал')) {
    console.log('❌ самопроверка: не замечен адрес без имени вкладки')
    process.exit(1)
  }
  const два = `
    if (path === '/кабинет') {}
    if (path === '/журнал') {}
    const имя = (() => {
      if (path === '/кабинет') return 'Кабинет — Flamingo'
      if (path === '/журнал') return 'Кабинет — Flamingo'
      return 'Flamingo'
    })()`
  if (!проверить(два).одинаковые.length) {
    console.log('❌ самопроверка: не замечены два адреса с одним именем')
    process.exit(1)
  }
  console.log('✅ самопроверка: безымянный адрес и два одинаковых имени замечены')
  process.exit(0)
}

const текст = readFileSync(APP, 'utf8')
const { нет, одинаковые, пусто } = проверить(текст)

console.log(`\nИмена вкладок: адресов в App.tsx — ${пути(текст).length}`)

if (пусто) {
  console.log('\n❌ перечисления имён вкладки в App.tsx нет вовсе.')
  console.log('   Тогда на всех адресах стоит одно имя из index.html.\n')
  process.exit(1)
}
if (нет.length || одинаковые.length) {
  if (нет.length) {
    console.log('\n❌ у адреса нет своего имени вкладки:\n')
    for (const п of нет) console.log(`   ${п}`)
  }
  if (одинаковые.length) {
    console.log('\n❌ одно имя вкладки на несколько адресов:\n')
    for (const [и, n] of одинаковые) console.log(`   «${и}» — ${n} раза`)
  }
  console.log('\n   Вкладки различают по имени. Одинаковые имена нечем различить.\n')
  process.exit(1)
}
console.log('✅ у каждого адреса своё имя вкладки\n')
