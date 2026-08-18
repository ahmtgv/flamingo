#!/usr/bin/env node
/**
 * 🔴 ВИДЕО МЕЖДУ ДВУМЯ ЖИВЫМИ ЛЮДЬМИ — ПРИБОР (наряд 35 §1.2).
 *
 * Двое входят в один урок с ФИКТИВНЫМИ камерами Chromium
 * (`--use-fake-device-for-media-stream` даёт настоящий медиапоток без железа) и прибор
 * печатает три вещи, которых раньше никто не измерял:
 *
 *   1. дошло ли соединение до `connected` у ОБОИХ (лог самого livekit-client);
 *   2. пришла ли УДАЛЁННАЯ дорожка на уровень webrtc (обёртка над `RTCPeerConnection`
 *      ставится в страницу ДО загрузки приложения — продукт для этого не трогаем);
 *   3. привязана ли она к элементу на экране и КАК ПОДПИСАНА — «Аня К.» или огрызок id.
 *
 * ⚠️ Чего прибор НЕ проверяет и проверить не может: слышно ли и видно ли ГЛАЗАМИ. Фиктивная
 * камера отдаёт синтетическую картинку, а звук никто не слушает. Это остаётся человеку —
 * см. три шага для владельца в отчёте промпта 35.
 *
 * Запуск (бэкенд на 8000, dev-сервер на 5173):
 *     node frontend/scripts/two-people-video.mjs
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
const tE = `vid-t-${n}@flamingo-test.invalid`, pE = `vid-p-${n}@flamingo-test.invalid`;
const teacher = (await gql(REG, { i: { email: tE, password: pass, firstName: 'Ирина', lastName: 'П', role: 'TEACHER', consent152fz: true } })).registerUser.token;
const pupil = (await gql(REG, { i: { email: pE, password: pass, firstName: 'Аня', lastName: 'К', role: 'STUDENT', student: { birthDate: '2011-05-01' }, consent152fz: true } })).registerUser.token;
const course = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Видео', subject: 'Английский', level: 'GRADE_9' } }, teacher)).createCourse.id;
const sec = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c: course, t: 'U1' }, teacher)).createSection.id;
const les = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:60}){ id } }', { s: sec, t: 'Урок' }, teacher)).createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: les }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c: course }, teacher);
await gql('mutation($c:ID!){ enroll(courseId:$c){ id } }', { c: course }, pupil);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: les, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);
console.log('урок заведён:', session);

const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',      // не спрашивать разрешение
    '--use-fake-device-for-media-stream',  // настоящий медиапоток без камеры
    '--autoplay-policy=no-user-gesture-required',
  ],
});

async function person(name, email) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    permissions: ['camera', 'microphone'],
  });
  const page = await ctx.newPage();
  // 🔴 ПРИБОР ВНУТРИ СТРАНИЦЫ, НЕ В ПРОДУКТЕ. Оборачиваем RTCPeerConnection до загрузки
  // приложения и записываем, пришла ли УДАЛЁННАЯ дорожка на уровне webrtc. Это отделяет
  // «медиа не доехало» от «доехало, но экран не показал».
  await page.addInitScript(() => {
    const w = window;
    w.__rtc = { tracks: [], ice: [], pcs: 0 };
    const Native = w.RTCPeerConnection;
    w.RTCPeerConnection = function (...args) {
      const pc = new Native(...args);
      w.__rtc.pcs += 1;
      pc.addEventListener('track', (e) => {
        w.__rtc.tracks.push(`${e.track.kind}:${e.track.readyState}`);
      });
      pc.addEventListener('iceconnectionstatechange', () => {
        w.__rtc.ice.push(pc.iceConnectionState);
      });
      return pc;
    };
    w.RTCPeerConnection.prototype = Native.prototype;
  });
  const sockets = [];
  page.on('websocket', (ws) => {
    const short = ws.url().split('?')[0];
    sockets.push(`${short} открыт`);
    ws.on('close', () => sockets.push(`${short} ЗАКРЫТ`));
    ws.on('socketerror', (e) => sockets.push(`${short} ОШИБКА ${String(e).slice(0, 60)}`));
    if (short.includes('livekit')) {
      let got = 0;
      ws.on('framereceived', () => { got += 1; if (got <= 3 || got % 25 === 0) sockets.push(`${short} кадров получено: ${got}`); });
    }
  });
  const errors = [];
  const ops = [];
  page.on('request', (r) => {
    if (!r.url().includes('/graphql')) return;
    const m = /"operationName":"([^"]+)"/.exec(r.postData() ?? '');
    if (m) ops.push(m[1]);
  });
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' || /livekit|room|track|participant|connect/i.test(text)) {
      errors.push(`${m.type()}: ${text.slice(0, 180)}`);
    }
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 180)}`));
  await page.goto(`${DEV}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type=password]').fill(pass);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await page.goto(`${DEV}/sessions/${session}/room`);
  await page.waitForTimeout(1500);
  return { name, ctx, page, sockets, errors, ops };
}

const t1 = await person('преподаватель', tE);
const p1 = await person('ученик', pE);

// Оба нажимают «войти в эфир» — как человек.
for (const who of [t1, p1]) {
  const join = who.page.getByRole('button', { name: /эфир|камер|подключ|войти/i }).first();
  const found = await join.count();
  console.log(`[${who.name}] кнопка входа в эфир найдена: ${found}`);
  if (found) await join.click().catch((e) => console.log(`[${who.name}] клик не прошёл: ${String(e).slice(0, 80)}`));
  await who.page.waitForTimeout(1000);
}

// Ждём долго и печатаем ход: «не успело за 8 секунд» и «не пришло вовсе» — разные новости.
for (const ms of [3000, 5000, 7000, 10000]) {
  await t1.page.waitForTimeout(ms);
  const count = async (who) => who.page.evaluate(() =>
    [...document.querySelectorAll('video')].filter((v) => v.srcObject).length);
  console.log(`[+${ms}мс] дорожек у преподавателя ${await count(t1)}, у ученика ${await count(p1)}`);
}

for (const who of [t1, p1]) {
  const seen = (await who.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const videos = await who.page.evaluate(() =>
    [...document.querySelectorAll('video')].map((v) => {
      const tile = v.closest('[class*=tile], [class*=Tile], figure, li, div');
      const label = (tile?.innerText || '').replace(/\s+/g, ' ').slice(0, 40);
      return {
        подпись: label || v.getAttribute('aria-label') || '(без подписи)',
        поток: !!v.srcObject,
        дорожки: v.srcObject ? (v.srcObject).getTracks().map((t) => t.kind).join('+') : '',
        размер: `${v.videoWidth}x${v.videoHeight}`,
        играет: !v.paused,
      };
    }),
  );
  console.log(`\n[${who.name}] на экране: ${JSON.stringify(seen.slice(0, 220))}`);
  console.log(`[${who.name}] элементов video: ${videos.length} → ${JSON.stringify(videos)}`);
  console.log(`[${who.name}] сокеты: ${JSON.stringify(who.sockets)}`);
  console.log(`[${who.name}] консоль: ${JSON.stringify([...new Set(who.errors)].slice(0, 8), null, 1)}`);
  const audio = await who.page.evaluate(() =>
    [...document.querySelectorAll('audio')].map((a) => ({
      поток: !!a.srcObject,
      дорожки: a.srcObject ? (a.srcObject).getTracks().map((t) => `${t.kind}:${t.readyState}`).join('+') : '',
      играет: !a.paused,
      громкость: a.volume,
      заглушен: a.muted,
    })),
  );
  console.log(`[${who.name}] элементов audio: ${audio.length} → ${JSON.stringify(audio)}`);
  console.log(`[${who.name}] операции: ${JSON.stringify([...new Set(who.ops)])}`);
  const rtc = await who.page.evaluate(() => (window).__rtc);
  console.log(`[${who.name}] webrtc: соединений ${rtc.pcs}, удалённых дорожек ${rtc.tracks.length} ${JSON.stringify(rtc.tracks)}, ice ${JSON.stringify([...new Set(rtc.ice)])}`);
}
await browser.close();
