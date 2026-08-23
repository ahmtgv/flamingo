// ВОРОТА НАРЯДА 48: сервер убран на минуту и возвращён — урок продолжается,
// паролей никто не вводил.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const DEV='http://127.0.0.1:5173', API='http://localhost:8000/graphql/', pass='T3stPass!2026';
async function gql(q,v,t){const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.errors)throw new Error(j.errors[0].message);return j.data;}
const login=async(e)=>(await gql('mutation($e:String!,$p:String!){ login(email:$e,password:$p){ token } }',{e,p:pass})).login.token;
const T=await login('audit-teacher@flamingo-test.invalid');
const sess=(await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }',{i:{lessonId:'cd6438d8-c88a-47e2-919f-7b2508406ffe',startAt:new Date(Date.now()-60000).toISOString()}},T)).scheduleSession;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id status } }',{s:sess.id},T);
console.log('урок идёт:', sess.id);

const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const mk=async(email)=>{ const c=await b.newContext({viewport:{width:1280,height:800},permissions:['camera','microphone']}); const p=await c.newPage();
  await p.goto(`${DEV}/login`); await p.waitForTimeout(1000);
  await p.getByPlaceholder('you@example.com').fill(email); await p.locator('input[type=password]').fill(pass);
  await p.getByRole('button',{name:'Войти'}).click(); await p.waitForTimeout(2500);
  await p.goto(`${DEV}/sessions/${sess.id}/room`); await p.waitForTimeout(3500); return p; };
const teacher=await mk('audit-teacher@flamingo-test.invalid');
const pupil=await mk('audit-pupil@flamingo-test.invalid');
const where=async(p)=>p.evaluate(()=>location.pathname);
console.log('до падения: преподаватель', await where(teacher), '· ученик', await where(pupil));

execSync('pkill -f "uvicorn config.asgi" || true');
console.log('сервер убран · ждём минуту, как в наряде');
for (let i=0;i<6;i++){
  await new Promise(r=>setTimeout(r,10000));
  // человек не сидит истуканом: он тыкает по экрану и переключает окна урока
  await teacher.mouse.move(600+i*10, 400).catch(()=>{});
  await pupil.mouse.move(600+i*10, 400).catch(()=>{});
  process.stdout.write(`  ${(i+1)*10}с: преподаватель ${await where(teacher)} · ученик ${await where(pupil)}\n`);
}
execSync('cd /Users/piu/Downloads/flamingo/backend && (DATABASE_URL="postgres://piu@localhost:5432/flamingo_audit" LC_ALL=en_US.UTF-8 .venv/bin/python -m uvicorn config.asgi:application --port 8000 > /tmp/uv-audit.log 2>&1 &)');
console.log('сервер возвращён');
await new Promise(r=>setTimeout(r,12000));
const tPath=await where(teacher), pPath=await where(pupil);
console.log('после возвращения: преподаватель', tPath, '· ученик', pPath);
const tTxt=(await teacher.locator('body').innerText()).replace(/\s+/g,' ');
const pTxt=(await pupil.locator('body').innerText()).replace(/\s+/g,' ');
const askedPassword = /Вход|Пароль|Зарегистрироваться/.test(tTxt) || /Вход|Пароль|Зарегистрироваться/.test(pTxt);
console.log('кого-то попросили пароль:', askedPassword ? '🔴 ДА' : 'нет');
// и урок ещё живой: перечитываем занятие с сервера глазами страницы
await teacher.reload(); await teacher.waitForTimeout(4000);
console.log('после перезагрузки преподаватель на:', await where(teacher), '·', (await teacher.locator('body').innerText()).replace(/\s+/g,' ').slice(0,70));
console.log(tPath==='/sessions/'+sess.id+'/room' && pPath==='/sessions/'+sess.id+'/room' && !askedPassword ? '✅ ВОРОТА ПРОЙДЕНЫ' : '🔴 ВОРОТА НЕ ПРОЙДЕНЫ');
await b.close();
