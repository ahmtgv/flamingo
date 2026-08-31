import { useCallback, useEffect, useState } from 'react'

import { Enter } from './screens/Enter'
import { Hub } from './screens/Hub'
import { Sign } from './screens/Sign'
import { Room } from './screens/Room'
import { codeFromPath } from './lib/code'
import { rememberName, rememberedName } from './lib/name'
import { whoAmI, type Person } from './lib/auth'

/** Двух экранов хватает, значит и маршрутизатора не нужно: адрес — это `/` или `/r/<код>`.
 *  Библиотека появится тогда, когда экранов станет больше, а не раньше. */
export function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [name, setName] = useState<string | null>(null)
  /* Кто вошёл. Спрашиваем один раз при открытии: комната по ссылке работает и без
     учётной записи, поэтому молчание сервера здесь ничего не ломает. */
  const [person, setPerson] = useState<Person | null>(null)

  useEffect(() => {
    whoAmI().then((r) => setPerson(r.person)).catch(() => undefined)
  }, [])

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
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

  const leave = useCallback(() => {
    setName(null)
    go('/')
  }, [go])

  if (path === '/hub') return <Hub onBack={() => go('/')} />
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
      person={person}
    />
  )
}
