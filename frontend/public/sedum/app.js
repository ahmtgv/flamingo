'use strict';

const modules = [
  { id: 'cmf', name: 'CMF', expansion: 'Concentration Monitoring & Feedback', headline: 'Внимание. В контексте урока.', label: 'ИИ-модель наблюдения', features: [
    'Наблюдение за присутствием, взглядом, положением головы, состоянием глаз и признаками сонливости. Учёт переключений вкладки, длительности отвлечения и контекста занятия: чтение и запись в тетради не равны потере внимания.',
    'Индивидуальная калибровка и контекст BioProfile. Ученику — тихая обратная связь; преподавателю — показатели учеников и обзор класса, чтобы вовремя менять темп, формат или делать перерыв.',
    'Обмен предусмотренными результатами — в пределах согласованного доступа. Сбой измерения отличается от отвлечения; внимание не равно пониманию материала или диагнозу.'
  ] },
  { id: 'bioprofile', name: 'BioProfile', expansion: 'Индивидуальный профиль ученика', headline: 'Контекст, который имеет значение.', label: 'Индивидуальный контекст для ИИ', features: [
    'Накапливает результаты Flamingo Test & RND, калибровок и наблюдений с указанием времени и источника. Хранит интересы, цели, режим, результаты обучения, специфические особенности и персональные возможности.',
    'Учитывает сообщённые учеником или родителем постоянные особенности и временное состояние: например, СДВГ, температуру или приём препаратов. Показывает личную динамику относительно исходного состояния.',
    'Обновляется вместе с другими модулями: контекст для CMF, основа рекомендаций Bioimef и согласованных исследований. Сообщённые сведения, измерения и предположения различаются; доступ к чувствительным данным ограничен.'
  ] },
  { id: 'bioimef', name: 'Bioimef', expansion: 'Biorhythms in Improving Efficiency', headline: 'Свой ритм. Своё направление.', label: 'Развитие AI-рекомендаций', features: [
    'Рекомендации по времени занятий, продолжительности работы, нагрузке, отдыху и перерывам — с учётом биоритмов, состояния и результатов.',
    'Сильные темы и пробелы; повторение, упражнения и материалы. Факультативы, курсы и тренинги; учебные и научные направления, знакомство с профессиями и пробные проекты.',
    'Объяснение и обновление рекомендаций по новым данным. Преподавателю — помощь с темпом и форматом работы группы.',
    'Тесты, анализы и измерения для уточнения индивидуальной картины; результаты Test & RND возвращаются в BioProfile. Медицинские направления требуют отдельного согласования со специалистом и не являются автоматическим назначением.'
  ] },
  { id: 'test-rnd', name: 'Flamingo Test & RND', expansion: 'Тестирование, исследования и разработки', headline: 'Научная основа системы.', label: 'Научный модуль SEduM', features: [
    'Авторские исходные тесты, калибровки и повторные измерения. Исследования внимания и концентрации: взгляд, глаза, положение головы, чтение, размышление, письмо и отвлечения. Сопоставление измерений с ответами и самоотчётами.',
    'Исследование биоритмов и устойчивых закономерностей в разное время и при разных условиях. Результаты — в BioProfile, исследовательская основа — для Bioimef.',
    'Тестирование с учениками и преподавателями; изучение прогресса учеников у каждого преподавателя. Разработка справедливого рейтинга преподавателей по успеваемости и другим обоснованным параметрам. Методика согласуется отдельно.',
    'Проверка точности и устойчивости AI-моделей, поиск ошибок, развитие алгоритмов и рекомендаций. Исследовательские материалы собираются отдельно от обычного урока, по согласию.'
  ] }
];

function moduleIcon(name) {
  const paths = {
    cmf: '<path d="M2 12h4l3-8 5 16 3-8h5"/>',
    bioprofile: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
    bioimef: '<path d="m3 17 6-6 4 3 8-10M15 4h6v6"/>',
    'test-rnd': '<path d="M9 3h6M10 3v6L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2L14 9V3M7 15h10"/>'
  };
  return `<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function chartMarkup(kind = 'rhythm') {
  const rhythm = 'M5 96 C35 98 40 62 70 68 S115 108 145 78 S180 25 210 40 S245 87 272 63 S300 39 315 48';
  const focus = 'M5 90 L20 80 L35 84 L46 65 L57 73 L68 56 L80 70 L92 66 L104 86 L116 77 L128 49 L140 60 L152 45 L164 60 L176 37 L188 51 L201 39 L214 54 L226 42 L239 66 L251 59 L264 72 L278 64 L291 73 L305 62 L315 66';
  const path = kind === 'focus' ? focus : rhythm;
  return `<svg viewBox="0 0 320 130" aria-hidden="true" focusable="false"><path class="grid-line" d="M0 36H320 M0 76H320 M0 116H320"/><rect class="scan" x="130" y="15" width="70" height="102" rx="3"/><path class="wash" d="${path} L315 118 L5 118 Z"/><path class="trace" d="${path}"/><circle class="halo" cx="${kind === 'focus' ? 201 : 210}" cy="${kind === 'focus' ? 39 : 40}" r="11"/><circle class="chart-point" cx="${kind === 'focus' ? 201 : 210}" cy="${kind === 'focus' ? 39 : 40}" r="4.5"/></svg>`;
}

function bars(items) {
  return items.map(([text, width]) => `<div class="bar-row">${text ? `<span>${text}</span>` : ''}<div class="bar-track" aria-hidden="true"><i style="width:${width}%"></i></div></div>`).join('');
}

function visualMarkup(id) {
  if (id === 'cmf') return `<h5>CMF — внимание на уроке</h5><div class="chart" data-chart="focus"></div><p class="visual-subtitle">Контекст занятия</p><div class="visual-tabs" role="group" aria-label="Пример контекста занятия"><button class="visual-tab" aria-pressed="true" data-context="reading">Чтение</button><button class="visual-tab" aria-pressed="false" data-context="writing">Запись</button><button class="visual-tab" aria-pressed="false" data-context="board">Доска</button></div><p class="visual-caption" id="context-caption" aria-live="polite">Взгляд на текст — часть занятия, а не обязательно отвлечение.</p>`;
  if (id === 'bioprofile') return `<h5>BioProfile — профиль ученика</h5><div class="profile-graphic"><ul><li>Особенности</li><li>Возможности</li><li>Состояние</li><li>Интересы</li><li>История обучения</li></ul><div><div class="chart" data-chart="rhythm"></div><p class="visual-subtitle">Личная динамика</p>${bars([['',76],['',54],['',89]])}</div></div><p class="visual-caption">Индивидуальная история, а не сравнение с другими.</p>`;
  if (id === 'bioimef') return `<h5>Bioimef — ритмы и рекомендации</h5><div class="chart" data-chart="rhythm"></div><div class="axis"><span>Утро</span><span>День</span><span>Вечер</span></div>${bars([['Время занятий',72],['Нагрузка',49],['Отдых и перерывы',61],['Темы и материалы',85]])}<p class="visual-caption">Рекомендации меняются вместе с индивидуальным контекстом.</p>`;
  return `<h5>Test & RND — исследования и разработка</h5><div class="research-graphic"><ol class="process"><li>Гипотеза</li><li>Тестирование</li><li>Анализ</li><li>Разработка</li></ol><div><div class="chart" data-chart="focus"></div>${bars([['',73],['',56]])}</div></div><p class="visual-caption">Наблюдения → проверка → новые знания.</p>`;
}

const sections = document.getElementById('module-sections');
const moduleSummaries = {
  cmf: 'Наблюдает за вниманием с учётом контекста урока и особенностей ученика. Помогает ученику возвращаться к занятию, а преподавателю — вовремя менять темп и формат обучения. Не приравнивает внимание к пониманию материала.',
  bioprofile: 'Объединяет историю обучения, результаты тестов, интересы, возможности и сообщённые особенности здоровья и текущего состояния. Даёт другим модулям персональный контекст, различая измерения, сообщения пользователя и предположения.',
  bioimef: 'Помогает подобрать время занятий, нагрузку, отдых и направления развития. Учитывает индивидуальные ритмы, сильные стороны и пробелы; предлагает материалы, факультативы и знакомство с учебными и профессиональными направлениями.',
  'test-rnd': 'Научный модуль: тесты и калибровки, исследования внимания, биоритмов и результатов обучения с учениками и преподавателями. Проверяет AI-модели и развивает методику справедливой оценки преподавателей с учётом прогресса их учеников.'
};
for (const module of modules) {
  const article = document.createElement('article');
  article.className = 'module-section';
  article.id = module.id;
  article.setAttribute('aria-labelledby', `${module.id}-title`);
  article.innerHTML = `<div class="module-copy"><h3 id="${module.id}-title">${module.name}</h3><p class="module-expansion">${module.expansion}</p><h4>${module.headline}</h4><ul class="feature-list">${module.features.map(text => `<li>${text}</li>`).join('')}</ul><span class="module-label">${moduleIcon(module.id)}${module.label}</span></div><div class="module-visual" aria-label="Иллюстрация модуля ${module.name}; графики условные, не данные ученика"><div class="visual-sheet"><div class="sheet-face">${visualMarkup(module.id)}</div></div></div>`;
  sections.append(article);
  const summary = document.createElement('p');
  summary.className = 'module-summary';
  summary.textContent = moduleSummaries[module.id];
  article.querySelector('.feature-list').before(summary);
  {
    article.classList.add('module-with-infographic');
    const imageName = module.id === 'cmf' ? 'cmf-attention-fatigue-2026-11-05' : `${module.id}-infographic-2026-11-05`;
    const imagePath = `archive/pitchdeck/${imageName}.png`;
    const infographic = document.createElement('figure');
    infographic.className = 'cmf-pitchdeck';
    infographic.innerHTML = `<a href="archive/pitchdeck/cmf-attention-fatigue-2026-11-05.png" target="_blank" rel="noopener" aria-label="Открыть инфографику CMF в полном размере"><img src="archive/pitchdeck/cmf-attention-fatigue-2026-11-05.png" width="1536" height="1024" loading="lazy" alt="Инфографика CMF: взгляд, открытость глаз, положение головы и признаки усталости; личная норма, контекст урока, текущий сигнал и сглаженный индекс. Видео обрабатывается на устройстве; индекс не измеряет знания и не является диагнозом."></a><figcaption>CMF — концепция для питчдека. <a href="archive/pitchdeck/cmf-attention-fatigue-2026-11-05.png" target="_blank" rel="noopener">Открыть в полном размере ↗</a></figcaption>`;
    if (module.id !== 'cmf') {
      infographic.innerHTML = `<a href="${imagePath}" target="_blank" rel="noopener" aria-label="Открыть инфографику ${module.name} в полном размере"><img src="${imagePath}" width="1536" height="1024" loading="lazy" alt="Инфографика ${module.name}: ${module.headline} Иллюстрация направлений развития SEduM."></a><figcaption>${module.name} — концепция. <a href="${imagePath}" target="_blank" rel="noopener">Открыть в полном размере ↗</a></figcaption>`;
      article.querySelector('.module-visual').hidden = true;
    }
    article.append(infographic);
    infographic.querySelector('figcaption').firstChild.textContent = `${module.name} — ${module.id === 'cmf' ? 'MVP' : 'скоро релиз'}. `;
    {
      const copy = article.querySelector('.module-copy');
      const heading = document.createElement('header');
      heading.className = 'module-wide-heading';
      for (const node of Array.from(copy.children)) {
        if (!node.matches('.feature-list,.module-label')) heading.append(node);
      }
      article.prepend(heading);
      article.classList.add('module-wide-intro');
    }
  }
}
document.querySelectorAll('[data-chart]').forEach(node => { node.innerHTML = chartMarkup(node.dataset.chart); });

const contextCopy = {
  reading: 'Взгляд на текст — часть занятия, а не обязательно отвлечение.',
  writing: 'Взгляд в тетрадь учитывается в контексте письменной работы.',
  board: 'Работа с доской требует своего направления взгляда.'
};
document.querySelectorAll('[data-context]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-context]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('context-caption').textContent = contextCopy[button.dataset.context];
  });
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.getElementById('motion-toggle');
let userPaused = false;
function syncMotion() {
  const paused = userPaused || reduceMotion.matches;
  document.documentElement.classList.toggle('motion-off', paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.textContent = reduceMotion.matches ? 'Движение отключено в системе' : paused ? 'Включить движение' : 'Остановить движение';
  toggle.disabled = reduceMotion.matches;
}
toggle.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); });
reduceMotion.addEventListener('change', syncMotion);
syncMotion();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.module-section').forEach(section => {
    section.classList.add('reveal-ready');
    observer.observe(section);
  });
}

const stage = document.querySelector('.stage');
const stageInner = document.querySelector('.stage-inner');
const fitStage = () => { stageInner.style.scale = String(Math.min(1, stage.clientWidth / 1140)); };
fitStage();
if ('ResizeObserver' in window) new ResizeObserver(fitStage).observe(stage);
else window.addEventListener('resize', fitStage);
stage.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || userPaused || reduceMotion.matches) return;
  const rect = stage.getBoundingClientRect();
  stage.style.setProperty('--tilt-x', `${((event.clientX - rect.left) / rect.width - .5) * 5}deg`);
  stage.style.setProperty('--tilt-y', `${-((event.clientY - rect.top) / rect.height - .5) * 3}deg`);
});
stage.addEventListener('pointerleave', () => {
  stage.style.setProperty('--tilt-x', '0deg');
  stage.style.setProperty('--tilt-y', '0deg');
});

const dialog = document.getElementById('participation-dialog');
document.querySelectorAll('[data-participate]').forEach(button => button.addEventListener('click', () => {
  window.location.assign('/наука/вход-9pzkubbq');
}));
document.querySelectorAll('.close-dialog,.close-action').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
