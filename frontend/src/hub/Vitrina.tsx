import s from './Vitrina.module.css'

/** Витрина: чужая страница, показанная У НАС, а не в новой вкладке.
 *
 *  🔴 Решение Аделя 31.08: все ссылки из HUB открываются в самом занятии.
 *  Поэтому мы больше не решаем ЗА браузер, что встроится, а что нет: рамка
 *  ставится всегда и пробует показать.
 *
 *  🔴 Но соврать тут нельзя. Чужой сайт вправе запретить показ внутри чужой рамки
 *  (X-Frame-Options, frame-ancestors), и очень многие запрещают. Снаружи мы этого
 *  НЕ ВИДИМ: браузер не даёт заглянуть в чужую рамку и не говорит, что там пусто.
 *  Значит единственная честная вещь — сказать заранее, что делать, если пусто,
 *  и держать адрес под рукой. Строка стоит всегда, а не появляется по ошибке
 *  (ПРАВИЛА 6.6): иначе макет прыгает ровно в ту секунду, когда человек растерян.
 */
export function Vitrina({ url, name, кратко = false }: {
  url: string
  name: string
  /** Тесное место — окно источника или браузер каталога, где адрес уже назван
   *  рядом: подпись под рамкой сжимается в одну строку. Смысл тот же. */
  кратко?: boolean
}) {
  let host = url
  try {
    host = new URL(url).host
  } catch {
    host = url
  }
  return (
    <div className={s.box}>
      <iframe
        className={s.frame}
        src={url}
        title={name}
        allow="autoplay; fullscreen; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"
      />
      {кратко ? (
        <div className={s.brief}>
          <span className={s.why}>Пусто? Значит сайт запрещает показ внутри рамки — это его право.</span>
          <a className={s.external} href={url} target="_blank" rel="noopener noreferrer">
            Открыть в новой вкладке ↗
          </a>
        </div>
      ) : (
        <div className={s.foot}>
          <span className={s.host}>{host}</span>
          <a className={s.external} href={url} target="_blank" rel="noopener noreferrer">
            Открыть источник в новой вкладке ↗
          </a>
          <span className={s.why}>
            Пусто? Значит сайт запрещает показ у себя внутри рамки — это его право,
            а не наша поломка. Покажите его экраном или дайте адрес классу.
          </span>
        </div>
      )}
    </div>
  )
}
