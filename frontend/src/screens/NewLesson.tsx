import { useEffect, useMemo, useRef, useState } from 'react'

import type { Person } from '../lib/auth'
import { Field } from '../ui/Field'
import { Mark } from '../ui/Mark'
import {
  Беда, завестиУрок, поправитьУрок, положитьСсылку, положитьФайл, снятьПособие,
  убратьУрок, читатьУроки, type Пособие, type Урок,
} from '../lib/study'
import {
  датаВМашинную, датаИзМашинной, когдаПоУмолчанию, маскаВремени, маскаДаты, времяЦелое,
} from '../lib/datetime'
import s from './NewLesson.module.css'
import { Button } from '../ui/Button'
import { имяПояса, мойПояс } from '../lib/пояс'

/** Урок: завести новый или поправить заведённый.
 *
 *  🔴 ОДИН ЭКРАН, ДВА СОСТОЯНИЯ. Урок, который можно завести, но нельзя
 *  поправить, — ловушка: опечатался во времени и заводишь второй, а первый
 *  уже разослан ссылкой. Поэтому правка — не отдельная страница, а тот же
 *  лист с заполненными полями (решение владельца 01.09).
 *
 *  🔴 ЯЗЫК НЕ ВЫДУМАН: тот же лист, по которому сделаны вход и регистрация
 *  (`docs/дизайн/от-дизайна-31.08/Вход и регистрация.dc.html`) — две колонки,
 *  слева обещание, справа одно действие в белой карточке.
 *
 *  🔴 МАТЕРИАЛЫ ПОЯВЛЯЮТСЯ ПОСЛЕ СОЗДАНИЯ, и это не лень. Файл кладут К уроку,
 *  а урока до нажатия «Создать» ещё нет — некуда. Поэтому созданный урок
 *  остаётся открытым: «создано, теперь можно приложить материалы». Так же
 *  честнее: человек видит, что урок уже сохранён, и может уйти в любой момент.
 */

const РАЗМЕР = (b: number) =>
  b >= 1024 * 1024 ? `${Math.round(b / (1024 * 1024))} МБ`
    : b >= 1024 ? `${Math.round(b / 1024)} КБ` : `${b} Б`

/* Время и дата набраны целиком — только тогда о них есть что сказать. */
const ПОЛНОЕ_ВРЕМЯ = /^\d{2}:\d{2}$/
const ПОЛНАЯ_ДАТА = /^\d{2}\.\d{2}\.\d{4}$/

export function NewLesson({ person, урокId, onDone, onCreated, onBack, onOut, onHome }: {
  person: Person
  /** Правим существующий урок — или заводим новый, если пусто. */
  урокId?: string
  onDone: () => void
  /** Урок только что заведён: адрес страницы пора подменить на его. */
  onCreated?: (id: string) => void
  onBack: () => void
  onOut: () => void
  onHome: () => void
}) {
  const [урок, setУрок] = useState<Урок | null>(null)
  const [название, setНазвание] = useState('')
  const начало = useMemo(когдаПоУмолчанию, [])
  const [дата, setДата] = useState(начало.дата)
  const [время, setВремя] = useState(начало.время)
  const [минут, setМинут] = useState('45')
  const [сказать, setСказать] = useState<[string, string] | null>(null)
  /* Пояс этого браузера. Меняться на живом экране ему неоткуда, поэтому берём
     один раз: человек не переезжает, пока заполняет форму. */
  const [пояс] = useState(мойПояс)
  const [хорошо, setХорошо] = useState('')
  const [ждём, setЖдём] = useState(false)
  const [ссылку, setСсылку] = useState<string | null>(null)
  const файлВход = useRef<HTMLInputElement>(null)

  /* Правка: забираем урок из того же места, откуда его берёт кабинет. */
  useEffect(() => {
    if (!урокId) return
    let живо = true
    читатьУроки()
      .then((все) => {
        const у = все.find((x) => x.id === урокId)
        if (!живо || !у) return
        setУрок(у)
        setНазвание(у.название)
        setДата(датаИзМашинной(у.дата))
        setВремя(у.время)
        setМинут(String(у.минут))
      })
      .catch(() => undefined)
    return () => { живо = false }
  }, [урокId])

  const разобрать = () => {
    const имя = название.trim().replace(/\s+/g, ' ').slice(0, 120)
    if (!имя) {
      setСказать(['Сначала название', 'По нему урок видно в расписании, а класс поймёт, куда пришёл.'])
      return null
    }
    const машинная = датаВМашинную(дата)
    if (!машинная) {
      setСказать(['Дата — днём, месяцем и годом', 'Например, 03.09.2026.'])
      return null
    }
    if (!времяЦелое(время)) {
      setСказать(['Время — часами и минутами', 'Например, 14:00.'])
      return null
    }
    const м = Number(минут)
    if (!Number.isFinite(м) || м < 5 || м > 480) {
      setСказать(['Длительность — от 5 до 480 минут', 'Обычный урок — 45.'])
      return null
    }
    return { название: имя, дата: машинная, время, минут: Math.round(м) }
  }

  const сохранить = async () => {
    const что = разобрать()
    if (!что) return
    setЖдём(true)
    setСказать(null)
    try {
      const новый = !урок
      const у = урок ? await поправитьУрок(урок.id, что) : await завестиУрок(что)
      setУрок(у)
      setХорошо(новый ? 'Урок создан. Можно приложить материалы.' : 'Изменения сохранены.')
      /* 🔴 АДРЕС ПОДМЕНЯЕТСЯ ТОЛЬКО ПОСЛЕ УДАЧИ И ТОЛЬКО ОДИН РАЗ. До этой
         строки экран оставался на «/создать-урок», хотя урок уже существовал:
         обновление страницы теряло панель материалов. Подмена, а не переход —
         иначе «Назад» упиралось бы в пустую форму создания того, что уже создано. */
      if (новый) onCreated?.(у.id)
    } catch (e) {
      setСказать(['Не сохранилось', e instanceof Беда ? e.message : 'Сервер занятий не ответил.'])
    } finally {
      setЖдём(false)
    }
  }

  const положить = async (файлы: FileList | null) => {
    if (!урок || !файлы?.length) return
    setСказать(null)
    for (const ф of Array.from(файлы)) {
      try {
        const п = await положитьФайл(урок.id, ф)
        setУрок((у) => (у ? { ...у, материалы: [...у.материалы, п] } : у))
      } catch (e) {
        setСказать(['Файл не принят', e instanceof Беда ? e.message : 'Сервер не ответил.'])
        break
      }
    }
    if (файлВход.current) файлВход.current.value = ''
  }

  const положитьАдрес = async () => {
    const url = (ссылку ?? '').trim()
    if (!урок || !url) return
    try {
      const п = await положитьСсылку(урок.id, url, url)
      setУрок((у) => (у ? { ...у, материалы: [...у.материалы, п] } : у))
      setСсылку(null)
      setСказать(null)
    } catch (e) {
      setСказать(['Ссылка не принята', e instanceof Беда ? e.message : 'Сервер не ответил.'])
    }
  }

  const снять = async (п: Пособие) => {
    if (!урок) return
    try {
      await снятьПособие(п.id)
      setУрок((у) => (у ? { ...у, материалы: у.материалы.filter((m) => m.id !== п.id) } : у))
    } catch (e) {
      setСказать(['Не снялось', e instanceof Беда ? e.message : 'Сервер не ответил.'])
    }
  }

  /* 🔴 УРОК УБИРАЕТСЯ В ДВА ШАГА И СО СЛОВАМИ. Кнопка сносила занятие одним
     щелчком: без подтверждения, без слова о классе, у которого уже есть
     ссылка, и без возможности вернуть. ПРАВИЛА 10.6 требуют трёх вещей —
     не было ни одной. Аудит 07.09, находка критика. Взвод сам гаснет через
     пять секунд: спросили и забыли — значит не хотели. */
  const [сноситьВзвод, setСноситьВзвод] = useState(false)
  useEffect(() => {
    if (!сноситьВзвод) return
    const метка = setTimeout(() => setСноситьВзвод(false), 5000)
    return () => clearTimeout(метка)
  }, [сноситьВзвод])

  const убрать = async () => {
    if (!урок) return
    if (!сноситьВзвод) { setСноситьВзвод(true); return }
    setСноситьВзвод(false)
    try {
      await убратьУрок(урок.id)
      onDone()
    } catch (e) {
      setСказать(['Урок не убрался', e instanceof Беда ? e.message : 'Сервер не ответил.'])
    }
  }

  const правка = Boolean(урок)

  return (
    <main className={s.screen}>
      <header className={s.head}>
        <Mark onGo={onHome} title="Главная — кабинет" />
        <span className={s.crumb}
              title={`Кабинет преподавателя · ${правка ? 'Урок' : 'Создать урок'}`}>
          Кабинет преподавателя · {правка ? 'Урок' : 'Создать урок'}
        </span>
        <span className={s.who}>
          {person.name} ·{' '}
          <button type="button" className={s.out} onClick={onOut}>Выйти</button>
        </span>
      </header>

      <div className={s.body}>
        {/* Левая колонка — где я, куда вернуться и что сейчас произойдёт. */}
        <section className={s.promise}>
          <button type="button" className={s.back} onClick={onBack}>← В кабинет</button>

          <h1 className={s.title}>{правка ? 'Урок' : 'Создать урок'}</h1>

          <p className={s.lead}>
            {правка
              ? 'Меняйте что нужно — ссылка на комнату останется прежней, и тем, кому вы её отдали, ничего пересылать не придётся.'
              : 'Урок встанет в расписание, и у него сразу будет своя комната: войти в неё можно из кабинета в любой момент — и до начала, и после.'}
          </p>

          <span className={s.rule} />

          <p className={s.foot}>
            {правка && урок
              ? <>Ссылка на комнату: <b>flamingo.plus/r/{урок.код}</b>. Она рождается вместе
                с уроком и не меняется от правок — можно отдать классу заранее.</>
              : <>Материалы урока — учебник, презентацию, картинки — можно приложить сразу
                после создания: они лягут на полку «Материалы урока», когда класс войдёт.</>}
          </p>
        </section>

        {/* Правая колонка — одно действие. */}
        <section className={s.card}>
          <form
            className={s.form}
            noValidate
            onSubmit={(e) => { e.preventDefault(); сохранить() }}
          >
            <Field
              label="Название"
              placeholder="Например, Алгебра — квадратные уравнения"
              value={название}
              maxLength={120}
              autoFocus={!правка}
              onChange={(e) => { setНазвание(e.target.value); setСказать(null); setХорошо('') }}
            />

            <div className={s.when}>
              <Field
                label="Дата" inputMode="numeric" placeholder="дд.мм.гггг" value={дата}
                onChange={(e) => { setДата(маскаДаты(e.target.value)); setСказать(null); setХорошо('') }}
              />
              <Field
                label="Время" inputMode="numeric" placeholder="чч:мм" value={время}
                onChange={(e) => { setВремя(маскаВремени(e.target.value)); setСказать(null); setХорошо('') }}
              />
              <Field
                label="Длительность, мин" inputMode="numeric" placeholder="45" value={минут}
                onChange={(e) => {
                  setМинут(e.target.value.replace(/\D/g, '').slice(0, 3)); setСказать(null); setХорошо('')
                }}
              />
            </div>

            {/* 🔴 РЕЛЬС ПРИ ВВОДЕ, А НЕ ПИСЬМО ПОСЛЕ (ПРАВИЛА 10.3: «время
                занятия задаётся в поясе преподавателя, и тут же видно, во
                сколько это у учеников. Пересчёт — в рельсе при вводе, а не в
                письме после»). Слова взяты с листа «Создание курса и занятия».

                Аудит 07.09, находка 18: на этом экране не было ни пересчёта,
                ни единого слова о поясе, и один и тот же урок печатался как
                «17:00» в Москве, во Владивостоке и в Калининграде.

                Строка стоит, только когда время уже набрано целиком: подсказка
                о несуществующем времени — это шум, а не помощь. */}
            {пояс && ПОЛНОЕ_ВРЕМЯ.test(время) && ПОЛНАЯ_ДАТА.test(дата) ? (
              <p className={s.пояс}>
                Время в вашем поясе: {имяПояса(пояс)}
              </p>
            ) : null}

            {/* 🔴 Материалы — только у существующего урока: файл кладут К уроку,
                а до нажатия «Создать» его ещё нет. */}
            {урок ? (
              <div className={s.mats}>
                <span className={s.matsLabel}>Материалы урока</span>

                {урок.материалы.length ? (
                  <div className={s.matList}>
                    {урок.материалы.map((п) => (
                      <span key={п.id} className={s.mat}>
                        <span className={s.matName} title={п.имя}>{п.имя}</span>
                        <span className={s.matWhat}>
                          {п.вид === 'link' ? 'ссылка' : РАЗМЕР(п.размер)}
                        </span>
                        <button type="button" className={s.matOff} onClick={() => снять(п)}>
                          снять
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className={s.matAdd}>
                  <button
                    type="button" className={s.chip}
                    onClick={() => файлВход.current?.click()}
                  >
                    + Документ или картинка
                  </button>
                  <button
                    type="button" className={s.chip}
                    onClick={() => setСсылку((v) => (v === null ? '' : null))}
                  >
                    + Ссылка
                  </button>
                  <input
                    ref={файлВход} type="file" multiple className={s.hidden}
                    onChange={(e) => положить(e.target.files)}
                  />
                </div>

                {ссылку !== null ? (
                  <div className={s.linkRow}>
                    <input
                      className={s.linkField}
                      placeholder="https://rutube.ru/video/…"
                      value={ссылку}
                      autoFocus
                      onChange={(e) => setСсылку(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); положитьАдрес() } }}
                    />
                    <button type="button" className={s.chip} onClick={положитьАдрес}>Положить</button>
                  </div>
                ) : null}

                <span className={s.matsHint}>
                  Видео и всё крупное — ссылкой: у себя мы их не храним, и класс
                  не будет ждать загрузку вместо урока.
                </span>
              </div>
            ) : null}

            <Button kind="go" type="submit" disabled={ждём}>
              {ждём ? 'Сохраняем…' : правка ? 'Сохранить' : 'Создать урок'}
            </Button>

            {/* 🔴 СООБЩЕНИЕ ПОД КНОПКОЙ, А НЕ НАД НЕЙ, И БЕЗ ЗАПАСА МЕСТА.
                ПРАВИЛА 6.6 требуют, чтобы кнопка не прыгала. Раньше это делалось
                запасом в три строки НАД кнопкой — и не работало ни в одну сторону.
                Померено 08.09: запас 67 px, а самое длинное настоящее сообщение
                занимает 71 px на ноутбуке и 94 px на телефоне (карточка там 236 px
                шириной). То есть кнопка всё равно уезжала — на 4 px и на 27 px, —
                а в обычном случае, когда говорить нечего, 67 px стояли пустыми.
                Запас в пикселях не может быть верным сразу на всех ширинах.
                Под кнопкой запас не нужен вовсе: что бы ни выросло ниже, кнопка
                стоит. Сообщение при этом появляется ровно там, где рука.
                `role="status"` остаётся: читалка объявляет его независимо от того,
                где оно в разметке. */}
            <div className={s.say} role="status">
              {сказать ? (
                <>
                  <span className={s.sayHead}>{сказать[0]}</span>
                  <span className={s.sayBody}>{сказать[1]}</span>
                </>
              ) : хорошо ? (
                <span className={s.sayOk}>{хорошо}</span>
              ) : null}
            </div>

            {правка ? (
              <>
              <div className={s.after}>
                <Button kind="quiet" onClick={onDone}>Готово</Button>
                <button
                  type="button"
                  className={`${s.drop} ${сноситьВзвод ? s.dropArmed : ''}`}
                  onClick={убрать}
                  title="Убрать урок · комната закроется, и ссылка перестанет работать у всех, кому вы её отправили. Вернуть нельзя."
                >
                  {сноситьВзвод ? 'убрать урок?' : 'Убрать урок'}
                </button>
              </div>
              {сноситьВзвод ? (
                <p className={s.dropWhy} role="status">
                  Комната закроется, и ссылка перестанет работать у всех, кому вы её
                  отправили. Вернуть урок нельзя — только завести заново.
                </p>
              ) : null}
              </>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  )
}
