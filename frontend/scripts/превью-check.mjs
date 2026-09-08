/** Караул: превью ссылки не врёт и не пропадает.
 *
 *  🔴 ПОЧЕМУ ЭТО КАРАУЛ, А НЕ «ПОСМОТРЕЛИ ОДИН РАЗ». Разметку превью читают
 *  ТОЛЬКО сборщики — Телеграм, ВК, WhatsApp, Слак, — и до нашего React они не
 *  доходят. Значит ошибку здесь не увидит ни один человек, открывший сайт: она
 *  видна только в чужом мессенджере и только тогда, когда ссылку уже отправили.
 *  Плюс сборщики кешируют результат надолго — испорченное превью живёт неделями.
 *
 *  Что проверяется:
 *    · обязательные поля на месте;
 *    · `og:image` дан АБСОЛЮТНЫМ адресом — относительный большинство сборщиков
 *      не разворачивает и картинки не покажет вовсе;
 *    · файл, на который он показывает, лежит в `public/`;
 *    · `og:image:width` и `height` совпадают с настоящим размером файла —
 *      иначе подменили картинку, а числа остались от прежней;
 *    · соотношение сторон близко к 1,91:1 (канон 1200×630): иначе сборщик
 *      обрежет по-своему, и обрежет обычно по середине;
 *    · заголовок в `index.html` совпадает с тем, что ставит `App.tsx` на «/» —
 *      у страницы одно имя, а не два.
 *
 *      node scripts/превью-check.mjs [--selftest]
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const HTML = fileURLToPath(new URL('../index.html', import.meta.url))
const PUBLIC = fileURLToPath(new URL('../public', import.meta.url))
const APP = fileURLToPath(new URL('../src/App.tsx', import.meta.url))

/** Размер PNG из заголовка IHDR — без библиотек: ширина и высота лежат
 *  четвёрками байт по смещению 16 и 20, старшим байтом вперёд. */
export function размерPNG(байты) {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
  if (байты.length < 24 || !байты.subarray(0, 4).equals(png)) return null
  return { ш: байты.readUInt32BE(16), в: байты.readUInt32BE(20) }
}

export function мета(html) {
  const из = {}
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"[\s\n]+content="([^"]*)"/g)) {
    из[m[1]] = m[2]
  }
  /* Атрибуты могут стоять и в одну строку, и в две — берём оба вида. */
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"\s*\/?>/g)) {
    из[m[1]] ??= m[2]
  }
  const t = html.match(/<title>([^<]*)<\/title>/)
  return { ...из, title: t ? t[1] : '' }
}

const НУЖНЫ = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type',
  'twitter:card', 'description']

export function проверить(html, естьФайл, размерФайла, имяВПродукте) {
  const м = мета(html)
  const беды = []

  for (const п of НУЖНЫ) if (!м[п]) беды.push(`нет поля ${п}`)
  if (!м.title) беды.push('нет <title>')

  const адрес = м['og:image'] ?? ''
  if (адрес && !/^https:\/\//.test(адрес)) {
    беды.push(`og:image дан не абсолютным адресом: «${адрес}» — сборщики его не развернут`)
  }
  if (адрес) {
    const имя = адрес.replace(/^https:\/\/[^/]+/, '')
    if (!естьФайл(имя)) беды.push(`файла ${имя} нет в public/`)
    else {
      const р = размерФайла(имя)
      if (!р) беды.push(`${имя} — не PNG или испорчен`)
      else {
        const ш = +(м['og:image:width'] ?? 0)
        const в = +(м['og:image:height'] ?? 0)
        if (ш !== р.ш || в !== р.в) {
          беды.push(`og:image:width/height говорят ${ш}×${в}, а файл ${р.ш}×${р.в}`)
        }
        const к = р.ш / р.в
        if (Math.abs(к - 1.91) > 0.06) {
          беды.push(`соотношение ${к.toFixed(2)}:1 — канон 1,91:1, иначе сборщик обрежет по-своему`)
        }
      }
    }
  }

  if (м['twitter:card'] && м['twitter:card'] !== 'summary_large_image') {
    беды.push(`twitter:card = «${м['twitter:card']}» — для широкой карточки нужен summary_large_image`)
  }
  if (имяВПродукте && м.title !== имяВПродукте) {
    беды.push(`<title> «${м.title}» ≠ имени «/» в App.tsx «${имяВПродукте}» — у страницы два имени`)
  }
  return беды
}

/** Имя вкладки, которое продукт ставит на «/». */
export function имяГлавной(app) {
  const m = app.match(/if \(path === '\/'\) return '([^']+)'/)
  return m ? m[1] : ''
}

if (process.argv.includes('--selftest')) {
  const целый = `<title>Х</title>
    <meta name="description" content="о" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://x/" />
    <meta property="og:title" content="Х" />
    <meta property="og:description" content="о" />
    <meta property="og:image" content="https://x/og.png" />
    <meta property="og:image:width" content="2400" />
    <meta property="og:image:height" content="1260" />
    <meta name="twitter:card" content="summary_large_image" />`
  const есть = () => true
  const размер = () => ({ ш: 2400, в: 1260 })
  const случаи = [
    ['целая разметка', целый, есть, размер, 'Х', 0],
    ['относительный адрес', целый.replace('https://x/og.png', '/og.png'), есть, размер, 'Х', 1],
    ['файла нет', целый, () => false, размер, 'Х', 1],
    ['числа не сходятся с файлом', целый, есть, () => ({ ш: 1200, в: 630 }), 'Х', 1],
    ['квадратная картинка', целый, есть, () => ({ ш: 1200, в: 1200 }), 'Х', 2],
    ['два имени у страницы', целый, есть, размер, 'Другое', 1],
    ['нет og:image вовсе', целый.replace(/<meta property="og:image".*\n/, ''), есть, размер, 'Х', 1],
  ]
  let плохо = 0
  for (const [имя, html, е, р, т, ждём] of случаи) {
    const было = проверить(html, е, р, т).length
    const ок = было === ждём
    if (!ок) плохо++
    console.log(`  ${ок ? '✅' : '❌'} ${имя.padEnd(32)} бед ${было}${ок ? '' : ` (ждали ${ждём})`}`)
  }
  console.log(плохо ? '\n❌ самопроверка не сошлась\n' : '\n✅ самопроверка: караул видит все семь случаев\n')
  process.exit(плохо ? 1 : 0)
}

const html = readFileSync(HTML, 'utf8')
const беды = проверить(
  html,
  (имя) => existsSync(`${PUBLIC}${имя}`),
  (имя) => размерPNG(readFileSync(`${PUBLIC}${имя}`)),
  имяГлавной(readFileSync(APP, 'utf8')),
)

console.log('\nПревью ссылки:')
if (беды.length) {
  console.log('\n❌ его увидят только в чужом мессенджере, и уже отправленным:\n')
  for (const б of беды) console.log(`   ${б}`)
  console.log('\n   Разметку превью читают сборщики (Телеграм, ВК, Слак) — до React')
  console.log('   они не доходят, и ошибка здесь не видна никому из открывших сайт.\n')
  process.exit(1)
}
const м = мета(html)
console.log(`   заголовок  ${м.title}`)
console.log(`   картинка   ${м['og:image']} · ${м['og:image:width']}×${м['og:image:height']}`)
console.log('✅ поля на месте, адрес абсолютный, размеры сходятся с файлом\n')
