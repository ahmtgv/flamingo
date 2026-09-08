/** Единственный разговор с сервером во всём первом куске. */

/** 🔴 На боевом адрес бэкенда НЕ берётся из окружения.
 *
 *  Он там всегда свой же: путь `/api/room/token` обслуживает функция Cloudflare Pages
 *  из того же выката. Если бы адрес читался из `VITE_API_URL` и на боевом, то забытый
 *  локальный `.env` унёс бы в сборку `http://localhost:8080` — и продукт молча ходил бы
 *  в никуда. Проверено 30.08: именно это и случилось в первой сборке выката.
 *
 *  Поэтому переменная действует только в разработке, и сломать боевое ею нельзя. */
const BASE = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL ?? '') : '').replace(/\/$/, '')

export type RoomTicket = {
  token: string
  url: string
  identity: string
  name: string
}

/** Отказ несёт причину словами (ПРАВИЛА 6.4), а не «что-то пошло не так». */
export class RoomError extends Error {}

export async function fetchTicket(room: string, name: string): Promise<RoomTicket> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/room/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, name }),
    })
  } catch {
    /* 🔴 ЧЕЛОВЕКУ — ПРИЧИНА И ОДНО ДЕЙСТВИЕ, КОТОРОЕ ОН МОЖЕТ СДЕЛАТЬ
       (ПРАВИЛА 6.4). «Проверьте, запущен ли он» — распоряжение системному
       администратору: преподавателю с классом в комнате проверять нечего. */
    throw new RoomError('Сервер Flamingo не отвечает. Урок и ссылка на месте — попробуйте войти ещё раз через минуту.')
  }

  let body: { token?: string; url?: string; identity?: string; name?: string; error?: string } = {}
  try {
    body = await res.json()
  } catch {
    /* 🔴 НОМЕР ОТВЕТА — В КОНСОЛЬ, А НЕ В ЛИЦО ЧЕЛОВЕКУ (ПРАВИЛА 6.4).
       «Сервер ответил не по-нашему (404)» ученик читает как свою вину и не
       узнаёт ни причины, ни что делать. Поймано осмотром комнаты 08.09. */
    console.warn('комната: ответ сервера не разобран, код', res.status)
    throw new RoomError('Сервер комнаты ответил непонятно. Урок и написанное на доске на месте — откройте ссылку ещё раз.')
  }

  if (!res.ok) {
    console.warn('комната: сервер отказал, код', res.status)
    throw new RoomError(body.error ?? 'Сервер комнаты не пустил внутрь. Урок никуда не делся — откройте ссылку ещё раз или попросите новую.')
  }
  if (!body.token || !body.url) throw new RoomError('Сервер не прислал пропуск в комнату.')

  return {
    token: body.token,
    url: body.url,
    identity: body.identity ?? '',
    name: body.name ?? name,
  }
}
