/** ВНЕ ПРОДУКТА: стенд внимания SEduM — прибор для владельца и педагогов
 *  команды. На нём настраивают пороги на живом лице: камера, точки лица, живой
 *  балл с причиной и все сырые числа рядом. В продукт модуль войдёт следующим
 *  шагом — в комнату урока, в виде, утверждённом 05.10 (у учителя число,
 *  причина и тонкая полоска на плитке; у ученика — полоска без цифр). Стенд
 *  останется и после: пороги будут подкручивать и тогда.
 *
 *  Адрес: /стенд?э=внимание (только в разработке).
 */
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../ui/Button'
import { БЕЗ_НОРМЫ, ПОРОГИ, Внимание, type Итог, type Норма, type Пороги, type Состояние } from './внимание'
import { завести, разобрать, type Кадр } from './лицо'
import s from './СтендВнимания.module.css'

type Ход = 'заводим' | 'просим камеру' | 'нет камеры' | 'запрещено' | 'модель не завелась' | 'работает'

type Строка = { когда: string; что: Состояние }

const НАЧАЛО: Итог = { балл: 100, состояние: 'на экране', сейчас: 'на экране', тревога: false }

/** Ручки, которые стоит крутить на живом лице. Остальные пороги — в коде. */
const РУЧКИ: { ключ: keyof Пороги; имя: string; шаг: number }[] = [
  { ключ: 'поворот', имя: 'отвернулся, градусов', шаг: 1 },
  { ключ: 'мимо', имя: 'мимо экрана, градусов', шаг: 1 },
  { ключ: 'вниз', имя: 'вниз, градусов', шаг: 1 },
  { ключ: 'глаза', имя: 'глаза закрыты, доля', шаг: 0.05 },
  { ключ: 'терпение', имя: 'не в счёт, секунд', шаг: 1 },
  { ключ: 'заснул', имя: 'заснул, секунд', шаг: 1 },
  { ключ: 'память', имя: 'память балла, секунд', шаг: 5 },
]

const КАЛИБРОВКА_СЕК = 3

const время = () => new Date().toLocaleTimeString('ru-RU')
const кругло = (ч: number, знаков = 0) => ч.toFixed(знаков).replace('-0', '0')

export function СтендВнимания() {
  const видео = useRef<HTMLVideoElement>(null)
  const холст = useRef<HTMLCanvasElement>(null)
  const внимание = useRef(new Внимание({ ...ПОРОГИ }))
  const кадр = useRef<Кадр | null>(null)
  const кадрКогда = useRef(0)
  const пишемРеф = useRef(false)
  const сборНормы = useRef<Кадр[] | null>(null)
  const работает = useRef(false)

  const [ход, setХод] = useState<Ход>('заводим')
  const [беда, setБеда] = useState('')
  const [двигатель, setДвигатель] = useState('')
  const [итог, setИтог] = useState<Итог>(НАЧАЛО)
  const [числа, setЧисла] = useState<Кадр | null>(null)
  const [кадров, setКадров] = useState(0)
  const [пишем, setПишем] = useState(false)
  const [пороги, setПороги] = useState<Пороги>({ ...ПОРОГИ })
  const [норма, setНорма] = useState<Норма>(БЕЗ_НОРМЫ)
  const [калибровка, setКалибровка] = useState(0)
  const [журнал, setЖурнал] = useState<Строка[]>([])

  /* Модель → камера → цикл распознавания. Всё живёт, пока открыт стенд. */
  useEffect(() => {
    let живо = true
    let поток: MediaStream | null = null
    let кадрЦикла = 0
    let закрыть: (() => void) | null = null

    ;(async () => {
      /* `?модель=<адрес>` — своя копия модели вместо хранилища Google: так
         проверяется будущая раздача с нашего сервера, и так стенд работает
         там, где Google не открывается. */
      const своя = new URLSearchParams(window.location.search).get('модель')
      let завод
      try {
        завод = await завести(своя || undefined)
      } catch (e) {
        if (!живо) return
        setБеда(String(e instanceof Error ? e.message : e))
        setХод('модель не завелась')
        return
      }
      if (!живо) { завод.модель.close(); return }
      закрыть = () => завод.модель.close()
      setДвигатель(`${завод.ускорение === 'GPU' ? 'видеокарта' : 'процессор'} · ядро ${завод.ядро.startsWith('http') ? 'с CDN' : 'своё'}`)

      setХод('просим камеру')
      try {
        поток = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        })
      } catch (e) {
        if (!живо) return
        const имя = e instanceof DOMException ? e.name : ''
        setХод(имя === 'NotFoundError' || имя === 'OverconstrainedError' ? 'нет камеры' : 'запрещено')
        return
      }
      const в = видео.current
      if (!живо || !в) return
      в.srcObject = поток
      await в.play().catch(() => undefined)
      работает.current = true
      setХод('работает')

      /* Десять кадров в секунду хватает с запасом: внимание не меняется за
         сотую долю секунды, а урок рядом тоже хочет процессор. */
      let прошлый = 0
      let счёт = 0
      let отсчёт = performance.now()
      const цикл = () => {
        кадрЦикла = requestAnimationFrame(цикл)
        const сейчас = performance.now()
        if (сейчас - прошлый < 100 || в.readyState < 2) return
        прошлый = сейчас
        const к = разобрать(завод.модель.detectForVideo(в, сейчас))
        кадр.current = к
        кадрКогда.current = Date.now()
        if (сборНормы.current && к.лицо) сборНормы.current.push(к)
        рисовать(холст.current, в, к)
        счёт += 1
        if (сейчас - отсчёт >= 1000) {
          setКадров(счёт)
          счёт = 0
          отсчёт = сейчас
        }
      }
      цикл()
    })()

    return () => {
      живо = false
      cancelAnimationFrame(кадрЦикла)
      поток?.getTracks().forEach((т) => т.stop())
      закрыть?.()
    }
  }, [])

  /* Часы внимания — отдельно от камеры. Когда вкладка свёрнута, кадры не идут
     (браузер усыпляет отрисовку), а часы идут, пусть и реже, — и успевают
     заметить «другое окно». */
  useEffect(() => {
    let прошлое: Состояние = 'на экране'
    const id = window.setInterval(() => {
      /* Пока камера и модель не работают, считать нечего: «нет в кадре» здесь
         было бы неправдой о человеке, а не о приборе. */
      if (!работает.current) return
      const к = кадр.current
      const свежий = к && Date.now() - кадрКогда.current < 1500
      const экран = document.visibilityState === 'visible' && document.hasFocus()
      const и = внимание.current.шаг({
        t: Date.now(),
        экран,
        лицо: Boolean(свежий && к?.лицо),
        рыск: к?.рыск ?? 0,
        тангаж: к?.тангаж ?? 0,
        глаза: к?.глаза ?? 0,
        рот: к?.рот ?? 0,
        взглядВниз: к?.взглядВниз ?? 0,
        взглядВбок: к?.взглядВбок ?? 0,
      }, пишемРеф.current)
      setИтог(и)
      setЧисла(к ?? null)
      if (и.состояние !== прошлое) {
        const что = и.состояние
        setЖурнал((ж) => [{ когда: время(), что }, ...ж].slice(0, 12))
        прошлое = что
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  /* Отсчёт калибровки: три секунды смотрим в середину экрана. */
  useEffect(() => {
    if (калибровка <= 0) return
    const id = window.setTimeout(() => {
      if (калибровка > 1) { setКалибровка(калибровка - 1); return }
      const собрано = сборНормы.current ?? []
      сборНормы.current = null
      setКалибровка(0)
      if (собрано.length < 5) return
      const ср = (f: (к: Кадр) => number) => собрано.reduce((a, к) => a + f(к), 0) / собрано.length
      const н: Норма = { рыск: ср((к) => к.рыск), тангаж: ср((к) => к.тангаж), взглядВниз: ср((к) => к.взглядВниз) }
      внимание.current.норма = н
      setНорма(н)
    }, 1000)
    return () => window.clearTimeout(id)
  }, [калибровка])

  const запомнить = () => {
    сборНормы.current = []
    setКалибровка(КАЛИБРОВКА_СЕК)
  }
  const переключитьПишем = () => {
    пишемРеф.current = !пишемРеф.current
    setПишем(пишемРеф.current)
  }
  const сбросить = () => {
    внимание.current.сброс()
    внимание.current.норма = БЕЗ_НОРМЫ
    внимание.current.пороги = { ...ПОРОГИ }
    setНорма(БЕЗ_НОРМЫ)
    setПороги({ ...ПОРОГИ })
    setЖурнал([])
  }
  const крутить = (ключ: keyof Пороги, значение: string) => {
    const ч = Number(значение.replace(',', '.'))
    if (!Number.isFinite(ч)) return
    const новые = { ...пороги, [ключ]: ч }
    setПороги(новые)
    внимание.current.пороги = новые
  }

  const видно = ход === 'работает'
  const подпись = !видно ? 'не видно' : итог.тревога ? итог.состояние : `${итог.балл} · ${итог.состояние}`
  const ширина = видно ? `${итог.балл}%` : '0%'

  return (
    <main className={s.экран}>
      <header className={s.шапка}>
        <span className={s.бровь}>SEduM · стенд внимания</span>
        <h1 className={s.заголовок}>Внимание на уроке — на вашем лице</h1>
        <p className={s.лид}>
          Всё считается в этом браузере. Кадры с камеры никуда не уходят — ни на наш
          сервер, ни куда-либо ещё.
        </p>
      </header>

      <div className={s.разворот}>
        <section className={s.кадр}>
          <div className={s.окно}>
            <video ref={видео} className={s.видео} playsInline muted />
            <canvas ref={холст} className={s.точки} />
            {ход !== 'работает' ? <Пока ход={ход} беда={беда} /> : null}
            {калибровка > 0 ? (
              <div className={s.отсчёт}>
                <span className={s.отсчётЧисло}>{калибровка}</span>
                <span>Смотрите в середину экрана</span>
              </div>
            ) : null}
          </div>
          <div className={s.ряд}>
            <Button kind="go" onClick={запомнить} disabled={ход !== 'работает' || калибровка > 0}>
              Запомнить, как я смотрю на экран
            </Button>
            <Button kind="quiet" onClick={переключитьПишем} aria-pressed={пишем}>
              {пишем ? 'Режим «пишем» включён' : 'Включить режим «пишем»'}
            </Button>
            <Button kind="ghost" onClick={сбросить}>Сбросить</Button>
          </div>
          <ПроНорму н={норма} />
          <div className={s.блок}>
            <h2 className={s.h2}>Журнал</h2>
            {журнал.length ? (
              <ol className={s.журнал}>
                {журнал.map((с, i) => (
                  <li key={`${с.когда}-${i}`}><span className={s.когда}>{с.когда}</span>{с.что}</li>
                ))}
              </ol>
            ) : (
              <p className={s.тихо}>Здесь появится каждая смена состояния.</p>
            )}
          </div>

          <div className={s.блок}>
            <h2 className={s.h2}>Что попробовать</h2>
            <ol className={s.шаги}>
              <li>«Запомнить, как я смотрю на экран» — и три секунды смотреть в середину экрана.</li>
              <li>Глянуть в сторону на секунду-две — балл не должен дрогнуть.</li>
              <li>Отвернуться на 10–20 секунд — «отвернулся», балл ползёт вниз.</li>
              <li>Закрыть глаза на 3 секунды, потом на 12 — «глаза закрыты», затем «заснул».</li>
              <li>Свернуть окно — «другое окно».</li>
              <li>Опустить голову, как над тетрадью: без режима — «смотрит вниз», в режиме «пишем» — «пишет».</li>
              <li>Наклонить голову вниз — «наклон» должен расти. Если падает — скажите мне.</li>
            </ol>
          </div>
        </section>

        <aside className={s.панель}>
          <div className={s.блок}>
            <h2 className={s.h2}>Так увидит учитель</h2>
            <div className={s.плитка}>
              <span className={s.имя}>Вы</span>
              <span className={`${s.причина} ${итог.тревога ? s.тревога : ''}`}>{подпись}</span>
              <span className={s.полоса} aria-hidden>
                <span className={`${s.заливка} ${итог.тревога ? s.заливкаТревога : ''}`} style={{ width: ширина }} />
              </span>
            </div>
            <h2 className={s.h2}>Так увидит ученик</h2>
            <div className={s.плитка}>
              <span className={s.имя}>Вы · вы</span>
              <span className={s.полоса} aria-hidden>
                <span className={s.заливка} style={{ width: ширина }} />
              </span>
            </div>
          </div>

          <div className={s.блок}>
            <h2 className={s.h2}>Сейчас</h2>
            <dl className={s.числа}>
              <dt>в это мгновение</dt><dd>{видно ? итог.сейчас : '—'}</dd>
              <dt>засчитано</dt><dd>{видно ? итог.состояние : '—'}</dd>
              <dt>поворот головы</dt><dd>{числа?.лицо ? `${кругло(числа.рыск)}°` : '—'}</dd>
              <dt>наклон (плюс — вниз)</dt><dd>{числа?.лицо ? `${кругло(числа.тангаж)}°` : '—'}</dd>
              <dt>глаза закрыты</dt><dd>{числа?.лицо ? кругло(числа.глаза, 2) : '—'}</dd>
              <dt>рот открыт</dt><dd>{числа?.лицо ? кругло(числа.рот, 2) : '—'}</dd>
              <dt>взгляд вниз</dt><dd>{числа?.лицо ? кругло(числа.взглядВниз, 2) : '—'}</dd>
              <dt>взгляд вбок</dt><dd>{числа?.лицо ? кругло(числа.взглядВбок, 2) : '—'}</dd>
              <dt>до лица</dt><dd>{числа?.до ? `${кругло(числа.до)} см` : '—'}</dd>
              <dt>кадров в секунду</dt><dd>{ход === 'работает' ? кадров : '—'}</dd>
              <dt>считает</dt><dd>{двигатель || '—'}</dd>
            </dl>
          </div>

          <div className={s.блок}>
            <h2 className={s.h2}>Пороги</h2>
            <div className={s.ручки}>
              {РУЧКИ.map((р) => (
                <label key={р.ключ} className={s.ручка}>
                  <span className={s.ручкаИмя}>{р.имя}</span>
                  <input
                    className={s.поле}
                    type="number"
                    step={р.шаг}
                    value={пороги[р.ключ]}
                    onChange={(e) => крутить(р.ключ, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </main>
  )
}

function ПроНорму({ н }: { н: Норма }) {
  if (н === БЕЗ_НОРМЫ) {
    return <p className={s.тихо}>Норма не запомнена: взгляд в экран считается от прямого положения головы.</p>
  }
  return (
    <p className={s.тихо}>
      Норма запомнена: поворот {кругло(н.рыск)}°, наклон {кругло(н.тангаж)}°, взгляд вниз {кругло(н.взглядВниз, 2)}.
    </p>
  )
}

function Пока({ ход, беда }: { ход: Ход; беда: string }) {
  const слова: Record<Exclude<Ход, 'работает'>, { что: string; как: string }> = {
    'заводим': { что: 'Заводим модель лица', как: 'В первый раз она скачивается — около 4 МБ. Дальше браузер помнит её сам.' },
    'просим камеру': { что: 'Разрешите камеру', как: 'Браузер спрашивает разрешение в окне сверху. Без камеры смотреть не на что.' },
    'нет камеры': { что: 'Камера не найдена', как: 'Подключите камеру и обновите страницу.' },
    'запрещено': { что: 'Камера запрещена', как: 'Разрешите её в настройках сайта — значок замка в адресной строке — и обновите страницу.' },
    'модель не завелась': { что: 'Модель лица не скачалась', как: `Браузер не достал хранилище Google или CDN. Скажите мне — положим модель на наш сервер. Ответ браузера: ${беда}` },
  }
  const с = слова[ход as Exclude<Ход, 'работает'>]
  const чинится = ход === 'нет камеры' || ход === 'запрещено' || ход === 'модель не завелась'
  return (
    <div className={s.пока} role="status">
      <span className={s.покаЧто}>{с.что}</span>
      <span className={s.покаКак}>{с.как}</span>
      {чинится ? <Button kind="quiet" onClick={() => window.location.reload()}>Обновить страницу</Button> : null}
    </div>
  )
}

/** Сетка и точки лица поверх кадра.
 *
 *  🔴 ВИД — РЕШЕНИЕ ВЛАДЕЛЬЦА 06.10: белые точки с сеткой, прозрачность 50%.
 *  Прозрачность тут не «приглушение двери» (ПРАВИЛА 12.1 про другое), а
 *  способ видеть лицо сквозь сетку: сетка показывает, что модель держит
 *  лицо, и не должна его закрывать. */
const СЕТКА = FaceLandmarker.FACE_LANDMARKS_TESSELATION
const ПРОЗРАЧНОСТЬ = 0.5

function рисовать(х: HTMLCanvasElement | null, в: HTMLVideoElement, к: Кадр) {
  if (!х) return
  const w = в.videoWidth
  const h = в.videoHeight
  if (!w || !h) return
  if (х.width !== w) х.width = w
  if (х.height !== h) х.height = h
  const ц = х.getContext('2d')
  if (!ц) return
  ц.clearRect(0, 0, w, h)
  if (!к.лицо) return
  const т = к.точки
  const цвет = getComputedStyle(х).color
  ц.globalAlpha = ПРОЗРАЧНОСТЬ
  ц.strokeStyle = цвет
  ц.fillStyle = цвет
  ц.lineWidth = 0.6
  ц.beginPath()
  for (const { start, end } of СЕТКА) {
    const а = т[start]
    const б = т[end]
    if (!а || !б) continue
    ц.moveTo(а.x * w, а.y * h)
    ц.lineTo(б.x * w, б.y * h)
  }
  ц.stroke()
  for (const п of т) ц.fillRect(п.x * w - 0.75, п.y * h - 0.75, 1.5, 1.5)
  ц.globalAlpha = 1
}
