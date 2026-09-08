/** Мелкие рисованные знаки, общие для нескольких мест.
 *
 *  🔴 ТОЛЩИНА ШТРИХА — ОДНА НА ВСЕ ЗНАКИ, И СЧИТАЕТСЯ В ПИКСЕЛЯХ ЭКРАНА.
 *  Знаки нарисованы в разных системах координат (24 единицы при 18 px, 12 при
 *  12) — при одном и том же `strokeWidth` они выходили разной толщины, а при
 *  разном сходились случайно. Померено 08.09: 1,20 · 1,27 · 1,27 · 1,40 · 1,50 —
 *  пять волосков в одном интерфейсе. `vector-effect="non-scaling-stroke"`
 *  снимает пересчёт: 1,4 значит 1,4 на экране, какой бы ни была рамка. Аудит
 *  07.09, находка 42.
 *
 *  🔴 РИСУЕМ, А НЕ БЕРЁМ ГЛИФОМ. «↑» и «⤡» шрифтом на части машин отдают
 *  пустым квадратом — этот шрам в проекте уже есть, и закрытие чата рисуется
 *  по той же причине.
 */

/** Отправить. Стрелка вверх — как в строке ввода у Cursor (образец владельца). */
export const СТРЕЛКА = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5 M6 11l6-6 6 6" />
  </svg>
)

/** Угол размера: две короткие насечки, как на уголке окна. */
export const УГОЛ = (
  <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor"
       strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" aria-hidden="true">
    <path d="M11 5L5 11 M11 9l-2 2" />
  </svg>
)
