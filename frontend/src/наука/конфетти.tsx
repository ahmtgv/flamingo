/** Конфетти, когда пройдены все проверки (владелец, 07.10: «когда проходит все
 *  этапы — когда открывается карта — должно вылетать конфетти и благодарность»).
 *
 *  Два залпа из нижних углов экрана, три с половиной секунды, потом холст
 *  убирается сам. Холст поверх страницы и не ловит нажатия. Цвета — из палитры
 *  продукта (листва, мох, золото, небо, графит), кораллового нет: он у нас только
 *  для тревоги. Кто просил систему «уменьшить движение», конфетти не видит —
 *  благодарность словами остаётся на месте.
 */
import { useEffect, useRef } from 'react'

import s from './Наука.module.css'

const ЦВЕТА = ['--fl-leaf-500', '--fl-leaf-300', '--fl-moss-500', '--fl-moss-300', '--fl-warning-300', '--fl-info-300', '--fl-warm-700']
const ДЛИТСЯ_МС = 3500
const ШТУК = 160

type Кусочек = { x: number; y: number; vx: number; vy: number; угол: number; вращение: number; ш: number; в: number; цвет: string; волна: number }

export function Конфетти({ onКонец }: { onКонец?: () => void }) {
  const холст = useRef<HTMLCanvasElement>(null)
  /* Залп один: новый обработчик от родителя не перезапускает анимацию. */
  const конец = useRef(onКонец)
  конец.current = onКонец

  useEffect(() => {
    const к = холст.current
    const тихо = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ц = к?.getContext('2d')
    if (!к || !ц || тихо) { конец.current?.(); return }

    const плотность = Math.min(2, window.devicePixelRatio || 1)
    const размер = () => {
      к.width = Math.round(window.innerWidth * плотность)
      к.height = Math.round(window.innerHeight * плотность)
      ц.setTransform(плотность, 0, 0, плотность, 0, 0)
    }
    размер()
    window.addEventListener('resize', размер)

    const стиль = getComputedStyle(document.documentElement)
    const цвета = ЦВЕТА.map((имя) => стиль.getPropertyValue(имя).trim()).filter(Boolean)
    const ш = window.innerWidth
    const в = window.innerHeight
    const кусочки: Кусочек[] = Array.from({ length: ШТУК }, (_, i) => {
      const слева = i % 2 === 0
      /* Залп вверх и внутрь: из левого угла — вправо, из правого — влево. */
      const угол = -Math.PI / 2 + (слева ? 1 : -1) * (0.25 + Math.random() * 0.55)
      /* До верхней трети экрана: с сопротивлением воздуха нужна скорость около в/30 за кадр. */
      const сила = (0.8 + Math.random() * 0.45) * Math.max(14, в / 34)
      return {
        x: слева ? -10 : ш + 10,
        y: в * (0.85 + Math.random() * 0.15),
        vx: Math.cos(угол) * сила,
        vy: Math.sin(угол) * сила,
        угол: Math.random() * Math.PI,
        вращение: (Math.random() - 0.5) * 0.3,
        ш: 6 + Math.random() * 6,
        в: 4 + Math.random() * 4,
        цвет: цвета[i % цвета.length] || 'currentColor',
        волна: Math.random() * Math.PI * 2,
      }
    })

    let id = 0
    const старт = performance.now()
    let прошлое = старт
    const кадр = (сейчас: number) => {
      const шаг = Math.min(2, (сейчас - прошлое) / 16.7)
      прошлое = сейчас
      const прошло = сейчас - старт
      ц.clearRect(0, 0, ш, в)
      const гаснет = прошло > ДЛИТСЯ_МС - 700 ? Math.max(0, (ДЛИТСЯ_МС - прошло) / 700) : 1
      for (const к1 of кусочки) {
        к1.vy += 0.32 * шаг
        к1.vx *= 0.985 ** шаг
        к1.vy *= 0.985 ** шаг
        к1.x += (к1.vx + Math.sin(к1.волна + прошло / 260) * 0.8) * шаг
        к1.y += к1.vy * шаг
        к1.угол += к1.вращение * шаг
        ц.save()
        ц.globalAlpha = гаснет
        ц.translate(к1.x, к1.y)
        ц.rotate(к1.угол)
        /* Плоский кусочек бумаги переворачивается: ширина «дышит». */
        ц.scale(1, Math.cos(к1.волна + прошло / 140))
        ц.fillStyle = к1.цвет
        ц.fillRect(-к1.ш / 2, -к1.в / 2, к1.ш, к1.в)
        ц.restore()
      }
      if (прошло < ДЛИТСЯ_МС) id = requestAnimationFrame(кадр)
      else { ц.clearRect(0, 0, ш, в); конец.current?.() }
    }
    id = requestAnimationFrame(кадр)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', размер) }
  }, [])

  return <canvas ref={холст} className={s.конфетти} aria-hidden />
}
