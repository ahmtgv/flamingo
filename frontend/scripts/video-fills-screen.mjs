#!/usr/bin/env node
/**
 * 🔴 СКОЛЬКО ЭКРАНА ЗАНИМАЕТ ВИДЕО (наряд 38 §1.1, требование владельца).
 *
 * «Экраны с видео учеников и учителя должны быть настолько большими, насколько позволяет
 * экран! Использовать экран полностью!»
 *
 * Замер ДО правки: 14 % экрана на 1440×900 и 9 % на 1920×1080, плитки 362×258 при любом окне.
 * ПОСЛЕ: 53 % и 61 %, плитки 523×653 и 763×833 — растут вместе с окном.
 *
 * ⚠️ ПРИБОР СОВРАЛ ДВАЖДЫ, и оба раза вывод был бы неверным:
 *   1. `[class*=room]` ловил `.roomActs` из шапки — 117 пикселей вместо высоты комнаты;
 *   2. первые правки «ничего не дали», потому что мерилась не та цепочка. Отсюда печать
 *      ВСЕЙ цепочки высот от плитки до окна: она и показала, где место теряется.
 *
 * Запуск (бэкенд на 8000, dev-сервер на 5173):
 *     node frontend/scripts/video-fills-screen.mjs
 */
import { chromium } from 'playwright';
const DEV = 'http://127.0.0.1:5173';
const API = 'http://localhost:8000/graphql/';
const pass = 'T3stPass!2026';
async function gql(q, v, t) {
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ query: q, variables: v }) });
  const j = await r.json(); if (j.errors) throw new Error(j.errors[0].message); return j.data;
}
const n = Date.now();
const REG = `mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }`;
const tE = `vv-t-${n}@flamingo-test.invalid`, pE = `vv-p-${n}@flamingo-test.invalid`;
const teacher = (await gql(REG, { i: { email: tE, password: pass, firstName: 'Ирина', lastName: 'П', role: 'TEACHER', teacher: { specialty: 'Английский' }, consent152fz: true } })).registerUser.token;
const pupil = (await gql(REG, { i: { email: pE, password: pass, firstName: 'Аня', lastName: 'К', role: 'STUDENT', student: { birthDate: '2011-05-01' }, consent152fz: true } })).registerUser.token;
const c = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Видео', subject: 'Английский', level: 'GRADE_9' } }, teacher)).createCourse.id;
const sec = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c, t: 'U1' }, teacher)).createSection.id;
const les = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:40}){ id } }', { s: sec, t: 'Урок' }, teacher)).createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: les }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c }, teacher);
await gql('mutation($c:ID!){ enroll(courseId:$c){ id } }', { c }, pupil);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: les, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);

const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
async function join(email, size) {
  const page = await (await b.newContext({ viewport: size, permissions: ['camera', 'microphone'] })).newPage();
  await page.goto(`${DEV}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.locator('input[type=password]').fill(pass);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await page.goto(`${DEV}/sessions/${session}/room`);
  await page.waitForTimeout(1800);
  const j = page.getByRole('button', { name: /эфир|камер|подключ|войти/i }).first();
  if (await j.count()) await j.click().catch(() => undefined);
  await page.waitForTimeout(3500);
  await page.getByRole('tab', { name: /Класс/i }).click().catch(() => undefined);
  await page.waitForTimeout(1500);
  return page;
}
for (const size of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  const t = await join(tE, size);
  const p = await join(pE, size);
  await t.waitForTimeout(3000);
  for (const [who, page] of [['преподаватель', t], ['ученик', p]]) {
    const tabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
    console.log(`  ПРИБОР [${who}] вкладки сцены: ${JSON.stringify(tabs)}`);
    const m = await page.evaluate(() => {
      const win = window.innerWidth * window.innerHeight;
      const vids = [...document.querySelectorAll('video')].filter((v) => v.srcObject);
      const area = vids.reduce((sum, v) => { const r = v.getBoundingClientRect(); return sum + r.width * r.height; }, 0);
      const faces = document.querySelector('[class*=faces]')?.getBoundingClientRect();
      const panel = [...document.querySelectorAll('aside,[class*=panel],[class*=Pane]')]
        .map((e) => e.getBoundingClientRect()).sort((a, b2) => b2.width - a.width)[0];
      return {
        окно: `${window.innerWidth}x${window.innerHeight}`,
        видеоДоляЭкрана: Math.round((area / win) * 100) + '%',
        плиток: vids.length,
        размеры: vids.map((v) => { const r = v.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }),
        сценаВысота: faces ? Math.round(faces.height) : null,
        естьОкноКласса: !!document.querySelector('[class*=faces]'),
        видеоВнутриКласса: document.querySelectorAll('[class*=faces] video').length,
        // ⚠️ `[class*=room]` ловит и `.roomActs` из шапки — 117 пикселей, которые я чуть не
        // принял за высоту комнаты. Модули CSS дают `_имя_хеш`, поэтому якорим по началу.
        оболочкаВысота: Math.round(document.querySelector('[class^="_shell_"]')?.getBoundingClientRect().height ?? 0),
        комнатаВысота: Math.round(document.querySelector('[class^="_room_"]')?.getBoundingClientRect().height ?? 0),
        сцена: Math.round(document.querySelector('[class^="_scene_"]')?.getBoundingClientRect().height ?? 0),
        сценаКолонка: Math.round(document.querySelector('[class^="_stage_"]')?.getBoundingClientRect().height ?? 0),
        цепочка: (() => {
          let el = document.querySelector('[class^="_faces_"]');
          const chain = [];
          while (el && chain.length < 7) {
            const r = el.getBoundingClientRect();
            chain.push(`${(el.className || '').split(' ')[0]}:${Math.round(r.height)}`);
            el = el.parentElement;
          }
          return chain;
        })(),
        полоса: Math.round(document.querySelector('[class^="_strip_"]')?.getBoundingClientRect().height ?? 0),
        панельШирина: panel ? Math.round(panel.width) : null,
      };
    });
    /*
     * 🔴 Прибор обязан сказать, ЧТО он мерил (наряд 43 §5). Комната без эфира — это не
     * «видео не во весь экран», это «видео нет вовсе», и число тут значит другое.
     */
    const state = await page.evaluate(() => {
      const card = document.querySelector('[data-kind]');
      if (card) return card.getAttribute('data-kind');
      return document.body.innerText.includes('Войти в эфир') ? 'эфир не поднят' : null;
    });
    console.log(`[${size.width}x${size.height}] ${who}${state ? ` [${state}]` : ''}: ${JSON.stringify(m)}`);
  }
  await t.context().close(); await p.context().close();
}
await b.close();
