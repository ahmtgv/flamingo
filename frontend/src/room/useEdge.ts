import { useEffect, useRef, useState } from 'react'

/** Какая кромка кадра сейчас «под рукой».
 *
 *  🔴 Зону пробуждения нельзя сделать элементом поверх холста: элемент либо крадёт
 *  у доски события (у самого края нельзя рисовать), либо, если он прозрачен для
 *  указателя, сам не узнаёт о наведении. Поэтому кромку считаем по координатам
 *  движения — холст при этом не теряет ни одного нажатия.
 */
const BAND = 96
const SLEEP_MS = 2200

export type Edge = 'left' | 'top' | 'bottom' | null

export function useEdge(host: React.RefObject<HTMLElement | null>) {
  const [edge, setEdge] = useState<Edge>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const next: Edge =
        y < BAND ? 'top' : y > r.height - BAND ? 'bottom' : x < BAND ? 'left' : null
      if (next) {
        setEdge(next)
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setEdge(null), SLEEP_MS)
      }
    }
    const onLeave = () => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setEdge(null), 400)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [host])

  return edge
}
