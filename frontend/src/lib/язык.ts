/** Язык интерфейса: русский или английский (владелец, 18.11.2026).
 *
 *  🔴 КАК ВЫБИРАЕТСЯ. Сначала — выбор человека (переключатель «RU · EN» в
 *  верхней строке), он живёт в этом браузере. Выбора нет — по настройкам
 *  браузера: первый из его языков, который мы знаем; не знаем ни одного —
 *  английский. Тот же выбор кладётся кукой `fl_lang` на весь flamingo.plus:
 *  по ней сервер отвечает на том же языке, а статичные страницы `/sedum/`
 *  показывают тот же язык.
 *
 *  🔴 ТЕКСТЫ ПИШУТСЯ ПО-РУССКИ, А ПЕРЕВОД ИЩЕТСЯ ПО НИМ. `т('Войти')` вернёт
 *  «Войти» на русском и «Sign in» на английском — словарь лежит в
 *  `lang/en.ts`. Нет перевода — остаётся русский текст: страница не ломается,
 *  а прибор `scripts/перевод-check.mjs` такие места находит.
 *
 *  🔴 СМЕНА ЯЗЫКА ПЕРЕЗАГРУЖАЕТ СТРАНИЦУ. Часть текстов собирается один раз
 *  при загрузке (каталог источников, сценарии теста). Перезагрузка — самый
 *  честный способ, чтобы на экране не осталось ни одного слова прежнего языка.
 */

export type Язык = 'ru' | 'en'

const КЛЮЧ = 'fl-lang'
const ЗНАЕМ: Язык[] = ['ru', 'en']

function выбранный(): Язык | null {
  try {
    const с = window.localStorage.getItem(КЛЮЧ)
    if (с === 'ru' || с === 'en') return с
  } catch { /* хранилище закрыто */ }
  const кука = /(?:^|;\s*)fl_lang=(ru|en)/.exec(typeof document === 'undefined' ? '' : document.cookie)?.[1]
  return (кука as Язык | undefined) ?? null
}

function изБраузера(): Язык {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'ru'
  const список = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const я of список) {
    const основа = String(я).toLowerCase().split('-')[0] as Язык
    if (ЗНАЕМ.includes(основа)) return основа
  }
  return 'en'
}

/** Язык этой страницы. Определяется один раз, при загрузке. */
export const ЯЗЫК: Язык = (() => {
  /* Стенд и приборы могут попросить язык прямо в адресе: `?язык=en`. */
  try {
    const из = new URLSearchParams(window.location.search).get('язык')
    if (из === 'ru' || из === 'en') return из
  } catch { /* не браузер */ }
  return выбранный() ?? изБраузера()
})()

export const анг = ЯЗЫК === 'en'

/** Локаль для дат и чисел. */
export const ЛОКАЛЬ = анг ? 'en-GB' : 'ru-RU'

let словарь: Record<string, string> = {}

/** Подгрузить словарь до первого кадра. Русскому он не нужен. */
export async function подготовитьЯзык(): Promise<void> {
  if (typeof document !== 'undefined') document.documentElement.lang = ЯЗЫК
  if (!анг) return
  словарь = (await import('../lang/en')).EN
}

/** Перевод строки интерфейса. `{имя}` в тексте заменяется значением. */
export function тр(текст: string, вставки?: Record<string, string | number | null | undefined>): string {
  let итог = анг ? (словарь[текст] ?? текст) : текст
  if (вставки) for (const [к, з] of Object.entries(вставки)) итог = итог.split(`{${к}}`).join(String(з ?? ''))
  return итог
}

/** Число со словом: `сколько(3, ['урок', 'урока', 'уроков'], ['lesson', 'lessons'])`. */
export function сколько(n: number, ру: [string, string, string], en: [string, string]): string {
  if (анг) return `${n} ${n === 1 ? en[0] : en[1]}`
  const д = Math.abs(n) % 100
  const е = д % 10
  const слово = д > 10 && д < 20 ? ру[2] : е === 1 ? ру[0] : е >= 2 && е <= 4 ? ру[1] : ру[2]
  return `${n} ${слово}`
}

/** Сменить язык: запомнить в браузере и для всего сайта, перезагрузить. */
export function сменитьЯзык(я: Язык): void {
  try { window.localStorage.setItem(КЛЮЧ, я) } catch { /* хранилище закрыто — останется кука */ }
  const домен = /(^|\.)flamingo\.plus$/.test(window.location.hostname) ? '; domain=.flamingo.plus' : ''
  document.cookie = `fl_lang=${я}; path=/; max-age=31536000; SameSite=Lax${домен}${window.location.protocol === 'https:' ? '; Secure' : ''}`
  /* Подсказка из адреса (`?язык=`) перебила бы выбор — убираем её. */
  const адрес = new URL(window.location.href)
  адрес.searchParams.delete('язык')
  window.location.replace(адрес.toString())
}

/* Кука ставится и без явного выбора: сервер должен отвечать на языке страницы. */
try {
  if (typeof document !== 'undefined' && !/(?:^|;\s*)fl_lang=/.test(document.cookie)) {
    const домен = /(^|\.)flamingo\.plus$/.test(window.location.hostname) ? '; domain=.flamingo.plus' : ''
    document.cookie = `fl_lang=${ЯЗЫК}; path=/; max-age=31536000; SameSite=Lax${домен}${window.location.protocol === 'https:' ? '; Secure' : ''}`
  }
} catch { /* не браузер */ }
