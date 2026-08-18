#!/usr/bin/env node
/**
 * 🔴 ДОЛГИЙ УРОК — ЧТО НАКАПЛИВАЕТСЯ ЗА ЧАСЫ (наряд 34 §3.1).
 *
 * Два браузера в одной комнате, преподаватель рисует три штриха в минуту, снимок чисел каждую
 * минуту: память, узлы разметки, штрихи у обоих, ошибки консоли. За минуту такого не увидеть —
 * прибор и нужен затем, чтобы кто-то отсидел сорок минут вместо человека.
 *
 * Запуск (бэкенд на 8000, dev-сервер на 5173):
 *     MINUTES=40 node frontend/scripts/long-lesson.mjs
 *
 * ⚠️ ПРИБОР УЖЕ ОДИН РАЗ СОВРАЛ, И ВЫВОД ВЫГЛЯДЕЛ УБЕДИТЕЛЬНО. Окно по умолчанию 1280×720,
 * холст начинается на y≈525 и уходит на 360 вниз — его нижние две трети ЗА окном, мышь туда
 * не доносит, штрих не рождается. Получилось «доска встала на пятнадцатой минуте» — ровно
 * срок жизни токена, то есть совпадение, объясняющее само себя. Отсюда окно 1280×1000 и
 * расчёт точки от НИЖНЕЙ границы окна, а не от размеров холста.
 */
import { chromium } from 'playwright';

const DEV = 'http://127.0.0.1:5173';
const API = 'http://localhost:8000/graphql/';
const MINUTES = Number(process.env.MINUTES ?? 45);

async function gql(query, variables, token) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

const REG = `mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }`;
const n = Date.now();
const pass = 'T3stPass!2026';
const tEmail = `long-t-${n}@flamingo-test.invalid`;
const pEmail = `long-p-${n}@flamingo-test.invalid`;
const teacher = (await gql(REG, { i: { email: tEmail, password: pass, firstName: 'Ирина', lastName: 'Петровна', role: 'TEACHER', consent152fz: true } })).registerUser.token;
const pupil = (await gql(REG, { i: { email: pEmail, password: pass, firstName: 'Аня', lastName: 'Коваль', role: 'STUDENT', student: { birthDate: '2011-05-01' }, consent152fz: true } })).registerUser.token;
const course = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Долгий урок', subject: 'Английский', level: 'GRADE_9' } }, teacher)).createCourse.id;
const section = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c: course, t: 'Unit 1' }, teacher)).createSection.id;
const lesson = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:240}){ id } }', { s: section, t: 'Урок' }, teacher)).createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: lesson }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c: course }, teacher);
await gql('mutation($c:ID!){ enroll(courseId:$c){ id } }', { c: course }, pupil);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: lesson, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);

const browser = await chromium.launch();
// ⚠️ ПРИБОР ВРАЛ В ПЕРВОМ ЗАХОДЕ. Окно 1280×720, холст начинается на y≈525 — его нижние две
// трети за окном, и половина «нарисованных» штрихов не рождалась вовсе. Числа штрихов из
// того захода недействительны; числа памяти — действительны, они от окна не зависят.
const ctxT = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const ctxP = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const pageT = await ctxT.newPage();
const pageP = await ctxP.newPage();

async function signIn(page, email) {
  await page.goto(`${DEV}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type=password]').fill(pass);
  await page.getByRole('button', { name: 'Войти' }).click();
  try {
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  } catch (e) {
    console.log('ПРИБОР: вход не прошёл, на экране:', (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 240));
    throw e;
  }
}
await signIn(pageT, tEmail);
await signIn(pageP, pEmail);
for (const page of [pageT, pageP]) {
  await page.goto(`${DEV}/sessions/${session}/room`);
  await page.getByRole('tab', { name: 'Доска' }).click().catch(() => {});
  await page.waitForTimeout(1500);
}

const errors = [];
for (const [who, page] of [['преп', pageT], ['учен', pageP]]) {
  page.on('pageerror', (e) => errors.push(`${who}: ${String(e).slice(0, 120)}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${who} console: ${m.text().slice(0, 120)}`); });
}

async function numbers(page) {
  return page.evaluate(() => ({
    heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576),
    nodes: document.querySelectorAll('*').length,
    paths: document.querySelectorAll('[class*=surface] svg path').length,
    listeners: (performance.eventCounts?.size ?? 0),
  }));
}

console.log('минута\tпреп.МБ\tпреп.узлов\tучен.МБ\tучен.узлов\tштрихов\tошибок');
for (let m = 0; m <= MINUTES; m += 1) {
  // Рисуем, как на настоящем уроке: несколько штрихов в минуту.
  try {
    const box = await pageT.locator('[class*=surface]').first().boundingBox();
    if (box) {
      for (let k = 0; k < 3; k += 1) {
        // Паузa между штрихами: без неё они склеиваются в один и счёт врёт в другую сторону.
        await pageT.waitForTimeout(250);
        const room = Math.max(40, Math.min(box.height, (pageT.viewportSize().height - box.y) - 60));
        const x = box.x + 40 + ((m * 7 + k * 23) % Math.max(40, box.width - 80));
        const y = box.y + 20 + ((m * 11 + k * 17) % room);
        await pageT.mouse.move(x, y);
        await pageT.mouse.down();
        await pageT.mouse.move(x + 30, y + 20, { steps: 4 });
        await pageT.mouse.up();
      }
    }
  } catch (e) {
    errors.push(`рисование: ${String(e).slice(0, 100)}`);
  }
  const a = await numbers(pageT);
  const b = await numbers(pageP);
  console.log(`${m}\t${a.heapMB}\t${a.nodes}\t${b.heapMB}\t${b.nodes}\t${a.paths}/${b.paths}\t${errors.length}`);
  if (m < MINUTES) await new Promise((r) => setTimeout(r, 60_000));
}
console.log('--- ошибки:', errors.length ? JSON.stringify([...new Set(errors)].slice(0, 12), null, 1) : 'нет');
console.log('--- урок ещё жив у ученика:', JSON.stringify((await pageP.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 160)));
await browser.close();
