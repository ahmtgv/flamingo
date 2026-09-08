import { useEffect, useRef, useState } from 'react'

import { Vitrina } from '../hub/Vitrina'
import s from './Live.module.css'
import { InkLayer, type Tool } from './Ink'
import { Note } from './Note'
import { FIRST_TOOL, InkTools } from './InkTools'
import { рамкаПометок, type Прямоугольник } from './рамка'
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
  sourceId, url, имя, lead, marks, onMark, onUndo, onWipe, onClose,
}: {
  sourceId: string
  url: string
  /** Подпись для того, что открыли не из каталога: пособие урока. */
  имя?: string
  lead: boolean
  /** Пометки поверх трансляции. Живут, пока живёт источник. */
  marks: Ink[]
  onMark: (m: Ink, final: boolean) => void
  onUndo: () => void
  onWipe: () => void
  onClose: () => void
}) {
  /* 🔴 СЛОЙ ПОМЕТОК ЛОЖИТСЯ ПО КАРТИНКЕ, А НЕ ПО ВСЕЙ КОРОБКЕ. Раньше он стоял
     прямо в `.frameBox`, у которой сверху и с боков отступ --space-4, а снизу
     --space-13 + --space-9 = 176 px под пульт. Доля 0,3/0,3 попадала в
     0,218/0,412 на 1280×800 и в 0,148/0,394 на 1600×900 — разбег 64 px, а доля
     0,5/0,9 уходила НИЖЕ картинки вовсе. «Смотрите вот сюда» показывало у
     ученика не туда, и ведущий об этом не знал. У показа это давно сделано
     правильно (`рамкаПометок`), у трансляции — не было. Осмотр комнаты 08.09,
     находка 8. */
  const коробка = useRef<HTMLDivElement>(null)
  const медиа = useRef<HTMLElement>(null)
  const [spot, setSpot] = useState<Прямоугольник | null>(null)

  useEffect(() => {
    const box = коробка.current
    if (!box) return
    const place = () => {
      const a = box.getBoundingClientRect()
      const м = медиа.current
      /* Есть картинка — меряем её; нет (витрина) — берём содержимое коробки
         без отступов, чтобы слой не залезал под пульт. */
      const st = getComputedStyle(box)
      const ч = (v: string) => parseFloat(v) || 0
      const b = м
        ? м.getBoundingClientRect()
        : {
            left: a.left + ч(st.paddingLeft),
            top: a.top + ч(st.paddingTop),
            width: a.width - ч(st.paddingLeft) - ч(st.paddingRight),
            height: a.height - ч(st.paddingTop) - ч(st.paddingBottom),
          }
      setSpot(рамкаПометок(
        { left: a.left, top: a.top, scrollLeft: box.scrollLeft, scrollTop: box.scrollTop },
        { left: b.left, top: b.top, width: b.width, height: b.height },
      ))
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(box)
    if (медиа.current) ro.observe(медиа.current)
    return () => ro.disconnect()
  }, [url])

  /* 🔴 У ТРАНСЛЯЦИИ ТОЖЕ ПЯТЬ СОСТОЯНИЙ (ПРАВИЛА 6.1). Слова были только у
     вида «ссылка»: у рамки, видео и картинки не было ни «загружается», ни
     отказа — ролик не открылся, и класс смотрел на ровное серое поле, а
     преподаватель тратил минуты урока на «вы видите?». Осмотр комнаты 08.09,
     находка 20. */
  const [ход, setХод] = useState<'едет' | 'идёт' | 'беда'>('едет')
  useEffect(() => { setХод('едет') }, [url])

  const src = SOURCES.find((x) => x.id === sourceId)
  const подпись = src?.name ?? имя ?? 'Источник'
  const e = embedOf(url)
  const [tool, setTool] = useState<Tool | null>(null)

  return (
    <div className={s.live}>
      <div className={s.frameBox} ref={коробка}>
        {e.kind === 'frame' ? (
          <iframe
            ref={медиа as React.RefObject<HTMLIFrameElement>}
            className={s.frame}
            src={e.src}
            title={подпись}
            allow="autoplay; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            onLoad={() => setХод('идёт')}
          />
        ) : null}
        {e.kind === 'video' ? (
          <video ref={медиа as React.RefObject<HTMLVideoElement>} className={s.frame} src={e.src} controls autoPlay
            onLoadedData={() => setХод('идёт')} onError={() => setХод('беда')} />
        ) : null}
        {e.kind === 'image' ? (
          <img ref={медиа as React.RefObject<HTMLImageElement>} className={s.pic} src={e.src} alt={подпись}
            onLoad={() => setХод('идёт')} onError={() => setХод('беда')} />
        ) : null}
        {/* Витрина рисует себя сама и в обёртку не заворачивается: обёртка на
            всю высоту сдвигала её текст под пульт. Слой пометок в этом случае
            ложится по содержимому коробки. */}
        {e.kind === 'link' ? <Vitrina url={e.src} name={подпись} /> : null}

        {/* Пока едет — говорим, что придёт (ПРАВИЛА 6.3); не приехало —
            называем причину и что уцелело (ПРАВИЛА 6.4). Витрина у вида
            «ссылка» говорит за себя сама. */}
        {e.kind !== 'link' && ход !== 'идёт' ? (
          <div className={s.весть}>
            <Note
              title={ход === 'беда' ? 'Источник не открылся' : 'Источник едет'}
              warn={ход === 'беда'}
              text={ход === 'беда'
                ? `«${подпись}» не открылся. Возможно, у него сменился адрес или он не пускает себя в рамку.`
                : `Открываем «${подпись}». Доска и чат работают.`}
              цело={ход === 'беда' ? 'Урок идёт: выберите другой источник или откройте его ссылкой.' : undefined}
            />
          </div>
        ) : null}

        {/* Слой пометок — ПО САМОЙ КАРТИНКЕ. Доли считаются от неё, а не от
            коробки с отступами: только тогда «сюда» у всех означает одно
            место (`рамка.ts`, тот же узел, что у показа). */}
        {spot ? (
          <div className={s.spot} style={spot}>
            <InkLayer marks={marks} tool={lead ? tool : null} onMark={onMark} />
          </div>
        ) : null}
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
        <span className={s.name}>{подпись}</span>
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
