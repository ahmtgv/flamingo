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
/*
 * 🔴 ЗАДАНИЯ В ЗАСЕВЕ — БЕЗ НИХ ПРИБОР МЕРИЛ ПУСТОЙ ЭКРАН И ПЕЧАТАЛ «ЧИСТО».
 * Я чуть не отчитался пересобранным экраном «Задания», который ни разу не показали с
 * данными: у ученика прибора не было ни одной работы, и он всё время видел состояние
 * «пусто». Нарочная поломка вёрстки при этом тоже не ловилась — ломать было нечего.
 */
const dueSoon = new Date(Date.now() + 2 * 864e5).toISOString();
const dueLater = new Date(Date.now() + 9 * 864e5).toISOString();
for (const [title, due, desc] of [
  ['Описать дорогу от дома до школы', dueSoon, '5–7 предложений, минимум три конструкции урока'],
  ['Тест · предлоги места', dueLater, '8 вопросов · попытки не ограничены до срока'],
  ['Задачи 14–18', null, 'фото решения от руки — этого достаточно'],
]) {
  const hw = (await gql('mutation($i: HomeworkInput!){ createHomework(input:$i){ id } }', { i: { lessonId: lesson, title, type: 'TEXT', description: desc, ...(due ? { dueAt: due } : {}) } }, teacher)).createHomework.id;
  await gql('mutation($h:ID!){ publishHomework(id:$h){ id } }', { h: hw }, teacher);
}
/*
 * 🔴 СДАННАЯ РАБОТА В ЗАСЕВЕ — иначе экран проверки меряется пустым.
 * Прибор сам это и сказал: «[empty] чисто» на четырёх видах подряд. Правило §5 работает
 * только если на него отвечать, а не читать его как «чисто».
 */
{
  const hw = (await gql('mutation($i: HomeworkInput!){ createHomework(input:$i){ id } }', { i: { lessonId: lesson, title: 'Описать дорогу от дома до школы', type: 'TEXT', description: '5–7 предложений' } }, teacher)).createHomework.id;
  await gql('mutation($h:ID!){ publishHomework(id:$h){ id } }', { h: hw }, teacher);
  await gql('mutation($i: SubmitHomeworkInput!){ submitHomework(input:$i){ id } }', { i: { homeworkId: hw, contentText: 'I go out of my house and turn left. Then I go straight ahead about two hundred meters to the crossroads.' } }, pupil);
}
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: lesson, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);

const DEFAULT_SCREENS = [
  ['/start', 'teacher'],
  ['/start', 'pupil'],
  ['/my-learning', 'pupil'],
  ['/homework', 'pupil'],
  // Преподаватель на ученическом экране: `myHomework` отдаёт ему пусто — проверяем, что
  // экран при этом говорит словами, а не показывает поломку.
  ['/homework', 'teacher'],
  ['/grading', 'teacher'],
  [`/subjects/${course}`, 'teacher'],
  [`/sessions/${session}/room`, 'teacher'],
  // Путь владельца: он проходит эти три экрана до того, как увидит кабинет.
  ['/courses', null],
  ['/courses/new', 'teacher'],
  ['/login', null],
  ['/register', null],
  ['/register/teacher', null],
  ['/', null],
];
const only = process.env.SCREENS?.split(',').map((s) => s.trim()).filter(Boolean);
const SCREENS = only ? DEFAULT_SCREENS.filter(([r]) => only.some((o) => r.startsWith(o))) : DEFAULT_SCREENS;

/** Виды приёмки: светлая · тёмная · детский, две настольные ширины (§5 п.2). */
/*
 * Виды прогона. Телефон — по требованию (`MOBILE=1`): листы телефона пришли 21.08, но экраны
 * под них ещё не собраны, и постоянный поток дефектов утопил бы находки по настольным.
 * Прибор `mobileScroll` дизайнера работает только в узком кадре — без этого вида он молчит,
 * а молчание прибора мы больше не читаем как «чисто».
 */
const VIEWS = [
  ...(process.env.MOBILE ? [{ name: 'телефон 390', width: 390, height: 844, theme: 'light', kids: false }] : []),
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
// Сколько раз отсеяны фигуры рисунка — печатается в конце, чтобы отсев не был молчаливым.
let skippedArt = 0;
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
      /*
       * 🔴 «ЧИСТО» НА СЛОМАННОМ ЭКРАНЕ — ЭТО НЕ ЧИСТО.
       *
       * Прибор напечатал «чисто» четыре раза подряд для экрана «Задания», который в этот
       * момент показывал ОТКАЗ: бэкенд был поднят до появления запроса. Геометрия карточки
       * отказа действительно безупречна — и это ровно тот случай, когда счётчик успокаивает
       * вместо того, чтобы предупредить. До этого он так же мерил ПУСТОЙ экран: у ученика
       * прибора не было ни одного задания.
       *
       * Теперь состояние экрана печатается рядом с вердиктом. Молчать о том, ЧТО измерено,
       * прибор больше не имеет права.
       */
      const state = await page.evaluate(() => {
        const card = document.querySelector('[data-kind]');
        if (card) return card.getAttribute('data-kind');
        return document.body.innerText.trim().length < 120 ? 'почти пусто' : null;
      });
      if (process.env.DUMP_TEXT && view === VIEWS[0]) {
        console.log('ТЕКСТ', route, '→', (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 260));
      }
      /*
       * 🔴 ЛОВУШКА «ABSOLUTE БЕЗ ПРЕДКА» — СОБСТВЕННЫЙ ПРИБОР (наряд 43, находка владельца).
       *
       * У элемента с `position: absolute` без позиционированного предка containing block —
       * САМА СТРАНИЦА. Такой элемент не подчиняется `overflow: hidden` ни одного кадра над
       * ним и тянет прокрутку документа со своего места.
       *
       * Поймано вживую: спрятанная галочка из общего набора (1 × 1 px, невидимая) оказалась
       * на 894-м пикселе при кадре 800 и растянула страницу на 95 px. Все ВИДИМЫЕ элементы
       * при этом помещались, и глазами не было видно ничего.
       *
       * Владелец: «одна найденная ловушка редко бывает единственной». Поэтому ищем не в том
       * месте, где нашли, а на каждом экране прогона.
       */
      const escapees = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('*').forEach((el) => {
          if (getComputedStyle(el).position !== 'absolute') return;
          // Ищем позиционированного предка ДО body: он и есть containing block.
          let anchored = false;
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            if (getComputedStyle(p).position !== 'static') { anchored = true; break; }
          }
          if (anchored) return;
          const r = el.getBoundingClientRect();
          /*
           * ⚠️ Сам по себе `absolute` без предка ещё не беда: прижатый к началу страницы
           * элемент стоит в нуле и ничего не тянет. Беда — когда он при этом ЗА КАДРОМ: тогда
           * его не обрезает ни одна рамка, и документ вытягивается до него.
           *
           * Сузил правило ПОСЛЕ того, как оно поймало настоящий дефект, а не вместо: широкая
           * версия показывала три места, из них одно настоящее и два прижатых. Проверено
           * нарочной поломкой — снял прижатие, прибор снова назвал место.
           */
          if (r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.top >= -1) return;
          bad.push({
            el: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`,
            низ: Math.round(r.bottom),
            текст: (el.textContent || '').trim().slice(0, 20),
          });
        });
        return bad.slice(0, 6);
      });
      await page.addScriptTag({ content: AUDIT });
      /*
       * 🔴 КАДР НАДО НАЗВАТЬ. Прибор сам решает, мерить ему `pageScroll` или `mobileScroll`,
       * но узнаёт он это от нас: `mobile` в вызове (или `data-mobile` на узле кадра).
       * Не сказав, я получил пять «ДЕФЕКТ · pageScroll» на телефоне — там, где вертикальная
       * прокрутка РАЗРЕШЕНА (ПРАВИЛА 8.6а), и запрещена только горизонтальная.
       *
       * Прибор не соврал: он ответил на тот вопрос, который я задал.
       */
      const report = await page.evaluate(
        ({ label, mobile }) => window.flAudit({ label, mobile }),
        { label: `${route} · ${who ?? 'гость'}`, mobile: view.width < 700 },
      );
      /*
       * 🔴 ФИГУРЫ ВНУТРИ РИСУНКА — НЕ НАЛОЖЕНИЕ. Прибор обходит все элементы подряд, включая
       * внутренности `<svg>`, и два соседних контура знака бренда (крыло поверх тела)
       * считает дефектом. Знак стоит в шапке КАЖДОГО экрана, поэтому счётчик наложений
       * никогда не доходил до нуля.
       *
       * Постоянный ложный дефект хуже дефекта: к нему привыкают и перестают смотреть на
       * счётчик, а за ним прячется настоящий. Отсекаем ровно этот случай — обе стороны
       * являются фигурами внутри рисунка, — и ничего больше: наложение любых двух узлов
       * разметки по-прежнему считается.
       */
      const SVG_SHAPES = new Set(['g', 'ellipse', 'circle', 'path', 'rect', 'polygon', 'line', 'polyline']);
      const isArt = (o) => SVG_SHAPES.has(String(o.a).split('[')[0]) && SVG_SHAPES.has(String(o.b).split('[')[0]);
      const artCount = (report.overlaps ?? []).filter(isArt).length;
      report.overlaps = (report.overlaps ?? []).filter((o) => !isArt(o));
      report.verdict.overlaps = report.overlaps.length ? `ДЕФЕКТ ${report.overlaps.length}` : 'ok';
      if (artCount) skippedArt += artCount;
      report.verdict.escapes = escapees.length ? `ДЕФЕКТ · absolute без предка ${escapees.length}` : 'ok';
      report.escapes = escapees;
      const defects = Object.entries(report.verdict).filter(([, v]) => String(v).startsWith('ДЕФЕКТ'));
      // Подробности — только для первого вида: они одинаковы во всех, а печатать вчетверо
      // значит утопить находку в повторах (той же болезнью страдал лог сервера, §37 §4.2).
      const details = view === VIEWS[0] || (process.env.DETAILS_ALL && defects.length)
        ? {
            overlaps: (report.overlaps ?? []).slice(0, 3),
            tapTargets: (report.tapTargets ?? []).slice(0, 6),
            clipped: (report.clipped ?? []).slice(0, 3),
            contrast: (report.contrast ?? []).slice(0, 4),
            escapes: report.escapes ?? [],
            mobileScroll: report.mobileScroll?.defects ?? [],
            // Кто именно накрыл текст: без имени слоя находка неисправима.
            textUnderLayer: (report.textUnderLayer ?? []).slice(0, 6),
            rowWrap: (report.rowWrap ?? []).slice(0, 3),
          }
        : null;
      rows.push({ route, who: who ?? 'гость', view: view.name, state, defects: defects.map(([k, v]) => `${k}: ${v}`), details });
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
  const shown = r.defects.length ? r.defects.join(' | ') : 'чисто';
  // Состояние — впереди вердикта: «чисто» на отказе читается иначе, чем «чисто» на данных.
  console.log(`  ${r.route} · ${r.who} · ${r.view}: ${r.state ? `[${r.state}] ` : ''}${shown}`);
}
console.log(`\nвсего дефектов геометрии: ${total}`);
if (skippedArt) {
  // Молчаливый отсев — это то же враньё, что молчаливое ограничение выборки.
  console.log(`  (не считались фигуры внутри рисунков: ${skippedArt} — это знак бренда, не наложение)`);
}

console.log('\n=== ПОДРОБНО (первый вид каждого экрана) ===');
for (const r of rows) {
  if (!r.details) continue;
  const d = r.details;
  const any = d.overlaps.length || d.tapTargets.length || d.clipped.length || d.textUnderLayer?.length || d.rowWrap?.length || d.contrast?.length || d.escapes?.length || d.mobileScroll?.length;
  if (!any) continue;
  console.log(`  ${r.route} · ${r.who}`);
  for (const x of d.overlaps) console.log('    пересечение:', JSON.stringify(x).slice(0, 190));
  for (const x of d.tapTargets) console.log('    мелкая цель:', JSON.stringify(x).slice(0, 150));
  for (const x of d.clipped) console.log('    обрезано:', JSON.stringify(x).slice(0, 150));
  for (const x of d.textUnderLayer ?? []) console.log('    текст под слоем:', JSON.stringify(x).slice(0, 190));
  for (const x of d.rowWrap ?? []) console.log('    ряд развалился:', JSON.stringify(x).slice(0, 190));
  for (const x of d.contrast ?? []) console.log('    контраст:', JSON.stringify(x).slice(0, 190));
  for (const x of d.escapes ?? []) console.log('    absolute без предка:', JSON.stringify(x).slice(0, 190));
  for (const x of d.mobileScroll ?? []) console.log('    телефон:', JSON.stringify(x).slice(0, 190));
}
