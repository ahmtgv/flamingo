import s from './Show.module.css'
import { Note } from './Note'

/** Что учитель показывает классу: картинка или страница презентации.
 *
 *  Листает только ведущий — класс смотрит туда же, куда он. Иначе «смотрите сюда»
 *  перестаёт означать одно и то же для всех.
 */
export function Show({
  title, page, i, n, lead, onPrev, onNext, onClose,
}: {
  title: string
  page: string | null
  i: number
  n: number
  lead: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  return (
    <div className={s.show}>
      {page ? (
        <img className={s.page} src={page} alt={`${title}, страница ${i + 1} из ${n}`} />
      ) : (
        /* ПРАВИЛА 6.3: загрузка говорит, что придёт первым, и не мигает пустотой. */
        <Note
          title="Страница едет"
          text={`${title} · страница ${i + 1} из ${n}. Каждая страница уезжает классу отдельно —
            так канал остаётся свободным для голоса.`}
        />
      )}

      {n > 0 ? (
        <div className={s.pult} data-pult="показ">
          <span className={s.title}>{title}</span>
          <span className={s.count}>
            {i + 1} из {n}
          </span>
          {lead ? (
            <>
              <button type="button" className={s.btn} onClick={onPrev} disabled={i === 0}>
                ←
              </button>
              <button type="button" className={s.btn} onClick={onNext} disabled={i >= n - 1}>
                →
              </button>
              <span className={s.sep} />
              <button type="button" className={s.stop} onClick={onClose}>
                Закончить показ
              </button>
            </>
          ) : (
            <span className={s.follow}>листает преподаватель</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
