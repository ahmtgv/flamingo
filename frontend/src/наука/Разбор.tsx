/** Разбор одной проверки — только для владельца (экран 11 утверждённого холста).
 *
 *  Видео проверки, а под ним лента всей проверки: что просили на каждом шаге,
 *  что в это время решала система, раскрытие век. Щелчок по ленте — видео
 *  встаёт в этот момент; справа — что просили и что решила система именно
 *  тогда, и числа кадра.
 *
 *  🔴 ВСЁ ГРУЗИТСЯ В БРАУЗЕР ВЛАДЕЛЬЦА И НИКУДА ДАЛЬШЕ. Видео — куски, сшитые в
 *  один Blob (куски MediaRecorder — продолжение одного файла); кадры и события
 *  читаются тем же кодом, что их писал (`формат.ts`).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { Button } from '../ui/Button'
import { Wait } from '../ui/Wait'
import { Огонёк, Отказ, Рама } from './экраны'
import { ПРОВЕРКИ, СОНЛИВОСТЬ } from './протокол'
import { дробь } from './итоги'
import { прочитатьКадры, type ЗаписьКадра } from './формат'
import {
  внутри, кадрВ, прочитатьСобытия, разобрать, словами, числаМомента,
  type Разбор, type Событие,
} from './разобрать'
import { кабинет, ОтказНауки, type ПроверкаПодробно } from './сеть'
import { длина, когда } from './Кабинет'
import к from './Кабинет.module.css'
import s from './Наука.module.css'

type Данные = { о: ПроверкаПодробно; события: Событие[]; кадры: ЗаписьКадра[]; видео: string | null }

type Состояние =
  | { где: 'грузим'; слова: string }
  | { где: 'вход'; слова: string }
  | { где: 'отказ'; заголовок: string; слова: string }
  | { где: 'готово'; данные: Данные }

async function развернуть(blob: Blob): Promise<Uint8Array> {
  const байты = new Uint8Array(await blob.arrayBuffer())
  if (байты[0] !== 0x1f || байты[1] !== 0x8b || typeof DecompressionStream === 'undefined') return байты
  const поток = new Blob([байты]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(поток).arrayBuffer())
}

/** По нескольку кусков за раз: всё сразу забивает канал, по одному — долго. */
async function поочерёдно<Т>(задачи: (() => Promise<Т>)[], сразу: number, шаг: (готово: number) => void): Promise<Т[]> {
  const итог: Т[] = new Array(задачи.length)
  let следующая = 0
  let готово = 0
  await Promise.all(Array.from({ length: Math.min(сразу, задачи.length) }, async () => {
    while (следующая < задачи.length) {
      const n = следующая++
      итог[n] = await задачи[n]()
      шаг(++готово)
    }
  }))
  return итог
}

export function РазборПроверки({ id, onНазад, onВойти }: { id: string; onНазад: () => void; onВойти: () => void }) {
  const [с, setС] = useState<Состояние>({ где: 'грузим', слова: 'Открываем проверку' })

  useEffect(() => {
    let живо = true
    let адрес: string | null = null
    ;(async () => {
      try {
        const о = await кабинет.проверка(id)
        const всего = о.куски.events.length + о.куски.frames.length + о.куски.video.length
        let готово = 0
        const отметить = () => { if (живо) setС({ где: 'грузим', слова: `Загружаем запись: ${++готово} из ${всего}` }) }
        const тексты = await поочерёдно(о.куски.events.map((x) => () => кабинет.кусок(id, 'events', x.n).then((b) => b.text())), 4, отметить)
        const сырые = await поочерёдно(о.куски.frames.map((x) => () => кабинет.кусок(id, 'frames', x.n).then(развернуть)), 4, отметить)
        const куски = await поочерёдно(о.куски.video.map((x) => () => кабинет.кусок(id, 'video', x.n)), 3, отметить)
        if (!живо) return
        const кадры = сырые.flatMap((б) => прочитатьКадры(б)).sort((а, б) => а.t - б.t)
        адрес = куски.length ? URL.createObjectURL(new Blob(куски, { type: о.куски.video[0]?.тип ?? 'video/webm' })) : null
        setС({ где: 'готово', данные: { о, события: прочитатьСобытия(тексты), кадры, видео: адрес } })
      } catch (e) {
        if (!живо) return
        const слова = e instanceof Error ? e.message : 'Сервер не отвечает.'
        if (e instanceof ОтказНауки && e.код === 401) setС({ где: 'вход', слова })
        else if (e instanceof ОтказНауки && e.код === 403) setС({ где: 'отказ', заголовок: 'Кабинет открыт только владельцу', слова })
        else if (e instanceof ОтказНауки && e.код === 404) setС({ где: 'отказ', заголовок: 'Такой проверки нет', слова: 'Возможно, её удалили по просьбе человека. Вернитесь в кабинет — там все проверки.' })
        else setС({ где: 'отказ', заголовок: 'Запись не загрузилась', слова })
      }
    })()
    return () => { живо = false; if (адрес) URL.revokeObjectURL(адрес) }
  }, [id])

  switch (с.где) {
    case 'грузим': return <Wait say={с.слова} />
    case 'вход':
      return (
        <Отказ место="разбор" заголовок="Кабинет открывается после входа" лид={с.слова}>
          <span className={s.низСлова}>Войдите под той почтой, которой открыт кабинет.</span>
          <Button kind="go" onClick={onВойти}>Войти</Button>
        </Отказ>
      )
    case 'отказ':
      return (
        <Отказ место="разбор" заголовок={с.заголовок} лид={с.слова}>
          <span className={s.низСлова} />
          <Button kind="quiet" onClick={onНазад}>В кабинет</Button>
        </Отказ>
      )
    case 'готово': return <РазборВид {...с.данные} onНазад={onНазад} />
  }
}

/* ── Вид ──────────────────────────────────────────────────────────────── */

export function РазборВид({ о, события, кадры, видео, onНазад, начало = 0 }: Данные & { onНазад: () => void; /** Для стенда: момент, мс. */ начало?: number }) {
  const р = useMemo<Разбор>(() => разобрать(события, кадры, о.длина), [события, кадры, о.длина])
  const [t, setT] = useState(начало)
  const плеер = useRef<HTMLVideoElement>(null)

  /* Запись браузера (MediaRecorder) не пишет длину в файл: у видео duration = Infinity,
     и ползунок самого плеера не работает. Браузер узнаёт длину, если один раз попросить
     встать в самый конец, — после этого возвращаем видео в начало. */
  const длинаИщется = useRef(false)
  const узнатьДлину = (в: HTMLVideoElement) => {
    if (Number.isFinite(в.duration)) return
    длинаИщется.current = true
    const вернуть = () => {
      if (!Number.isFinite(в.duration)) return
      в.removeEventListener('durationchange', вернуть)
      в.currentTime = 0
      длинаИщется.current = false
    }
    в.addEventListener('durationchange', вернуть)
    в.currentTime = 1e101
  }
  const встать = useCallback((мс: number) => {
    const т = Math.max(0, Math.min(р.длина, мс))
    setT(т)
    if (плеер.current) плеер.current.currentTime = т / 1000
  }, [р.длина])

  const назв = ПРОВЕРКИ.find((п) => п.вид === о.вид)?.название ?? о.вид
  const сон = о.перед.сонливость
  const устройство = о.устройство as { браузер?: string; платформа?: string; телефон?: boolean }
  const плашки = [
    сон ? `сонливость ${сон} из 9` : null,
    о.перед.свет ? о.перед.свет : null,
    о.перед.очки === 'да' ? 'в очках' : о.перед.очки === 'нет' ? 'без очков' : null,
    устройство.платформа ? `${устройство.телефон ? 'телефон' : система(устройство.платформа)} · ${браузер(устройство.браузер)}` : null,
  ].filter(Boolean) as string[]

  return (
    <Рама раздел={`${о.человек.имя || 'без имени'} · ${назв}`} счёт={`${когда(о.начата)} · ${длина(о.длина)}`}
      назад={{ слова: 'Кабинет', onClick: onНазад }} место="разбор"
      право={(
        <span className={к.плашки}>
          {плашки.map((п) => <span key={п} className={к.плашка} title={п === плашки[0] && сон ? СОНЛИВОСТЬ.find((x) => String(x.балл) === сон)?.слова : undefined}>{п}</span>)}
          {о.прервана ? <Огонёк>остановлена</Огонёк> : null}
        </span>
      )}
    >
      <div className={к.разбор}>
        <h1 className={s.дляЧтения}>Разбор проверки: {о.человек.имя || 'без имени'}, {назв}</h1>
        <div className={к.разборВерх}>
          <div className={к.видео}>
            {видео ? (
              <video ref={плеер} className={к.видеоКадр} src={видео} controls playsInline preload="auto"
                onLoadedMetadata={(e) => узнатьДлину(e.currentTarget)}
                onTimeUpdate={(e) => { if (!длинаИщется.current) setT(e.currentTarget.currentTime * 1000) }}
                onSeeked={(e) => { if (!длинаИщется.current) setT(e.currentTarget.currentTime * 1000) }} />
            ) : (
              <p className={к.безВидео}>{о.вид === 'голос' ? 'У «Голоса учителя» видео нет — только фразы со звуком.' : 'Видео у этой проверки нет.'}</p>
            )}
          </div>
          <Момент р={р} кадры={кадры} t={t} />
          <Числа р={р} кадры={кадры} t={t} />
        </div>
        <Лента р={р} t={t} onВстать={встать} />
      </div>
    </Рама>
  )
}

function система(п: string): string {
  if (/^Mac/i.test(п)) return 'Mac'
  if (/^Win/i.test(п)) return 'Windows'
  if (/iPhone|iPad/i.test(п)) return п.replace(/\s.*/, '')
  if (/Linux|X11/i.test(п)) return 'Linux'
  return п
}

function браузер(ua?: string): string {
  if (!ua) return 'браузер'
  if (/Edg\//.test(ua)) return 'Edge'
  if (/YaBrowser/.test(ua)) return 'Яндекс'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'браузер'
}

const мс = (t: number) => длина(t / 1000)

function Момент({ р, кадры, t }: { р: Разбор; кадры: ЗаписьКадра[]; t: number }) {
  const шаг = внутри(р.шаги, t)
  const калибровка = р.калибровка && t >= р.калибровка.с && t < р.калибровка.по
  const кадр = кадрВ(кадры, t)
  const решение = кадр?.засчитано ?? null
  const совпало = шаг && шаг.ждём.length && решение ? шаг.ждём.includes(решение) : null
  return (
    <section className={`${s.листок} ${к.момент}`} aria-live="polite">
      <div className={к.моментБлок}>
        <h2 className={к.надпись}>На {мс(t)} просили</h2>
        {шаг ? (
          <>
            <p className={к.моментГлавное}>{шаг.текст}</p>
            <p className={s.тихо}>
              шаг {шаг.i + 1} из {р.всегоШагов}
              {шаг.ждём.length ? ` · ждали ${шаг.ждём.map((ж) => `«${словами(ж)}»`).join(' или ')}` : ' · этот шаг не оценивается'}
            </p>
          </>
        ) : (
          <p className={к.моментГлавное}>{калибровка ? 'Калибровка: смотреть на точку' : 'Между шагами'}</p>
        )}
      </div>
      <div className={`${к.моментБлок} ${к.черта}`}>
        <h2 className={к.надпись}>Система решила</h2>
        <p className={к.моментГлавное}>{решение ? словами(решение) : 'кадров нет'}</p>
        {кадр && кадр.сейчас !== кадр.засчитано ? <p className={s.тихо}>В этот миг видела «{словами(кадр.сейчас)}» — засчитывает не сразу, а когда это длится.</p> : null}
        {совпало === true ? <p className={к.совпало}>Совпало.</p> : null}
        {совпало === false ? <p className={к.несовпало}>Не совпало.</p> : null}
      </div>
    </section>
  )
}

function Числа({ р, кадры, t }: { р: Разбор; кадры: ЗаписьКадра[]; t: number }) {
  const ч = числаМомента(кадрВ(кадры, t))
  const знак = (x: number | null, ед = '°') => (x === null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(Math.round(x))}${ед}`)
  const строки: [string, string][] = [
    ['раскрытие век', ч.веко === null ? '—' : `${дробь(ч.веко, 2)}${р.нормаВека !== null ? ` · норма ${дробь(р.нормаВека, 2)}` : ''}`],
    ['поворот головы', знак(ч.рыск)],
    ['наклон головы', знак(ч.тангаж)],
    ['взгляд вниз', ч.вниз === null ? '—' : дробь(ч.вниз, 2)],
    ['глаза закрыты, минута', ч.закрыты === null ? '—' : `${Math.round(ч.закрыты * 100)} %`],
    ['качество кадра', ч.лицо ? (ч.качество ?? '—') : 'лица нет'],
  ]
  return (
    <section className={`${s.листок} ${к.карточка}`} aria-labelledby="разбор-числа">
      <h2 className={к.надпись} id="разбор-числа">Числа в этот момент</h2>
      <dl className={к.всего}>
        {строки.map(([что, сколько]) => (
          <div key={что} className={к.всегоСтрока}>
            <dt>{что}</dt>
            <dd className={к.числоМалое}>{сколько}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ── Лента всей проверки ──────────────────────────────────────────────── */

const Ш = 1000
const ДОРОЖКА = 30
/* Дорожки сверху вниз: просили (14..38), система решила (60..84), веки (104..140). */
const ВЕКИ_Y = 2 * ДОРОЖКА + 44
const ВЕКИ_В = 36
const ВЫСОТА = ВЕКИ_Y + ВЕКИ_В + 6

function Лента({ р, t, onВстать }: { р: Разбор; t: number; onВстать: (мс: number) => void }) {
  const x = (мс: number) => (р.длина ? (мс / р.длина) * Ш : 0)
  const холст = useRef<SVGSVGElement>(null)
  const щёлк = (e: PointerEvent<SVGSVGElement>) => {
    const рамка = холст.current?.getBoundingClientRect()
    if (!рамка) return
    onВстать(((e.clientX - рамка.left) / рамка.width) * р.длина)
  }
  const клавиша = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); onВстать(t + 5000) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); onВстать(t - 5000) }
  }
  const несовпало = р.совпадения.filter((с) => !с.да)
  /* Веки: 0..0,4 на высоту дорожки; разрыв там, где лица нет. */
  const линии: string[] = []
  let линия = ''
  for (const [мсТ, в] of р.веки) {
    if (в === null) { if (линия) линии.push(линия); линия = ''; continue }
    const y = ВЕКИ_Y + (1 - Math.min(1, в / 0.4)) * ВЕКИ_В
    линия += `${линия ? ' L' : 'M'}${x(мсТ).toFixed(1)} ${y.toFixed(1)}`
  }
  if (линия) линии.push(линия)
  const подпись = (с: number, по: number, слова: string) => (x(по) - x(с) > слова.length * 6.2 + 12 ? слова : '')

  return (
    <section className={`${s.листок} ${к.лента}`} aria-labelledby="разбор-лента">
      <div className={к.лентаШапка}>
        <h2 className={к.надпись} id="разбор-лента">Вся проверка</h2>
        <p className={к.лентаИтог}>
          {р.совпадения.length
            ? `совпало на ${р.совпадения.length - несовпало.length} из ${р.совпадения.length} оцениваемых шагов${несовпало.length ? ` · не совпало: ${несовпало.slice(0, 3).map((с) => `«${с.метка}»`).join(', ')}${несовпало.length > 3 ? ' и ещё' : ''}` : ''}`
            : 'шагов, которые оцениваются, в этой проверке нет'}
        </p>
      </div>
      <svg ref={холст} className={к.лентаХолст} viewBox={`0 0 ${Ш} ${ВЫСОТА}`} role="slider" tabIndex={0}
        aria-label="Момент проверки" aria-valuemin={0} aria-valuemax={Math.round(р.длина / 1000)} aria-valuenow={Math.round(t / 1000)} aria-valuetext={мс(t)}
        onPointerDown={щёлк} onKeyDown={клавиша}>
        <text x={0} y={10} className={к.лентаПодпись}>просили</text>
        {р.калибровка ? (
          <g>
            <rect x={x(р.калибровка.с)} y={14} width={Math.max(2, x(р.калибровка.по) - x(р.калибровка.с) - 2)} height={ДОРОЖКА - 6} rx={4} className={к.шагТихо} />
            <text x={x(р.калибровка.с) + 6} y={14 + (ДОРОЖКА - 6) / 2 + 4} className={к.шагСлова}>{подпись(р.калибровка.с, р.калибровка.по, 'калибровка')}</text>
          </g>
        ) : null}
        {р.шаги.map((ш) => (
          <g key={`${ш.i}-${ш.с}`}>
            <title>{`${мс(ш.с)} · ${ш.текст}`}</title>
            <rect x={x(ш.с)} y={14} width={Math.max(2, x(ш.по) - x(ш.с) - 2)} height={ДОРОЖКА - 6} rx={4}
              className={t >= ш.с && t < ш.по ? к.шагСейчас : ш.ждём.length ? к.шаг : к.шагТихо} />
            <text x={x(ш.с) + 6} y={14 + (ДОРОЖКА - 6) / 2 + 4} className={к.шагСлова}>{подпись(ш.с, ш.по, ш.метка)}</text>
          </g>
        ))}
        <text x={0} y={ДОРОЖКА + 26} className={к.лентаПодпись}>система решила</text>
        {р.решения.filter((р1) => р1.по - р1.с >= 250 || р1.что !== 'на экране').map((р1) => (
          <g key={`${р1.что}-${р1.с}`}>
            <title>{`${мс(р1.с)}–${мс(р1.по)} · ${словами(р1.что)}`}</title>
            <rect x={x(р1.с)} y={ДОРОЖКА + 30} width={Math.max(2, x(р1.по) - x(р1.с))} height={ДОРОЖКА - 6} rx={4} className={к[`реш_${класс(р1.что)}`] ?? к.реш_прочее} />
            <text x={x(р1.с) + 6} y={ДОРОЖКА + 30 + (ДОРОЖКА - 6) / 2 + 4} className={класс(р1.что) === 'тёмное' ? к.решСловаНаТёмном : к.шагСлова}>{подпись(р1.с, р1.по, словами(р1.что))}</text>
          </g>
        ))}
        <text x={0} y={ВЕКИ_Y - 6} className={к.лентаПодпись}>раскрытие век</text>
        {линии.map((d) => <path key={d.slice(0, 24)} d={d} className={к.веки} />)}
        <line x1={x(t)} x2={x(t)} y1={12} y2={ВЫСОТА} className={к.курсор} />
        <circle cx={x(t)} cy={12} r={4} className={к.курсорТочка} />
      </svg>
      <p className={s.тихо}>Щёлкните по ленте — видео встанет в этот момент. Стрелки ← и → — на 5 секунд.</p>
    </section>
  )
}

/** Какой заливкой рисовать решение: спокойное — светлое, «глаза/сон» — тёмное, «нет в кадре» — пунктир. */
function класс(что: string): string {
  if (что === 'на экране' || что === 'пишет') return 'светлое'
  if (что === 'глаза закрыты' || что === 'заснул') return 'тёмное'
  if (что === 'нет в кадре' || что === 'ушёл' || что === 'другое окно') return 'пунктир'
  return 'среднее'
}
