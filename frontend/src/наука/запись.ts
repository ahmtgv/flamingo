/** Исследование внимания SEduM: запись проверки — камера, звук, лицо, события.
 *
 *  🔴 ЗДЕСЬ ПИШЕТСЯ ВСЁ, ЧТО НУЖНО НАУКЕ (решение владельца 06.10). Видео со
 *  звуком — чтобы через год прогнать по нему модель, которой ещё нет, и чтобы
 *  человек мог посмотреть спорный момент глазами. Точки лица, мимика и поворот
 *  на каждый кадр — чтобы прогонять движок с другими порогами без видео и в
 *  тысячу раз быстрее. Решения движка в момент записи — чтобы знать, что он
 *  сказал тогда, а не что скажет сейчас. События — что было на экране и что
 *  человек нажимал. Всё уходит на сервер кусками по пять секунд (`сеть.ts`).
 *
 *  🔴 КАДРЫ — С ЧАСТОТОЙ КАМЕРЫ, А НЕ ДЕСЯТЬ В СЕКУНДУ, КАК НА СТЕНДЕ. Моргание
 *  длится 0,1–0,4 с: на десяти кадрах в секунду его половину не видно. В
 *  исследовании процессор не делит с уроком никто, и модель считает каждый
 *  кадр, какой успевает. Разбор потом сам решит, с какой частотой смотреть.
 */
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'

import { Внимание, ПОРОГИ, type Замер, type Итог, type Норма } from '../sedum/внимание'
import { Яркомер, завести, качество, разобрать, type Завод, type Кадр } from '../sedum/лицо'
import { ИМЕНА_МИМИКИ, МИМИКИ, ТОЧЕК, ФЛАГ, записатьКадр, размерЗаписи } from './формат'
import { Очередь, type ВидКуска } from './сеть'

const МЕДИАНА = (ч: number[]): number => {
  const с = [...ч].sort((а, б) => а - б)
  const м = с.length >> 1
  return с.length % 2 ? с[м] : (с[м - 1] + с[м]) / 2
}

/** Какой формат видео браузер умеет писать. Chrome и Firefox — webm, Safari — mp4. */
export function форматВидео(звук: boolean): string {
  const кандидаты = звук
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  if (typeof MediaRecorder === 'undefined') return ''
  return кандидаты.find((т) => MediaRecorder.isTypeSupported(т)) ?? ''
}

export function форматЗвука(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((т) => MediaRecorder.isTypeSupported(т)) ?? ''
}

/** Что известно об устройстве — в начало записи и в meta проверки. */
export function обУстройстве(поток: MediaStream | null): Record<string, unknown> {
  const н = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string; mobile?: boolean } }
  const видео = поток?.getVideoTracks()[0]
  const звук = поток?.getAudioTracks()[0]
  return {
    браузер: н.userAgent,
    платформа: н.userAgentData?.platform ?? н.platform,
    телефон: н.userAgentData?.mobile ?? /Mobi|Android|iPhone/i.test(н.userAgent),
    ядер: н.hardwareConcurrency,
    памятьГБ: н.deviceMemory ?? null,
    экран: [window.screen.width, window.screen.height],
    окно: [window.innerWidth, window.innerHeight],
    плотность: window.devicePixelRatio,
    камера: видео ? { имя: видео.label, ...видео.getSettings() } : null,
    микрофон: звук ? { имя: звук.label, ...звук.getSettings() } : null,
    пояс: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

export type Где = { шаг: number; стимул: [number, number] | null; пишем: boolean }

/** Одна проверка: от «начать» до «закончить». */
export class Запись {
  readonly очередь: Очередь
  readonly движок = new Внимание({ ...ПОРОГИ })
  private поток: MediaStream
  private завод: Завод | null
  private видео: HTMLVideoElement | null
  private рекордер: MediaRecorder | null = null
  private начало = 0
  private байты = new ArrayBuffer(1 << 20)
  private позиция = 0
  private события: string[] = []
  private сброс = 0
  private цикл = 0
  private пульс = 0
  private последнийКадр = 0
  private яркомер = new Яркомер()
  private где: Где = { шаг: 255, стимул: null, пишем: false }
  private калибровка: Замер[] | null = null
  private клип: { рекордер: MediaRecorder; части: Blob[]; начало: number; метка: Record<string, unknown> } | null = null
  /** Фраза, которая сейчас дописывается: конец записи её дождётся. */
  private закрытие: Promise<number | null> | null = null
  private слушатели = new Set<(и: Итог, к: Кадр | null) => void>()
  private закончена = false
  кадров = 0
  кадровСЛицом = 0

  constructor(очередь: Очередь, поток: MediaStream, завод: Завод | null, видео: HTMLVideoElement | null) {
    this.очередь = очередь
    this.поток = поток
    this.завод = завод
    this.видео = видео
  }

  /** Миллисекунды от начала записи — общие часы кадров и событий. */
  сейчас(): number {
    return performance.now() - this.начало
  }

  /** Записать событие: что было на экране, что нажал человек. */
  событие(что: string, данные: Record<string, unknown> = {}): void {
    /* Свои поля — последними: данные не могут подменить время и имя события. */
    this.события.push(JSON.stringify({ ...данные, t: Math.round(this.сейчас() * 10) / 10, стена: Date.now(), что }))
  }

  /** Что сейчас на экране — страница сообщает каждый раз, когда это меняется. */
  поставить(где: Partial<Где>): void {
    this.где = { ...this.где, ...где }
  }

  слушать(f: (и: Итог, к: Кадр | null) => void): () => void {
    this.слушатели.add(f)
    return () => { this.слушатели.delete(f) }
  }

  /** Начать: видео пишется кусками по 5 с, кадры считаются с частотой камеры. */
  начать(обЗаписи: Record<string, unknown>, писатьВидео: boolean): void {
    this.начало = performance.now()
    const тип = писатьВидео ? форматВидео(this.поток.getAudioTracks().length > 0) : ''
    this.событие('начало', {
      ...обЗаписи,
      устройство: обУстройстве(this.поток),
      модель: this.завод ? { ядро: this.завод.ядро, ускорение: this.завод.ускорение, откуда: this.завод.откуда } : null,
      мимика: ИМЕНА_МИМИКИ,
      точек: ТОЧЕК,
      видео: тип || null,
      пороги: this.движок.пороги,
    })
    if (писатьВидео && тип) {
      try {
        this.рекордер = new MediaRecorder(this.поток, { mimeType: тип, videoBitsPerSecond: 900_000, audioBitsPerSecond: 64_000 })
        this.рекордер.ondataavailable = (e) => {
          if (e.data.size > 0) this.очередь.положить('video', e.data, тип.split(';')[0])
        }
        this.рекордер.start(5000)
      } catch (e) {
        this.событие('ошибка', { где: 'видео', текст: String(e) })
      }
    }
    if (this.завод && this.видео) this.запуститьКадры()
    /* Пульс: когда вкладка спрятана, кадров нет, но часы идут — движок
       должен узнать, что ученик «в другом окне», а запись — что было пусто.
       Без камеры (голос учителя) кадров нет вовсе, и пульс не нужен. */
    if (this.завод) {
      this.пульс = window.setInterval(() => {
        if (performance.now() - this.последнийКадр > 600) this.кадр(null)
      }, 500)
    }
    this.сброс = window.setInterval(() => { void this.выгрузить() }, 5000)
    document.addEventListener('visibilitychange', this.приВидимости)
    window.addEventListener('blur', this.приФокусе)
    window.addEventListener('focus', this.приФокусе)
    window.addEventListener('resize', this.приРазмере)
  }

  private приВидимости = () => this.событие('видимость', { видна: document.visibilityState === 'visible' })
  private приФокусе = (e: FocusEvent) => this.событие('фокус', { есть: e.type === 'focus' })
  private приРазмере = () => this.событие('окно', { размер: [window.innerWidth, window.innerHeight] })

  private запуститьКадры(): void {
    const в = this.видео!
    const завод = this.завод!
    let прошлое = -1
    const шаг = () => {
      if (this.закончена) return
      const сейчас = performance.now()
      if (в.readyState >= 2 && в.currentTime !== прошлое) {
        прошлое = в.currentTime
        try {
          this.кадр(завод.модель.detectForVideo(в, сейчас))
        } catch (e) {
          this.событие('ошибка', { где: 'модель', текст: String(e) })
        }
      }
      this.цикл = 'requestVideoFrameCallback' in в
        ? (в as HTMLVideoElement & { requestVideoFrameCallback: (f: () => void) => number }).requestVideoFrameCallback(шаг)
        : requestAnimationFrame(шаг)
    }
    шаг()
  }

  /** Один кадр: движок, запись, слушатели. `о` нет — пульс без кадра. */
  private кадр(о: FaceLandmarkerResult | null): void {
    const t = this.сейчас()
    const в = this.видео
    const к: Кадр | null = о ? разобрать(о, в && в.videoHeight ? в.videoWidth / в.videoHeight : 4 / 3) : null
    if (о) this.последнийКадр = performance.now()
    const яркость = о && в ? this.яркомер.замерить(в, performance.now()) : null
    const видна = document.visibilityState === 'visible'
    const фокус = document.hasFocus()
    const з: Замер = {
      t: Date.now(),
      экран: видна && фокус,
      лицо: Boolean(к?.лицо),
      рыск: к?.рыск ?? 0,
      тангаж: к?.тангаж ?? 0,
      глаза: к?.глаза ?? 0,
      рот: к?.рот ?? 0,
      взглядВниз: к?.взглядВниз ?? 0,
      взглядВбок: к?.взглядВбок ?? 0,
      веко: к?.веко ?? null,
      качество: к ? качество(к, яркость) : 'хорошо',
    }
    if (this.калибровка && к?.лицо) this.калибровка.push(з)
    const и = this.движок.шаг(з, this.где.пишем)

    const лицо = о?.faceLandmarks?.[0]
    const естьЛицо = Boolean(лицо && лицо.length >= ТОЧЕК)
    this.место(размерЗаписи(естьЛицо))
    const вид = new DataView(this.байты)
    let данныеЛица = null
    if (естьЛицо && о && лицо) {
      const точки = new Float32Array(ТОЧЕК * 3)
      for (let i = 0; i < ТОЧЕК; i++) {
        точки[i * 3] = лицо[i].x
        точки[i * 3 + 1] = лицо[i].y
        точки[i * 3 + 2] = лицо[i].z
      }
      const мимика = new Float32Array(МИМИКИ)
      for (const кат of о.faceBlendshapes?.[0]?.categories ?? []) {
        const i = (ИМЕНА_МИМИКИ as readonly string[]).indexOf(кат.categoryName)
        if (i >= 0) мимика[i] = кат.score
      }
      const матрица = о.facialTransformationMatrixes?.[0]?.data ?? new Array(16).fill(NaN)
      данныеЛица = { матрица, мимика, точки }
    }
    this.позиция = записатьКадр(вид, this.позиция, {
      t, стена: Date.now(),
      флаги: (естьЛицо ? ФЛАГ.лицо : 0) | (видна ? ФЛАГ.видна : 0) | (фокус ? ФЛАГ.фокус : 0) | (this.где.пишем ? ФЛАГ.пишем : 0),
      шаг: this.где.шаг,
      стимул: this.где.стимул,
      сейчас: и.сейчас, засчитано: и.состояние, балл: и.балл, качество: и.качество,
      веко: з.веко ?? null, перклос: и.перклос, яркость,
      лицо: данныеЛица,
    })
    if (о) {
      this.кадров += 1
      if (естьЛицо) this.кадровСЛицом += 1
    }
    for (const f of this.слушатели) f(и, к)
  }

  /** Буфер растёт сам: вдвое, когда не хватает места на запись. */
  private место(нужно: number): void {
    if (this.позиция + нужно <= this.байты.byteLength) return
    const новый = new ArrayBuffer(Math.max(this.байты.byteLength * 2, this.позиция + нужно))
    new Uint8Array(новый).set(new Uint8Array(this.байты, 0, this.позиция))
    this.байты = новый
  }

  /** Отправить накопленное: кадры (сжатые) и события. */
  async выгрузить(): Promise<void> {
    if (this.позиция > 0) {
      const кусок = new Uint8Array(this.байты.slice(0, this.позиция))
      this.позиция = 0
      this.очередь.положить('frames', await сжать(кусок), 'application/octet-stream')
    }
    if (this.события.length) {
      const текст = this.события.join('\n') + '\n'
      this.события = []
      this.очередь.положить('events', new Blob([текст], { type: 'application/x-ndjson' }), 'application/x-ndjson')
    }
  }

  /* ── Калибровка: норма человека (П4) ─────────────────────────────────── */

  начатьКалибровку(): void {
    this.калибровка = []
    this.событие('калибровка', { начало: true })
  }

  /** Медианы кадров калибровки → норма движка. Мало кадров — норма не меняется,
   *  и движок соберёт её сам из первых тридцати секунд (П4). */
  закончитьКалибровку(): Норма | null {
    const к = this.калибровка ?? []
    this.калибровка = null
    if (к.length < 10) {
      this.событие('калибровка', { конец: true, кадров: к.length, норма: null })
      return null
    }
    const века = к.map((з) => з.веко).filter((в): в is number => typeof в === 'number' && в > 0)
    const н: Норма = {
      рыск: МЕДИАНА(к.map((з) => з.рыск)),
      тангаж: МЕДИАНА(к.map((з) => з.тангаж)),
      взглядВниз: МЕДИАНА(к.map((з) => з.взглядВниз)),
      веко: века.length >= 10 ? МЕДИАНА(века) : null,
      рот: МЕДИАНА(к.map((з) => з.рот)),
    }
    this.движок.задатьНорму(н)
    this.событие('калибровка', { конец: true, кадров: к.length, норма: н })
    return н
  }

  /* ── Отдельные фразы (голос учителя) ────────────────────────────────── */

  начатьКлип(метка: Record<string, unknown>): boolean {
    const тип = форматЗвука()
    if (!тип) return false
    this.отменитьКлип()
    const рекордер = new MediaRecorder(new MediaStream(this.поток.getAudioTracks()), { mimeType: тип, audioBitsPerSecond: 96_000 })
    const клип = { рекордер, части: [] as Blob[], начало: this.сейчас(), метка }
    рекордер.ondataavailable = (e) => { if (e.data.size) клип.части.push(e.data) }
    рекордер.start()
    this.клип = клип
    this.событие('клип-начат', метка)
    return true
  }

  /** Закончить фразу и положить её в очередь. → номер куска или null. */
  закончитьКлип(ещё: Record<string, unknown> = {}): Promise<number | null> {
    const клип = this.клип
    if (!клип) return Promise.resolve(null)
    this.клип = null
    this.закрытие = this.дописать(клип, ещё)
    return this.закрытие
  }

  /* 🔴 КОНЕЦ ЗАПИСИ ЖДЁТ ПОСЛЕДНЮЮ ФРАЗУ. Кусочек урока кончается по часам, и
     сразу за ним — конец проверки. Звук фразы дописывается ещё мгновение;
     без этого ожидания её событие «клип» ушло бы после последней выгрузки и
     пропало (поймано живой пробой 06.10: 29 файлов звука, 28 событий). */
  private async дописать(клип: NonNullable<Запись['клип']>, ещё: Record<string, unknown>): Promise<number | null> {
    await new Promise<void>((r) => { клип.рекордер.onstop = () => r(); клип.рекордер.stop() })
    const тип = клип.рекордер.mimeType.split(';')[0] || 'audio/webm'
    const данные = new Blob(клип.части, { type: тип })
    const n = this.очередь.положить('audio' as ВидКуска, данные, тип)
    this.событие('клип', { ...клип.метка, ...ещё, n, с: клип.начало, по: this.сейчас(), байт: данные.size })
    return n
  }

  отменитьКлип(): void {
    if (!this.клип) return
    const к = this.клип
    this.клип = null
    try { к.рекордер.stop() } catch { /* уже остановлен */ }
    this.событие('клип-отменён', к.метка)
  }

  /* ── Конец ──────────────────────────────────────────────────────────── */

  /** Остановить запись и выгрузить последнее. Дождаться отправки — дело очереди. */
  async остановить(итог: Record<string, unknown>): Promise<void> {
    if (this.закончена) return
    this.закончена = true
    cancelAnimationFrame(this.цикл)
    window.clearInterval(this.пульс)
    window.clearInterval(this.сброс)
    document.removeEventListener('visibilitychange', this.приВидимости)
    window.removeEventListener('blur', this.приФокусе)
    window.removeEventListener('focus', this.приФокусе)
    window.removeEventListener('resize', this.приРазмере)
    if (this.закрытие) await this.закрытие
    this.отменитьКлип()
    if (this.рекордер && this.рекордер.state !== 'inactive') {
      await new Promise<void>((r) => { this.рекордер!.onstop = () => r(); this.рекордер!.stop() })
    }
    this.событие('конец', { ...итог, кадров: this.кадров, кадровСЛицом: this.кадровСЛицом })
    await this.выгрузить()
  }
}

/** gzip средствами браузера. Нет такого — отправляем как есть: разбор
 *  отличает сжатое по первым двум байтам. */
async function сжать(байты: Uint8Array<ArrayBuffer>): Promise<Blob> {
  if (typeof CompressionStream === 'undefined') return new Blob([байты])
  const поток = new Blob([байты]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(поток).blob()
}

/** Камера и/или микрофон. Ошибка — с именем, чтобы экран сказал словами. */
export async function открыть(камера: boolean, микрофон: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: камера ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: 'user' } : false,
    audio: микрофон ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
  })
}

export { завести }
