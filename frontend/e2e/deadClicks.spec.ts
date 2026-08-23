import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { proxyLiveApi, proxyLiveSocket } from './apiProxy';
import { aLiveLesson, registerTestPupil, registerTestTeacher } from './liveApi';
import { signIn } from './twoPeople';

/**
 * 🔴 ПРИБОР, КОТОРЫЙ НАЖИМАЕТ (наряд 52 §2).
 *
 * ЧТО ЭТО ЛОВИТ — два разных дефекта, и оба уже случались:
 *
 * 1. **Нажатие не доходит до элемента.** Наряд 51: в комнате поверх доски лежат карточка
 *    занятия и панель инструментов; перо, ладошка и текст выглядели мёртвыми, а на самом
 *    деле нажатия уходили чужому слою. До этого так же воровал клики плавающий пилот
 *    (наряд 42). Разметка при этом безупречна, и ни один прежний прибор этого не видел.
 * 2. **Нажатие доходит и не делает ничего.** Мёртвая кнопка: «свернуть» без обработчика,
 *    «Начать урок» без мутации, оба выхода из комнаты на необязательном пропе.
 *
 * ⚠️ ПОЧЕМУ ЭТО СЦЕНАРИЙ, А НЕ СКРИПТ. `frame-bottom.mjs` запускается руками — значит он
 * замер, а не караул: его забудут ровно в тот день, когда он нужен. Этот стоит в обычном
 * прогоне `npm run e2e` и краснеет сам.
 *
 * ⚠️ ЧЕГО ПРИБОР НЕ НАЖИМАЕТ — и говорит об этом вслух: уход, завершение, удаление,
 * отправку и выход. Нажать «Завершить занятие» посреди проверки значит проверять уже
 * другой продукт. Пропущенное печатается: молчаливый пропуск читается как «всё нажато».
 */
const DESTRUCTIVE =
  /выйти|заверш|удал|отклон|отмен|прибрать|стереть|убрать|отозв|сдать|отправ|опубликов|начать урок|начать занятие|войти в эфир|сохранить|создать|зарегистр/i;

/**
 * 🔴 ПЕРЕКЛЮЧАТЕЛИ КАДРА — ОТДЕЛЬНО ОТ МЁРТВЫХ (найдено этим же прибором, 24.08).
 *
 * «Во весь экран» разворачивает доску поверх комнаты — и все кнопки комнаты после этого
 * ЧЕСТНО оказываются закрыты. Прибор, нажавший её в середине обхода, объявил мёртвыми
 * девять исправных кнопок. Это не дефект продукта, а порядок обхода: такие кнопки
 * проверяются отдельным заходом, а в общем — пропускаются и печатаются.
 */
const CHANGES_FRAME = /во весь экран|из полного экрана|полноэкранн/i;

interface Dead {
  screen: string;
  name: string;
  kind: 'не дошло' | 'ничего не изменилось';
  who?: string;
}

/** Отпечаток экрана: адрес, объём разметки, состояния переключателей и метки доски. */
async function fingerprint(page: Page): Promise<string> {
  return page.evaluate(() => {
    const marks = [...document.querySelectorAll('[aria-pressed], [aria-current], [aria-expanded], [data-state], [data-tool]')]
      .map((e) => `${e.getAttribute('aria-pressed') ?? ''}${e.getAttribute('aria-current') ?? ''}${e.getAttribute('aria-expanded') ?? ''}${e.getAttribute('data-state') ?? ''}${e.getAttribute('data-tool') ?? ''}`)
      .join('|');
    const els = document.querySelectorAll('[data-el]').length;
    const view = document.querySelector('[data-board-viewport]')?.getAttribute('data-board-viewport') ?? '';
    return `${location.pathname}#${document.body.innerHTML.length}#${marks}#${els}#${view}`;
  });
}

/**
 * Пройти по экрану и нажать всё, что нажимается.
 *
 * 🔴 СПИСОК СНИМАЕТСЯ ОДИН РАЗ, И ЭТО НЕ МЕЛОЧЬ. Первая версия ходила по `nth(i)` живого
 * списка: после каждого нажатия разметка меняется, и `nth(i)` показывает уже другой узел —
 * прибор мерил геометрию одного элемента, а нажимал другой и объявлял «не дошло» девять раз
 * подряд. Поймано сверкой координат: вкладка стояла на y=28, панель доски — на y=82, они
 * не пересекаются вовсе.
 */
async function pressEverything(page: Page, screen: string, dead: Dead[], skipped: string[]) {
  const handles = await page.locator('button:visible, [role="button"]:visible, [role="tab"]:visible').all();

  for (const el of handles) {
    if (!(await el.isVisible().catch(() => false))) continue;
    if (!(await el.isEnabled().catch(() => false))) continue;
    const name = ((await el.getAttribute('aria-label').catch(() => null)) ?? (await el.innerText().catch(() => '')) ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    if (!name) continue;
    if (DESTRUCTIVE.test(name)) {
      skipped.push(`${screen}: «${name}» (уход или потеря)`);
      continue;
    }
    if (CHANGES_FRAME.test(name)) {
      skipped.push(`${screen}: «${name}» (меняет кадр целиком)`);
      continue;
    }

    const box = await el.boundingBox().catch(() => null);
    if (!box) continue;

    /*
     * ДОХОДИТ ЛИ НАЖАТИЕ. Спрашиваем браузер, что лежит в середине элемента, и сверяем с
     * САМИМ элементом, а не с «каким-нибудь кнопочным узлом»: иначе сосед по слою сойдёт
     * за него.
     */
    const reaches = await el.evaluate((node) => {
      /*
       * 🔴 УЗЕЛ МОГ ПЕРЕРИСОВАТЬСЯ, ПОКА ПРИБОР ДУМАЛ. React заменяет узлы, ссылка остаётся
       * на отсоединённый, и его прямоугольник — нули. `elementFromPoint(0,0)` попадает в
       * левый верхний угол, где как раз стоит панель доски, — и прибор девять раз подряд
       * объявил «не дошло» там, где стопка узлов показывает саму кнопку сверху.
       * Отсоединённый узел — это «исчез», а не «закрыт»: разные вещи, разные выводы.
       */
      const r = node.getBoundingClientRect();
      if (!node.isConnected || r.width === 0 || r.height === 0) return { gone: true, ok: false, who: '' };
      const under = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (!under) return { gone: false, ok: false, who: 'ничего' };
      return {
        gone: false,
        ok: node.contains(under) || under.contains(node),
        who: `${under.tagName.toLowerCase()}.${String((under as HTMLElement).className ?? '').split(' ')[0]}`,
      };
    });
    if (reaches.gone) continue; // перерисовался — не наш случай и не находка
    if (!reaches.ok) {
      dead.push({ screen, name, kind: 'не дошло', who: reaches.who });
      continue;
    }

    const before = await fingerprint(page);
    await el.click({ timeout: 4000 }).catch(() => undefined);
    await page.waitForTimeout(450);
    const after = await fingerprint(page);
    if (before === after) dead.push({ screen, name, kind: 'ничего не изменилось' });

    // Нажатие увело с экрана — дальше по списку идут элементы уже не этого экрана.
    if (after.split('#')[0] !== before.split('#')[0]) return;
  }
}

test.describe('нажатия доходят и что-то делают', () => {
  test.setTimeout(240_000);

  test('доска и комната: ни одного мёртвого нажатия', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://localhost:4180';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await proxyLiveApi(page);
    await proxyLiveSocket(page);

    const teacher = await registerTestTeacher();
    const pupil = await registerTestPupil();
    const lesson = await aLiveLesson(teacher.token, pupil.token);

    /*
     * Входим формой ПРЕПОДАВАТЕЛЕМ: у него на доске все семь инструментов, и именно его
     * экран владелец видел сломанным. Пароль общий для тестовых учёток контура.
     */
    await signIn(page, base, teacher.email, 'T3stPass!2026');
    await page.goto(`${base}/sessions/${lesson.sessionId}/room`);
    await page.waitForSelector('[role=toolbar]', { timeout: 20_000 });
    await page.waitForTimeout(1500);

    /*
     * 🔴 ПУЛЬТЫ КОМНАТЫ ПРОСЫПАЮТСЯ ОТ ДВИЖЕНИЯ МЫШИ (наряд 42: «видео во весь экран»).
     * Человек, входя в комнату, мышь двигает; прибор — нет. Будим их, иначе прибор мерил бы
     * спящий экран и объявлял мёртвым то, чего человек в этот момент даже не видит.
     */
    await page.mouse.move(640, 400);
    await page.waitForTimeout(600);

    // Проверка самого прибора: геометрия двух узлов печатается до выводов. Прошлый прибор
    // ошибался ровно на этом месте — «не дошло» может значить и «прибор смотрит не туда».
    const geo = await page.evaluate(() => {
      const tab = [...document.querySelectorAll('button, [role="tab"]')].find((b) =>
        (b.textContent ?? '').trim().startsWith('Методичка'),
      );
      const bar = document.querySelector('[class*="_toolbar_"]');
      const box = (e: Element | null | undefined) => {
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), z: getComputedStyle(e).zIndex };
      };
      return { вкладка: box(tab), панельДоски: box(bar) };
    });
    console.log('геометрия:', JSON.stringify(geo));
    // Полная стопка узлов под точкой вкладки: кто именно её накрывает, если накрывает.
    const stack = await page.evaluate(() => {
      const tab = [...document.querySelectorAll('button, [role="tab"]')].find((b) =>
        (b.textContent ?? '').trim().startsWith('Методичка'),
      );
      if (!tab) return 'вкладки нет';
      const r = tab.getBoundingClientRect();
      const pt = { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      const chain = document.elementsFromPoint(pt.x, pt.y).slice(0, 6).map((e) => {
        const b = e.getBoundingClientRect();
        return `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className ?? '').split(' ')[0]}[${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}]`;
      });
      return { точка: pt, стопка: chain };
    });
    console.log('стопка над вкладкой:', JSON.stringify(stack));

    const dead: Dead[] = [];
    const skipped: string[] = [];
    await pressEverything(page, 'комната · доска', dead, skipped);

    // Пропущенное печатается всегда: тихий пропуск читается как «всё нажато».
    console.log(`не нажимал (уход, потеря, отправка): ${skipped.length}\n  ${skipped.join('\n  ')}`);
    console.log(`мёртвых нажатий: ${dead.length}`);
    for (const d of dead) console.log(`  ${d.screen}: «${d.name}» — ${d.kind}${d.who ? ` (под курсором ${d.who})` : ''}`);

    expect(
      dead.map((d) => `${d.screen}: «${d.name}» — ${d.kind}${d.who ? ` (под курсором ${d.who})` : ''}`),
      'нажатие либо не доходит до элемента, либо ничего не меняет',
    ).toEqual([]);

    await ctx.close();
  });
});
