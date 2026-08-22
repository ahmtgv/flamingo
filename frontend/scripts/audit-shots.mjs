/**
 * ПРИБОР ЖИВОГО ПРОГОНА (аудит 22.08, §8 промпта владельца).
 *
 * Снимает каждый маршрут из `app/router.tsx` в четырёх видах, для роли, которой он
 * предназначен, и КЛАССИФИЦИРУЕТ то, что видно: пусто · загрузка · отказ · молчаливая
 * пустота · наполнено · падение. Состояние попадает в имя файла — снимок без состояния
 * дизайнеру бесполезен: он не отличит «пусто по замыслу» от «пусто, потому что сломано».
 *
 * Не чинит ничего и не должен: это аудит.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';

const DEV = process.env.DEV || 'http://127.0.0.1:5173';
const API = process.env.API || 'http://localhost:8000/graphql/';
const OUT = process.env.OUT || '/Users/piu/Downloads/flamingo/docs/audit/screens';
const STATE_TAG = process.env.STATE_TAG || 'пустая-база';
const LOG = process.env.LOG || '/tmp/audit-shots.jsonl';
const pass = 'T3stPass!2026';
mkdirSync(OUT, { recursive: true });

async function gql(q, v, t) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify({ query: q, variables: v }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

const VIEWS = (process.env.ONE_VIEW ? [{ name: 'светлая', width: 1280, height: 800, theme: 'light', kids: false }] : [
  { name: 'светлая', width: 1280, height: 800, theme: 'light', kids: false },
  { name: 'тёмная', width: 1280, height: 800, theme: 'dark', kids: false },
  { name: 'детская', width: 1280, height: 800, theme: 'light', kids: true },
  { name: '1512', width: 1512, height: 982, theme: 'light', kids: false },
]);

// Маршруты — по порядку из router.tsx. `who` — роль, которой экран предназначен.
// Параметры подставляются из засева; на пустой базе их нет, и это само по себе наблюдение.
const ids = JSON.parse(process.env.IDS || '{}');
const P = (s) => s
  .replace(':courseId', ids.course || 'нет-курса')
  .replace(':id', ids.course || 'нет-курса')
  .replace(':lessonId', ids.lesson || 'нет-занятия')
  .replace(':sessionId', ids.session || 'нет-занятия')
  .replace(':groupId', ids.group || 'нет-группы')
  .replace(':slug', ids.slug || 'нет-точки')
  .replace(':code', ids.code || 'FLM-НЕТ')
  .replace(':role', 'teacher')
  .replace(':scene', 'board');

const ROUTES = [
  ['/', null], ['/login', null], ['/register', null], ['/register/:role', null],
  ['/reset', null], ['/reset-password', null], ['/demo', null], ['/projector', null],
  ['/join/:code', null], ['/несуществующий-адрес', null],
  ['/app', 'teacher'], ['/app', 'pupil'], ['/app', 'parent'], ['/app', 'admin'],
  ['/start', 'teacher'], ['/start', 'pupil'],
  ['/my-learning', 'pupil'], ['/repetition', 'pupil'],
  ['/courses', null], ['/courses', 'teacher'], ['/courses/new', 'teacher'],
  ['/courses/:id', 'teacher'], ['/subjects/:courseId', 'teacher'], ['/subjects/:courseId', 'pupil'],
  ['/к/:slug', null], ['/j/:slug', null], ['/groups/:groupId/invite', 'teacher'],
  ['/связать', 'teacher'], ['/link', 'teacher'], ['/setup', null], ['/settings', null],
  ['/источники', 'pupil'], ['/sources', 'pupil'],
  ['/кабинет', 'pupil'], ['/account', 'pupil'], ['/account', 'teacher'],
  ['/schedule', 'teacher'], ['/schedule', 'pupil'],
  ['/homework', 'pupil'], ['/homework', 'teacher'],
  ['/journal/:courseId', 'teacher'], ['/grading', 'teacher'],
  ['/admin', 'admin'], ['/admin/people', 'admin'], ['/admin/verification', 'admin'],
  ['/courses/:courseId/invite', 'teacher'],
  ['/courses/:courseId/lessons/:lessonId/schedule', 'teacher'],
  ['/lessons/:lessonId/homework', 'pupil'],
  ['/sessions/:sessionId/window/:scene', 'teacher'],
  ['/sessions/:sessionId/room', 'teacher'], ['/sessions/:sessionId/room', 'pupil'],
];

const accounts = JSON.parse(process.env.ACCOUNTS);

/** Что человек видит — одним словом. Порядок веток важен: падение сильнее пустоты. */
function classify({ text, hasLoader, crashed, landed, route }) {
  if (crashed) return 'падение';
  const same = (() => {
    try { return decodeURIComponent(landed) === decodeURIComponent(route); }
    catch { return landed === route; }
  })();
  if (!same) return 'увело';
  const t = text.replace(/\s+/g, ' ').trim();
  if (/Сервер не ответил|не удалось|Не удалось|Ошибка|ошибка|попробуйте ещё раз|Попробовать снова|не отвечает|не найдено|Не найдено|отказ/.test(t))
    return 'отказ';
  if (/Пока |пока никто|Здесь появится|ничего не|Ничего не|нет заданий|ЗАДАНИЙ НЕТ|ОЧЕРЕДЬ ПУСТА|пусто|Пусто|не найдены|Ничего нет/.test(t))
    return 'пусто';
  if (hasLoader) return 'загрузка';
  if (t.length < 40) return 'молчание';
  return 'наполнено';
}

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
writeFileSync(LOG, '');

for (const view of VIEWS) {
  // Один контекст на роль и вид: вход делается один раз, а не на каждый снимок.
  const ctxs = {};
  const getCtx = async (who) => {
    const key = who || 'гость';
    if (ctxs[key]) return ctxs[key];
    const ctx = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      colorScheme: view.theme,
      permissions: ['camera', 'microphone'],
    });
    const page = await ctx.newPage();
    if (who) {
      await page.goto(`${DEV}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await page.getByPlaceholder('you@example.com').fill(accounts[who]);
      await page.locator('input[type=password]').fill(pass);
      await page.getByRole('button', { name: 'Войти' }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    ctxs[key] = { ctx, page };
    return ctxs[key];
  };

  for (const [routeTpl, who] of ROUTES) {
    const route = P(routeTpl);
    const { page } = await getCtx(who);
    const crashes = [];
    const onErr = (e) => crashes.push(String(e).replace(/\s+/g, ' ').slice(0, 120));
    page.on('pageerror', onErr);
    try {
      await page.goto(`${DEV}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(view.kids ? 1800 : 2200);
      if (view.kids) {
        await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'kids'));
        await page.waitForTimeout(500);
      }
      const seen = await page.evaluate(() => ({
        text: (document.body.innerText || '').slice(0, 700),
        hasLoader: !!document.querySelector('[class*="loader" i],[class*="skeleton" i],[class*="spinner" i],[aria-busy="true"]'),
        landed: location.pathname,
      }));
      const state = classify({ ...seen, crashed: crashes.length > 0, route });
      const slug = routeTpl.replace(/^\//, '').replace(/\//g, '-').replace(/:/g, '') || 'корень';
      const file = `${OUT}/${slug}__${who || 'гость'}__${state}__${view.name}.png`;
      await page.screenshot({ path: file, fullPage: false });
      appendFileSync(LOG, JSON.stringify({
        route: routeTpl, url: route, who: who || 'гость', view: view.name, dataState: STATE_TAG,
        state, landed: seen.landed, crashes: crashes.slice(0, 2),
        text: seen.text.replace(/\s+/g, ' ').slice(0, 220), file,
      }) + '\n');
      if (view.name === 'светлая') {
        console.log(`${routeTpl} · ${who || 'гость'} · ${state}${crashes.length ? ' · ПАДЕНИЕ: ' + crashes[0].slice(0, 70) : ''}`);
      }
    } catch (e) {
      appendFileSync(LOG, JSON.stringify({
        route: routeTpl, who: who || 'гость', view: view.name, dataState: STATE_TAG,
        state: 'не открылся', error: String(e).slice(0, 150),
      }) + '\n');
      if (view.name === 'светлая') console.log(`${routeTpl} · ${who || 'гость'} · НЕ ОТКРЫЛСЯ · ${String(e).slice(0, 60)}`);
    }
    page.off('pageerror', onErr);
  }
  for (const { ctx } of Object.values(ctxs)) await ctx.close();
  console.log(`— вид «${view.name}» снят —`);
}
await browser.close();
