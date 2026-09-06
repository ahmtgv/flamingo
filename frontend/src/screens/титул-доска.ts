/** Доска титульного экрана: четыре сцены о том, что она умеет.
 *
 *  🔴 РИСУЕТ РУКА, А НЕ ЛИНЕЙКА. Ломаная сначала дробится на шаги, потом точки
 *  смещаются шумом, толщина и плотность чернил гуляют, а в конце штрих чуть
 *  перелетает. Шум ДЕТЕРМИНИРОВАННЫЙ, по номеру точки: случайный на каждом
 *  кадре заставил бы линию вибрировать, а нужна неровная, но НЕПОДВИЖНАЯ.
 *
 *  🔴 ВСТАВЛЕННОЕ ОСТАЁТСЯ РОВНЫМ. У видео и фото край чистый: от руки рисуется
 *  только то, что кладут ПОВЕРХ. Без этого различия сцена читается как каракули.
 *
 *  🔴 ЦВЕТА БЕРУТСЯ ТОКЕНАМИ. Читаем их с самого холста через `getComputedStyle`,
 *  поэтому тёмная тема и детский режим меняют доску сами, без второго списка
 *  цветов в коде (ПРАВИЛА 2.8).
 */

export type Палитра = {
  перо: string; ось: string; подпись: string; тихо: string
  акцент: string; зелёный: string; синий: string; охра: string
  видео: string; кант: string; фото: string; фотоКант: string; звезда: string
}

export function палитра(el: Element): Палитра {
  const c = getComputedStyle(el)
  const т = (имя: string) => c.getPropertyValue(имя).trim()
  return {
    перо: т('--color-text'),
    ось: т('--color-border-strong'),
    подпись: т('--color-text-hint'),
    тихо: т('--color-text-hint'),
    акцент: т('--color-accent'),
    зелёный: т('--color-go'),
    синий: т('--color-info'),
    охра: т('--color-warning-text'),
    видео: т('--color-surface-subtle'),
    кант: т('--color-border-strong'),
    фото: т('--color-surface-video'),
    фотоКант: т('--color-border-on-video'),
    звезда: т('--color-text-on-video'),
  }
}

type Точка = [number, number]

/** Одна сцена: сколько живёт и как рисуется по доле прогресса 0..1. */
export type Сцена = { имя: string; сек: number; рисуй: (p: number) => void }

export function доска(c: HTMLCanvasElement, П: Палитра) {
  const g = c.getContext('2d')
  /* Форма ответа одна и та же с холстом и без него: разные формы делали тип
     объединением, и вызвать `текущая()` уже было нельзя. */
  if (!g) return {
    размер: () => undefined,
    сцен: 0,
    имена: [] as string[],
    играть: (_i: number, наСмену?: (n: number) => void) => { наСмену?.(0) },
    стоп: () => undefined,
    текущая: () => 0,
  }

  const тихо = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const W = () => c.getBoundingClientRect().width
  const H = () => c.getBoundingClientRect().height

  function размер() {
    const r = c.getBoundingClientRect()
    const k = window.devicePixelRatio || 1
    c.width = r.width * k
    c.height = r.height * k
    g!.setTransform(k, 0, 0, k, 0, 0)
    g!.lineCap = 'round'
    g!.lineJoin = 'round'
  }
  /* Чистим ВЕСЬ буфер со сбросом преобразования: clearRect в масштабе DPR
     зависит от того, что setTransform стоит верно прямо сейчас, и одна
     промашка оставляет полосу у кромки. */
  function чисто() {
    g!.save(); g!.setTransform(1, 0, 0, 1, 0, 0)
    g!.clearRect(0, 0, c.width, c.height); g!.restore()
  }

  const шум = (i: number, s: number) => {
    const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
    return (x - Math.floor(x)) * 2 - 1
  }
  const плавно = (i: number, s: number) =>
    шум(Math.floor(i / 3), s) * 0.62 + шум(Math.floor(i / 7) + 41, s) * 0.38
  const шкала = (p: number, a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)))

  /* Прежде чем дрожать, ломаную надо раздробить: у колбы шесть точек, сместив
     их, получишь смещённые углы и по-прежнему идеально прямые рёбра. */
  function дробить(т: Точка[], шаг: number): Точка[] {
    const из: Точка[] = [т[0]]
    for (let i = 1; i < т.length; i += 1) {
      const a = т[i - 1], b = т[i]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      const n = Math.max(1, Math.round(L / шаг))
      for (let k = 1; k <= n; k += 1) из.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n])
    }
    return из
  }
  /* Две составляющие: медленная уводит штрих в сторону на его длине, быстрая
     даёт мелкое подрагивание. Одна быстрая давала «шерсть». */
  function дрожь(т: Точка[], амп: number, семя: number): Точка[] {
    const n = т.length - 1 || 1
    const длин = Math.hypot(т[n][0] - т[0][0], т[n][1] - т[0][1])
    const низ = Math.min(6, Math.max(1.6, длин * 0.016))
    const из: Точка[] = []
    for (let i = 0; i < т.length; i += 1) {
      const t = i / n
      const dx = Math.sin(t * Math.PI * 1.3 + семя) * низ * шум(семя, 3) + плавно(i, семя) * амп
      const dy = Math.sin(t * Math.PI * 1.7 + семя * 1.7) * низ * шум(семя + 5, 3) + плавно(i + 17, семя + 3) * амп
      из.push([т[i][0] + dx, т[i][1] + dy])
    }
    return из
  }

  function линия(точки: Точка[], доля: number, цвет: string, ш: number, семя = 1) {
    if (доля <= 0 || точки.length < 2) return
    const т = дрожь(дробить(точки, 11), 1.05, семя)
    g!.globalCompositeOperation = 'source-over'
    g!.strokeStyle = цвет
    const alpha0 = g!.globalAlpha
    const всего = т.length - 1
    const до = Math.max(1, Math.ceil(всего * доля))
    for (let i = 1; i <= до && i < т.length; i += 1) {
      g!.lineWidth = ш * (0.86 + 0.26 * ((плавно(i, семя) + 1) / 2))
      g!.globalAlpha = alpha0 * (0.86 + 0.14 * ((шум(i + 7, семя) + 1) / 2))
      g!.beginPath(); g!.moveTo(т[i - 1][0], т[i - 1][1]); g!.lineTo(т[i][0], т[i][1]); g!.stroke()
    }
    g!.globalAlpha = alpha0
    /* Перелёт: рука не останавливается ровно в точке. */
    if (доля >= 0.999 && т.length > 2) {
      const a = т[т.length - 2], b = т[т.length - 1]
      const dx = b[0] - a[0], dy = b[1] - a[1]
      const L = Math.hypot(dx, dy) || 1
      const о = 1.5 + 2.5 * ((шум(91, семя) + 1) / 2)
      g!.lineWidth = ш * 0.86
      g!.beginPath(); g!.moveTo(b[0], b[1]); g!.lineTo(b[0] + dx / L * о, b[1] + dy / L * о); g!.stroke()
    }
  }

  /** Мазок вместо идеального круга. */
  function точка(cx: number, cy: number, r: number, цвет: string, семя = 5) {
    g!.globalCompositeOperation = 'source-over'
    g!.fillStyle = цвет
    for (let k = 0; k < 3; k += 1) {
      g!.beginPath()
      g!.arc(cx + плавно(k * 4, семя) * r * 0.22, cy + плавно(k * 4 + 7, семя) * r * 0.22,
        r * (0.86 + 0.16 * ((шум(k, семя) + 1) / 2)), 0, 7)
      g!.fill()
    }
  }

  /** Стрелка от руки: древко выгнуто, голова — два разных штриха. */
  function стрелка(x1: number, y1: number, x2: number, y2: number, цвет: string, доля: number, семя = 13) {
    if (доля <= 0) return
    const dx = x2 - x1, dy = y2 - y1
    const L = Math.hypot(dx, dy) || 1
    const nx = -dy / L, ny = dx / L
    const выг = L * 0.045 * шум(2, семя)
    const т: Точка[] = []
    for (let i = 0; i <= 14; i += 1) {
      const t = i / 14, к = Math.sin(t * Math.PI)
      т.push([x1 + dx * t + nx * выг * к, y1 + dy * t + ny * выг * к])
    }
    линия(т, Math.min(1, доля / 0.9), цвет, 2.2, семя)
    if (доля > 0.9) {
      const a = Math.atan2(dy, dx), q = (доля - 0.9) / 0.1
      const усы: Array<[number, number]> = [[-0.52, 10.5], [0.46, 8.5]]
      усы.forEach((п, k) => {
        const b = a + п[0] + шум(k * 3, семя) * 0.06
        const L2 = п[1] * (1 + шум(k + 5, семя) * 0.12)
        линия([[x2, y2], [x2 - L2 * Math.cos(b), y2 - L2 * Math.sin(b)]], q, цвет, 2.1, семя + k + 1)
      })
    }
  }

  /** Плашка. `семя = 0` — вставленный объект: у него ровный край. */
  function плашка(x: number, y: number, w: number, h: number, r: number,
    залив?: string, кант?: string, семя = 17) {
    g!.globalCompositeOperation = 'source-over'
    g!.beginPath(); g!.moveTo(x + r, y)
    g!.arcTo(x + w, y, x + w, y + h, r); g!.arcTo(x + w, y + h, x, y + h, r)
    g!.arcTo(x, y + h, x, y, r); g!.arcTo(x, y, x + w, y, r); g!.closePath()
    if (залив) { g!.fillStyle = залив; g!.fill() }
    if (кант && семя === 0) { g!.strokeStyle = кант; g!.lineWidth = 1.4; g!.stroke() }
    else if (кант) {
      const углы: Точка[] = [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r],
        [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r], [x + r, y]]
      const т: Точка[] = []
      for (let i = 0; i < углы.length - 1; i += 1) {
        const a = углы[i], b = углы[i + 1]
        for (let k = 0; k < 4; k += 1) т.push([a[0] + (b[0] - a[0]) * k / 4, a[1] + (b[1] - a[1]) * k / 4])
      }
      т.push(углы[углы.length - 1])
      линия(т, 1, кант, 1.5, семя)
    }
  }

  const кегль = (п: number, в = 500) => { g!.font = `${в} ${п}px ${getComputedStyle(c).fontFamily}` }
  const моно = (п: number) => { g!.font = `500 ${п}px ui-monospace, monospace` }
  /** Надпись рукой: чуть завалена. */
  function надпись(т: string, x: number, y: number, семя = 23, вцентр = false) {
    g!.save(); g!.translate(x, y); g!.rotate(шум(1, семя) * 0.016)
    if (вцентр) g!.textAlign = 'center'
    g!.fillText(т, 0, 0); g!.textAlign = 'left'; g!.restore()
  }

  const СЦЕНЫ: Сцена[] = [
    { имя: 'рисунок', сек: 5, рисуй(p) {
      const w = W(), h = H(), cy = h * 0.5, S = Math.min(w / 700, h / 320)
      const ox = w * 0.22, oy = cy
      const колба: Точка[] = [[ox - 15 * S, oy - 70 * S], [ox - 15 * S, oy - 22 * S],
        [ox - 52 * S, oy + 62 * S], [ox + 52 * S, oy + 62 * S],
        [ox + 15 * S, oy - 22 * S], [ox + 15 * S, oy - 70 * S]]
      линия(колба, шкала(p, 0, 0.26), П.акцент, 3)
      if (p > 0.24) {
        g!.globalAlpha = шкала(p, 0.24, 0.3)
        линия([[ox - 24 * S, oy - 70 * S], [ox + 24 * S, oy - 70 * S]], 1, П.акцент, 3, 2)
        g!.globalAlpha = 1
      }
      if (p > 0.28) {
        const пуз: Array<[number, number, number]> = [[ox + 2 * S, oy - 92 * S, 7],
          [ox + 22 * S, oy - 108 * S, 4.5], [ox - 16 * S, oy - 104 * S, 3.5]]
        пуз.forEach((б, i) => {
          const q = шкала(p, 0.28 + i * 0.05, 0.36 + i * 0.05)
          if (q <= 0) return
          g!.globalAlpha = 0.55 * q; точка(б[0], б[1], б[2], П.акцент, 31 + i); g!.globalAlpha = 1
        })
      }
      const lx = w * 0.5, низ = oy + 52 * S, верх = oy - 58 * S, шир = 34 * S
      const лист: Точка[] = []
      for (let i = 0; i <= 30; i += 1) { const t = i / 30; лист.push([lx - Math.sin(t * Math.PI) * шир, низ + (верх - низ) * t]) }
      for (let i = 0; i <= 30; i += 1) { const t = 1 - i / 30; лист.push([lx + Math.sin(t * Math.PI) * шир, низ + (верх - низ) * t]) }
      линия(лист, шкала(p, 0.32, 0.62), П.зелёный, 3, 4)
      линия([[lx, низ], [lx, верх]], шкала(p, 0.56, 0.68), П.зелёный, 1.6, 5)
      const вол: Точка[] = []
      for (let i = 0; i <= 60; i += 1) { const t = i / 60; вол.push([w * 0.68 + t * w * 0.24, cy + Math.sin(t * Math.PI * 2.4) * 42 * S]) }
      линия(вол, шкала(p, 0.66, 0.96), П.синий, 3, 6)
    } },

    { имя: 'график', сек: 5, рисуй(p) {
      const w = W(), h = H()
      /* Окно [−6;2]×[−9;7] вписано в 78 % высоты и 62 % ширины: масштаб наугад
         выгонял ветви за кадр, и у кромки оставались зелёные обрубки. */
      const X0 = -6, X1 = 2, Y0 = -9, Y1 = 7
      const sx = (w * 0.62) / (X1 - X0), sy = (h * 0.78) / (Y1 - Y0)
      const cy = h * 0.11 + Y1 * sy
      const X = (x: number) => w * 0.5 + (x + 2) * sx
      const Y = (y: number) => cy - y * sy
      const f = (x: number) => (x + 5) * (x - 1)
      линия([[X(X0 - 0.3), cy], [X(X1 + 0.3), cy]], 1, П.ось, 1.3, 51)
      линия([[X(0), Y(Y1)], [X(0), Y(Y0)]], 1, П.ось, 1.3, 52)
      const кр: Точка[] = []
      for (let i = 0; i <= 70; i += 1) { const x = X0 + i / 70 * (X1 - X0); кр.push([X(x), Y(f(x))]) }
      линия(кр, шкала(p, 0.06, 0.62), П.зелёный, 3.2, 53)
      if (p > 0.6) {
        const корни: Array<[number, string]> = [[-5, 'x₁ = −5'], [1, 'x₂ = 1']]
        корни.forEach((к, i) => {
          const q = шкала(p, 0.6 + i * 0.1, 0.74 + i * 0.1)
          if (q <= 0) return
          g!.globalAlpha = q
          точка(X(к[0]), cy, 4.6, П.акцент, 60 + i)
          моно(12); g!.fillStyle = П.тихо
          /* Подпись уходит В СТОРОНУ от ветви: под точкой её перечёркивала кривая. */
          g!.textAlign = i ? 'left' : 'right'
          g!.fillText(к[1], X(к[0]) + (i ? 12 : -12), cy + 20)
          g!.textAlign = 'left'; g!.globalAlpha = 1
        })
      }
      if (p > 0.78) {
        g!.globalAlpha = шкала(p, 0.78, 0.94)
        кегль(Math.min(20, h * 0.062), 600); g!.fillStyle = П.перо
        надпись('y = (x+5)(x−1)', w * 0.5, h * 0.22, 55, true)
        g!.globalAlpha = 1
      }
    } },

    { имя: 'английский', сек: 7, рисуй(p) {
      const w = W(), h = H(), S = Math.min(w / 700, h / 320)
      const vw = Math.min(230 * S, w * 0.34), vh = vw * 9 / 16
      const vx = w * 0.09, vy = h * 0.3
      const q0 = шкала(p, 0, 0.18)
      if (q0 > 0) {
        g!.globalAlpha = q0
        плашка(vx, vy, vw, vh, 10, П.видео, П.кант, 0)
        g!.fillStyle = П.видео
        g!.beginPath(); g!.arc(vx + vw / 2, vy + vh / 2, vh * 0.19, 0, 7); g!.fill()
        g!.fillStyle = П.перо
        g!.beginPath()
        g!.moveTo(vx + vw / 2 - vh * 0.05, vy + vh / 2 - vh * 0.085)
        g!.lineTo(vx + vw / 2 + vh * 0.09, vy + vh / 2)
        g!.lineTo(vx + vw / 2 - vh * 0.05, vy + vh / 2 + vh * 0.085)
        g!.closePath(); g!.fill()
        моно(10); g!.fillStyle = П.тихо; g!.fillText('видео · 0:42', vx, vy - 9)
        g!.globalAlpha = 1
      }
      const стик: Array<[string, string]> = [['Present Perfect', П.охра], ['have + V3', П.зелёный], ['since / for', П.акцент]]
      const sx0 = vx + vw + Math.min(90 * S, w * 0.1)
      const sw = Math.min(168 * S, w * 0.2), sh = Math.min(46 * S, h * 0.16)
      стик.forEach((ст, i) => {
        const q = шкала(p, 0.22 + i * 0.12, 0.36 + i * 0.12)
        if (q <= 0) return
        const y = vy - 6 + i * (sh + Math.min(14 * S, 10))
        g!.globalAlpha = q
        g!.save(); g!.translate(sx0 + sw / 2, y + sh / 2); g!.rotate((i - 1) * 0.022); g!.translate(-sw / 2, -sh / 2)
        плашка(0, 0, sw, sh, 7, П.видео, ст[1], 0)
        кегль(Math.max(12, 14 * S), 600); g!.fillStyle = П.перо
        g!.textAlign = 'center'; g!.fillText(ст[0], sw / 2, sh / 2 + 5); g!.textAlign = 'left'
        g!.restore(); g!.globalAlpha = 1
      })
      стик.forEach((_, i) => {
        const q = шкала(p, 0.54 + i * 0.09, 0.72 + i * 0.09)
        const y = vy - 6 + i * (sh + Math.min(14 * S, 10)) + sh / 2
        стрелка(vx + vw + 8, vy + vh / 2, sx0 - 8, y, П.акцент, q, 70 + i)
      })
    } },

    { имя: 'астрономия', сек: 5, рисуй(p) {
      const w = W(), h = H(), S = Math.min(w / 700, h / 320)
      const fw = Math.min(250 * S, w * 0.36), fh = fw * 0.62
      const fx = w * 0.07, fy = h * 0.26
      const q0 = шкала(p, 0, 0.16)
      if (q0 > 0) {
        g!.globalAlpha = q0
        плашка(fx, fy, fw, fh, 10, П.фото, П.фотоКант, 0)
        g!.save(); g!.beginPath(); плашка(fx, fy, fw, fh, 10); g!.clip()
        g!.fillStyle = П.звезда
        const зв: Array<[number, number, number]> = [[0.18, 0.22, 1.6], [0.42, 0.13, 1.1], [0.72, 0.3, 1.8],
          [0.28, 0.72, 1.2], [0.84, 0.66, 1.4], [0.58, 0.84, 1]]
        зв.forEach((з) => { g!.beginPath(); g!.arc(fx + fw * з[0], fy + fh * з[1], з[2], 0, 7); g!.fill() })
        g!.strokeStyle = П.акцент; g!.lineWidth = 2
        g!.beginPath(); g!.arc(fx + fw * 0.52, fy + fh * 0.5, fh * 0.24, 0, 7); g!.stroke()
        g!.strokeStyle = П.ось; g!.lineWidth = 1.4
        g!.beginPath(); g!.ellipse(fx + fw * 0.52, fy + fh * 0.5, fh * 0.44, fh * 0.11, -0.22, 0, 7); g!.stroke()
        g!.restore()
        моно(10); g!.fillStyle = П.тихо; g!.fillText('фото · телескоп', fx, fy - 9)
        g!.globalAlpha = 1
      }
      const цx = fx + fw + Math.min(78 * S, w * 0.09)
      const подписи: Array<[string, number]> = [['кольцо — лёд и камень', fy + fh * 0.3], ['период обращения', fy + fh * 0.68]]
      подписи.forEach((п, i) => {
        const q = шкала(p, 0.2 + i * 0.16, 0.42 + i * 0.16)
        if (q <= 0) return
        стрелка(fx + fw - fh * 0.1, fy + fh * (i ? 0.62 : 0.42), цx - 10, п[1], П.акцент, q, 80 + i)
        if (q > 0.9) {
          g!.globalAlpha = шкала(q, 0.9, 1)
          кегль(Math.max(12, 13.5 * S), 500); g!.fillStyle = П.перо
          надпись(п[0], цx, п[1] + 4, 84 + i)
          g!.globalAlpha = 1
        }
      })
      const qф = шкала(p, 0.56, 0.86)
      if (qф > 0) {
        g!.globalAlpha = qф
        const fyy = fy + fh + Math.min(46 * S, h * 0.16)
        кегль(Math.max(17, 22 * S), 600); g!.fillStyle = П.перо
        надпись('F = G · m₁m₂ / r²', цx, fyy, 88)
        линия([[цx - 3, fyy + 9], [цx + g!.measureText('F = G · m₁m₂ / r²').width + 4, fyy + 7]], 1, П.ось, 1.6, 89)
        g!.globalAlpha = 1
      }
    } },
  ]

  let поколение = 0
  let текущая = 0

  /** Сцена живёт свои секунды, потом РОВНО ЗА СЕКУНДУ растворяется. */
  function играть(i: number, наСмену?: (n: number) => void) {
    текущая = ((i % СЦЕНЫ.length) + СЦЕНЫ.length) % СЦЕНЫ.length
    const мой = (поколение += 1)
    const с = СЦЕНЫ[текущая]
    const Т = с.сек * 1000
    наСмену?.(текущая)
    if (тихо) { чисто(); с.рисуй(1); return }
    const t0 = performance.now()
    const кадр = () => {
      if (мой !== поколение) return
      const dt = performance.now() - t0
      if (dt <= Т) { чисто(); g!.globalAlpha = 1; с.рисуй(Math.min(1, dt / Т)); requestAnimationFrame(кадр) }
      else if (dt <= Т + 1000) {
        const q = (dt - Т) / 1000
        чисто(); g!.globalAlpha = 1 - q; с.рисуй(1); g!.globalAlpha = 1
        requestAnimationFrame(кадр)
      } else { чисто(); играть(текущая + 1, наСмену) }
    }
    кадр()
  }

  return {
    размер,
    сцен: СЦЕНЫ.length,
    имена: СЦЕНЫ.map((с) => с.имя),
    играть,
    стоп: () => { поколение += 1; чисто() },
    текущая: () => текущая,
  }
}
