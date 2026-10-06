/** Исследование внимания SEduM: разговор с сервером и очередь отправки.
 *
 *  🔴 ЗАПИСЬ УХОДИТ КУСКАМИ ПО ХОДУ ПРОВЕРКИ, А НЕ ОДНИМ ФАЙЛОМ В КОНЦЕ.
 *  Решение владельца 06.10: «файл пусть записывается сразу у нас». Пять минут
 *  видео — десятки мегабайт; держать их в памяти до конца значит потерять всё,
 *  если человек закрыл вкладку на четвёртой минуте или у него моргнул
 *  интернет. Каждые пять секунд — кусок на сервер; не ушёл — повторяем, пока
 *  страница открыта. Сервер принимает один и тот же кусок сколько угодно раз
 *  и просто заменяет его (science/хранилище.py), поэтому повтор безопасен.
 */

const BASE = String(import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '')

export class ОтказНауки extends Error {
  readonly код: number
  constructor(сообщение: string, код: number) {
    super(сообщение)
    this.код = код
  }
}

export type ОДоброволеце = {
  /** Как человек назвал себя, войдя по общей ссылке. Личная ссылка — null. */
  имя: string | null
  согласие: string | null
  анкета: Record<string, string> | null
  /** `прервана` — человек остановил проверку сам: запись есть, но значка нет. */
  проверки: { id: string; вид: string; начата: string; закончена: string | null; прервана?: boolean }[]
}

async function спросить<T>(путь: string, init: RequestInit = {}, срок = 10_000): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/science${путь}`, { ...init, signal: AbortSignal.timeout(срок) })
  } catch {
    throw new ОтказНауки('Сервер Flamingo не отвечает. Проверьте интернет и попробуйте ещё раз через минуту.', 0)
  }
  let тело: Record<string, unknown> = {}
  try {
    тело = await res.json()
  } catch {
    console.warn('наука: ответ сервера не разобран, код', res.status)
  }
  if (!res.ok) {
    throw new ОтказНауки(String(тело.error ?? 'Сервер не принял запрос. Попробуйте ещё раз.'), res.status)
  }
  return тело as T
}

const json = (тело: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(тело),
})

export const наука = {
  /** Жива ли общая ссылка `наука/вход-<секрет>`. Погашена — 404. */
  ссылка: (секрет: string) => спросить<{ ссылка: string }>(`/join/${encodeURIComponent(секрет)}`),
  /** Назваться по общей ссылке → свой код. */
  войти: (секрет: string, имя: string) =>
    спросить<ОДоброволеце & { код: string }>(`/join/${encodeURIComponent(секрет)}`, json({ имя })),
  кто: (код: string) => спросить<ОДоброволеце>(`/v/${encodeURIComponent(код)}`),
  /** Анкета отдельно от согласия: согласие даётся на первом экране, анкета — по желанию на втором. */
  анкета: (код: string, анкета: Record<string, string>) =>
    спросить<ОДоброволеце>(`/v/${encodeURIComponent(код)}/profile`, json({ анкета })),
  согласие: (код: string, версия: string, анкета: Record<string, string>) =>
    спросить<ОДоброволеце>(`/v/${encodeURIComponent(код)}/consent`, json({ версия, анкета })),
  начать: (код: string, тело: { вид: string; протокол: string; перед: Record<string, string>; устройство: Record<string, unknown> }) =>
    спросить<{ id: string }>(`/v/${encodeURIComponent(код)}/runs`, json(тело)),
  закончить: (код: string, id: string, итог: Record<string, unknown>) =>
    спросить<{ кусков: number; байт: number }>(`/v/${encodeURIComponent(код)}/runs/${id}/finish`, json({ итог })),
}

export type ВидКуска = 'video' | 'frames' | 'events' | 'audio'

type Кусок = { вид: ВидКуска; n: number; данные: Blob; тип: string; попыток: number }

/** Состояние очереди — для экрана «отправляем». */
export type Отправка = { всего: number; ушло: number; байтВсего: number; байтУшло: number; ошибка: string | null }

/** Очередь кусков одной проверки. Два куска в пути одновременно, повторы с
 *  паузой 1, 2, 4… до 30 секунд. Отказ сервера словами (413 — «слишком
 *  большое», «нет места») не повторяется: повтор не поможет. */
export class Очередь {
  private ждут: Кусок[] = []
  private вПути = 0
  private счёт: Record<ВидКуска, number> = { video: 0, frames: 0, events: 0, audio: 0 }
  private состояние: Отправка = { всего: 0, ушло: 0, байтВсего: 0, байтУшло: 0, ошибка: null }
  private слушатели = new Set<(о: Отправка) => void>()
  private остановлена = false
  readonly код: string
  readonly id: string

  constructor(код: string, id: string) {
    this.код = код
    this.id = id
  }

  /** Положить кусок. Номер — по порядку своего вида. → номер. */
  положить(вид: ВидКуска, данные: Blob, тип = данные.type || 'application/octet-stream'): number {
    const n = this.счёт[вид]++
    this.ждут.push({ вид, n, данные, тип, попыток: 0 })
    this.состояние = { ...this.состояние, всего: this.состояние.всего + 1, байтВсего: this.состояние.байтВсего + данные.size }
    this.сообщить()
    this.толкнуть()
    return n
  }

  get отправка(): Отправка { return this.состояние }
  get пусто(): boolean { return this.ждут.length === 0 && this.вПути === 0 }

  слушать(f: (о: Отправка) => void): () => void {
    this.слушатели.add(f)
    f(this.состояние)
    return () => { this.слушатели.delete(f) }
  }

  /** Дождаться, пока всё уйдёт (или очередь остановят). */
  async дождаться(): Promise<void> {
    while (!this.пусто && !this.остановлена) await new Promise((r) => setTimeout(r, 300))
  }

  остановить(): void { this.остановлена = true }

  private сообщить() {
    for (const f of this.слушатели) f(this.состояние)
  }

  private толкнуть() {
    while (this.вПути < 2 && this.ждут.length && !this.остановлена) {
      const к = this.ждут.shift()!
      this.вПути += 1
      void this.отправить(к).finally(() => {
        this.вПути -= 1
        this.толкнуть()
      })
    }
  }

  private async отправить(к: Кусок): Promise<void> {
    for (;;) {
      if (this.остановлена) return
      try {
        const res = await fetch(
          `${BASE}/api/science/v/${encodeURIComponent(this.код)}/runs/${this.id}/${к.вид}/${к.n}`,
          { method: 'PUT', headers: { 'Content-Type': к.тип }, body: к.данные, signal: AbortSignal.timeout(60_000) },
        )
        if (res.ok) {
          this.состояние = {
            ...this.состояние, ушло: this.состояние.ушло + 1, байтУшло: this.состояние.байтУшло + к.данные.size, ошибка: null,
          }
          this.сообщить()
          return
        }
        if (res.status === 413 || res.status === 404 || res.status === 400) {
          let слова = 'Сервер не принял запись.'
          try { слова = String((await res.json()).error ?? слова) } catch { /* слова по умолчанию */ }
          this.состояние = { ...this.состояние, ошибка: слова }
          this.сообщить()
          return
        }
      } catch {
        /* сеть моргнула — повторим */
      }
      к.попыток += 1
      this.состояние = { ...this.состояние, ошибка: 'Связь с сервером прервалась — повторяем…' }
      this.сообщить()
      await new Promise((r) => setTimeout(r, Math.min(30_000, 1000 * 2 ** Math.min(5, к.попыток - 1))))
    }
  }
}

/* ── Кабинет владельца ────────────────────────────────────────────────────
   Всё — с кукой входа Flamingo (`credentials: 'include'`): кто владелец,
   решает сервер по почте (science/кабинет.py). Чужому он отвечает 401 или
   403 словами, и страница показывает эти слова как есть. */

export type ЧеловекКабинета = {
  код: string
  имя: string
  пометка: string
  анкета: Record<string, string>
  согласие: string | null
  по_ссылке: boolean
  /** Виды проверок, пройденных до конца. */
  пройдено: string[]
  проверок: number
  последняя: string | null
  заведён: string
}

export type СводкаКабинета = {
  люди: ЧеловекКабинета[]
  всего: { людей: number; проверок: number; секунд: number; байт: number; свободно: number }
  ссылка: { секрет: string | null; вошло: number; с?: string }
}

export type ПроверкаКабинета = {
  id: string
  вид: string
  протокол: string
  начата: string
  закончена: string | null
  /** Секунд от начала до конца; не закончена — null. */
  длина: number | null
  прервана: boolean
  перед: Record<string, string>
  /** Доля кадров, где лицо видно, 0..1 — из итога проверки. Старые записи — null. */
  лицо: number | null
  совпало: { да: number; из: number } | null
  байт: number
  кусков: number
}

export type ЧеловекПодробно = Omit<ЧеловекКабинета, 'пройдено' | 'проверок' | 'последняя' | 'заведён' | 'по_ссылке'> & {
  проверки: ПроверкаКабинета[]
}

export type ВидКускаКабинета = 'video' | 'frames' | 'events' | 'audio'
export type ПроверкаПодробно = ПроверкаКабинета & {
  человек: { код: string; имя: string; анкета: Record<string, string> }
  устройство: Record<string, unknown>
  итог: Record<string, unknown>
  куски: Record<ВидКускаКабинета, { n: number; тип: string; байт: number }[]>
}

const сКукой: RequestInit = { credentials: 'include' }

export const кабинет = {
  сводка: () => спросить<СводкаКабинета>('/cabinet', сКукой),
  человек: (код: string) => спросить<ЧеловекПодробно>(`/cabinet/v/${encodeURIComponent(код)}`, сКукой),
  проверка: (id: string) => спросить<ПроверкаПодробно>(`/cabinet/runs/${encodeURIComponent(id)}`, сКукой),
  /** Прежние ссылки гаснут; вошедшие раньше остаются со своими кодами. */
  сменитьСсылку: () =>
    спросить<{ ссылка: СводкаКабинета['ссылка']; погашено: number }>('/cabinet/link', { ...json({ сменить: true }), ...сКукой }),
  /** Архив потоком: браузер сам предложит сохранить файл. */
  адресАрхива: (сВидео: boolean) => `${BASE}/api/science/cabinet/archive${сВидео ? '?video=1' : ''}`,
  /** Кусок записи как есть — видео, кадры (gzip), события. */
  кусок: async (id: string, вид: ВидКускаКабинета, n: number, срок = 60_000): Promise<Blob> => {
    let res: Response
    try {
      res = await fetch(`${BASE}/api/science/cabinet/runs/${encodeURIComponent(id)}/${вид}/${n}`, { ...сКукой, signal: AbortSignal.timeout(срок) })
    } catch {
      throw new ОтказНауки('Сервер Flamingo не отвечает. Проверьте интернет и попробуйте ещё раз.', 0)
    }
    if (!res.ok) throw new ОтказНауки(`Кусок записи не отдался (${res.status}).`, res.status)
    return res.blob()
  },
}

/** Ссылка для всех — так, как её отправляют людям. */
export const ссылкаДляВсех = (секрет: string) => `https://flamingo.plus/наука/вход-${секрет}`
