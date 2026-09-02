/** Занятия, пособия и журнал — разговор с сервером.
 *
 *  🔴 ГДЕ ЛЕЖАТ ЗАНЯТИЯ. Их два дома, и продукт честно говорит, в каком он
 *  сейчас. Сервер (`VITE_AUTH_URL`) — настоящий: занятия видны с любого
 *  устройства, ученики связаны, посещения считаются. Память браузера —
 *  запасной дом на то время, пока сервера нет: там работает расписание одного
 *  человека на одной машине и больше ничего.
 *
 *  Переключения руками нет и не будет: спрашиваем сервер, и если он не отвечает
 *  или отвечает «не знаю такого пути», уходим в браузер и запоминаем это,
 *  чтобы кабинет мог сказать правду словами (ПРАВИЛА 6.3).
 */

import * as местные from './lessons'

const BASE = String(import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '')

export type Пособие = {
  id: string
  вид: 'doc' | 'image' | 'link'
  имя: string
  размер: number
  адрес: string
}

export type Урок = {
  id: string
  название: string
  дата: string
  время: string
  минут: number
  код: string
  материалы: Пособие[]
}

export type СтрокаЖурнала = {
  id: string
  имя: string
  как: string
  с: string
  был: boolean[]
}

export type Журнал = {
  уроки: { id: string; дата: string; время: string; название: string; код: string; прошёл: boolean }[]
  ученики: СтрокаЖурнала[]
  ждут: { почта: string }[]
}

export type Дом = 'сервер' | 'браузер'

/** Где занятия лежат НА САМОМ ДЕЛЕ. Меняется первым же удачным или неудачным
 *  разговором с сервером; до первого разговора — «не знаем». */
let дом: Дом | null = null
export const гдеЛежат = (): Дом | null => дом

export class Беда extends Error {}

/** 🔴 Отличаем «сервера нет» от «сервер отказал». Первое — повод уйти в браузер,
 *  второе — повод показать человеку слова отказа. Свалить их в одно значит
 *  молча съесть «место кончилось» и сделать вид, что всё сохранилось. */
class НетСервера extends Error {}

async function разговор<T>(путь: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new НетСервера('сервер не задан')
  let res: Response
  try {
    /* 🔴 СРОК ОТВЕТА — как и у учётных записей (auth.ts). У `fetch` его нет,
       и сервер, принявший соединение и замолчавший, держит обещание вечно:
       экран остаётся ждать без слов и без выхода. Поймано 02.09 на живом
       перезапуске сервера. Файл пособия может быть большим, поэтому срок
       здесь на разговор о занятиях, а не на скачивание. */
    res = await fetch(`${BASE}/api/study/${путь}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(12_000),
      ...init,
    })
  } catch {
    throw new НетСервера('сервер не отвечает')
  }
  if (res.status === 404 && !res.headers.get('content-type')?.includes('json')) {
    throw new НетСервера('пути нет')
  }
  let тело: { error?: string } & Record<string, unknown> = {}
  try {
    тело = await res.json()
  } catch {
    throw new НетСервера('ответ не по-нашему')
  }
  if (!res.ok) throw new Беда(String(тело.error ?? `Сервер отказал (${res.status}).`))
  return тело as T
}

async function json<T>(путь: string, метод: string, тело: unknown): Promise<T> {
  return разговор<T>(путь, {
    method: метод,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(тело),
  })
}

/** Местный урок → та же форма, что у серверного: экранам разница не видна. */
function изМестного(у: местные.Урок): Урок {
  return { ...у, материалы: [] }
}

// ── занятия ────────────────────────────────────────────────────────────────

export async function читатьУроки(месяц?: string): Promise<Урок[]> {
  try {
    const r = await разговор<{ уроки: Урок[] }>(`lessons${месяц ? `?month=${месяц}` : ''}`)
    дом = 'сервер'
    return r.уроки
  } catch (e) {
    if (e instanceof Беда) throw e
    дом = 'браузер'
    const все = местные.уроки().map(изМестного)
    return месяц ? все.filter((у) => у.дата.startsWith(месяц)) : все
  }
}

export async function завестиУрок(что: {
  название: string; дата: string; время: string; минут: number
}): Promise<Урок> {
  try {
    const r = await json<{ урок: Урок }>('lessons', 'POST', что)
    дом = 'сервер'
    return r.урок
  } catch (e) {
    if (e instanceof Беда) throw e
    дом = 'браузер'
    return изМестного(местные.завести(что))
  }
}

/** Занятие «прямо сейчас» — для кнопки «Начать урок сейчас».
 *
 *  🔴 ТОЛЬКО НА СЕРВЕРЕ, БЕЗ ОТХОДА В БРАУЗЕР. У `завестиУрок` отход есть, и он
 *  там правильный: расписание на будущее лучше пусть полежит в браузере, чем
 *  пропадёт. Здесь — наоборот. Комната без занятия на сервере — это комната
 *  БЕЗ ХОЗЯИНА: спросить «кто ведёт» не у кого, и ведущего в ней не будет ни у
 *  кого, включая преподавателя. Молча открыть такую комнату значит пообещать
 *  урок и не дать его провести. Поэтому здесь `null` и слова на экране.
 *
 *  Название ставим сами: кнопка обещает «сейчас», а не форму. Переименовать
 *  занятие можно в журнале. */
export async function урокСейчас(now: Date = new Date()): Promise<Урок | null> {
  const п = (n: number) => String(n).padStart(2, '0')
  try {
    const r = await json<{ урок: Урок }>('lessons', 'POST', {
      название: 'Занятие',
      дата: `${now.getFullYear()}-${п(now.getMonth() + 1)}-${п(now.getDate())}`,
      время: `${п(now.getHours())}:${п(now.getMinutes())}`,
      минут: 45,
    })
    дом = 'сервер'
    return r.урок
  } catch {
    return null
  }
}

export async function поправитьУрок(id: string, что: {
  название: string; дата: string; время: string; минут: number
}): Promise<Урок> {
  try {
    const r = await json<{ урок: Урок }>(`lessons/${id}`, 'PATCH', что)
    дом = 'сервер'
    return r.урок
  } catch (e) {
    if (e instanceof Беда) throw e
    дом = 'браузер'
    return изМестного(местные.поправить(id, что))
  }
}

export async function убратьУрок(id: string): Promise<void> {
  try {
    await разговор(`lessons/${id}`, { method: 'DELETE' })
    дом = 'сервер'
  } catch (e) {
    if (e instanceof Беда) throw e
    дом = 'браузер'
    местные.убрать(id)
  }
}

// ── пособия ────────────────────────────────────────────────────────────────

/** 🔴 Пособия живут ТОЛЬКО на сервере. В браузере им места нет: учебник на
 *  20 МБ в хранилище вкладки не влезет, а сделать вид, что влез, и потерять
 *  его — хуже, чем честно сказать «нужен сервер». */
export async function положитьФайл(урок: string, файл: File): Promise<Пособие> {
  const форма = new FormData()
  форма.append('файл', файл)
  const r = await разговор<{ пособие: Пособие }>(`lessons/${урок}/materials`, {
    method: 'POST', body: форма,
  }).catch((e) => {
    if (e instanceof Беда) throw e
    throw new Беда('Пособия нужно куда-то класть, а сервер занятий не отвечает. '
      + 'Урок при этом сохранится, материалы приложите позже.')
  })
  return r.пособие
}

export async function положитьСсылку(урок: string, url: string, имя: string): Promise<Пособие> {
  const форма = new FormData()
  форма.append('url', url)
  форма.append('имя', имя)
  const r = await разговор<{ пособие: Пособие }>(`lessons/${урок}/materials`, {
    method: 'POST', body: форма,
  }).catch((e) => {
    if (e instanceof Беда) throw e
    throw new Беда('Сервер занятий не отвечает — ссылку пока некуда положить.')
  })
  return r.пособие
}

export async function снятьПособие(id: string): Promise<void> {
  await разговор(`materials/${id}`, { method: 'DELETE' })
}

// ── журнал ─────────────────────────────────────────────────────────────────

export async function читатьЖурнал(месяц: string): Promise<Журнал> {
  const r = await разговор<Журнал>(`journal?month=${месяц}`).catch((e) => {
    if (e instanceof Беда) throw e
    throw new Беда('Журнал живёт на сервере, а он не отвечает. Расписание в этом '
      + 'браузере при этом работает.')
  })
  дом = 'сервер'
  return r
}

export async function сделатьПриглашение(почта?: string): Promise<{
  ссылка: string; сказать: string; до: string
}> {
  return json('invites', 'POST', { почта: почта ?? '' })
}

export async function ктоЗовёт(ключ: string): Promise<string> {
  const r = await разговор<{ зовёт: string }>(`invites/${encodeURIComponent(ключ)}`)
  return r.зовёт
}

export async function принятьПриглашение(ключ: string): Promise<string> {
  const r = await json<{ учитель: string }>(`invites/${encodeURIComponent(ключ)}`, 'POST', {})
  return r.учитель
}

// ── посещение ──────────────────────────────────────────────────────────────

/** Отметка о входе в комнату. 🔴 Тихая: если сервера нет или комната не от
 *  занятия — это не беда и человеку об этом говорить нечего. */
/** Занятие по коду комнаты — вместе с пособиями.
 *
 *  🔴 ОТДЕЛЬНЫЙ ПУТЬ, А НЕ ПОИСК ПО СПИСКУ. `читатьУроки` всегда ограничен
 *  месяцем, а в комнату входят и накануне, и на следующий день, и первого
 *  числа в занятие, назначенное тридцатым. Искать по месяцу значит иногда не
 *  находить — а «пособий нет» и «пособия не нашлись» человек прочтёт
 *  одинаково и решит, что мы их потеряли.
 *
 *  Комната без занятия — обычное дело: «Начать урок сейчас» занятия не
 *  заводит. Поэтому «не нашлось» здесь не беда, а пустой ответ. */
export async function пособияКомнаты(код: string): Promise<{
  название: string; пособия: Пособие[]; веду: boolean
} | null> {
  try {
    const r = await разговор<{ урок: Урок; веду: boolean }>(`rooms/${encodeURIComponent(код)}`)
    дом = 'сервер'
    return { название: r.урок.название, пособия: r.урок.материалы, веду: r.веду }
  } catch {
    /* И «сервера нет», и «комнаты не от занятия», и «вы тут посторонний» —
       для комнаты одно и то же: показывать нечего. Разговор об этом не ведём:
       урок идёт, и посреди него объяснять человеку устройство прав незачем. */
    return null
  }
}

/** Полный адрес пособия: у ссылки он внешний, у файла — на нашем сервере. */
export function адресПособия(п: Пособие): string {
  return п.вид === 'link' ? п.адрес : BASE + п.адрес
}

/** Пособие-файл как `File` — чтобы разложить его на страницы показа.
 *
 *  🔴 Скачивает только ведущий. Классу файл не нужен: он видит страницы,
 *  которые ведущий разослал по комнате, — показ так и устроен. Значит и права
 *  на файл нужны одному человеку, а не всем. */
export async function взятьПособие(п: Пособие): Promise<File> {
  const r = await fetch(адресПособия(п), { credentials: 'include' })
  if (!r.ok) throw new Беда('Пособие не отдалось. Возможно, его сняли.')
  const b = await r.blob()
  return new File([b], п.имя, { type: b.type })
}

export async function отметиться(код: string): Promise<void> {
  try {
    await json('visits', 'POST', { код })
  } catch {
    /* журнал подождёт: урок важнее отметки */
  }
}

export async function моиПреподаватели(): Promise<{ id: string; имя: string; с: string }[]> {
  const r = await разговор<{ преподаватели: { id: string; имя: string; с: string }[] }>('teachers')
  return r.преподаватели
}
