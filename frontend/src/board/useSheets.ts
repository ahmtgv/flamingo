import { useCallback, useEffect, useRef, useState } from 'react'

import { newId, type Bus, type Msg, type Obj, type Sheet, type Stroke } from './protocol'

/** Досок в комнате может быть несколько; открыта у всех одна и та же.
 *
 *  🔴 Состояние живёт в ссылке, а не в состоянии React: штрих приходит по сорок раз
 *  в секунду, и перерисовывать всё дерево на каждую точку — верный способ уронить
 *  доску на тридцати участниках. React узнаёт о переменах отдельной «версией».
 */
export function useSheets(bus: Bus, peers: number) {
  const sheets = useRef<Sheet[]>([{ id: 'first', name: 'Доска 1', strokes: [], objs: [] }])
  const [active, setActive] = useState('first')
  const [version, bump] = useState(0)
  const activeRef = useRef(active)
  activeRef.current = active

  const touch = useCallback(() => bump((v) => v + 1), [])

  const sheet = useCallback(
    (id?: string) => sheets.current.find((s) => s.id === (id ?? activeRef.current)) ?? sheets.current[0],
    [],
  )

  /* ── что приходит с той стороны ─────────────────────────────────────────── */

  const apply = useCallback(
    (m: Msg) => {
      if (m.t === 'ask') {
        bus.send({ t: 'state', sheets: sheets.current, active: activeRef.current })
        return
      }
      if (m.t === 'state') {
        if (m.sheets.length === 0) return
        sheets.current = m.sheets
        setActive(m.sheets.some((s) => s.id === m.active) ? m.active : m.sheets[0].id)
        touch()
        return
      }
      if (m.t === 'sheetState') {
        const i = sheets.current.findIndex((x) => x.id === m.sheet.id)
        if (i >= 0) sheets.current[i] = m.sheet
        else sheets.current.push(m.sheet)
        touch()
        return
      }
      if (m.t === 'sheets') {
        // Список досок ведёт тот, кто переключил. Содержимое чужих досок не трогаем:
        // оно приедет с их автором, а пустая заглушка нужна, чтобы вкладка была видна.
        const next = m.sheets.map(
          (s) => sheets.current.find((x) => x.id === s.id) ?? { ...s, strokes: [], objs: [] },
        )
        sheets.current = next.map((s) => ({
          ...s,
          name: m.sheets.find((x) => x.id === s.id)?.name ?? s.name,
        }))
        setActive(m.active)
        touch()
        return
      }
      // Что показывают классу, пометки показа и чат — не дело доски: этим ведает комната.
      if (
        m.t === 'stage' || m.t === 'chat' || m.t === 'showMeta' || m.t === 'showPage' ||
        m.t === 'live' || m.t === 'ink' || m.t === 'inkDel' || m.t === 'inkAll'
      ) return
      const sh = sheet(m.sheet)
      if (!sh) return
      if (m.t === 'seg') {
        const cur = sh.strokes.find((s) => s.id === m.id)
        if (cur) cur.pts.push(...m.pts)
        else sh.strokes.push({ id: m.id, color: m.color, width: m.width, pts: [...m.pts] })
      } else if (m.t === 'erase') {
        sh.strokes = sh.strokes.filter((s) => !m.ids.includes(s.id))
        sh.objs = sh.objs.filter((o) => !m.ids.includes(o.id))
      } else if (m.t === 'clear') {
        sh.strokes = []
        sh.objs = []
      } else if (m.t === 'obj') {
        const i = sh.objs.findIndex((o) => o.id === m.o.id)
        if (i >= 0) sh.objs[i] = m.o
        else sh.objs.push(m.o)
      } else if (m.t === 'objdel') {
        sh.objs = sh.objs.filter((o) => !m.ids.includes(o.id))
      } else if (m.t === 'docPage') {
        const o = sh.objs.find((x) => x.id === m.id)
        if (o && o.kind === 'doc') o.page = m.page
      }
      touch()
    },
    [bus, sheet, touch],
  )

  useEffect(() => bus.subscribe(apply), [bus, apply])

  /* Вошедший спрашивает доску у того, кто уже внутри. Спрашивает только тот, кому
     нечего показать: иначе двое переписали бы друг другу свои же штрихи. */
  const asked = useRef(false)
  useEffect(() => {
    const empty = sheets.current.every((s) => s.strokes.length === 0 && s.objs.length === 0)
    if (peers > 0 && !asked.current && empty) {
      asked.current = true
      bus.send({ t: 'ask' })
    }
    if (peers === 0) asked.current = false
  }, [peers, bus])

  /* ── что делаем сами ────────────────────────────────────────────────────── */

  const announce = useCallback(() => {
    bus.send({
      t: 'sheets',
      sheets: sheets.current.map((s) => ({ id: s.id, name: s.name })),
      active: activeRef.current,
    })
  }, [bus])

  const addSheet = useCallback(() => {
    const id = newId()
    sheets.current = [...sheets.current, { id, name: `Доска ${sheets.current.length + 1}`, strokes: [], objs: [] }]
    setActive(id)
    activeRef.current = id
    touch()
    announce()
    return id
  }, [announce, touch])

  const openSheet = useCallback(
    (id: string) => {
      setActive(id)
      activeRef.current = id
      touch()
      announce()
    },
    [announce, touch],
  )

  const putObj = useCallback(
    (o: Obj, quiet = false) => {
      const sh = sheet()
      const i = sh.objs.findIndex((x) => x.id === o.id)
      if (i >= 0) sh.objs[i] = o
      else sh.objs.push(o)
      touch()
      if (!quiet) bus.send({ t: 'obj', sheet: sh.id, o })
    },
    [bus, sheet, touch],
  )

  /** Перелистнуть документ. Соседу уезжает НОМЕР страницы, а не документ целиком:
   *  страницы весят сотни килобайт, и пересылать их ради номера — минута молчания
   *  у всего класса (тот же расчёт, что у показа в `room/deck.ts`). */
  const turnDoc = useCallback(
    (id: string, page: number) => {
      const sh = sheet()
      const o = sh.objs.find((x) => x.id === id)
      if (!o || o.kind !== 'doc') return
      const n = Math.min(o.pages.length - 1, Math.max(0, page))
      if (n === o.page) return
      o.page = n
      touch()
      bus.send({ t: 'docPage', sheet: sh.id, id, page: n })
    },
    [bus, sheet, touch],
  )

  const dropObj = useCallback(
    (ids: string[]) => {
      const sh = sheet()
      sh.objs = sh.objs.filter((o) => !ids.includes(o.id))
      touch()
      bus.send({ t: 'objdel', sheet: sh.id, ids })
    },
    [bus, sheet, touch],
  )

  const addStroke = useCallback((st: Stroke) => {
    sheet().strokes.push(st)
    touch()
  }, [sheet, touch])

  const eraseIds = useCallback(
    (ids: string[]) => {
      const sh = sheet()
      sh.strokes = sh.strokes.filter((s) => !ids.includes(s.id))
      sh.objs = sh.objs.filter((o) => !ids.includes(o.id))
      touch()
      bus.send({ t: 'erase', sheet: sh.id, ids })
    },
    [bus, sheet, touch],
  )

  const wipe = useCallback(() => {
    const sh = sheet()
    sh.strokes = []
    sh.objs = []
    touch()
    bus.send({ t: 'clear', sheet: sh.id })
  }, [bus, sheet, touch])

  /** Заменить лист целиком — этим уезжает отмена и возврат. */
  const replaceSheet = useCallback(
    (next: Sheet, quiet = false) => {
      const i = sheets.current.findIndex((x) => x.id === next.id)
      if (i >= 0) sheets.current[i] = next
      else sheets.current.push(next)
      touch()
      if (!quiet) bus.send({ t: 'sheetState', sheet: next })
    },
    [bus, touch],
  )

  /** Открыть сохранённый файл: он заменяет ВСЕ доски у всех, кто в комнате. */
  const loadAll = useCallback(
    (list: Sheet[]) => {
      if (list.length === 0) return
      sheets.current = list
      setActive(list[0].id)
      activeRef.current = list[0].id
      touch()
      bus.send({ t: 'state', sheets: list, active: list[0].id })
    },
    [bus, touch],
  )

  return {
    sheets: sheets.current,
    sheet: sheet(),
    active,
    version,
    addSheet,
    openSheet,
    putObj,
    turnDoc,
    dropObj,
    addStroke,
    eraseIds,
    wipe,
    loadAll,
    replaceSheet,
    touch,
  }
}
