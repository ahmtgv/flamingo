#!/usr/bin/env node
/**
 * 🔴 ВТОРОЙ ЭКРАН ПОЛУЧАЕТ НАВЕДЕНИЕ (наряд 36 §4).
 *
 * `projectorFocusChanged` жила и была проверена поведением ещё в промпте 34, `ProjectorScreen`
 * её слушал — а послать фокус было НЕКОМУ: `setProjectorFocus` не вызывалась ни одной строкой
 * продукта и числилась среди сирот. Преподаватель выводил урок на второй экран и не мог
 * навести его ни на кого; планшет как доска (§21) без этого не работал.
 *
 * Прибор: двое в комнате, третьим подписывается «второй экран» — тем же запросом, что и
 * `ProjectorScreen`. Преподаватель нажимает на плитку ученика рукой, и печатается кадр,
 * пришедший второму экрану.
 *
 * Запуск (бэкенд на 8000, dev-сервер на 5173):
 *     node frontend/scripts/projector-focus.mjs
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
const tE = `pj-t-${n}@flamingo-test.invalid`, pE = `pj-p-${n}@flamingo-test.invalid`;
const teacher = (await gql(REG, { i: { email: tE, password: pass, firstName: 'Ирина', lastName: 'П', role: 'TEACHER', consent152fz: true } })).registerUser.token;
const pupil = (await gql(REG, { i: { email: pE, password: pass, firstName: 'Аня', lastName: 'К', role: 'STUDENT', student: { birthDate: '2011-05-01' }, consent152fz: true } })).registerUser.token;
const course = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Проектор', subject: 'Английский', level: 'GRADE_9' } }, teacher)).createCourse.id;
const sec = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c: course, t: 'U1' }, teacher)).createSection.id;
const les = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:40}){ id } }', { s: sec, t: 'Урок' }, teacher)).createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: les }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c: course }, teacher);
await gql('mutation($c:ID!){ enroll(courseId:$c){ id } }', { c: course }, pupil);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: les, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);

const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
async function person(email) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  await page.goto(`${DEV}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type=password]').fill(pass);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await page.goto(`${DEV}/sessions/${session}/room`);
  await page.waitForTimeout(2000);
  const join = page.getByRole('button', { name: /эфир|камер|подключ|войти/i }).first();
  if (await join.count()) await join.click().catch(() => undefined);
  await page.waitForTimeout(3000);
  return page;
}
const t = await person(tE);
const p = await person(pE);
await t.waitForTimeout(6000);

// Второй экран: подписываемся ровно тем же, чем подписывается ProjectorScreen.
const seen = [];
const ws = new (await import('ws')).default('ws://localhost:8000/graphql/', 'graphql-transport-ws');
await new Promise((res) => ws.on('open', res));
ws.send(JSON.stringify({ type: 'connection_init', payload: { authToken: `Bearer ${teacher}` } }));
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'connection_ack') {
    ws.send(JSON.stringify({ id: '1', type: 'subscribe', payload: { query: 'subscription($s:ID!){ projectorFocusChanged(sessionId:$s){ sessionId studentId } }', variables: { s: session } } }));
  }
  if (m.type === 'next') seen.push(JSON.stringify(m.payload.data));
});
await t.waitForTimeout(1500);

// Преподаватель нажимает на плитку ученика — как рукой.
const tile = t.locator('[class*=tile], [class*=Tile]').filter({ hasText: 'Аня' }).first();
console.log('плитка ученика найдена:', await tile.count());
if (await tile.count()) await tile.click();
await t.waitForTimeout(2500);
console.log('второй экран получил:', seen.length ? seen.join(' | ') : 'НИЧЕГО');
ws.close();
await b.close();
