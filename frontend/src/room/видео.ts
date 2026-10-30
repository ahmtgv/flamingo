/** Видео в уроке ведёт учитель (решение владельца 30.10).
 *
 *  «Учитель нажал — у учеников показывает. Ученики не властны над потоком —
 *  только учитель.» Поэтому:
 *
 *  — у ведущего ролик обычный, с управлением; его состояние (идёт или стоит,
 *    на какой секунде) уходит классу по каналу комнаты, надёжно, раз в две
 *    секунды и сразу при каждом нажатии;
 *  — у ученика у ролика нет управления, а поверх лежит прозрачная крышка:
 *    нажать пуск, паузу или перемотать нельзя. Его плеер сам догоняет
 *    учителя: разошлись больше чем на полторы секунды — перематывает;
 *  — слово принимается только от ведущего, подписанного сервером (как
 *    «пишем», `useRoom.ts`): назвавшийся ведущим чужой клиент ролик не ведёт.
 *
 *  Умеем два вида: YouTube (через его встроенный протокол `postMessage`, без
 *  чужого скрипта на нашей странице) и прямой файл `.mp4/.webm/.ogg`
 *  (`<video>`). Vimeo и Rutube пока играют у каждого сами по себе.
 *
 *  🔴 ЧАСЫ — СВОИ, А НЕ ЧУЖИЕ. В сообщении нет времени отправителя: часы на
 *  двух компьютерах расходятся на секунды. Ученик считает «где сейчас
 *  учитель» от мгновения, когда слово ПРИШЛО к нему; задержка канала —
 *  десятые доли секунды, это меньше порога в полторы.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export const ТЕМА_ВИДЕО = 'видео'

/** Состояние ролика у ведущего. `а` — адрес: ученик сверяет, тот ли ролик. */
export type СловоВидео = { а: string; и: boolean; с: number }

/** Расхождение, которое ученик терпит без перемотки, секунды. */
export const ДОПУСК_С = 1.5
/** После перемотки ученик не перематывает снова столько, мс.
 *
 *  🔴 БЕЗ ЭТОЙ ПАУЗЫ SAFARI ЗАХЛЁБЫВАЛСЯ (владелец, 31.10: «жутко лагает»).
 *  Перемотка в плеере не мгновенна: пока ролик догружает новое место, плеер
 *  ещё сообщает старую секунду. Сверка шла каждые 0,7 с, видела «отстал» и
 *  перематывала снова — и так по кругу, ролик дёргался и не играл. Теперь
 *  после перемотки плееру дают время встать на место. */
export const ПЕРЕМОТКА_ОТДЫХ_МС = 4000
/** Как часто ведущий повторяет состояние — для опоздавших и для сверки. */
export const ПОВТОР_МС = 2000

export function видеоВБайты(с: СловоВидео): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify({ а: с.а, и: с.и, с: Math.round(с.с * 10) / 10 }))
}

export function видеоИзБайтов(байты: Uint8Array): СловоВидео | null {
  try {
    const о = JSON.parse(new TextDecoder().decode(байты)) as { а?: unknown; и?: unknown; с?: unknown }
    if (typeof о.а !== 'string' || !о.а || о.а.length > 2048) return null
    if (typeof о.и !== 'boolean') return null
    if (typeof о.с !== 'number' || !Number.isFinite(о.с) || о.с < 0 || о.с > 24 * 3600) return null
    return { а: о.а, и: о.и, с: о.с }
  } catch {
    return null
  }
}

/** Где сейчас учитель: слово плюс время, прошедшее с его прихода. */
export function гдеУчитель(слово: СловоВидео, пришло: number, сейчас: number): number {
  return слово.и ? слово.с + (сейчас - пришло) / 1000 : слово.с
}

/** Что ученику сделать со своим плеером, чтобы совпасть с учителем. */
export function догнать(
  своё: { играет: boolean; сек: number },
  слово: СловоВидео, пришло: number, сейчас: number,
): { играть: boolean | null; перемотать: number | null } {
  const надо = гдеУчитель(слово, пришло, сейчас)
  return {
    играть: своё.играет === слово.и ? null : слово.и,
    перемотать: Math.abs(своё.сек - надо) > ДОПУСК_С ? надо : null,
  }
}

/* ── плеер: одна обёртка над YouTube и над <video> ──────────────────────── */

export type Плеер = {
  /** Последнее, что плеер о себе сказал. null — ещё не заговорил. */
  состояние: { играет: boolean; сек: number } | null
  играть: () => void
  пауза: () => void
  перемотать: (сек: number) => void
  безЗвука: () => void
  соЗвуком: () => void
}

/** YouTube во встроенной рамке, по его протоколу `postMessage`
 *  (`enablejsapi=1` в адресе рамки). */
export function useЮтуб(рамка: React.RefObject<HTMLIFrameElement | null>, вкл: boolean, адрес: string): Плеер {
  const [состояние, setСостояние] = useState<Плеер['состояние']>(null)
  const сек = useRef(0)

  const послать = useCallback((func: string, args: unknown[] = []) => {
    рамка.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args, id: 1, channel: 'widget' }), '*')
  }, [рамка])

  useEffect(() => {
    if (!вкл) return
    const слушать = () => рамка.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*')
    /* Плеер внутри рамки поднимается не сразу: зовём, пока не ответит. */
    const звать = window.setInterval(слушать, 500)
    const приём = (e: MessageEvent) => {
      if (e.source !== рамка.current?.contentWindow) return
      let м: { event?: string; info?: { playerState?: number; currentTime?: number } | number }
      try { м = typeof e.data === 'string' ? JSON.parse(e.data) : e.data } catch { return }
      if (!м || typeof м !== 'object') return
      window.clearInterval(звать)
      const инфо = м.event === 'infoDelivery' && м.info && typeof м.info === 'object' ? м.info : null
      if (инфо && typeof инфо.currentTime === 'number') сек.current = инфо.currentTime
      const ps = инфо && typeof инфо.playerState === 'number' ? инфо.playerState
        : м.event === 'onStateChange' && typeof м.info === 'number' ? м.info : null
      setСостояние((было) => {
        /* 1 — идёт, 3 — догружает (считаем «идёт»); остальное — стоит. */
        const играет = ps === null ? (было?.играет ?? false) : ps === 1 || ps === 3
        if (было && было.играет === играет && Math.abs(было.сек - сек.current) < 0.25) return было
        return { играет, сек: сек.current }
      })
    }
    window.addEventListener('message', приём)
    слушать()
    return () => { window.clearInterval(звать); window.removeEventListener('message', приём); setСостояние(null) }
  }, [рамка, вкл, адрес])

  return {
    состояние,
    играть: () => послать('playVideo'),
    пауза: () => послать('pauseVideo'),
    перемотать: (с) => { послать('seekTo', [с, true]); сек.current = с },
    безЗвука: () => послать('mute'),
    соЗвуком: () => { послать('unMute'); послать('setVolume', [100]) },
  }
}

/** Прямой файл в `<video>`. */
export function useФайлВидео(видео: React.RefObject<HTMLVideoElement | null>, вкл: boolean, адрес: string): Плеер {
  const [состояние, setСостояние] = useState<Плеер['состояние']>(null)
  useEffect(() => {
    const в = видео.current
    if (!вкл || !в) return
    const снять = () => setСостояние({ играет: !в.paused && !в.ended, сек: в.currentTime })
    const события = ['play', 'pause', 'seeked', 'timeupdate', 'loadeddata', 'ended'] as const
    события.forEach((и) => в.addEventListener(и, снять))
    return () => { события.forEach((и) => в.removeEventListener(и, снять)); setСостояние(null) }
  }, [видео, вкл, адрес])
  return {
    состояние,
    играть: () => { void видео.current?.play().catch(() => undefined) },
    пауза: () => видео.current?.pause(),
    перемотать: (с) => { if (видео.current) видео.current.currentTime = с },
    безЗвука: () => { if (видео.current) видео.current.muted = true },
    соЗвуком: () => { if (видео.current) видео.current.muted = false },
  }
}

/* ── ведущий: говорит классу, что у него с роликом ───────────────────────── */

export function useВедуВидео(плеер: Плеер, адрес: string, вкл: boolean, сказать: (с: СловоВидео) => void) {
  const сказатьРеф = useRef(сказать)
  сказатьРеф.current = сказать
  const последнее = useRef<{ и: boolean; с: number; когда: number } | null>(null)
  const сост = плеер.состояние

  /* Сразу — при каждом пуске, паузе и перемотке. */
  useEffect(() => {
    if (!вкл || !сост) return
    const п = последнее.current
    const сейчас = Date.now()
    const ждали = п ? (п.и ? п.с + (сейчас - п.когда) / 1000 : п.с) : null
    const перемотал = ждали !== null && Math.abs(сост.сек - ждали) > ДОПУСК_С
    if (!п || п.и !== сост.играет || перемотал) {
      последнее.current = { и: сост.играет, с: сост.сек, когда: сейчас }
      сказатьРеф.current({ а: адрес, и: сост.играет, с: сост.сек })
    }
  }, [вкл, сост, адрес])

  /* И раз в две секунды — для опоздавших и для сверки. */
  useEffect(() => {
    if (!вкл) return
    const id = window.setInterval(() => {
      const п = последнее.current
      if (!п) return
      const с = п.и ? п.с + (Date.now() - п.когда) / 1000 : п.с
      сказатьРеф.current({ а: адрес, и: п.и, с })
    }, ПОВТОР_МС)
    return () => window.clearInterval(id)
  }, [вкл, адрес])
}

/* ── ученик: догоняет учителя ────────────────────────────────────────────── */

/** Возвращает true, если браузер не дал играть со звуком и ролик идёт
 *  без звука — тогда ученику нужна кнопка «Включить звук». */
export function useСледуюВидео(
  плеер: Плеер, адрес: string, вкл: boolean, слово: { с: СловоВидео; когда: number } | null,
): boolean {
  const [безЗвука, setБезЗвука] = useState(false)
  const плеерРеф = useRef(плеер)
  плеерРеф.current = плеер
  const словоРеф = useRef(слово)
  словоРеф.current = слово
  const просилИграть = useRef<number | null>(null)
  const перемоталВ = useRef(0)

  useEffect(() => {
    if (!вкл) return
    const шаг = () => {
      const п = плеерРеф.current
      const сл = словоРеф.current
      if (!сл || сл.с.а !== адрес || !п.состояние) return
      const сейчас = Date.now()
      const что = догнать(п.состояние, сл.с, сл.когда, сейчас)
      if (что.перемотать !== null && сейчас - перемоталВ.current > ПЕРЕМОТКА_ОТДЫХ_МС) {
        перемоталВ.current = сейчас
        п.перемотать(что.перемотать)
      }
      if (что.играть === true) {
        /* Браузер может не дать играть со звуком без нажатия: попросили
           дважды за 2,5 с и ролик стоит — играем без звука и даём кнопку. */
        if (просилИграть.current && сейчас - просилИграть.current > 2500) {
          п.безЗвука()
          setБезЗвука(true)
        }
        просилИграть.current ??= сейчас
        п.играть()
      } else if (что.играть === false) {
        п.пауза()
      }
      if (что.играть === null && п.состояние.играет === сл.с.и) просилИграть.current = null
    }
    шаг()
    const id = window.setInterval(шаг, 700)
    return () => window.clearInterval(id)
  }, [вкл, адрес])

  return вкл && безЗвука
}
