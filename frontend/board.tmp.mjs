// §50.2: что из семи кнопок доски делает то, что обещает. Меряем, а не предполагаем.
import { chromium } from 'playwright';
const DEV='http://127.0.0.1:5173', pass='T3stPass!2026';
const S=process.env.SESS;
const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const p=await(await b.newContext({viewport:{width:1280,height:800},permissions:['camera','microphone']})).newPage();
p.on('pageerror',e=>console.log('   ПАДЕНИЕ:',String(e).slice(0,90)));
await p.goto(`${DEV}/login`); await p.getByPlaceholder('you@example.com').fill('audit-teacher@flamingo-test.invalid');
await p.locator('input[type=password]').fill(pass); await p.getByRole('button',{name:'Войти'}).click(); await p.waitForTimeout(2500);
await p.goto(`${DEV}/sessions/${S}/room`); await p.waitForTimeout(4000);
const tools = await p.locator('[class*="_tool_"], [data-tool]').count();
console.log('кнопок инструментов на экране:', tools);
const names = await p.locator('button[title], button[aria-label]').evaluateAll(bs => bs.map(b=>b.getAttribute('aria-label')||b.getAttribute('title')).filter(Boolean).slice(0,20));
console.log('подписи кнопок:', names.join(' · ').slice(0,300));
const count = async () => p.evaluate(() => document.querySelectorAll('[data-el-id], [class*="_element_"], svg [data-id]').length);
const info = await p.evaluate(() => {
  const svg = document.querySelector('svg[class*="_canvas_"], svg');
  const cls = [...document.querySelectorAll('[class]')].map(e=>String(e.className.baseVal ?? e.className)).join(' ');
  return { svg: !!svg, board: /board|canvas|холст/i.test(cls), sample: cls.slice(0,200) };
});
// ── замер по каждому инструменту: делает ли он то, что обещает ──────────────
const canvas = p.locator('svg').first();
const cbox = await canvas.boundingBox();
const state = () => p.evaluate(() => {
  const svg = document.querySelector('svg');
  const g = svg?.querySelector('g');
  return {
    сдвиг: g?.getAttribute('transform') ?? null,
    узлов: svg ? svg.querySelectorAll('g > *').length : 0,
    правится: !!document.querySelector('textarea, [contenteditable="true"], input[type="text"]:not([placeholder*="оиск"])'),
  };
});
const press = async (name) => { await p.getByRole('button',{name}).first().click().catch(()=>{}); await p.waitForTimeout(400); };

console.log('до всего:', JSON.stringify(await state()));

await press('Двигать холст');
await p.mouse.move(cbox.x+300, cbox.y+250); await p.mouse.down();
await p.mouse.move(cbox.x+520, cbox.y+380, {steps:12}); await p.mouse.up(); await p.waitForTimeout(600);
console.log('ЛАДОШКА · после протаскивания:', JSON.stringify(await state()));

await press('Текст');
await p.mouse.click(cbox.x+400, cbox.y+300); await p.waitForTimeout(900);
const afterText = await state();
console.log('ТЕКСТ · после щелчка:', JSON.stringify(afterText));
if (!afterText.правится) {
  await p.mouse.dblclick(cbox.x+400, cbox.y+300); await p.waitForTimeout(700);
  console.log('   и после двойного щелчка:', JSON.stringify(await state()));
}

for (const [name, label] of [['Стикер','СТИКЕР'],['Фигура','ФИГУРА'],['Связь','СВЯЗЬ']]) {
  const before = (await state()).узлов;
  await press(name);
  await p.mouse.click(cbox.x+250+Math.random()*200, cbox.y+200+Math.random()*150);
  await p.waitForTimeout(800);
  const after = (await state()).узлов;
  console.log(`${label} · узлов было ${before}, стало ${after} →`, after>before ? 'появился' : 'НЕ ПОЯВИЛСЯ');
}
await b.close();
