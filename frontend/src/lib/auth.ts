import { мойПояс } from './пояс'
/** Учётные записи. Разговор с сервером один и тот же на входе и в регистрации. */

/** 🔴 Куда стучаться за учётными записями. Задаётся `VITE_AUTH_URL` в
 *  настройках сборки Cloudflare Pages: `https://api.flamingo.plus`.
 *
 *  🔴 ПУСТО БОЛЬШЕ НЕ ЗНАЧИТ «КАК БЫЛО». До 12.09 пустая переменная означала
 *  свой же источник, и там правда жили функции Pages — вход работал. Копию
 *  снесли (решение владельца: «оставить одну, на сервере»), и теперь пустой
 *  адрес значит стучаться в собственный сайт, где никакого `/api/` нет: каждый
 *  запрос вернёт страницу вместо JSON, а человек прочтёт «сервер ответил
 *  непонятно». Ни ошибки сборки, ни красного. Поэтому за пустотой следит
 *  караул `scripts/сборка-check.mjs`: он смотрит в СОБРАННЫЙ файл и падает,
 *  если адреса сервера там нет.
 *
 *  На разработке пусто по-прежнему законно: сервера нет, уроки живут в
 *  браузере (`lib/lessons.ts`), и караул сборки туда не ходит.
 *
 *  credentials:'include' ниже обязателен: сервер на другом источнике, и без
 *  этой строки браузер не пошлёт куку и не примет Set-Cookie в ответе. */
const BASE = String(import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '')

export type Person = {
  id: string
  name: string
  role: 'teacher' | 'student'
  /** Часовой пояс человека, каким его знает сервер. Пусто — не знает. */
  пояс?: string
}

export class AuthError extends Error {}

/** Сервер не ответил вовсе: соединение не встало или молчит. Отдельно от
 *  `AuthError`, потому что ответы разные: «неверный пароль» человек читает и
 *  исправляет, а на молчание может только подождать и повторить. */
export class Молчит extends AuthError {}

/** 🔴 СРОК ОТВЕТА. У `fetch` его нет вовсе: сервер, который принял соединение
 *  и замолчал, держит обещание вечно. Так и вышло 02.09 — во время
 *  `systemctl restart` запрос «кто вошёл» повис, и продукт остался стоять на
 *  «СМОТРИМ, КТО ВОШЁЛ» без единого слова и без выхода. Экран ожидания честен
 *  ровно до тех пор, пока ожидание кончается.
 *
 *  Восемь секунд, и это меньше, чем у занятий (study.ts, двенадцать): этот
 *  запрос держит ВЕСЬ продукт — пока он не ответил, человек смотрит на две
 *  строки и больше ни на что. Ошибиться в короткую сторону здесь дёшево: на
 *  экране молчания есть «Спросить ещё раз», и лишнее нажатие стоит секунды.
 *  Ошибиться в длинную — значит заставить смотреть в пустоту. */
const СРОК = 8_000

async function talk<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/auth/${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(СРОК),
      ...init,
    })
  } catch {
    throw new Молчит('Сервер Flamingo не отвечает. Урок по ссылке при этом работает.')
  }
  let body: { error?: string } & Record<string, unknown> = {}
  try {
    body = await res.json()
  } catch {
    /* 🔴 НОМЕР ОТВЕТА — В КОНСОЛЬ, А НЕ В ЛИЦО ЧЕЛОВЕКУ (ПРАВИЛА 6.4). И это не
       редкий случай: любой посредник — гостиничный вайфай, школьный прокси, сбойный
       кэш — отдаёт свой HTML вместо нашего JSON, и человек читал «не по-нашему
       (200)». Аудит 07.09, находки 6 и 14. */
    console.warn('учётные записи: ответ не разобран, код', res.status)
    throw new AuthError('Сервер учётных записей ответил непонятно. Похоже, между нами встал посредник — попробуйте ещё раз или откройте сайт в другой сети.')
  }
  if (!res.ok) {
    console.warn('учётные записи: сервер отказал, код', res.status)
    throw new AuthError(String(body.error ?? 'Сервер учётных записей отказал. Попробуйте ещё раз через минуту.'))
  }
  return body as T
}

export const register = (email: string, name: string, role: Person['role'], password: string) =>
  talk<Person>('register', { method: 'POST',
    body: JSON.stringify({ email, name, role, password, tz: мойПояс() }) })

export const login = (email: string, password: string) =>
  /* 🔴 Пояс уходит при КАЖДОМ входе, а не только при заведении записи: человек
     переезжает, и «его пояс» — это где он сейчас. Сервер перезапишет, если
     изменился. Формой пояс не спрашиваем: браузер знает точно. */
  talk<Person>('login', { method: 'POST',
    body: JSON.stringify({ email, password, tz: мойПояс() }) })

export const whoAmI = () => talk<{ person: Person | null }>('me')

export const logout = () => talk<{ ok: boolean }>('me', { method: 'DELETE' })

/** «Забыли пароль». Ответ ОДИН И ТОТ ЖЕ, есть такая почта или нет: иначе форма
 *  становится способом проверить, зарегистрирован ли человек у нас. */
export const forgot = (email: string) =>
  talk<{ ok: boolean; said: string }>('forgot', { method: 'POST', body: JSON.stringify({ email }) })

/** Смена пароля по ключу из письма. Ключ одноразовый и живёт час. */
export const resetPass = (key: string, password: string) =>
  talk<Person>('reset', { method: 'POST', body: JSON.stringify({ key, password }) })
