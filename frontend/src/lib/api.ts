/** Единственный разговор с сервером во всём первом куске. */

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

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
    throw new RoomError('Сервер Flamingo не отвечает. Проверьте, запущен ли он.')
  }

  let body: { token?: string; url?: string; identity?: string; name?: string; error?: string } = {}
  try {
    body = await res.json()
  } catch {
    throw new RoomError(`Сервер ответил не по-нашему (${res.status}).`)
  }

  if (!res.ok) throw new RoomError(body.error ?? `Сервер отказал (${res.status}).`)
  if (!body.token || !body.url) throw new RoomError('Сервер не прислал пропуск в комнату.')

  return {
    token: body.token,
    url: body.url,
    identity: body.identity ?? '',
    name: body.name ?? name,
  }
}
