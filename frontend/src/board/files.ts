import { newId, type Obj, type Point, type Sheet } from './protocol'

/** Больше этого по длинной стороне картинку не держим: она уезжает по данным-каналу
 *  участникам, и полтора мегабайта из буфера положили бы связь всему классу. */
const MAX_SIDE = 1400
const MAX_BYTES = 700_000

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((res) => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = accept
    /* Вход живёт в документе, не в воздухе — см. pickFiles в room/deck.ts. */
    inp.style.position = 'fixed'
    inp.style.left = '-1000px'
    inp.setAttribute('aria-hidden', 'true')
    inp.tabIndex = -1
    inp.onchange = () => {
      res(inp.files?.[0] ?? null)
      inp.remove()
    }
    document.body.append(inp)
    inp.click()
  })
}

export function readImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      res(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      rej(new Error('не картинка'))
    }
    img.src = url
  })
}

/** Есть ли в картинке прозрачность.
 *
 *  🔴 От этого зависит, чем её пережимать, и ошибка тут стоит дорого: JPEG
 *  прозрачности НЕ УМЕЕТ и заливает её чёрным. Наклейка без фона превращалась
 *  в чёрный квадрат — поймано Аделем на боевом 31.08.
 *
 *  Смотрим не каждый пиксель, а каждый двадцатый: одного прозрачного достаточно,
 *  чтобы ответить «да», а полный обход картинки 1400×1400 — это восемь мегабайт
 *  и заметная пауза ровно в тот момент, когда человек вставил картинку.
 */
function сквозная(c: HTMLCanvasElement): boolean {
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return true // не знаем — считаем, что есть: PNG хуже пережмёт, но не соврёт
  try {
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    for (let i = 3; i < d.length; i += 4 * 20) if (d[i] < 250) return true
    return false
  } catch {
    return true
  }
}

/** Умеет ли этот браузер писать webp. Считаем один раз. */
let вебп: boolean | null = null
function умеетВебп(): boolean {
  if (вебп === null) {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    вебп = c.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return вебп
}

const читатьЦеликом = (file: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(new Error('не прочиталось'))
    r.readAsDataURL(file)
  })

/** Пережать картинку и завернуть в объект доски. Возвращает null, если это не картинка. */
export async function imageObj(file: Blob, at: Point): Promise<Obj | null> {
  let img: HTMLImageElement
  try {
    img = await readImage(file)
  } catch {
    return null
  }

  // 🔴 GIF пропускаем как есть, если он влезает. Холст берёт у него ОДИН кадр —
  // то есть анимация просто исчезает, молча. Маленькую гифку честнее не трогать.
  const тип = (file as File).type ?? ''
  if (тип === 'image/gif' && file.size <= MAX_BYTES) {
    try {
      const src = await читатьЦеликом(file)
      const shown = Math.min(img.width, 640)
      return {
        id: newId(), kind: 'image', x: at[0], y: at[1],
        w: shown, h: Math.round((img.height * shown) / img.width), src,
      }
    } catch {
      /* не прочиталось — идём общим путём ниже */
    }
  }

  const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k))
  const h = Math.max(1, Math.round(img.height * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')?.drawImage(img, 0, 0, w, h)

  let src: string
  if (сквозная(c)) {
    // Прозрачность сохраняем. webp жмёт её вчетверо лучше png; png — запасной путь.
    if (умеетВебп()) {
      let q = 0.9
      src = c.toDataURL('image/webp', q)
      while (src.length > MAX_BYTES && q > 0.4) {
        q -= 0.12
        src = c.toDataURL('image/webp', q)
      }
    } else {
      src = c.toDataURL('image/png')
    }
  } else {
    let q = 0.82
    src = c.toDataURL('image/jpeg', q)
    while (src.length > MAX_BYTES && q > 0.4) {
      q -= 0.12
      src = c.toDataURL('image/jpeg', q)
    }
  }

  // На доске картинка появляется в разумном размере, а не во весь мир.
  const shown = Math.min(w, 640)
  return {
    id: newId(), kind: 'image', x: at[0], y: at[1],
    w: shown, h: Math.round((h * shown) / w), src,
  }
}

const FILE_TAG = 'flamingo-boards-1'

export function saveFile(sheets: Sheet[]) {
  const blob = new Blob([JSON.stringify({ tag: FILE_TAG, at: new Date().toISOString(), sheets })], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `Доски урока ${new Date().toLocaleDateString('ru-RU')}.flamingo.json`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function openFile(): Promise<Sheet[] | null> {
  const f = await pickFile('.json,application/json')
  if (!f) return null
  try {
    const data = JSON.parse(await f.text())
    if (data?.tag !== FILE_TAG || !Array.isArray(data.sheets)) return null
    return data.sheets as Sheet[]
  } catch {
    return null
  }
}
