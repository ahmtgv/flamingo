/**
 * ПРИБОР ДИЗАЙНА ПО ВСЕМ ЭКРАНАМ (аудит 22.08, §8 п.3 промпта владельца).
 *
 * `design-audit.mjs` ходит по списку пересобранных экранов — на нём и держалась вера, что
 * «чисто». Здесь тот же прибор дизайнера (`docs/design-handover/audit.js`) прогоняется по
 * ВСЕМ маршрутам `app/router.tsx`, и рядом с вердиктом печатается СОСТОЯНИЕ экрана из
 * живого прогона: «чисто» над пустым или отказавшим экраном не значит ничего.
 */
import { chromium } from 'playwright';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';

const AUDIT = readFileSync(new URL('../../docs/design-handover/audit.js', import.meta.url), 'utf8');
const DEV = 'http://127.0.0.1:5173';
const pass = 'T3stPass!2026';
const LOG = '/tmp/audit-design-all.jsonl';
const seen = JSON.parse(readFileSync('/tmp/audit-full.jsonl', 'utf8').trim().split('\n').map((l) => l).join(',').replace(/^/, '[').replace(/$/, ']'));
// Состояние берём из уже снятого прогона: одно наблюдение, два прибора.
const stateOf = new Map(seen.filter((r) => r.view === 'светлая').map((r) => [`${r.route}|${r.who}`, r.state]));
const urlOf = new Map(seen.filter((r) => r.view === 'светлая').map((r) => [`${r.route}|${r.who}`, r.url]));

const accounts = JSON.parse(process.env.ACCOUNTS);
const VIEWS = [
  { name: 'светлая 1280', width: 1280, height: 800, theme: 'light', kids: false },
  { name: 'тёмная 1280', width: 1280, height: 800, theme: 'dark', kids: false },
  { name: 'детская 1280', width: 1280, height: 800, theme: 'light', kids: true },
  { name: 'светлая 1512', width: 1512, height: 982, theme: 'light', kids: false },
];

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
writeFileSync(LOG, '');

// САМОПРОВЕРКА: прибор обязан ловить нарочные поломки на своём же образце. Без неё
// «чисто по всем экранам» не значит ничего — что и случилось в первом прогоне.
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(`${DEV}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.addScriptTag({ content: AUDIT });
  const self = await page.evaluate(() => window.flAuditSelfTest());
  const ok = Object.values(self).filter(Boolean).length;
  console.log(`САМОПРОВЕРКА ПРИБОРА: ${ok} из ${Object.keys(self).length}`);
  for (const [k, v] of Object.entries(self)) if (!v) console.log(`   🔴 не ловит: ${k}`);
  await page.context().close();
}
let totals = { чисто: 0, дефекты: 0 };

for (const view of VIEWS) {
  const ctxs = {};
  const getPage = async (who) => {
    const key = who || 'гость';
    if (ctxs[key]) return ctxs[key];
    const ctx = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      colorScheme: view.theme, permissions: ['camera', 'microphone'],
    });
    const page = await ctx.newPage();
    if (who !== 'гость') {
      await page.goto(`${DEV}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await page.getByPlaceholder('you@example.com').fill(accounts[who]);
      await page.locator('input[type=password]').fill(pass);
      await page.getByRole('button', { name: 'Войти' }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
    }
    ctxs[key] = page;
    return page;
  };

  for (const [key, url] of urlOf) {
    const [route, who] = key.split('|');
    const page = await getPage(who);
    try {
      await page.goto(`${DEV}${url}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2200);
      if (view.kids) { await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'kids')); await page.waitForTimeout(500); }
      await page.addScriptTag({ content: AUDIT });
      const report = await page.evaluate(({ label, mobile }) => window.flAudit({ label, mobile }),
        { label: `${route} · ${who}`, mobile: view.width < 700 });
      /*
       * 🔴 ПРИБОР СОВРАЛ — МОЙ СОБСТВЕННЫЙ, И МОЛЧА. Первый прогон напечатал «204 клетки,
       * 0 дефектов»: я читал `report.checks`, которого у прибора дизайнера нет вовсе.
       * Несуществующее поле дало пустой объект, пустой объект — ноль дефектов, ноль
       * дефектов — «чисто» над всеми экранами подряд. Ровно та зелёная клетка, о которой
       * весь наряд: сомнение вызвало не число, а его невозможность.
       *
       * Вердикт лежит в `report.verdict` — там строки «ok» или «ДЕФЕКТ …», как их печатает
       * `design-audit.mjs`. Фигуры внутри рисунка отсеиваем так же, как он.
       */
      const SVG_SHAPES = new Set(['g', 'ellipse', 'circle', 'path', 'rect', 'polygon', 'line', 'polyline']);
      const isArt = (o) => SVG_SHAPES.has(String(o.a).split('[')[0]) && SVG_SHAPES.has(String(o.b).split('[')[0]);
      report.overlaps = (report.overlaps ?? []).filter((o) => !isArt(o));
      report.verdict.overlaps = report.overlaps.length ? `ДЕФЕКТ ${report.overlaps.length}` : 'ok';
      const defects = Object.entries(report.verdict || {})
        .filter(([, v]) => String(v).startsWith('ДЕФЕКТ'))
        .map(([k, v]) => `${k} ${String(v).replace('ДЕФЕКТ', '').trim()}`);
      const state = stateOf.get(key) || '?';
      if (defects.length) totals.дефекты++; else totals.чисто++;
      appendFileSync(LOG, JSON.stringify({ route, who, view: view.name, state, defects }) + '\n');
      if (defects.length) console.log(`${route} · ${who} · [${state}] · ${view.name}: ${defects.join(' · ')}`);
    } catch (e) {
      appendFileSync(LOG, JSON.stringify({ route, who, view: view.name, state: 'не открылся', error: String(e).slice(0, 120) }) + '\n');
      console.log(`${route} · ${who} · ${view.name}: НЕ ОТКРЫЛСЯ`);
    }
  }
  for (const p of Object.values(ctxs)) await p.context().close();
  console.log(`— вид «${view.name}» пройден —`);
}
console.log(`\nвсего клеток: ${totals.чисто + totals.дефекты} · с дефектами: ${totals.дефекты} · чисто: ${totals.чисто}`);
await browser.close();
