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
 *  🔴 ОТКУДА БЕРЁТСЯ МОДЕЛЬ — ПОКА С ЧУЖИХ АДРЕСОВ, И ЭТО ВРЕМЕННО. Ядро
 *  (wasm) лежит в npm-пакете, а саму модель лица Google раздаёт только со
 *  своего хранилища. Наша рабочая среда до него не достаёт, браузер человека —
 *  достаёт. Для стенда этого хватает. В продукте модель и ядро поедут с
 *  нашего же сервера: у ученика в России чужое хранилище может не открыться,
 *  и урок не должен от этого зависеть.
 */
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

import type { Замер, Качество } from './внимание'

export const МОДЕЛЬ =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

/** Ядро: сначала с CDN той же версии, что в package.json; не вышло —
 *  из своего же `node_modules` (в разработке Vite отдаёт его как есть). */
export const ЯДРА = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
  '/node_modules/@mediapipe/tasks-vision/wasm',
]

export type Завод = { модель: FaceLandmarker; ядро: string; ускорение: 'GPU' | 'CPU' }

/** Заводит модель. Пробует видеокарту, потом процессор; ядро — по очереди. */
export async function завести(модель: string = МОДЕЛЬ): Promise<Завод> {
  let последняя: unknown = null
  for (const ядро of ЯДРА) {
    for (const ускорение of ['GPU', 'CPU'] as const) {
      try {
        const файлы = await FilesetResolver.forVisionTasks(ядро)
        const лицо = await FaceLandmarker.createFromOptions(файлы, {
          baseOptions: { modelAssetPath: модель, delegate: ускорение },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        })
        return { модель: лицо, ядро, ускорение }
      } catch (e) {
        последняя = e
      }
    }
  }
  throw последняя ?? new Error('модель не завелась')
}

export type Точка = { x: number; y: number }

/** Рамка лица в долях кадра: 0..1 — внутри, за пределами — лицо вылезает. */
export type Рамка = { x0: number; y0: number; x1: number; y1: number }

/** Числа одного кадра — всё, кроме времени, «экран» и качества: их знает страница. */
export type Кадр = Omit<Замер, 't' | 'экран' | 'качество'> & {
  /** До лица, сантиметры. Нужен стенду как самопроверка разбора матрицы:
   *  правдоподобные 40–80 см значат, что порядок чисел понят верно. */
  до: number | null
  точки: Точка[]
  рамка: Рамка | null
}

const ПУСТО: Кадр = {
  лицо: false, рыск: 0, тангаж: 0, глаза: 0, рот: 0, взглядВниз: 0, взглядВбок: 0, веко: null,
  до: null, точки: [], рамка: null,
}

/** Шесть точек века на глаз — как у Soukupová & Čech (2016): уголки p1, p4,
 *  верхнее веко p2, p3, нижнее p6, p5. Номера — по сетке MediaPipe (478 точек). */
const ВЕКИ = {
  правый: [33, 160, 158, 133, 153, 144],
  левый: [362, 385, 387, 263, 373, 380],
} as const

type Т3 = { x: number; y: number; z?: number }

/** Раскрытие век (EAR): сумма двух вертикалей на удвоенную горизонталь.
 *  `вширь` — отношение ширины кадра к высоте: точки лежат в долях кадра, и без
 *  этой поправки на кадре 4:3 глаз «сплющивается» по горизонтали. */
export function раскрытие(т: readonly Т3[], номера: readonly number[], вширь: number): number | null {
  const р = номера.map((н) => т[н])
  if (р.some((п) => !п)) return null
  const д = (а: Т3, б: Т3) => Math.hypot((а.x - б.x) * вширь, а.y - б.y)
  const гор = д(р[0], р[3])
  if (гор <= 0) return null
  return (д(р[1], р[5]) + д(р[2], р[4])) / (2 * гор)
}

const град = (р: number) => (р * 180) / Math.PI

/** Разбор ответа модели в наши числа. `вширь` — ширина кадра к высоте. */
export function разобрать(о: FaceLandmarkerResult, вширь = 4 / 3): Кадр {
  const точки = о.faceLandmarks?.[0]
  if (!точки || точки.length === 0) return ПУСТО

  const доли: Record<string, number> = {}
  for (const к of о.faceBlendshapes?.[0]?.categories ?? []) доли[к.categoryName] = к.score
  const д = (имя: string) => доли[имя] ?? 0

  /* 🔴 МАТРИЦА ЛЕЖИТ ПО СТОЛБЦАМ (как в OpenGL): элемент (строка i, столбец j)
     — это data[j*4 + i]. Наклон вниз — поворот вокруг оси X: лицо смотрит в
     сторону −Y. Отсюда тангаж = asin(−r12): плюс — голова опущена. */
  let рыск = 0
  let тангаж = 0
  let до: number | null = null
  const м = о.facialTransformationMatrixes?.[0]?.data
  if (м && м.length === 16) {
    const r = (i: number, j: number) => м[j * 4 + i]
    тангаж = град(Math.asin(Math.max(-1, Math.min(1, -r(1, 2)))))
    рыск = град(Math.atan2(r(0, 2), r(2, 2)))
    до = Math.abs(r(2, 3))
  }

  /* Взгляд вбок — оба глаза в одну сторону: левый наружу и правый внутрь,
     или наоборот. Один глаз «внутрь» без второго — это не взгляд, а косинка
     модели. */
  const влево = (д('eyeLookOutLeft') + д('eyeLookInRight')) / 2
  const вправо = (д('eyeLookInLeft') + д('eyeLookOutRight')) / 2

  /* 🔴 ВЕКО — У БОЛЕЕ ОТКРЫТОГО ГЛАЗА. Повёрнутая голова сплющивает дальний
     глаз (Wolter 2025), а подмигивание — не сон. «Закрыты» значит закрыты оба. */
  const пр = раскрытие(точки, ВЕКИ.правый, вширь)
  const лв = раскрытие(точки, ВЕКИ.левый, вширь)
  const веко = пр === null && лв === null ? null : Math.max(пр ?? 0, лв ?? 0)

  let x0 = 1, y0 = 1, x1 = 0, y1 = 0
  for (const т of точки) {
    if (т.x < x0) x0 = т.x
    if (т.x > x1) x1 = т.x
    if (т.y < y0) y0 = т.y
    if (т.y > y1) y1 = т.y
  }

  return {
    лицо: true,
    рыск,
    тангаж,
    глаза: (д('eyeBlinkLeft') + д('eyeBlinkRight')) / 2,
    рот: д('jawOpen'),
    взглядВниз: (д('eyeLookDownLeft') + д('eyeLookDownRight')) / 2,
    взглядВбок: Math.max(влево, вправо),
    веко,
    до,
    точки: точки.map((т) => ({ x: т.x, y: т.y })),
    рамка: { x0, y0, x1, y1 },
  }
}

/* ── Качество кадра (П6) ─────────────────────────────────────────────── */

/** Лицо уже этой доли кадра — далеко: на ноутбуке это дальше метра.
 *  BlazeFace, который находит лицо, рассчитан на лицо от ~20% кадра. */
export const УЗКО = 0.12
/** Средняя яркость кадра ниже этой доли — темно. */
export const ТЕМНО = 0.12

/** Можно ли верить кадру. Лица нет — судить нечего, «хорошо»: пропажу лица
 *  разбирают правила, а не качество. */
export function качество(к: Кадр, яркость: number | null): Качество {
  if (!к.лицо || !к.рамка) return 'хорошо'
  const р = к.рамка
  if (р.x0 < 0 || р.y0 < 0 || р.x1 > 1 || р.y1 > 1) return 'обрезано'
  if (р.x1 - р.x0 < УЗКО) return 'далеко'
  if (яркость !== null && яркость < ТЕМНО) return 'темно'
  return 'хорошо'
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
