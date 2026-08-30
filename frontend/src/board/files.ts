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
    inp.onchange = () => res(inp.files?.[0] ?? null)
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

/** Пережать картинку и завернуть в объект доски. Возвращает null, если это не картинка. */
export async function imageObj(file: Blob, at: Point): Promise<Obj | null> {
  let img: HTMLImageElement
  try {
    img = await readImage(file)
  } catch {
    return null
  }
  const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k))
  const h = Math.max(1, Math.round(img.height * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')?.drawImage(img, 0, 0, w, h)
  let q = 0.82
  let src = c.toDataURL('image/jpeg', q)
  while (src.length > MAX_BYTES && q > 0.4) {
    q -= 0.12
    src = c.toDataURL('image/jpeg', q)
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
