import s from './Note.module.css'

/** Сообщение ВНУТРИ своей области, а не карточкой поверх всего кадра.
 *
 *  ПРАВИЛА 6.5: комната собирается из двух независимых источников — эфир и доска.
 *  Карточка поверх кадра врала бы, будто не работает ничего: доска в это время
 *  работает, и написанное на ней цело. 6.5а требует назвать три вещи —
 *  что работает, что нет, что с данными.
 */
export function Note({
  title, text, warn = false, code, action, onAction, light = false,
}: {
  title: string
  text: string
  warn?: boolean
  code?: string
  action?: string
  onAction?: () => void
  /** Карточка лежит на светлом холсте, а не на тёмном видео: пара цветов другая.
   *  Тёмная карточка на белой доске читалась как выцветшая (проба 30.08). */
  light?: boolean
}) {
  return (
    <div className={`${s.note} ${light ? s.light : ''}`} role="status">
      <span className={s.title}>{title}</span>
      <span className={`${s.text} ${warn ? s.warn : ''}`}>{text}</span>
      {code ? <code className={s.code}>{code}</code> : null}
      {action && onAction ? (
        <button type="button" className={s.act} onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  )
}
