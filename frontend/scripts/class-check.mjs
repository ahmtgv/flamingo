/** Сверка: каждый `s.имя` в разметке должен существовать в своём CSS-модуле.
 *
 *  🔴 Зачем прибор на такую мелочь. CSS-модули МОЛЧАТ: `s.copyField`, которого
 *  нет в файле, превращается в `undefined`, класс не ставится, и элемент просто
 *  теряет оформление — без единой ошибки в консоли и без падения сборки.
 *  Глазом это ловится только тогда, когда экран уже показали человеку.
 *
 *  🔴 Считаем ПО ФАЙЛУ СТИЛЕЙ, а не по файлу разметки: один модуль берут
 *  несколько соседей (Board.module.css — и Board.tsx, и Tools.tsx). Считать
 *  по одному значит объявить чужое лишним.
 *
 *  🔴 Обратную сторону — «класс описан, но никем не взят» — печатаем ЗАМЕТКОЙ,
 *  а не дефектом: классы берут и вычислением (`s['h_' + dir]`), и такое
 *  разбором не увидеть. Прибор, который врёт, хуже отсутствующего.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, basename } from 'node:path'

const КОРЕНЬ = new URL('../src', import.meta.url).pathname

function всеФайлы(путь, из = []) {
  for (const имя of readdirSync(путь)) {
    const п = join(путь, имя)
    if (statSync(п).isDirectory()) всеФайлы(п, из)
    else из.push(п)
  }
  return из
}

const файлы = всеФайлы(КОРЕНЬ)
/** css → { взяты:Set, где:Map(имя→файл), вычисляют:boolean } */
const по = new Map()

for (const tsx of файлы.filter((f) => f.endsWith('.tsx'))) {
  const текст = readFileSync(tsx, 'utf8')
  for (const m of текст.matchAll(/import\s+(\w+)\s+from\s+'([^']*\.module\.css)'/g)) {
    const [, знак, откуда] = m
    const css = resolve(dirname(tsx), откуда)
    if (!по.has(css)) по.set(css, { взяты: new Set(), где: new Map(), вычисляют: false })
    const у = по.get(css)
    if (new RegExp(`\\b${знак}\\[`).test(текст)) у.вычисляют = true
    for (const b of текст.matchAll(new RegExp(`\\b${знак}\\.([A-Za-zА-Яа-я][\\w]*)`, 'gu'))) {
      у.взяты.add(b[1])
      if (!у.где.has(b[1])) у.где.set(b[1], basename(tsx))
    }
  }
}

const беды = []
const заметки = []
let сверено = 0

for (const [css, у] of по) {
  const стили = readFileSync(css, 'utf8')
  const есть = new Set([...стили.matchAll(/\.([A-Za-zА-Яа-я][\w-]*)/gu)].map((m) => m[1]))
  сверено += у.взяты.size
  for (const имя of у.взяты) {
    if (!есть.has(имя)) беды.push(`${у.где.get(имя)} берёт .${имя} — в ${basename(css)} такого класса нет`)
  }
  if (!у.вычисляют) {
    for (const имя of есть) {
      if (!у.взяты.has(имя)) заметки.push(`${basename(css)}: .${имя} описан, но никем не взят`)
    }
  }
}

if (заметки.length) {
  console.log(`заметки · ${заметки.length} (не дефект: класс мог остаться от прошлой правки)`)
  for (const з of заметки.slice(0, 12)) console.log('  · ' + з)
  if (заметки.length > 12) console.log(`  · …и ещё ${заметки.length - 12}`)
  console.log('')
}
if (беды.length) {
  console.log(`ДЕФЕКТ · ${беды.length}\n`)
  for (const б of беды) console.log('  ' + б)
  process.exit(1)
}
console.log(`ok · сверено имён классов ${сверено}, модулей ${по.size}`)
