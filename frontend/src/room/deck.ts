import { imageObj } from '../board/files'
import type { Point } from '../board/protocol'

/** Что учитель показывает классу: одна картинка или страницы презентации.
 *
 *  🔴 Страницы НЕ уезжают все разом. Двадцать страниц по четверти мегабайта — это
 *  пять мегабайт в данные-канал, то есть минута молчания у всего класса. Уезжает
 *  только та страница, которую сейчас показывают; следующая — когда её открыли.
 */
export type Deck = { title: string; pages: string[] }

const MAX_SIDE = 1600
const MAX_BYTES = 320_000

function squeeze(img: HTMLImageElement | HTMLCanvasElement, w: number, h: number): string {
  const k = Math.min(1, MAX_SIDE / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * k))
  c.height = Math.max(1, Math.round(h * k))
  c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
  let q = 0.8
  let src = c.toDataURL('image/jpeg', q)
  while (src.length > MAX_BYTES && q > 0.4) {
    q -= 0.12
    src = c.toDataURL('image/jpeg', q)
  }
  return src
}

async function fromImage(file: File): Promise<string | null> {
  const o = await imageObj(file, [0, 0] as Point)
  if (!o || o.kind !== 'image') return null
  return o.src
}

/** PDF разбирается на страницы прямо в браузере: сервера у комнаты нет,
 *  и файл никуда не уезжает целиком.
 *
 *  Тем же кодом пользуется доска («Вложить · документ»): двух разборщиков PDF
 *  в одном продукте быть не должно — они разойдутся в первый же месяц. */
export async function pagesOfPdf(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.toString()
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const out: string[] = []
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const view = page.getViewport({ scale: 2 })
    const c = document.createElement('canvas')
    c.width = view.width
    c.height = view.height
    const ctx = c.getContext('2d')
    if (!ctx) continue
    await page.render({ canvasContext: ctx, viewport: view }).promise
    out.push(squeeze(c, c.width, c.height))
  }
  return out
}

/** Собрать показ из того, что выбрал учитель: картинки, PDF или и то и другое. */
export async function deckFrom(files: File[]): Promise<Deck | null> {
  const pages: string[] = []
  for (const f of files) {
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      pages.push(...(await pagesOfPdf(f)))
    } else if (f.type.startsWith('image/')) {
      const src = await fromImage(f)
      if (src) pages.push(src)
    }
  }
  if (pages.length === 0) return null
  const title = files.length === 1 ? files[0].name : `${files.length} файла`
  return { title, pages }
}

export function pickFiles(accept: string): Promise<File[]> {
  return new Promise((res) => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = accept
    inp.multiple = true
    /* 🔴 Вход живёт В ДОКУМЕНТЕ, а не в воздухе: отсоединённому input часть
       браузеров (и всякий автопрогон) не умеет отдать файлы — выбор молча
       пропадает. Невидим, но существует; после выбора убирается за собой. */
    inp.style.position = 'fixed'
    inp.style.left = '-1000px'
    inp.setAttribute('aria-hidden', 'true')
    inp.tabIndex = -1
    inp.onchange = () => {
      res(inp.files ? Array.from(inp.files) : [])
      inp.remove()
    }
    document.body.append(inp)
    inp.click()
  })
}
