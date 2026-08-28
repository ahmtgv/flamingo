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

const TOPIC = 'board'

export type Face = {
  identity: string
  name: string
  isLocal: boolean
  video?: Track
  audio?: Track
  speaking: boolean
  camOn: boolean
  micOn: boolean
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
  return {
    identity: p.identity,
    name: p.name || p.identity,
    isLocal,
    video: cam?.track ?? undefined,
    audio: isLocal ? undefined : (mic?.track ?? undefined),
    speaking: Boolean(p.isSpeaking),
    camOn: Boolean(cam && !cam.isMuted),
    micOn: Boolean(mic && !mic.isMuted),
  }
}

export function useRoom(code: string, name: string) {
  const roomRef = useRef<Room | null>(null)
  const listeners = useRef(new Set<(m: Msg) => void>())

  const [phase, setPhase] = useState<Phase>('connecting')
  const [error, setError] = useState('')
  const [faces, setFaces] = useState<Face[]>([])
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)

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

    const onData = (payload: Uint8Array, _p?: unknown, _k?: unknown, topic?: string) => {
      if (topic !== TOPIC) return
      try {
        const m = JSON.parse(new TextDecoder().decode(payload)) as Msg
        listeners.current.forEach((fn) => fn(m))
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
        if (!alive) return
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
        room.localParticipant
          .publishData(new TextEncoder().encode(JSON.stringify(m)), {
            reliable: true,
            topic: TOPIC,
          })
          .catch(() => undefined)
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

  const leave = useCallback(() => {
    roomRef.current?.disconnect().catch(() => undefined)
  }, [])

  return {
    phase,
    error,
    faces,
    peers: Math.max(0, faces.length - 1),
    bus,
    mic,
    cam,
    toggleMic,
    toggleCam,
    leave,
  }
}
