import { useCallback, useEffect, useState } from 'react'

import { Enter } from './screens/Enter'
import { Cabinet } from './screens/Cabinet'
import { Hub } from './screens/Hub'
import { Sign } from './screens/Sign'
import { NewPass } from './screens/NewPass'
import { Room } from './screens/Room'
import { BadLink } from './screens/BadLink'
import { NewLesson } from './screens/NewLesson'
import { Journal } from './screens/Journal'
import { Invite } from './screens/Invite'
import { Wait } from './ui/Wait'
import { codeFromPath } from './lib/code'
import { rememberName, rememberedName } from './lib/name'
import { logout, whoAmI, type Person } from './lib/auth'
import { завестиТему } from './lib/theme'

/** Экранов немного, значит и маршрутизатора не нужно: адрес — это `/`, `/вход`,
 *  `/кабинет`, `/hub` или `/r/<код>`. Библиотека появится тогда, когда экранов
 *  станет больше, а не раньше. */
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
  /* 🔴 «Ещё не спросили» и «никто не вошёл» — разные вещи, и путать их нельзя:
     пока ответа нет, показывать вход рано (см. `ui/Wait.tsx`). */
  const [узнали, setУзнали] = useState(false)
  /* Откуда человека увели ко входу. Нужно ровно для одного: вернуть его туда же.
     Пусто — возвращаться некуда, и кнопки «назад» на входе не будет. */
  const [звали, setЗвали] = useState<string | null>(null)

  useEffect(() => {
    whoAmI()
      .then((r) => setPerson(r.person))
      .catch(() => undefined)
      .finally(() => setУзнали(true))
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

  /* 🔴 ПОДМЕНА АДРЕСА БЕЗ setPath — И ЭТО НАРОЧНО. Экран уже показывает то,
     что нужно; менять `path` значило бы пересобрать его заново (ключ у
     NewLesson зависит от id) и стереть «Урок создан. Можно приложить
     материалы.». Адресу достаточно догнать экран: обновление страницы теперь
     попадёт на урок, а «Назад» не получит лишней ступеньки. */
  const подменить = useCallback((to: string) => {
    window.history.replaceState({}, '', to)
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

  /** 🔴 Куда ведёт «домой» — знак Flamingo (решение владельца 01.09). Вошедшего —
   *  в кабинет: он там и живёт. Незашедшего — ко входу: посадочной страницы,
   *  с которой всё равно некуда идти, больше нет. */
  const домой = useCallback(() => go(person ? '/кабинет' : '/вход'), [go, person])

  /** Вошёл — и сразу в кабинет. Один путь на все три двери входа. */
  const вошёл = useCallback((p: Person) => {
    setPerson(p)
    setУзнали(true)
    rememberName(p.name)
    go('/кабинет')
  }, [go])

  const кабинет = (p: Person) => (
    <Cabinet
      person={p}
      onLesson={(c) => enter(c, p.name)}
      onNew={() => go('/создать-урок')}
      onEdit={(id) => go(`/урок/${id}`)}
      onJournal={() => go('/журнал')}
      onOut={() => { out(); go('/вход') }}
      onHome={домой}
    />
  )

  /** Ключ приглашения из адреса `/у/<ключ>`. */
  const ключПриглашения = (() => {
    const m = path.match(/^\/у\/([^/]+)\/?$/)
    return m ? decodeURIComponent(m[1]) : null
  })()

  if (path === '/hub') return <Hub onBack={домой} onHome={домой} />

  /* Личный кабинет. Он ЕСТЬ только у того, кто вошёл: без учётной записи
     кабинету неоткуда взяться и нечего в нём показывать. */
  if (path === '/кабинет') {
    if (!узнали) return <Wait />
    return person ? кабинет(person) : <Sign onDone={вошёл} />
  }

  /* Создать урок или поправить заведённый — один экран, два состояния.
     Экран учительский: ученику создавать нечего. */
  if (path === '/создать-урок' || path.startsWith('/урок/')) {
    if (!узнали) return <Wait />
    if (!person || person.role !== 'teacher') return person ? кабинет(person) : <Sign onDone={вошёл} />
    const id = path.startsWith('/урок/') ? decodeURIComponent(path.slice('/урок/'.length)) : undefined
    return (
      <NewLesson
        key={id ?? 'новый'}
        person={person}
        урокId={id}
        /* Готово — возвращаемся в кабинет: он и есть расписание. */
        onDone={() => go('/кабинет')}
        onCreated={(новыйId) => подменить(`/урок/${encodeURIComponent(новыйId)}`)}
        onBack={() => go('/кабинет')}
        onOut={() => { out(); go('/вход') }}
        onHome={домой}
      />
    )
  }

  /* Журнал: ученики и занятия. Ведёт его преподаватель. */
  if (path === '/журнал') {
    if (!узнали) return <Wait />
    if (!person) return <Sign onDone={вошёл} />
    if (person.role !== 'teacher') return кабинет(person)
    return (
      <Journal
        person={person}
        onBack={() => go('/кабинет')}
        onHome={домой}
        onOut={() => { out(); go('/вход') }}
        onNew={() => go('/создать-урок')}
        onLesson={(c) => enter(c, person.name)}
      />
    )
  }

  /* Ссылка в журнал: `/у/<ключ>`. Работает и вошедшему, и пришедшему впервые. */
  if (ключПриглашения) {
    if (!узнали) return <Wait />
    return (
      <Invite
        ключ={ключПриглашения}
        person={person}
        onSign={() => { setЗвали(null); go('/вход') }}
        onDone={домой}
        onHome={домой}
      />
    )
  }

  if (path === '/новый-пароль') {
    /* Ключ из письма живёт только в адресе. Забираем его и НЕ кладём в состояние
       надолго: экран им пользуется один раз и больше он не нужен. */
    let ключ = ''
    try {
      ключ = new URLSearchParams(window.location.search).get('ключ') ?? ''
    } catch {
      ключ = ''
    }
    return <NewPass ключ={ключ} onDone={вошёл} onBack={() => go('/вход')} />
  }

  if (path === '/вход') {
    /* 🔴 «Назад» здесь есть не всегда, и это не оплошность. Ученик, пришедший
       по ссылке и нажавший «войти», возвращается к своей комнате. Человек,
       открывший `/вход` сам или только что вышедший, возвращаться некуда —
       и кнопка, ведущая на этот же экран, была бы дверью в стену (ПРАВИЛА 14.1). */
    return <Sign onDone={вошёл} onBack={звали ? () => go(`/r/${звали}`) : undefined} />
  }

  if (code && name) return <Room code={code} name={name} onLeave={leave} onHome={домой} />

  /* 🔴 Адрес начинается с `/r/`, а кода в нём нет: ссылку скопировали не целиком.
     Раньше такого человека молча уносило на посадочную страницу; её больше нет,
     и без этой ветки он попадал бы на форму входа — то есть продукт требовал бы
     регистрации там, где просто оборвалась ссылка. */
  if (!code && /^\/r\//.test(path)) {
    return <BadLink адрес={window.location.host + path} onWay={домой} вошёл={Boolean(person)} />
  }

  /* 🔴 Посадочной страницы больше нет (решение владельца 01.09): вошёл — кабинет,
     не вошёл — вход. Но ЭКРАН ПРИГЛАШЕНИЯ остаётся единственной дверью для ученика,
     пришедшего по ссылке: `/r/<код>` — «Вас ждут в комнате», имя и вход без
     регистрации. Урок по ссылке — сердце продукта, и убрать его нельзя. */
  if (!code) {
    if (!узнали) return <Wait />
    return person ? кабинет(person) : <Sign onDone={вошёл} />
  }

  return (
    <Enter
      invited={code}
      initialName={name ?? person?.name ?? rememberedName()}
      onGo={enter}
      onHub={() => go('/hub')}
      onSign={() => { setЗвали(code); go('/вход') }}
      onCabinet={() => go('/кабинет')}
      onOut={out}
      person={person}
    />
  )
}
