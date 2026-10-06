/** Звуковой сигнал «вернитесь к экрану».
 *
 *  🔴 ЗАЧЕМ ЗВУК. В половине шагов человек НЕ смотрит на экран: закрыл глаза,
 *  отвернулся, ушёл из кадра. Сказать ему «всё, возвращайтесь» картинкой
 *  нельзя — он её не видит. Короткий двойной тон слышен в любой позе.
 *
 *  Звук в браузере можно включить только после нажатия — поэтому «контекст»
 *  заводится на кнопке «Проверить звук» или «Начать» и дальше живёт сам.
 */
let контекст: AudioContext | null = null

export function завестиЗвук(): void {
  try {
    контекст ??= new AudioContext()
    if (контекст.state === 'suspended') void контекст.resume()
  } catch {
    контекст = null
  }
}

function тон(частота: number, с: number, длина: number): void {
  if (!контекст) return
  const о = контекст.createOscillator()
  const г = контекст.createGain()
  о.type = 'sine'
  о.frequency.value = частота
  г.gain.setValueAtTime(0.0001, с)
  г.gain.exponentialRampToValueAtTime(0.25, с + 0.02)
  г.gain.exponentialRampToValueAtTime(0.0001, с + длина)
  о.connect(г).connect(контекст.destination)
  о.start(с)
  о.stop(с + длина + 0.02)
}

/** Двойной тон: «шаг кончился, вернитесь к экрану». */
export function сигнал(): void {
  if (!контекст) return
  const t = контекст.currentTime
  тон(880, t, 0.16)
  тон(1175, t + 0.22, 0.2)
}

/** Короткий тон: «начинаем». */
export function щелчок(): void {
  if (!контекст) return
  тон(660, контекст.currentTime, 0.12)
}
