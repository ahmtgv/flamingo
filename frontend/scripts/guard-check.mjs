/* Прибор, а не осмотр.
 *
 * Меряет то, что можно померить без браузера, и падает громко. Три проверки — по числу
 * способов, которыми на прошлом проекте молча расходились код и правила:
 *
 *   1. ИМЯ ТОКЕНА, КОТОРОГО НЕТ. `var(--color-text-tertiaty)` работает: CSS молчит,
 *      цвет просто не применяется. В Board.tsx имена токенов читаются ещё и из строки —
 *      опечатка там даёт чёрный штрих вместо зелёного и ни одной ошибки в консоли.
 *   2. ГОЛОЕ ЗНАЧЕНИЕ (ПРАВИЛА 2.8). Разрешены только волосяные 0–3 px и проценты:
 *      всё прочее обязано браться токеном, иначе сетка разъезжается по одному экрану.
 *   3. МОЛЧАЩАЯ КНОПКА (ПРАВИЛА 14.1). Кнопка либо отвечает, либо объявлена немой
 *      словами. Необъявленное молчание неотличимо от дефекта.
 *
 * Запуск:  npm run guards        · npm run guards -- --selftest
 *
 * ⚠️ ПРИБОР ДОКАЗАН ПРОВАЛОМ, А НЕ ОСМОТРОМ (ПРАВИЛА 14.8). В первом же прогоне он
 * объявил дефектом каждый `--space-*`: имена токенов он искал только в начале строки,
 * а в tokens.css они стоят по четыре в ряд. Прибор, который врёт, хуже отсутствующего —
 * поэтому у него есть самопроверка, и она обязана падать на заведомо плохом образце.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// В пути проекта есть пробел, а `URL.pathname` отдаёт его как `%20` — и прибор
// падал бы «папки нет» на совершенно здоровом дереве.
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')

/** Имена токенов стоят в tokens.css по нескольку в строке — ищем везде, не в начале. */
export function tokenNames(css) {
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
}

/** Одна проверка одного файла. Возвращает список дефектов строками. */
export function inspect({ name, text, kind, known }) {
  const out = []
  const say = (line, what) => out.push(`${name}:${line} — ${what}`)
  const lines = text.split('\n')

  lines.forEach((line, i) => {
    const n = i + 1

    for (const m of line.matchAll(/var\((--[\w-]+)/g)) {
      if (!known.has(m[1])) say(n, `токена нет в tokens.css: ${m[1]}`)
    }
    for (const m of line.matchAll(/['"](--[\w-]+)['"]/g)) {
      if (!known.has(m[1])) say(n, `токена нет в tokens.css: ${m[1]} (в строке)`)
    }

    if (kind !== 'css') return
    if (/^\s*(\/\*|\*)/.test(line)) return

    for (const m of line.matchAll(/(?<![\w-])(\d+(?:\.\d+)?)px/g)) {
      if (Number(m[1]) > 3) say(n, `голый размер ${m[0]} — берётся токеном (ПРАВИЛА 2.8)`)
    }
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      say(n, `голый цвет ${m[0]} — берётся токеном (ПРАВИЛА 2.8)`)
    }
  })

  if (kind === 'tsx') {
    for (const m of text.matchAll(/<button\b[\s\S]*?>/g)) {
      const tag = m[0]
      const n = text.slice(0, m.index).split('\n').length
      const answers =
        /onClick=/.test(tag) ||
        /type="submit"/.test(tag) ||
        /data-still=/.test(tag) ||
        /\{\.\.\.rest\}/.test(tag)
      if (!answers) say(n, 'кнопка молчит и не объявлена немой (ПРАВИЛА 14.1)')
    }
  }

  return out
}

/* ── самопроверка: каждому правилу — свой подкладной образец ─────────────────── */

function selftest() {
  const known = tokenNames(':root { --a: 1px;  --b: 2px; }')
  const cases = [
    ['имя токена есть', { kind: 'css', text: '.x { color: var(--a); }' }, 0],
    ['имени токена нет', { kind: 'css', text: '.x { color: var(--nope); }' }, 1],
    ['имя токена в строке', { kind: 'tsx', text: `const c = '--nope'` }, 1],
    ['волосяная линия', { kind: 'css', text: '.x { border: 1px solid var(--a); }' }, 0],
    ['голый размер', { kind: 'css', text: '.x { padding: 24px; }' }, 1],
    ['голый цвет', { kind: 'css', text: '.x { color: #ff0000; }' }, 1],
    ['значение в комментарии', { kind: 'css', text: '  /* было 24px и #fff */' }, 0],
    ['кнопка отвечает', { kind: 'tsx', text: '<button onClick={go}>Да</button>' }, 0],
    ['кнопка объявлена немой', { kind: 'tsx', text: '<button data-still="показ">Да</button>' }, 0],
    ['кнопка молчит', { kind: 'tsx', text: '<button className={s.b}>Да</button>' }, 1],
    ['общая строка токенов', { kind: 'css', text: '.x { margin: var(--b); }' }, 0],
  ]

  let bad = 0
  for (const [title, f, expected] of cases) {
    const got = inspect({ name: 'образец', known, ...f }).length
    const ok = got === expected
    if (!ok) bad += 1
    console.log(`${ok ? 'ok  ' : 'ПЛОХО'} ${title}: ждали ${expected}, получили ${got}`)
  }
  if (bad) {
    console.error(`\nСАМОПРОВЕРКА ПРОВАЛЕНА · ${bad} из ${cases.length}`)
    process.exit(1)
  }
  console.log(`\nсамопроверка: ${cases.length} из ${cases.length}`)
}

/* ── прогон по дереву ────────────────────────────────────────────────────────── */

function walk(dir) {
  const out = []
  for (const nm of readdirSync(dir)) {
    const p = join(dir, nm)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

function run() {
  const known = tokenNames(readFileSync(join(SRC, 'styles/tokens.css'), 'utf8'))
  const defects = []
  let seen = 0

  for (const file of walk(SRC)) {
    const kind = file.endsWith('.css') ? 'css' : /\.tsx?$/.test(file) ? 'tsx' : null
    if (!kind) continue
    if (file.endsWith('styles/tokens.css')) continue
    seen += 1
    defects.push(
      ...inspect({ name: relative(ROOT, file), text: readFileSync(file, 'utf8'), kind, known }),
    )
  }

  if (defects.length) {
    console.error(`ДЕФЕКТ · ${defects.length}\n`)
    defects.forEach((d) => console.error('  ' + d))
    process.exit(1)
  }
  console.log(`ok · токенов известно ${known.size}, файлов просмотрено ${seen}`)
}

if (process.argv.includes('--selftest')) selftest()
else run()
