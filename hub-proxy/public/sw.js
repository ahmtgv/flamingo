/* Служебный работник посредника: всё, что запрашивает открытый источник,
   перехватывает движок Scramjet и ведёт через тоннель. Своё — мимо. */
importScripts('/scram/scramjet.all.js')

const { ScramjetServiceWorker } = $scramjetLoadWorker()
const движок = new ScramjetServiceWorker()

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (событие) => событие.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (событие) => {
  событие.respondWith((async () => {
    await движок.loadConfig()
    if (движок.route(событие)) return движок.fetch(событие)
    return fetch(событие.request)
  })())
})
