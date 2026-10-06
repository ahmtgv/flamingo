/** Исследование внимания SEduM: как кадр ложится в байты и обратно.
 *
 *  Чистый модуль: его пишет страница исследования и читает разбор записей
 *  (`scripts/наука-прогон.mjs`) в Node. Формат один — значит и ошибка в нём
 *  одна, и прибор (`scripts/наука-check.mjs`) ловит её туда-обратно.
 *
 *  🔴 ПОЧЕМУ БАЙТЫ, А НЕ JSON. В кадре 478 точек лица по три числа, 52 значения
 *  мимики и матрица поворота. В JSON это 25–30 КБ на кадр, то есть 25 МБ за пять
 *  минут — и только числа, без видео. В байтах — 3 КБ на кадр, а сжатое gzip
 *  ещё меньше. Точность при этом с запасом: координата точки хранится с шагом
 *  1/10000 кадра — на кадре 640 пикселей это 0,06 пикселя.
 *
 *  Запись кадра, всё little-endian:
 *
 *      u16  длина записи после этого поля (чтобы читатель мог перешагнуть)
 *      u8   версия = 1
 *      f64  t — мс от начала проверки (performance.now)
 *      f64  настенное время, мс (Date.now)
 *      u8   флаги: 1 лицо · 2 страница видна · 4 окно в фокусе · 8 «пишем»
 *      u8   номер шага (255 — калибровка или вне шагов)
 *      f32  x, y точки-стимула в долях окна (NaN — точки нет)
 *      u8   движок: состояние сейчас · засчитано · балл · качество
 *      f32  веко (EAR), доля закрытых глаз за минуту, яркость (NaN — нет)
 *      ── если есть лицо ──
 *      f32 × 16     матрица поворота головы (по столбцам, как отдаёт модель)
 *      u16 × 52     мимика (blendshapes) × 65535, в порядке ИМЕНА_МИМИКИ
 *      i16 × 478×3  точки лица x, y, z × 10000
 */
import type { Качество, Состояние } from '../sedum/внимание.ts'

export const ВЕРСИЯ_КАДРА = 1
export const ТОЧЕК = 478
export const МИМИКИ = 52

/** Порядок мимики в записи — тот, в каком её отдаёт модель Face Landmarker
 *  1.0. Если модель вдруг отдаст другой порядок, страница пишет по ИМЕНАМ,
 *  а не по номерам: значение кладётся на своё место из этого списка. */
export const ИМЕНА_МИМИКИ = [
  '_neutral', 'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight', 'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft',
  'eyeLookOutRight', 'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight', 'jawForward', 'jawLeft', 'jawOpen', 'jawRight', 'mouthClose',
  'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight', 'mouthFunnel',
  'mouthLeft', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthPressLeft', 'mouthPressRight',
  'mouthPucker', 'mouthRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower',
  'mouthShrugUpper', 'mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft', 'mouthStretchRight',
  'mouthUpperUpLeft', 'mouthUpperUpRight', 'noseSneerLeft', 'noseSneerRight',
] as const

/** Номера состояний и качества в записи. Порядок — навсегда: новое — в конец. */
export const СОСТОЯНИЯ: Состояние[] = [
  'на экране', 'пишет', 'зевает', 'мимо экрана', 'смотрит вниз',
  'отвернулся', 'глаза закрыты', 'заснул', 'нет в кадре', 'ушёл', 'другое окно',
]
export const КАЧЕСТВА: Качество[] = ['хорошо', 'обрезано', 'далеко', 'темно']

export const ФЛАГ = { лицо: 1, видна: 2, фокус: 4, пишем: 8 } as const

export type ЗаписьКадра = {
  t: number
  стена: number
  флаги: number
  шаг: number
  стимул: [number, number] | null
  сейчас: Состояние
  засчитано: Состояние
  балл: number
  качество: Качество
  веко: number | null
  перклос: number | null
  яркость: number | null
  /** Лицо: матрица 16, мимика 52 (0..1), точки 478×3 подряд. */
  лицо: { матрица: ArrayLike<number>; мимика: ArrayLike<number>; точки: ArrayLike<number> } | null
}

const ГОЛОВА = 2 + 1 + 8 + 8 + 1 + 1 + 4 + 4 + 4 + 4 * 3
const ЛИЦО = 16 * 4 + МИМИКИ * 2 + ТОЧЕК * 3 * 2

export function размерЗаписи(естьЛицо: boolean): number {
  return ГОЛОВА + (естьЛицо ? ЛИЦО : 0)
}

const nan = (ч: number | null) => (ч === null || !Number.isFinite(ч) ? NaN : ч)
const число = (ч: number) => (Number.isNaN(ч) ? null : ч)
const в16 = (ч: number) => Math.max(-32768, Math.min(32767, Math.round(ч * 10000)))

/** Записать кадр в буфер с позиции `с`. → позиция после записи. */
export function записатьКадр(в: DataView, с: number, к: ЗаписьКадра): number {
  const лицо = к.лицо && к.флаги & ФЛАГ.лицо ? к.лицо : null
  const длина = размерЗаписи(Boolean(лицо)) - 2
  let п = с
  в.setUint16(п, длина, true); п += 2
  в.setUint8(п, ВЕРСИЯ_КАДРА); п += 1
  в.setFloat64(п, к.t, true); п += 8
  в.setFloat64(п, к.стена, true); п += 8
  в.setUint8(п, лицо ? к.флаги | ФЛАГ.лицо : к.флаги & ~ФЛАГ.лицо); п += 1
  в.setUint8(п, Math.max(0, Math.min(255, к.шаг))); п += 1
  в.setFloat32(п, к.стимул ? к.стимул[0] : NaN, true); п += 4
  в.setFloat32(п, к.стимул ? к.стимул[1] : NaN, true); п += 4
  в.setUint8(п, Math.max(0, СОСТОЯНИЯ.indexOf(к.сейчас))); п += 1
  в.setUint8(п, Math.max(0, СОСТОЯНИЯ.indexOf(к.засчитано))); п += 1
  в.setUint8(п, Math.max(0, Math.min(100, Math.round(к.балл)))); п += 1
  в.setUint8(п, Math.max(0, КАЧЕСТВА.indexOf(к.качество))); п += 1
  в.setFloat32(п, nan(к.веко), true); п += 4
  в.setFloat32(п, nan(к.перклос), true); п += 4
  в.setFloat32(п, nan(к.яркость), true); п += 4
  if (лицо) {
    for (let i = 0; i < 16; i++) { в.setFloat32(п, лицо.матрица[i] ?? NaN, true); п += 4 }
    for (let i = 0; i < МИМИКИ; i++) {
      const м = Math.max(0, Math.min(1, лицо.мимика[i] ?? 0))
      в.setUint16(п, Math.round(м * 65535), true); п += 2
    }
    for (let i = 0; i < ТОЧЕК * 3; i++) { в.setInt16(п, в16(лицо.точки[i] ?? 0), true); п += 2 }
  }
  return п
}

/** Прочитать все кадры из байтов (уже распакованных из gzip). Битый хвост —
 *  оборванный последний кусок — молча отбрасывается: прочитано всё, что цело. */
export function прочитатьКадры(байты: Uint8Array): ЗаписьКадра[] {
  const в = new DataView(байты.buffer, байты.byteOffset, байты.byteLength)
  const итог: ЗаписьКадра[] = []
  let п = 0
  while (п + 2 <= в.byteLength) {
    const длина = в.getUint16(п, true)
    if (п + 2 + длина > в.byteLength) break
    const начало = п + 2
    let q = начало
    const версия = в.getUint8(q); q += 1
    if (версия !== ВЕРСИЯ_КАДРА) { п = начало + длина; continue }
    const t = в.getFloat64(q, true); q += 8
    const стена = в.getFloat64(q, true); q += 8
    const флаги = в.getUint8(q); q += 1
    const шаг = в.getUint8(q); q += 1
    const sx = в.getFloat32(q, true); q += 4
    const sy = в.getFloat32(q, true); q += 4
    const сейчас = СОСТОЯНИЯ[в.getUint8(q)] ?? 'на экране'; q += 1
    const засчитано = СОСТОЯНИЯ[в.getUint8(q)] ?? 'на экране'; q += 1
    const балл = в.getUint8(q); q += 1
    const качество = КАЧЕСТВА[в.getUint8(q)] ?? 'хорошо'; q += 1
    const веко = число(в.getFloat32(q, true)); q += 4
    const перклос = число(в.getFloat32(q, true)); q += 4
    const яркость = число(в.getFloat32(q, true)); q += 4
    let лицо: ЗаписьКадра['лицо'] = null
    if (флаги & ФЛАГ.лицо && длина >= размерЗаписи(true) - 2) {
      const матрица = new Float32Array(16)
      for (let i = 0; i < 16; i++) { матрица[i] = в.getFloat32(q, true); q += 4 }
      const мимика = new Float32Array(МИМИКИ)
      for (let i = 0; i < МИМИКИ; i++) { мимика[i] = в.getUint16(q, true) / 65535; q += 2 }
      const точки = new Float32Array(ТОЧЕК * 3)
      for (let i = 0; i < ТОЧЕК * 3; i++) { точки[i] = в.getInt16(q, true) / 10000; q += 2 }
      лицо = { матрица, мимика, точки }
    }
    итог.push({
      t, стена, флаги, шаг,
      стимул: Number.isNaN(sx) ? null : [sx, sy],
      сейчас, засчитано, балл, качество, веко, перклос, яркость, лицо,
    })
    п = начало + длина
  }
  return итог
}
