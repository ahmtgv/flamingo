#!/usr/bin/env node
/**
 * 🔴 ВОРОТА ДЕМО-КОМНАТЫ: настоящее занятие отсюда недостижимо (наряд 36 §3).
 *
 * Наряд требует доказать это ПОПЫТКОЙ, а не рассуждением. Прибор заводит настоящее живое
 * занятие, приходит с афиши в демо, рисует на доске — и потом пробует дотянуться до занятия
 * тремя способами: адресом `/demo/<id>`, чтением того же адреса на экране и прямым запросом
 * к API из консоли страницы, как сделал бы любопытный.
 *
 * ⚠️ ПРИБОР УЖЕ ОДИН РАЗ СОВРАЛ: фильтр `url.includes('/graphql')` ловил не только запросы к
 * API, но и GET-ы vite за файлами `graphql-ws.js` и `generated.ts` — и в списке «запросов
 * демо-страницы» появлялись две пустые строки. Отсюда разделение по методу.
 *
 * Запуск (бэкенд на 8000, dev-сервер на 5173):
 *     node frontend/scripts/demo-is-sealed.mjs
 */
import { chromium } from 'playwright';
const DEV = 'http://127.0.0.1:5173';
const API = 'http://localhost:8000/graphql/';
const pass = 'T3stPass!2026';
async function gql(q, v, t) {
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
// Заводим НАСТОЯЩЕЕ занятие, чтобы было до чего дотягиваться.
const n = Date.now();
const REG = `mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }`;
const teacher = (await gql(REG, { i: { email: `dm-t-${n}@flamingo-test.invalid`, password: pass, firstName: 'Ирина', lastName: 'П', role: 'TEACHER', consent152fz: true } })).data.registerUser.token;
const course = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Настоящий', subject: 'Английский', level: 'GRADE_9' } }, teacher)).data.createCourse.id;
const sec = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c: course, t: 'U1' }, teacher)).data.createSection.id;
const les = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:40}){ id } }', { s: sec, t: 'Секретный урок' }, teacher)).data.createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: les }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c: course }, teacher);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: les, startAt: new Date().toISOString() } }, teacher)).data.scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);
console.log('настоящее занятие заведено:', session);

const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const ops = [];
page.on('request', (r) => {
  if (!r.url().includes('/graphql')) return;
  if (r.method() !== 'POST') { ops.push(`${r.method()} ${r.url().split('?')[0].slice(-40)} — это веб-сокет, не запрос`); return; }
  const m = /"operationName":"([^"]+)"/.exec(r.postData() ?? '');
  ops.push(`${page.url().includes('/demo') ? 'НА ДЕМО' : 'вне демо'}: ${m ? m[1] : (r.postData() ?? '(без тела)').slice(0, 70)}`);
});

// 1) Гость приходит с афиши по кнопке «Смотреть урок».
await page.goto(`${DEV}/`);
await page.waitForTimeout(1500);
await page.getByRole('link', { name: 'Смотреть урок' }).click();
await page.waitForTimeout(2000);
console.log('куда привела кнопка:', page.url());

// 2) Рисует на доске — это и есть «трогает продукт».
const box = await page.locator('svg[role=application]').boundingBox();
await page.mouse.move(box.x + 80, box.y + 80);
await page.mouse.down();
await page.mouse.move(box.x + 220, box.y + 160, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(500);
console.log('штрихов на демо-доске:', await page.locator('svg[role=application] polyline').count());

// 3) ПОПЫТКА дотянуться до настоящего занятия — тремя способами.
const попытки = [];
попытки.push(['адресом', await page.goto(`${DEV}/demo/${session}`).then(() => page.url()).catch((e) => String(e).slice(0, 40))]);
await page.waitForTimeout(1200);
попытки.push(['на экране', (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 120)]);
// прямой запрос к API без токена — как это сделал бы любопытный из консоли
const прямой = await page.evaluate(async (id) => {
  const r = await fetch('/graphql/', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'query($id:ID!){ session(id:$id){ id roomToken lesson { title } } }', variables: { id } }),
  });
  return (await r.text()).slice(0, 160);
}, session);
попытки.push(['прямым запросом без токена', прямой]);

for (const [как, что] of попытки) console.log(`попытка ${как}: ${JSON.stringify(что)}`);
console.log('запросы демо-страницы к серверу:', JSON.stringify([...new Set(ops)]));
await b.close();
