// Веб-половина первого запуска: приложение просит код → посторонний регистрируется в
// браузере → подтверждает → приложение забирает ключ. Меряем ровно эту цепочку.
import { chromium } from 'playwright';
const DEV='http://127.0.0.1:5173', API='http://localhost:8000/graphql/', pass='T3stPass!2026';
async function gql(q,v,t){const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json',...(t?{authorization:`Bearer ${t}`}:{})},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.errors)throw new Error(j.errors[0].message);return j.data;}
const p=(await gql('mutation($n:String!,$pl:DevicePlatform,$v:String){requestPairingCode(deviceName:$n,platform:$pl,appVersion:$v){code secret expiresAt}}',{n:'Mac',pl:'MACOS',v:'0.1.0'})).requestPairingCode;
console.log('  приложение получило код:', p.code);
const n=Date.now(), email=`pair-${n}@flamingo-test.invalid`;
const b=await chromium.launch(); const pg=await(await b.newContext({viewport:{width:1280,height:800}})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,90)));
const back=encodeURIComponent(`/link?code=${p.code}`);
await pg.goto(`${DEV}/register/teacher?next=${back}`); await pg.waitForTimeout(1200);
console.log('  экран регистрации:', (await pg.locator('body').innerText()).replace(/\s+/g,' ').slice(0,80));
// заполняем форму тем, что на ней есть
const fields = await pg.locator('input').all();
for (const f of fields) {
  const type = await f.getAttribute('type'); const ph = (await f.getAttribute('placeholder'))||''; const nm=(await f.getAttribute('name'))||'';
  const label = (await f.getAttribute('aria-label'))||'';
  const what = `${type}|${ph}|${nm}|${label}`;
  if (type==='email'||ph.includes('@')) await f.fill(email);
  else if (type==='password') await f.fill(pass);
  else if (type==='checkbox') await f.check().catch(()=>{});
  else if (/Имя|имя/.test(what)) await f.fill('Пётр');
  else if (/Фамил|фамил/.test(what)) await f.fill('Иванов');
  else if (type==='text') await f.fill('Физика');
}
const btns = await pg.getByRole('button').allInnerTexts();
console.log('  кнопки формы:', btns.join(' · ').slice(0,100));
await pg.getByRole('button',{name:/Создать|Зарегистр|Готово|Дальше/}).first().click().catch(async()=>{ await pg.getByRole('button').last().click(); });
await pg.waitForTimeout(3000);
console.log('  после регистрации адрес:', pg.url().replace(DEV,''));
console.log('  на экране:', (await pg.locator('body').innerText()).replace(/\s+/g,' ').slice(0,160));
await b.close();
console.log('  ошибки страниц:', errs.slice(0,2).join(' | ')||'нет');
