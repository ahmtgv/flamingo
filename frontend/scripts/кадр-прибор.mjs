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
import { writeFileSync } from 'node:fs'

/* 🔴 ИМЯ ПЕРЕМЕННОЙ ЛАТИНИЦЕЙ. `export СТЕНД=…` bash не берёт вовсе:
   «not a valid identifier», и прибор молча уходит на порт по умолчанию. */
const АДРЕС = process.env.STAND || 'http://127.0.0.1:5180'

const ЭКРАНЫ = ['титул', 'титул-молчит', 'вход', 'новый-пароль', 'кабинет',
  'кабинет-полный-день', 'кабинет-ученик', 'журнал', 'создать-урок',
  'правка-урока', 'хаб', 'приглашение', 'вход-в-комнату', 'вход-в-комнату-свой',
  'комната', 'битая-ссылка', 'доска', 'чат', 'переписка', 'переписка-ученик']

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
        const цели = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="radio"]')]
          .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
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
        return {
          прокрутка: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          областей: прокр, целей: цели.length, вне: вне.length,
          внеИмена: вне.slice(0, 3).map((x) => `${x.и}@${Math.round(x.r.top)}`),
          мелких: цели.filter((e) => e.getBoundingClientRect?.().height < 44).length,
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

const первый = КАДРЫ[0][2]
console.log(`\n── левый край содержимого и заголовки, ${КАДРЫ[0][0]} ──`)
for (const x of всё.filter((x) => x.кадр === первый)) {
  const г = (x.заг || [])[0]
  console.log(`  ${x.экран.padEnd(22)} лев ${String(x.лев).padStart(4)}  ${г ? `${г.т} ${г.к}/${г.в} «${г.сл}»` : '—'}`)
}
const кегли = [...new Set(всё.filter((x) => x.кадр === первый).flatMap((x) => (x.заг || []).map((з) => з.к)))].sort((a, b) => b - a)
console.log(`\nкегли заголовков: ${кегли.join(', ')}`)
process.exit(бед ? 1 : 0)
