// Доходят ли до холста события указателя при инструменте «ладошка».
import { chromium } from 'playwright';
const DEV='http://127.0.0.1:5173', pass='T3stPass!2026';
const b=await chromium.launch(); const p=await(await b.newContext({viewport:{width:1280,height:800},permissions:['camera','microphone']})).newPage();
await p.goto(`${DEV}/login`); await p.getByPlaceholder('you@example.com').fill('audit-teacher@flamingo-test.invalid');
await p.locator('input[type=password]').fill(pass); await p.getByRole('button',{name:'Войти'}).click(); await p.waitForTimeout(2500);
await p.goto(`${DEV}/sessions/${process.env.SESS}/room`); await p.waitForTimeout(4500);
await p.locator('button[data-tool="hand"]').click(); await p.waitForTimeout(300);
await p.evaluate(() => {
  const s=document.querySelector('[class*="_surface_"]');
  window.__ev=[];
  for (const t of ['pointerdown','pointermove','pointerup'])
    s.addEventListener(t, (e)=>window.__ev.push(`${t}@${Math.round(e.clientX)},${Math.round(e.clientY)}`), true);
});
const box=await p.locator('[data-board-canvas]').first().boundingBox();
await p.mouse.move(box.x+500, box.y+300); await p.mouse.down();
for (let i=1;i<=8;i++) await p.mouse.move(box.x+500+i*25, box.y+300+i*15);
await p.mouse.up(); await p.waitForTimeout(600);
const r=await p.evaluate(()=>({ события: window.__ev.length, первые: window.__ev.slice(0,4), кадр: document.querySelector('[data-board-viewport]')?.getAttribute('data-board-viewport') }));
console.log(JSON.stringify(r));
await b.close();
