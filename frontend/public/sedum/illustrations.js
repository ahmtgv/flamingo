/* Four illustrative instruments; no measurements, timers or animation clock.
 * Original headings, captions and context controls retain node identity.
 * No data-motion-* hooks: movement here is selection-driven only. */
(() => {
  'use strict';
  const svg = (box, content, cls = '') => `<svg class="iv-vector ${cls}" viewBox="${box}" aria-hidden="true" focusable="false">${content}</svg>`;
  const path = d => `<path class="iv-ink" d="${d}"/>`;
  const dot = (x, y) => `<circle class="iv-point" cx="${x}" cy="${y}" r="4"/>`;
  const label = text => `<span class="iv-eyebrow">${text}</span>`;
  const note = '<span class="iv-demo">Иллюстрация · не данные ученика</span>';
  const signal = svg('0 0 280 90', '<path class="iv-grid" d="M8 24H272M8 49H272M8 74H272"/>'+path('M8 62L22 60 34 47 46 52 60 33 74 42 88 25 102 40 116 37 130 53 144 46 158 58 172 50 186 55 202 40 218 44 234 35 250 42 270 38')+'<g class="iv-signal-mark">'+dot(88,25)+'</g>');
  const portrait = svg('0 0 180 172', `
    <defs><linearGradient id="cmf-face-surface" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#f9faf8"/><stop offset=".48" stop-color="#fff"/><stop offset="1" stop-color="#e7ece5"/></linearGradient></defs>
    <path class="iv-corner" d="M18 41V18H41M139 18H162V41M18 131V154H41M139 154H162V131"/>
    <path class="iv-skin" d="M49 65C49 36 63 22 90 22S131 36 131 65L126 93C122 114 105 135 90 135S58 114 54 93Z"/>
    <path class="iv-face-line" d="M62 69Q72 63 82 69M98 69Q108 63 118 69M90 74L85 93Q90 96 95 93M80 111H100"/>
    <path class="iv-landmark" d="M54 81L61 107 76 125 90 135 104 125 119 107 126 81M72 72H108"/>
    <g class="iv-landmark-points"><circle cx="54" cy="81" r="2"/><circle cx="61" cy="107" r="2"/><circle cx="76" cy="125" r="2"/><circle cx="104" cy="125" r="2"/><circle cx="119" cy="107" r="2"/><circle cx="126" cy="81" r="2"/></g>
    <g class="iv-gaze"><circle cx="72" cy="72" r="3"/><circle cx="108" cy="72" r="3"/></g>
    <g class="iv-gaze-projection"><path class="iv-gaze-ray" d="M90 72L129 124"/><circle class="iv-gaze-target" cx="129" cy="124" r="4"/></g>
  `, 'iv-portrait');
  const scenes = {
    cmf: `<div class="iv-observation"><div class="iv-camera">${label('Наблюдение')}${portrait}<span class="iv-camera-label">Направление взгляда</span></div><div class="iv-signal">${label('Сигнал во времени')}<div class="iv-timeline">${signal}<div class="iv-window"></div></div><div class="iv-interval"><span>Контекст</span><strong data-iv-context>Чтение</strong></div><div class="iv-explanation"><span class="iv-status-dot"></span><span>Контекст ≠ оценка</span></div></div></div>${note}`,
    bioprofile: `<div class="iv-dossier"><div class="iv-dossier-header"><span class="iv-avatar" aria-hidden="true">${svg('0 0 32 32','<circle cx="16" cy="11" r="5"/><path d="M6 28V25C6 14 26 14 26 25V28"/>')}</span><div>${label('Индивидуальный контекст')}<strong>Профиль ученика</strong></div></div>
      <div class="iv-facets"><span>Особенности</span><span>Возможности</span><span>Состояние</span><span>Интересы</span></div>
      <div class="iv-dossier-grid"><div class="iv-history">${label('История обучения')}<div class="iv-records" role="group" aria-label="Источник записи профиля">
        <button type="button" class="iv-record" data-iv-record="reported" aria-pressed="true"><span class="iv-record-dot"></span><span><strong>Сообщённые сведения</strong><small>Ученик / родитель</small></span></button>
        <button type="button" class="iv-record" data-iv-record="observed" aria-pressed="false"><span class="iv-record-dot"></span><span><strong>Наблюдения</strong><small>CMF</small></span></button>
        <button type="button" class="iv-record" data-iv-record="tested" aria-pressed="false"><span class="iv-record-dot"></span><span><strong>Результаты тестов</strong><small>Test & RND</small></span></button>
      </div></div><div class="iv-source" aria-live="polite" aria-atomic="true">${label('Источник записи')}<strong data-iv-source>Ученик / родитель</strong><span class="iv-tag" data-iv-kind>Сообщено</span><p data-iv-detail>Интересы, цели и особенности — со слов ученика или родителя.</p><div class="iv-source-footer">Источник сохраняется<br>в истории профиля</div></div></div></div>${note}`,
    bioimef: `<div class="iv-rhythm"><div class="iv-instrument-top">${label('Личная динамика')}<span class="iv-tag">Ритм и периоды</span></div>
      <div class="iv-rhythm-plot"><div class="iv-period-shade"></div>${svg('0 0 420 120','<path class="iv-grid" d="M8 26H412M8 60H412M8 94H412"/>'+path('M8 90C35 90 50 28 89 30S142 78 179 88S236 80 268 52S322 30 351 48S387 66 412 56')+'<g class="iv-rhythm-point">'+dot(89,30)+'</g>')}</div>
      <div class="iv-periods" role="group" aria-label="Период занятия">
        <button type="button" data-iv-period="work" aria-pressed="true"><span class="iv-period-symbol" aria-hidden="true">${svg('0 0 24 24','<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9H16M8 13H16M8 17H12"/>')}</span>Работа</button>
        <button type="button" data-iv-period="rest" aria-pressed="false"><span class="iv-period-symbol" aria-hidden="true">${svg('0 0 24 24','<path d="M8 5V19M16 5V19"/>')}</span>Перерыв</button>
        <button type="button" data-iv-period="review" aria-pressed="false"><span class="iv-period-symbol" aria-hidden="true">${svg('0 0 24 24','<path d="M19 9A8 8 0 1 0 20 16M19 3V9H13"/>')}</span>Повторение</button>
      </div><div class="iv-recommendation" aria-live="polite" aria-atomic="true">${label('Направление рекомендации')}<strong data-iv-recommendation>Время занятий и нагрузка</strong><p data-iv-rhythm-detail>Продолжительность работы — с учётом состояния и результатов.</p><span class="iv-provenance">Основание: индивидуальный контекст</span></div></div>${note}`,
    'test-rnd': `<div class="iv-workbench"><div class="iv-study-question">${label('Гипотеза')}<strong>Внимание зависит от контекста занятия</strong><span class="iv-tag">Требует проверки</span></div>
      <div class="iv-research-tabs" role="group" aria-label="Этап исследования"><button type="button" data-iv-stage="testing" aria-pressed="true">Тестирование</button><button type="button" data-iv-stage="comparison" aria-pressed="false">Сопоставление</button><button type="button" data-iv-stage="refinement" aria-pressed="false">Уточнение</button></div>
      <div class="iv-evidence"><div class="iv-evidence-trace">${label('Наблюдение')}${svg('0 0 280 72','<rect class="iv-evidence-window" x="102" y="6" width="68" height="60" rx="6"/>'+path('M8 48L24 45 40 27 58 39 76 23 94 31 110 48 128 52 144 43 160 49 180 31 198 36 220 22 240 33 272 29')+'<path class="iv-drop" d="M136 6V66"/>')}</div><div class="iv-evidence-report">${label('Самоотчёт')}<div class="iv-report-track"><span>Чтение</span><strong>Запись</strong><span>Доска</span></div></div></div>
      <div class="iv-research-result" aria-live="polite" aria-atomic="true"><span class="iv-result-mark" aria-hidden="true">↳</span><div><strong data-iv-result>Собрать свидетельства</strong><p data-iv-research-detail>Наблюдение и самоотчёт сохраняются раздельно.</p></div></div></div>${note}`
  };
  const records = {
    reported: ['Ученик / родитель','Сообщено','Интересы, цели и особенности — со слов ученика или родителя.'],
    observed: ['CMF','Наблюдение','Результат наблюдения учитывается вместе с контекстом занятия.'],
    tested: ['Test & RND','Результат теста','Результаты и калибровки дополняют индивидуальную историю.']
  };
  const periods = {
    work: ['Время занятий и нагрузка','Продолжительность работы — с учётом состояния и результатов.'],
    rest: ['Отдых и перерывы','Восстановление — часть занятия, а не потерянное время.'],
    review: ['Темы и материалы','Повторение и упражнения — с учётом сильных тем и пробелов.']
  };
  const stages = {
    testing: ['Собрать свидетельства','Наблюдение и самоотчёт сохраняются раздельно.'],
    comparison: ['Сопоставить в контексте','Изменение сигнала при записи само по себе не означает отвлечение.'],
    refinement: ['Уточнить модель','Расхождения направляют следующую проверку, а не доказывают гипотезу.']
  };
  function selection(graphic, attribute, update) {
    const buttons = Array.from(graphic.querySelectorAll(`[${attribute}]`));
    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      update(button.getAttribute(attribute));
    }));
  }
  for (const [id, markup] of Object.entries(scenes)) {
    const surface = document.querySelector(`#${id} .sheet-face`);
    if (!surface || surface.dataset.illustrated === `instrument-${id}`) continue;
    const heading = surface.querySelector('h5');
    if (!heading) continue;
    const caption = surface.querySelector('.visual-caption');
    const tabs = surface.querySelector('.visual-tabs');
    const subtitles = Array.from(surface.querySelectorAll('.visual-subtitle'));
    const graphic = document.createElement('div');
    graphic.className = 'iv-graphic';
    graphic.innerHTML = markup;
    // Keep the original profile subtitle inside its dossier, not orphaned below it.
    if (id === 'bioprofile' && subtitles.length) {
      graphic.querySelector('.iv-dossier-header .iv-eyebrow').replaceWith(subtitles[0]);
    }
    const children = [heading, graphic, ...(id === 'bioprofile' ? subtitles.slice(1) : subtitles)];
    if (tabs) children.push(tabs);
    if (caption) children.push(caption);
    surface.replaceChildren(...children);
    surface.dataset.illustrated = `instrument-${id}`;
    surface.closest('.visual-sheet').classList.add('iv-sheet');
    const set = (selector, value) => { graphic.querySelector(selector).textContent = value; };
    if (id === 'cmf' && tabs) {
      const update = () => {
        const current = tabs.querySelector('[aria-pressed="true"]');
        const context = current ? current.dataset.context : 'reading';
        graphic.dataset.viewContext = context;
        set('[data-iv-context]', { reading:'Чтение', writing:'Запись', board:'Доска' }[context] || 'Чтение');
      };
      // Original app.js button listeners run before this bubbling listener.
      tabs.addEventListener('click', update);
      update();
    }
    if (id === 'bioprofile') selection(graphic, 'data-iv-record', key => {
      const [source, kind, detail] = records[key];
      set('[data-iv-source]', source); set('[data-iv-kind]', kind); set('[data-iv-detail]', detail);
    });
    if (id === 'bioimef') {
      graphic.dataset.period = 'work';
      selection(graphic, 'data-iv-period', key => {
        graphic.dataset.period = key;
        set('[data-iv-recommendation]', periods[key][0]); set('[data-iv-rhythm-detail]', periods[key][1]);
      });
    }
    if (id === 'test-rnd') {
      graphic.dataset.stage = 'testing';
      selection(graphic, 'data-iv-stage', key => {
        graphic.dataset.stage = key;
        set('[data-iv-result]', stages[key][0]); set('[data-iv-research-detail]', stages[key][1]);
      });
    }
  }
})();
