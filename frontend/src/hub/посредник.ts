/** Посредник «Источников мира» — `hub.flamingo.plus` (`hub-proxy/` в корне).
 *
 *  Источник, запретивший показывать себя в рамке, открывается через него:
 *  настоящим сайтом, в браузере самого человека. Здесь — только адрес
 *  посредника и список тех, кому он нужен.
 */

const БАЗА = String(import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '')

/** Где живёт посредник. На боевом — рядом с сайтом; на разработке его нет,
 *  пока адрес не задан (`VITE_HUB_PROXY_URL`). Пусто — посредника нет. */
export const ПОСРЕДНИК: string = (() => {
  const задан = String(import.meta.env.VITE_HUB_PROXY_URL ?? '').replace(/\/$/, '')
  if (задан) return задан
  if (typeof location !== 'undefined' && /(^|\.)flamingo\.plus$/.test(location.hostname)) return 'https://hub.flamingo.plus'
  return ''
})()

/** Какие источники запрещают показ в рамке — знает сервер (`manage.py хаб_рамки`).
 *  Спрашиваем один раз; сервер молчит — список пуст, и всё открывается рамкой. */
let спрошено: Promise<string[]> | null = null
export function безРамки(): Promise<string[]> {
  if (!БАЗА || !ПОСРЕДНИК) return Promise.resolve([])
  спрошено ??= fetch(`${БАЗА}/api/hub/previews`, { signal: AbortSignal.timeout(8_000) })
    .then((о) => (о.ok ? о.json() : {}))
    .then((т: { без_рамки?: unknown }) => (Array.isArray(т.без_рамки) ? т.без_рамки.filter((x): x is string => typeof x === 'string') : []))
    .catch(() => [])
  return спрошено
}
