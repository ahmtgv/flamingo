import type { Page } from '@playwright/test';

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

export async function proxyLiveApi(page: Page, api = 'https://api.flamingo.plus/graphql/') {
  await page.route(api, async (route) => {
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
