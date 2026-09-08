/** Караул: обрезанный текст называет себя целиком.
 *
 *  ПРАВИЛА 13.2. `ужимание-check` рядом проверяет ПОЛОВИНУ правила — что
 *  обрезание вообще срабатывает (`min-width: 0` при `ellipsis`). Вторая
 *  половина: у обрезанного текста должен быть способ прочитать его целиком.
 *
 *  🔴 ЧЕГО ЭТО СТОИЛО. «Пётр Вячеславович Хмельницки…» в журнале — 82 px
 *  срезано, и узнать имя целиком было негде: в журнале имя — единственное
 *  место, где человек назван. Найдено осмотром 08.09, починено там же.
 *  Караул заведён, чтобы это не вернулось третьим случаем.
 *
 *  Правило: если у класса написан `text-overflow: ellipsis`, то у КАЖДОГО
 *  узла, который этот класс носит, есть `title` или `aria-label`.
 *
 *  Исключение пишется словами в самом файле — комментарием
 *  `обрезание-исключение` в той же строке или в предыдущих трёх. Молчаливых
 *  исключений нет: если текст обрезан и назвать его нечем, это надо объяснить.
 *
 *      node scripts/обрезание-check.mjs [--selftest]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ИСХОД = fileURLToPath(new URL('../src', import.meta.url))

function всеФайлы(дир, расш) {
  const из = []
  for (const имя of readdirSync(дир)) {
    const путь = `${дир}/${имя}`
    if (statSync(путь).isDirectory()) из.push(...всеФайлы(путь, расш))
    else if (расш.some((р) => имя.endsWith(р))) из.push(путь)
  }
  return из
}

/** Классы, у которых написано обрезание многоточием. */
export function классыСОбрезанием(css) {
  const из = new Set()
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/text-overflow\s*:\s*ellipsis/.test(m[2])) continue
    for (const сел of m[1].split(',')) {
      for (const к of сел.matchAll(/\.([A-Za-zА-Яа-яЁё_][\wЀ-ӿ-]*)/g)) из.add(к[1])
    }
  }
  return из
}

/** Открывающий тег, внутри которого стоит позиция `i`. Возвращает его текст. */
export function тегВокруг(текст, i) {
  const начало = текст.lastIndexOf('<', i)
  if (начало < 0) return ''
  /* Идём вперёд до `>` верхнего уровня: внутри могут быть `{…}` со своими
     скобками и строки — считаем фигурные скобки, чтобы не остановиться на
     `>` внутри стрелочной функции. */
  let глубина = 0
  for (let j = начало; j < текст.length; j += 1) {
    const c = текст[j]
    if (c === '{') глубина += 1
    else if (c === '}') глубина -= 1
    else if (c === '>' && глубина === 0) return текст.slice(начало, j + 1)
  }
  return текст.slice(начало)
}

export function проверитьФайл(tsx, классы) {
  const беды = []
  for (const m of tsx.matchAll(/className=\{?[^}\n]*?s\.([A-Za-zА-Яа-яЁё_][\wЀ-ӿ]*)/g)) {
    if (!классы.has(m[1])) continue
    const тег = тегВокруг(tsx, m.index)
    if (/\btitle=/.test(тег) || /\baria-label=/.test(тег)) continue
    const доСюда = tsx.slice(0, m.index)
    const строки = доСюда.split('\n')
    const рядом = строки.slice(-4).join('\n')
    if (/обрезание-исключение/.test(рядом) || /обрезание-исключение/.test(тег)) continue
    беды.push({ класс: m[1], строка: строки.length })
  }
  return беды
}

if (process.argv.includes('--selftest')) {
  const css = '.имя { overflow: hidden; text-overflow: ellipsis; }\n.тихо { color: red; }'
  const классы = классыСОбрезанием(css)
  if (!классы.has('имя') || классы.has('тихо')) {
    console.log('❌ самопроверка: классы с обрезанием разобраны неверно')
    process.exit(1)
  }
  const плохо = '<span className={s.имя}>{кто}</span>'
  const хорошо = '<span className={s.имя} title={кто}>{кто}</span>'
  const сОговоркой = '/* обрезание-исключение: тут короткий код */\n<span className={s.имя}>{кто}</span>'
  const сострелкой = '<button className={s.имя} onClick={() => setX(a > b)} title="целиком">x</button>'
  if (проверитьФайл(плохо, классы).length !== 1) { console.log('❌ самопроверка: молчащее обрезание не поймано'); process.exit(1) }
  if (проверитьФайл(хорошо, классы).length !== 0) { console.log('❌ самопроверка: title не зачтён'); process.exit(1) }
  if (проверитьФайл(сОговоркой, классы).length !== 0) { console.log('❌ самопроверка: оговорка не зачтена'); process.exit(1) }
  if (проверитьФайл(сострелкой, классы).length !== 0) { console.log('❌ самопроверка: `>` внутри стрелки оборвал тег'); process.exit(1) }
  console.log('✅ самопроверка: обрезание без имени поймано, title и оговорка зачтены, стрелка не рвёт тег')
  process.exit(0)
}

let узлов = 0
const беды = []
for (const tsxПуть of всеФайлы(ИСХОД, ['.tsx'])) {
  const cssПуть = tsxПуть.replace(/\.tsx$/, '.module.css')
  let css
  try { css = readFileSync(cssПуть, 'utf8') } catch { continue }
  const классы = классыСОбрезанием(css)
  if (!классы.size) continue
  const tsx = readFileSync(tsxПуть, 'utf8')
  узлов += классы.size
  for (const б of проверитьФайл(tsx, классы)) {
    беды.push(`${tsxПуть.slice(ИСХОД.length + 1)}:${б.строка} — .${б.класс}`)
  }
}

console.log(`\nОбрезание: классов с многоточием — ${узлов}`)
if (беды.length) {
  console.log('\n❌ текст обрезан, а прочитать его целиком негде:\n')
  for (const б of беды) console.log(`   ${б}`)
  console.log('\n   ПРАВИЛА 13.2: у обрезанного текста есть `title` или `aria-label`.')
  console.log('   Если имени взять неоткуда — напишите рядом словами, почему:')
  console.log('       /* обрезание-исключение: <почему> */\n')
  process.exit(1)
}
console.log('✅ обрезанный текст везде называет себя целиком\n')
