import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ConnectionState,
  type RemoteParticipant,
  Room,
  RoomEvent,
  type Track,
  type TrackPublication,
} from 'livekit-client'

import { fetchTicket, RoomError } from '../lib/api'
import type { Bus, Msg } from '../board/protocol'
import { joiner, split } from '../board/chunk'

const TOPIC = 'board'

export type Face = {
  identity: string
  name: string
  isLocal: boolean
  video?: Track
  audio?: Track
  /** Экран, которым человек делится. Отдельная дорожка, а не подмена камеры:
   *  лицо и экран нужны одновременно — «смотрите сюда» без лица не работает. */
  screen?: Track
  speaking: boolean
  camOn: boolean
  micOn: boolean
  /** Момент входа в комнату. Ноль значит «сервер ещё не сказал». */
  joinedAt: number
  /** Подпись «ведёт занятие» на плитке. Ставится по слову того, кому сервер
   *  занятий ответил «веду», и НИ ПО ЧЕМУ ДРУГОМУ. Прав не даёт: права каждый
   *  экран берёт из своего ответа сервера. */
  lead: boolean
}

/** Пять состояний экрана начинаются здесь (ПРАВИЛА 6.1): комната знает про себя ровно
 *  то, что экран обязан показать словами. */
export type Phase = 'connecting' | 'live' | 'failed'

function pub(p: { trackPublications: Map<string, TrackPublication> }, source: string) {
  for (const t of p.trackPublications.values()) if (t.source === source) return t
  return undefined
}

function faceOf(p: any, isLocal: boolean): Face {
  const cam = pub(p, 'camera')
  const mic = pub(p, 'microphone')
  const scr = pub(p, 'screen_share')
  return {
    identity: p.identity,
    name: p.name || p.identity,
    isLocal,
    video: cam?.track ?? undefined,
    audio: isLocal ? undefined : (mic?.track ?? undefined),
    screen: scr?.track ?? undefined,
    speaking: Boolean(p.isSpeaking),
    camOn: Boolean(cam && !cam.isMuted),
    micOn: Boolean(mic && !mic.isMuted),
    joinedAt: p.joinedAt instanceof Date ? p.joinedAt.getTime() : 0,
    lead: false,
  }
}

/* 🔴 ЗДЕСЬ БОЛЬШЕ НЕТ ВЫЧИСЛЕНИЯ РОЛИ, И ЭТО ГЛАВНОЕ В ЭТОМ ФАЙЛЕ.
 *
 *  Было: `withLead` объявлял ведущим того, кто вошёл раньше всех. Ученик,
 *  открывший ссылку до преподавателя, получал права ведущего целиком — показ
 *  классу, доску, «Завершить урок». Поймано владельцем 02.09; его слова:
 *  «это не должно быть априори, не блокировать скриптом, а исключить как
 *  сценарий программно, чтобы не было даже намёка на такую возможность».
 *
 *  Поэтому функции нет вовсе, а не стоит с проверкой: пока в коде живёт
 *  выражение «первый вошедший → ведущий», его однажды позовут снова.
 *
 *  Роль теперь приходит ТОЛЬКО от сервера занятий — `GET /api/study/rooms/<код>`
 *  отвечает `веду`, и отвечает он про того, кто прислал свою куку. Сервер
 *  молчит или комната не от занятия — ведущего нет ни у кого. Это не «отказ
 *  на всякий случай»: ведущий — это владелец занятия, и других источников
 *  этого знания у нас нет. Караул `ведущий-check.mjs` держит правило.
 *
 *  Роль, которую видно на плитках, — отдельная вещь: это ПОДПИСЬ, и она
 *  приезжает по каналу от того, кому сервер сказал «веду». Подпись можно
 *  подделать чужим клиентом — прав она не даёт никаких: каждый экран решает
 *  про СВОИ права по своему ответу сервера, а не по чужому слову. */

export function useRoom(code: string, name: string) {
  const roomRef = useRef<Room | null>(null)
  const listeners = useRef(new Set<(m: Msg) => void>())

  const [phase, setPhase] = useState<Phase>('connecting')
  const [error, setError] = useState('')
  const [faces, setFaces] = useState<Face[]>([])
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  /* Делюсь ли я экраном. Отдельно от `cam`: это другая дорожка. */
  const [sharing, setSharing] = useState(false)
  const [shareSaid, setShareSaid] = useState('')

  useEffect(() => {
    let alive = true
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room

    const snapshot = () => {
      if (!alive) return
      const list: Face[] = [faceOf(room.localParticipant, true)]
      room.remoteParticipants.forEach((p: RemoteParticipant) => list.push(faceOf(p, false)))
      setFaces(list)
    }

    // Длинные сообщения (картинка из буфера) приезжают частями — здесь их собирают.
    const join = joiner()
    const onData = (payload: Uint8Array, _p?: unknown, _k?: unknown, topic?: string) => {
      if (topic !== TOPIC) return
      try {
        const whole = join(JSON.parse(new TextDecoder().decode(payload)))
        if (whole === null) return
        listeners.current.forEach((fn) => fn(whole as Msg))
      } catch {
        /* чужой мусор в канале не должен ронять доску */
      }
    }

    room
      .on(RoomEvent.ParticipantConnected, snapshot)
      .on(RoomEvent.ParticipantDisconnected, snapshot)
      .on(RoomEvent.TrackSubscribed, snapshot)
      .on(RoomEvent.TrackUnsubscribed, snapshot)
      .on(RoomEvent.TrackMuted, snapshot)
      .on(RoomEvent.TrackUnmuted, snapshot)
      .on(RoomEvent.LocalTrackPublished, snapshot)
      .on(RoomEvent.LocalTrackUnpublished, snapshot)
      .on(RoomEvent.ActiveSpeakersChanged, snapshot)
      .on(RoomEvent.DataReceived, onData)
      .on(RoomEvent.Disconnected, () => {
        if (!alive) return
        setPhase('failed')
        setError('Связь с комнатой прервалась. Доска и записи не пострадали — их и нет.')
      })
      .on(RoomEvent.ConnectionStateChanged, (st: ConnectionState) => {
        if (!alive) return
        if (st === ConnectionState.Connected) setPhase('live')
      })

    ;(async () => {
      try {
        const ticket = await fetchTicket(code, name)
        if (!alive) return
        await room.connect(ticket.url, ticket.token)
        // Экран мог уйти, пока поднималась связь (в разработке React делает это нарочно).
        // Просто выйти мало: комната осталась бы подключённой, а человек — вторым лицом
        // в списке участников, которого нет.
        if (!alive) {
          room.disconnect().catch(() => undefined)
          return
        }
        setPhase('live')
        snapshot()
        try {
          await room.localParticipant.enableCameraAndMicrophone()
        } catch {
          // Отказ камеры — не отказ комнаты (ПРАВИЛА 6.5): эфир идёт, доска работает.
          if (alive) {
            setCam(false)
            setMic(false)
          }
        }
        snapshot()
      } catch (e) {
        if (!alive) return
        setPhase('failed')
        setError(
          e instanceof RoomError
            ? e.message
            : 'Эфир не поднялся: медиасервер не ответил. Доска и комната от этого не пострадали.',
        )
      }
    })()

    return () => {
      alive = false
      room.removeAllListeners()
      room.disconnect().catch(() => undefined)
      roomRef.current = null
    }
  }, [code, name])

  const bus: Bus = useMemo(
    () => ({
      send: (m: Msg) => {
        const room = roomRef.current
        if (!room || room.state !== ConnectionState.Connected) return
        for (const part of split(JSON.stringify(m))) {
          room.localParticipant
            .publishData(new TextEncoder().encode(part), { reliable: true, topic: TOPIC })
            .catch(() => undefined)
        }
      },
      subscribe: (fn) => {
        listeners.current.add(fn)
        return () => {
          listeners.current.delete(fn)
        }
      },
    }),
    [],
  )

  const toggleMic = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const next = !mic
    setMic(next)
    await room.localParticipant.setMicrophoneEnabled(next).catch(() => setMic(!next))
  }, [mic])

  const toggleCam = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const next = !cam
    setCam(next)
    await room.localParticipant.setCameraEnabled(next).catch(() => setCam(!next))
  }, [cam])

  /** Показать свой экран классу.
   *
   *  🔴 Это единственный честный способ показать классу чужой сайт. Рамка внутри
   *  страницы работает не везде: большинство сайтов запрещают показ у себя внутри
   *  рамки, и обойти этот запрет нельзя — он их, а не наша слабость. Экран же
   *  показывает ровно то, что видит преподаватель.
   *
   *  Браузер сам спросит, чем делиться: окном, вкладкой или всем экраном. Отказ
   *  человека — не отказ продукта: говорим словами и продолжаем урок. */
  const toggleShare = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const next = !sharing
    setShareSaid('')
    try {
      await room.localParticipant.setScreenShareEnabled(next, { audio: false })
      setSharing(next)
    } catch (e) {
      // NotAllowedError — человек закрыл окно выбора. Это не поломка.
      const отказ = (e as { name?: string })?.name === 'NotAllowedError'
      setShareSaid(отказ
        ? 'Показ экрана отменён — окно выбора закрыто. Урок идёт дальше.'
        : 'Браузер не дал показать экран. Урок идёт дальше: доска, голос и чат работают.')
      setSharing(false)
    }
  }, [sharing])

  const leave = useCallback(() => {
    roomRef.current?.disconnect().catch(() => undefined)
  }, [])

  return {
    phase,
    error,
    faces,
    /** Мой опознаватель в комнате. Нужен, чтобы назвать себя ведущим для подписи. */
    me: faces.find((f) => f.isLocal)?.identity ?? '',
    peers: Math.max(0, faces.length - 1),
    bus,
    mic,
    cam,
    toggleMic,
    toggleCam,
    sharing,
    shareSaid,
    toggleShare,
    leave,
  }
}
