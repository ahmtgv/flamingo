import { useEffect, useRef } from 'react'
import type { Track } from 'livekit-client'

import type { Face } from './useRoom'

/** Голоса класса — ОТДЕЛЬНО ОТ ПЛИТОК.
 *
 *  🔴 ПОЙМАНО ВЛАДЕЛЬЦЕМ 09.10: ученик свернул превью над доской — и пропал
 *  звук. Голоса играли элементы `<audio>`, которые жили ВНУТРИ плиток: свернул
 *  полосу — плитки исчезли, а с ними и звук. То же случалось тихо и в других
 *  местах: переход «лица → доска» пересоздавал все голоса (щелчок и пауза, а
 *  на телефоне — запрет браузера играть звук заново без нажатия), а в полосе
 *  превью рисуются только первые восемь учеников — девятого не было слышно
 *  вовсе.
 *
 *  Теперь голоса живут здесь, одним слоем на всю комнату, и не зависят от того,
 *  что показано на экране: свёрнута полоса, открыт показ, доска или лица. Свой
 *  голос себе не играем (`useRoom` не даёт своей звуковой дорожки). */
function Голос({ track }: { track: Track }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])
  return <audio ref={ref} autoPlay />
}

export function Звуки({ faces }: { faces: Face[] }) {
  return (
    <>
      {faces.map((f) => (f.audio && !f.isLocal ? <Голос key={`${f.identity}-${f.audio.sid ?? ''}`} track={f.audio} /> : null))}
    </>
  )
}
