/** Прибор: недостижимые цели и разъехавшийся кадр — по стенду, в четырёх кадрах.
 *
 *  Это НЕ караул из `npm run guards`: караулу довольно исходников, а прибору
 *  нужен браузер и поднятый `npm run dev`. Он ходит по реестру стенда с
 *  `?чисто=1` (без полосы выбора, чтобы мерить продукт, а не оснастку) и
 *  считает три вещи:
 *
 *  1. НЕДОСТИЖИМЫЕ ЦЕЛИ. Нажимаемый элемент, чей низ или правый край за
 *     кадром, И НИ У ОДНОГО ПРЕДКА нет прокрутки по нужной оси. Оговорка
 *     важнее правила: первая версия прибора считала «за краем» и «недоступно»
 *     одним и тем же — и обвинила доску, у которой полка листов честно ездит
 *     вбок пальцем.
 *  2. ЛЕВЫЙ КРАЙ СОДЕРЖИМОГО. Меряется по элементам, у которых есть СВОЙ
 *     текстовый узел: блочный текст стоит ровно на краю содержимого своего
 *     контейнера. Мерить рамку экрана бесполезно — она всегда во всю ширину,
 *     и первый замер 08.09 из-за этого показал ноль на всех двадцати экранах.
 *  3. КЕГЛИ ЗАГОЛОВКОВ — все, что встретились, с тегом и весом.
 *
 *  Запуск:
 *      npm run dev            (в другом окне)
 *      node scripts/кадр-прибор.mjs [файл.json] [кадры через запятую]
      STAND=http://127.0.0.1:5199 CHROME=/путь/к/chrome node scripts/кадр-прибор.mjs
 *
 *  Кадры: настольный (1280×800), широкий (1512×944), android (360×740),
 *  iphone (390×844) — ПРАВИЛА 1.1 и 9.1.
 */

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/* 🔴 ИМЯ ПЕРЕМЕННОЙ ЛАТИНИЦЕЙ. `export СТЕНД=…` bash не берёт вовсе:
   «not a valid identifier», и прибор молча уходит на порт по умолчанию. */
const АДРЕС = process.env.STAND || 'http://127.0.0.1:5180'

/* 🔴 СПИСОК ЭКРАНОВ ЧИТАЕТСЯ ИЗ РЕЕСТРА СТЕНДА, А НЕ ЛЕЖИТ ЗДЕСЬ КОПИЕЙ.
   Копия отстаёт молча: в неё не попадают новые экраны, и прибор докладывает
   «всё чисто» про то, чего не открывал. Ровно так аудит 07.09 не увидел
   комнату. `fileURLToPath`, а не `.pathname`: кириллица в имени файла
   превращается в проценты. */
const СТЕНД_ФАЙЛ = fileURLToPath(new URL('../src/screens/Стенд.tsx', import.meta.url))
/* Берём только строки реестра — «имя» рядом с «путь». Без этого в список
   экранов попадают имена подложки (пособия урока тоже названы `имя`), и
   прибор ходит за несуществующими экранами. */
/* SCREENS=имя,имя — пройти только по названным. Полный прогон это 42 экрана
   на четыре кадра, и когда чинишь один экран, ждать все — потеря дня.
   Латиницей по той же причине, что и STAND: `export ЭКРАНЫ=` bash не берёт. */
const хочуЭкраны = (process.env.SCREENS || '').split(',').filter(Boolean)
const ЭКРАНЫ = [...readFileSync(СТЕНД_ФАЙЛ, 'utf8').matchAll(/имя:\s*'([^']+)',\s*путь:/g)]
  .map((м) => м[1])
  .filter((и) => и !== 'стенд')
  .filter((и) => !хочуЭкраны.length || хочуЭкраны.includes(и))

if (хочуЭкраны.length && ЭКРАНЫ.length !== хочуЭкраны.length) {
  const нет = хочуЭкраны.filter((и) => !ЭКРАНЫ.includes(и))
  console.log(`❌ таких экранов в реестре стенда нет: ${нет.join(', ')}`)
  process.exit(2)
}

const ВСЕ_КАДРЫ = [[1280, 800, 'настольный'], [1512, 944, 'широкий'],
  [360, 740, 'android'], [390, 844, 'iphone']]

const хочу = (process.argv[3] || '').split(',').filter(Boolean)
const КАДРЫ = хочу.length ? ВСЕ_КАДРЫ.filter((к) => хочу.includes(к[2])) : ВСЕ_КАДРЫ

const браузер = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--no-sandbox', '--no-proxy-server'],
})

const всё = []
for (const [ш, в, кадр] of КАДРЫ) {
  for (const э of ЭКРАНЫ) {
    const среда = await браузер.newContext({
      viewport: { width: ш, height: в }, isMobile: ш < 420, hasTouch: ш < 420,
    })
    const лист = await среда.newPage()
    try {
      await лист.goto(`${АДРЕС}/стенд?э=${encodeURIComponent(э)}&чисто=1`,
        { waitUntil: 'load', timeout: 15000 })
      await лист.waitForTimeout(700)
      const м = await лист.evaluate(() => {
        const видно = (e) => {
          const s = getComputedStyle(e)
          return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05
        }
        const достанем = (e, низом, справа) => {
          for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
            const s = getComputedStyle(p)
            if (низом && ['auto', 'scroll'].includes(s.overflowY) && p.scrollHeight > p.clientHeight + 2) return true
            if (справа && ['auto', 'scroll'].includes(s.overflowX) && p.scrollWidth > p.clientWidth + 2) return true
          }
          return false
        }
        /* 🔴 ЦЕЛЬ МОЖЕТ БЫТЬ БОЛЬШЕ САМОЙ КНОПКИ. Невидимая рамка `::before`
           с отрицательными отступами — законный приём: видимая пилюля тонкая,
           а палец берёт полные 44. Прибор, который меряет только сам элемент,
           докладывает промах там, где его нет, — а ложная находка стоит
           дороже пропущенной. */
        const целиком = (e) => {
          const r = e.getBoundingClientRect()
          let ш = r.width, в = r.height
          for (const псевдо of ['::before', '::after']) {
            const s = getComputedStyle(e, псевдо)
            if (!s || s.content === 'none' || s.position !== 'absolute') continue
            const ч = (v) => (v && v.endsWith('px') ? parseFloat(v) : 0)
            ш += Math.max(0, -ч(s.left)) + Math.max(0, -ч(s.right))
            в += Math.max(0, -ч(s.top)) + Math.max(0, -ч(s.bottom))
          }
          return { ш, в }
        }
        /* Поле, спрятанное от глаз, но живое для клавиатуры (`input[type=file]`
           за своей кнопкой), — законный приём, а не промах: меряется кнопка,
           которая его зовёт. Такие поля 1×1 и с `clip`. */
        const спрятано = (e) => {
          const s = getComputedStyle(e)
          /* 🔴 И `visibility: hidden` ТОЖЕ. У такого узла коробка остаётся, а
             нажать его нельзя — и `innerText` у него пустой. Прибор без этой
             проверки объявил безымянной вкладку «Доска 1» в комнате: имя у неё
             есть, просто панель в тот момент спрятана целиком. */
          return s.visibility === 'hidden' || s.clipPath !== 'none' || s.clip !== 'auto'
            || (e.clientWidth <= 1 && e.clientHeight <= 1)
        }
        const цели = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="radio"]')]
          .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !спрятано(e) })
        const вне = цели.map((e) => {
          const r = e.getBoundingClientRect()
          const низом = r.bottom > innerHeight + 1
          const справа = r.right > innerWidth + 1
          if (!низом && !справа) return null
          if (достанем(e, низом, справа)) return null
          return { и: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 24), r }
        }).filter(Boolean)
        const свойТекст = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
        const левые = [...document.querySelectorAll('body *')].filter((e) => {
          if (!свойТекст(e) || !видно(e)) return false
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.top < innerHeight && r.left >= 0 && r.left < innerWidth * 0.6
        }).map((e) => Math.round(e.getBoundingClientRect().left))
        const счёт = {}
        for (const л of левые) счёт[л] = (счёт[л] || 0) + 1
        const заг = [...document.querySelectorAll('h1,h2,h3,h4')].filter(видно).map((e) => {
          const s = getComputedStyle(e)
          return { т: e.tagName.toLowerCase(), к: Math.round(parseFloat(s.fontSize)), в: s.fontWeight,
            л: Math.round(e.getBoundingClientRect().left),
            сл: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 20) }
        })
        const прокр = [...document.querySelectorAll('*')].filter((e) =>
          e.scrollHeight > e.clientHeight + 2 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY)).length
        /* 🔴 ДВЕ ЦЕЛИ С ОДНИМ ИМЕНЕМ. Наряд 5, пункт 12. Имя цели — то, что
           слышит читалка и видит клавиатура; глазами их различает соседняя
           строка, а голосом — ничто. Померено 08.09: на экране хаба 44 цели и
           36 из них звались «открыть». Имя берём так же, как берёт браузер:
           `aria-label` ЗАМЕНЯЕТ текст, а не дополняет его, и `title` тоже. */
        const имяЦели = (e) => {
          /* 🔴 У ПОЛЯ ИМЯ БЕРЁТСЯ ИЗ ПОДПИСИ, А НЕ ИЗ СОДЕРЖИМОГО. Первый заход
             читал только `aria-label`/`title`/текст — и объявил безымянными
             четырнадцать полей на входе, регистрации и создании урока, у
             которых подпись есть и стоит рядом в `<label>`. Прибор, который
             ищет иначе, чем ищет браузер, находит не то. */
          const по = (в) => (в || '').replace(/\s+/g, ' ').trim()
          const прямо = по(e.getAttribute('aria-label'))
          if (прямо) return прямо
          const ссылка = e.getAttribute('aria-labelledby')
          if (ссылка) {
            const чужое = ссылка.split(/\s+/).map((id) => по(document.getElementById(id)?.innerText)).filter(Boolean)
            if (чужое.length) return чужое.join(' ')
          }
          if (e.id) {
            const подпись = document.querySelector(`label[for="${CSS.escape(e.id)}"]`)
            if (подпись) return по(подпись.innerText)
          }
          const обёртка = e.closest('label')
          if (обёртка) return по(обёртка.innerText)
          /* `textContent`, а не только `innerText`: второй зависит от раскладки
             и пуст у спрятанного узла — а имя у того есть. */
          const свой = по(e.innerText) || по(e.textContent)
          if (свой) return свой
          return по(e.getAttribute('title')) || по(e.getAttribute('placeholder'))
        }
        const поИмени = new Map()
        for (const e of цели) {
          const и = имяЦели(e)
          if (!и) continue
          поИмени.set(и, (поИмени.get(и) ?? 0) + 1)
        }
        const тёзки = [...поИмени].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1])

        return {
          прокрутка: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          областей: прокр, целей: цели.length, вне: вне.length,
          безымянных: цели.filter((e) => !имяЦели(e)).length,
          тёзки: тёзки.slice(0, 4).map(([и, n]) => [и.slice(0, 38), n]),
          тёзокВсего: тёзки.reduce((с, [, n]) => с + n - 1, 0),
          внеИмена: вне.slice(0, 3).map((x) => `${x.и}@${Math.round(x.r.top)}`),
          мелкие: цели.map((e) => {
            const { ш, в } = целиком(e)
            if (в >= 44 && ш >= 44) return null
            const r = e.getBoundingClientRect()
            return { и: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 22),
              ш: Math.round(ш), в: Math.round(в),
              видно: `${Math.round(r.width)}×${Math.round(r.height)}`,
              тускл: +getComputedStyle(e).opacity < 0.85 ? +getComputedStyle(e).opacity : null }
          }).filter(Boolean),
          лев: левые.length ? Math.min(...левые) : null,
          спектр: Object.entries(счёт).map(([л, н]) => [+л, н]).sort((a, b) => a[0] - b[0]),
          заг,
        }
      })
      всё.push({ экран: э, кадр, ...м, беда: м.вне > 0 })
    } catch (e) {
      всё.push({ экран: э, кадр, ошибка: String(e).slice(0, 80) })
    }
    await среда.close()
  }
}
await браузер.close()

const файл = process.argv[2]
if (файл) writeFileSync(файл, JSON.stringify(всё, null, 1))

/* 🔴 ПУСТОЙ ПРОГОН — НЕ ЗЕЛЁНЫЙ ПРОГОН. Когда стенд не поднят, каждый экран
   падает в `catch`, «недостижимых целей» выходит ноль, и прибор докладывает
   победу над мёртвым сервером. Поймано 08.09 на себе же. */
const павшие = всё.filter((x) => x.ошибка)
if (павшие.length) {
  console.log(`\n❌ не открылось экранов: ${павшие.length} из ${всё.length}`)
  console.log(`   ${павшие[0].экран} — ${павшие[0].ошибка}`)
  console.log(`   Стенд поднят? Адрес ${АДРЕС} (STAND=… меняет).`)
  process.exit(2)
}

let бед = 0
for (const [, , кадр] of КАДРЫ) {
  const группа = всё.filter((x) => x.кадр === кадр)
  const плохие = группа.filter((x) => x.беда)
  бед += плохие.length
  console.log(`\n══ ${кадр} ══ недостижимых целей на ${плохие.length} экранах из ${группа.length}`)
  for (const x of плохие) console.log(`   ❌ ${x.экран}: ${x.вне} — ${x.внеИмена.join(', ')}`)
}

/* ПРАВИЛА 12.6: цель нажатия не меньше --tap-min (44). Мера — МЕНЬШАЯ
   сторона: кнопка 474×42 промахнулась на два пикселя по высоте, а кружок
   20×20 не годится вовсе, и валить их в один список — прятать второе за
   первым. Порог грубого промаха — 32: ниже него палец мажет всегда. */
/* 🔴 ПОРОГ ВЗЯТ ИЗ ЗАКОНА, А НЕ ИЗ ОБЩЕГО ПРАВИЛА 44. ПРАВИЛА 7.1б и 7.2:
   вторичный контрол в плотном списке законно равен `--control-height-sm` (34),
   и решением владельца 08.09 он там и остаётся. Порог 44 держат главная кнопка,
   одиночный контрол вне списка и приглушённая дверь — их прибор по высоте не
   отличает, поэтому мерит по 34 и отдельно считает всё, что между 34 и 44:
   это не находки, а материал для глаз. */
const порог = 44
const грубо = 34
for (const кадр of КАДРЫ.map((к) => к[2])) {
  const строки = []
  const тесные = []
  for (const x of всё.filter((x) => x.кадр === кадр)) {
    let n = 0
    let наим = 99
    for (const м of x.мелкие || []) {
      const мера = Math.min(м.ш, м.в)
      if (мера < грубо) строки.push(`  ${x.экран.padEnd(20)} ${м.ш}×${м.в}${м.тускл ? ` · прозрачность ${м.тускл}` : ''}  «${м.и || '—'}»`)
      else if (мера < порог) { n += 1; наим = Math.min(наим, мера) }
    }
    if (n) тесные.push(`  ${x.экран.padEnd(20)} ${String(n).padStart(3)} целей, самая тесная ${наим}`)
  }
  if (строки.length || тесные.length) {
    console.log(`\n── цели нажатия, ${кадр} ──`)
    if (строки.length) {
      console.log(`  грубо мимо (меньшая сторона < ${грубо}):`)
      for (const с of строки) console.log(с)
    }
    if (тесные.length) {
      console.log(`  тесно (${грубо}…${порог - 1}):`)
      for (const с of тесные) console.log(с)
    }
  }
}

/* ── две цели с одним именем ─────────────────────────────────────────────── */
{
  const первый = КАДРЫ[0][2]
  const строки = всё.filter((x) => x.кадр === первый && (x.тёзокВсего || x.безымянных))
  console.log(`\n── имена целей, ${КАДРЫ[0][0]} ──`)
  if (!строки.length) console.log('  ✅ на каждом экране имена целей разные и ни одна не безымянна')
  for (const x of строки) {
    const части = []
    if (x.тёзокВсего) части.push(`тёзок ${x.тёзокВсего}`)
    if (x.безымянных) части.push(`безымянных ${x.безымянных}`)
    console.log(`  ${x.экран.padEnd(22)} ${части.join(' · ')}`)
    for (const [и, n] of x.тёзки || []) console.log(`      «${и}» — ${n}`)
  }
}

const первый = КАДРЫ[0][2]
console.log(`\n── левый край содержимого и заголовки, ${КАДРЫ[0][0]} ──`)
for (const x of всё.filter((x) => x.кадр === первый)) {
  const г = (x.заг || [])[0]
  console.log(`  ${x.экран.padEnd(22)} лев ${String(x.лев).padStart(4)}  ${г ? `${г.т} ${г.к}/${г.в} «${г.сл}»` : '—'}`)
}
const кегли = [...new Set(всё.filter((x) => x.кадр === первый).flatMap((x) => (x.заг || []).map((з) => з.к)))].sort((a, b) => b - a)
console.log(`\nкегли заголовков: ${кегли.join(', ')}`)
process.exit(бед ? 1 : 0)
