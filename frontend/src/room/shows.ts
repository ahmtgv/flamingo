import type { Point } from '../board/protocol'

/** Показы, которые можно сохранить, — и их несколько.
 *
 *  До 31.08 показ жил в одной переменной: «Закончить показ» не стирал его, но
 *  второй показ было НЕКУДА положить — выбор файлов больше не открывался. Владелец
 *  назвал оба следствия дефектами: показ должен сохраняться, показов должно быть
 *  несколько.
 *
 *  🔴 ГДЕ ХРАНИТСЯ И ПОЧЕМУ ЭТО СКАЗАНО СЛОВАМИ НА ЭКРАНЕ. Сервера файлов у нас
 *  пока нет (свой сервер поднимается под учётные записи), поэтому показы лежат
 *  в IndexedDB браузера: переживают «Закончить показ», перезагрузку и новую
 *  комнату — но живут НА ЭТОМ УСТРОЙСТВЕ. Открыв Flamingo с другого компьютера,
 *  преподаватель этих показов не увидит. Панель показов говорит об этом прямо:
 *  молчание про такое — враньё по устройству. Когда учётки переедут на наш
 *  сервер, сюда добавится выгрузка, и надпись изменится вместе с устройством.
 */

/** Пометка поверх страницы. Координаты — ДОЛИ рамки страницы (0…1 по обеим осям):
 *  у каждого смотрящего своё окно, и только доля означает одно и то же место у всех.
 *  Толщина — тоже доля ширины: линия, нарисованная «в палец», остаётся «в палец». */
export type Ink =
  | { id: string; kind: 'pen'; color: string; w: number; pts: Point[] }
  | { id: string; kind: 'arrow'; color: string; w: number; a: Point; b: Point }
  | { id: string; kind: 'sticker'; name: StickerName; x: number; y: number }

/** Стикеров ровно три, и у каждого цвет пришит к смыслу, а не выбирается:
 *  «верно» — зелёный (принято, ПРАВИЛА 5.8), «вопрос» — нейтральный,
 *  «сюда» — коралловый: на это смотрят СЕЙЧАС, через минуту метка бессмысленна —
 *  та же проба, что у поднятой руки (ПРАВИЛА 11.8). */
export type StickerName = 'верно' | 'вопрос' | 'сюда'

export type ShowDoc = {
  id: string
  title: string
  pages: string[]
  /** Пометки по страницам: ключ — номер страницы. Сохраняются вместе с показом. */
  ink: Record<number, Ink[]>
  /** Когда собран. Показывается в списке, чтобы отличать «Урок.pdf» от «Урок.pdf». */
  at: number
}

const DB = 'flamingo'
const STORE = 'shows'

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB, 1)
    rq.onupgradeneeded = () => {
      if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  })
}

function done<T>(rq: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  })
}

/** Все показы устройства, свежие сверху. Их единицы — грузим целиком; если когда-то
 *  их станут сотни, сюда придёт список без страниц, а не молчаливое торможение. */
export async function allShows(): Promise<ShowDoc[]> {
  try {
    const db = await open()
    const list = await done(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<ShowDoc[]>)
    db.close()
    return list.sort((a, b) => b.at - a.at)
  } catch {
    return []
  }
}

export async function putShow(d: ShowDoc): Promise<boolean> {
  try {
    const db = await open()
    await done(db.transaction(STORE, 'readwrite').objectStore(STORE).put(d))
    db.close()
    return true
  } catch {
    /* Приватное окно или запрет на данные сайта: показ работает, но не переживёт
       перезагрузку — панель показов скажет это словами по флагу от этого false. */
    return false
  }
}

export async function dropShow(id: string): Promise<void> {
  try {
    const db = await open()
    await done(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id))
    db.close()
  } catch {
    /* Не удалилось — останется в списке; повторное удаление доступно всегда. */
  }
}
