import { expect, test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

import { aLiveLesson, registerTestPupil, registerTestTeacher } from './liveApi';
import { bothAtTheBoard, drawStroke, openBoard, seen, signIn, strokeCount } from './twoPeople';

/**
 * 🔴 ЗАМЕР ИДЁТ ПРОТИВ DEV-СЕРВЕРА, И ЭТО НЕ УДОБСТВО, А УСЛОВИЕ ИЗМЕРИМОСТИ.
 *
 * Сквозной прогон ходит по СОБРАННОМУ десктопному фронту, а туда вшиты боевые адреса — и
 * запроса, и веб-сокета. Запрос перехватчик умеет увести куда надо, а сокет — нет: он ушёл
 * на `wss://api.flamingo.plus`, пока урок жил на тестовом контуре. Из-за этого первое
 * измерение показало «ученик не видит ничего» — вывод про мой стенд, а не про продукт.
 *
 * Dev-сервер проксирует `/graphql` вместе с сокетом (`ws: true`) на один и тот же бэкенд.
 * Только так живая подписка вообще наблюдаема.
 */
const DEV = 'http://127.0.0.1:5173';

/**
 * 🔴 ГЕНЕРАЛЬНЫЙ RnD — НАБЛЮДЕНИЕ, А НЕ ПРИЁМКА (промпт 31 §2).
 *
 * Эти сценарии не «проверяют, что работает». Они ставят продукт в положения, в которые он
 * попадёт на живом уроке, и ПЕЧАТАЮТ, что видит каждый из двоих. Утверждения здесь только
 * там, где поведение уже обещано; всё остальное — записанное наблюдение.
 *
 * ⚠️ Прошлой ночью такой же сценарий прошёл ЗЕЛЁНЫМ и не измерил ничего: ученик не был
 * авторизован, и обрыв наблюдался на форме входа. Поэтому здесь первым делом — проверка,
 * что оба ДОШЛИ до урока; без неё всё остальное бессмысленно.
 */

/**
 * ⚠️ ЭТОТ НАБОР НЕ ВХОДИТ В ОБЫЧНЫЙ ПРОГОН. Ему нужен dev-сервер на 5173 (единственный, где
 * сокет идёт туда же, куда запросы) и бэкенд на 8000. Сквозной прогон обязан оставаться
 * 15/15 и не зависеть от того, поднял ли кто-то dev-сервер.
 *
 *     FLAMINGO_RND=1 FLAMINGO_API=http://localhost:8000/graphql/ npx playwright test e2e/rnd.spec.ts
 */
test.describe('§2.1 · урок на двоих по-настоящему', () => {
  test.skip(!process.env.FLAMINGO_RND, 'наблюдательный заход: FLAMINGO_RND=1 + dev-сервер');
  test.setTimeout(180_000);

  test('обрыв у ученика: три штриха без него — видит ли он их, вернувшись', async ({ browser }) => {
    const teacherCtx: BrowserContext = await browser.newContext();
    const pupilCtx: BrowserContext = await browser.newContext();
    const teacher = await teacherCtx.newPage();
    const pupil = await pupilCtx.newPage();
    // ⚠️ Подписка ходит ВЕБ-СОКЕТОМ, а его адрес тоже вшит в сборку. Если он смотрит на
    // боевой, то «ученик ничего не видит» будет выводом про мой инструмент, а не про продукт.
    pupil.on('websocket', (ws) => console.log('[rnd прибор] сокет ученика →', ws.url()));
    teacher.on('websocket', (ws) => console.log('[rnd прибор] сокет преподавателя →', ws.url()));

    const t = await registerTestTeacher();
    const p = await registerTestPupil();
    const lesson = await aLiveLesson(t.token, p.token);

    await signIn(teacher, DEV, t.email, 'T3stPass!2026');
    await signIn(pupil, DEV, p.email, p.password);
    console.log('[rnd 2.1] оба вошли');

    await openBoard(teacher, DEV, lesson.sessionId);
    await openBoard(pupil, DEV, lesson.sessionId);
    // 🔴 Без этой проверки весь сценарий может пройти зелёным, ничего не измерив.
    await bothAtTheBoard(teacher, pupil);

    // 🔴 ЖИВАЯ ПОДПИСКА: доходит ли штрих до ученика, пока оба на связи. Ждём ДОЛГО и
    // печатаем ход — «не дошло за секунду» и «не дошло вовсе» это разные новости.
    await drawStroke(teacher, { x: 120, y: 120 });
    for (const ms of [500, 1500, 3000, 5000]) {
      await pupil.waitForTimeout(ms);
      console.log(
        `[rnd 2.1 живая подписка] +${ms}мс: у преподавателя ${await strokeCount(teacher)}, у ученика ${await strokeCount(pupil)}`,
      );
    }

    // ⚠️ СНАЧАЛА ПРОВЕРЯЕМ ПРИБОР: доходит ли до страницы сигнал о пропаже сети. Если
    // `setOffline` не дёргает `online`/`offline` и не двигает `navigator.onLine`, то любой
    // вывод про поведение продукта будет выводом про мой инструмент, а не про продукт.
    await pupil.evaluate(() => {
      (window as unknown as { __net: string[] }).__net = [];
      window.addEventListener('offline', () =>
        (window as unknown as { __net: string[] }).__net.push('offline'),
      );
      window.addEventListener('online', () =>
        (window as unknown as { __net: string[] }).__net.push('online'),
      );
    });

    // ── ОБРЫВ У УЧЕНИКА ──────────────────────────────────────────────────────────
    await pupilCtx.setOffline(true);
    console.log(
      '[rnd прибор] navigator.onLine у ученика в офлайне:',
      await pupil.evaluate(() => navigator.onLine),
    );
    console.log('[rnd 2.1] ученик офлайн, экран:', JSON.stringify(await seen(pupil, 110)));

    for (const y of [200, 240, 280]) await drawStroke(teacher, { x: 160, y });
    const teacherHas = await strokeCount(teacher);
    const pupilWhileOffline = await strokeCount(pupil);
    console.log(
      `[rnd 2.1] пока ученика нет: у преподавателя ${teacherHas}, у ученика ${pupilWhileOffline}`,
    );

    // Считаем, уходит ли запрос доски ПОСЛЕ возврата сети: если нет — молчит клиент,
    // если да и картина не меняется — врёт ответ.
    let boardAsks = 0;
    pupil.on('request', (r) => {
      if (r.url().includes('graphql') && (r.postData() ?? '').includes('board')) boardAsks += 1;
    });

    // ── ВОЗВРАТ ──────────────────────────────────────────────────────────────────
    await pupilCtx.setOffline(false);
    // Считаем НЕ один раз: досинхронизация асинхронна, и один замер через четыре секунды
    // может застать её на полпути — а вывод «не сошлись» стоил бы починки несуществующего.
    for (const ms of [1500, 3000, 5000]) {
      await pupil.waitForTimeout(ms);
      console.log(`[rnd 2.1] +${ms}мс после возврата: у ученика ${await strokeCount(pupil)}`);
    }
    console.log(
      '[rnd прибор] события сети, дошедшие до страницы:',
      JSON.stringify(await pupil.evaluate(() => (window as unknown as { __net: string[] }).__net)),
      '| navigator.onLine:',
      await pupil.evaluate(() => navigator.onLine),
    );
    const pupilAfter = await strokeCount(pupil);
    console.log(`[rnd 2.1] ученик вернулся, видит фигур: ${pupilAfter} (у преподавателя ${teacherHas})`);
    console.log(`[rnd прибор] запросов доски после возврата: ${boardAsks}`);
    console.log('[rnd 2.1] экран ученика после возврата:', JSON.stringify(await seen(pupil, 140)));

    await teacherCtx.close();
    await pupilCtx.close();
  });

  test('§34 §2.1 · штрих во время провала связи: сказано ли, и доходит ли потом', async ({ browser }) => {
    const teacherCtx = await browser.newContext();
    const pupilCtx = await browser.newContext();
    const teacher = await teacherCtx.newPage();
    const pupil = await pupilCtx.newPage();

    const t = await registerTestTeacher();
    const p = await registerTestPupil();
    const lesson = await aLiveLesson(t.token, p.token);
    await signIn(teacher, DEV, t.email, 'T3stPass!2026');
    await signIn(pupil, DEV, p.email, p.password);
    await openBoard(teacher, DEV, lesson.sessionId);
    await openBoard(pupil, DEV, lesson.sessionId);
    await bothAtTheBoard(teacher, pupil);

    await drawStroke(teacher, { x: 120, y: 120 });
    await teacher.waitForTimeout(800);
    const beforeT = await strokeCount(teacher);
    const beforeP = await strokeCount(pupil);

    // ── ПРОВАЛ СВЯЗИ, И ПРЕПОДАВАТЕЛЬ ОБ ЭТОМ НЕ ЗНАЕТ ──────────────────────────
    await teacherCtx.setOffline(true);
    await drawStroke(teacher, { x: 200, y: 200 });
    await teacher.waitForTimeout(1200);

    const drawnOffline = (await strokeCount(teacher)) - beforeT;
    const said = await teacher
      .locator('[role=alert], [role=status]')
      .allInnerTexts()
      .then((all) => all.join(' | ').replace(/\s+/g, ' ').slice(0, 200));
    console.log(`[34 §2.1] нарисовано без связи, видит у себя: +${drawnOffline}`);
    console.log(`[34 §2.1] сказано ли ему про связь: ${JSON.stringify(said)}`);

    // ⚠️ Ворота: работа не пропала у автора, и молчания нет.
    expect(drawnOffline, 'штрих исчез у самого преподавателя').toBeGreaterThan(0);
    expect(said, 'о пропавшей связи не сказано ни слова').toMatch(/связ/i);

    // ── СВЯЗЬ ВЕРНУЛАСЬ ────────────────────────────────────────────────────────
    await teacherCtx.setOffline(false);
    await expect
      .poll(() => strokeCount(pupil), { timeout: 25_000, message: 'написанное без связи так и не дошло классу' })
      .toBeGreaterThan(beforeP);
    console.log(`[34 §2.1] после возврата: у ученика ${await strokeCount(pupil)} (было ${beforeP})`);

    await teacherCtx.close();
    await pupilCtx.close();
  });

  test('§34 §3.2 · хвосты урока на двоих: свёрнутое окно, фоновая вкладка, закрыл и открыл', async ({ browser }) => {
    const teacherCtx = await browser.newContext();
    const pupilCtx = await browser.newContext();
    const teacher = await teacherCtx.newPage();
    let pupil = await pupilCtx.newPage();

    const t = await registerTestTeacher();
    const p = await registerTestPupil();
    const lesson = await aLiveLesson(t.token, p.token);
    await signIn(teacher, DEV, t.email, 'T3stPass!2026');
    await signIn(pupil, DEV, p.email, p.password);
    await openBoard(teacher, DEV, lesson.sessionId);
    await openBoard(pupil, DEV, lesson.sessionId);
    await bothAtTheBoard(teacher, pupil);

    await drawStroke(teacher, { x: 120, y: 100 });
    await pupil.waitForTimeout(1200);
    const base = await strokeCount(pupil);
    console.log(`[34 §3.2] исходно у ученика: ${base}`);

    // ── ВКЛАДКА УШЛА В ФОН ────────────────────────────────────────────────────────
    // Не «свернул окно» (этого браузером не сделать), а ровно то, что при этом
    // происходит со страницей: она становится скрытой и её таймеры придушены.
    await pupil.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    for (const y of [160, 200]) await drawStroke(teacher, { x: 160, y });
    await pupil.waitForTimeout(1500);
    const whileHidden = await strokeCount(pupil);
    console.log(`[34 §3.2] пока вкладка в фоне: у ученика ${whileHidden} (у преподавателя ${await strokeCount(teacher)})`);

    // ── ВЕРНУЛСЯ НА ВКЛАДКУ ───────────────────────────────────────────────────────
    await pupil.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect
      .poll(() => strokeCount(pupil), { timeout: 20_000, message: 'вернувшись на вкладку, ученик не досинхронизировался' })
      .toBe(await strokeCount(teacher));
    console.log(`[34 §3.2] вернулся на вкладку: сошлись на ${await strokeCount(pupil)}`);

    // ── ЗАКРЫЛ ВКЛАДКУ И ОТКРЫЛ ЗАНОВО ────────────────────────────────────────────
    const teacherHad = await strokeCount(teacher);
    await pupil.close();
    for (const y of [240, 280]) await drawStroke(teacher, { x: 200, y });
    pupil = await pupilCtx.newPage();
    await openBoard(pupil, DEV, lesson.sessionId);
    await expect
      .poll(() => strokeCount(pupil), { timeout: 20_000, message: 'открыв вкладку заново, ученик увидел не всё' })
      .toBe(await strokeCount(teacher));
    console.log(
      `[34 §3.2] закрыл и открыл заново: у ученика ${await strokeCount(pupil)} (было ${teacherHad}, преподаватель дорисовал до ${await strokeCount(teacher)})`,
    );

    await teacherCtx.close();
    await pupilCtx.close();
  });

  test('обрыв у ПРЕПОДАВАТЕЛЯ: он ведёт урок, и это самое дорогое', async ({ browser }) => {
    const teacherCtx = await browser.newContext();
    const pupilCtx = await browser.newContext();
    const teacher = await teacherCtx.newPage();
    const pupil = await pupilCtx.newPage();

    const t = await registerTestTeacher();
    const p = await registerTestPupil();
    const lesson = await aLiveLesson(t.token, p.token);
    await signIn(teacher, DEV, t.email, 'T3stPass!2026');
    await signIn(pupil, DEV, p.email, p.password);
    await openBoard(teacher, DEV, lesson.sessionId);
    await openBoard(pupil, DEV, lesson.sessionId);

    await drawStroke(teacher, { x: 120, y: 120 });
    await teacher.waitForTimeout(800);

    // ── ОБРЫВ У ТОГО, КТО ВЕДЁТ ─────────────────────────────────────────────────
    await teacherCtx.setOffline(true);
    console.log('[rnd 2.1-б] преподаватель офлайн, экран:', JSON.stringify(await seen(teacher, 130)));

    // Рисует, не зная, что связи нет. Что он видит — и что из этого правда?
    await drawStroke(teacher, { x: 200, y: 200 });
    await teacher.waitForTimeout(1200);
    console.log(`[rnd 2.1-б] нарисовал без связи, у себя видит: ${await strokeCount(teacher)}`);
    console.log('[rnd 2.1-б] сказано ли ему про связь:', JSON.stringify(await seen(teacher, 220)));

    await teacherCtx.setOffline(false);
    await teacher.waitForTimeout(4000);
    console.log(`[rnd 2.1-б] связь вернулась, у преподавателя: ${await strokeCount(teacher)}`);

    // Доехало ли нарисованное в офлайне до сервера — спрашиваем ученика начисто.
    await pupil.reload();
    await pupil.waitForTimeout(2500);
    await pupil.getByRole('tab', { name: 'Доска' }).click();
    await pupil.waitForTimeout(2500);
    console.log(`[rnd 2.1-б] у ученика после всего: ${await strokeCount(pupil)}`);

    await teacherCtx.close();
    await pupilCtx.close();
  });

  test('ученик открыл ВТОРУЮ вкладку — две картины одного человека', async ({ browser }) => {
    const teacherCtx = await browser.newContext();
    const pupilCtx = await browser.newContext();
    const teacher = await teacherCtx.newPage();
    const pupil = await pupilCtx.newPage();

    const t = await registerTestTeacher();
    const p = await registerTestPupil();
    const lesson = await aLiveLesson(t.token, p.token);
    await signIn(teacher, DEV, t.email, 'T3stPass!2026');
    await signIn(pupil, DEV, p.email, p.password);
    await openBoard(teacher, DEV, lesson.sessionId);
    await openBoard(pupil, DEV, lesson.sessionId);

    await drawStroke(teacher, { x: 140, y: 140 });
    await pupil.waitForTimeout(1200);

    // Вторая вкладка ТОГО ЖЕ ученика: одна сессия, два окна.
    const second = await pupilCtx.newPage();
    await second.goto(`${DEV}/sessions/${lesson.sessionId}/room`);
    await second.getByRole('tab', { name: 'Доска' }).click();
    await second.waitForTimeout(3000);
    console.log(
      `[rnd 2.1-в] первая вкладка: ${await strokeCount(pupil)}, вторая: ${await strokeCount(second)}`,
    );

    await teacherCtx.close();
    await pupilCtx.close();
  });
});
