import { useCallback, useEffect, useRef, useState } from 'react'

import { Board } from '../board/Board'
import { newId } from '../board/protocol'
import { Chat, type Line } from '../room/Chat'
import { Note } from '../room/Note'
import { Shelf, type Source } from '../room/Shelf'
import { HubPick } from '../room/HubPick'
import { Live } from '../room/Live'
import { Show } from '../room/Show'
import { ShowList } from '../room/ShowList'
import { deckFrom, pickFiles } from '../room/deck'
import { allShows, dropShow, putShow, type Ink, type ShowDoc } from '../room/shows'
import { Sleepy } from '../room/Sleepy'
import { Stage } from '../room/Stage'
import { Tiles } from '../room/Tiles'
import { useEdge } from '../room/useEdge'
import { useRoom } from '../room/useRoom'
import { roomUrl } from '../lib/code'
import { Button } from '../ui/Button'
import { Mark } from '../ui/Mark'
import s from './Room.module.css'

type Props = { code: string; name: string; onLeave: () => void }

export function Room({ code, name, onLeave }: Props) {
  const { phase, error, faces, peers, bus, mic, cam, toggleMic, toggleCam, leave } = useRoom(code, name)
  const [copied, setCopied] = useState(false)
  const [source, setSource] = useState<Source>('faces')
  const [lines, setLines] = useState<Line[]>([])

  /* Показы: их несколько, они сохраняются (решение владельца 31.08, shows.ts).
     У ведущего показ живёт в `shows` + `activeId`; классу хватает `shown` —
     что видно сейчас — и пометок, приехавших по каналу. */
  const [shows, setShows] = useState<ShowDoc[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [kept, setKept] = useState(true)
  const [listOpen, setListOpen] = useState(false)
  const [shown, setShown] = useState<{ title: string; n: number; i: number; src: string | null }>({
    title: '', n: 0, i: 0, src: null,
  })
  const [wireInk, setWireInk] = useState<Record<number, Ink[]>>({})
  /* Пометки поверх трансляции. У потока нет страниц — по каналу они едут под
     номером −1 и живут до смены источника: привязать их не к чему (Live.tsx). */
  const [liveInk, setLiveInk] = useState<Ink[]>([])
  /* На какой странице остановился каждый показ: вернуться — значит вернуться туда же. */
  const pageOf = useRef(new Map<string, number>())

  const [busy, setBusy] = useState(false)
  const [hubOpen, setHubOpen] = useState(false)
  const [live, setLive] = useState<{ sourceId: string; url: string } | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const link = roomUrl(code)
  const stageRef = useRef<HTMLDivElement>(null)
  const edge = useEdge(stageRef)

  /* Ведущий в куске 1 — тот, кто открыл комнату: аккаунтов и ролей нет, роль
     считается по времени входа. Экран ученика от этого легче. */
  const iLead = faces.find((f) => f.isLocal)?.lead ?? true

  const active = shows.find((d) => d.id === activeId) ?? null

  useEffect(() => {
    allShows().then(setShows).catch(() => setShows([]))
  }, [])

  /* 🔴 Вошедшему позже надо рассказать, на что смотрит класс: доска отвечает
     на `ask` сама, а сцена, показ и трансляция — здесь. Снимок текущего — в
     ссылке, потому что подписка живёт дольше любого состояния. */
  const scene = useRef<{
    source: Source; live: typeof live; doc: ShowDoc | null; i: number; lead: boolean; liveInk: Ink[]
  }>({ source: 'faces', live: null, doc: null, i: 0, lead: false, liveInk: [] })
  scene.current = { source, live, doc: active, i: shown.i, lead: iLead, liveInk }

  useEffect(() => bus.subscribe((m) => {
    if (m.t === 'stage') setSource(m.source)
    if (m.t === 'live') {
      setLive({ sourceId: m.sourceId, url: m.url })
      setWireInk((cur) => ({ ...cur, [-1]: [] }))
    }
    if (m.t === 'showMeta') {
      setShown((cur) => {
        /* Другой показ — чужие пометки долой: они были про другие страницы. */
        if (m.title !== cur.title || m.n !== cur.n) setWireInk({})
        return { ...cur, title: m.title, n: m.n, i: m.i, src: cur.i === m.i ? cur.src : null }
      })
    }
    if (m.t === 'showPage') setShown((cur) => (m.i === cur.i ? { ...cur, src: m.src } : cur))
    if (m.t === 'ink') {
      setWireInk((cur) => {
        const page = cur[m.page] ?? []
        const has = page.some((x) => x.id === m.m.id)
        return { ...cur, [m.page]: has ? page.map((x) => (x.id === m.m.id ? m.m : x)) : [...page, m.m] }
      })
    }
    if (m.t === 'inkDel') {
      setWireInk((cur) => ({ ...cur, [m.page]: (cur[m.page] ?? []).filter((x) => !m.ids.includes(x.id)) }))
    }
    if (m.t === 'inkAll') setWireInk((cur) => ({ ...cur, [m.page]: m.marks }))
    if (m.t === 'ask') {
      const sc = scene.current
      if (!sc.lead) return
      bus.send({ t: 'stage', source: sc.source })
      if (sc.live) {
        bus.send({ t: 'live', sourceId: sc.live.sourceId, url: sc.live.url })
        bus.send({ t: 'inkAll', page: -1, marks: sc.liveInk })
      }
      if (sc.doc) {
        bus.send({ t: 'showMeta', title: sc.doc.title, n: sc.doc.pages.length, i: sc.i })
        bus.send({ t: 'showPage', i: sc.i, src: sc.doc.pages[sc.i] })
        bus.send({ t: 'inkAll', page: sc.i, marks: sc.doc.ink[sc.i] ?? [] })
      }
    }
    if (m.t === 'chat') {
      setLines((cur) => [...cur, { id: m.id, who: m.who, text: m.text, at: m.at, mine: false }])
      setUnread((n) => n + 1)
    }
  }), [bus])

  useEffect(() => {
    if (chatOpen) setUnread(0)
  }, [chatOpen, lines.length])

  /* Вошедшему позже сцену рассказывает ведущий, не дожидаясь вопроса: `ask`
     умеет задавать только смонтированная доска, а человек входит на «Лица». */
  const wasPeers = useRef(0)
  useEffect(() => {
    const sc = scene.current
    if (sc.lead && peers > wasPeers.current) {
      bus.send({ t: 'stage', source: sc.source })
      if (sc.live) {
        bus.send({ t: 'live', sourceId: sc.live.sourceId, url: sc.live.url })
        bus.send({ t: 'inkAll', page: -1, marks: sc.liveInk })
      }
      if (sc.doc) {
        bus.send({ t: 'showMeta', title: sc.doc.title, n: sc.doc.pages.length, i: sc.i })
        bus.send({ t: 'showPage', i: sc.i, src: sc.doc.pages[sc.i] })
        bus.send({ t: 'inkAll', page: sc.i, marks: sc.doc.ink[sc.i] ?? [] })
      }
    }
    wasPeers.current = peers
  }, [peers, bus])

  const pick = useCallback(
    (next: Source) => {
      setSource(next)
      bus.send({ t: 'stage', source: next })
    },
    [bus],
  )

  /* Показ ведёт учитель: страница уезжает классу по одной, когда её открыли,
     и вместе с ней — пометки этой страницы. */
  const sendPage = useCallback(
    (d: ShowDoc, i: number) => {
      pageOf.current.set(d.id, i)
      bus.send({ t: 'showMeta', title: d.title, n: d.pages.length, i })
      bus.send({ t: 'showPage', i, src: d.pages[i] })
      bus.send({ t: 'inkAll', page: i, marks: d.ink[i] ?? [] })
      setShown({ title: d.title, n: d.pages.length, i, src: d.pages[i] })
    },
    [bus],
  )

  const openShow = useCallback(
    (d: ShowDoc) => {
      setActiveId(d.id)
      setListOpen(false)
      setSource('show')
      bus.send({ t: 'stage', source: 'show' })
      sendPage(d, pageOf.current.get(d.id) ?? 0)
    },
    [bus, sendPage],
  )

  const addShow = useCallback(async () => {
    const files = await pickFiles('image/*,application/pdf')
    if (files.length === 0) return
    setBusy(true)
    const deck = await deckFrom(files)
    setBusy(false)
    if (!deck) return
    const doc: ShowDoc = { id: newId(), title: deck.title, pages: deck.pages, ink: {}, at: Date.now() }
    setShows((cur) => [doc, ...cur])
    putShow(doc).then((ok) => setKept(ok))
    openShow(doc)
  }, [openShow])

  /* Дверь «Показ» на полке: активный показ продолжается с той же страницы,
     без активного открывается список — показов может быть несколько. */
  const startShow = useCallback(async () => {
    if (active) {
      openShow(active)
      return
    }
    if (shows.length === 0) {
      await addShow()
      return
    }
    setListOpen(true)
  }, [active, shows.length, openShow, addShow])

  const step = useCallback(
    (d: number) => {
      if (!active) return
      const i = Math.min(active.pages.length - 1, Math.max(0, shown.i + d))
      if (i === shown.i) return
      sendPage(active, i)
    },
    [active, sendPage, shown.i],
  )

  /* Сохранение показа после пометки — не на каждый штрих: показ с картинками
     весит мегабайты, и писать его в хранилище раз в секунду — греть диск зря. */
  const saveSoon = useRef<number>(0)
  const scheduleSave = useCallback((doc: ShowDoc) => {
    window.clearTimeout(saveSoon.current)
    saveSoon.current = window.setTimeout(() => {
      putShow(doc).then((ok) => setKept(ok))
    }, 800)
  }, [])

  const patchInk = useCallback(
    (fn: (page: Ink[]) => Ink[], persist: boolean) => {
      if (!active) return
      const i = shown.i
      const next: ShowDoc = { ...active, ink: { ...active.ink, [i]: fn(active.ink[i] ?? []) } }
      setShows((cur) => cur.map((d) => (d.id === next.id ? next : d)))
      if (persist) scheduleSave(next)
    },
    [active, shown.i, scheduleSave],
  )

  const onMark = useCallback(
    (m: Ink, final: boolean) => {
      bus.send({ t: 'ink', page: shown.i, m })
      patchInk((page) => {
        const has = page.some((x) => x.id === m.id)
        return has ? page.map((x) => (x.id === m.id ? m : x)) : [...page, m]
      }, final)
    },
    [bus, shown.i, patchInk],
  )

  const onUndo = useCallback(() => {
    if (!active) return
    const page = active.ink[shown.i] ?? []
    const last = page[page.length - 1]
    if (!last) return
    bus.send({ t: 'inkDel', page: shown.i, ids: [last.id] })
    patchInk((cur) => cur.filter((x) => x.id !== last.id), true)
  }, [active, shown.i, bus, patchInk])

  const onWipe = useCallback(() => {
    bus.send({ t: 'inkAll', page: shown.i, marks: [] })
    patchInk(() => [], true)
  }, [bus, shown.i, patchInk])

  const removeShow = useCallback(
    (id: string) => {
      setShows((cur) => cur.filter((d) => d.id !== id))
      dropShow(id)
      if (id === activeId) {
        setActiveId(null)
        pick('faces')
      }
    },
    [activeId, pick],
  )

  /* Трансляция из HUB: источник и ссылку выбирает ведущий, класс смотрит то же.
     Пометки прежнего источника стираются: они были про другую картинку. */
  const goLive = useCallback(
    (sourceId: string, url: string) => {
      setLive({ sourceId, url })
      setLiveInk([])
      setHubOpen(false)
      setSource('live')
      bus.send({ t: 'live', sourceId, url })
      bus.send({ t: 'inkAll', page: -1, marks: [] })
      bus.send({ t: 'stage', source: 'live' })
    },
    [bus],
  )

  const onLiveMark = useCallback(
    (m: Ink, final: boolean) => {
      void final
      bus.send({ t: 'ink', page: -1, m })
      setLiveInk((cur) => {
        const has = cur.some((x) => x.id === m.id)
        return has ? cur.map((x) => (x.id === m.id ? m : x)) : [...cur, m]
      })
    },
    [bus],
  )

  const onLiveUndo = useCallback(() => {
    setLiveInk((cur) => {
      const last = cur[cur.length - 1]
      if (!last) return cur
      bus.send({ t: 'inkDel', page: -1, ids: [last.id] })
      return cur.filter((x) => x.id !== last.id)
    })
  }, [bus])

  const onLiveWipe = useCallback(() => {
    bus.send({ t: 'inkAll', page: -1, marks: [] })
    setLiveInk([])
  }, [bus])

  const say = useCallback(
    (text: string) => {
      const line = { id: newId(), who: name, text, at: Date.now() }
      setLines((cur) => [...cur, { ...line, mine: true }])
      bus.send({ t: 'chat', ...line })
    },
    [bus, name],
  )

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => undefined)
    setCopied(true)
  }

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(t)
  }, [copied])

  const quit = () => {
    leave()
    onLeave()
  }

  const alone = peers === 0 && phase === 'live'
  const marks = iLead ? (active?.ink[shown.i] ?? []) : (wireInk[shown.i] ?? [])

  return (
    <div className={s.room}>
      {/* Верхняя строка стоит всегда: где я, что за комната, идёт ли урок.
          Всё остальное управление просыпается под рукой. */}
      <header className={s.head}>
        <Mark />
        <span className={s.sep} />
        <span className={s.code}>{code}</span>
        <span className={s.live}>
          {/* ПРАВИЛА 11а: «идёт» зелёное, «связи нет» — аларм и потому коралловое. */}
          <span className={`${s.dot} ${phase === 'failed' ? s.dotAlarm : ''} ${phase === 'connecting' ? s.dotWait : ''}`} />
          {phase === 'live' ? 'идёт' : phase === 'connecting' ? 'подключаемся' : 'связи нет'}
        </span>

        {iLead ? (
          <Shelf source={source} onPick={pick} onShow={startShow} onHub={() => setHubOpen(true)} />
        ) : null}

        <button
          type="button"
          className={`${s.chatBtn} ${chatOpen ? s.chatOn : ''}`}
          onClick={() => setChatOpen((v) => !v)}
        >
          Чат
          {/* ПРАВИЛА 11.8: непрочитанное в чате ИДУЩЕГО занятия портится от ожидания —
              вопрос живёт до конца урока. Поэтому коралловая надпись, но не заливка. */}
          {unread > 0 && !chatOpen ? <span className={s.unread}>{unread}</span> : null}
        </button>
      </header>

      <div className={`${s.stage} ${chatOpen ? s.withChat : ''}`} ref={stageRef}>
        {source === 'board' ? <Board bus={bus} peers={peers} /> : null}
        {source === 'show' ? (
          <Show
            title={shown.title}
            page={shown.src}
            i={shown.i}
            n={shown.n}
            lead={iLead}
            marks={marks}
            onMark={onMark}
            onUndo={onUndo}
            onWipe={onWipe}
            canUndo={marks.length > 0}
            onShows={() => setListOpen(true)}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onClose={() => pick('faces')}
          />
        ) : null}
        {source === 'live' && live ? (
          <Live
            sourceId={live.sourceId}
            url={live.url}
            lead={iLead}
            marks={iLead ? liveInk : (wireInk[-1] ?? [])}
            onMark={onLiveMark}
            onUndo={onLiveUndo}
            onWipe={onLiveWipe}
            onClose={() => pick('faces')}
          />
        ) : null}
        {source === 'faces' ? (
          <Stage faces={faces} alone={alone} link={link} onCopy={copy} phase={phase} error={error} />
        ) : null}

        {/* ПРАВИЛА 6.3: пока страницы разбираются, сказано, что придёт первым. */}
        {busy ? (
          <div className={s.overNote}>
            <Note light title="Разбираем файл" text="Страницы готовятся прямо в браузере — на сервер файл не уезжает. Первой уедет классу та страница, которую откроете." />
          </div>
        ) : null}

        {/* Лица лежат ПОВЕРХ доски: холст под ними бесконечный и ничем не обрезан. */}
        {source !== 'faces' && phase === 'live' ? <Tiles faces={faces} /> : null}

        {/* Эфир — своя область (ПРАВИЛА 6.5): пока он не поднялся, об этом говорит
            карточка лиц, а доска продолжает работать. */}
        {source !== 'faces' && phase !== 'live' ? (
          <div className={s.overNote}>
            {phase === 'connecting' ? (
              <Note light title="Поднимаем эфир" text="Первым появится ваш кадр, потом остальные — по мере входа. Доска уже работает." />
            ) : (
              <Note
                light
                title="Эфир не поднялся"
                warn
                text={`${error} Доска работает, всё написанное на месте.`}
                action="Поднять эфир заново"
                onAction={() => window.location.reload()}
              />
            )}
          </div>
        ) : null}

        {hubOpen && iLead ? (
          <HubPick onGo={goLive} onClose={() => setHubOpen(false)} />
        ) : null}

        {listOpen && iLead ? (
          <ShowList
            shows={shows}
            activeId={activeId}
            kept={kept}
            onOpen={(id) => {
              const d = shows.find((x) => x.id === id)
              if (d) openShow(d)
            }}
            onAdd={addShow}
            onDrop={removeShow}
            onClose={() => setListOpen(false)}
          />
        ) : null}

        {chatOpen ? (
          <Chat lines={lines} onClose={() => setChatOpen(false)} onSend={say} />
        ) : null}

        {/* Пульт занятия просыпается снизу. */}
        <Sleepy side="bottom" label="микрофон · камера · выход" open={edge === 'bottom'}>
          <div className={s.pult}>
            <Button kind="quiet" onClick={toggleMic} aria-pressed={mic}>
              {mic ? 'Микрофон' : 'Микрофон выключен'}
            </Button>
            <Button kind="quiet" onClick={toggleCam} aria-pressed={cam}>
              {cam ? 'Камера' : 'Камера выключена'}
            </Button>
            {iLead ? (
              <>
                <span className={s.divider} />
                <Button kind="quiet" onClick={copy}>
                  {copied ? 'Ссылка скопирована' : 'Ссылка на комнату'}
                </Button>
              </>
            ) : null}
            <Button kind="leave" onClick={quit}>
              {iLead ? 'Завершить урок' : 'Выйти'}
            </Button>
          </div>
        </Sleepy>
      </div>
    </div>
  )
}
