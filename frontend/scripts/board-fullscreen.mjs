#!/usr/bin/env node
/**
 * 🔴 ДОСКА В ПОЛНОМ ЭКРАНЕ — ПО ЧАСТЯМ (наряд 37 §1.4).
 *
 * Владелец на живом уроке: «в приложении зависла доска на развёрнутом экране — доску надо
 * шаманить, там несколько багов». Наряд требует назвать каждую поломку отдельно, а не
 * «починил доску». Прибор проверяет пять частей по одной: перерисовку холста, рисование,
 * приход чужого штриха, масштаб щипком, выход по Esc.
 *
 * ⚠️ ПРИБОР СОВРАЛ ОДИН РАЗ И ЧУТЬ НЕ ДАЛ ЛОЖНЫЙ ДЕФЕКТ: встречный штрих «не приходил», а на
 * самом деле ученику доска ЗАКРЫТА по умолчанию, и он не рисовал вовсе. Отсюда проверка прав
 * перед замером — без неё вывод был бы про права, а не про полный экран.
 *
 * Запуск (бэкенд на 8000, dev-сервер на 5173):
 *     node frontend/scripts/board-fullscreen.mjs
 */
import { chromium } from 'playwright';
const DEV = 'http://127.0.0.1:5173';
const API = 'http://localhost:8000/graphql/';
const pass = 'T3stPass!2026';
async function gql(q, v, t) {
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ query: q, variables: v }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}
const n = Date.now();
const REG = `mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }`;
const tE = `fs-t-${n}@flamingo-test.invalid`, pE = `fs-p-${n}@flamingo-test.invalid`;
const teacher = (await gql(REG, { i: { email: tE, password: pass, firstName: 'Ирина', lastName: 'П', role: 'TEACHER', consent152fz: true } })).registerUser.token;
const pupil = (await gql(REG, { i: { email: pE, password: pass, firstName: 'Аня', lastName: 'К', role: 'STUDENT', student: { birthDate: '2011-05-01' }, consent152fz: true } })).registerUser.token;
const course = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Доска', subject: 'Английский', level: 'GRADE_9' } }, teacher)).createCourse.id;
const sec = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c: course, t: 'U1' }, teacher)).createSection.id;
const les = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:40}){ id } }', { s: sec, t: 'Урок' }, teacher)).createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: les }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c: course }, teacher);
await gql('mutation($c:ID!){ enroll(courseId:$c){ id } }', { c: course }, pupil);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: les, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);

const b = await chromium.launch();
async function open(email) {
  const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(`${DEV}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type=password]').fill(pass);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await page.goto(`${DEV}/sessions/${session}/room`);
  await page.getByRole('tab', { name: 'Доска' }).click();
  await page.waitForSelector('[role=toolbar]', { timeout: 20000 });
  return page;
}
const t = await open(tE);
const p = await open(pE);

const box = async (page) => page.evaluate(() => {
  const s = document.querySelector('[class*=surface]');
  const r = s?.getBoundingClientRect();
  const toolbar = document.querySelector('[role=toolbar]')?.getBoundingClientRect();
  return {
    холст: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : 'нет',
    холстВидим: r ? r.top >= 0 && r.bottom <= window.innerHeight + 1 : false,
    панельВидна: toolbar ? toolbar.top >= 0 && toolbar.bottom <= window.innerHeight : null,
    окно: `${window.innerWidth}x${window.innerHeight}`,
    полныйЭкран: !!document.fullscreenElement,
  };
});
const strokes = (page) => page.evaluate(() => document.querySelectorAll('[class*=surface] svg path').length);
async function draw(page, y) {
  const r = await page.locator('[class*=surface]').first().boundingBox();
  if (!r) return 'холста нет';
  const yy = Math.min(r.y + y, (page.viewportSize().height) - 40);
  await page.mouse.move(r.x + 60, yy);
  await page.mouse.down();
  await page.mouse.move(r.x + 160, yy + 40, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  return 'ok';
}

console.log('=== до полного экрана');
console.log('  преподаватель:', JSON.stringify(await box(t)));
await draw(t, 80);
await p.waitForTimeout(1200);
console.log(`  штрих дошёл ученику: у преп ${await strokes(t)}, у ученика ${await strokes(p)}`);

console.log('=== вход в полный экран');
await t.getByRole('button', { name: /Во весь экран|полн/i }).first().click().catch(async () => {
  await t.locator('[aria-label*="весь экран"], [title*="весь экран"]').first().click();
});
await t.waitForTimeout(1200);
console.log('  преподаватель:', JSON.stringify(await box(t)));

console.log('=== рисование в полном экране');
console.log('  ' + await draw(t, 120));
await p.waitForTimeout(1500);
console.log(`  штрихов: у преп ${await strokes(t)}, у ученика ${await strokes(p)}`);

console.log('=== чужой штрих приходит в полный экран');
// ⚠️ СНАЧАЛА ПРИБОР: ученику доска по умолчанию ЗАКРЫТА, и «не пришло» было бы выводом
// про права, а не про полный экран. Открываем её и убеждаемся, что он вообще может рисовать.
const openBtn = t.getByRole('button', { name: /Открыть доску|закрыта для учеников/i }).first();
console.log('  кнопка «открыть доску» найдена:', await openBtn.count());
if (await openBtn.count()) await openBtn.click().catch(() => undefined);
await p.waitForTimeout(1500);
const pupilCanDraw = await p.evaluate(() => !!document.querySelector('[role=toolbar]'));
console.log('  у ученика есть панель инструментов:', pupilCanDraw);
const before = await strokes(t);
await draw(p, 200).catch(() => undefined);
await t.waitForTimeout(2000);
console.log(`  у преподавателя было ${before}, стало ${await strokes(t)}`);

console.log('=== масштаб щипком в полном экране');
const r = await t.locator('[class*=surface]').first().boundingBox();
const w1 = await t.evaluate(() => Math.round(document.querySelector('[class*=surface] svg path')?.getBoundingClientRect().width ?? 0));
await t.mouse.move(r.x + r.width / 2, r.y + Math.min(r.height / 2, 300));
await t.keyboard.down('Control'); await t.mouse.wheel(0, -240); await t.keyboard.up('Control');
await t.waitForTimeout(500);
const w2 = await t.evaluate(() => Math.round(document.querySelector('[class*=surface] svg path')?.getBoundingClientRect().width ?? 0));
console.log(`  ширина штриха: было ${w1}, стало ${w2}`);

console.log('=== выход по Esc');
await t.keyboard.press('Escape');
await t.waitForTimeout(1000);
console.log('  преподаватель:', JSON.stringify(await box(t)));
await b.close();
