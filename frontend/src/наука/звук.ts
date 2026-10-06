/** Звуковой сигнал «вернитесь к экрану».
 *
 *  🔴 ЗАЧЕМ ЗВУК. В половине шагов человек НЕ смотрит на экран: закрыл глаза,
 *  отвернулся, ушёл из кадра. Сказать ему «всё, возвращайтесь» картинкой
 *  нельзя — он её не видит. Короткий двойной тон слышен в любой позе.
 *
 *  Звук в браузере можно включить только после нажатия — поэтому всё
 *  заводится на нажатии («Начать «…»» на пути, «Дальше» в «Как вы сейчас?»,
 *  «Проверить звук», «Начать запись») и дальше живёт само.
 *
 *  🔴 ДВА ПУТИ, А НЕ ОДИН (владелец, 06.10: «в „Глазах и сне“ не было звука, и
 *  дальше по всему исследованию»). Звук шёл только через Web Audio. Safari
 *  приостанавливает такой звук, когда страница включает микрофон, — состояние
 *  `interrupted`, о котором прежний код не знал: он будил звук, только если тот
 *  был `suspended`, и только один раз, в начале. Пока перед каждой проверкой
 *  была подготовка с кнопкой «Проверить звук», нажатие после включения
 *  микрофона будило звук заново; без подготовки будить стало некому.
 *  Теперь:
 *    1) перед каждым тоном звук будится, если он не «running», в любом из
 *       состояний — и сам, как только браузер его приостановит;
 *    2) не проснулся — тот же тон играет обычный аудиоэлемент: его заводим на
 *       том же нажатии, а пока страница пишет камеру и микрофон, Safari и
 *       Chrome разрешают ему играть и без нажатия.
 */

type Тон = [частота: number, начало: number, длина: number]

const СИГНАЛ: Тон[] = [[880, 0, 0.16], [1175, 0.22, 0.2]]
const ЩЕЛЧОК: Тон[] = [[660, 0, 0.12]]
const ГРОМКО = 0.25

let контекст: AudioContext | null = null
const элементы: Partial<Record<'сигнал' | 'щелчок', HTMLAudioElement>> = {}

/** Тон с тем же «вдохом» и затуханием, что у Web Audio: 20 мс нарастания, дальше
 *  по экспоненте до тишины. Возвращает огибающую в момент `t` от начала тона. */
function огибающая(t: number, длина: number): number {
  if (t < 0 || t > длина) return 0
  if (t < 0.02) return ГРОМКО * (t / 0.02)
  return ГРОМКО * Math.exp((-Math.log(ГРОМКО / 0.0001) * (t - 0.02)) / (длина - 0.02))
}

/** WAV (16 бит, моно) из тонов — для аудиоэлемента. Чистая функция: её проверяет
 *  `scripts/наука-check.mjs`. */
export function волна(тоны: Тон[], частота = 22050): ArrayBuffer {
  const всего = Math.max(...тоны.map(([, н, д]) => н + д)) + 0.03
  const n = Math.ceil(всего * частота)
  const буфер = new ArrayBuffer(44 + n * 2)
  const в = new DataView(буфер)
  const строка = (с: number, т: string) => { for (let i = 0; i < т.length; i++) в.setUint8(с + i, т.charCodeAt(i)) }
  строка(0, 'RIFF'); в.setUint32(4, 36 + n * 2, true); строка(8, 'WAVE')
  строка(12, 'fmt '); в.setUint32(16, 16, true); в.setUint16(20, 1, true); в.setUint16(22, 1, true)
  в.setUint32(24, частота, true); в.setUint32(28, частота * 2, true); в.setUint16(32, 2, true); в.setUint16(34, 16, true)
  строка(36, 'data'); в.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) {
    const t = i / частота
    let у = 0
    for (const [ч, н, д] of тоны) у += огибающая(t - н, д) * Math.sin(2 * Math.PI * ч * (t - н))
    в.setInt16(44 + i * 2, Math.max(-1, Math.min(1, у)) * 32767, true)
  }
  return буфер
}

function элемент(что: 'сигнал' | 'щелчок'): HTMLAudioElement | null {
  if (typeof Audio === 'undefined' || typeof URL.createObjectURL !== 'function') return null
  if (!элементы[что]) {
    const э = new Audio(URL.createObjectURL(new Blob([волна(что === 'сигнал' ? СИГНАЛ : ЩЕЛЧОК)], { type: 'audio/wav' })))
    э.preload = 'auto'
    элементы[что] = э
  }
  return элементы[что] ?? null
}

/** На нажатии: будим Web Audio и «разрешаем» аудиоэлементы — проигрываем их
 *  беззвучно, чтобы потом браузер дал им играть без нового нажатия. */
export function завестиЗвук(): void {
  try {
    if (!контекст) {
      контекст = new AudioContext()
      /* Браузер приостановил звук (Safari — при включении микрофона) — будим сразу. */
      контекст.addEventListener('statechange', () => {
        if (контекст && контекст.state !== 'running' && контекст.state !== 'closed') void контекст.resume().catch(() => undefined)
      })
    }
    if (контекст.state !== 'running') void контекст.resume().catch(() => undefined)
  } catch {
    контекст = null
  }
  for (const что of ['сигнал', 'щелчок'] as const) {
    const э = элемент(что)
    if (!э || !э.paused) continue
    э.volume = 0
    void э.play().then(() => { э.pause(); э.currentTime = 0; э.volume = 1 }).catch(() => { э.volume = 1 })
  }
}

function тоныWebAudio(к: AudioContext, тоны: Тон[]): void {
  const t0 = к.currentTime
  for (const [частота, н, длина] of тоны) {
    const о = к.createOscillator()
    const г = к.createGain()
    о.type = 'sine'
    о.frequency.value = частота
    г.gain.setValueAtTime(0.0001, t0 + н)
    г.gain.exponentialRampToValueAtTime(ГРОМКО, t0 + н + 0.02)
    г.gain.exponentialRampToValueAtTime(0.0001, t0 + н + длина)
    о.connect(г).connect(к.destination)
    о.start(t0 + н)
    о.stop(t0 + н + длина + 0.02)
  }
}

async function играть(что: 'сигнал' | 'щелчок'): Promise<void> {
  const к = контекст
  if (к && к.state !== 'running' && к.state !== 'closed') {
    /* Будим и ждём не дольше 300 мс: сигнал должен прозвучать вовремя. */
    await Promise.race([к.resume().catch(() => undefined), new Promise((r) => setTimeout(r, 300))])
  }
  if (к && к.state === 'running') {
    тоныWebAudio(к, что === 'сигнал' ? СИГНАЛ : ЩЕЛЧОК)
    return
  }
  const э = элемент(что)
  if (!э) return
  э.volume = 1
  э.currentTime = 0
  await э.play().catch(() => undefined)
}

/** Двойной тон: «шаг кончился, вернитесь к экрану». */
export function сигнал(): void {
  void играть('сигнал')
}

/** Короткий тон: «начинаем». */
export function щелчок(): void {
  void играть('щелчок')
}
