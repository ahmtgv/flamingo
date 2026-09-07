import { useEffect, useState } from 'react'

import { Board } from '../board/Board'
import { Chat, type Line } from '../room/Chat'
import { завестиУрок, читатьУроки, type Реплика } from '../lib/study'
import type { Person } from '../lib/auth'
import type { Bus, Msg } from '../board/protocol'
import { BadLink } from './BadLink'
import { Cabinet } from './Cabinet'
import { Enter } from './Enter'
import { Hub } from './Hub'
import { Invite } from './Invite'
import { Journal } from './Journal'
import { NewLesson } from './NewLesson'
import { NewPass } from './NewPass'
import { Room } from './Room'
import { Sign } from './Sign'
import { Титул } from './Титул'
import { Переписка } from './Переписка'

/** Стенд экранов: любой экран продукта с подложенными данными, без сервера.
 *
 *  🔴 ТОЛЬКО В РАЗРАБОТКЕ. В `App.tsx` он стоит под `import.meta.env.DEV` и в
 *  боевую сборку не попадает: сборщик вырезает ветку целиком.
 *
 *  🔴 ЗАЧЕМ ОН НУЖЕН ИМЕННО ТАКИМ — ПОЛНЫМ. Аудит 07.09 пропустил комнату урока
 *  целиком: все четырнадцать осей написали «на стенде её нет» и судили по коду.
 *  Двенадцать модулей и около 2650 строк — сердце продукта — остались
 *  непроверенными, потому что их некуда было открыть. Экран, которого нет на
 *  стенде, невидим для проверки; поэтому здесь заведён КАЖДЫЙ маршрут `App.tsx`,
 *  и за этим следит караул `scripts/стенд-check.mjs`.
 *
 *  🔴 `?чисто=1` убирает полосу выбора. Прибор меряет кадр, и собственная
 *  оснастка стенда в этот кадр попадать не должна — иначе меряется стенд, а не
 *  продукт. На этом уже обожглись: замеры прокрутки, снятые оснасткой, были
 *  выдуманы прибором и попали в отчёт (находка 1 того же аудита).
 *
 *  Адрес: `/стенд?э=кабинет&чисто=1`. Тема и детский режим — как в продукте,
 *  через `data-theme` и `data-mode` на `<html>`.
 */

const УЧИТЕЛЬ: Person = { id: 'у1', name: 'Люция Валерьевна', role: 'teacher' }
const УЧЕНИК: Person = { id: 'у2', name: 'Аня Ковалёва', role: 'student' }
const ни = () => undefined

const РЕПЛИКИ: Line[] = [
  { id: '1', who: 'Люция Валерьевна', text: 'Открыла доску, начинаем со второго упражнения.', at: Date.now() - 900000, mine: false },
  { id: '2', who: 'Аня', text: 'а можно ссылку на словарь? tass.ru', at: Date.now() - 600000, mine: false },
  { id: '3', who: 'вы', text: 'да', at: Date.now() - 300000, mine: true },
  { id: '4', who: 'Марк', text: 'я не слышу звук, перезайду', at: Date.now() - 60000, mine: false },
]

/* Разговор двоих: сторону панель выбирает ролью, а не полем `мой`. */
const РАЗГОВОР = (яУчитель: boolean): Реплика[] => {
  const час = (н: number) => new Date(Date.now() - н * 60000).toISOString()
  const от = (учитель: boolean) => (яУчитель ? учитель : !учитель)
  return [
    { id: 'a', вид: 'text', текст: 'Аня, к четвергу повторите вторую главу.', когда: час(120), мой: от(true), прочитано: true },
    { id: 'b', вид: 'text', текст: 'хорошо! а задание которое вы показывали на доске тоже?', когда: час(90), мой: от(false), прочитано: true },
    { id: 'c', вид: 'text', текст: 'Да, оба. Разберём в начале занятия.', когда: час(60), мой: от(true), прочитано: true },
    { id: 'd', вид: 'text', текст: 'ок, спасибо', когда: час(5), мой: от(false), прочитано: false },
  ] as Реплика[]
}

/* Пустой провод доски: посылки уходят в никуда, входящих нет. Доске этого
   довольно, чтобы нарисоваться целиком. */
const слушатели = new Set<(m: Msg) => void>()
const ШИНА: Bus = {
  send: ни,
  subscribe: (fn) => { слушатели.add(fn); return () => { слушатели.delete(fn) } },
}

/** Занятия в браузерном хранилище: с ними календарь и списки не пустые.
 *  🔴 `сколько` — не украшение. Находка 1 аудита: с десятого занятия за день
 *  расписание срезается кромкой, и увидеть это можно только на полном дне. */
function useПодложенныеУроки(нужны: boolean, сколько = 3) {
  const [готово, setГотово] = useState(false)
  useEffect(() => {
    if (!нужны || готово) return
    const н = new Date()
    const мес = `${н.getFullYear()}-${String(н.getMonth() + 1).padStart(2, '0')}`
    const сегодня = `${мес}-${String(н.getDate()).padStart(2, '0')}`
    читатьУроки(мес).then(async (есть) => {
      if (есть.length < сколько) {
        const имена = ['Английский · разговор', 'Английский · грамматика', 'Разбор ошибок',
          'Чтение вслух', 'Аудирование', 'Времена: настоящее', 'Времена: прошедшее',
          'Словарь недели', 'Диалоги', 'Проверочная', 'Разбор проверочной', 'Свободная беседа']
        for (let i = есть.length; i < сколько; i += 1) {
          await завестиУрок({
            название: имена[i % имена.length],
            дата: сегодня,
            время: `${String(9 + i).padStart(2, '0')}:00`,
            минут: 45,
          })
        }
      }
      setГотово(true)
    })
  }, [нужны, готово, сколько])
  return готово
}

function СЖурналом({ дети, сколько }: { дети: React.ReactNode; сколько?: number }) {
  const готово = useПодложенныеУроки(true, сколько)
  return готово ? <>{дети}</> : null
}

/** Реестр экранов. 🔴 Здесь обязан быть КАЖДЫЙ маршрут `App.tsx` — за этим
 *  следит `scripts/стенд-check.mjs`. Ключ реестра — то, что стоит в `?э=`. */
export const ЭКРАНЫ: { имя: string; путь: string; рисуй: () => React.ReactElement }[] = [
  { имя: 'титул', путь: '/', рисуй: () => <Титул onSign={ни} onHub={ни} /> },
  { имя: 'титул-молчит', путь: '/', рисуй: () => <Титул onSign={ни} onHub={ни} молчит onAgain={ни} /> },
  { имя: 'вход', путь: '/вход', рисуй: () => <Sign onDone={ни} onBack={ни} /> },
  { имя: 'новый-пароль', путь: '/новый-пароль', рисуй: () => <NewPass ключ="проба" onDone={ни} onBack={ни} /> },
  { имя: 'кабинет', путь: '/кабинет', рисуй: () => (
    <СЖурналом дети={<Cabinet person={УЧИТЕЛЬ} onLesson={ни} onNew={ни} onEdit={ни} onJournal={ни} onOut={ни} onHome={ни} />} />
  ) },
  { имя: 'кабинет-полный-день', путь: '/кабинет', рисуй: () => (
    <СЖурналом сколько={12} дети={<Cabinet person={УЧИТЕЛЬ} onLesson={ни} onNew={ни} onEdit={ни} onJournal={ни} onOut={ни} onHome={ни} />} />
  ) },
  { имя: 'кабинет-ученик', путь: '/кабинет', рисуй: () => (
    <СЖурналом дети={<Cabinet person={УЧЕНИК} onLesson={ни} onNew={ни} onEdit={ни} onJournal={ни} onOut={ни} onHome={ни} />} />
  ) },
  { имя: 'журнал', путь: '/журнал', рисуй: () => (
    <СЖурналом дети={<Journal person={УЧИТЕЛЬ} onBack={ни} onHome={ни} onOut={ни} onNew={ни} onLesson={ни} />} />
  ) },
  { имя: 'создать-урок', путь: '/создать-урок', рисуй: () => (
    <NewLesson person={УЧИТЕЛЬ} onDone={ни} onBack={ни} onOut={ни} onHome={ни} />
  ) },
  { имя: 'правка-урока', путь: '/урок/', рисуй: () => (
    <СЖурломПравка />
  ) },
  { имя: 'хаб', путь: '/hub', рисуй: () => <Hub onBack={ни} onHome={ни} /> },
  { имя: 'приглашение', путь: '/зовут/', рисуй: () => (
    <Invite ключ="проба" person={null} onSign={ни} onDone={ни} onHome={ни} />
  ) },
  { имя: 'вход-в-комнату', путь: '/r/', рисуй: () => (
    <Enter invited="g6rh-ntaf-rzpp" initialName="" onGo={ни} onHub={ни} onSign={ни} onCabinet={ни} onOut={ни} person={null} />
  ) },
  { имя: 'вход-в-комнату-свой', путь: '/r/', рисуй: () => (
    <Enter invited="g6rh-ntaf-rzpp" initialName="Люция Валерьевна" onGo={ни} onHub={ни} onSign={ни} onCabinet={ни} onOut={ни} person={УЧИТЕЛЬ} />
  ) },
  /* 🔴 Комната поднимается с несуществующим билетом и честно говорит «эфир не
     поднялся» — это её законное состояние (ПРАВИЛА 6.5), и в нём меряется всё
     остальное: полка, пульты, чат, доска. Именно этого не хватило аудиту 07.09. */
  { имя: 'комната', путь: '/r/', рисуй: () => (
    <Room code="g6rh-ntaf-rzpp" name="Люция Валерьевна" onLeave={ни} onHome={ни} />
  ) },
  { имя: 'битая-ссылка', путь: '*', рисуй: () => (
    <BadLink адрес="flamingo.plus/r/xxxx" onWay={ни} вошёл={false} />
  ) },
  { имя: 'доска', путь: '/r/', рисуй: () => (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', gridTemplateRows: 'minmax(0,1fr)' }}>
      <Board bus={ШИНА} peers={0} onOpen={ни} />
    </div>
  ) },
  { имя: 'чат', путь: '/r/', рисуй: () => (
    <Chat lines={РЕПЛИКИ} alive onClose={ни} onSend={ни} onOpen={ни} />
  ) },
  { имя: 'переписка', путь: '/кабинет', рисуй: () => (
    <Переписка кто="у2" имя="Аня Ковалёва" веду подложка={РАЗГОВОР(true)} onClose={ни} />
  ) },
  { имя: 'переписка-ученик', путь: '/кабинет', рисуй: () => (
    <Переписка кто="у1" имя="Люция Валерьевна" веду={false} подложка={РАЗГОВОР(false)} onClose={ни} />
  ) },
  { имя: 'стенд', путь: '/стенд', рисуй: () => <p style={{ padding: 20 }}>Это и есть стенд.</p> },
]

/* Правка занятия открывается по его опознавателю, а он появляется только после
   того, как занятие заведено. */
function СЖурломПравка() {
  const готово = useПодложенныеУроки(true)
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    if (!готово) return
    const н = new Date()
    читатьУроки(`${н.getFullYear()}-${String(н.getMonth() + 1).padStart(2, '0')}`)
      .then((все) => setId(все[0]?.id ?? null))
  }, [готово])
  if (!id) return null
  return <NewLesson person={УЧИТЕЛЬ} урокId={id} onDone={ни} onCreated={ни} onBack={ни} onOut={ни} onHome={ни} />
}

export function Стенд() {
  const п = new URLSearchParams(window.location.search)
  const чисто = п.get('чисто') === '1'
  const имя = п.get('э') ?? 'титул'
  const экран = ЭКРАНЫ.find((э) => э.имя === имя)

  if (!экран) {
    return (
      <main style={{ padding: 20 }}>
        <p>Нет экрана «{имя}». Есть: {ЭКРАНЫ.map((э) => э.имя).join(', ')}</p>
      </main>
    )
  }

  if (чисто) return экран.рисуй()

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'minmax(0,1fr) auto' }}>
      <div style={{ position: 'relative', minHeight: 0, overflow: 'hidden' }}>{экран.рисуй()}</div>
      {/* Полоса выбора — оснастка стенда, не продукт. Прибор открывает
          `?чисто=1`, и её здесь нет вовсе. */}
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8,
                    borderTop: '1px solid #ccc', background: '#fff', font: '12px monospace' }}>
        {ЭКРАНЫ.map((э) => (
          <a key={э.имя} href={`/стенд?э=${encodeURIComponent(э.имя)}`}
             style={{ padding: '3px 7px', border: '1px solid #ccc', borderRadius: 3,
                      color: э.имя === имя ? '#fff' : '#333',
                      background: э.имя === имя ? '#333' : 'transparent', textDecoration: 'none' }}>
            {э.имя}
          </a>
        ))}
        <a href={`/стенд?э=${encodeURIComponent(имя)}&чисто=1`}
           style={{ padding: '3px 7px', marginLeft: 'auto', color: '#333' }}>
          без полосы →
        </a>
      </nav>
    </div>
  )
}
