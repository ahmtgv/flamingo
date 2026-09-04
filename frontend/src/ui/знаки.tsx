/** Мелкие рисованные знаки, общие для нескольких мест.
 *
 *  🔴 РИСУЕМ, А НЕ БЕРЁМ ГЛИФОМ. «↑» и «⤡» шрифтом на части машин отдают
 *  пустым квадратом — этот шрам в проекте уже есть, и закрытие чата рисуется
 *  по той же причине.
 */

/** Отправить. Стрелка вверх — как в строке ввода у Cursor (образец владельца). */
export const СТРЕЛКА = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5 M6 11l6-6 6 6" />
  </svg>
)

/** Угол размера: две короткие насечки, как на уголке окна. */
export const УГОЛ = (
  <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor"
       strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M11 5L5 11 M11 9l-2 2" />
  </svg>
)
