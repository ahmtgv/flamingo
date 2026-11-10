/** Избранные источники человека.
 *
 *  Живут в этом браузере, а не на сервере: каталог открыт и гостю, у которого
 *  учётной записи нет вовсе. Отсюда честное следствие — на другом устройстве
 *  избранное своё. Хранилище может быть закрыто (частное окно): тогда список
 *  держится до закрытия страницы и молча пропадает, экран от этого не падает.
 */

const КЛЮЧ = 'fl-hub-избранное'

export function прочесть(): string[] {
  try {
    const сырое = window.localStorage.getItem(КЛЮЧ)
    const список: unknown = сырое ? JSON.parse(сырое) : []
    return Array.isArray(список) ? список.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function записать(список: string[]): void {
  try {
    window.localStorage.setItem(КЛЮЧ, JSON.stringify(список))
  } catch { /* хранилище закрыто — список живёт до закрытия страницы */ }
}
