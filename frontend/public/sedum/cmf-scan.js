/* CMF illustration only. Synthetic portrait + deterministic demonstration data.
 * No camera, tracking model, storage, external request, or biological inference.
 * Self-check is a separate, opt-in local camera module. */
(() => {
  'use strict';
  const surface = document.querySelector('#cmf .sheet-face');
  if (!surface || surface.classList.contains('cmf-photo-surface')) return;
  const heading = surface.querySelector('h5');
  if (!heading) return;
  const scene = document.createElement('div');
  scene.className = 'cmf-scan';
  // Hand-positioned illustration landmarks on the generated portrait.
  // They are not the output of a tracking algorithm.
  const rows = [
    [[520,295],[578,301],[636,323],[685,358]],
    [[520,373],[588,380],[654,397],[713,430]],
    [[520,447],[582,450],[650,447],[724,470]],
    [[520,503],[574,500],[635,495],[739,512]],
    [[520,570],[579,575],[647,579],[742,580]],
    [[520,642],[577,634],[641,636],[732,649]],
    [[520,692],[578,690],[636,694],[716,712]],
    [[520,753],[572,752],[626,755],[694,768]],
    [[520,793],[565,797],[614,802],[670,817]],
    [[520,844],[560,851],[600,854],[644,862]],
    [[520,904],[551,900],[581,888],[611,881]]
  ];
  const meshLines = rows.map(row => 'M'+row.map(p=>p.join(',')).join('L'));
  rows.slice(1).forEach((row,i)=>row.forEach((p,j)=>{
    meshLines.push('M'+rows[i][j].join(',')+'L'+p.join(','));
    if(j<row.length-1) meshLines.push('M'+rows[i][j].join(',')+'L'+row[j+1].join(','));
  }));
  const fullMesh=meshLines.join(' ');
  const metric = (key,label,hint,value,unit,amount) => `<div class="cmf-metric">
    <dt>${label}<small>${hint}</small></dt>
    <dd><span data-cmf-value="${key}">${value}</span><small>${unit}</small></dd>
    <div class="cmf-meter" aria-hidden="true"><i data-cmf-meter="${key}" style="transform:scaleX(${amount})"></i></div>
  </div>`;
  scene.innerHTML = `
    <div class="cmf-scan-toolbar"><span class="cmf-mode"><i></i><span data-cmf-status>Сканирование · демо</span></span></div>
    <div class="cmf-scan-main">
      <figure class="cmf-camera" aria-describedby="cmf-scan-disclaimer">
        <img src="assets/cmf-student-portrait.png" width="1086" height="1448" alt="Синтетический реалистичный портрет девушки для демонстрации CMF." loading="lazy" decoding="async">
        <svg class="cmf-face-overlay" viewBox="0 0 1000 1333.333" aria-hidden="true" focusable="false">
          <defs><linearGradient id="cmf-scan-band" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e6ffe2" stop-opacity="0"/><stop offset=".8" stop-color="#e6ffe2" stop-opacity=".08"/><stop offset="1" stop-color="#f4fff2" stop-opacity=".25"/></linearGradient></defs>
          <defs><clipPath id="cmf-mesh-sweep"><rect data-cmf-mesh-band x="0" y="300" width="1100" height="100"/></clipPath></defs>
          <path class="cmf-reticle" d="M245 346V267H324M711 267H789V346M245 841V920H324M711 920H789V841"/>
          <path class="cmf-face-mesh" d="${fullMesh}"/>
          <path class="cmf-face-mesh" d="${fullMesh}" transform="translate(1040 0) scale(-1 1)"/>
          <path class="cmf-mesh-flow" d="${fullMesh}" clip-path="url(#cmf-mesh-sweep)"/>
          <path class="cmf-mesh-flow" d="${fullMesh}" transform="translate(1040 0) scale(-1 1)" clip-path="url(#cmf-mesh-sweep)"/>
          <g class="cmf-mesh-nodes">${rows.flat().map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.3"/>`).join('')}</g>
          <g class="cmf-eye-contours"><path d="M345 531Q385 493 422 507Q446 510 461 536Q409 561 371 544Z" transform="translate(403 530) scale(1.12 1.3) translate(-403 -530)"/><path d="M580 535Q611 500 648 509Q677 514 696 535Q641 558 607 549Z" transform="translate(638 533) scale(1.12 1.3) translate(-638 -533)"/></g>
          <g class="cmf-eye-centres"><circle cx="411" cy="526" r="19"/><circle cx="629" cy="526" r="19"/><path d="M411 498v10M411 544v10M383 526h10M429 526h10M629 498v10M629 544v10M601 526h10M647 526h10"/></g>
          <g data-cmf-scan-band transform="translate(0 410)"><rect x="210" y="-140" width="615" height="140" fill="url(#cmf-scan-band)"/><path class="cmf-scan-line" d="M210 0H825"/><path class="cmf-scan-edges" d="M210-8V8M825-8V8"/></g>
          <path class="cmf-ruler" d="M860 300v600 M852 300h16M856 330h8M856 360h8M852 390h16M856 420h8M856 450h8M852 480h16M856 510h8M856 540h8M852 570h16M856 600h8M856 630h8M852 660h16M856 690h8M856 720h8M852 750h16M856 780h8M856 810h8M852 840h16M856 870h8M852 900h16"/>
        </svg>
      </figure>
      <dl class="cmf-metrics" aria-label="Демонстрационные показатели, не измерения человека" aria-live="off">
        ${metric('attention','Внимание','CMF индекс','82','/ 100',.82)}
        ${metric('eyes','Глаза','открытость · EAR','0,31','',.62)}
        ${metric('turn','Поворот головы','неподвижный портрет','0,0','°',.5)}
        ${metric('fatigue','Признаки усталости','условный индекс','56','/ 100',.56)}
      </dl>
    </div>
    <div class="cmf-trend">
      <div class="cmf-trend-label"><span>Сигнал внимания</span><span>Демонстрация</span></div>
      <svg viewBox="0 0 440 70" role="img" aria-label="Изменение демонстрационного сигнала внимания во времени, не реальные измерения."><path class="cmf-trend-grid" d="M8 14H432M8 34H432M8 54H432"/><path class="cmf-trend-fill" data-cmf-trend-fill/><path class="cmf-trend-path" data-cmf-trend/><circle class="cmf-trend-point" data-cmf-trend-point r="3.5" cx="432" cy="30"/></svg>
    </div>
    <p class="cmf-scan-disclaimer" id="cmf-scan-disclaimer">Демонстрационные показатели. Не измерение и не диагностика.</p>
    <div class="cmf-self-invite"><button type="button" class="button" id="cmf-try-self">Проверь себя <span aria-hidden="true">↗</span></button><p>Сетка, глаза и повороты — на твоей камере.<br>Только на устройстве. Без записи.</p></div>`;
  surface.classList.add('cmf-photo-surface');
  surface.replaceChildren(heading,scene);
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const status = scene.querySelector('[data-cmf-status]');
  const band = scene.querySelector('[data-cmf-scan-band]');
  const trend = scene.querySelector('[data-cmf-trend]');
  const fill = scene.querySelector('[data-cmf-trend-fill]');
  const tip = scene.querySelector('[data-cmf-trend-point]');
  const values = Object.fromEntries(Array.from(scene.querySelectorAll('[data-cmf-value]'),e=>[e.dataset.cmfValue,e]));
  const meters = Object.fromEntries(Array.from(scene.querySelectorAll('[data-cmf-meter]'),e=>[e.dataset.cmfMeter,e]));
  let localPaused=false, visible=false, ready=false, frame=null, previous=null, elapsed=1800, lastReadout=-Infinity;
  const stopped = () => localPaused || reduced.matches || root.classList.contains('motion-off');
  const canRun = () => ready && visible && !document.hidden && !stopped();
  const number = (value,digits=0) => value.toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const attention = t => 79 + 8*Math.sin(t*.6) + 4*Math.sin(t*1.4);
  function paint() {
    const seconds=elapsed/1000;
    const y=300+580*(.5-.5*Math.cos(seconds*Math.PI/4.8));
    band.setAttribute('transform',`translate(0 ${y.toFixed(2)})`);
    scene.querySelectorAll('.cmf-face-mesh').forEach(e=>e.style.opacity=String(.2+.13*(1+Math.sin(seconds*.8))/2));
    scene.querySelector('[data-cmf-mesh-band]').setAttribute('y',String(y-85));
    scene.querySelector('.cmf-eye-contours').style.strokeDashoffset=String(-seconds*8);
    scene.querySelector('.cmf-eye-centres').style.opacity=String(.1+.06*(1+Math.sin(seconds*1.1))/2);
    const points = Array.from({length:65},(_,i)=>{
      const x=8+i*424/64;
      return [x,54-(attention(seconds-(64-i)*.28)-60)*1.1];
    });
    const d=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ');
    trend.setAttribute('d',d);
    fill.setAttribute('d',d+'L432 60H8Z');
    tip.setAttribute('cy',points[64][1].toFixed(2));
    if(elapsed-lastReadout<250) return;
    lastReadout=elapsed;
    const current={
      attention:attention(seconds),
      eyes:.31,
      turn:0,
      fatigue:56
    };
    values.attention.textContent=number(current.attention);
    values.eyes.textContent=number(current.eyes,2);
    values.turn.textContent=number(current.turn,1);
    values.fatigue.textContent=number(current.fatigue);
    const fractions={attention:current.attention/100,eyes:current.eyes/.5,turn:.5+current.turn/30,fatigue:current.fatigue/100};
    Object.entries(fractions).forEach(([key,value])=>meters[key].style.transform=`scaleX(${value.toFixed(3)})`);
  }
  function reconcile() {
    const paused=stopped();
    status.textContent=paused?'Демо · пауза':'Сканирование · демо';
    scene.classList.toggle('cmf-is-paused',paused);
    if(!canRun()){
      if(frame!==null) cancelAnimationFrame(frame);
      frame=null;previous=null;
    }else if(frame===null) frame=requestAnimationFrame(tick);
  }
  function tick(now) {
    frame=null;
    if(!canRun()){previous=null;return;}
    if(previous===null) previous=now;
    if(now-previous>=1000/30){
      elapsed+=Math.min(now-previous,80);previous=now;paint();
    }
    frame=requestAnimationFrame(tick);
  }
  new MutationObserver(reconcile).observe(root,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',reconcile);
  document.addEventListener('visibilitychange',reconcile);
  window.addEventListener('pagehide',()=>{visible=false;reconcile();});
  window.addEventListener('pageshow',reconcile);
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();},{threshold:0}).observe(scene);
  }
  const portrait=scene.querySelector('img');
  const loaded=()=>{ready=portrait.naturalWidth>0;reconcile();};
  portrait.addEventListener('load',loaded);
  portrait.addEventListener('error',()=>{
    ready=false;scene.classList.add('cmf-image-unavailable');
    portrait.alt='Портрет недоступен. Демонстрация остановлена.';
    localPaused=true;reconcile();
  });
  if(portrait.complete) loaded();
  paint();reconcile();
})();
