import { useState } from 'react'

import type { Person } from '../lib/auth'
import s from './Вход.module.css'

type Props = {
  /** Код из адреса. Он здесь ВСЕГДА: без кода этого экрана не бывает. */
  invited: string
  initialName: string
  onGo: (code: string, name: string) => void
  onHub: () => void
  onSign: () => void
  onCabinet: () => void
  onOut: () => void
  /** Кто вошёл. Урок по ссылке работает и без учётной записи. */
  person: Person | null
}

/** Вход — первый экран на языке ПЕРГАМЕНТА (решение владельца 03.09).
 *
 *  🔴 СОДЕРЖАНИЕ НЕ ТРОНУТО. Те же слова, тот же порядок, те же состояния,
 *  что у `screens/Enter.tsx`: две колонки — слева обещание, справа одно
 *  действие; место под сообщение занято всегда и ровно в три строки; дверь
 *  учётной записи — строка под вопросом, а не третья кнопка в столбик.
 *  Менялся ЯЗЫК, а не смысл: правила о смысле переодеваются, но не
 *  выбрасываются (docs/ПЕРГАМЕНТ.md, шаг 02).
 *
 *  🔴 ПОЧЕМУ СВОИ КНОПКА И ПОЛЕ, А НЕ `ui/Button` И `ui/Field`. Общий
 *  компонент нельзя перекрасить, не тронув экраны, до которых очередь не
 *  дошла, — а переход идёт ПО ОДНОМУ экрану (§3а). Городить в общем модуле
 *  ветку «а если пергамент» — значит держать два закона в одном файле и
 *  проверять оба каждой правкой. Здесь у нового закона свои маленькие
 *  контролы; они растут по мере перевода экранов, а старые доживают на
 *  непереведённых и удаляются последними.
 *
 *  🔴 ЗАЛИВКА БЕРЁТ ЧЕРНИЛА, А НЕ УГОЛЁК. У этого языка уголёк — ТЕКСТ:
 *  ссылки и короткие выделенные слова. Единственная заливка экрана —
 *  «Войти в комнату», и она чернильная. Караул `уголёкНеПоверхность` мерит
 *  это числом: угольковых заливок должно быть ноль.
 */
export function Вход({ invited, initialName, onGo, onHub, onSign, onCabinet, onOut, person }: Props) {
  const [имя, setИмя] = useState(initialName)
  const [сказано, setСказано] = useState(false)

  const войти = () => {
    const чисто = имя.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!чисто) {
      setСказано(true)
      return
    }
    onGo(invited, чисто)
  }

  const знак = (
    <>
      <img className={s.птица} src="/flamingo-bird.svg" alt="" width={23} height={23} aria-hidden />
      <span className={s.слово}>flamingo<span className={s.точка}>.</span></span>
    </>
  )

  return (
    <main className={s.экран} data-язык="пергамент">
      <header className={s.верх}>
        {person ? (
          <button type="button" className={s.знакДверь} onClick={onCabinet} aria-label="На главную">{знак}</button>
        ) : (
          <span className={s.знак}>{знак}</span>
        )}
        <span className={s.зазор} />
        <button type="button" className={s.верхняяСсылка} onClick={onHub}>Flamingo HUB</button>
        {person ? (
          <>
            <button type="button" className={s.верхняяСсылка} onClick={onCabinet}>
              {person.role === 'teacher' ? 'Кабинет' : 'Мой учебный кабинет'}
            </button>
            <span className={s.кто}>
              {person.name} · <button type="button" className={s.выйти} onClick={onOut}>Выйти</button>
            </span>
          </>
        ) : null}
      </header>

      <div className={s.тело} data-geo="кадр-первой-страницы">
        {/* Левая колонка — обещание. Вес несёт кегль и трекинг, а не полужирный. */}
        <section className={s.обещание}>
          <h1 className={s.заголовок}>Вас ждут в комнате</h1>
          <p className={s.подзаголовок}>Назовитесь — и входите. Ни регистрации, ни установки.</p>

          <span className={s.черта} />
          {/* Слова владельца, 31.08. */}
          <span className={s.трое}>
            лицо<span className={s.разделитель}>·</span>голос<span className={s.разделитель}>·</span>аналитика
          </span>

          <p className={s.сноска}>
            В комнате включаются камера и микрофон — браузер спросит разрешение. Урок не
            записывается, а доска живёт, пока в комнате есть хоть один человек: чтобы она
            осталась после урока, её сохраняют в файл.
          </p>
        </section>

        {/* Правая колонка — одно действие. */}
        <section className={s.карточка}>
          <code className={s.код}>{invited}</code>

          <form className={s.форма} onSubmit={(e) => { e.preventDefault(); войти() }}>
            <div className={s.поле}>
              <label className={s.метка} htmlFor="имя-входа">Как вас зовут</label>
              <input
                id="имя-входа"
                className={s.ввод}
                placeholder="Например, Аня"
                value={имя}
                maxLength={40}
                autoFocus
                onChange={(e) => { setИмя(e.target.value); setСказано(false) }}
              />
              <span className={s.подсказка}>Под этим именем вас увидит класс. Без него войти нельзя.</span>
            </div>

            {/* Место под сообщение занято ВСЕГДА и ровно в три строки (ПРАВИЛА 6.6):
                иначе появление отказа сдвигает кнопку, и человек нажимает не туда. */}
            <div className={s.речь} data-geo="строка-сообщения" role="status">
              {сказано ? (
                <>
                  <span className={s.речьГлава}>Сначала имя</span>
                  <span className={s.речьТело}>
                    Без имени класс не поймёт, кто открыл комнату. Одного слова достаточно.
                  </span>
                </>
              ) : null}
            </div>

            <button type="submit" className={s.главное} data-geo="главное-действие">Войти в комнату</button>
          </form>

          {person ? null : (
            <p className={s.вопрос}>
              Уже есть учётная запись?{' '}
              <button type="button" className={s.ссылка} onClick={onSign}>
                Войти или завести учётную запись
              </button>
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
