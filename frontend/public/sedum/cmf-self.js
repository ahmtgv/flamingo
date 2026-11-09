/* Explicit opt-in webcam check, isolated from the rest of the landing.
 * No telemetry, storage, upload, recording or microphone access. */
(() => {
  'use strict';
  const entry=document.getElementById('cmf-try-self');
  if(!entry)return;
  const dialog=document.createElement('dialog');
  dialog.id='cmf-self-dialog';
  dialog.setAttribute('aria-labelledby','cmf-self-title');
  dialog.setAttribute('aria-describedby','cmf-self-privacy');
  dialog.innerHTML=`<div class="cmf-self-head"><div><span class="cmf-self-kicker">CMF · на твоём устройстве</span><h2 id="cmf-self-title">Проверь себя</h2></div><button type="button" class="cmf-self-close" aria-label="Закрыть проверку и выключить камеру">×</button></div>
    <p id="cmf-self-privacy">Камера — с разрешения. Обработка только на устройстве, без записи, отправки и микрофона.</p>
    <div class="cmf-self-layout"><div class="cmf-self-frame"><video muted playsinline aria-label="Изображение с твоей камеры"></video><canvas aria-hidden="true"></canvas><div class="cmf-self-placeholder">Посмотри в камеру,<br>поверни голову и моргни.</div></div>
    <dl class="cmf-self-readings"><div><dt>Сейчас <small>Текущий сигнал модели</small></dt><dd data-self-current>—</dd></div><div><dt>Внимание <small>Сглаженный CMF индекс</small></dt><dd><span data-self-attention>—</span><small class="cmf-self-unavailable" data-self-index-note>Ожидаем камеру</small></dd></div><div><dt>Открытость глаз <small>EAR</small></dt><dd data-self-ear>—</dd></div><div><dt>Поворот головы <small>приблизительно</small></dt><dd data-self-yaw>—</dd></div><div><dt>Наклон головы <small>приблизительно</small></dt><dd data-self-pitch>—</dd></div><div><dt>Лицо в кадре</dt><dd data-self-face>—</dd></div></dl></div>
    <div class="cmf-self-trend"><div class="cmf-self-trend-head"><strong>Сигнал внимания · CMF</strong><span>Последние 60 с · 0–100</span></div><svg viewBox="0 0 600 64" preserveAspectRatio="none" role="img" aria-label="История реального сглаженного CMF индекса; пропуски означают отсутствие измерения"><path class="cmf-self-grid" d="M0 8H600M0 32H600M0 56H600"/><path data-self-trend/><circle data-self-tip r="3" hidden/></svg><span data-self-trend-empty>Ожидаем данные камеры</span></div>
    <p class="cmf-self-status" role="status" aria-live="polite">Готово к проверке.</p>
    <div class="cmf-self-actions"><button type="button" class="button" data-self-start hidden>Попробовать снова</button><button type="button" class="cmf-self-stop" data-self-stop hidden>Остановить камеру</button><button type="button" class="cmf-self-stop" data-self-help>О расчёте</button></div>
    <p class="cmf-self-limit">Оценка внешних признаков, не понимания материала и не диагноз.</p>`;
  document.body.append(dialog);
  const help=document.createElement('dialog');
  help.id='cmf-self-help';help.setAttribute('aria-labelledby','cmf-help-title');
  help.innerHTML='<h2 id="cmf-help-title">Как читать показатели</h2><p>'+"«Сейчас» показывает текущий сигнал модели. CMF индекс учитывает историю: отвод взгляда допускается 5 секунд, затем оценка меняется плавно (сглаживание — 30 секунд). CMF индекс 0–100 — расчётная оценка по внешним признакам, не измерение понимания и не диагностика. Первые 30 секунд спокойного взгляда в экран — настройка личной нормы; до её завершения оценка предварительная. Короткое моргание не снижает индекс, длительные изменения учитываются плавно. Здесь проверяется взгляд в экран, без контекста чтения и письма."+'</p><button type="button" class="button">Понятно</button>';
  document.body.append(help);
  dialog.querySelector('[data-self-help]').addEventListener('click',()=>help.showModal());
  help.querySelector('button').addEventListener('click',()=>help.close());
  const video=dialog.querySelector('video'),canvas=dialog.querySelector('canvas');
  const ctx=canvas.getContext('2d');
  const frame=dialog.querySelector('.cmf-self-frame');
  const placeholder=dialog.querySelector('.cmf-self-placeholder');
  const status=dialog.querySelector('.cmf-self-status');
  const start=dialog.querySelector('[data-self-start]'),stop=dialog.querySelector('[data-self-stop]');
  const readouts={
    current:dialog.querySelector('[data-self-current]'),
    attention:dialog.querySelector('[data-self-attention]'),
    ear:dialog.querySelector('[data-self-ear]'),yaw:dialog.querySelector('[data-self-yaw]'),
    pitch:dialog.querySelector('[data-self-pitch]'),face:dialog.querySelector('[data-self-face]')
  };
  let epoch=0,stream=null,worker=null,raf=null,timer=null,frameTimer=null,inFlight=false,lastFrame=-Infinity,lastVideo=-1,mesh=[],eyes=[],eyeGroups=[],running=false,requesting=false;
  let latestPoints=null,lastPaint=0,flowTime=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let history=[],lastSample=-Infinity;
  const trend=dialog.querySelector('[data-self-trend]'),tip=dialog.querySelector('[data-self-tip]');
  function updateTrend(score,now=performance.now()){
    if(now-lastSample<500)return;
    lastSample=now;
    history.push({t:now,value:Number.isFinite(score)?score:null});
    history=history.filter(p=>p.t>=now-60000).slice(-121);
    let path='',connected=false;
    for(const p of history){
      if(p.value===null){connected=false;continue;}
      const x=600-(now-p.t)/100,y=56-p.value*.48;
      path+=(connected?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' ';
      connected=true;
    }
    trend.setAttribute('d',path);
    const last=history.at(-1);tip.hidden=!Number.isFinite(last?.value);
    tip.toggleAttribute('hidden',!Number.isFinite(last?.value));
    if(Number.isFinite(last?.value)){tip.setAttribute('cx','600');tip.setAttribute('cy',String(56-last.value*.48));}
    dialog.querySelector('[data-self-trend-empty]').hidden=history.some(p=>Number.isFinite(p.value));
  }
  function clearTrend(){history=[];lastSample=-Infinity;trend.setAttribute('d','');tip.setAttribute('hidden','');dialog.querySelector('[data-self-trend-empty]').hidden=false;}
  // Presentation only: never infer understanding or diagnose sleep from a pose.
  const currentLabels={
    'на экране':'В пределах нормы','пишет':'Взгляд вниз · режим письма',
    'зевает':'Рот открыт','мимо экрана':'Взгляд или голова в сторону',
    'смотрит вниз':'Взгляд или голова вниз','отвернулся':'Голова повёрнута / отклонена',
    'глаза закрыты':'Глаза закрыты','заснул':'Глаза долго закрыты',
    'нет в кадре':'Лицо не найдено','ушёл':'Лицо долго не видно','другое окно':'Другое окно'
  };
  function message(value){if(status.textContent!==value)status.textContent=value;}
  function clearReadouts(){latestPoints=null;Object.values(readouts).forEach(e=>e.textContent='—');dialog.querySelector('[data-self-index-note]').textContent='Нет текущего измерения';dialog.querySelector('[data-self-index-note]').classList.remove('cmf-calibrating');ctx.clearRect(0,0,canvas.width,canvas.height);}
  function shutdown(reason){
    ++epoch;running=false;requesting=false;
    if(raf!==null)cancelAnimationFrame(raf);raf=null;
    clearTimeout(timer);timer=null;
    clearTimeout(frameTimer);frameTimer=null;
    worker?.terminate();worker=null;inFlight=false;mesh=[];eyes=[];eyeGroups=[];lastPaint=0;flowTime=0;
    if(stream)stream.getTracks().forEach(track=>track.stop());
    stream=null;video.pause();video.srcObject=null;
    start.disabled=false;start.hidden=false;stop.hidden=true;
    placeholder.hidden=false;frame.classList.remove('cmf-self-has-video');
    clearReadouts();
    clearTrend();
    if(reason)message(reason);
  }
  function eyeComponents(edges){
    const remaining=new Set(edges.flatMap(e=>[e.start,e.end])),groups=[];
    while(remaining.size){
      const group=new Set([remaining.values().next().value]);
      let changed=true;
      while(changed){changed=false;for(const {start:a,end:b} of edges){
        if(group.has(a)&&!group.has(b)){group.add(b);changed=true;}
        if(group.has(b)&&!group.has(a)){group.add(a);changed=true;}
      }}
      group.forEach(i=>remaining.delete(i));
      groups.push({ids:[...group],edges:edges.filter(e=>group.has(e.start))});
    }
    return groups;
  }
  function draw(points,time){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    function lines(edges,color,width){
      ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;
      for(const {start:a,end:b} of edges){
        if(a*2+1>=points.length||b*2+1>=points.length)continue;
        ctx.moveTo(points[a*2]*canvas.width,points[a*2+1]*canvas.height);
        ctx.lineTo(points[b*2]*canvas.width,points[b*2+1]*canvas.height);
      }
      ctx.stroke();
    }
    lines(mesh,'rgba(235,255,229,.23)',.55);
    // Animated light travels along anchored edges; no fabricated face movement.
    let top=1,bottom=0;
    for(let i=1;i<points.length;i+=2){top=Math.min(top,points[i]);bottom=Math.max(bottom,points[i]);}
    const height=bottom-top;
    const centre=top+height*(.5-.5*Math.cos(time*.65));
    const illuminated=mesh.filter(({start:a,end:b})=>Math.abs((points[a*2+1]+points[b*2+1])/2-centre)<height*.08);
    ctx.lineDashOffset=-time*5;
    lines(illuminated,'rgba(240,255,234,.42)',.8);
    ctx.setLineDash([]);ctx.lineDashOffset=0;
    for(const group of eyeGroups){
      const cx=group.ids.reduce((n,i)=>n+points[i*2]*canvas.width,0)/group.ids.length;
      const cy=group.ids.reduce((n,i)=>n+points[i*2+1]*canvas.height,0)/group.ids.length;
      ctx.beginPath();ctx.strokeStyle='rgba(244,255,241,.42)';ctx.lineWidth=.85;
      for(const {start:a,end:b} of group.edges){
        ctx.moveTo(cx+(points[a*2]*canvas.width-cx)*1.12,cy+(points[a*2+1]*canvas.height-cy)*1.35);
        ctx.lineTo(cx+(points[b*2]*canvas.width-cx)*1.12,cy+(points[b*2+1]*canvas.height-cy)*1.35);
      }
      ctx.stroke();
    }
  }
  function signed(value){
    return value===null?'—':(value>0?'+':'')+value.toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1})+'°';
  }
  async function capture(now){
    raf=null;
    if(!running||document.hidden||!dialog.open)return;
    raf=requestAnimationFrame(capture);
    if(now-lastPaint>=1000/30){
      if(lastPaint&&!reduced.matches&&!document.documentElement.classList.contains('motion-off'))flowTime+=Math.min(now-lastPaint,100)/1000;
      lastPaint=now;
      if(latestPoints)draw(latestPoints,flowTime);
    }
    if(inFlight||now-lastFrame<100||video.readyState<2||video.currentTime===lastVideo)return;
    lastFrame=now;lastVideo=video.currentTime;inFlight=true;
    const generation=epoch;
    try{
      const width=Math.min(640,video.videoWidth);
      const bitmap=await createImageBitmap(video,{resizeWidth:width,resizeHeight:Math.round(video.videoHeight*width/video.videoWidth)});
      if(generation!==epoch||!running||!worker){bitmap.close();return;}
      worker.postMessage({type:'frame',bitmap,timestamp:now},[bitmap]);
      frameTimer=setTimeout(()=>{if(generation===epoch)shutdown('Обработка кадра остановилась. Камера выключена — попробуй ещё раз.');},5000);
    }catch(error){if(generation===epoch)shutdown('Не удалось получить кадр. Попробуй включить камеру снова.');}
  }
  function permissionError(error){
    if(error.name==='NotAllowedError'||error.name==='SecurityError')return 'Доступ к камере не разрешён. Проверь настройки браузера.';
    if(error.name==='NotFoundError')return 'Камера не найдена. Подключи камеру и попробуй снова.';
    if(error.name==='NotReadableError')return 'Камера занята другим приложением или недоступна.';
    return 'Не удалось включить камеру. Проверь подключение и разрешение браузера.';
  }
  async function begin(){
    if(requesting||running)return;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
      message('Для камеры открой страницу через localhost или защищённое HTTPS-соединение.');return;
    }
    if(typeof Worker==='undefined'||typeof createImageBitmap==='undefined'){
      message('Этот браузер не поддерживает локальную проверку. Попробуй актуальный Chrome.');return;
    }
    requesting=true;start.disabled=true;start.hidden=true;stop.hidden=false;
    const generation=++epoch;
    message('Запрашиваем разрешение на камеру…');
    try{
      const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
      if(generation!==epoch||!dialog.open){acquired.getTracks().forEach(t=>t.stop());return;}
      stream=acquired;
      stream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(generation===epoch)shutdown('Камера отключилась. Можно попробовать снова.');}));
      video.srcObject=stream;await video.play();
      if(generation!==epoch)return;
      frame.style.aspectRatio=video.videoWidth+'/'+video.videoHeight;
      canvas.width=video.videoWidth;canvas.height=video.videoHeight;
      placeholder.hidden=true;frame.classList.add('cmf-self-has-video');
      message('Камера включена. Загружаем локальную модель…');
      worker=new Worker('cmf-self-worker.js');
      timer=setTimeout(()=>{if(generation===epoch)shutdown('Модель не успела загрузиться. Камера выключена — попробуй ещё раз.');},30000);
      worker.onerror=(event)=>{
        if(generation!==epoch)return;
        console.error('CMF worker startup:',event.message||'Worker error',event.filename||'',event.lineno||0);
        shutdown('Не удалось запустить локальную модель. Камера выключена. '+(event.message?'Ошибка: '+event.message:'Браузер не сообщил причину.'));
      };
      worker.onmessage=({data})=>{
        if(generation!==epoch)return;
        if(data.type==='error'){shutdown(data.message);return;}
        if(data.type==='ready'){
          clearTimeout(timer);timer=null;
          const seen=new Set();
          mesh=data.mesh.filter(({start:a,end:b})=>{const key=Math.min(a,b)+':'+Math.max(a,b);if(seen.has(key))return false;seen.add(key);return true;});
          eyes=data.eyes;eyeGroups=eyeComponents(eyes);
          requesting=false;running=true;start.hidden=true;lastFrame=-Infinity;lastVideo=-1;
          message('Ищем лицо. Посмотри в камеру.');
          raf=requestAnimationFrame(capture);return;
        }
        clearTimeout(frameTimer);frameTimer=null;inFlight=false;
        if(data.type!=='result')return;
        if(!data.found){
          updateTrend(null);
          clearReadouts();readouts.face.textContent='Не найдено';
          readouts.current.textContent='Лицо не найдено';
          dialog.querySelector('[data-self-index-note]').textContent='Лицо не найдено';
          message('Лицо не найдено. Посмотри в камеру и проверь освещение.');return;
        }
        latestPoints=data.points;
        updateTrend(data.index?.score);
        draw(latestPoints,flowTime);
        readouts.ear.textContent=data.ear===null?'—':data.ear.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
        readouts.yaw.textContent=signed(data.yaw);readouts.pitch.textContent=signed(data.pitch);
        readouts.face.textContent='Найдено';
        readouts.current.textContent=currentLabels[data.index?.currentState]??data.index?.note??'Недостаточно данных';
        readouts.attention.textContent=Number.isFinite(data.index?.score)?String(data.index.score):'—';
        dialog.querySelector('[data-self-index-note]').textContent=data.index?.note??'Недостаточно данных';
        dialog.querySelector('[data-self-index-note]').classList.toggle('cmf-calibrating',data.index?.calibrated===false&&Number.isFinite(data.index?.score));
        message('Сетка отслеживает лицо. Попробуй моргнуть и повернуть голову.');
      };
      worker.postMessage({type:'init'});
    }catch(error){if(generation===epoch)shutdown(permissionError(error));}
  }
  entry.addEventListener('click',()=>{dialog.showModal();begin();});
  start.addEventListener('click',begin);
  stop.addEventListener('click',()=>shutdown('Камера выключена. Данные не сохранены.'));
  dialog.querySelector('.cmf-self-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(help.open)help.close();shutdown('Камера выключена.');});
  dialog.addEventListener('cancel',()=>shutdown('Камера выключена.'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(stream||requesting))shutdown('Камера выключена, пока вкладка неактивна. Для продолжения включи её снова.');});
  window.addEventListener('pagehide',()=>shutdown());
})();
