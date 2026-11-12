import { useEffect, useRef, useState } from 'react'

import s from './Звук.module.css'

/** Звук пособия на уроке (владелец, 12.11.2026: «учитель включает у себя в
 *  браузере — ученики слышат»).
 *
 *  У учителя — плеер: играть, пауза, перемотка, закрыть. Звук идёт через Web
 *  Audio в два места разом: в его динамики и в дорожку эфира, которую
 *  `useRoom.пустьЗвучит` отдаёт классу. Пауза у учителя — тишина у всех;
 *  перемотал — класс слышит с того же места. Закрыл — дорожка снята.
 *
 *  🔴 ДОРОЖКА ЗАВОДИТСЯ ОДИН РАЗ, НА ОТКРЫТИИ, И СТОИТ, ПОКА ПЛЕЕР ОТКРЫТ.
 *  Заводить её на каждое «играть» значит каждый раз заставлять класс ждать
 *  подписки — первые полсекунды музыки терялись бы. Стоящая на паузе дорожка
 *  ничего не весит: в ней тишина.
 *
 *  У ученика плеера нет: только строка «Звучит: …». Управлять звуком класса —
 *  дело ведущего, как и с видео.
 */

function время(с: number): string {
  if (!Number.isFinite(с) || с < 0) return '0:00'
  const м = Math.floor(с / 60)
  const сек = Math.floor(с % 60)
  return `${м}:${String(сек).padStart(2, '0')}`
}

export function ЗвукУчителя({ имя, адрес, пустьЗвучит, замолчи, onClose }: {
  имя: string
  /** Адрес файла в этом браузере (`blob:`), уже скачанного. */
  адрес: string
  пустьЗвучит: (дорожка: MediaStreamTrack, имя: string) => Promise<void>
  замолчи: () => Promise<void>
  onClose: () => void
}) {
  const плеер = useRef<HTMLAudioElement | null>(null)
  const звукРеф = useRef<AudioContext | null>(null)
  const [играет, setИграет] = useState(false)
  const [где, setГде] = useState(0)
  const [длина, setДлина] = useState(0)
  const [беда, setБеда] = useState('')

  /* 🔴 ЭЛЕМЕНТ ЗВУКА СОЗДАЁТСЯ ЗДЕСЬ, А НЕ В РАЗМЕТКЕ. Элемент, однажды
     подключённый к Web Audio, второй раз не подключить: перезапуск эффекта
     (а React в разработке перезапускает его нарочно) оставлял класс без
     звука. Свой элемент на каждый запуск — и подключение всегда первое.

     Звук → динамики учителя и дорожка класса. Плеер открыт нажатием учителя,
     поэтому браузер разрешает и Web Audio, и воспроизведение. */
  useEffect(() => {
    const э = new Audio(адрес)
    э.preload = 'auto'
    плеер.current = э
    const на = (что: string, дело: () => void) => э.addEventListener(что, дело)
    на('play', () => { setИграет(true); setБеда('') })
    на('pause', () => setИграет(false))
    на('ended', () => setИграет(false))
    на('timeupdate', () => setГде(э.currentTime))
    на('loadedmetadata', () => setДлина(э.duration))
    на('error', () => setБеда('Файл не читается: возможно, браузер не знает этот формат. Попробуйте mp3.'))
    let звук: AudioContext | null = null
    try {
      звук = new AudioContext()
      звукРеф.current = звук
      const исток = звук.createMediaElementSource(э)
      const эфир = звук.createMediaStreamDestination()
      исток.connect(звук.destination)
      исток.connect(эфир)
      const дорожка = эфир.stream.getAudioTracks()[0]
      if (дорожка) {
        пустьЗвучит(дорожка, имя).catch(() => setБеда('Класс не слышит: эфир не принял звук. Проверьте связь.'))
      }
    } catch {
      setБеда('Браузер не дал передать звук классу — играет только у вас.')
    }
    return () => {
      э.pause()
      э.removeAttribute('src')
      плеер.current = null
      звукРеф.current = null
      void замолчи()
      void звук?.close()
    }
  // Плеер заводится один раз на файл: функции эфира стабильны.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [адрес])

  const играть = () => {
    const э = плеер.current
    if (!э) return
    /* 🔴 WEB AUDIO МОГ УСНУТЬ ДО НАЖАТИЯ. Плеер открывается после скачивания
       файла, и к этому мигу браузер уже не считает это «нажатием» — звук
       тогда заводится спящим, и ни учитель, ни класс ничего не слышат.
       Будим его этим нажатием. */
    void звукРеф.current?.resume()
    if (э.paused) void э.play().catch(() => setБеда('Браузер не дал включить звук. Нажмите ещё раз.'))
    else э.pause()
  }

  return (
    <div className={s.плеер} role="group" aria-label={`Звук: ${имя}`} data-pult="звук">
      <button type="button" className={s.кнопка} onClick={играть}
              aria-label={играет ? 'Пауза' : 'Играть'} title={играет ? 'Пауза — у класса тоже тишина' : 'Играть — класс услышит'}>
        {играет ? (
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6l7.6-4.8z" /></svg>
        )}
      </button>
      <div className={s.середина}>
        <span className={s.имя} title={имя}>{имя}</span>
        <input
          className={s.дорожка}
          type="range"
          min={0}
          max={длина || 0}
          step={0.1}
          value={Math.min(где, длина || 0)}
          onChange={(e) => { const э = плеер.current; if (э) э.currentTime = Number(e.target.value) }}
          aria-label="Перемотка"
        />
        {(() => {
          const слова = беда || `${время(где)} / ${время(длина)} · ${играет ? 'класс слышит' : 'пауза'}`
          return <span className={s.подпись} title={слова}>{слова}</span>
        })()}
      </div>
      <button type="button" className={s.закрыть} onClick={onClose} aria-label="Закрыть звук" title="Закрыть — звук у класса стихнет">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </div>
  )
}

/** Ученику: что сейчас звучит. Управлять звуком класса он не может. */
export function ЗвукКласса({ имя }: { имя: string }) {
  return (
    <div className={`${s.плеер} ${s.слушаю}`} role="status" data-pult="звук">
      <span className={s.нота} aria-hidden="true">
        <svg viewBox="0 0 16 16"><path d="M6 12.5V3.5l7-1.5v9" /><circle cx="4.5" cy="12.5" r="1.6" /><circle cx="11.5" cy="11" r="1.6" /></svg>
      </span>
      <span className={s.середина}>
        <span className={s.имя} title={имя}>{имя}</span>
        <span className={s.подпись} title="звук включил преподаватель">звук включил преподаватель</span>
      </span>
    </div>
  )
}
