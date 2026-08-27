import { expect, test } from '@playwright/test';

import { proxyLiveApi, proxyLiveSocket } from './apiProxy';
import { aLiveLesson, registerTestPupil, registerTestTeacher } from './liveApi';
import { openBoard, signIn } from './twoPeople';

/**
 * 🔴 КАРТИНКА ЛОЖИТСЯ ТУДА, КУДА СМОТРИТ ЧЕЛОВЕК (наряд 53 §2).
 *
 * Владелец: «вставить картинку — и то она делает через раз». Замер объяснил, что это
 * значит: `paste` висит на `window`, у события нет координат, и картинка уходила в
 * постоянную точку `view + 80`. Три вставки подряд легли в ОДНО место и накрыли друг
 * друга — со стороны это «вставилось не туда» или «не вставилось вовсе».
 *
 * ⚠️ Наряд 52 не смог это измерить: в контуре не было хранилища. Теперь оно есть
 * (`testCircuit.startStorage`), и проверка идёт до конца — от буфера до элемента на доске.
 */
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR4nGP8//8/AzYwatCoQcNXAQBqbwj1n1p3vAAAAABJRU5ErkJggg==';

test.describe('картинка на доске', () => {
  test.setTimeout(180_000);

  test('две вставки в разные места холста ложатся в разные места', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://localhost:4180';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await proxyLiveApi(page);
    await proxyLiveSocket(page);

    const teacher = await registerTestTeacher();
    const pupil = await registerTestPupil();
    const lesson = await aLiveLesson(teacher.token, pupil.token);
    await signIn(page, base, teacher.email, 'T3stPass!2026');
    await openBoard(page, base, lesson.sessionId);

    const canvas = page.locator('[data-board-canvas]').first();
    const box = await canvas.boundingBox();
    expect(box, 'холста нет — проверять нечего').not.toBeNull();
    if (!box) return;

    const paste = async (dx: number, dy: number) => {
      await page.mouse.move(box.x + dx, box.y + dy);
      await page.waitForTimeout(200);
      await page.evaluate(
        ({ b64 }) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
          const dt = new DataTransfer();
          dt.items.add(new File([arr], 'снимок.png', { type: 'image/png' }));
          window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
        },
        { b64: PNG },
      );
    };
    const places = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-el="IMAGE"]')].map((e) => {
          const r = e.getBoundingClientRect();
          return `${Math.round(r.x)},${Math.round(r.y)}`;
        }),
      );

    /*
     * 🔴 ТОЧКИ ВЫБИРАЕТ БРАУЗЕР, А НЕ ПРИБОР (урок наряда 52). Панель инструментов стоит
     * поверх холста у левого края; вставка в занятое место не доходит до доски, и красным
     * становится проверка, а не продукт. Спрашиваем `elementFromPoint` и берём свободные.
     */
    const free = async (fromX: number) =>
      page.evaluate(
        ({ x0, y0, w, h, startX }) => {
          for (let dy = 60; dy < h - 60; dy += 40) {
            for (let dx = startX; dx < w - 60; dx += 40) {
              const el = document.elementFromPoint(x0 + dx, y0 + dy);
              if (el && (el.tagName.toLowerCase() === 'svg' || el.closest('[class*="_surface_"]'))) {
                return { dx, dy };
              }
            }
          }
          return null;
        },
        { x0: box.x, y0: box.y, w: box.width, h: box.height, startX: fromX },
      );
    const first = await free(80);
    const second = await free(Math.round(box.width / 2));
    expect(first, 'свободного места на холсте нет вовсе').not.toBeNull();
    expect(second, 'второго свободного места нет').not.toBeNull();
    if (!first || !second) return;

    await paste(first.dx, first.dy);
    await expect.poll(async () => (await places()).length, { timeout: 20_000 }).toBe(1);
    await paste(second.dx, second.dy);
    await expect.poll(async () => (await places()).length, { timeout: 20_000 }).toBe(2);

    const where = await places();
    expect(
      new Set(where).size,
      `обе картинки легли в одну точку (${where.join(' и ')}) — вставка не смотрит на курсор`,
    ).toBe(2);

    await ctx.close();
  });
});
