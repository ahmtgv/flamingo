/** SEduM · слух учителя: русская речь → текст, прямо в его браузере.
 *
 *  Нужен режиму «пишем» (`room/пишем.ts`): учитель говорит «запишите в
 *  тетрадь» — и класс над тетрадями не теряет балл. Решение владельца 09.10:
 *  распознавать в браузере, на устройстве учителя, а в приложении — позже.
 *
 *  🔴 ГОЛОС НИКУДА НЕ УХОДИТ. Vosk (Apache 2.0) работает в отдельном потоке
 *  страницы (Web Worker, WebAssembly), модель русской речи лежит на нашем же
 *  сайте. Ни звук, ни текст не уходят ни на наш сервер, ни к Google или Apple:
 *  наружу из всей этой работы выходит одно слово — «пишем» или «не пишем».
 *
 *  🔴 МОДЕЛЬ — КУСКАМИ. Cloudflare не отдаёт файлы больше 25 МБ, а маленькая
 *  русская модель весит около 45 МБ. Поэтому на сайте лежат куски по 20 МБ и
 *  опись `vosk-ru.json`; здесь куски склеиваются обратно в один архив.
 *  Браузер кэширует куски сам — второй урок модель не качает заново.
 *
 *  Слушаем только у ведущего, только при включённом опыте (`?внимание=1`) и
 *  только пока его микрофон включён: выключил микрофон — слух молчит.
 */
import { useEffect, useRef, useState } from 'react'

export type Слух = 'выключен' | 'заводим' | 'слушает' | 'не завёлся'

/** Опись кусков модели: `{ "части": ["vosk-ru.tar.gz.part-aa", …] }`. */
export const ОПИСЬ_РЕЧИ = '/модели/vosk-ru.json'

type Модель = Awaited<ReturnType<typeof import('vosk-browser')['createModel']>>

async function собратьМодель(): Promise<string> {
  const о = await fetch(ОПИСЬ_РЕЧИ, { cache: 'no-cache' })
  /* Описи нет — сервер сайта отдаёт вместо неё страницу (html): «200» тут ничего не значит. */
  if (!о.ok || (о.headers.get('content-type') ?? '').includes('text/html')) throw new Error('нет описи модели речи')
  const { части } = (await о.json()) as { части?: unknown }
  if (!Array.isArray(части) || !части.length || !части.every((ч) => typeof ч === 'string' && /^[\w.-]+$/.test(ч))) {
    throw new Error('опись модели речи повреждена')
  }
  const куски = await Promise.all(части.map(async (имя) => {
    const r = await fetch(`/модели/${имя}`)
    if (!r.ok || (r.headers.get('content-type') ?? '').includes('text/html')) throw new Error(`нет куска ${имя}`)
    return r.blob()
  }))
  return URL.createObjectURL(new Blob(куски, { type: 'application/gzip' }))
}

/** Слушает микрофон учителя и отдаёт каждую распознанную фразу в `onФраза`. */
export function useСлух(микрофон: MediaStreamTrack | undefined, вкл: boolean, onФраза: (текст: string, t: number) => void): Слух {
  const [слух, setСлух] = useState<Слух>('выключен')
  const [модель, setМодель] = useState<Модель | null>(null)
  const обработчик = useRef(onФраза)
  обработчик.current = onФраза

  /* Модель — лениво и один раз за урок: заводится, когда включили, и
     глушится, когда выключили. */
  useEffect(() => {
    if (!вкл) { setСлух('выключен'); return }
    let живо = true
    let м: Модель | null = null
    let адрес = ''
    setСлух('заводим')
    ;(async () => {
      try {
        const vosk = await import('vosk-browser')
        адрес = await собратьМодель()
        м = await vosk.createModel(адрес, -1)
        if (!живо) { м.terminate(); return }
        setМодель(м)
      } catch {
        /* Модели нет или браузер не справился — режим «пишем» остаётся на
           головах класса. Урок от этого не страдает. */
        if (живо) setСлух('не завёлся')
      }
    })()
    return () => {
      живо = false
      м?.terminate()
      if (адрес) URL.revokeObjectURL(адрес)
      setМодель(null)
    }
  }, [вкл])

  /* Микрофон → распознаватель. Живёт, пока есть и модель, и микрофон. */
  useEffect(() => {
    if (!вкл || !модель || !микрофон || микрофон.readyState === 'ended') return
    const звук = new AudioContext()
    const источник = звук.createMediaStreamSource(new MediaStream([микрофон]))
    /* ScriptProcessor устарел, но работает везде, включая Safari, и его ждёт
       Vosk. Выход глушим: звук учителя не должен играть у него же. */
    const узел = звук.createScriptProcessor(4096, 1, 1)
    const тишина = звук.createGain()
    тишина.gain.value = 0
    const распознаватель = new модель.KaldiRecognizer(звук.sampleRate)
    распознаватель.on('result', (сообщение) => {
      const текст = (сообщение as { result?: { text?: string } }).result?.text ?? ''
      if (текст.trim()) обработчик.current(текст, Date.now())
    })
    узел.onaudioprocess = (e) => {
      try { распознаватель.acceptWaveform(e.inputBuffer) } catch { /* кусок не принят — следующий примется */ }
    }
    источник.connect(узел)
    узел.connect(тишина)
    тишина.connect(звук.destination)
    setСлух('слушает')
    /* Без нажатия браузер может держать звук приостановленным: будим на
       первом же нажатии по странице. */
    const разбудить = () => { if (звук.state !== 'running') void звук.resume().catch(() => undefined) }
    разбудить()
    window.addEventListener('pointerdown', разбудить)
    return () => {
      window.removeEventListener('pointerdown', разбудить)
      узел.onaudioprocess = null
      источник.disconnect()
      узел.disconnect()
      тишина.disconnect()
      try { распознаватель.remove() } catch { /* уже снят */ }
      void звук.close().catch(() => undefined)
    }
  }, [вкл, модель, микрофон])

  return вкл ? слух : 'выключен'
}
