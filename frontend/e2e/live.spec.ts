import { expect, test } from '@playwright/test';

import { proxyLiveApi, proxyLiveSocket } from './apiProxy';
import { aLiveLesson, registerTestPupil, registerTestTeacher } from './liveApi';
import { bothAtTheBoard, drawStroke, openBoard, signIn, strokeCount } from './twoPeople';

/**
 * 🔴 ЖИВОЙ СЛОЙ В ОБЫЧНОМ ПРОГОНЕ (промпт 34 §1.1).
 *
 * ЧТО ЭТО ЛОВИТ. 16.08 умерли ВСЕ восемь подписок разом: `token_from_connection_params`
 * читал `ws.connection_params`, которого у консьюмера Strawberry нет, и каждая подписка
 * падала `AttributeError` в первый же такт. Три месяца никто не заметил — и не мог: прогон
 * ходил по HTTP, где всё было исправно, и оставался 15/15 зелёным. Ни один тест не открывал
 * подписку вторым человеком.
 *
 * Это тот самый повторяющийся механизм: код, который умеет ответить, проверен; доходит ли
 * до него вопрос — нет.
 *
 * ⚠️ СЦЕНАРИЙ НЕ ПОМЕЧЕН `skip` И НЕ ЗАВИСИТ ОТ ФЛАГА. Наблюдательный заход `rnd.spec.ts`
 * измерял ровно это, но под `FLAMINGO_RND` — то есть его не запускали, и он ничего не
 * сторожил. Сторож, который включают руками, не сторож.
 *
 * Проверено обратным ходом: с возвращённым `ws.connection_params` сценарий краснеет на
 * «ученик видит 1 штрих» — 0 против 1 (см. REGRESSION_LOG, Р-27).
 */
test.describe('живой слой: второй человек видит', () => {
  test.setTimeout(180_000);

  test('преподаватель провёл штрих — ученик увидел его, не трогая страницу', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://localhost:4180';
    const teacherCtx = await browser.newContext();
    const pupilCtx = await browser.newContext();
    const teacher = await teacherCtx.newPage();
    const pupil = await pupilCtx.newPage();

    // Оба конца адреса — и запрос, и сокет — уводим на контур: в сборку вшит боевой.
    for (const page of [teacher, pupil]) {
      await proxyLiveApi(page);
      await proxyLiveSocket(page);
    }

    const t = await registerTestTeacher();
    const p = await registerTestPupil();
    const lesson = await aLiveLesson(t.token, p.token);

    await signIn(teacher, base, t.email, 'T3stPass!2026');
    await signIn(pupil, base, p.email, p.password);
    await openBoard(teacher, base, lesson.sessionId);
    await openBoard(pupil, base, lesson.sessionId);
    await bothAtTheBoard(teacher, pupil);

    const before = await strokeCount(pupil);
    await drawStroke(teacher, { x: 120, y: 120 });

    // 🔴 ГЛАВНОЕ УТВЕРЖДЕНИЕ ВСЕГО ФАЙЛА: у ВТОРОГО прибавилось. Не «подписка ответила», не
    // «сокет открылся» — на экране человека, который ничего не делал, стало на штрих больше.
    await expect
      .poll(() => strokeCount(pupil), { timeout: 20_000, message: 'штрих не дошёл до ученика' })
      .toBeGreaterThan(before);

    await teacherCtx.close();
    await pupilCtx.close();
  });
});
