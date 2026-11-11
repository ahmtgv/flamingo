/* Страница посредника. Живёт в рамке «Источников мира» и открывает один
   источник из каталога — по имени, которое стоит в адресе после решётки:
   https://hub.flamingo.plus/#met

   🔴 ОТКРЫВАЕМ ТОЛЬКО ПО ИМЕНИ ИЗ КАТАЛОГА, А НЕ ПО АДРЕСУ. Ссылка вида
   «hub.flamingo.plus/#https://чужой-сайт» показывала бы под нашим именем что
   угодно. Имени в каталоге нет — ничего не открываем. Дальше человек ходит по
   ссылкам самого источника, как в обычном браузере.

   С «Источниками» страница говорит сообщениями: сюда приходят «назад» и
   «обновить», отсюда уходит адрес открытой сейчас страницы. */
(async () => {
  const слова = document.getElementById('слова')
  const сказать = (текст, ссылка) => {
    слова.hidden = false
    слова.textContent = текст
    if (ссылка) {
      const а = document.createElement('a')
      а.href = ссылка; а.target = '_blank'; а.rel = 'noopener noreferrer'; а.textContent = ' Открыть в новой вкладке ↗'
      слова.append(а)
    }
  }
  const родителю = (д) => { try { window.parent.postMessage({ flamingoHub: true, ...д }, '*') } catch { /* родителя нет */ } }

  const имя = decodeURIComponent(location.hash.slice(1))
  let источник
  try { источник = (await (await fetch('/sources.json')).json())[имя] } catch { /* ниже */ }
  if (!источник) { сказать('Такого источника в каталоге нет.'); return }

  if (!('serviceWorker' in navigator)) { сказать('Этот браузер не умеет открывать источник здесь.', источник.home); return }

  let вошёл = false
  try { вошёл = (await (await fetch('/я')).json()).вошёл } catch { /* ниже */ }
  if (!вошёл) { сказать('Войдите во Flamingo — и источник откроется прямо здесь.', источник.home); return }

  try {
    /* 🔴 СНАЧАЛА ДВИЖОК, ПОТОМ РАБОТНИК. Движок при запуске заводит своё
       хранилище настроек; работник, проснувшийся раньше, открыл бы его пустым
       и навсегда оставил без таблиц — источник тогда не открывается вовсе. */
    const { ScramjetController } = $scramjetLoadController()
    const движок = new ScramjetController({
      files: { wasm: '/scram/scramjet.wasm.wasm', all: '/scram/scramjet.all.js', sync: '/scram/scramjet.sync.js' },
    })
    await движок.init()

    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    /* Первый заход: работник ещё не взял страницу под управление — ждём. */
    if (!navigator.serviceWorker.controller) {
      await new Promise((готово) => {
        navigator.serviceWorker.addEventListener('controllerchange', готово, { once: true })
        setTimeout(готово, 3000)
      })
    }

    const провод = new BareMux.BareMuxConnection('/baremux/worker.js')
    const тоннель = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/wisp/'
    await провод.setTransport('/libcurl/index.mjs', [{ websocket: тоннель }])

    const окно = движок.createFrame()
    окно.frame.id = 'рамка'
    окно.frame.title = источник.name
    document.body.append(окно.frame)
    окно.addEventListener('urlchange', (с) => родителю({ адрес: String(с.url ?? '') }))
    окно.go(источник.home)
    слова.hidden = true
    родителю({ адрес: источник.home, готово: true })

    window.addEventListener('message', (с) => {
      const д = с.data
      if (!д || д.flamingoHub !== true) return
      if (д.что === 'назад') окно.back()
      else if (д.что === 'обновить') окно.reload()
      else if (д.что === 'домой') окно.go(источник.home)
    })
  } catch (e) {
    console.error(e)
    сказать('Источник здесь не открылся.', источник.home)
    родителю({ беда: String(e && e.message || e) })
  }
})()
