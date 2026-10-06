/** SEduM · камера → числа. Обёртка над MediaPipe Face Landmarker.
 *
 *  ВНЕ ПРОДУКТА: пока его тянет только стенд внимания (`СтендВнимания.tsx`);
 *  в комнату урока модуль войдёт следующим шагом, после настройки порогов.
 *
 *  🔴 ВСЁ СЧИТАЕТСЯ НА УСТРОЙСТВЕ. Кадр с камеры уходит в модель внутри
 *  браузера и обратно возвращается числами: поворот головы, закрытость глаз,
 *  открытый рот, направление взгляда. В продукте ни кадр, ни точки лица никуда
 *  не отправляются — наружу пойдут только балл и причина, и то позже, из
 *  комнаты. Исключение одно и названо: страница исследования пишет всё на наш
 *  сервер — с согласия добровольцев (решение владельца 06.10).
 *
 *  🔴 ЯДРО — СВОЁ, МОДЕЛЬ — СВОЯ, ЕСЛИ ЕСТЬ. Ядро (wasm, ~12 МБ) едет вместе с
 *  сайтом: сборщик кладёт его файлы рядом с нашими (импорт `?url`), и чужой
 *  CDN не нужен — у ученика в России jsDelivr открывается не всегда. CDN
 *  остался запасным путём. Модель лица ищется сначала у нас
 *  (`/модели/face_landmarker.task`) и только потом в хранилище Google: свою
 *  копию официальной модели (Apache 2.0) положит владелец — скачивание файла
 *  в репозиторий решает он.
 */
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import ядроSimdJs from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import ядроSimdWasm from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import ядроJs from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.js?url'
import ядроWasm from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.wasm?url'

import { ПУСТОЙ_КАДР, числаКадра, type Кадр } from './числа'

export const МОДЕЛЬ =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
/** Своя копия модели. Нет её — сервер сайта отдаёт вместо неё страницу (html),
 *  и это узнаётся по типу ответа, а не по коду: «200» тут ничего не значит. */
export const СВОЯ_МОДЕЛЬ = '/модели/face_landmarker.task'

type Набор = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

/** Ядро: своё (едет с сайтом), потом с CDN той же версии, что в package.json. */
const ЯДРА: { имя: string; набор: () => Promise<Набор> }[] = [
  {
    имя: 'своё',
    набор: async () => (await FilesetResolver.isSimdSupported()
      ? { wasmLoaderPath: ядроSimdJs, wasmBinaryPath: ядроSimdWasm }
      : { wasmLoaderPath: ядроJs, wasmBinaryPath: ядроWasm }),
  },
  { имя: 'с CDN', набор: () => FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm') },
]

export type Завод = { модель: FaceLandmarker; ядро: string; ускорение: 'GPU' | 'CPU'; откуда: string }

/** Есть ли у нас своя копия модели. */
async function своя(): Promise<boolean> {
  try {
    const r = await fetch(СВОЯ_МОДЕЛЬ, { method: 'HEAD' })
    return r.ok && !(r.headers.get('content-type') ?? '').includes('text/html')
  } catch {
    return false
  }
}

/** Заводит модель. Пробует видеокарту, потом процессор; ядро — по очереди. */
export async function завести(модель?: string): Promise<Завод> {
  const путь = модель || ((await своя()) ? СВОЯ_МОДЕЛЬ : МОДЕЛЬ)
  let последняя: unknown = null
  for (const ядро of ЯДРА) {
    for (const ускорение of ['GPU', 'CPU'] as const) {
      try {
        const файлы = await ядро.набор()
        const лицо = await FaceLandmarker.createFromOptions(файлы, {
          baseOptions: { modelAssetPath: путь, delegate: ускорение },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        })
        return { модель: лицо, ядро: ядро.имя, ускорение, откуда: путь === МОДЕЛЬ ? 'Google' : путь }
      } catch (e) {
        последняя = e
      }
    }
  }
  throw последняя ?? new Error('модель не завелась')
}

export { ВЕКИ, ТЕМНО, УЗКО, качество, раскрытие, type Кадр, type Рамка, type Точка } from './числа'

/** Разбор ответа модели в наши числа. `вширь` — ширина кадра к высоте. */
export function разобрать(о: FaceLandmarkerResult, вширь = 4 / 3): Кадр {
  const точки = о.faceLandmarks?.[0]
  if (!точки || точки.length === 0) return ПУСТОЙ_КАДР
  const доли: Record<string, number> = {}
  for (const к of о.faceBlendshapes?.[0]?.categories ?? []) доли[к.categoryName] = к.score
  return числаКадра(точки, (имя) => доли[имя] ?? 0, о.facialTransformationMatrixes?.[0]?.data, вширь)
}

/** Яркость кадра 0..1 — по уменьшенной копии 32×24, не чаще раза в секунду:
 *  свет меняется медленно, а чтение пикселей стоит процессора. */
export class Яркомер {
  private холст: HTMLCanvasElement | null = null
  private когда = 0
  private последняя: number | null = null

  замерить(в: HTMLVideoElement, сейчас: number): number | null {
    if (сейчас - this.когда < 1000) return this.последняя
    this.когда = сейчас
    if (!в.videoWidth) return this.последняя
    this.холст ??= document.createElement('canvas')
    this.холст.width = 32
    this.холст.height = 24
    const ц = this.холст.getContext('2d', { willReadFrequently: true })
    if (!ц) return this.последняя
    ц.drawImage(в, 0, 0, 32, 24)
    const д = ц.getImageData(0, 0, 32, 24).data
    let сумма = 0
    for (let i = 0; i < д.length; i += 4) сумма += 0.2126 * д[i] + 0.7152 * д[i + 1] + 0.0722 * д[i + 2]
    this.последняя = сумма / (д.length / 4) / 255
    return this.последняя
  }
}
