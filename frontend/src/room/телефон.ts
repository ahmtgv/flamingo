import { useEffect, useState } from 'react'

/** Урок с телефона (решение владельца 10.11.2026).
 *
 *  Лёжа — «чистый экран»: показанное классу занимает всё, наша верхняя строка
 *  спрятана, ведущий — круглым окошком, управление всплывает по касанию и само
 *  уходит. Стоймя — «урок как мессенджер»: сверху показанное, под ним лица,
 *  ниже чат, который всегда открыт, внизу управление.
 *
 *  🔴 ЭТИ ДВЕ СТРОКИ ПОВТОРЕНЫ В CSS СЛОВО В СЛОВО (`Room.module.css`,
 *  `Tiles.module.css`, `Chat.module.css`): лист стилей не умеет читать
 *  переменную из кода. Меняешь здесь — меняй там, иначе вид и поведение
 *  разойдутся.
 */
export const ЛЁЖА = '(max-height: 500px) and (orientation: landscape)'
export const СТОЙМЯ = '(max-width: 700px) and (orientation: portrait)'

export type Телефон = 'лёжа' | 'стоймя' | null

const сейчас = (): Телефон => {
  if (typeof window === 'undefined' || !window.matchMedia) return null
  if (window.matchMedia(ЛЁЖА).matches) return 'лёжа'
  if (window.matchMedia(СТОЙМЯ).matches) return 'стоймя'
  return null
}

export function useТелефон(): Телефон {
  const [вид, setВид] = useState<Телефон>(сейчас)
  useEffect(() => {
    const а = window.matchMedia(ЛЁЖА)
    const б = window.matchMedia(СТОЙМЯ)
    const смена = () => setВид(сейчас())
    а.addEventListener('change', смена)
    б.addEventListener('change', смена)
    return () => {
      а.removeEventListener('change', смена)
      б.removeEventListener('change', смена)
    }
  }, [])
  return вид
}
