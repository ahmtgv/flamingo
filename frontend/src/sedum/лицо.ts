/** SEduM · камера → числа. Обёртка над MediaPipe Face Landmarker.
 *
 *  ВНЕ ПРОДУКТА: пока его тянет только стенд внимания (`СтендВнимания.tsx`);
 *  в комнату урока модуль войдёт следующим шагом, после настройки порогов.
 *
 *  🔴 ВСЁ СЧИТАЕТСЯ НА УСТРОЙСТВЕ. Кадр с камеры уходит в модель внутри
 *  браузера и обратно возвращается числами: поворот головы, закрытость глаз,
 *  открытый рот, направление взгляда. Ни кадр, ни точки лица никуда не
 *  отправляются — наружу пойдут только балл и причина, и то позже, из комнаты.
 *
 *  🔴 ОТКУДА БЕРЁТСЯ МОДЕЛЬ — ПОКА С ЧУЖИХ АДРЕСОВ, И ЭТО ВРЕМЕННО. Ядро
 *  (wasm) лежит в npm-пакете, а саму модель лица Google раздаёт только со
 *  своего хранилища. Наша рабочая среда до него не достаёт, браузер человека —
 *  достаёт. Для стенда этого хватает. В продукте модель и ядро поедут с
 *  нашего же сервера: у ученика в России чужое хранилище может не открыться,
 *  и урок не должен от этого зависеть.
 */
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

import type { Замер } from './внимание'

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

/** Числа одного кадра — всё, кроме времени и «экран»: их знает страница. */
export type Кадр = Omit<Замер, 't' | 'экран'> & {
  /** До лица, сантиметры. Нужен стенду как самопроверка разбора матрицы:
   *  правдоподобные 40–80 см значат, что порядок чисел понят верно. */
  до: number | null
  точки: Точка[]
}

const ПУСТО: Кадр = {
  лицо: false, рыск: 0, тангаж: 0, глаза: 0, рот: 0, взглядВниз: 0, взглядВбок: 0, до: null, точки: [],
}

const град = (р: number) => (р * 180) / Math.PI

/** Разбор ответа модели в наши числа. */
export function разобрать(о: FaceLandmarkerResult): Кадр {
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

  return {
    лицо: true,
    рыск,
    тангаж,
    глаза: (д('eyeBlinkLeft') + д('eyeBlinkRight')) / 2,
    рот: д('jawOpen'),
    взглядВниз: (д('eyeLookDownLeft') + д('eyeLookDownRight')) / 2,
    взглядВбок: Math.max(влево, вправо),
    до,
    точки: точки.map((т) => ({ x: т.x, y: т.y })),
  }
}
