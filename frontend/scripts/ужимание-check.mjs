/** Обрезание текста, которое молчит.
 *
 *  Правило одно: если в правиле написано `text-overflow: ellipsis`, рядом
 *  должен стоять `min-width: 0` (или `min-inline-size: 0`).
 *
 *  Почему это не педантизм. Флекс- и грид-элемент по умолчанию имеет
 *  `min-width: auto` и отказывается становиться уже своего содержимого.
 *  Обрезание при этом написано — и не срабатывает никогда: вместо многоточия
 *  растёт коробка, а за ней и всё, что снаружи. Ошибка тихая: в вёрстке всё
 *  «как задумано», пока в поле не попадёт длинная строка.
 *
 *  Так и вышло: ссылка-приглашение в моноширинном шрифте раздула панель
 *  журнала на 58 пикселей — «Закрыть» уехала за край панели, «Скопировать»
 *  обрезалась пополам. Нашлось глазами на живом сайте 02.09.2026.
 *
 *  Вне флекса и грида `min-width: 0` ничего не меняет (там и так ноль),
 *  поэтому правило можно требовать без оговорок. */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const КОРЕНЬ = new URL('../src/', import.meta.url).pathname

function всеФайлы(дир) {
  const из = []
  for (const имя of readdirSync(дир)) {
    const путь = join(дир, имя)
    if (statSync(путь).isDirectory()) из.push(...всеФайлы(путь))
    else if (имя.endsWith('.css')) из.push(путь)
  }
  return из
}

const беды = []
let правил = 0

for (const путь of всеФайлы(КОРЕНЬ)) {
  const текст = readFileSync(путь, 'utf8')
  for (const m of текст.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const тело = m[2]
    if (!/text-overflow\s*:\s*ellipsis/.test(тело)) continue
    правил++
    if (/min-(width|inline-size)\s*:\s*0/.test(тело)) continue
    const селектор = m[1].trim().split('\n').pop().trim()
    const строка = текст.slice(0, m.index).split('\n').length
    беды.push(`${путь.replace(КОРЕНЬ, 'src/')}:${строка}  ${селектор}`)
  }
}

console.log(`\nОбрезание текста: правил с многоточием — ${правил}`)
if (беды.length) {
  console.log('\n❌ многоточие написано, но не сработает (нет min-width: 0):\n')
  for (const б of беды) console.log('   ' + б)
  console.log('')
  process.exit(1)
}
console.log('✅ у каждого есть min-width: 0\n')
