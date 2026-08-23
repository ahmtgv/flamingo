/**
 * ЧТО ИЗ СЕМИ КНОПОК ДОСКИ ДЕЛАЕТ ТО, ЧТО ОБЕЩАЕТ (наряд 51 §2).
 *
 * 🔴 Прошлый пробник считал узлы по `svg g > *` и в комнате находил первую попавшуюся
 * ИКОНКУ вместо холста — отсюда «ноль узлов» и вывод, которого делать было нельзя.
 * Здесь ничего не угадывается: у холста метка `data-board-canvas`, у кадра —
 * `data-board-viewport`, у элементов — `data-el`, у кнопок — `data-tool`.
 */
import { chromium } from 'playwright';

const DEV = process.env.DEV || 'http://127.0.0.1:5173';
const pass = 'T3stPass!2026';
const SESSION = process.env.SESS;
const who = process.env.WHO || 'audit-teacher@flamingo-test.invalid';

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] })).newPage();
const crashes = [];
page.on('pageerror', (e) => crashes.push(String(e).slice(0, 100)));

await page.goto(`${DEV}/login`);
await page.waitForTimeout(1200);
await page.getByPlaceholder('you@example.com').fill(who);
await page.locator('input[type=password]').fill(pass);
await page.getByRole('button', { name: 'Войти' }).click();
await page.waitForTimeout(2500);
/*
 * 🔴 МЕРИТЬ ДОСКУ НАДО ТАМ, ГДЕ ЕЁ НИЧТО НЕ ЗАКРЫВАЕТ. В комнате поверх холста лежат
 * карточка занятия и собственная панель инструментов — замер там меряет их, а не доску
 * (проверено `elementFromPoint`: нажатие уходило в `div._card_`). Отдельное окно доски —
 * тот же компонент без чужих слоёв.
 */
await page.goto(`${DEV}/sessions/${SESSION}/room`);
await page.waitForTimeout(4500);

const canvas = page.locator('[data-board-canvas]').first();
if (!(await canvas.count())) {
  console.log('🔴 холста нет на экране — проверка не состоялась');
  process.exit(1);
}
const box = await canvas.boundingBox();
const state = () =>
  page.evaluate(() => {
    const g = document.querySelector('[data-board-viewport]');
    const els = [...document.querySelectorAll('[data-el]')].map((e) => e.getAttribute('el') ?? e.getAttribute('data-el'));
    return {
      кадр: g?.getAttribute('data-board-viewport') ?? null,
      элементы: els,
      правится: !!document.querySelector('textarea, [contenteditable="true"]'),
    };
  });
const pick = async (tool) => {
  // ⚠️ `data-tool` есть и у кнопки, и у самого холста (он отражает выбранный инструмент).
  // Берём именно КНОПКУ, иначе нажатие уходит в холст и инструмент не меняется.
  await page.locator(`button[data-tool="${tool}"]`).click();
  await page.waitForTimeout(300);
  const now = await page.locator('[class*="_surface_"]').first().getAttribute('data-tool');
  if (now !== tool) console.log(`   ⚠️ инструмент не переключился: просили ${tool}, стоит ${now}`);
};
/*
 * 🔴 ТОЧКУ ДЛЯ ЖЕСТА НЕ ВЫБИРАЮТ НА ГЛАЗ. В комнате поверх холста лежат карточка занятия и
 * панель инструментов; нажатие в занятое место уходит им, и инструмент выглядит мёртвым —
 * ровно так прошлый прогон «похоронил» перо, которое рисует. Спрашиваем браузер, что лежит
 * под точкой, и берём первую свободную.
 */
const freePoint = async (fromX = 200) => {
  for (let dy = 120; dy < box.height - 60; dy += 40) {
    for (let dx = fromX; dx < box.width - 60; dx += 40) {
      const ok = await page.evaluate(
        ({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          return !!el && (el.tagName.toLowerCase() === 'svg' || el.closest('[class*="_surface_"]') !== null);
        },
        { x: box.x + dx, y: box.y + dy },
      );
      if (ok) return { x: box.x + dx, y: box.y + dy, dx, dy };
    }
  }
  return null;
};
const free = await freePoint();
if (!free) {
  console.log('🔴 свободного места на холсте нет вовсе — доску целиком закрывают чужие слои');
  process.exit(1);
}
console.log(`свободная точка холста: +${free.dx},+${free.dy}`);
const at = (dx, dy) => ({ x: free.x + (dx - 500), y: free.y + (dy - 300) });

const before = await state();
console.log('до всего:', JSON.stringify(before));

/*
 * 🔴 КТО ЛЕЖИТ ПОВЕРХ ХОЛСТА. Прежде чем винить инструмент, спрашиваем, доходит ли до него
 * нажатие: в комнате поверх доски живёт слой состояний, и он уже воровал клики (наряд 42).
 */
const cover = await page.evaluate(({ x, y }) => {
  const probe = (dx, dy) => {
    const el = document.elementFromPoint(x + dx, y + dy);
    return el ? `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]}` : 'ничего';
  };
  return { левее: probe(320, 240), середина: probe(460, 320), ниже: probe(300, 480) };
}, { x: box.x, y: box.y });
console.log('под курсором:', JSON.stringify(cover));

// ── ЛАДОШКА
await pick('hand');
let p1 = at(500, 300), p2 = at(700, 430);
await page.mouse.move(p1.x, p1.y);
await page.mouse.down();
await page.mouse.move(p2.x, p2.y, { steps: 14 });
await page.mouse.up();
await page.waitForTimeout(500);
const afterHand = await state();
console.log(`ЛАДОШКА: кадр ${before.кадр} → ${afterHand.кадр} ·`, afterHand.кадр !== before.кадр ? 'ТАЩИТ' : '🔴 НЕ ТАЩИТ');

// ── ТЕКСТ
await pick('text');
const t1 = at(520, 250);
await page.mouse.click(t1.x, t1.y);
await page.waitForTimeout(900);
let s2 = await state();
const textAppeared = s2.элементы.filter((k) => k === 'TEXT').length;
console.log(`ТЕКСТ: элементов TEXT ${textAppeared} · поле ввода: ${s2.правится ? 'есть' : '🔴 НЕТ'}`);
if (s2.правится) {
  // Обещание инструмента целиком: не «появилось поле», а «написанное осталось на доске».
  await page.keyboard.type('Чёрная материя');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  const saved = await page.evaluate(() =>
    [...document.querySelectorAll('[data-el="TEXT"]')].map((e) => e.textContent).join(' | '),
  );
  console.log('   написанное на доске:', saved.includes('Чёрная материя') ? 'сохранилось' : `🔴 ПОТЕРЯНО (${saved.slice(0, 60)})`);
}
if (textAppeared && !s2.правится) {
  await page.mouse.dblclick(t1.x + 20, t1.y + 10);
  await page.waitForTimeout(700);
  s2 = await state();
  console.log(`   после двойного щелчка поле ввода: ${s2.правится ? 'есть' : '🔴 НЕТ'}`);
}

// ── СТИКЕР · ФИГУРА
for (const [tool, kind, dx] of [['sticker', 'STICKER', 460], ['shape', 'SHAPE', 620]]) {
  const was = (await state()).элементы.filter((k) => k === kind).length;
  await pick(tool);
  const c = at(dx, 320);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 90, c.y + 70, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const now = (await state()).элементы.filter((k) => k === kind).length;
  console.log(`${kind}: было ${was}, стало ${now} ·`, now > was ? 'появился' : '🔴 НЕ ПОЯВИЛСЯ');
}

// ── СВЯЗЬ (нужны два объекта)
{
  const els = await page.locator('[data-el="STICKER"], [data-el="SHAPE"], [data-el="TEXT"]').all();
  if (els.length >= 2) {
    const was = (await state()).элементы.filter((k) => k === 'LINK').length;
    await pick('link');
    const a = await els[0].boundingBox();
    const b = await els[1].boundingBox();
    if (a && b) {
      await page.mouse.click(a.x + a.width / 2, a.y + a.height / 2);
      await page.waitForTimeout(400);
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(800);
    }
    const now = (await state()).элементы.filter((k) => k === 'LINK').length;
    console.log(`СВЯЗЬ: было ${was}, стало ${now} ·`, now > was ? 'появилась' : '🔴 НЕ ПОЯВИЛАСЬ');
  } else console.log('СВЯЗЬ: не на чем проверить — на холсте меньше двух объектов');
}

// ── ПЕРО (то, что по замеру владельца работает: обязано остаться работающим)
{
  const was = (await state()).элементы.filter((k) => k === 'PEN').length;
  await pick('pen');
  const c = at(500, 380);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(c.x + i * 12, c.y + Math.sin(i) * 20, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const now = (await state()).элементы.filter((k) => k === 'PEN').length;
  console.log(`ПЕРО: было ${was}, стало ${now} ·`, now > was ? 'рисует' : '🔴 НЕ РИСУЕТ');
}

console.log('падения страницы:', crashes.slice(0, 2).join(' | ') || 'нет');
await browser.close();
