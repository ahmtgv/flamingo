import type { Page } from '@playwright/test';

/** Адрес, вшитый в десктопную сборку (`.env.desktop`). По нему ходит приложение. */
const BAKED_IN_API = 'https://api.flamingo.plus/graphql/';

/**
 * Прогон ходит на боевой API через Node, а не напрямую из страницы.
 *
 * 🔴 ПОЧЕМУ ТАК, А НЕ «РАЗРЕШИТЬ localhost В CORS». Страница прогона живёт на
 * `http://localhost:4180`, и боевой сервер её, разумеется, не пускает:
 *
 *     Origin http://localhost:4180 is not allowed by Access-Control-Allow-Origin.
 *     Status code: 200
 *
 * ⚠️ Заметьте подпись: **200 и без заголовка** — ровно то, что 15.08 молча гасило весь мастер.
 * Соблазн был добавить `localhost:4180` в `CORS_ALLOWED_ORIGINS` боевого сервера. Этого делать
 * НЕЛЬЗЯ (§12.3): ослаблять защиту продукта ради удобства проверки — это как раз тот обход,
 * который запрещён. Настоящий список origins проверяется отдельно, в `test_desktop_cors.py`.
 *
 * Поэтому запрос перехватывается и выполняется в Node, где межсайтовых правил нет вовсе.
 * Наружу идёт тот же адрес, тот же заголовок `Authorization` и тот же `Origin`, каким
 * представляется приложение, — то есть сервер видит ровно то, что увидел бы от приложения.
 */
/**
 * ⚠️ С ПОВТОРАМИ. Сеть до боевого сервера из этой песочницы отваливается через раз
 * (`TypeError: fetch failed`, `UND_ERR_CONNECT_TIMEOUT`) — прогон краснел на исправном
 * продукте. Один такой ложный красный обесценивает всю проверку: ему перестают верить.
 */
async function fetchWithRetries(api: string, init: RequestInit, attempts = 4): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(api, init);
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

/**
 * 🔴 АДРЕС ЗДЕСЬ БЫЛ СВОЙ, И ЭТО РАЗВОДИЛО СЦЕНАРИЙ НАДВОЕ (промпт 29 §2).
 *
 * `liveApi.ts` ходил по `FLAMINGO_API`, а перехватчик — по своему умолчанию. Пока обоими
 * умолчаниями был боевой сервер, они совпадали случайно. Стоило направить прогон на тестовый
 * контур — половина сценария (регистрация преподавателя) пошла на контур, а вторая
 * (запрос кода связывания приложением) осталась на боевом. Код заводился на одном сервере,
 * искался на другом: «Pairing code not found» на полностью исправном продукте.
 *
 * Один источник адреса на обе половины. Умолчание прежнее — боевое, для ручных проверок.
 */
export async function proxyLiveApi(
  page: Page,
  api = process.env.FLAMINGO_API ?? BAKED_IN_API,
) {
  /**
   * 🔴 ПЕРЕХВАТЫВАТЬ НАДО ТОТ АДРЕС, ПО КОТОРОМУ ХОДИТ ПРИЛОЖЕНИЕ (промпт 30 §2.2).
   *
   * Прошлой ночью пятнадцатый сценарий не пошёл по тестовому контуру, и причину я не нашёл.
   * Вот она: адрес API **вшит в сборку** (`.env.desktop`, `VITE_GRAPHQL_HTTP_URL`) — внутри
   * приложения страница отдаётся протоколом `tauri://localhost`, относительный `/graphql/`
   * указывал бы в само приложение. Перехватчик же слушал `FLAMINGO_API`.
   *
   * Стоило увести прогон на контур — и адреса разошлись: приложение звало боевой, а
   * перехватчик сторожил контур. Запрос кода связывания уходил мимо, кодов в базе контура
   * ноль, на экране «· · ·».
   *
   * Слушаем ВШИТЫЙ адрес — тот, по которому реально пойдёт приложение, — а выполняем запрос
   * по `api`. Так прогон можно направить куда угодно, не пересобирая фронт.
   */
  await page.route(BAKED_IN_API, async (route) => {
    const request = route.request();
    const upstream = await fetchWithRetries(api, {
      method: request.method(),
      headers: {
        'content-type': 'application/json',
        // Приложение представляется этим адресом; сервер должен видеть его, а не наш стенд.
        origin: 'tauri://localhost',
        ...(request.headers()['authorization']
          ? { authorization: request.headers()['authorization'] }
          : {}),
      },
      body: request.postData() ?? undefined,
    });
    await route.fulfill({
      status: upstream.status,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
      body: await upstream.text(),
    });
  });
}
