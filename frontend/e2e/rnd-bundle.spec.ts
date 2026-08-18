import { chromium, test } from '@playwright/test';

/**
 * §2.2, вторая половина: сколько СТОИТ ОТКРЫТЬ продукт на узком канале.
 *
 * ⚠️ Первый замер шёл против dev-сервера, а он отдаёт сотни отдельных модулей — на канале с
 * задержкой это в разы хуже, чем настоящий продукт. Число оттуда честное для стенда и
 * НЕВЕРНОЕ для продукта. Здесь тот же набор ступеней, но фронт СОБРАННЫЙ: один файл на 1.5 МБ
 * плюс 190 КБ стилей — ровно то, что получит преподаватель.
 */
const BUILT = 'http://127.0.0.1:4190';

const STEPS = [
  { name: '4G хороший  ', down: 12_000, up: 6_000, lat: 40 },
  { name: '3G городской', down: 1_600, up: 750, lat: 150 },
  { name: '3G плохой   ', down: 400, up: 200, lat: 400 },
  { name: 'край        ', down: 128, up: 64, lat: 800 },
];

test.describe('§2.2 · цена открытия на узком канале', () => {
  test.skip(!process.env.FLAMINGO_RND, 'наблюдательный заход');
  test.setTimeout(900_000);

  test('сколько ждёт человек, пока продукт откроется', async () => {
    const browser = await chromium.launch();
    for (const step of STEPS) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (step.down * 1024) / 8,
        uploadThroughput: (step.up * 1024) / 8,
        latency: step.lat,
      });

      const t0 = Date.now();
      let ms = -1;
      let what = '';
      try {
        await page.goto(BUILT, { timeout: 300_000, waitUntil: 'load' });
        ms = Date.now() - t0;
        what = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 60);
      } catch (e) {
        what = `не открылся за 300с: ${String(e).split('\n')[0].slice(0, 50)}`;
      }
      console.log(`[бандл ${step.name}] ${ms}мс · на экране: ${JSON.stringify(what)}`);
      await ctx.close();
    }
    await browser.close();
  });
});
