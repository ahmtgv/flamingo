/**
 * НИЖНИЙ КРАЙ ЭКРАНА В РАМЕ ПРИЛОЖЕНИЯ (наряд 49 §5).
 *
 * 🔴 Слот рамы равен `100dvh − 45px` (заголовок 44 + граница 1), и `.app { overflow: hidden }`
 * срезает разницу. Экран, который берёт высоту ОКНА, теряет снизу ровно эти 45 пикселей —
 * так у владельца уехали под край подпись очереди проверки и полоса оценки.
 *
 * Глаз это ловил ровно один раз — и то владельца. Прибор открывает каждый маршрут ВНУТРИ
 * рамы и сравнивает нижнюю границу содержимого с нижней границей слота.
 *
 * Рама включается тем же признаком, что и в продукте (`isDesktop()` — наличие
 * `__TAURI_INTERNALS__.invoke`), поэтому меряется настоящий случай, а не похожий.
 */
import { chromium } from 'playwright';

const DEV = process.env.DEV || 'http://127.0.0.1:5173';
const pass = 'T3stPass!2026';
const accounts = JSON.parse(process.env.ACCOUNTS);
const ids = JSON.parse(process.env.IDS || '{}');

const ROUTES = [
  ['/start', 'teacher'],
  ['/courses', 'teacher'],
  ['/courses/new', 'teacher'],
  [`/courses/${ids.course}`, 'teacher'],
  [`/courses/${ids.course}/invite`, 'teacher'],
  ['/homework', 'pupil'],
  ['/grading', 'teacher'],
  ['/account', 'pupil'],
  ['/settings', 'teacher'],
  ['/setup', 'teacher'],
];

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] });

// Вход — до включения рамы: в приложении формы входа нет вовсе (§19.4).
const login = await ctx.newPage();
await login.goto(`${DEV}/login`);
await login.waitForTimeout(1200);
await login.getByPlaceholder('you@example.com').fill(accounts.teacher);
await login.locator('input[type=password]').fill(pass);
await login.getByRole('button', { name: 'Войти' }).click();
await login.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
await login.close();

await ctx.addInitScript(() => {
  window.__TAURI_INTERNALS__ = { invoke: async () => undefined };
});

let bad = 0;
for (const [route] of ROUTES) {
  const page = await ctx.newPage();
  try {
    await page.goto(`${DEV}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => {
      const slot = document.querySelector('[class*="_viewport_"]');
      if (!slot) return { нетРамы: true };
      const box = slot.getBoundingClientRect();
      // Самый нижний видимый элемент внутри слота — то, что человек не досчитается.
      let lowest = box.top;
      let who = '';
      let whoEl = null;
      for (const el of slot.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || r.height === 0) continue;
        if (r.bottom > lowest) {
          lowest = r.bottom;
          who = `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`;
          whoEl = el;
        }
      }
      /*
       * 🔴 ГЕОМЕТРИИ МАЛО: экран, у которого работа прокручивается ВНУТРИ себя, честен —
       * низ там достижим колесом. Первая версия прибора смотрела только на прокрутку слота
       * и объявила срезанным `/account`, где всё на месте.
       *
       * Поэтому спрашиваем достижимость: просим браузер показать самый нижний узел и
       * смотрим, оказался ли он в кадре. Не оказался — низ недостижим никакими средствами.
       */
      const lowestEl = whoEl;
      lowestEl?.scrollIntoView({ block: 'end', inline: 'nearest' });
      const after = lowestEl ? lowestEl.getBoundingClientRect().bottom : lowest;
      const slotAfter = slot.getBoundingClientRect();
      return {
        слот: Math.round(slotAfter.bottom),
        низСодержимого: Math.round(after),
        срезано: Math.max(0, Math.round(after - slotAfter.bottom)),
        кто: who,
        прокрутка: Math.max(0, slot.scrollHeight - slot.clientHeight),
      };
    });
    /*
     * 🔴 ДВА РАЗНЫХ ДЕФЕКТА, И ВТОРОЙ ЧУТЬ НЕ ПРОШЁЛ МИМО.
     *
     * 1. Низ недостижим вовсе — содержимое ниже слота, и прокруткой его не достать.
     * 2. ПРОКРУЧИВАЕТСЯ САМ СЛОТ. Экран объявлен кадром ровно в окно; если он вылезает
     *    за раму, человек видит обрезанный низ и не догадывается крутить — он и не должен.
     *    Первая версия прибора считала это законным («низ же достижим колесом») и осталась
     *    зелёной, когда я вернул `100dvh` очереди проверки нарочно. Внутренние области
     *    прокручиваться могут сколько угодно — это про них не сказано.
     */
    if (m.нетРамы) { console.log(`${route}: рама не нарисовалась — проверка не состоялась`); bad += 1; }
    else if (m.срезано > 1) {
      console.log(`🔴 ${route}: срезано ${m.срезано} px (${m.кто}) — низ недостижим`);
      bad += 1;
    } else if (m.прокрутка > 1) {
      console.log(`🔴 ${route}: экран вылез за раму — слот прокручивается на ${m.прокрутка} px`);
      bad += 1;
    } else {
      console.log(`${route}: низ на месте`);
    }
  } catch (e) {
    console.log(`${route}: НЕ ОТКРЫЛСЯ — ${String(e).slice(0, 60)}`);
    bad += 1;
  }
  await page.close();
}
await browser.close();
console.log(bad ? `\n🔴 экранов со срезанным низом: ${bad}` : '\nнизы на месте у всех');
process.exit(bad ? 1 : 0);
