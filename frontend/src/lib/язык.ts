/** Язык интерфейса (владелец: 18.11.2026 — английский, 19.11.2026 — ещё
 *  грузинский, французский, испанский, немецкий, турецкий и арабский).
 *
 *  🔴 КАК ВЫБИРАЕТСЯ. Сначала — выбор человека (выпадашка «RU ▾» в верхней
 *  строке), он живёт в этом браузере. Выбора нет — по настройкам браузера:
 *  первый из его языков, который у нас готов; не готов ни один — английский.
 *  Тот же выбор кладётся кукой `fl_lang` на весь flamingo.plus: по ней сервер
 *  отвечает на том же языке, а статичные страницы `/sedum/` показывают тот же
 *  язык.
 *
 *  🔴 ТЕКСТЫ ПИШУТСЯ ПО-РУССКИ, А ПЕРЕВОД ИЩЕТСЯ ПО НИМ. `тр('Войти')` вернёт
 *  «Войти» на русском и «Sign in» на английском — словарь каждого языка лежит
 *  в `lang/<код>.ts` и грузится только для своего языка. Нет перевода —
 *  остаётся русский текст: страница не ломается, а прибор такие места находит.
 *
 *  🔴 ЯЗЫК ПОЯВЛЯЕТСЯ В СПИСКЕ, ТОЛЬКО КОГДА ГОТОВ (`готов: true`). Пока
 *  словарь пишется, язык можно посмотреть на стенде адресом `?язык=ka`, но
 *  человеку он не предлагается.
 *
 *  🔴 СМЕНА ЯЗЫКА ПЕРЕЗАГРУЖАЕТ СТРАНИЦУ. Часть текстов собирается один раз
 *  при загрузке (каталог источников, сценарии теста). Перезагрузка — самый
 *  честный способ, чтобы на экране не осталось ни одного слова прежнего языка.
 */

export type Язык = 'ru' | 'en' | 'ka' | 'fr' | 'es' | 'de' | 'tr' | 'ar'

export type ОЯзыке = {
  код: Язык
  /** Название на самом этом языке — так его ищет глазами тот, кто на нём говорит. */
  имя: string
  /** Локаль для дат и чисел. */
  локаль: string
  /** Направление письма. */
  ход: 'ltr' | 'rtl'
  /** Словарь написан и проверен — язык предлагается людям. */
  готов: boolean
}

export const ЯЗЫКИ: ОЯзыке[] = [
  { код: 'ru', имя: 'Русский', локаль: 'ru-RU', ход: 'ltr', готов: true },
  { код: 'en', имя: 'English', локаль: 'en-GB', ход: 'ltr', готов: true },
  { код: 'ka', имя: 'ქართული', локаль: 'ka-GE', ход: 'ltr', готов: false },
  { код: 'fr', имя: 'Français', локаль: 'fr-FR', ход: 'ltr', готов: false },
  { код: 'es', имя: 'Español', локаль: 'es-ES', ход: 'ltr', готов: false },
  { код: 'de', имя: 'Deutsch', локаль: 'de-DE', ход: 'ltr', готов: false },
  { код: 'tr', имя: 'Türkçe', локаль: 'tr-TR', ход: 'ltr', готов: false },
  { код: 'ar', имя: 'العربية', локаль: 'ar', ход: 'rtl', готов: false },
]

const КЛЮЧ = 'fl-lang'
const ВСЕ = new Set<string>(ЯЗЫКИ.map((я) => я.код))
const ГОТОВЫЕ = new Set<string>(ЯЗЫКИ.filter((я) => я.готов).map((я) => я.код))
const КУКА = /(?:^|;\s*)fl_lang=([a-z]{2})/

function выбранный(): Язык | null {
  try {
    const с = window.localStorage.getItem(КЛЮЧ)
    if (с && ГОТОВЫЕ.has(с)) return с as Язык
  } catch { /* хранилище закрыто */ }
  const кука = КУКА.exec(typeof document === 'undefined' ? '' : document.cookie)?.[1]
  return кука && ГОТОВЫЕ.has(кука) ? (кука as Язык) : null
}

function изБраузера(): Язык {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'ru'
  const список = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const я of список) {
    const основа = String(я).toLowerCase().split('-')[0]
    if (ГОТОВЫЕ.has(основа)) return основа as Язык
  }
  return 'en'
}

/** Язык этой страницы. Определяется один раз, при загрузке. */
export const ЯЗЫК: Язык = (() => {
  /* Стенд и приборы могут попросить язык прямо в адресе: `?язык=en` —
     в том числе ещё не готовый, чтобы на него посмотреть. */
  try {
    const из = new URLSearchParams(window.location.search).get('язык')
    if (из && ВСЕ.has(из)) return из as Язык
  } catch { /* не браузер */ }
  return выбранный() ?? изБраузера()
})()

export const О_ЯЗЫКЕ: ОЯзыке = ЯЗЫКИ.find((я) => я.код === ЯЗЫК)!

/** Страница английская — для немногих мест, где английский особенный. */
export const анг = ЯЗЫК === 'en'
/** Страница русская: тексты в коде уже на нужном языке. */
export const рус = ЯЗЫК === 'ru'

/** Локаль для дат и чисел. */
export const ЛОКАЛЬ = О_ЯЗЫКЕ.локаль

let словарь: Record<string, string> = {}

/* Словари по языкам. Новый язык — новая строка здесь и файл `lang/<код>.ts`. */
const СЛОВАРИ: Partial<Record<Язык, () => Promise<{ СЛОВАРЬ: Record<string, string> }>>> = {
  en: () => import('../lang/en.ts'),
}


/** Подгрузить словарь до первого кадра. Русскому он не нужен. */
export async function подготовитьЯзык(): Promise<void> {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = ЯЗЫК
    document.documentElement.dir = О_ЯЗЫКЕ.ход
  }
  if (рус) return
  /* Каждый словарь — отдельный кусок сборки, грузится только свой. Словаря
     ещё нет (язык в работе) — остаются русские тексты, страница не падает. */
  try {
    const грузить = СЛОВАРИ[ЯЗЫК]
    if (грузить) словарь = (await грузить()).СЛОВАРЬ
  } catch { /* словарь не загрузился — остаются русские тексты */ }
}

/** Перевод строки интерфейса. `{имя}` в тексте заменяется значением.
 *
 *  `где` — когда одно и то же русское слово на разных экранах переводится
 *  по-разному («Войти» в учётную запись и «Войти» на урок): словарь сначала
 *  ищет `где|текст`, потом просто `текст`. */
export function тр(текст: string, вставки?: Record<string, string | number | null | undefined>, где?: string): string {
  let итог = рус ? текст : ((где ? словарь[`${где}|${текст}`] : undefined) ?? словарь[текст] ?? текст)
  if (вставки) for (const [к, з] of Object.entries(вставки)) итог = итог.split(`{${к}}`).join(String(з ?? ''))
  return итог
}

const ПРАВИЛА = typeof Intl !== 'undefined' ? new Intl.PluralRules(ЛОКАЛЬ) : null

/** Слово к числу.
 *
 *  Русский выбирает из трёх форм (1 урок, 2 урока, 5 уроков). Остальные языки —
 *  по правилам своего языка (`Intl.PluralRules`): английский берёт пару из
 *  `en`, прочие — из словаря по ключу `en[0]|en[1]`, где формы записаны так:
 *  `one=lesson;other=lessons` (у арабского их шесть: zero, one, two, few, many,
 *  other). Нет записи — английская пара. */
export function форма(n: number, одно: string, два: string, пять: string, en: [string, string]): string {
  if (рус) {
    const д = Math.abs(n) % 100
    const е = д % 10
    return д >= 11 && д <= 14 ? пять : е === 1 ? одно : е >= 2 && е <= 4 ? два : пять
  }
  const вид = ПРАВИЛА?.select(n) ?? (n === 1 ? 'one' : 'other')
  const запись = анг ? undefined : словарь[`${en[0]}|${en[1]}`]
  if (запись) {
    const формы = Object.fromEntries(запись.split(';').map((к) => к.split('=') as [string, string]))
    return формы[вид] ?? формы.other ?? en[1]
  }
  return n === 1 ? en[0] : en[1]
}

/** Число со словом: `сколько(3, ['урок', 'урока', 'уроков'], ['lesson', 'lessons'])` → «3 урока». */
export function сколько(n: number, ру: [string, string, string], en: [string, string]): string {
  return `${число(n)} ${форма(n, ру[0], ру[1], ру[2], en)}`
}

/** Число по правилам языка страницы: «5,2» по-русски, «5.2» по-английски. */
export function число(х: number, знаков?: number): string {
  try {
    return new Intl.NumberFormat(ЛОКАЛЬ, знаков === undefined ? { useGrouping: false } : { minimumFractionDigits: знаков, maximumFractionDigits: знаков, useGrouping: false }).format(х)
  } catch {
    return знаков === undefined ? String(х) : х.toFixed(знаков)
  }
}

/** Названия месяцев и дней недели на языке страницы.
 *  `падеж: 'род'` — «18 ноября», для русского; другим языкам он не нужен. */
export function месяцы(падеж: 'им' | 'род' = 'им'): string[] {
  return Array.from({ length: 12 }, (_, м) => {
    const д = new Date(2026, м, падеж === 'род' ? 18 : 1)
    if (падеж === 'род') return new Intl.DateTimeFormat(ЛОКАЛЬ, { day: 'numeric', month: 'long' }).formatToParts(д).find((ч) => ч.type === 'month')!.value
    return new Intl.DateTimeFormat(ЛОКАЛЬ, { month: 'long' }).format(д)
  })
}

/** Короткие дни недели, начиная с понедельника (`сВоскресенья` — с воскресенья). */
export function дниНедели(сВоскресенья = false): string[] {
  /* 2026-11-16 — понедельник, 2026-11-15 — воскресенье. */
  const начало = сВоскресенья ? 15 : 16
  return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(ЛОКАЛЬ, { weekday: 'short' }).format(new Date(2026, 10, начало + i)))
}

function поставитьКуку(я: Язык): void {
  const домен = /(^|\.)flamingo\.plus$/.test(window.location.hostname) ? '; domain=.flamingo.plus' : ''
  document.cookie = `fl_lang=${я}; path=/; max-age=31536000; SameSite=Lax${домен}${window.location.protocol === 'https:' ? '; Secure' : ''}`
}

/** Сменить язык: запомнить в браузере и для всего сайта, перезагрузить. */
export function сменитьЯзык(я: Язык): void {
  try { window.localStorage.setItem(КЛЮЧ, я) } catch { /* хранилище закрыто — останется кука */ }
  поставитьКуку(я)
  /* Подсказка из адреса (`?язык=`) перебила бы выбор — убираем её. */
  const адрес = new URL(window.location.href)
  адрес.searchParams.delete('язык')
  window.location.replace(адрес.toString())
}

/* Кука ставится и без явного выбора: сервер должен отвечать на языке страницы. */
try {
  if (typeof document !== 'undefined' && !КУКА.test(document.cookie)) поставитьКуку(ЯЗЫК)
} catch { /* не браузер */ }
