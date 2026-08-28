import { useCallback, useEffect, useState } from 'react'

import { Enter } from './screens/Enter'
import { Room } from './screens/Room'
import { codeFromPath } from './lib/code'
import { rememberName, rememberedName } from './lib/name'

/** Двух экранов хватает, значит и маршрутизатора не нужно: адрес — это `/` или `/r/<код>`.
 *  Библиотека появится тогда, когда экранов станет больше, а не раньше. */
export function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [name, setName] = useState<string | null>(null)

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

  if (code && name) return <Room code={code} name={name} onLeave={leave} />
  return <Enter invited={code} initialName={name ?? rememberedName()} onGo={enter} />
}
