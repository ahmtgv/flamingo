import { useState } from 'react'

import { Vitrina } from '../hub/Vitrina'
import s from './Live.module.css'
import { InkLayer, type Tool } from './Ink'
import { FIRST_TOOL, InkTools } from './InkTools'
import type { Ink } from './shows'
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
 *
 *  🔴 Маркер поверх трансляции («даже видео» — решение владельца 31.08) живёт,
 *  пока живёт эта трансляция: у потока нет страниц, к которым пометку можно
 *  привязать навсегда, поэтому смена источника стирает пометки. Пока маркер
 *  включён, нажатия достаются ему, а не видео — это цена режима, и она видна:
 *  выключил маркер — видео снова слушается.
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
  sourceId, url, lead, marks, onMark, onUndo, onWipe, onClose,
}: {
  sourceId: string
  url: string
  lead: boolean
  /** Пометки поверх трансляции. Живут, пока живёт источник. */
  marks: Ink[]
  onMark: (m: Ink, final: boolean) => void
  onUndo: () => void
  onWipe: () => void
  onClose: () => void
}) {
  const src = SOURCES.find((x) => x.id === sourceId)
  const e = embedOf(url)
  const [tool, setTool] = useState<Tool | null>(null)

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

        {/* Слой пометок — по рамке трансляции. У потока нет «страницы», поэтому
            доля координат считается от рамки: у всех она стоит одинаково. */}
        <InkLayer marks={marks} tool={lead ? tool : null} onMark={onMark} />
      </div>

      {lead && tool ? (
        <InkTools
          tool={tool}
          onTool={setTool}
          onUndo={onUndo}
          onWipe={onWipe}
          canUndo={marks.length > 0}
          canWipe={marks.length > 0}
        />
      ) : null}

      <div className={s.pult} data-pult="трансляция">
        <span className={s.name}>{src?.name ?? 'Источник'}</span>
        {src ? <span className={s.right}>{RIGHTS[src.right].cant}</span> : null}
        {lead ? (
          <>
            <span className={s.sep} />
            <button
              type="button"
              className={`${s.mark} ${tool ? s.markOn : ''}`}
              aria-pressed={Boolean(tool)}
              onClick={() => setTool(tool ? null : FIRST_TOOL)}
            >
              Маркер
            </button>
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
