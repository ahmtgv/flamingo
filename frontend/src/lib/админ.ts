/** Разговор с админкой сервера (`backend/people/админка.py`).
 *
 *  🔴 ПРАВ ЗДЕСЬ НЕТ. Кто админ, решает сервер на каждом запросе; этот файл
 *  только спрашивает и показывает отказ словами сервера. */

const BASE = String(import.meta.env.VITE_AUTH_URL ?? '').replace(/\/$/, '')

export class Отказ extends Error {
  код: number
  constructor(слова: string, код: number) { super(слова); this.код = код }
}

export type Группа = 'wait' | 'teachers' | 'students' | 'blocked'

export type Человек = {
  id: string
  имя: string
  почта: string
  роль: 'teacher' | 'student'
  проверка: 'new' | 'ok' | 'no'
  почтаПодтверждена: boolean
  телефон: string
  заблокирован: string | null
  причина: string
  снами: string
  уроков: number | null
  заметка?: string
}

export type Запись = { когда: string; кто: string; над: string; что: string; подробно: string }

export type УрокВсех = { id: string; название: string; дата: string; время: string; минут: number; учитель: string; почта: string }

export type Сводка = { ждут: number; учителей: number; учеников: number; заблокировано: number; уроков: number; добровольцев: number }

export type Действие = 'verify' | 'reject' | 'block' | 'unblock' | 'email_ok' | 'email_no' | 'note' | 'reset_link'

async function разговор<T>(путь: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/admin/${путь}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(12_000),
      ...init,
    })
  } catch {
    throw new Отказ('Сервер Flamingo не отвечает. Попробуйте ещё раз через минуту.', 0)
  }
  let тело: { error?: string } & Record<string, unknown> = {}
  try {
    тело = await res.json()
  } catch {
    throw new Отказ('Сервер ответил непонятно. Похоже, админка на нём ещё не обновлена.', res.status)
  }
  if (!res.ok) throw new Отказ(String(тело.error ?? 'Сервер отказал.'), res.status)
  return тело as T
}

export const сводка = () => разговор<Сводка>('summary')

export const люди = (группа: Группа, слово: string) =>
  разговор<{ люди: Человек[] }>(`people?group=${группа}${слово ? `&q=${encodeURIComponent(слово)}` : ''}`).then((r) => r.люди)

export const человек = (id: string) =>
  разговор<{ человек: Человек; журнал: Запись[] }>(`people/${id}`)

export const сделать = (id: string, действие: Действие, слова = '') =>
  разговор<{ человек: Человек; журнал: Запись[]; ссылка?: string }>(`people/${id}/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ действие, слова }),
  })

export const урокиВсех = () => разговор<{ уроки: УрокВсех[] }>('lessons').then((r) => r.уроки)

export const журнал = () => разговор<{ журнал: Запись[] }>('log').then((r) => r.журнал)
