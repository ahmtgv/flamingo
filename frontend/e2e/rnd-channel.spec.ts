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

  test('§34 §3.4 · говорит ли продукт о слабом канале — по ступеням', async () => {
    /**
     * 🔴 ВТОРАЯ ПОЛОВИНА ВОРОТ §2.2, КОТОРОЙ НЕ БЫЛО.
     *
     * Замер 18.08: продукт открывается даже на 128 Кбит, за 29 секунд, и **на всех четырёх
     * ступенях экран говорит одно и то же** — ни слова о канале. Человек на плохом 3G десять
     * секунд смотрит в пустоту и решает, что сломалось.
     *
     * Теперь у продукта есть общий механизм (`shared/lib/connection`). Здесь проверяется не
     * скорость, а РЕЧЬ: на каждой ступени печатается, сколько запросов продукт успел задать,
     * самый долгий из них и сказал ли он что-нибудь про связь.
     *
     * 🔴 ЧТО ЭТОТ ЗАМЕР ПОКАЗАЛ (18.08): продукт молчит на всех четырёх ступенях — и это
     * ПРАВИЛЬНО. Самый долгий запрос на 128 Кбит — 1885 мс, остальные четырнадцать быстрее;
     * тонкий канал по маленьким запросам почти не виден. Больно от него загрузке страницы и
     * видео. Механизм ловит ПОТЕРЮ связи (это проверено отдельно, `rnd.spec.ts` §34 §2.1) и
     * медленный сервер; тонкий канал во время урока меряет замер канала машины (лист D1).
     *
     * ⚠️ Числа времени здесь — про СТЕНД (dev-сервер отдаёт сотни отдельных модулей), и это
     * уже стоило одного ложного вывода. Про продукт здесь только строка о связи: она
     * рождается из задержек настоящих запросов, а их ограничивает CDP по-настоящему.
     */
    const browser = await chromium.launch();
    const t = await registerTestTeacher();

    for (const step of STEPS) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');

      // Входим на ХОРОШЕМ канале, чтобы мерить речь о связи, а не вход.
      await signIn(page, t.email, 'T3stPass!2026');
      // 🔴 СЧЁТЧИК ПРИБОРА. Механизм судит о канале по запросам продукта; если их ноль,
      // «продукт молчит» — вывод про мой замер. Два предыдущих варианта на этом и погорели.
      let asked = 0;
      let slowest = 0;
      page.on('requestfinished', (r) => {
        if (!r.url().includes('/graphql')) return;
        asked += 1;
        const ms = r.timing().responseEnd - r.timing().requestStart;
        if (ms > slowest) slowest = Math.round(ms);
      });
      await throttle(cdp, step);
      /**
       * ⚠️ ДВА ПРЕДЫДУЩИХ ВАРИАНТА ЗАМЕРА НИЧЕГО НЕ МЕРИЛИ, И ОБА ВЫГЛЯДЕЛИ УБЕДИТЕЛЬНО.
       *
       * Первый звал `page.goto` — наблюдения о канале обнулялись вместе со страницей: они
       * живут в памяти вкладки. Второй слал `fetch` руками — а механизм видит запросы через
       * ссылку Apollo, и до него мои запросы не доходили вовсе.
       *
       * Ходим по продукту так, как ходит человек: переходами внутри приложения, которые
       * поднимают настоящие запросы Apollo.
       */
      for (let i = 0; i < 4; i += 1) {
        await page.getByRole('button', { name: /Источники/ }).first().click().catch(() => undefined);
        await page.waitForTimeout(1200);
        await page.goBack().catch(() => undefined);
        await page.waitForTimeout(1200);
      }
      await page.waitForTimeout(2500);

      const said = (await page.locator('[role=status], [role=alert]').allInnerTexts())
        .join(' | ')
        .replace(/\s+/g, ' ');
      const aboutChannel = /связ/i.test(said);
      console.log(
        `[34 §3.4 ${step.name}] запросов продукта под ограничением: ${asked}, самый долгий ${slowest}мс · про связь сказано: ${aboutChannel ? 'ДА' : 'нет'}`,
      );
      await ctx.close();
    }
    await browser.close();
  });

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
