import { Vitrina } from '../hub/Vitrina'
import s from './Live.module.css'
import { RIGHTS, SOURCES } from '../hub/sources'

/** Трансляция классу из Flamingo HUB.
 *
 *  🔴 Право едет вместе с картинкой, а не остаётся в каталоге. У живых источников
 *  оно одно и то же: показать классу можно, записать нельзя — записей у нас нет
 *  вообще. Класс читает это на том же экране, где смотрит.
 *
 *  🔴 Решение Аделя 31.08: ВСЁ открывается в самом занятии, а не в новой вкладке.
 *  Видеохостинги и прямые файлы мы узнаём и показываем как видео или картинку;
 *  всё остальное уходит в Витрину — обычную рамку, которая честно предупреждает,
 *  что чужой сайт вправе не пустить себя внутрь. Уводить преподавателя из урока
 *  в другую вкладку посреди занятия — худшее, что можно сделать: класс остаётся
 *  смотреть на пустую доску.
 */

type Kind = 'frame' | 'video' | 'image' | 'link'

export function embedOf(raw: string): { kind: Kind; src: string } {
  const url = raw.trim()
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return { kind: 'frame', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` }
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return { kind: 'frame', src: `https://player.vimeo.com/video/${vm[1]}` }
  const rt = url.match(/rutube\.ru\/video\/([\w]+)/)
  if (rt) return { kind: 'frame', src: `https://rutube.ru/play/embed/${rt[1]}` }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: 'video', src: url }
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url)) return { kind: 'image', src: url }
  return { kind: 'link', src: url }
}

export function Live({
  sourceId, url, lead, onClose,
}: {
  sourceId: string
  url: string
  lead: boolean
  onClose: () => void
}) {
  const src = SOURCES.find((x) => x.id === sourceId)
  const e = embedOf(url)

  return (
    <div className={s.live}>
      <div className={s.frameBox}>
        {e.kind === 'frame' ? (
          <iframe
            className={s.frame}
            src={e.src}
            title={src?.name ?? 'Трансляция'}
            allow="autoplay; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : null}
        {e.kind === 'video' ? <video className={s.frame} src={e.src} controls autoPlay /> : null}
        {e.kind === 'image' ? <img className={s.pic} src={e.src} alt={src?.name ?? 'Источник'} /> : null}
        {e.kind === 'link' ? <Vitrina url={e.src} name={src?.name ?? 'Источник'} /> : null}
      </div>

      <div className={s.pult} data-pult="трансляция">
        <span className={s.name}>{src?.name ?? 'Источник'}</span>
        {src ? <span className={s.right}>{RIGHTS[src.right].cant}</span> : null}
        {lead ? (
          <>
            <span className={s.sep} />
            <button type="button" className={s.stop} onClick={onClose}>
              Закончить показ
            </button>
          </>
        ) : (
          <span className={s.follow}>показывает преподаватель</span>
        )}
      </div>
    </div>
  )
}
