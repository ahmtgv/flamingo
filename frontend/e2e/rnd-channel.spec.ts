import { chromium, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

import { aLiveLesson, registerTestPupil, registerTestTeacher } from './liveApi';

/**
 * 🔴 §2.2 · СЛАБЫЙ КАНАЛ — ЧЕМ МЕРЯЛ И ПОЧЕМУ ИМЕННО ЭТИМ.
 *
 * Сквозной прогон идёт на WebKit, и это правильно: внутри приложения WKWebView. Но WebKit не
 * умеет ограничивать полосу — у него нет CDP. Наряд говорит прямо: «инструмент выбирается под
 * задачу, а не задача под инструмент». Поэтому здесь Chromium и
 * `Network.emulateNetworkConditions`: он единственный, кто умеет задать полосу и задержку.
 *
 * ⚠️ Это меняет движок, а значит вывод переносится на продукт с оговоркой: мы меряем, как
 * ведёт себя ПРОДУКТ на узком канале, а не как ведёт себя WKWebView. Разница существенна для
 * отрисовки и несущественна для того, доходят ли данные и говорит ли продукт правду.
 *
 * Ступени взяты из жизни, а не из головы:
 *   4G хороший   — 12 Мбит/с, 40 мс
 *   3G городской — 1.6 Мбит/с, 150 мс
 *   3G плохой    — 400 Кбит/с, 400 мс
 *   край         — 128 Кбит/с, 800 мс  (школьный вайфай на тридцать человек)
 */

const DEV = 'http://127.0.0.1:5173';

interface Step {
  name: string;
  downKbps: number;
  upKbps: number;
  latencyMs: number;
}

const STEPS: Step[] = [
  { name: '4G хороший  ', downKbps: 12_000, upKbps: 6_000, latencyMs: 40 },
  { name: '3G городской', downKbps: 1_600, upKbps: 750, latencyMs: 150 },
  { name: '3G плохой   ', downKbps: 400, upKbps: 200, latencyMs: 400 },
  { name: 'край        ', downKbps: 128, upKbps: 64, latencyMs: 800 },
];

async function throttle(cdp: CDPSession, step: Step): Promise<void> {
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (step.downKbps * 1024) / 8,
    uploadThroughput: (step.upKbps * 1024) / 8,
    latency: step.latencyMs,
  });
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${DEV}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
}

test.describe('§2.2 · слабый канал', () => {
  test.skip(!process.env.FLAMINGO_RND, 'наблюдательный заход: FLAMINGO_RND=1 + dev-сервер');
  test.setTimeout(600_000);

  test('где проходит граница пригодности урока', async () => {
    const browser = await chromium.launch();
    const t = await registerTestTeacher();
    const p = await registerTestPupil();
    const lesson = await aLiveLesson(t.token, p.token);

    for (const step of STEPS) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await throttle(cdp, step);

      const t0 = Date.now();
      let loginMs = -1;
      let roomMs = -1;
      let boardMs = -1;
      let note = '';
      try {
        await signIn(page, t.email, 'T3stPass!2026');
        loginMs = Date.now() - t0;

        const t1 = Date.now();
        await page.goto(`${DEV}/sessions/${lesson.sessionId}/room`, { timeout: 90_000 });
        await page.getByRole('tab', { name: 'Доска' }).click({ timeout: 60_000 });
        roomMs = Date.now() - t1;

        const t2 = Date.now();
        await page.waitForSelector('[role=toolbar]', { timeout: 90_000 });
        boardMs = Date.now() - t2;
      } catch (failure) {
        note = `не дошёл: ${String(failure).split('\n')[0].slice(0, 70)}`;
      }

      // Говорит ли продукт человеку правду о своём состоянии, пока тормозит?
      const said = (await page.evaluate(() => document.body.innerText))
        .replace(/\s+/g, ' ')
        .slice(0, 90);

      console.log(
        `[канал ${step.name}] вход ${loginMs}мс · комната ${roomMs}мс · доска ${boardMs}мс ${note}`,
      );
      console.log(`[канал ${step.name}] на экране: ${JSON.stringify(said)}`);
      await ctx.close();
    }
    await browser.close();
  });
});
