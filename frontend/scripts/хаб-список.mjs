/** Список источников хаба для сервера — и караул, что он не разошёлся с каталогом.
 *
 *  🔴 КАТАЛОГ ОДИН. Он живёт в `src/hub/sources.ts`, потому что его читает
 *  витрина. Серверу за снимками нужны из него две вещи — `id` и `home`, — и
 *  переписать их руками во вторую таблицу значит завести вторую правду:
 *  добавят источник в каталог, забудут в таблице, и снимка у него не будет
 *  никогда, молча. Поэтому таблицу делает эта программа, а караул сверяет.
 *
 *      node scripts/хаб-список.mjs --записать   # пересобрать файл
 *      node scripts/хаб-список.mjs              # караул: сошлось или нет
 *      node scripts/хаб-список.mjs --selftest   # проверить сам караул
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ЗДЕСЬ = dirname(fileURLToPath(import.meta.url))
const КАТАЛОГ = resolve(ЗДЕСЬ, '../src/hub/sources.ts')
const ФАЙЛ = resolve(ЗДЕСЬ, '../../backend/common/хаб-источники.json')

/** Из текста каталога вынимаем пары «id — home». Разбором текста, а не ввозом:
 *  `sources.ts` — это TypeScript, и node его не читает. */
export function разобрать(текст) {
  const записи = []
  const куски = текст.split(/\{\s*\n?\s*id:\s*'/).slice(1)
  for (const кусок of куски) {
    const id = кусок.slice(0, кусок.indexOf("'"))
    const дом = /home:\s*'([^']+)'/.exec(кусок)
    const имя = /name:\s*'([^']+)'/.exec(кусок)
    if (!id || !дом) continue
    записи.push({ id, home: дом[1], name: имя ? имя[1] : id })
  }
  return записи
}

/** 🔴 ОТКАЗ ЧЕЛОВЕКА ЕДЕТ ВМЕСТЕ СО СПИСКОМ. Если витрина источника — реклама,
 *  решает это человек в `БЕЗ_СНИМКА` (там же и написано, чем именно она плоха),
 *  и серверу надо знать об этом ДО того, как он пойдёт скачивать: иначе он
 *  каждые сутки будет исправно приносить карточку, которую мы не покажем. */
export function отказы(текст) {
  const кусок = /export const БЕЗ_СНИМКА[^{]*\{([\s\S]*?)\n\}/.exec(текст)
  if (!кусок) return new Set()
  return new Set([...кусок[1].matchAll(/^\s*([A-Za-z0-9_-]+)\s*:/gm)].map((м) => м[1]))
}

function собрать() {
  if (!existsSync(КАТАЛОГ)) {
    console.error(`нет каталога: ${КАТАЛОГ}`)
    process.exit(1)
  }
  const текст = readFileSync(КАТАЛОГ, 'utf8')
  const без = отказы(текст)
  const записи = разобрать(текст).map((з) => ({ ...з, снимок: !без.has(з.id) }))
  if (!записи.length) {
    console.error('в каталоге не нашлось ни одного источника — разбор сломался')
    process.exit(1)
  }
  const плохие = записи.filter((з) => !/^[a-z0-9][a-z0-9_-]*$/i.test(з.id))
  if (плохие.length) {
    console.error('имя источника идёт в имя файла и в адрес, поэтому только буквы,')
    console.error('цифры, дефис и подчёркивание. Не годятся: ' + плохие.map((з) => з.id).join(', '))
    process.exit(1)
  }
  const свои = записи.filter((з) => !/^https?:\/\//.test(з.home))
  if (свои.length) {
    console.error('у источника должен быть полный адрес: ' + свои.map((з) => з.id).join(', '))
    process.exit(1)
  }
  return JSON.stringify(записи, null, 1) + '\n'
}

if (process.argv.includes('--selftest')) {
  const плохо = разобрать(`const S = [{ id: 'a', name: 'А', home: 'https://a.example' },\n{ id: 'b', name: 'Б', home: 'https://b.example' }]`)
  const сошлось = плохо.length === 2 && плохо[0].id === 'a' && плохо[1].home === 'https://b.example'
  const пусто = разобрать('ничего похожего').length === 0
  const о = отказы(`export const БЕЗ_СНИМКА: Record<string, string> = {\n  x: 'раз',\n  y: 'два',\n}`)
  const взял = о.size === 2 && о.has('x') && о.has('y')
  const нету = отказы('никаких отказов тут нет').size === 0
  console.log(сошлось && пусто && взял && нету
    ? 'самопроверка: разбор берёт пары и отказы и не выдумывает их на пустом месте'
    : 'самопроверка ПРОВАЛЕНА')
  process.exit(сошлось && пусто && взял && нету ? 0 : 1)
}

const надо = собрать()

if (process.argv.includes('--записать')) {
  writeFileSync(ФАЙЛ, надо, 'utf8')
  console.log(`✅ список источников записан: ${JSON.parse(надо).length} шт.`)
  process.exit(0)
}

const было = existsSync(ФАЙЛ) ? readFileSync(ФАЙЛ, 'utf8') : ''
if (было !== надо) {
  console.error('')
  console.error('❌ список источников для сервера разошёлся с каталогом витрины:')
  console.error('')
  console.error('   backend/common/хаб-источники.json  ≠  frontend/src/hub/sources.ts')
  console.error('')
  console.error('   Почините одной командой:  node scripts/хаб-список.mjs --записать')
  console.error('')
  process.exit(1)
}
console.log(`✅ список источников сходится с каталогом: ${JSON.parse(надо).length} шт.`)
