#!/usr/bin/env node
/**
 * 🔴 ПРИБОРЫ ДИЗАЙНЕРА — ПО НАСТОЯЩИМ ЭКРАНАМ ПРОДУКТА (наряд 40 §0, §5).
 *
 * `docs/design-handover/audit.js` написан для его листов: открыть в браузере, позвать
 * `flAudit()`. Здесь тот же прибор приводится к нашему продукту — шестнадцать проверок
 * геометрии и цвета на живых экранах, во всех видах.
 *
 * ⚠️ ПРИБОРЫ ДИЗАЙНЕРА МЕРЯЮТ МАКЕТ, НАШИ — ПОВЕДЕНИЕ. Нужны оба: его поймают съехавшую
 * геометрию, наши — сломанную работу. Этот файл не заменяет ни один наш прогон.
 *
 * ⚠️ `pageScroll` — правило ДЕСКТОПНОЕ (§43). На телефоне прокрутка разрешена, и мерить её
 * там нечего; поэтому ширины здесь только настольные.
 *
 * Запуск (бэкенд на 8000, dev-сервер на 5173):
 *     node frontend/scripts/design-audit.mjs
 *     SCREENS=/start,/my-learning node frontend/scripts/design-audit.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const DEV = process.env.AUDIT_BASE ?? 'http://127.0.0.1:5173';
const API = process.env.AUDIT_API ?? 'http://localhost:8000/graphql/';
const AUDIT = readFileSync(new URL('../../docs/design-handover/audit.js', import.meta.url), 'utf8');
const pass = 'T3stPass!2026';

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

const REG = `mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }`;
const n = Date.now();
const teacherEmail = `da-t-${n}@flamingo-test.invalid`;
const pupilEmail = `da-p-${n}@flamingo-test.invalid`;
const teacher = (await gql(REG, { i: { email: teacherEmail, password: pass, firstName: 'Ирина', lastName: 'Петровна', role: 'TEACHER', teacher: { specialty: 'Английский' }, consent152fz: true } })).registerUser.token;
const pupil = (await gql(REG, { i: { email: pupilEmail, password: pass, firstName: 'Аня', lastName: 'Коваль', role: 'STUDENT', student: { birthDate: '2011-05-01' }, consent152fz: true } })).registerUser.token;
const course = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Английский A2', subject: 'Английский', level: 'GRADE_7' } }, teacher)).createCourse.id;
const section = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c: course, t: 'Unit 1' }, teacher)).createSection.id;
const lesson = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:40}){ id } }', { s: section, t: 'Present Perfect' }, teacher)).createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: lesson }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c: course }, teacher);
await gql('mutation($c:ID!){ enroll(courseId:$c){ id } }', { c: course }, pupil);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: lesson, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);

const DEFAULT_SCREENS = [
  ['/start', 'teacher'],
  ['/start', 'pupil'],
  ['/my-learning', 'pupil'],
  [`/subjects/${course}`, 'teacher'],
  [`/sessions/${session}/room`, 'teacher'],
  ['/', null],
];
const only = process.env.SCREENS?.split(',').map((s) => s.trim()).filter(Boolean);
const SCREENS = only ? DEFAULT_SCREENS.filter(([r]) => only.some((o) => r.startsWith(o))) : DEFAULT_SCREENS;

/** Виды приёмки: светлая · тёмная · детский, две настольные ширины (§5 п.2). */
const VIEWS = [
  { name: 'светлая 1280', width: 1280, height: 800, theme: 'light', kids: false },
  { name: 'тёмная 1280', width: 1280, height: 800, theme: 'dark', kids: false },
  { name: 'детский 1280', width: 1280, height: 800, theme: 'light', kids: true },
  { name: 'светлая 1512', width: 1512, height: 982, theme: 'light', kids: false },
];

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

// --- сначала САМОПРОВЕРКА прибора: без неё любой «ok» ничего не значит ------------------
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(`${DEV}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.addScriptTag({ content: AUDIT });
  const self = await page.evaluate(() => window.flAuditSelfTest());
  const ok = Object.values(self).filter(Boolean).length;
  console.log(`САМОПРОВЕРКА ПРИБОРА: ${ok} из ${Object.keys(self).length} true`);
  for (const [k, v] of Object.entries(self)) if (!v) console.log(`   🔴 не ловит: ${k}`);
  await page.context().close();
}

const rows = [];
for (const [route, who] of SCREENS) {
  for (const view of VIEWS) {
    const ctx = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      colorScheme: view.theme,
      permissions: ['camera', 'microphone'],
    });
    const page = await ctx.newPage();
    try {
      if (who) {
        await page.goto(`${DEV}/login`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        await page.getByPlaceholder('you@example.com').fill(who === 'teacher' ? teacherEmail : pupilEmail);
        await page.locator('input[type=password]').fill(pass);
        await page.getByRole('button', { name: 'Войти' }).click();
        await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
      }
      await page.goto(`${DEV}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      if (view.kids) {
        // Детский режим ставится на корень — тем же способом, что и продукт (`ThemeSync`).
        await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'kids'));
        await page.waitForTimeout(600);
      }
      await page.addScriptTag({ content: AUDIT });
      const report = await page.evaluate((label) => window.flAudit({ label }), `${route} · ${who ?? 'гость'}`);
      const defects = Object.entries(report.verdict).filter(([, v]) => String(v).startsWith('ДЕФЕКТ'));
      // Подробности — только для первого вида: они одинаковы во всех, а печатать вчетверо
      // значит утопить находку в повторах (той же болезнью страдал лог сервера, §37 §4.2).
      const details = view === VIEWS[0] || (process.env.DETAILS_ALL && defects.length)
        ? {
            overlaps: (report.overlaps ?? []).slice(0, 3),
            tapTargets: (report.tapTargets ?? []).slice(0, 6),
            clipped: (report.clipped ?? []).slice(0, 3),
            contrast: (report.contrast ?? []).slice(0, 4),
            // Кто именно накрыл текст: без имени слоя находка неисправима.
            textUnderLayer: (report.textUnderLayer ?? []).slice(0, 6),
            rowWrap: (report.rowWrap ?? []).slice(0, 3),
          }
        : null;
      rows.push({ route, who: who ?? 'гость', view: view.name, defects: defects.map(([k, v]) => `${k}: ${v}`), details });
    } catch (e) {
      rows.push({ route, who: who ?? 'гость', view: view.name, error: String(e).split('\n')[0].slice(0, 100) });
    }
    await ctx.close();
  }
}
await browser.close();

console.log('\n=== ВЕРДИКТ ПО ЭКРАНАМ ===');
let total = 0;
for (const r of rows) {
  if (r.error) { console.log(`  ${r.route} · ${r.who} · ${r.view}: не открылся — ${r.error}`); continue; }
  total += r.defects.length;
  console.log(`  ${r.route} · ${r.who} · ${r.view}: ${r.defects.length ? r.defects.join(' | ') : 'чисто'}`);
}
console.log(`\nвсего дефектов геометрии: ${total}`);

console.log('\n=== ПОДРОБНО (первый вид каждого экрана) ===');
for (const r of rows) {
  if (!r.details) continue;
  const d = r.details;
  const any = d.overlaps.length || d.tapTargets.length || d.clipped.length || d.textUnderLayer?.length || d.rowWrap?.length;
  if (!any) continue;
  console.log(`  ${r.route} · ${r.who}`);
  for (const x of d.overlaps) console.log('    пересечение:', JSON.stringify(x).slice(0, 190));
  for (const x of d.tapTargets) console.log('    мелкая цель:', JSON.stringify(x).slice(0, 150));
  for (const x of d.clipped) console.log('    обрезано:', JSON.stringify(x).slice(0, 150));
  for (const x of d.textUnderLayer ?? []) console.log('    текст под слоем:', JSON.stringify(x).slice(0, 190));
  for (const x of d.rowWrap ?? []) console.log('    ряд развалился:', JSON.stringify(x).slice(0, 190));
  for (const x of d.contrast ?? []) console.log('    контраст:', JSON.stringify(x).slice(0, 190));
}
