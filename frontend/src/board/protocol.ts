/** Язык, на котором доски двух браузеров договариваются между собой.
 *
 *  Сервер этих сообщений не видит: они идут по данным-каналу LiveKit прямо между
 *  участниками. Договариваться не с кем, кроме такого же фронта, поэтому язык
 *  маленький и без версий.
 *
 *  🔴 Координаты МИРОВЫЕ, а не экранные и не доли ширины. Холст бесконечный, его
 *  двигают и масштабируют, поэтому точка «где нарисовано» не может зависеть ни от
 *  размера окна, ни от текущего масштаба смотрящего. Один мировой пиксель равен
 *  экранному при масштабе 100 %.
 */

export type Point = [number, number]

export type Stroke = {
  id: string
  /** Имя токена цвета, а не значение: цвет считается на месте, из темы (ПРАВИЛА 2.8). */
  color: string
  width: number
  /** Пунктир. Едет вместе со штрихом: иначе у второго участника линия сплошная,
   *  и «обведите пунктиром то, что неточно» перестаёт что-либо значить. */
  dash?: boolean
  pts: Point[]
}

/** Что можно положить на доску помимо штриха. */
export type Obj =
  | { id: string; kind: 'text';  x: number; y: number; w: number; text: string; color: string; size: number }
  | { id: string; kind: 'note';  x: number; y: number; w: number; h: number; text: string }
  | { id: string; kind: 'arrow'; x: number; y: number; x2: number; y2: number; color: string; width: number }
  | { id: string; kind: 'image'; x: number; y: number; w: number; h: number; src: string; name?: string }
  | { id: string; kind: 'video'; x: number; y: number; w: number; h: number; url: string; name?: string }
  /** Документ на доске — ОДИН объект со страницами внутри, а не россыпь картинок.
   *  Восемь страниц россыпью нельзя двигать вместе, и в них теряешься.
   *  `page` — какую страницу видно сейчас; доска общая, поэтому она общая тоже. */
  | { id: string; kind: 'doc'; x: number; y: number; w: number; h: number; name: string; pages: string[]; page: number }

export type ObjKind = Obj['kind']

/** Одна доска: штрихи и объекты. Досок в комнате может быть несколько. */
export type Sheet = {
  id: string
  name: string
  strokes: Stroke[]
  objs: Obj[]
}

export type Msg =
  /** Кусок штриха: первый приходит вместе с цветом и толщиной, следующие — только точками. */
  | { t: 'seg'; sheet: string; id: string; color: string; width: number; dash?: boolean; pts: Point[] }
  | { t: 'erase'; sheet: string; ids: string[] }
  | { t: 'clear'; sheet: string }
  /** Объект появился или изменился. Одно сообщение на объект целиком: они маленькие,
   *  кроме картинки, а картинку всё равно режет на части `chunk.ts`. */
  | { t: 'obj'; sheet: string; o: Obj }
  | { t: 'objdel'; sheet: string; ids: string[] }
  /** Перелистнули документ. Отдельным сообщением, а не целым объектом: страницы
   *  весят сотни килобайт каждая, и слать их заново ради номера страницы —
   *  это минута молчания у всего класса. */
  | { t: 'docPage'; sheet: string; id: string; page: number }
  /** Доска целиком заменяется — так уезжает отмена: пересказывать её пошагово
   *  дороже и хрупче, чем прислать лист в том виде, к которому вернулись. */
  | { t: 'sheetState'; sheet: Sheet }
  /** Список досок и какая открыта. Ведёт тот, кто переключил. */
  | { t: 'sheets'; sheets: { id: string; name: string }[]; active: string }
  /** Сообщение в чате занятия. Нигде не хранится: пока нет учётных записей,
   *  переписка живёт ровно столько, сколько в комнате есть люди. */
  | { t: 'chat'; id: string; who: string; text: string; at: number }
  /** Что сейчас показывают классу. Ведёт тот, кто ведёт урок. */
  | { t: 'stage'; source: 'faces' | 'board' | 'show' | 'live' | 'screen' }
  /** Показ: сколько страниц, какая открыта и как называется. Сами страницы едут
   *  отдельно и по одной — целиком они положили бы канал всему классу. */
  | { t: 'showMeta'; title: string; n: number; i: number }
  | { t: 'showPage'; i: number; src: string }
  /** Пометки поверх страницы показа. Координаты — доли рамки страницы (см. shows.ts).
   *  `ink` заменяет метку по id — так штрих растёт у класса, пока его ведут.
   *  `inkAll` — страница целиком: уезжает при листании, смене показа и отмене. */
  | { t: 'ink'; page: number; m: import('../room/shows').Ink }
  | { t: 'inkDel'; page: number; ids: string[] }
  | { t: 'inkAll'; page: number; marks: import('../room/shows').Ink[] }
  /** Трансляция из Flamingo HUB: какой источник и какую страницу показывают. */
  | { t: 'live'; sourceId: string; url: string }
  /** «Я только вошёл, покажите доску». */
  | { t: 'ask' }
  | { t: 'state'; sheets: Sheet[]; active: string }

export type Bus = {
  send: (m: Msg) => void
  subscribe: (fn: (m: Msg) => void) => () => void
}

export const PENS = [
  { token: '--color-text', title: 'Чёрный' },
  { token: '--fl-coral-500', title: 'Коралловый' },
  { token: '--color-go', title: 'Зелёный' },
  { token: '--color-info', title: 'Синий' },
] as const

export const PEN_WIDTHS = { thin: 2, thick: 5 } as const

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
