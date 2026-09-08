import { useEffect, useRef } from 'react'

/** Окно поверх урока: Escape закрывает, фокус входит внутрь и не уходит наружу,
 *  а при закрытии возвращается туда, откуда пришёл.
 *
 *  🔴 ЗАЧЕМ. Аудит 07.09, находка 11: окна поверх не забирали фокус. Escape не
 *  закрывал, под вуалью всё оставалось живым, и человеку с клавиатурой до
 *  выхода из панели пособий было 36 нажатий Tab — он уходил в доску под
 *  вуалью, ничего не понимая. Это не про «доступность вообще»: посреди урока
 *  так теряется минута, а окно продолжает стоять.
 *
 *  Хук держит три вещи и больше ничего:
 *  1. Escape закрывает — и останавливает всплытие, чтобы не закрылось ещё и
 *     то, что под окном.
 *  2. Tab ходит по кругу внутри окна.
 *  3. Фокус входит внутрь при открытии и возвращается на прежнее место при
 *     закрытии.
 *
 *  Обработчик стоит на фазе перехвата: окно старше того, что под ним.
 */

const ФОКУСИРУЕМЫЕ =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function видимый(e: HTMLElement): boolean {
  const r = e.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/** `включено` — для окон, которые живут в родителе и лишь показываются: хук
 *  вызывается всегда (правило хуков), а работает только пока окно на экране.
 *  Без этого фокус ловился бы и тогда, когда ловить нечего. */
export function useПоверх<T extends HTMLElement>(закрыть: () => void, включено = true) {
  const узелRef = useRef<T>(null)
  /* 🔴 Обработчик берём через ref, а не из зависимостей: `закрыть` у панелей
     новая на каждый отрисовке, и эффект перезапускался бы, каждый раз
     вбрасывая фокус в начало окна — прямо посреди набора текста. */
  const закрытьRef = useRef(закрыть)
  закрытьRef.current = закрыть

  useEffect(() => {
    if (!включено) return
    const узел = узелRef.current
    const откуда = document.activeElement as HTMLElement | null

    const внутри = () =>
      [...(узел?.querySelectorAll<HTMLElement>(ФОКУСИРУЕМЫЕ) ?? [])].filter(видимый)

    const первый = внутри()[0]
    ;(первый ?? узел)?.focus?.()

    const наКлавишу = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        закрытьRef.current()
        return
      }
      if (e.key !== 'Tab' || !узел) return
      const цели = внутри()
      if (!цели.length) return
      const первая = цели[0]
      const последняя = цели[цели.length - 1]
      const где = document.activeElement
      if (!узел.contains(где)) {
        e.preventDefault()
        первая.focus()
        return
      }
      if (!e.shiftKey && где === последняя) {
        e.preventDefault()
        первая.focus()
      } else if (e.shiftKey && где === первая) {
        e.preventDefault()
        последняя.focus()
      }
    }

    document.addEventListener('keydown', наКлавишу, true)
    return () => {
      document.removeEventListener('keydown', наКлавишу, true)
      /* Возвращаем фокус туда, откуда пришли, — но только если то место ещё
         на странице: иначе фокус улетает на body и клавиатура теряет место. */
      if (откуда && document.contains(откуда)) откуда.focus?.()
    }
  }, [включено])

  return узелRef
}
