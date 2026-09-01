import { useCallback, useEffect, useState } from 'react'

import { Enter } from './screens/Enter'
import { Hub } from './screens/Hub'
import { Sign } from './screens/Sign'
import { NewPass } from './screens/NewPass'
import { Room } from './screens/Room'
import { codeFromPath } from './lib/code'
import { rememberName, rememberedName } from './lib/name'
import { logout, whoAmI, type Person } from './lib/auth'
import { завестиТему } from './lib/theme'

/** Двух экранов хватает, значит и маршрутизатора не нужно: адрес — это `/` или `/r/<код>`.
 *  Библиотека появится тогда, когда экранов станет больше, а не раньше. */
/** 🔴 Адрес читается ТОЛЬКО через это. Путь у нас русский — `/вход`, — а браузер
 *  отдаёт `window.location.pathname` в процентах: `/%D0%B2%D1%85%D0%BE%D0%B4`.
 *  Сравнение с литералом при этом молча не сходится, и человек, пришедший по прямой
 *  ссылке или нажавший «назад», попадал не на тот экран. Поймано живым проходом. */
const hereNow = () => {
  try {
    return decodeURIComponent(window.location.pathname)
  } catch {
    return window.location.pathname
  }
}

export function App() {
  const [path, setPath] = useState(hereNow)
  const [name, setName] = useState<string | null>(null)
  /* Кто вошёл. Спрашиваем один раз при открытии: комната по ссылке работает и без
     учётной записи, поэтому молчание сервера здесь ничего не ломает. */
  const [person, setPerson] = useState<Person | null>(null)

  useEffect(() => {
    whoAmI().then((r) => setPerson(r.person)).catch(() => undefined)
  }, [])

  /* День и ночь. Пока человек не выбрал сам — идём за системой и слушаем её. */
  useEffect(() => завестиТему(), [])

  useEffect(() => {
    const onPop = () => setPath(hereNow())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((to: string) => {
    window.history.pushState({}, '', to)
    setPath(to)
  }, [])

  const code = codeFromPath(path)

  const enter = useCallback(
    (nextCode: string, nextName: string) => {
      rememberName(nextName)
      setName(nextName)
      go(`/r/${nextCode}`)
    },
    [go],
  )

  /** Выход: кука гасится на сервере. Если сервер не ответил — всё равно забываем,
      кто вошёл, иначе человек остаётся заперт в чужой учётной записи. */
  const out = useCallback(() => {
    logout().catch(() => undefined).finally(() => setPerson(null))
  }, [])

  const leave = useCallback(() => {
    setName(null)
    go('/')
  }, [go])

  if (path === '/hub') return <Hub onBack={() => go('/')} />
  if (path === '/новый-пароль') {
    /* Ключ из письма живёт только в адресе. Забираем его и НЕ кладём в состояние
       надолго: экран им пользуется один раз и больше он не нужен. */
    let ключ = ''
    try {
      ключ = new URLSearchParams(window.location.search).get('ключ') ?? ''
    } catch {
      ключ = ''
    }
    return (
      <NewPass
        ключ={ключ}
        onDone={(p) => {
          setPerson(p)
          rememberName(p.name)
          go('/')
        }}
        onBack={() => go('/')}
      />
    )
  }
  if (path === '/вход') {
    return (
      <Sign
        onDone={(p) => {
          setPerson(p)
          rememberName(p.name)
          go('/')
        }}
        onBack={() => go('/')}
      />
    )
  }
  if (code && name) return <Room code={code} name={name} onLeave={leave} />
  return (
    <Enter
      invited={code}
      initialName={name ?? person?.name ?? rememberedName()}
      onGo={enter}
      onHub={() => go('/hub')}
      onSign={() => go('/вход')}
      onOut={out}
      person={person}
    />
  )
}
