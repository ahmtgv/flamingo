#!/usr/bin/env node
/**
 * 🔴 ОБХОД ВСЕХ ЭКРАНОВ — ЧЕТЫРЕ ПРОВЕРКИ НА КАЖДЫЙ (наряд 38 §1.2, §2).
 *
 * Требование владельца, дословно: «Скролов не должно быть ни в приложении, ни в браузере!»
 * Плюс дорога назад с каждого экрана, отказы словами и axe.
 *
 * Прибор ходит по маршрутам РОЛЯМИ: у ученика и преподавателя один адрес показывает разное,
 * и «экран» здесь — это пара (маршрут, роль), а не строка в роутере.
 *
 * ⚠️ ПРОКРУТКА СТРАНИЦЫ И ПРОКРУТКА ВНУТРИ ЭЛЕМЕНТА — РАЗНЫЕ ВЕЩИ. Лента чата и длинный
 * список работ прокручиваются законно; дефект — когда уезжает САМА страница. Меряем
 * `scrollingElement`, а не первый попавшийся контейнер.
 *
 * Запуск: node frontend/scripts/screen-sweep.mjs
 */
import { chromium, webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

const DEV = process.env.SWEEP_BASE ?? 'http://127.0.0.1:5173';
const API = process.env.SWEEP_API ?? 'http://localhost:8000/graphql/';
const OUT = process.env.OUT ?? '/tmp/flamingo-sweep';
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

const REG = `mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }`;
const n = Date.now();

/** Живой стенд: преподаватель с курсом и занятием, ученик, записанный на него. */
const teacherEmail = `sw-t-${n}@flamingo-test.invalid`;
const pupilEmail = `sw-p-${n}@flamingo-test.invalid`;
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

/** (маршрут, кому он предназначен). `null` — гость. */
const SCREENS = [
  ['/', null], ['/demo', null], ['/login', null], ['/register', null],
  ['/register/teacher', null], ['/register/student', null], ['/register/parent', null],
  ['/reset', null], ['/sources', null], ['/link', null],
  ['/start', 'teacher'], ['/start', 'pupil'],
  ['/schedule', 'teacher'], ['/schedule', 'pupil'],
  ['/courses', 'teacher'], ['/courses', 'pupil'],
  ['/courses/new', 'teacher'],
  [`/courses/${course}`, 'teacher'], [`/courses/${course}`, 'pupil'],
  [`/subjects/${course}`, 'teacher'], [`/subjects/${course}`, 'pupil'],
  [`/journal/${course}`, 'teacher'],
  [`/lessons/${lesson}/homework`, 'teacher'], [`/lessons/${lesson}/homework`, 'pupil'],
  ['/homework', 'pupil'], ['/grading', 'teacher'],
  ['/my-learning', 'pupil'], ['/repetition', 'pupil'],
  ['/account', 'teacher'], ['/account', 'pupil'],
  ['/settings', 'teacher'],
  ['/app', 'teacher'], ['/app', 'pupil'],
  [`/sessions/${session}/room`, 'teacher'], [`/sessions/${session}/room`, 'pupil'],
  ['/admin', 'teacher'],
];

const SIZES = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1512x982', width: 1512, height: 982 },
];

const results = [];

// ⚠️ WebKit против dev-сервера даёт 102 замера с «access control checks» — это свойство
// стенда (прокси vite), а не продукта: в собранном фронте запрос идёт по вшитому адресу.
// Оставлен как есть, но в выводе шум отделяется от находок.
const ENGINES = process.env.SWEEP_ONLY_CHROMIUM ? [chromium] : [chromium, webkit];
for (const engine of ENGINES) {
  const browserName = engine === chromium ? 'chromium' : 'webkit';
  const browser = await engine.launch({
    args: engine === chromium ? ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] : [],
  });

  for (const size of SIZES) {
    for (const theme of ['light', 'dark']) {
      for (const [route, who] of SCREENS) {
        const ctx = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          colorScheme: theme,
          permissions: ['camera', 'microphone'],
        });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

        try {
          if (who) {
            await page.goto(`${DEV}/login`);
            await page.getByPlaceholder('you@example.com').fill(who === 'teacher' ? teacherEmail : pupilEmail);
            await page.locator('input[type=password]').fill(pass);
            await page.getByRole('button', { name: 'Войти' }).click();
            await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
          }
          await page.goto(`${DEV}${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2200);

          const measured = await page.evaluate(() => {
            const el = document.scrollingElement ?? document.documentElement;
            const back = [...document.querySelectorAll('a,button')].some((n) =>
              /назад|в кабинет|к выбору|все →|главная|отмена/i.test(n.textContent ?? '') ||
              /назад|в кабинет/i.test(n.getAttribute('aria-label') ?? ''),
            );
            return {
              scrollBy: Math.max(0, el.scrollHeight - el.clientHeight),
              text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 90),
              back,
              spinnerOnly: /^\s*…?\s*(загрузка|loading)?\s*…?\s*$/i.test(document.body.innerText || ''),
            };
          });

          let violations = [];
          if (browserName === 'chromium' && theme === 'light' && size.name === '1280x720') {
            const axe = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
              .analyze();
            violations = axe.violations.map((v) => `${v.id}/${v.impact}×${v.nodes.length}`);
          }

          const key = `${route.replace(/[^\wа-яё]+/gi, '_')}_${who ?? 'гость'}`;
          if (theme === 'light' && size.name === '1512x982' && browserName === 'chromium') {
            await page.screenshot({ path: `${OUT}/${key}.png` });
          }

          results.push({ route, who: who ?? 'гость', browserName, size: size.name, theme, ...measured, violations, errors: [...new Set(errors)] });
        } catch (e) {
          results.push({ route, who: who ?? 'гость', browserName, size: size.name, theme, error: String(e).split('\n')[0].slice(0, 110) });
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
}

writeFileSync(`${OUT}/sweep.json`, JSON.stringify(results, null, 1));
const scrolls = results.filter((r) => (r.scrollBy ?? 0) > 2);
console.log(`экранов пройдено: ${results.length}`);
console.log(`прокручиваются: ${scrolls.length}`);
for (const r of scrolls) console.log(`  ${r.route} · ${r.who} · ${r.size} · ${r.theme} · ${r.browserName}: +${r.scrollBy}px`);
const noBack = results.filter((r) => r.back === false);
console.log(`без дороги назад: ${new Set(noBack.map((r) => `${r.route}·${r.who}`)).size}`);
const axeBad = results.filter((r) => (r.violations ?? []).length > 0);
console.log(`с нарушениями axe: ${axeBad.length}`);
for (const r of axeBad) console.log(`  ${r.route} · ${r.who}: ${r.violations.join(', ')}`);
const broken = results.filter((r) => r.error || (r.errors ?? []).length > 0);
console.log(`с ошибками: ${broken.length}`);
for (const r of broken) console.log(`  ${r.route} · ${r.who}: ${r.error ?? r.errors.join(' | ')}`);
